import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { RouteStep } from '../mapbox/mapbox.service';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TollResult {
  /** Coût des péages en euros. */
  cost: number;
  /** true = estimation heuristique française ; false = prix réel TollGuru. */
  isEstimate: boolean;
}

interface CacheEntry {
  data: TollResult;
  expiresAt: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

/** TTL du cache toll : 30 jours (D-06) — les tarifs de péage changent ~1×/an. */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Endpoint TollGuru « polyline » (D-05 : barrière-à-barrière le long de l'itinéraire). */
const TOLLGURU_URL =
  'https://apis.tollguru.com/toll/v2/complete-polyline-from-mapping-service';

/** Type de véhicule TollGuru pour une voiture particulière classe 1 (TOLL-03). */
const VEHICLE_TYPE_CLASS1 = '2AxlesAuto';

/** Précision de la polyline encodée pour `source:"mapbox"` (RESEARCH Pitfall 2). */
const POLYLINE_PRECISION = 6;

/**
 * Taux moyen national de péage France, classe 1, €/km d'autoroute payante.
 * Source : moyenne nationale ~0,09–0,12 €/km (ASFA / agrégateurs, tarifs révisés
 * au 1er février chaque année : +3 % 2024, +0,92 % 2025, +0,86 % 2026).
 * Calibré sur Paris→Lyon (A6/A7, ~450 km marqués) = 40,90 € réel (1er fév. 2025) :
 * 450 × 0,09 = 40,50 € — dans la bande de succès €30–45 par construction.
 * Réf : ASFA autoroutes.fr ; Service-Public A16201 ; Ulys prix-du-peage/paris-lyon.
 */
const NATIONAL_AVG_RATE_PER_KM = 0.09;

/**
 * Autoroutes (numéro A) gratuites ou majoritairement gratuites — exclues du calcul.
 * Réf : guides « autoroutes gratuites France 2025 » (bipandgo, evolvie, sovab) ;
 * ~25 % du réseau (~5 000 km) est sans péage.
 * Sous-comptages acceptés (estimation, LD-6) : A75 ignore le viaduc de Millau
 * (~13,70 € 2025) ; A20 traitée comme gratuite sur sa section dominante
 * Vierzon→Montauban (payante vers Toulouse).
 */
const FREE_AUTOROUTES = new Set<number>([
  75, // A75 La Méridienne (Clermont-Ferrand→Béziers) — sauf viaduc de Millau
  84, // A84 Caen↔Rennes (Estuaires) — entièrement gratuite
  20, // A20 L'Occitane Vierzon→Montauban — gratuite sur la section dominante
  35, // A35 Alsace (Bâle→Strasbourg→frontière DE)
  31, // A31 Lorraine — majoritairement gratuite
  33, // A33 (Nancy) — gratuite
  34, // A34 (Ardennes) — gratuite
  88, // A88 (Normandie) — gratuite
  16, // A16 — section nord/Paris gratuite (approximation)
  630, // A630 rocade de Bordeaux
  620, // A620 rocade de Toulouse
  621, // A621 (Toulouse)
]);

/** Délai max d'attente de TollGuru avant repli silencieux (D-05). */
const TOLLGURU_TIMEOUT_MS = 8000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Extrait tous les numéros d'autoroute d'un `ref` de step Mapbox.
 * Gère les variantes "A6" / "A 6" / "A-6" et la forme jointe par `;` ("A 6;E 15" → [6]).
 * Renvoie [] pour un ref null/vide. Regex ancrée + linéaire sur des tokens courts
 * (ref généré par Mapbox, pas par l'utilisateur) — aucune surface ReDoS.
 */
function parseAutorouteNumbers(ref: string | null): number[] {
  if (!ref) return [];
  const out: number[] = [];
  for (const token of ref.split(';')) {
    const m = /^\s*A\s?-?\s?(\d+)/i.exec(token.trim());
    if (m) out.push(Number(m[1]));
  }
  return out;
}

/**
 * Encode une liste de coordonnées GeoJSON `[lng, lat][]` en polyline Google encodée.
 * Précision 6 (multiplier 1e6) pour s'apparier avec `source:"mapbox"` côté TollGuru
 * (RESEARCH Pitfall 2). Émet lat puis lng. Encodeur zéro-dépendance (~25 lignes)
 * — choisi pour conserver la géométrie GeoJSON utilisée par la carte d'itinéraire.
 */
function encodePolyline(coords: [number, number][]): string {
  const factor = 10 ** POLYLINE_PRECISION;
  let prevLat = 0;
  let prevLng = 0;
  let out = '';

  const enc = (current: number, previous: number): string => {
    const intDiff = Math.round(current * factor) - Math.round(previous * factor);
    let value = intDiff < 0 ? ~(intDiff << 1) : intDiff << 1;
    let chunk = '';
    while (value >= 0x20) {
      chunk += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
      value >>= 5;
    }
    return chunk + String.fromCharCode(value + 63);
  };

  for (const [lng, lat] of coords) {
    out += enc(lat, prevLat) + enc(lng, prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return out;
}

/**
 * Lecture défensive du coût dans une réponse TollGuru (RESEARCH Pitfall 3).
 * Essaie route.costs.{tag,cash,minimumTollCost} puis le legacy summary.costs.{tag,cash}.
 * Renvoie null si aucun coût numérique n'est trouvé.
 */
function parseTollGuruCost(data: unknown): number | null {
  const root = data as {
    route?: { costs?: Record<string, unknown> };
    summary?: { costs?: Record<string, unknown> };
  };
  const candidates = [
    root.route?.costs?.tag,
    root.route?.costs?.cash,
    root.route?.costs?.minimumTollCost,
    root.summary?.costs?.tag,
    root.summary?.costs?.cash,
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
  }
  return null;
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class TollService {
  private readonly logger = new Logger(TollService.name);

  /** Cache route → toll, clé = `toll:class1:<sha1(polyline)>` (D-06). */
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly config: ConfigService) {}

  /**
   * Calcule le coût des péages pour un itinéraire.
   *
   * - Avec une clé TollGuru : prix réel le long de la polyline (isEstimate=false).
   * - Sans clé / échec / timeout / quota : repli heuristique silencieux (isEstimate=true).
   * - Route sans péage avérée : { cost: 0, isEstimate: false }.
   * - Trajet trop court/lent pour avoir des péages : null.
   */
  async computeTollCost(
    coordinates: [number, number][],
    distanceKm: number,
    durationSeconds: number,
    steps?: RouteStep[],
  ): Promise<TollResult | null> {
    const apiKey = this.config.get<string>('TOLLGURU_API_KEY');

    if (apiKey && coordinates.length >= 2) {
      const polyline = encodePolyline(coordinates);
      const cacheKey = `toll:class1:${createHash('sha1').update(polyline).digest('hex')}`;

      // (a) Cache HIT — aucune requête réseau (D-06).
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
      }

      // (c) Appel TollGuru précis le long de la polyline (D-05, TOLL-03).
      try {
        const response = await fetch(TOLLGURU_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            source: 'mapbox',
            polyline,
            vehicle: { type: VEHICLE_TYPE_CLASS1 },
            currency: 'EUR',
          }),
          signal: AbortSignal.timeout(TOLLGURU_TIMEOUT_MS),
        });

        if (response.ok) {
          const data: unknown = await response.json();

          // (d) Coût numérique trouvé → prix réel.
          const cost = parseTollGuruCost(data);
          if (cost !== null) {
            return this.cacheAndReturn(cacheKey, { cost: round2(cost), isEstimate: false });
          }

          // Route avérée sans péage → 0 réel.
          const root = data as { route?: { hasTolls?: boolean } };
          if (root.route?.hasTolls === false) {
            return this.cacheAndReturn(cacheKey, { cost: 0, isEstimate: false });
          }

          // ok mais aucun chemin de coût exploitable → repli silencieux (Pitfall 3).
          this.logger.warn('TollGuru réponse ok sans coût exploitable, repli heuristique');
        } else {
          // (e) 401/429/5xx → log once puis repli silencieux (D-03).
          this.logger.warn(`TollGuru HTTP ${response.status}, repli heuristique`);
        }
      } catch (err) {
        // Timeout / réseau / parse → repli silencieux (D-03, ne jamais throw).
        this.logger.warn(`TollGuru indisponible, repli heuristique: ${String(err)}`);
      }
    }

    // (f) Repli heuristique français.
    const estimated = this.estimateFrenchTolls(distanceKm, durationSeconds, steps);
    if (estimated === null) return null;
    return { cost: estimated, isEstimate: true };
  }

  /** Écrit dans le cache (TTL 30 jours, D-06) puis renvoie la valeur. */
  private cacheAndReturn(cacheKey: string, data: TollResult): TollResult {
    this.cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  }

  /**
   * Somme les kilomètres d'autoroute PAYANTE réellement sur l'itinéraire.
   * Pour chaque step : si son `ref` porte au moins un numéro d'autoroute ET qu'au
   * moins un de ces numéros n'est PAS dans FREE_AUTOROUTES, on compte sa distance.
   * Tout champ manquant (`ref`/`distanceMeters`) contribue 0 — ne lève jamais (LD-2).
   */
  private classifyTolledKm(steps: RouteStep[]): number {
    let metres = 0;
    for (const step of steps) {
      const aNumbers = parseAutorouteNumbers(step.ref);
      if (aNumbers.length === 0) continue; // pas un step autoroute
      const isTolled = aNumbers.some((n) => !FREE_AUTOROUTES.has(n));
      if (isTolled) metres += step.distanceMeters ?? 0;
    }
    return metres / 1000;
  }

  /**
   * Estimation française du coût de péage pour un trajet.
   *
   * - Avec des steps : route-aware → (km d'autoroute payante détectés) ×
   *   NATIONAL_AVG_RATE_PER_KM (0 km → 0 €). Toujours `isEstimate: true` en amont.
   * - Sans steps : repli heuristique basé sur la vitesse moyenne comme proxy de
   *   l'usage de l'autoroute (comportement Phase 1 inchangé).
   */
  private estimateFrenchTolls(
    distanceKm: number,
    durationSeconds: number,
    steps?: RouteStep[],
  ): number | null {
    // ── Chemin route-aware (LD-3/LD-4) ──
    if (steps?.length) {
      return round2(this.classifyTolledKm(steps) * NATIONAL_AVG_RATE_PER_KM);
    }

    // ── Repli heuristique vitesse (inchangé — graceful degradation) ──
    if (durationSeconds === 0 || distanceKm < 5) return null;

    const avgSpeedKmh = distanceKm / (durationSeconds / 3600);

    let tollFraction: number;
    if (avgSpeedKmh >= 95) {
      tollFraction = 0.7; // Itinéraire principalement autoroutier
    } else if (avgSpeedKmh >= 80) {
      tollFraction = 0.45; // Mix voie rapide / nationale
    } else if (avgSpeedKmh >= 65) {
      tollFraction = 0.2; // Trajet mixte, quelques tronçons payants
    } else {
      return 0; // Vitesse trop basse — route urbaine ou rurale sans péage
    }

    return round2(distanceKm * tollFraction * NATIONAL_AVG_RATE_PER_KM);
  }
}
