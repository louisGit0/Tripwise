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

/** Taux moyen de péage France (€/km autoroute) — heuristique de repli. */
const TOLL_RATE_PER_KM = 0.09;

/** Délai max d'attente de TollGuru avant repli silencieux (D-05). */
const TOLLGURU_TIMEOUT_MS = 8000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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
   * Estimation heuristique du coût de péage pour un trajet France.
   * Basée sur la vitesse moyenne comme proxy de l'usage de l'autoroute.
   * Taux moyen France : ~0,09 €/km sur autoroute.
   */
  private estimateFrenchTolls(
    distanceKm: number,
    durationSeconds: number,
    _steps?: RouteStep[],
  ): number | null {
    // NOTE (RED) : la branche route-aware (steps) est ajoutée en Task 2 ; ici on
    // n'exécute encore que l'heuristique de vitesse — d'où l'échec attendu.
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

    return round2(distanceKm * tollFraction * TOLL_RATE_PER_KM);
  }
}
