/**
 * Source des données : Base nationale des IRVE (Infrastructure de Recharge pour
 * Véhicules Électriques), publiée sur data.gouv.fr et exposée via l'API Opendatasoft
 * de l'ODRÉ (Observatoire des Données de la Rénovation Energétique).
 *
 * URL API : https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/bornes-irve/records
 * Documentation schéma : https://schema.data.gouv.fr/etalab/schema-irve-statique/
 * Mis à jour en continu par les opérateurs. Pas de clé API requise.
 *
 * ⚠️  La base IRVE ne contient PAS les tarifs de recharge — uniquement les
 *     localisations, puissances et types de connecteurs. Les prix affichés dans
 *     l'application proviennent du profil véhicule de l'utilisateur.
 *
 * Vérifié le 2026-05-20 : ~42 000 points de charge, ~18 500 stations.
 */
import { Injectable, Logger } from '@nestjs/common';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChargingStation {
  id: string;
  name: string;
  operator: string;
  address: string;
  lat: number;
  lng: number;
  powerKw: number | null;
  connectorTypes: string[];
  openingHours: string | null;
  isFreeAccess: boolean;
  distanceKm: number;
}

interface CacheEntry {
  data: ChargingStation[];
  expiresAt: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — les bornes changent peu souvent
const MAX_API_RESULTS = 50;

const API_BASE =
  'https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/bornes-irve/records';

const API_SELECT =
  'id_pdc_itinerance,nom_station,nom_amenageur,adresse_station,commune,coordonneesXY,puissance_nominale,type_prise,acces_recharge,horaires';

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
export class ChargingStationsService {
  private readonly logger = new Logger(ChargingStationsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  async findStationsNearPoint(
    lat: number,
    lng: number,
    radiusKm = 5,
  ): Promise<ChargingStation[]> {
    return this.fetchNearPoint(lat, lng, radiusKm);
  }

  async findStationsAlongRoute(
    geometry: { type: string; coordinates: [number, number][] },
    maxDistanceFromRouteMeters = 2000,
  ): Promise<ChargingStation[]> {
    const coords = geometry.coordinates;
    if (!coords?.length) return [];

    // Sample up to 10 evenly-spaced points from the route
    const step = Math.max(1, Math.floor(coords.length / 10));
    const sampleIndices: number[] = [];
    for (let i = 0; i < coords.length; i += step) sampleIndices.push(i);
    if (sampleIndices[sampleIndices.length - 1] !== coords.length - 1) {
      sampleIndices.push(coords.length - 1);
    }

    const radiusKm = maxDistanceFromRouteMeters / 1000;
    const batches = await Promise.all(
      sampleIndices.map((idx) => {
        const [lng, lat] = coords[idx]; // GeoJSON: [lng, lat]
        return this.fetchNearPoint(lat, lng, radiusKm);
      }),
    );

    // Deduplicate by station id
    const seen = new Set<string>();
    const stations: ChargingStation[] = [];
    for (const batch of batches) {
      for (const s of batch) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          stations.push(s);
        }
      }
    }
    return stations;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async fetchNearPoint(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<ChargingStation[]> {
    const cacheKey = `${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusKm}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return cached.data;

    try {
      const data = await this.callApi(lat, lng, radiusKm);
      this.cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    } catch (err) {
      this.logger.warn(`API IRVE indisponible pour (${lat},${lng}): ${err}`);
      return [];
    }
  }

  private async callApi(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<ChargingStation[]> {
    const params = new URLSearchParams({
      where: `within_distance(coordonneesXY, geom'POINT(${lng} ${lat})', ${radiusKm}km)`,
      select: API_SELECT,
      order_by: `distance(coordonneesXY, geom'POINT(${lng} ${lat})')`,
      limit: String(MAX_API_RESULTS),
    });

    const resp = await fetch(`${API_BASE}?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status} depuis l'API IRVE`);

    const json = (await resp.json()) as { results: Array<Record<string, unknown>> };
    return (json.results ?? []).map((r) => this.mapRecord(r, lat, lng));
  }

  private mapRecord(
    r: Record<string, unknown>,
    queryLat: number,
    queryLng: number,
  ): ChargingStation {
    const geom = r['coordonneesXY'] as { lon?: number; lat?: number } | null;
    const stLat = geom?.lat ?? queryLat;
    const stLng = geom?.lon ?? queryLng;

    const rawPower = r['puissance_nominale'];
    const powerKw = rawPower != null ? Number(rawPower) : null;

    const rawConnectors = r['type_prise'];
    const connectorTypes = rawConnectors
      ? String(rawConnectors)
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const acces = String(r['acces_recharge'] ?? '').toLowerCase();
    const isFreeAccess = acces.includes('libre');

    const nom =
      String(r['nom_station'] ?? r['nom_amenageur'] ?? 'Borne de recharge');
    const adresse = String(r['adresse_station'] ?? '');
    const commune = String(r['commune'] ?? '');
    const address = [adresse, commune].filter(Boolean).join(', ');

    return {
      id: String(r['id_pdc_itinerance'] ?? `${stLat},${stLng}`),
      name: nom,
      operator: String(r['nom_amenageur'] ?? ''),
      address,
      lat: stLat,
      lng: stLng,
      powerKw: powerKw && !isNaN(powerKw) ? powerKw : null,
      connectorTypes,
      openingHours: r['horaires'] != null ? String(r['horaires']) : null,
      isFreeAccess,
      distanceKm: Math.round(haversineKm(queryLat, queryLng, stLat, stLng) * 10) / 10,
    };
  }
}
