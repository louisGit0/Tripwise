import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ── Constants ──────────────────────────────────────────────────────────────────

/**
 * TTL du cache image : 30 jours (mirroir du cache toll).
 * Les URLs de photos de modèles sont stables ; un cache long maintient l'usage
 * bien sous le quota gratuit CarImages (~5 000 req/mois).
 */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Délai max d'attente de CarImages avant repli silencieux (mirroir toll). */
const IMAGE_TIMEOUT_MS = 8000;

/**
 * Endpoint CarImages free API (carimagesapi.com).
 * NOTE intégration : confirmer l'URL exacte, l'auth (header `x-api-key` vs query
 * `key=`) et la forme de la réponse (image directe vs JSON contenant une URL)
 * contre la doc live. Construit défensivement : tout écart → null (placeholder).
 */
const CARIMAGES_BASE_URL = 'https://api.carimagesapi.com/api/v1/images';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CacheEntry {
  /** URL photo résolue, ou null (miss) — on cache les deux. */
  url: string | null;
  expiresAt: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Lecture défensive d'une URL image https dans une réponse CarImages.
 * Essaie quelques champs plausibles (url/image/imageUrl) au niveau racine puis
 * dans un éventuel tableau de résultats. Ne retient QUE des URLs `https://`
 * (drop http + valeurs non-string). Renvoie null si rien d'exploitable.
 */
function extractImageUrl(data: unknown): string | null {
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

  /** Cache image, clé = `${make}|${model}` normalisé. Cache hits ET misses. */
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly config: ConfigService) {}

  /**
   * Résout l'URL photo d'un véhicule par marque + modèle canoniques.
   *
   * - Avec une clé CarImages + réponse exploitable : URL `https://` (string).
   * - Sans clé / échec / timeout / quota / parse / modèle sans photo : null.
   *
   * Ne lève JAMAIS — dégrade silencieusement vers null (le client affiche un
   * placeholder de marque). La clé reste server-side : elle n'apparaît jamais
   * dans la valeur de retour.
   */
  async resolveImageUrl(make: string, model: string): Promise<string | null> {
    const trimmedMake = (make ?? '').trim();
    const trimmedModel = (model ?? '').trim();

    // (1) Inputs vides → null sans fetch.
    if (!trimmedMake || !trimmedModel) return null;

    // (2) Cache HIT (hit ou miss) — aucune requête réseau.
    const cacheKey = `${trimmedMake}|${trimmedModel}`.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.url;
    }

    // (3) Pas de clé → cache+return null (no fetch). Le feature ship sans la clé.
    const apiKey = this.config.get<string>('CARIMAGES_API_KEY');
    if (!apiKey) {
      return this.cacheAndReturn(cacheKey, null);
    }

    // (4) Appel CarImages — make/model toujours URL-encodés (jamais bruts → anti-SSRF).
    try {
      const url =
        `${CARIMAGES_BASE_URL}?make=${encodeURIComponent(trimmedMake)}` +
        `&model=${encodeURIComponent(trimmedModel)}`;

      const response = await fetch(url, {
        headers: { 'x-api-key': apiKey },
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      });

      // (5) ok → lecture défensive ; URL https ou null, dans les deux cas cache.
      if (response.ok) {
        const data: unknown = await response.json();
        return this.cacheAndReturn(cacheKey, extractImageUrl(data));
      }

      // (6) 401/429/5xx → log once + repli silencieux.
      this.logger.warn(`CarImages HTTP ${response.status}, repli placeholder`);
      return this.cacheAndReturn(cacheKey, null);
    } catch (err) {
      // Timeout / réseau / parse → repli silencieux (ne jamais throw).
      this.logger.warn(`CarImages indisponible, repli placeholder: ${String(err)}`);
      return this.cacheAndReturn(cacheKey, null);
    }
  }

  /** Écrit dans le cache (TTL 30 jours) puis renvoie la valeur. */
  private cacheAndReturn(cacheKey: string, url: string | null): string | null {
    this.cache.set(cacheKey, { url, expiresAt: Date.now() + CACHE_TTL_MS });
    return url;
  }
}
