# Phase 1: Precise Tolls End-to-End (Web) - Research

**Researched:** 2026-05-29
**Domain:** External toll-pricing API (TollGuru v2) + NestJS service extraction + in-memory caching + web result-page presentation
**Confidence:** MEDIUM-HIGH (codebase: HIGH/verified by reading; TollGuru API shape: MEDIUM/training-only, no key to verify live)

## Summary

The toll feature is ~70% wired already: `TripResult.tollCost` / `tollIsEstimate` exist, the heuristic fallback works, the save flow persists `tollsCost`, stats already include tolls via `totalCost`, and the web result page renders a PÉAGES cell. This phase makes the TollGuru branch **correct, route-precise, cached, and well-presented**, plus closes a small persistence gap so the saved-trip detail can show the real/estimate badge.

The single biggest risk is the TollGuru integration itself. The existing branch (a) calls the **origin-destination-waypoints** endpoint with only O/D coordinates (contradicting locked decision D-05 which requires sending the **full route polyline**), and (b) parses the response at `data.summary.costs.cash`, a path that does **not** match the documented TollGuru v2 polyline-endpoint response shape. Both must change. Because no TollGuru key is available in this session, every claim about TollGuru's exact request body, response shape, precision expectations, and quota is tagged `[ASSUMED]` and **must be verified once against a real key with a known-toll route** (e.g. Paris→Lyon on the A6, ~€37 class 1) before the precise branch is trusted.

**Primary recommendation:** Extract a focused `TollService` (heuristic + TollGuru + cache + polyline encoding). Switch to the polyline endpoint `POST /toll/v2/complete-polyline-from-mapping-service`, feed it a Mapbox `polyline6` geometry, parse cost from `route.costs.{tag,cash}`, fall back silently to the heuristic on any failure (D-03), cache results 30 days in an in-memory `Map` keyed by a polyline hash (D-06), keep the key server-side, and add a `Tooltip` + `Pill` badge on the web result page. Persist a `tollIsEstimate` flag on the `Trip` entity so the saved detail page shows the same badge.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Show a small badge next to the toll amount — "réel" when the figure comes from TollGuru, "≈ estimé" when it comes from the French heuristic.
- **D-02:** The badge carries a tooltip (hover on desktop / tap on touch) explaining the source: TollGuru precise pricing vs. the indicative French estimation. The existing `tollIsEstimate` boolean drives which badge/tooltip is shown.
- **D-03:** When TollGuru is unavailable (no key, over quota, error, timeout), fall back to the heuristic estimate and surface the "≈ estimé" badge — no error shown to the user, the number still appears.
- **D-04:** When a route genuinely has no tolls (toll cost = 0), **hide the toll line entirely** on the result rather than showing "0 €". (The toll line only appears when there is a toll cost > 0.)
- **D-05:** Send the **full Mapbox route polyline** (the geometry already computed by `MapboxService.getDirections`) to TollGuru so the toll is computed barrier-to-barrier along the exact displayed route — not just origin→destination.
- **D-06:** Cache TollGuru results with a **30-day TTL**. Cache key must reflect the route (rounded origin/destination + distance, or a polyline hash) so identical routes reuse the cached toll and never issue a second TollGuru call. Existing fuel/charging caches use an in-memory `Map` with TTL — same pattern, longer TTL.

### Claude's Discretion
- Exact cache-key construction (polyline hash vs rounded coords + distance), TollGuru endpoint/route choice, error/timeout thresholds, and the precise badge/tooltip markup — consistent with existing patterns.
- Whether to extract a dedicated `TollService` from the 726-line `TripsService` — recommended but at the planner's discretion.

### Deferred Ideas (OUT OF SCOPE)
- Multi-class tolls (trucks, motorcycles, towing) — v2.
- Per-segment / barrier-by-barrier toll breakdown — v2.
- "Avoid tolls" routing alternative — v2.
- Mobile toll display — Phase 5.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOLL-01 | Precise toll via TollGuru when key configured (real, not estimate) | Switch to polyline endpoint + correct response parsing (Standard Stack, Pitfall 1–3); `tollIsEstimate=false` already set on success |
| TOLL-02 | Fall back to heuristic when TollGuru unavailable/over-quota/unconfigured; user clearly sees estimate | Existing `try/catch`→heuristic path (verified); badge "≈ estimé" (D-01/D-02); harden fall-through on non-ok + parse failure (Pitfall 3) |
| TOLL-03 | Class-1 passenger car | TollGuru `vehicle.type: "2AxlesAuto"` already in code (Standard Stack; verify naming with key) |
| TOLL-04 | Broken out in result + included in total (separate line + real/estimate indicator) | Result page already sums toll into total + has PÉAGES cell; add Pill badge + Tooltip, hide-when-0 (Web Display, Pitfall 6) |
| TOLL-05 | Persisted on saved trips + reflected in history/stats totals | `tollsCost` column + save flow + stats sum `totalCost` (verified — already works for the amount); gap: persist `tollIsEstimate` for the detail badge (Pitfall 7) |
| TOLL-06 | Cached + rate-safe server-side; key never client-side | In-memory `Map` w/ 30-day TTL keyed by polyline hash (Architecture); key read via `ConfigService`, only `tollCost`/`tollIsEstimate` leave the server (verified) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| TollGuru precise pricing call | API / Backend (`TollService`) | — | API key must never reach the client; only `tollCost`/`tollIsEstimate` are serialized to the response |
| Route polyline source | API / Backend (`MapboxService`) | — | Geometry is already computed server-side in `getDirections`; pass it to `TollService` directly |
| Heuristic fallback estimate | API / Backend (`TollService`) | — | Pure server-side computation; identical contract `{ cost, isEstimate } | null` |
| Toll result caching (30-day) | API / Backend (in-memory `Map`) | Database (optional durable cache, future) | In-memory mirrors existing pattern; per-process/per-replica caveat (see Pitfall 4) |
| Toll persistence | Database (`Trip.tollsCost`, new `Trip.tollIsEstimate`) | — | Saved trips must reflect the toll and its source for history/detail |
| Total cost assembly | API / Backend (sets `tollCost`) | Browser/Client (sums into displayed total — already done) | Backend provides parts; client renders the grand total |
| Real/estimate badge + tooltip | Browser / Client (web result + detail) | — | Pure presentation driven by `tollIsEstimate` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TollGuru Tolls API v2 | `apis.tollguru.com/toll/v2/*` | Real toll cost along a route | Only practical O/D toll API for France in this project (STATE decision) `[CITED: backend code + .env.example]` |
| Mapbox Directions v5 | (existing `MapboxService`) | Route geometry → polyline for TollGuru | Already integrated; can emit `polyline6` `[VERIFIED: mapbox.service.ts]` |
| Node global `fetch` + `AbortSignal.timeout` | Node 18+ (`@types/node ^24`) | HTTP to TollGuru, 8s timeout | Already the project's HTTP pattern (no axios on backend) `[VERIFIED: trips.service.ts, fuel-prices.service.ts]` |
| `@nestjs/config` `ConfigService` | `^4.0.4` | Read `TOLLGURU_API_KEY` server-side | Existing pattern `[VERIFIED: package.json]` |

### Supporting (polyline encoding — only if NOT requesting polyline6 from Mapbox)
| Option | Purpose | When to Use |
|--------|---------|-------------|
| **Inline encoder (~30 LOC, zero-dep)** | GeoJSON `[lng,lat][]` → Google encoded polyline | **Preferred** if you keep `getDirections` returning GeoJSON and encode in `TollService`. No supply-chain risk. |
| `@mapbox/polyline` `1.2.1` `[ASSUMED]` | Same, as a dependency | Only if you want a maintained lib; adds a dependency for ~30 lines of logic |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| polyline endpoint | `origin-destination-waypoints` (current code) | Violates D-05 (TollGuru routes O/D itself, ignores the displayed route) — **do not use** |
| in-memory `Map` cache | Redis (Upstash) / Postgres route-signature cache | Durable across Render restarts/replicas, but adds infra; **defer to V2** (CONCERNS tech-debt item) |
| encode polyline in `TollService` | request `geometries=polyline6` from Mapbox directly | Avoids encoding + precision ambiguity, costs one extra Mapbox geometry (still one Directions call) — **recommended** (see Pitfall 2) |

### Installation
No new runtime dependency required if you use the inline encoder or Mapbox `polyline6`. The TollGuru key is configuration only:
```bash
# backend/.env  (already documented in .env.example)
TOLLGURU_API_KEY=<key from tollguru.com dashboard>
```
On Render: add `TOLLGURU_API_KEY` as an environment variable (currently unset in prod — toll is always heuristic today, per CONCERNS.md).

**Version verification:** `npm view @mapbox/polyline version` → `1.2.1` (registry-confirmed only; not authoritatively sourced → `[ASSUMED]`). The inline-encoder route needs no registry lookup.

## Package Legitimacy Audit

> slopcheck was not available in this environment. Per protocol, any optional package is tagged `[ASSUMED]` and must be gated behind a `checkpoint:human-verify` before install. The recommended path adds **no new package**.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@mapbox/polyline` | npm `1.2.1` | mature (Mapbox org) | high | github.com/mapbox/polyline | not run | Optional — `[ASSUMED]`, prefer inline encoder instead |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
POST /trips/calculate  (JwtAuthGuard)
        │
        ▼
   TripsService.calculate
        │
        ├─► MapboxService.getDirections(origin,dest)
        │        └─ returns { distanceMeters, durationSeconds,
        │                     geometry(GeoJSON LineString),
        │                     polyline6(encoded)  ◄── NEW option }
        │
        ├─► (Promise.all) cost branch  (fuel | electric)  [unchanged]
        │
        └─► TollService.computeTollCost(polyline, distanceKm, durationSeconds)
                 │
                 ├─ cache HIT (Map, key=hash(polyline)) ──────────────► { cost, isEstimate:false }
                 │
                 ├─ key present? ──► fetch TollGuru /complete-polyline-from-mapping-service
                 │                        │  ok + costs found ─► cache+return { cost, isEstimate:false }
                 │                        │  no tolls (hasTolls=false) ─► return { cost:0, isEstimate:false }
                 │                        │  401/429/5xx/timeout/parse-fail ─┐
                 │                                                            ▼ (silent, D-03)
                 └─ heuristic estimateFrenchTolls(distanceKm,durationSeconds) ─► { cost, isEstimate:true } | null
        │
        ▼
   TripResult { ..., tollCost, tollIsEstimate }  ─── HTTP ───►  web result page
                                                                   ├─ sum into total (done)
                                                                   ├─ PÉAGES line (hide if 0/null) D-04
                                                                   └─ Pill "réel"/"≈ estimé" + Tooltip D-01/02

POST /trips/save  ─► Trip { tollsCost, tollIsEstimate(NEW) }  ─► history/stats (totalCost already includes toll)
```

### Recommended Structure (minimal `TollService` extraction)
```
backend/src/toll/
├── toll.module.ts            # exports TollService
├── toll.service.ts           # computeTollCost + estimateFrenchTolls + cache + polyline encode
└── toll.service.spec.ts      # heuristic + response-parsing unit tests (moved from trips.service.spec)
```
Wire `TollModule` into `TripsModule.imports`; inject `TollService` into `TripsService`. Keep the public contract identical: `computeTollCost(...) => Promise<{ cost: number; isEstimate: boolean } | null>`. This removes ~75 lines from the 726-line `TripsService` and isolates the only new external dependency. (STATE watchpoint + CONCERNS tech-debt item both call for exactly this.)

### Pattern: silent degradation to heuristic (D-03)
**What:** Every TollGuru failure mode funnels to `estimateFrenchTolls`. **When:** no key, 401, 429, 5xx, network error, 8s timeout, non-ok status, JSON parse error, missing cost path. **Example:**
```ts
// Source: existing trips.service.ts pattern, hardened
if (apiKey) {
  try {
    const res = await fetch(POLYLINE_URL, { method:'POST', headers, body, signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      const cost = parseTollGuruCost(data);          // defensive multi-path read (Pitfall 3)
      if (cost !== null) return { cost: round2(cost), isEstimate: false };
      if (data?.route?.hasTolls === false) return { cost: 0, isEstimate: false }; // genuine no-toll route
    } else {
      this.logger.warn(`TollGuru HTTP ${res.status}`);  // log once, then fall through
    }
  } catch (e) { this.logger.warn(`TollGuru failed, using heuristic: ${e}`); }
}
const est = this.estimateFrenchTolls(distanceKm, durationSeconds);
return est === null ? null : { cost: est, isEstimate: true };
```

### Anti-Patterns to Avoid
- **Sending only O/D to TollGuru** (current `origin-destination-waypoints` call) — violates D-05; TollGuru picks its own route and the toll won't match the displayed route.
- **Throwing on TollGuru failure** — D-03 requires the number to still appear via the heuristic; never surface a toll error to the user.
- **Putting the TollGuru key in any response or in the web bundle** — server-side only (TOLL-06).
- **Removing the péages grid cell by leaving an empty slot** — build the metrics array then filter, so the grid reflows (Pitfall 6).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toll tariffs / barrier pricing | A French concession tariff table (Vinci/APRR/ASF…) | TollGuru API | Tariffs vary by concession, vehicle class, time; maintaining them is infeasible |
| Route between O/D | Custom routing | `MapboxService.getDirections` (exists) | Already integrated; provides geometry + polyline6 |
| HTTP timeout/abort | Manual `setTimeout`+abort plumbing | `AbortSignal.timeout(ms)` | Node built-in, already the project idiom |
| Polyline encoding (if needed) | A novel encoder | Inline Google-polyline encoder (~30 LOC) **or** Mapbox `polyline6` directly | Algorithm is fixed/standard; reuse the known one |

**Key insight:** The heuristic (`estimateFrenchTolls`) is a *fallback*, not the product. Keep it, but it is known-inaccurate (CONCERNS) — the value of this phase is the precise TollGuru path being correct and cached.

## Runtime State Inventory

> This phase is mostly a backend feature add plus a small service extraction and one DB migration. Inventory of runtime state that a code edit alone will NOT update:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `trips.tolls_cost` column exists and is populated on save (value already includes precise/estimate toll). New `trips.toll_is_estimate` column needed for the detail badge. | **Data migration not required** for existing rows (default `false` is an acceptable "unknown→estimate" assumption); **code migration**: hand-write `AddTollIsEstimateToTrips` adding `toll_is_estimate boolean NOT NULL DEFAULT false` |
| Live service config | `TOLLGURU_API_KEY` is **not set on Render** (prod is heuristic-only today, per CONCERNS). It is configured via the Render dashboard env, not git. | Set the key in Render env to activate the precise path; until then everything degrades to heuristic (by design, D-03) |
| OS-registered state | None. | None — verified, no schedulers/daemons involved |
| Secrets / env vars | `TOLLGURU_API_KEY` documented in `backend/.env.example` (currently empty). | Add real key to local `.env` and Render env; never commit it |
| Build artifacts | None. New `toll/` module compiles with `nest build`; SQLite e2e uses `synchronize` so the new column appears automatically in tests. | None |

**Migration note:** Use a **hand-written** migration (project convention — `migration:generate` is unreliable here due to the `simple-enum` vs native-enum mismatch documented in CONCERNS). A plain `boolean` column is unaffected by that issue.

## Common Pitfalls

### Pitfall 1: Wrong TollGuru endpoint (O/D instead of polyline) `[ASSUMED — verify with key]`
**What goes wrong:** The current code calls `/toll/v2/origin-destination-waypoints` with only `origin`/`destination`. That endpoint makes TollGuru compute its own route — the toll will not match the Mapbox route the user sees, breaking D-05.
**How to avoid:** Call the polyline endpoint instead: `POST https://apis.tollguru.com/toll/v2/complete-polyline-from-mapping-service` with body `{ source: "mapbox", polyline: "<encoded>", vehicle: { type: "2AxlesAuto" } }`.
**Warning signs:** Toll amount inconsistent with the displayed route distance; toll appears for routes the map shows as toll-free.

### Pitfall 2: Polyline precision/source mismatch (silent wrong/zero tolls) `[ASSUMED — #1 thing to verify with key]`
**What goes wrong:** TollGuru decodes the polyline according to the `source` field. Mapbox geometry encoded at precision 5 but declared as a precision-6 source (or vice-versa) decodes to garbage coordinates → TollGuru returns wrong tolls or none, with **no error**.
**How to avoid:** Easiest robust path — request `geometries=polyline6` from Mapbox (one Directions call) and send `source: "mapbox"`, eliminating local encoding. If encoding GeoJSON locally, confirm the precision/source pairing against a known route before trusting it.
**Warning signs:** `hasTolls:false` on routes that definitely have tolls; toll = 0 for Paris→Lyon.
**Mandatory verification:** Add a `checkpoint:human-verify` task — with a real key, calculate Paris→Lyon (A6) and confirm `tollIsEstimate:false` with toll ≈ €35–40 (class 1) before considering the precise branch done.

### Pitfall 3: Response cost path likely wrong (`summary.costs.cash`) `[ASSUMED — verify with key]`
**What goes wrong:** Current code reads `data.summary?.costs?.cash`. The documented TollGuru v2 polyline-endpoint response nests costs under `route` (e.g. `response.route.costs.{tag,cash,minimumTollCost}`) with `response.route.hasTolls` and `response.route.tolls[]`. Reading the wrong path returns `null` → silently degrades to heuristic even when the key works.
**How to avoid:** Defensive multi-path parse: try `route.costs.tag`, `route.costs.cash`, `route.costs.minimumTollCost`, then legacy `summary.costs.*`; treat `route.hasTolls === false` as a genuine `cost:0` (real). Log the raw response once in dev with a real key to lock the exact path.
**Warning signs:** Key is set but `tollIsEstimate` is always `true`.

### Pitfall 4: In-memory cache is per-process / lost on Render (quota burn) `[VERIFIED: CONCERNS.md]`
**What goes wrong:** The 30-day `Map` cache lives in one Node process. On Render free tier the dyno sleeps after 15 min and on every deploy the cache is wiped; multiple replicas wouldn't share it. With a **~500 req/month** TollGuru free quota, repeated identical routes after a cold start re-call TollGuru.
**How to avoid:** Accept in-memory `Map` for V1 (consistent with fuel/charging caches, low traffic, single free-tier instance) and **document the limitation**. Note the durable option for V2: a Postgres route-signature → toll cache, or Redis. The 30-day TTL + persisting toll on saved trips already softens the impact.
**Warning signs:** Quota exhaustion despite few distinct routes.

### Pitfall 5: Quota / rate-limit handling (`429`) `[ASSUMED — confirm exact limits with key/dashboard]`
**What goes wrong:** Free tier ≈ 500 req/month (per `.env.example` + STATE). Over-quota returns `429`; the request must degrade silently (D-03), not error.
**How to avoid:** Treat any non-ok status (incl. 429) and timeouts as fall-through to heuristic; the cache is the primary quota guard.
**Warning signs:** Mid-month, all calls return `429` → all results become estimates (expected, acceptable).

### Pitfall 6: Hiding the toll line breaks the result grid (D-04)
**What goes wrong:** The result page renders a fixed `grid-cols-2` of exactly 4 metric cells. Conditionally dropping the PÉAGES cell with naive JSX can leave a hole or unbalanced grid.
**How to avoid:** Build the metrics as an array, `.filter()` out the péages entry when `tollCost == null || tollCost === 0`, then map — the 2-col grid reflows to 3 cells cleanly.
**Warning signs:** Empty grid cell or misaligned layout on toll-free routes.

### Pitfall 7: Saved-trip detail can't show the badge (missing persisted flag) `[VERIFIED: trip.entity.ts + [id]/page.tsx]`
**What goes wrong:** `Trip` persists `tollsCost` but **not** `tollIsEstimate`. The detail page (`trips/[id]`) shows the toll amount when `> 0` but has no way to know if it was real or estimated — so it cannot render the D-01 badge consistently with the result page.
**How to avoid:** Add `tollIsEstimate boolean` to the `Trip` entity (+ migration), to `SaveTripDto`, to the save flow, to the `SavedTrip` web type, and render the same Pill badge on the detail page. (Result-page-only badge is the minimal scope; persisting is recommended to complete TOLL-05's "reflected in detail" intent.)

### Pitfall 8: Stale comments / double-count check `[VERIFIED]`
**What goes wrong:** `Trip.tollsCost` comment says "V1 = 0 (non calculé)" and `SaveTripDto.tollsCost` says "toujours 0 en V1" — both now false. Also confirm no double-counting.
**How to avoid:** Update the comments. Confirmed: stats sum `trip.totalCost` (which already includes toll, set on save as `cost.totalCost + tollCost`); `tollsCost` is a separate breakout column — **no double count**. Leave that logic as-is.

## Code Examples

### Encode Mapbox GeoJSON → Google polyline (zero-dependency, precision 5)
```ts
// Source: standard Google encoded-polyline algorithm (precision 5). Pair with the matching TollGuru `source`.
function encodePolyline(coords: [number, number][]): string {        // coords = [lng, lat][]
  let last = [0, 0]; let out = '';
  const enc = (cur: number, prev: number) => {
    let v = Math.round(cur * 1e5) - Math.round(prev * 1e5);
    v = v < 0 ? ~(v << 1) : v << 1; let s = '';
    while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; }
    return s + String.fromCharCode(v + 63);
  };
  for (const [lng, lat] of coords) {                                  // emit lat THEN lng
    out += enc(lat, last[1]) + enc(lng, last[0]); last = [lng, lat];
  }
  return out;
}
```
> Prefer requesting `geometries=polyline6` from Mapbox to avoid this entirely (Pitfall 2). If you keep this encoder, verify the TollGuru `source`/precision pairing with a real key.

### Cache key from polyline (route-faithful, D-06)
```ts
import { createHash } from 'node:crypto';
const cacheKey = `toll:class1:${createHash('sha1').update(polyline).digest('hex')}`;
// 30-day TTL mirroring fuel-prices.service.ts CacheEntry pattern:
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
```

### Web result page — badge + hide-when-0 (D-01/D-02/D-04)
```tsx
// Build metrics, then filter the péage cell out when there is no toll.
const showToll = result.tollCost != null && result.tollCost > 0;
const metrics = [
  { label: 'ÉNERGIE', value: /* ... */ },
  showToll && {
    label: 'PÉAGES',
    value: fmtEur.format(result.tollCost!),
    badge: result.tollIsEstimate ? '≈ estimé' : 'réel',
    badgeTooltip: result.tollIsEstimate
      ? 'Estimation indicative (calcul français moyen)'
      : 'Prix réel calculé par TollGuru le long de l’itinéraire',
  },
  { label: '€/KM', value: /* ... */ },
  { label: 'PAR PERS.', value: /* ... */ },
].filter(Boolean);
```
Render the badge with the existing `Pill` primitive (`web/src/components/ui/Pill.tsx`) wrapped in a new lightweight `Tooltip` (no tooltip primitive exists yet — see below).

## State of the Art

| Old Approach | Current Approach (this phase) | Impact |
|--------------|-------------------------------|--------|
| O/D-only TollGuru call | Full-polyline call (`complete-polyline-from-mapping-service`) | Toll matches the displayed route (D-05) |
| `summary.costs.cash` parse | `route.costs.{tag,cash}` defensive parse | Precise branch actually returns a value when key set (TOLL-01) |
| Heuristic-only in prod (no key) | Key set in Render env → real tolls, heuristic fallback | Accurate cost, the Core Value |
| Toll line always shown (`~`/"estimation" note) | Hidden at 0; Pill badge + tooltip | Cleaner, clearer provenance (D-01/02/04) |
| `tollIsEstimate` live-only | `tollIsEstimate` persisted on `Trip` | Detail page badge consistent (TOLL-05) |

**Deprecated/outdated:** the `origin-destination-waypoints` call body in `computeTollCost`; the `data.summary.costs.cash` parse path; the "V1 = 0" comments on `Trip.tollsCost` and `SaveTripDto.tollsCost`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | TollGuru polyline endpoint is `POST /toll/v2/complete-polyline-from-mapping-service` with body `{ source, polyline, vehicle:{type} }` | Standard Stack, Pitfall 1 | Wrong endpoint → call fails → always heuristic; fix once verified with key |
| A2 | `source:"mapbox"` expects a `polyline6` (precision-6) string; precision mismatch silently breaks decoding | Pitfall 2 | Silent wrong/zero tolls — the highest-risk unknown; gate behind human-verify |
| A3 | Cost lives at `route.costs.{tag,cash,minimumTollCost}` (+ `route.hasTolls`), not `summary.costs.cash` | Pitfall 3 | Key set but always estimate; defensive multi-path parse mitigates |
| A4 | Class-1 car vehicle type is `"2AxlesAuto"` | TOLL-03 | Wrong toll class; confirm exact enum string with key |
| A5 | TollGuru returns costs in EUR for French routes (request `currency` may be ignored) | Pitfall 5 | Currency mislabel; verify `currency` field in response |
| A6 | Free tier ≈ 500 req/month; over-quota returns `429` | Pitfall 5 | Quota-handling tuning; cache is the real guard regardless |
| A7 | `@mapbox/polyline@1.2.1` is legitimate | Package Audit | Avoided by using the inline encoder / Mapbox polyline6 |

**All A1–A6 must be confirmed in a single dev session against a real `TOLLGURU_API_KEY` using a known-toll route before the precise branch is trusted.**

## Open Questions

1. **Persist `tollIsEstimate` on saved trips?**
   - Known: `tollsCost` persists; the amount flows to history/stats correctly. The detail page hides 0-tolls already but shows no badge.
   - Unclear: whether the milestone wants the badge on the *saved* detail or only the live result.
   - Recommendation: persist it (one boolean column + small migration). Low risk, completes the TOLL-05 "reflected in detail" intent.

2. **Durable cache now or later?**
   - Known: in-memory `Map` is per-process and wiped on Render sleep/deploy; quota is small (~500/mo).
   - Recommendation: in-memory for V1 (consistent, simple); flag Postgres/Redis durable cache as V2 (matches CONCERNS).

3. **Recompute toll server-side on save, or trust the client value?**
   - Known: save flow takes `tollsCost`/`totalCost` from the client `result`.
   - Recommendation: trust client value for V1 (it's the user's own trip; low risk). Note as a minor integrity consideration.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| TollGuru API key | TOLL-01 precise tolls | ✗ (not set in prod; absent this session) | — | Heuristic estimate (D-03) — fully functional without key |
| Mapbox token | route geometry/polyline | ✓ (existing) | Directions v5 | none needed |
| Node `fetch`/`AbortSignal.timeout` | HTTP to TollGuru | ✓ | Node 18+ (`@types/node ^24`) | none |
| Postgres (Trip persistence) | TOLL-05 | ✓ | existing | SQLite in e2e |

**Missing dependencies with fallback:** TollGuru key — absent → silent heuristic fallback (by design). The precise path cannot be end-to-end verified in this session; verification requires a real key (see Assumptions Log).

## Validation Architecture

> nyquist_validation treated as enabled (no `.planning/config.json` override read; absent = enabled).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest `^30` (+ ts-jest); e2e via supertest |
| Config file | unit: inline in `backend/package.json` (`rootDir: src`, `*.spec.ts`); e2e: `backend/test/jest-e2e.json` |
| Quick run command | `cd backend && npx jest src/toll/toll.service.spec.ts` |
| Full suite command | `cd backend && npm test && npm run test:e2e` (136 e2e tests today) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOLL-01 | TollGuru ok → `isEstimate:false`, parsed cost | unit (mock `fetch`) | `npx jest src/toll/toll.service.spec.ts -t "precise"` | ❌ Wave 0 |
| TOLL-02 | no key / 429 / timeout / parse-fail → heuristic `isEstimate:true` | unit | `npx jest src/toll/toll.service.spec.ts -t "fallback"` | ❌ Wave 0 |
| TOLL-02 | genuine no-toll (`hasTolls:false`) → `cost:0,isEstimate:false` | unit | same file | ❌ Wave 0 |
| TOLL-03 | request body sends `vehicle.type:"2AxlesAuto"` | unit (assert fetch body) | same file | ❌ Wave 0 |
| TOLL-04 | `/trips/calculate` returns `tollCost`/`tollIsEstimate` | e2e (TollService mocked) | `npm run test:e2e -- --testPathPatterns=trips` | ✅ extend `trips.e2e-spec.ts` |
| TOLL-05 | save persists `tollsCost`+`tollIsEstimate`; stats include toll | e2e | `npm run test:e2e -- --testPathPatterns=trips-crud` | ✅ extend `trips-crud.e2e-spec.ts` |
| TOLL-06 | cache hit avoids 2nd fetch; key never in response | unit (spy fetch count) + e2e (assert no key field) | `npx jest src/toll/toll.service.spec.ts -t "cache"` | ❌ Wave 0 |
| TOLL-04 (web) | badge + hide-when-0 | manual / visual | n/a (no web test infra — CONCERNS) | manual-only |

### Sampling Rate
- **Per task commit:** `npx jest src/toll/toll.service.spec.ts`
- **Per wave merge:** `cd backend && npm test && npm run test:e2e`
- **Phase gate:** full backend suite green; manual web check of result + detail (real & estimate states, toll-free route) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `backend/src/toll/toll.service.spec.ts` — heuristic + parsing + cache + fallback (move heuristic cases from `trips.service.spec.ts`)
- [ ] Extend `backend/test/trips.e2e-spec.ts` — mock `TollService`, assert `tollCost`/`tollIsEstimate` in `/calculate`
- [ ] Extend `backend/test/trips-crud.e2e-spec.ts` — assert `tollsCost`/`tollIsEstimate` persisted + in stats
- Framework install: none (Jest already present)
- Web: no automated test infra exists (CONCERNS) — web badge/hide verified manually.

## Security Domain

> `security_enforcement` treated as enabled (no override). The route is already JWT-protected (`@UseGuards(JwtAuthGuard)` on `TripsController`).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (existing) | `JwtAuthGuard` on `/trips/*` — unchanged |
| V3 Session Management | no | stateless JWT |
| V4 Access Control | yes (existing) | per-user ownership checks in save/detail — unchanged |
| V5 Input Validation | yes | polyline string is server-generated (not user-supplied); coordinates validated by `CoordinatePointDto`; new `tollIsEstimate` is a server-set boolean |
| V6 Cryptography | no | SHA-1 used only as a non-security cache-key hash (not for secrecy) |
| V7 Secret Management | yes | `TOLLGURU_API_KEY` via `ConfigService` env, never serialized to a response or bundle (TOLL-06) |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key leakage to client | Information Disclosure | Key read server-side only; response carries only `tollCost`/`tollIsEstimate` — assert in e2e |
| SSRF / outbound to attacker host | Tampering | Endpoint URL is a hard-coded constant; no user-controlled URL |
| Quota exhaustion (DoS on the free tier) | Denial of Service | 30-day cache keyed by route; silent heuristic fallback on `429` |
| Tampered toll on save | Tampering | Low risk (user's own trip); optional server-side recompute deferred (Open Q3) |

## Sources

### Primary (HIGH confidence — verified by reading the repo)
- `backend/src/trips/trips.service.ts` — `computeTollCost`, `estimateFrenchTolls`, `TripResult`, calculate/save flows
- `backend/src/mapbox/mapbox.service.ts` — `getDirections` returns GeoJSON LineString; `geometries` param
- `backend/src/fuel-prices/fuel-prices.service.ts` — in-memory `Map` + TTL + `AbortSignal.timeout` pattern
- `backend/src/trips/entities/trip.entity.ts` — `tollsCost` column, `decimalTransformer`, no `tollIsEstimate`
- `backend/src/trips/dto/save-trip.dto.ts`, `dto/calculate-trip.dto.ts` — payloads + `CoordinatePointDto`
- `backend/src/trips/trips.controller.ts` / `trips.module.ts` — JWT guard, DI wiring
- `web/src/app/app/trips/result/page.tsx`, `trips/[id]/page.tsx`, `web/src/types/api.ts` — UI, badge target, types
- `.planning/codebase/CONCERNS.md` — TollGuru key not in prod; in-memory cache caveat; 726-line `TripsService`; heuristic inaccuracy
- `backend/.env.example` — `TOLLGURU_API_KEY`, free tier ≈ 500 req/mo
- `backend/package.json` — Jest, Node `@types/node ^24`, no axios

### Secondary (MEDIUM)
- `npm view @mapbox/polyline version` → `1.2.1` (registry existence only)

### Tertiary (LOW — training knowledge, no live verification possible)
- TollGuru v2 polyline endpoint path, request body, response shape, vehicle type string, currency behavior, quota/`429` — all `[ASSUMED]`, see Assumptions Log A1–A6.

## Metadata

**Confidence breakdown:**
- Codebase facts (flows, persistence, UI, cache pattern): HIGH — read directly.
- TollService extraction plan: HIGH — straightforward, contract preserved.
- TollGuru request/response/precision/quota: MEDIUM-LOW — training-only, no key; flagged for live verification.
- Web display integration: HIGH — existing components + clear filter/badge approach.

**Research date:** 2026-05-29
**Valid until:** 2026-06-28 (30 days; TollGuru API specifics should be re-confirmed against live docs/key sooner — they are the only volatile/unverified area)
