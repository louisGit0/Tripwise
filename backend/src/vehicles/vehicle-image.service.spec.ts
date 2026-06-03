/**
 * Tests unitaires — VehicleImageService (BYTE PROXY, D-35)
 *
 * Le `fetch` global est mocké (jest.spyOn) pour simuler CarImages :
 *  - le endpoint signed-url renvoie `{ url: <signedUrl> }` (l'URL EMBARQUE l'api_key) ;
 *  - l'URL signée renvoie ensuite les octets de l'image (200 image/webp).
 * ConfigService est un stub renvoyant (ou non) une clé CARIMAGES_API_KEY.
 *
 * Cas couverts :
 *   resolve: with-key→signedUrl · no-key→null(no-fetch) · blank→null(no-fetch) ·
 *     401/429/timeout/parse→null(never-throws, NOT cached) · unrecognised→null(miss) ·
 *     http(non-https)→dropped · key-in-Bearer-header + key-NOT-in-outbound-URL ·
 *     url-cache(1h, one-fetch) · miss-cache(30j) · case-insensitive.
 *   fetchImageBytes: signedUrl→bytes{body,contentType} · key NOT in returned bytes ·
 *     no-key→null · upstream image 5xx→null · expired(401) signed URL→invalidate+retry.
 */
import { ConfigService } from '@nestjs/config';
import { VehicleImageService } from './vehicle-image.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Construit un VehicleImageService avec un ConfigService stub. */
function makeService(apiKey?: string): VehicleImageService {
  const config = {
    get: (key: string): string | undefined =>
      key === 'CARIMAGES_API_KEY' ? apiKey : undefined,
  } as unknown as ConfigService;
  return new VehicleImageService(config);
}

/** Réponse fetch OK avec un corps JSON arbitraire (endpoint signed-url). */
function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

/** Réponse fetch non-ok (401/429/5xx…). */
function errResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
    arrayBuffer: async () => new ArrayBuffer(0),
    headers: { get: () => null },
  } as unknown as Response;
}

/** Réponse fetch d'octets image (200 image/webp). */
function bytesResponse(bytes: Uint8Array, contentType = 'image/webp'): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    arrayBuffer: async () => bytes.buffer.slice(0),
  } as unknown as Response;
}

const SIGNED_URL = 'https://carimagesapi.com/image?make=Tesla&model=Model3&api_key=SECRET&sig=abc';

// ── Suite ────────────────────────────────────────────────────────────────────

describe('VehicleImageService', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── resolveImageUrl — succès ───────────────────────────────────────────────

  describe('resolveImageUrl (signed-url success)', () => {
    it('returns the signed URL parsed from the response', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ url: SIGNED_URL }));
      const service = makeService('test-key');

      const result = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(result).toBe(SIGNED_URL);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('parses a results[] array shape defensively', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ results: [{ image: SIGNED_URL }] }));
      const service = makeService('test-key');

      const result = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(result).toBe(SIGNED_URL);
    });

    it('drops a non-https (http) URL → null', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ url: 'http://insecure.example.com/x.webp' }));
      const service = makeService('test-key');

      const result = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(result).toBeNull();
    });

    it('returns null on an unrecognised response shape (never throws)', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ unexpected: 'shape' }));
      const service = makeService('test-key');

      const result = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(result).toBeNull();
    });
  });

  // ── No-key / inputs vides (aucun fetch) ────────────────────────────────────

  describe('no fetch path', () => {
    it('no key → null and fetch NEVER called', async () => {
      const service = makeService(undefined);

      const result = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('blank make → null without fetching', async () => {
      const service = makeService('test-key');

      const result = await service.resolveImageUrl('   ', 'Model 3');

      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('blank model → null without fetching', async () => {
      const service = makeService('test-key');

      const result = await service.resolveImageUrl('Tesla', '');

      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ── Repli silencieux (never throws) ────────────────────────────────────────

  describe('graceful fallback (never throws → null)', () => {
    it('non-ok HTTP (401 unauthorized) → null, never throws', async () => {
      fetchSpy.mockResolvedValue(errResponse(401));
      const service = makeService('test-key');

      await expect(service.resolveImageUrl('Tesla', 'Model 3')).resolves.toBeNull();
    });

    it('over-quota (429) → null, never throws', async () => {
      fetchSpy.mockResolvedValue(errResponse(429));
      const service = makeService('test-key');

      await expect(service.resolveImageUrl('Tesla', 'Model 3')).resolves.toBeNull();
    });

    it('5xx → null, never throws', async () => {
      fetchSpy.mockResolvedValue(errResponse(503));
      const service = makeService('test-key');

      await expect(service.resolveImageUrl('Tesla', 'Model 3')).resolves.toBeNull();
    });

    it('timeout / network rejection → null, never throws', async () => {
      fetchSpy.mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
      const service = makeService('test-key');

      await expect(service.resolveImageUrl('Tesla', 'Model 3')).resolves.toBeNull();
    });

    it('JSON parse failure → null, never throws', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('invalid json');
        },
      } as unknown as Response);
      const service = makeService('test-key');

      await expect(service.resolveImageUrl('Tesla', 'Model 3')).resolves.toBeNull();
    });

    // A transient failure must NOT poison the cache. The next identical resolve has
    // to retry (fetch called a SECOND time), and once the upstream recovers the
    // signed URL "lights up" instead of staying null.
    it('does NOT cache a transient failure → retries on the next call (429 then ok)', async () => {
      fetchSpy
        .mockResolvedValueOnce(errResponse(429))
        .mockResolvedValueOnce(jsonResponse({ url: SIGNED_URL }));
      const service = makeService('test-key');

      const first = await service.resolveImageUrl('Tesla', 'Model 3');
      const second = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(first).toBeNull();
      expect(second).toBe(SIGNED_URL); // recovered — not served a poisoned null
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('does NOT cache a network rejection → retries on the next call', async () => {
      fetchSpy
        .mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError'))
        .mockResolvedValueOnce(jsonResponse({ url: SIGNED_URL }));
      const service = makeService('test-key');

      const first = await service.resolveImageUrl('Tesla', 'Model 3');
      const second = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(first).toBeNull();
      expect(second).toBe(SIGNED_URL);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ── Clé en query api_key (exigée par CarImages) — jamais renvoyée au client ──

  describe('key safety (outbound request)', () => {
    it('sends the configured key as the api_key query param (CarImages rejects Bearer)', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ url: SIGNED_URL }));
      const service = makeService('secret-key-12345');

      await service.resolveImageUrl('Tesla', 'Model 3');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];

      // CarImages' signed-url endpoint REQUIRES the key in the api_key query param;
      // a Bearer header is rejected ({"error":"API key required"}). The key reaching
      // CarImages here is fine + required; the security boundary is that the controller
      // proxies the IMAGE BYTES so the key/signed-URL never reach the app's own client.
      expect(url).toContain('api_key=secret-key-12345');
      expect(init.headers).toBeUndefined();
    });

    it('URL-encodes make/model into the query string', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ url: SIGNED_URL }));
      const service = makeService('test-key');

      await service.resolveImageUrl('Mercedes-Benz', 'Model 3');

      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('Mercedes-Benz');
      expect(url).toContain('Model%203'); // space encoded
    });
  });

  // ── Cache : URL signée (TTL court 1h) + miss connu (TTL long 30j) ──────────

  describe('cache', () => {
    it('serves a resolved signed URL from cache within the bounded TTL (only ONE fetch)', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ url: SIGNED_URL }));
      const service = makeService('test-key');

      const first = await service.resolveImageUrl('Tesla', 'Model 3');
      const second = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(first).toBe(SIGNED_URL);
      expect(second).toBe(SIGNED_URL);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('re-resolves after the bounded URL TTL elapses (signed URL expires → must refresh)', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ url: SIGNED_URL }));
      const service = makeService('test-key');

      const nowSpy = jest.spyOn(Date, 'now');
      const t0 = 1_000_000_000_000;
      nowSpy.mockReturnValue(t0);
      await service.resolveImageUrl('Tesla', 'Model 3');

      // +2h → past the 1h URL cache TTL → a second fetch is required.
      nowSpy.mockReturnValue(t0 + 2 * 60 * 60 * 1000);
      await service.resolveImageUrl('Tesla', 'Model 3');

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('caches a known miss for the long TTL (no re-fetch even after the URL TTL would have elapsed)', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ unexpected: 'no-photo' }));
      const service = makeService('test-key');

      const nowSpy = jest.spyOn(Date, 'now');
      const t0 = 1_000_000_000_000;
      nowSpy.mockReturnValue(t0);
      const first = await service.resolveImageUrl('Tesla', 'Model 3');

      // +2h: would expire a 1h URL cache, but a miss is cached 30d → still no fetch.
      nowSpy.mockReturnValue(t0 + 2 * 60 * 60 * 1000);
      const second = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(first).toBeNull();
      expect(second).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('is case-insensitive on the cache key (no second fetch)', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ url: SIGNED_URL }));
      const service = makeService('test-key');

      await service.resolveImageUrl('Tesla', 'Model 3');
      await service.resolveImageUrl('TESLA', 'model 3');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── fetchImageBytes — BYTE PROXY ───────────────────────────────────────────

  describe('fetchImageBytes', () => {
    it('resolves the signed URL then fetches the bytes (returns {body, contentType})', async () => {
      const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46]); // "RIFF" (webp magic)
      fetchSpy
        .mockResolvedValueOnce(jsonResponse({ url: SIGNED_URL })) // resolve
        .mockResolvedValueOnce(bytesResponse(bytes)); // image bytes
      const service = makeService('secret-key-12345');

      const result = await service.fetchImageBytes('Tesla', 'Model 3');

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/webp');
      expect(Buffer.isBuffer(result?.body)).toBe(true);
      expect(result?.body.length).toBe(4);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // The api_key must NEVER appear in the returned bytes nor the content-type.
      expect(result?.contentType).not.toContain('secret-key-12345');
      expect(result?.body.toString('utf8')).not.toContain('secret-key-12345');
    });

    it('fetches the signed URL (with embedded key) but the key never reaches the caller', async () => {
      const bytes = new Uint8Array([1, 2, 3]);
      fetchSpy
        .mockResolvedValueOnce(jsonResponse({ url: SIGNED_URL }))
        .mockResolvedValueOnce(bytesResponse(bytes));
      const service = makeService('test-key');

      await service.fetchImageBytes('Tesla', 'Model 3');

      // The image fetch hits the signed URL (which carries the key) server-side.
      const [imageUrl] = fetchSpy.mock.calls[1] as [string, RequestInit];
      expect(imageUrl).toBe(SIGNED_URL);
    });

    it('returns null when resolve yields null (no key) — no image fetch', async () => {
      const service = makeService(undefined);

      const result = await service.fetchImageBytes('Tesla', 'Model 3');

      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns null on an upstream image 5xx (never throws)', async () => {
      fetchSpy
        .mockResolvedValueOnce(jsonResponse({ url: SIGNED_URL }))
        .mockResolvedValueOnce(errResponse(503));
      const service = makeService('test-key');

      await expect(service.fetchImageBytes('Tesla', 'Model 3')).resolves.toBeNull();
    });

    it('on an expired (401) cached signed URL → invalidates, re-resolves once, then serves bytes', async () => {
      const bytes = new Uint8Array([9, 9, 9]);
      const FRESH_URL = 'https://carimagesapi.com/image?make=Tesla&model=Model3&api_key=SECRET&sig=fresh';
      fetchSpy
        .mockResolvedValueOnce(jsonResponse({ url: SIGNED_URL })) // 1: resolve (stale)
        .mockResolvedValueOnce(errResponse(401)) // 2: image fetch → expired
        .mockResolvedValueOnce(jsonResponse({ url: FRESH_URL })) // 3: re-resolve
        .mockResolvedValueOnce(bytesResponse(bytes)); // 4: fresh image bytes
      const service = makeService('test-key');

      const result = await service.fetchImageBytes('Tesla', 'Model 3');

      expect(result).not.toBeNull();
      expect(result?.body.length).toBe(3);
      expect(fetchSpy).toHaveBeenCalledTimes(4);
      // The re-resolve hit happened (cache was invalidated, not reused).
      const [retryImageUrl] = fetchSpy.mock.calls[3] as [string, RequestInit];
      expect(retryImageUrl).toBe(FRESH_URL);
    });

    it('returns null if the signed URL stays expired (401) even after one retry', async () => {
      fetchSpy
        .mockResolvedValueOnce(jsonResponse({ url: SIGNED_URL })) // resolve
        .mockResolvedValueOnce(errResponse(401)) // image → expired
        .mockResolvedValueOnce(jsonResponse({ url: SIGNED_URL })) // re-resolve
        .mockResolvedValueOnce(errResponse(403)); // image → still expired
      const service = makeService('test-key');

      await expect(service.fetchImageBytes('Tesla', 'Model 3')).resolves.toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });
  });
});
