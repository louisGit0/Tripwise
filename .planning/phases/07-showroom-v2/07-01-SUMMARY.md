---
phase: 07-showroom-v2
plan: 01
subsystem: backend
tags: [vehicles, images, carimages, integration, graceful-degradation, jwt]
requirements: [SHOW-02]
dependency_graph:
  requires:
    - "Phase 4 catalog API (GET /vehicles/catalog + /catalog/brands) as the data source"
    - "TollService integration pattern (ConfigService key + Map cache + AbortSignal.timeout + never-throw)"
  provides:
    - "VehicleImageService.resolveImageUrl(make, model) -> string | null (key-safe, cached, never-throw)"
    - "GET /vehicles/catalog/image?make=&model= (JWT) -> { imageUrl: string | null }"
    - "CARIMAGES_API_KEY .env.example entry (server-side only, graceful-without-key)"
  affects:
    - "Web 07-02 (showroom cards consume the endpoint per model)"
    - "Mobile 07-03 (showroom add-flow consumes the same endpoint)"
tech_stack:
  added: []
  patterns:
    - "Server-side third-party integration mirroring TollService: key via ConfigService, in-memory Map cache with expiresAt, AbortSignal.timeout, try/catch never-throw -> graceful null"
    - "Defensive response parsing (https-only URL extractor across plausible JSON shapes)"
    - "DTO input bound (@MaxLength) + URL-encode at the outbound boundary (anti-DoS/SSRF)"
key_files:
  created:
    - backend/src/vehicles/vehicle-image.service.ts
    - backend/src/vehicles/vehicle-image.service.spec.ts
    - backend/src/vehicles/dto/catalog-image-query.dto.ts
  modified:
    - backend/src/vehicles/vehicles.controller.ts
    - backend/src/vehicles/vehicles.module.ts
    - backend/.env.example
    - backend/test/vehicles.e2e-spec.ts
decisions:
  - "CarImages auth sent in x-api-key header (mirrors TollService); URL/auth/shape flagged for confirmation at integration — built defensively so any mismatch degrades to null"
  - "30-day TTL caches hits AND misses (a missing model never re-hits the API), keeping usage under the 5k/mo free tier"
  - "Endpoint declared before catalog/:id (so 'image' is never matched as an id), mirroring the existing catalog/brands placement"
metrics:
  duration: ~13min
  tasks: 2
  files: 7
  completed: "2026-06-02"
---

# Phase 7 Plan 01: VehicleImageService + catalog/image endpoint Summary

Server-side CarImages photo-resolve service + JWT-guarded `GET /vehicles/catalog/image` returning `{ imageUrl: string | null }`, mirroring the proven TollService shape (ConfigService key server-side, in-memory cache, `AbortSignal.timeout`, never-throw) so the showroom photo feature ships WITHOUT the key (graceful brand-placeholder everywhere) and the real photos light up once `CARIMAGES_API_KEY` is set in prod.

## What was built

- **`VehicleImageService.resolveImageUrl(make, model)`** — reads `CARIMAGES_API_KEY` via `ConfigService` (server-side only), normalizes + trims make/model, short-circuits to `null` (no fetch) on blank input or no key, otherwise calls CarImages with the key in the `x-api-key` header and `AbortSignal.timeout(8s)`. A defensive `extractImageUrl` reader pulls the first plausible `https://` URL across several JSON shapes (root `url`/`image`/`imageUrl`/`image_url` + `results[]`/`data[]` first element), dropping non-https/non-string values. Every failure path (no key, 401/429/5xx, timeout/network, parse error, unrecognised shape, missing model) returns `null` and logs once via `Logger.warn` — never throws. A 30-day in-memory `Map` cache stores hits AND misses, so identical resolves issue exactly one outbound call.
- **`GET /vehicles/catalog/image?make=&model=`** — `@UseGuards(JwtAuthGuard)`, declared BEFORE `catalog/:id` (NOTE comment, mirroring `catalog/brands`), validated by `CatalogImageQueryDto` (make/model `@IsString @IsNotEmpty @MaxLength(80)`), returns `{ imageUrl }` only — the key never appears in any payload.
- **`.env.example`** — a documented `CARIMAGES_API_KEY=` block (free tier ~5k/mo, server-side only, graceful-without-key).
- **Tests** — 16-case unit spec (mocked `globalThis.fetch`) + 3 e2e cases (no-key → `200 {imageUrl:null}`, no-token → `401`, missing param → `400`).

## Key implementation details

- TDD: RED (`158ed5b`, failing spec) → GREEN (`1decb60`, service, 16/16 pass).
- The unit spec explicitly asserts the configured key is present in the outbound `x-api-key` header AND absent from both the returned value and the outbound URL (T-07-01-01).
- make/model are passed through `encodeURIComponent` into a hard-coded `CARIMAGES_BASE_URL` — no user-supplied URL is ever fetched (T-07-01-02); returned URLs validated to `https://` before returning.

## Deviations from Plan

None — plan executed exactly as written. Rules 1–4 not triggered.

## Threat surface

Threat register held: T-07-01-01 (key server-side; return value asserts no key substring), T-07-01-02 (hard-coded base URL + `encodeURIComponent` + https-only return), T-07-01-03 (DTO `@MaxLength(80)` + whitelist + JWT), T-07-01-04 (30-day cache hits+misses + never-throw null), T-07-01-05 (401/429/5xx/timeout/parse → `logger.warn` + null). No package installs (T-07-01-SC N/A).

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | clean (exit 0) |
| `npx nest build` | clean (exit 0) |
| `npx jest vehicle-image.service.spec` | 16/16 pass |
| vehicles e2e (`--testPathPatterns="vehicles"`) | 34/34 (was 31, +3 image) |
| full e2e suite | 160/160 (was 157, +3) |

## Commits

- `158ed5b` test(07-01): add failing spec for VehicleImageService (RED)
- `1decb60` feat(07-01): VehicleImageService — CarImages resolve (GREEN)
- `eba290f` feat(07-01): GET /vehicles/catalog/image endpoint + DTO + module + e2e

## Integration note for 07-02 / 07-03

The CarImages exact endpoint, auth location (header vs query param), and response shape are flagged for confirmation against live docs at first real-key integration. The service is built defensively (never-throw → null), so any mismatch degrades to the placeholder rather than breaking the showroom — but whoever sets `CARIMAGES_API_KEY` in prod should verify `CARIMAGES_BASE_URL`, the `x-api-key` header convention, and the `extractImageUrl` field list once against a live response.

## Self-Check: PASSED
