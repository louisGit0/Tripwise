import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ── Constants ──────────────────────────────────────────────────────────────────

/**
 * TTL du cache des URLs signées CarImages : 1 heure.
 *
 * L'URL signée renvoyée par CarImages EMBARQUE l'`api_key` et expire (champ
 * `expires`). On la cache donc pour une fenêtre BORNÉE, plus courte que sa
 * validité — sinon une URL périmée resservie 401-erait sur le fetch image.
 * (À l'inverse du cache toll 30j : ici l'URL n'est pas stable dans le temps.)
 */
const URL_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * TTL du cache des « miss connus » (200 sans photo, ou pas de clé) : 30 jours.
 * Un miss est stable (le modèle n'a pas de photo) — le cacher longtemps économise
 * le quota CarImages (~5 000 req/mois en gratuit) sans risque de péremption.
 */
const MISS_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Délai max d'attente de CarImages avant repli silencieux (mirroir toll). */
const IMAGE_TIMEOUT_MS = 8000;

/**
 * Endpoint CarImages de résolution d'URL signée (carimagesapi.com).
 * Réponse vérifiée : `{ "url": "https://carimagesapi.com/image?...&api_key=...&
 * expires=<unix>&sig=<hex>" }`. L'image renvoie 200 image/webp AVEC l'api_key et
 * 401 sans → la clé est REQUISE sur le fetch image et NE PEUT PAS fuiter au client.
 */
const SIGNED_URL_ENDPOINT = 'https://carimagesapi.com/api/v1/signed-url';

/** Content-Type par défaut si l'upstream ne le précise pas (CarImages → webp). */
const DEFAULT_CONTENT_TYPE = 'image/webp';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CacheEntry {
  /**
   * URL signée résolue (string, embarque l'api_key — server-side uniquement) ou
   * null (miss connu : 200 sans photo / pas de clé). Les échecs transitoires
   * (non-ok / timeout / réseau / parse) ne sont JAMAIS mis en cache.
   */
  url: string | null;
  expiresAt: number;
}

/** Octets d'une image + son Content-Type, renvoyés par fetchImageBytes. */
export interface VehicleImageBytes {
  body: Buffer;
  contentType: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Lecture défensive de l'URL signée dans une réponse CarImages.
 * Essaie quelques champs plausibles (url/image/imageUrl) au niveau racine puis
 * dans un éventuel tableau de résultats. Ne retient QUE des URLs `https://`
 * (drop http + valeurs non-string). Renvoie null si rien d'exploitable.
 */
function extractSignedUrl(data: unknown): string | null {
  const root = data as {
    url?: unknown;
    image?: unknown;
    imageUrl?: unknown;
    image_url?: unknown;
    results?: Array<{ url?: unknown; image?: unknown; imageUrl?: unknown }> | undefined;
    data?: Array<{ url?: unknown; image?: unknown; imageUrl?: unknown }> | undefined;
  };

  const first = Array.isArray(root?.results) ? root.results[0] : undefined;
  const firstData = Array.isArray(root?.data) ? root.data[0] : undefined;

  const candidates: unknown[] = [
    root?.url,
    root?.image,
    root?.imageUrl,
    root?.image_url,
    first?.url,
    first?.image,
    first?.imageUrl,
    firstData?.url,
    firstData?.image,
    firstData?.imageUrl,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.startsWith('https://')) return c;
  }
  return null;
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class VehicleImageService {
  private readonly logger = new Logger(VehicleImageService.name);

  /**
   * Cache, clé = `${make}|${model}` normalisé. On cache UNIQUEMENT les résultats
   * définitifs du chemin OK (URL signée résolue, TTL court ; OU 200-sans-photo /
   * no-key, TTL long). Les échecs transitoires ne sont jamais mis en cache.
   */
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly config: ConfigService) {}

  /**
   * Résout l'URL signée CarImages d'un véhicule par marque + modèle.
   *
   * IMPORTANT : la valeur de retour EMBARQUE l'api_key (nature des URLs signées
   * CarImages) — elle est strictement server-side et n'est consommée que par
   * `fetchImageBytes`. Elle ne doit JAMAIS être renvoyée au client (sinon la clé
   * fuite). Ne lève JAMAIS — dégrade silencieusement vers null.
   */
  async resolveImageUrl(make: string, model: string): Promise<string | null> {
    const trimmedMake = (make ?? '').trim();
    const trimmedModel = (model ?? '').trim();

    // (1) Inputs vides → null sans fetch.
    if (!trimmedMake || !trimmedModel) return null;

    // (2) Cache HIT (hit ou miss) — aucune requête réseau.
    const cacheKey = this.cacheKey(trimmedMake, trimmedModel);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.url;
    }

    // (3) Pas de clé → cache MISS (30j) + return null. Le feature ship sans la clé.
    const apiKey = this.config.get<string>('CARIMAGES_API_KEY');
    if (!apiKey) {
      return this.cacheMiss(cacheKey);
    }

    // (4) Appel CarImages — `signed-url` exige la clé en query `api_key` (le header
    //     Bearer est REJETÉ : {"error":"API key required"}). La clé part vers CarImages
    //     mais n'est jamais loggée (on ne logge que le status) ni renvoyée au client
    //     (le contrôleur proxifie les octets). make/model URL-encodés (anti-SSRF).
    try {
      const url =
        `${SIGNED_URL_ENDPOINT}?api_key=${encodeURIComponent(apiKey)}` +
        `&make=${encodeURIComponent(trimmedMake)}` +
        `&model=${encodeURIComponent(trimmedModel)}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      });

      // (5) ok → résultat DÉFINITIF : URL signée (TTL court) OU 200-sans-photo (TTL long).
      if (response.ok) {
        const data: unknown = await response.json();
        const signed = extractSignedUrl(data);
        return signed ? this.cacheHit(cacheKey, signed) : this.cacheMiss(cacheKey);
      }

      // (6) 401/429/5xx → échec TRANSITOIRE : repli silencieux SANS cache, pour
      //     que la prochaine requête réessaie (pas d'empoisonnement — mirroir toll).
      this.logger.warn(`CarImages signed-url HTTP ${response.status}, repli placeholder`);
      return null;
    } catch (err) {
      // Timeout / réseau / parse → échec TRANSITOIRE : repli silencieux SANS cache
      //     (ne jamais throw). La prochaine requête réessaie.
      this.logger.warn(`CarImages indisponible, repli placeholder: ${String(err)}`);
      return null;
    }
  }

  /**
   * Récupère les octets de la photo d'un véhicule (BYTE PROXY server-side).
   *
   * Résout l'URL signée puis la fetch côté serveur — la clé reste server-side, le
   * client ne reçoit que des octets via notre endpoint. Ne lève JAMAIS → null sur
   * tout échec/timeout (le client affiche un placeholder de marque).
   *
   * Si une URL signée mise en cache a expiré (l'image 401/403), on invalide le
   * cache et on re-résout UNE fois pour rafraîchir la signature.
   */
  async fetchImageBytes(make: string, model: string): Promise<VehicleImageBytes | null> {
    const signedUrl = await this.resolveImageUrl(make, model);
    if (!signedUrl) return null;

    const bytes = await this.fetchBytes(signedUrl);
    if (bytes !== 'expired') return bytes; // VehicleImageBytes | null

    // URL signée périmée (cachée) → invalider + re-résoudre UNE fois.
    this.cache.delete(this.cacheKey((make ?? '').trim(), (model ?? '').trim()));
    const fresh = await this.resolveImageUrl(make, model);
    if (!fresh) return null;

    const retried = await this.fetchBytes(fresh);
    return retried === 'expired' ? null : retried;
  }

  /**
   * Fetch des octets d'une URL signée. Renvoie :
   * - VehicleImageBytes sur 200 ;
   * - `'expired'` sur 401/403 (signature périmée → re-résolution amont) ;
   * - null sur tout autre échec (jamais de throw).
   */
  private async fetchBytes(
    signedUrl: string,
  ): Promise<VehicleImageBytes | null | 'expired'> {
    try {
      const response = await fetch(signedUrl, {
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      });

      if (response.status === 401 || response.status === 403) return 'expired';

      if (!response.ok) {
        this.logger.warn(`CarImages image HTTP ${response.status}, repli placeholder`);
        return null;
      }

      const contentType = response.headers.get('content-type') ?? DEFAULT_CONTENT_TYPE;
      const arrayBuffer = await response.arrayBuffer();
      return { body: Buffer.from(arrayBuffer), contentType };
    } catch (err) {
      this.logger.warn(`CarImages image indisponible, repli placeholder: ${String(err)}`);
      return null;
    }
  }

  /** Clé de cache normalisée (case-insensitive) pour un couple marque/modèle. */
  private cacheKey(make: string, model: string): string {
    return `${make}|${model}`.toLowerCase();
  }

  /** Cache une URL signée résolue (TTL court 1h) puis la renvoie. */
  private cacheHit(cacheKey: string, url: string): string {
    this.cache.set(cacheKey, { url, expiresAt: Date.now() + URL_CACHE_TTL_MS });
    return url;
  }

  /** Cache un miss connu (TTL long 30j) puis renvoie null. */
  private cacheMiss(cacheKey: string): null {
    this.cache.set(cacheKey, { url: null, expiresAt: Date.now() + MISS_CACHE_TTL_MS });
    return null;
  }
}
