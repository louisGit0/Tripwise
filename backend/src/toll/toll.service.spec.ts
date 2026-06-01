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
import type { RouteStep } from '../mapbox/mapbox.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const COORDS: [number, number][] = [
  [2.3522, 48.8566], // Paris
  [4.8357, 45.764], // Lyon
  [5.3698, 43.2965], // Marseille
];

/** Construit un RouteStep compact (le `name` est rarement pertinent ici). */
const step = (
  distanceMeters: number,
  ref: string | null,
  name: string | null = null,
): RouteStep => ({ distanceMeters, ref, name });

// ── Fixtures route-aware (steps) ───────────────────────────────────────────

/** Paris→Lyon : ~450 km de A6/A7 → ancrage de calibration (€30–45). */
const PARIS_LYON_STEPS: RouteStep[] = [step(250_000, 'A 6'), step(200_000, 'A 7')];

/** Aucune autoroute : départementales / nationales / refs nulles → 0. */
const NO_AUTOROUTE_STEPS: RouteStep[] = [
  step(120_000, 'D 7'),
  step(80_000, 'N 104'),
  step(30_000, null, 'Rue de la Paix'),
];

/** Autoroutes gratuites uniquement (A75 / A84) → 0. */
const FREE_STEPS: RouteStep[] = [step(180_000, 'A 75'), step(150_000, 'A 84')];

/** Mixte : A6 payante (200 km) + A75 gratuite (100 km) + N7 (50 km). */
const MIXED_STEPS: RouteStep[] = [
  step(200_000, 'A 6'),
  step(100_000, 'A 75'),
  step(50_000, 'N 7'),
];

/** Variantes d'orthographe Mapbox d'une même autoroute payante (100 km chacune). */
const REF_VARIANT_STEPS: RouteStep[] = [
  step(100_000, 'A 6'),
  step(100_000, 'A6'),
  step(100_000, 'A-6'),
  step(100_000, 'A 6;E 15'),
];

/**
 * Steps malformés — ne doivent jamais lever ni contribuer :
 *  - ref null + distanceMeters manquant ;
 *  - ref vide ;
 *  - ref autoroute valide MAIS distanceMeters manquant (→ 0 km).
 */
const MALFORMED_STEPS: RouteStep[] = [
  { ref: null } as unknown as RouteStep,
  step(0, ''),
  { ref: 'A 6' } as unknown as RouteStep,
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

  // ── Estimation route-aware (steps) — TOLL-07 ───────────────────────────────

  describe('route-aware estimate (steps)', () => {
    const service = makeService(undefined);

    it('Paris→Lyon anchor: A6+A7 (~450 km) → cost in €30–45 band, isEstimate true', async () => {
      const r = await service.computeTollCost(COORDS, 450, 14_400, PARIS_LYON_STEPS);
      expect(r).not.toBeNull();
      expect(r!.cost).toBeGreaterThanOrEqual(30);
      expect(r!.cost).toBeLessThanOrEqual(45);
      expect(r!.isEstimate).toBe(true);
    });

    it('no autoroute (D/N roads, null ref) → cost 0, isEstimate true', async () => {
      const r = await service.computeTollCost(COORDS, 450, 14_400, NO_AUTOROUTE_STEPS);
      expect(r).toEqual<TollResult>({ cost: 0, isEstimate: true });
    });

    it('free autoroute only (A75 / A84) → cost 0, isEstimate true', async () => {
      const r = await service.computeTollCost(COORDS, 450, 14_400, FREE_STEPS);
      expect(r).toEqual<TollResult>({ cost: 0, isEstimate: true });
    });

    it('mixed: only A6 (200 km) counts; A75 free + N7 ignored → 18.0', async () => {
      const r = await service.computeTollCost(COORDS, 450, 14_400, MIXED_STEPS);
      expect(r).toEqual<TollResult>({ cost: 18.0, isEstimate: true });
    });

    it('ref format variants "A 6"/"A6"/"A-6"/"A 6;E 15" (100 km each) → 36.0', async () => {
      const r = await service.computeTollCost(COORDS, 450, 14_400, REF_VARIANT_STEPS);
      expect(r).toEqual<TollResult>({ cost: 36.0, isEstimate: true });
    });

    it('never throw on malformed steps (missing ref/distance, empty string) → 0', async () => {
      const r = await service.computeTollCost(COORDS, 450, 14_400, MALFORMED_STEPS);
      expect(r).toEqual<TollResult>({ cost: 0, isEstimate: true });
    });

    it('empty steps array → graceful speed-heuristic fallback (28.35)', async () => {
      const r = await service.computeTollCost(COORDS, 450, 14_400, []);
      expect(r).toEqual<TollResult>({ cost: 28.35, isEstimate: true });
    });

    it('fallback no steps (no 4th arg) → speed heuristic preserved (28.35)', async () => {
      const r = await service.computeTollCost(COORDS, 450, 14_400);
      expect(r).toEqual<TollResult>({ cost: 28.35, isEstimate: true });
    });
  });
});
