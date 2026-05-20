import { Injectable, Logger } from '@nestjs/common';
import { FuelType } from '../vehicles/entities/vehicle-model.entity';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StationPrice {
  stationName: string;
  address: string;
  price: number;          // €/L
  lastUpdate: string;     // ISO date string from API
  distanceKm: number;
  source: 'api' | 'fallback';
}

interface CacheEntry {
  data: StationPrice[];
  expiresAt: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

// Mapping FuelType enum → nom de colonne dans l'API Opendatasoft
const FUEL_TYPE_API_COLUMN: Partial<Record<FuelType, string>> = {
  [FuelType.SP95]:     'prix_sp95',
  [FuelType.SP95_E10]: 'prix_e10',
  [FuelType.SP98]:     'prix_sp98',
  [FuelType.DIESEL]:   'prix_gazole',
  [FuelType.E85]:      'prix_e85',
  [FuelType.GPL]:      'prix_gplc',
};

// Prix moyens de repli (€/L) — mis à jour manuellement si besoin
const FALLBACK_PRICES: Partial<Record<FuelType, number>> = {
  [FuelType.SP95]:     1.75,
  [FuelType.SP95_E10]: 1.72,
  [FuelType.SP98]:     1.85,
  [FuelType.DIESEL]:   1.68,
  [FuelType.E85]:      0.88,
  [FuelType.GPL]:      0.92,
};

// URL dataset Opendatasoft
const API_BASE =
  'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records';

// ── Haversine ──────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class FuelPricesService {
  private readonly logger = new Logger(FuelPricesService.name);

  // Cache keyed by "lat:lng:fuelType"
  private readonly cache = new Map<string, CacheEntry>();

  async findNearestStationPrice(
    lat: number,
    lng: number,
    fuelType: FuelType,
  ): Promise<StationPrice> {
    const results = await this.fetchNearby(lat, lng, fuelType, 1);
    return results[0];
  }

  async averagePriceBetweenPoints(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    fuelType: FuelType,
  ): Promise<{ price: number; originStation: StationPrice; destinationStation: StationPrice }> {
    const [originResults, destResults] = await Promise.all([
      this.fetchNearby(originLat, originLng, fuelType, 1),
      this.fetchNearby(destLat, destLng, fuelType, 1),
    ]);

    const originStation = originResults[0];
    const destinationStation = destResults[0];
    const price = (originStation.price + destinationStation.price) / 2;

    return { price, originStation, destinationStation };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async fetchNearby(
    lat: number,
    lng: number,
    fuelType: FuelType,
    count: number,
  ): Promise<StationPrice[]> {
    const cacheKey = `${lat.toFixed(4)}:${lng.toFixed(4)}:${fuelType}:${count}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    try {
      const results = await this.callApi(lat, lng, fuelType, count);
      this.cache.set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL_MS });
      return results;
    } catch (err) {
      this.logger.warn(`API prix carburants indisponible, utilisation du prix de repli: ${err}`);
      const fallback = this.buildFallback(lat, lng, fuelType);
      return [fallback];
    }
  }

  private async callApi(
    lat: number,
    lng: number,
    fuelType: FuelType,
    limit: number,
  ): Promise<StationPrice[]> {
    const priceCol = FUEL_TYPE_API_COLUMN[fuelType];
    if (!priceCol) {
      throw new Error(`FuelType non supporté pour les prix: ${fuelType}`);
    }

    const params = new URLSearchParams({
      // Filtre géographique Opendatasoft — stations dans un rayon de 20 km
      where: `distance(geom, geom'POINT(${lng} ${lat})', 20km) AND ${priceCol} IS NOT NULL`,
      select: `id,nom,adresse,ville,${priceCol},geom`,
      order_by: `distance(geom, geom'POINT(${lng} ${lat})')`,
      limit: String(limit),
    });

    const url = `${API_BASE}?${params.toString()}`;
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} depuis l'API prix carburants`);
    }

    const json = (await resp.json()) as {
      results: Array<Record<string, unknown>>;
      total_count: number;
    };

    if (!json.results?.length) {
      return [this.buildFallback(lat, lng, fuelType)];
    }

    return json.results.map((r) => {
      const rawPrice = r[priceCol] as number | null;
      // L'API retourne les prix en millièmes d'euro (ex: 1750 → 1.750 €/L)
      const price = rawPrice != null ? rawPrice / 1000 : FALLBACK_PRICES[fuelType] ?? 0;

      const geom = r['geom'] as { lon?: number; lat?: number } | null;
      const stLat = geom?.lat ?? lat;
      const stLng = geom?.lon ?? lng;

      return {
        stationName: String(r['nom'] ?? 'Station inconnue'),
        address: `${r['adresse'] ?? ''}, ${r['ville'] ?? ''}`.trim().replace(/^,\s*/, ''),
        price,
        lastUpdate: new Date().toISOString(),
        distanceKm: Math.round(haversineKm(lat, lng, stLat, stLng) * 10) / 10,
        source: 'api' as const,
      };
    });
  }

  private buildFallback(lat: number, lng: number, fuelType: FuelType): StationPrice {
    const price = FALLBACK_PRICES[fuelType];
    if (price == null) {
      throw new Error(`Pas de prix de repli pour le carburant: ${fuelType}`);
    }
    return {
      stationName: 'Prix moyen national',
      address: '',
      price,
      lastUpdate: new Date().toISOString(),
      distanceKm: 0,
      source: 'fallback',
    };
  }
}
