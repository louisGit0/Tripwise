/**
 * Tests unitaires — TollService
 *
 * On teste le calcul du coût des péages sans appel réseau réel :
 * - le `fetch` global est mocké (jest.spyOn) pour simuler TollGuru ;
 * - ConfigService est un stub renvoyant (ou non) une clé TOLLGURU_API_KEY.
 *
 * Cas couverts (RESEARCH "Phase Requirements → Test Map") :
 *   precise · fallback(no-key) · fallback(non-ok/timeout/parse) ·
 *   no-toll · class-1 body · cache · heuristic(speed bands + null).
 */
import { ConfigService } from '@nestjs/config';
import { TollService, TollResult } from './toll.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const COORDS: [number, number][] = [
  [2.3522, 48.8566], // Paris
  [4.8357, 45.764], // Lyon
  [5.3698, 43.2965], // Marseille
];

/** Construit un TollService avec un ConfigService stub. */
function makeService(apiKey?: string): TollService {
  const config = {
    get: (key: string): string | undefined =>
      key === 'TOLLGURU_API_KEY' ? apiKey : undefined,
  } as unknown as ConfigService;
  return new TollService(config);
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

// ── Suite ────────────────────────────────────────────────────────────────────

describe('TollService', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Précis (TollGuru ok) ─────────────────────────────────────────────────

  describe('precise (TollGuru success)', () => {
    it('returns a real cost (isEstimate=false) parsed from route.costs.tag', async () => {
      fetchSpy.mockResolvedValue(
        okResponse({ route: { hasTolls: true, costs: { tag: 37.5, cash: 39.2 } } }),
      );
      const service = makeService('test-key');

      const result = await service.computeTollCost(COORDS, 460, 16_000);

      expect(result).toEqual<TollResult>({ cost: 37.5, isEstimate: false });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('falls back through cost paths (cash, then minimumTollCost)', async () => {
      fetchSpy.mockResolvedValue(
        okResponse({ route: { hasTolls: true, costs: { cash: 12.34 } } }),
      );
      const service = makeService('test-key');

      const result = await service.computeTollCost(COORDS, 200, 7_200);

      expect(result).toEqual<TollResult>({ cost: 12.34, isEstimate: false });
    });

    it('rounds the parsed cost to 2 decimals', async () => {
      fetchSpy.mockResolvedValue(
        okResponse({ route: { hasTolls: true, costs: { tag: 37.555 } } }),
      );
      const service = makeService('test-key');

      const result = await service.computeTollCost(COORDS, 460, 16_000);

      expect(result?.cost).toBe(37.56);
      expect(result?.isEstimate).toBe(false);
    });
  });

  // ── No-toll (route réellement sans péage) ─────────────────────────────────

  describe('no-toll route', () => {
    it('returns { cost: 0, isEstimate: false } when route.hasTolls === false', async () => {
      fetchSpy.mockResolvedValue(okResponse({ route: { hasTolls: false } }));
      const service = makeService('test-key');

      const result = await service.computeTollCost(COORDS, 460, 16_000);

      expect(result).toEqual<TollResult>({ cost: 0, isEstimate: false });
    });
  });

  // ── Class-1 request body ──────────────────────────────────────────────────

  describe('class-1 passenger car request', () => {
    it('posts to the polyline endpoint with source:mapbox + class-1 vehicle + x-api-key', async () => {
      fetchSpy.mockResolvedValue(
        okResponse({ route: { hasTolls: true, costs: { tag: 10 } } }),
      );
      const service = makeService('secret-key');

      await service.computeTollCost(COORDS, 460, 16_000);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('complete-polyline-from-mapping-service');
      expect(init.method).toBe('POST');

      const headers = init.headers as Record<string, string>;
      expect(headers['x-api-key']).toBe('secret-key');

      const body = JSON.parse(init.body as string) as {
        source: string;
        polyline: string;
        vehicle: { type: string };
      };
      expect(body.source).toBe('mapbox');
      expect(body.vehicle.type).toBe('2AxlesAuto');
      expect(typeof body.polyline).toBe('string');
      expect(body.polyline.length).toBeGreaterThan(0);
    });
  });

  // ── Cache (D-06) ──────────────────────────────────────────────────────────

  describe('cache', () => {
    it('serves the second identical call from cache (only ONE fetch)', async () => {
      fetchSpy.mockResolvedValue(
        okResponse({ route: { hasTolls: true, costs: { tag: 21.5 } } }),
      );
      const service = makeService('test-key');

      const first = await service.computeTollCost(COORDS, 460, 16_000);
      const second = await service.computeTollCost(COORDS, 460, 16_000);

      expect(first).toEqual<TollResult>({ cost: 21.5, isEstimate: false });
      expect(second).toEqual<TollResult>({ cost: 21.5, isEstimate: false });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── Repli silencieux (D-03) ───────────────────────────────────────────────

  describe('fallback to heuristic (D-03, never throws)', () => {
    it('no key → heuristic estimate, fetch never called', async () => {
      const service = makeService(undefined);

      // 450 km en 4h → 112.5 km/h ≥ 95 → fraction 0.70 → 450*0.70*0.09 = 28.35
      const result = await service.computeTollCost(COORDS, 450, 14_400);

      expect(result).toEqual<TollResult>({ cost: 28.35, isEstimate: true });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('non-ok HTTP (401) → heuristic, never throws', async () => {
      fetchSpy.mockResolvedValue(errResponse(401));
      const service = makeService('test-key');

      const result = await service.computeTollCost(COORDS, 450, 14_400);

      expect(result).toEqual<TollResult>({ cost: 28.35, isEstimate: true });
    });

    it('over-quota (429) → heuristic, never throws', async () => {
      fetchSpy.mockResolvedValue(errResponse(429));
      const service = makeService('test-key');

      const result = await service.computeTollCost(COORDS, 450, 14_400);

      expect(result).toEqual<TollResult>({ cost: 28.35, isEstimate: true });
    });

    it('timeout / network error → heuristic, never throws', async () => {
      fetchSpy.mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
      const service = makeService('test-key');

      const result = await service.computeTollCost(COORDS, 450, 14_400);

      expect(result).toEqual<TollResult>({ cost: 28.35, isEstimate: true });
    });

    it('JSON parse failure → heuristic, never throws', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('invalid json');
        },
      } as unknown as Response);
      const service = makeService('test-key');

      const result = await service.computeTollCost(COORDS, 450, 14_400);

      expect(result).toEqual<TollResult>({ cost: 28.35, isEstimate: true });
    });

    it('ok but no parseable cost path → heuristic, never throws', async () => {
      fetchSpy.mockResolvedValue(okResponse({ unexpected: 'shape' }));
      const service = makeService('test-key');

      const result = await service.computeTollCost(COORDS, 450, 14_400);

      expect(result).toEqual<TollResult>({ cost: 28.35, isEstimate: true });
    });
  });

  // ── Heuristique : bandes de vitesse + null ────────────────────────────────

  describe('heuristic (estimateFrenchTolls, no key)', () => {
    const service = makeService(undefined);

    it('avg speed ≥ 95 km/h → fraction 0.70', async () => {
      // 100 km en 3600 s → 100 km/h → 100*0.70*0.09 = 6.30
      const r = await service.computeTollCost(COORDS, 100, 3_600);
      expect(r).toEqual<TollResult>({ cost: 6.3, isEstimate: true });
    });

    it('80–95 km/h → fraction 0.45', async () => {
      // 100 km en 4000 s → 90 km/h → 100*0.45*0.09 = 4.05
      const r = await service.computeTollCost(COORDS, 100, 4_000);
      expect(r).toEqual<TollResult>({ cost: 4.05, isEstimate: true });
    });

    it('65–80 km/h → fraction 0.20', async () => {
      // 100 km en 5143 s → ~70 km/h → 100*0.20*0.09 = 1.80
      const r = await service.computeTollCost(COORDS, 100, 5_143);
      expect(r).toEqual<TollResult>({ cost: 1.8, isEstimate: true });
    });

    it('< 65 km/h → cost 0 (route urbaine/rurale sans péage)', async () => {
      // 100 km en 7200 s → 50 km/h → 0
      const r = await service.computeTollCost(COORDS, 100, 7_200);
      expect(r).toEqual<TollResult>({ cost: 0, isEstimate: true });
    });

    it('distance < 5 km → null', async () => {
      const r = await service.computeTollCost(COORDS, 3, 600);
      expect(r).toBeNull();
    });

    it('durationSeconds === 0 → null', async () => {
      const r = await service.computeTollCost(COORDS, 100, 0);
      expect(r).toBeNull();
    });
  });
});
