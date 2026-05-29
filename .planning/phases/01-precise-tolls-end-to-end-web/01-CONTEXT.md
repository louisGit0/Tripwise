# Phase 1: Precise Tolls End-to-End (Web) - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a trustworthy toll cost for a calculated trip on the **web**: real (TollGuru) when an API key is configured, a clearly-labelled estimate otherwise. The toll is broken out on the trip result, included in the displayed grand total, and persisted on saved trips so it flows into trip detail, history, and monthly stats. Class-1 passenger car only. Backend toll logic already exists partially in `backend/src/trips/trips.service.ts` (heuristic + a TollGuru branch) — this phase makes it precise, reliable, cached, and well-presented. Mobile is out of scope (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Real-vs-estimate indicator
- **D-01:** Show a small badge next to the toll amount — "réel" when the figure comes from TollGuru, "≈ estimé" when it comes from the French heuristic.
- **D-02:** The badge carries a tooltip (hover on desktop / tap on touch) explaining the source: TollGuru precise pricing vs. the indicative French estimation. The existing `tollIsEstimate` boolean drives which badge/tooltip is shown.

### Fallback & transparency
- **D-03:** When TollGuru is unavailable (no key, over quota, error, timeout), fall back to the heuristic estimate and surface the "≈ estimé" badge — no error shown to the user, the number still appears.
- **D-04:** When a route genuinely has no tolls (toll cost = 0), **hide the toll line entirely** on the result rather than showing "0 €", to avoid clutter. (The toll line only appears when there is a toll cost > 0.)

### TollGuru request precision
- **D-05:** Send the **full Mapbox route polyline** (the geometry already computed by `MapboxService.getDirections`) to TollGuru so the toll is computed barrier-to-barrier along the exact displayed route — not just origin→destination. This protects the Core Value (accurate cost) and keeps the toll consistent with the route the user sees.

### Caching
- **D-06:** Cache TollGuru results with a **30-day TTL**. Toll tariffs change roughly once a year, so a long cache strongly conserves the limited free TollGuru quota. Cache key must reflect the route (e.g., rounded origin/destination + distance, or a polyline hash) so identical routes reuse the cached toll and never issue a second TollGuru call. (Existing fuel/charging caches use an in-memory `Map` with TTL — same pattern, longer TTL.)

### Claude's Discretion
- Exact cache-key construction (polyline hash vs rounded coords + distance), TollGuru endpoint/route choice (the `origin-destination-waypoints` polyline endpoint is already referenced in the codebase), error/timeout thresholds, and the precise badge/tooltip markup — left to research + planning, consistent with existing patterns.
- Whether to extract a dedicated `TollService` from the 726-line `TripsService` (flagged as a watchpoint in STATE.md) — recommended but at the planner's discretion.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Toll implementation (existing)
- `backend/src/trips/trips.service.ts` — current `computeTollCost` (TollGuru branch + `estimateFrenchTolls` heuristic), `TripResult.tollCost` / `tollIsEstimate` fields
- `backend/src/trips/entities/trip.entity.ts` — `tollsCost` persisted column (decimal transformer)
- `backend/src/trips/dto/save-trip.dto.ts` — `tollsCost` on save payload

### Route + external service patterns
- `backend/src/mapbox/mapbox.service.ts` — `getDirections` returns the route geometry (polyline) to send to TollGuru
- `backend/src/fuel-prices/fuel-prices.service.ts` — in-memory `Map` cache w/ TTL pattern to mirror for the 30-day toll cache
- `backend/src/main.ts` — CORS/secrets posture; TollGuru key stays server-side only (env), never in any client response/bundle

### Web display
- `web/src/app/app/trips/result/page.tsx` — trip result screen where the toll line + badge/tooltip render
- `web/src/app/app/trips/[id]/page.tsx` — saved trip detail (toll persisted display)
- `web/src/types/api.ts` — `TripResult` / saved-trip types to extend with toll real-vs-estimate flag

### Project specs
- `.planning/REQUIREMENTS.md` §Tolls (TOLL-01..06) — the requirements this phase must satisfy
- `.planning/codebase/CONCERNS.md` — notes the TollGuru key is not configured in prod (always heuristic today)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeTollCost` / `estimateFrenchTolls` in `trips.service.ts` — keep the heuristic as the fallback path; harden the TollGuru branch.
- In-memory TTL cache pattern (`fuel-prices.service.ts`, `charging-stations.service.ts`) — reuse for the 30-day toll cache.
- `MapboxService.getDirections` already produces the geometry needed for the polyline TollGuru request.
- Web design-system badge/Pill + tooltip primitives under `web/src/components/ui/` for the real/estimate indicator.

### Established Patterns
- `@nestjs/config` env access for `TOLLGURU_API_KEY` (already read via `this.config.get`).
- DECIMAL → number coercion via `decimalTransformer` for the persisted `tollsCost`.

### Integration Points
- Trip calculation flow: `POST /trips/calculate` → `TripResult.tollCost`/`tollIsEstimate` → web result page.
- Save flow: `POST /trips/save` persists `tollsCost`; history/stats already sum saved trips.

</code_context>

<specifics>
## Specific Ideas

- Badge wording: "réel" / "≈ estimé" (French, per V1 hardcoded-FR convention).
- Toll line hidden when cost = 0 (no clutter); visible only when > 0.

</specifics>

<deferred>
## Deferred Ideas

- Multi-class tolls (trucks, motorcycles, towing) — v2 (REQUIREMENTS Deferred).
- Per-segment / barrier-by-barrier toll breakdown — v2.
- "Avoid tolls" routing alternative — v2.
- Mobile toll display — Phase 5.

None of the above were acted on; discussion stayed within the Phase 1 web scope.

</deferred>

---

*Phase: 1-precise-tolls-end-to-end-web*
*Context gathered: 2026-05-29*
