import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

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
  ): Promise<TollResult | null> {
    // RED skeleton — implémentation réelle en Task 2 (GREEN).
    this.logger.debug(
      `computeTollCost stub: ${coordinates.length} pts, ${distanceKm}km, ${durationSeconds}s`,
    );
    return null;
  }
}
