/**
 * Tests unitaires — VehicleImageService
 *
 * On résout l'URL photo d'un véhicule sans appel réseau réel :
 * - le `fetch` global est mocké (jest.spyOn) pour simuler CarImages ;
 * - ConfigService est un stub renvoyant (ou non) une clé CARIMAGES_API_KEY.
 *
 * Cas couverts (mirroir de toll.service.spec.ts) :
 *   with-key→URL · no-key→null(no-fetch) · blank→null(no-fetch) ·
 *   401/429/timeout/parse→null(never-throws) · unrecognised-shape→null ·
 *   http(non-https)→dropped · key-in-header + key-not-in-return · cache(one-fetch).
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

/** Réponse fetch OK avec un corps JSON arbitraire. */
function okResponse(body: unknown): Response {
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
  } as unknown as Response;
}

const IMG = 'https://cdn.carimagesapi.com/tesla-model3.jpg';

// ── Suite ────────────────────────────────────────────────────────────────────

describe('VehicleImageService', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Succès (CarImages ok) ──────────────────────────────────────────────────

  describe('resolve (CarImages success)', () => {
    it('returns the image URL parsed from the response', async () => {
      fetchSpy.mockResolvedValue(okResponse({ url: IMG }));
      const service = makeService('test-key');

      const result = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(result).toBe(IMG);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('parses a results[] array shape defensively', async () => {
      fetchSpy.mockResolvedValue(okResponse({ results: [{ image: IMG }] }));
      const service = makeService('test-key');

      const result = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(result).toBe(IMG);
    });

    it('drops a non-https (http) URL → null', async () => {
      fetchSpy.mockResolvedValue(
        okResponse({ url: 'http://insecure.example.com/x.jpg' }),
      );
      const service = makeService('test-key');

      const result = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(result).toBeNull();
    });

    it('returns null on an unrecognised response shape (never throws)', async () => {
      fetchSpy.mockResolvedValue(okResponse({ unexpected: 'shape' }));
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
  });

  // ── Clé en header + jamais dans le retour ──────────────────────────────────

  describe('key safety', () => {
    it('sends the configured key in the request header and never returns it', async () => {
      fetchSpy.mockResolvedValue(okResponse({ url: IMG }));
      const service = makeService('secret-key-12345');

      const result = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];

      const headers = init.headers as Record<string, string>;
      expect(headers['x-api-key']).toBe('secret-key-12345');

      // The key is server-side only — it must NEVER appear in the returned value
      // nor be smuggled into the outbound URL query string.
      expect(result).toBe(IMG);
      expect(result).not.toContain('secret-key-12345');
      expect(url).not.toContain('secret-key-12345');
    });

    it('URL-encodes make/model into the query string', async () => {
      fetchSpy.mockResolvedValue(okResponse({ url: IMG }));
      const service = makeService('test-key');

      await service.resolveImageUrl('Mercedes-Benz', 'Model 3');

      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('Mercedes-Benz');
      expect(url).toContain('Model%203'); // space encoded
    });
  });

  // ── Cache (TTL long) ───────────────────────────────────────────────────────

  describe('cache', () => {
    it('serves the second identical resolve from cache (only ONE fetch)', async () => {
      fetchSpy.mockResolvedValue(okResponse({ url: IMG }));
      const service = makeService('test-key');

      const first = await service.resolveImageUrl('Tesla', 'Model 3');
      const second = await service.resolveImageUrl('Tesla', 'Model 3');

      expect(first).toBe(IMG);
      expect(second).toBe(IMG);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('is case-insensitive on the cache key (no second fetch)', async () => {
      fetchSpy.mockResolvedValue(okResponse({ url: IMG }));
      const service = makeService('test-key');

      await service.resolveImageUrl('Tesla', 'Model 3');
      await service.resolveImageUrl('TESLA', 'model 3');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
