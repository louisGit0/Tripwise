import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ── Types Mapbox ─────────────────────────────────────────────────────────────

export interface GeocodeFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, unknown>;
}

export interface DirectionsResult {
  distanceMeters: number;
  durationSeconds: number;
  /** GeoJSON LineString geometry of the route */
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  waypoints: Array<{ name: string; location: [number, number] }>;
}

// ── Réponses brutes Mapbox ────────────────────────────────────────────────────

interface MapboxGeocodeResponse {
  features: GeocodeFeature[];
  message?: string;
}

interface MapboxDirectionsResponse {
  code: string;
  message?: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: { type: string; coordinates: [number, number][] };
  }>;
  waypoints: Array<{ name: string; location: [number, number] }>;
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Wrapper autour des APIs Mapbox Geocoding v5 et Directions v5.
 *
 * Quota gratuit Mapbox (à vérifier dans le dashboard account.mapbox.com) :
 *   - Geocoding : 100 000 requêtes/mois sur le plan gratuit (à vérifier)
 *   - Directions : 100 000 requêtes/mois sur le plan gratuit (à vérifier)
 * Ces chiffres sont indicatifs — consultez account.mapbox.com pour les limites actuelles.
 */
@Injectable()
export class MapboxService {
  private readonly logger = new Logger(MapboxService.name);
  private readonly token: string;
  private readonly baseGeocode = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
  private readonly baseDirections = 'https://api.mapbox.com/directions/v5/mapbox/driving';

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('MAPBOX_TOKEN') ?? '';
    if (!this.token) {
      this.logger.warn('MAPBOX_TOKEN non défini — les appels Mapbox échoueront');
    }
  }

  /**
   * Autocomplétion d'adresses (Geocoding forward).
   * Limité à la France par défaut (country=fr).
   */
  async geocode(query: string, options?: { country?: string; limit?: number }): Promise<GeocodeFeature[]> {
    const q = query.trim();
    if (!q) throw new BadRequestException('Le paramètre q ne peut pas être vide');
    if (q.length < 2) throw new BadRequestException('La requête doit contenir au moins 2 caractères');

    const params = new URLSearchParams({
      access_token: this.token,
      language: 'fr',
      country: options?.country ?? 'fr',
      limit: String(options?.limit ?? 5),
      types: 'address,place,poi',
    });

    const url = `${this.baseGeocode}/${encodeURIComponent(q)}.json?${params}`;
    const data = await this.fetchMapbox<MapboxGeocodeResponse>(url, 'Geocoding');
    return data.features;
  }

  /**
   * Calcul d'itinéraire voiture entre deux coordonnées.
   * Retourne distance, durée et géométrie GeoJSON de la route.
   */
  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<DirectionsResult> {
    this.validateCoordinates(origin, 'origin');
    this.validateCoordinates(destination, 'destination');

    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const params = new URLSearchParams({
      access_token: this.token,
      geometries: 'geojson',
      overview: 'full',
      steps: 'false',
    });

    const url = `${this.baseDirections}/${coordinates}?${params}`;
    const data = await this.fetchMapbox<MapboxDirectionsResponse>(url, 'Directions');

    if (data.code !== 'Ok') {
      throw new BadRequestException(`Mapbox Directions : ${data.message ?? data.code}`);
    }
    if (!data.routes?.length) {
      throw new BadRequestException('Aucun itinéraire trouvé entre ces deux points');
    }

    const route = data.routes[0];
    return {
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      geometry: {
        type: 'LineString',
        coordinates: route.geometry.coordinates as [number, number][],
      },
      waypoints: data.waypoints,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async fetchMapbox<T>(url: string, context: string): Promise<T> {
    if (!this.token) {
      throw new InternalServerErrorException('MAPBOX_TOKEN manquant — configuration requise');
    }

    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      this.logger.error(`${context} : erreur réseau`);
      throw new ServiceUnavailableException('Impossible de contacter Mapbox');
    }

    if (res.status === 401) {
      this.logger.error(`${context} : token Mapbox invalide ou expiré`);
      throw new InternalServerErrorException('Token Mapbox invalide');
    }
    if (res.status === 429) {
      this.logger.warn(`${context} : quota Mapbox dépassé`);
      throw new ServiceUnavailableException('Quota Mapbox dépassé — réessayez plus tard');
    }
    if (!res.ok) {
      this.logger.error(`${context} : HTTP ${res.status}`);
      throw new ServiceUnavailableException(`Erreur Mapbox (HTTP ${res.status})`);
    }

    return res.json() as Promise<T>;
  }

  private validateCoordinates(coords: { lat: number; lng: number }, field: string) {
    if (coords.lat < -90 || coords.lat > 90) {
      throw new BadRequestException(`${field}.lat doit être entre -90 et 90`);
    }
    if (coords.lng < -180 || coords.lng > 180) {
      throw new BadRequestException(`${field}.lng doit être entre -180 et 180`);
    }
  }
}
