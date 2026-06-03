---
phase: 07-showroom-v2
plan: 05
subsystem: full-stack
tags: [vehicles, images, carimages, byte-proxy, security, key-safety, jwt, graceful-degradation]
requirements: [SHOW-02]
dependency_graph:
  requires:
    - "07-01 VehicleImageService + GET /vehicles/catalog/image endpoint (re-architected here)"
    - "07-02 web VehicleImage atom (re-architected here from JSON URL to blob)"
    - "07-03 mobile VehicleImage atom (re-architected here to authed RN <Image>)"
    - "TollService never-throw / bounded-cache integration idiom"
  provides:
    - "VehicleImageService.fetchImageBytes(make, model) -> { body: Buffer; contentType } | null (server-side byte fetch, key-safe, never-throw)"
    - "GET /vehicles/catalog/image?make=&model= (JWT) -> 200 image/webp bytes (Cache-Control immutable) | 204 No Content"
    - "Web VehicleImage: authed blob fetch -> object URL (revoked) or brand placeholder (no CarImages URL/key on client)"
    - "Mobile VehicleImage: RN <Image> -> our endpoint + Authorization header -> photo or brand placeholder"
  affects:
    - "Showroom cards (web 07-02 garage/add + mobile 07-03 vehicles) now stream real photos once CARIMAGES_API_KEY is set"
tech_stack:
  added: []
  patterns:
    - "Server-side BYTE PROXY: resolve a signed third-party URL that embeds the api_key, fetch the bytes server-side, stream only bytes to the client (never the URL/key)"
    - "Two-tier TTL cache: short (1h) for time-limited signed URLs, long (30d) for known misses; transient failures never cached; stale-URL (401/403) → invalidate + single re-resolve retry"
    - "Client-side blob consumption: axios responseType:'blob' + validateStatus(200||204) -> createObjectURL/revokeObjectURL"
    - "RN authed image: <Image source={{ uri, headers: { Authorization } }}> with onError -> placeholder"
key_files:
  created: []
  modified:
    - backend/src/vehicles/vehicle-image.service.ts
    - backend/src/vehicles/vehicle-image.service.spec.ts
    - backend/src/vehicles/vehicles.controller.ts
    - backend/test/vehicles.e2e-spec.ts
    - web/src/components/ui/VehicleImage.tsx
    - web/src/types/api.ts
    - mobile/src/components/ui/VehicleImage.tsx
    - mobile/src/types/api.ts
decisions:
  - "BYTE PROXY over URL passthrough: the CarImages signed URL embeds the api_key and the image 401s without it, so returning the URL would leak the key — we fetch the bytes server-side and stream only bytes (D-35)"
  - "Auth via Authorization: Bearer header on the signed-url resolve (not the api_key query param) so the key never appears in any logged outbound URL"
  - "Two-tier cache: 1h for resolved signed URLs (shorter than their expiry → never serve a stale 401-ing URL), 30d for known misses; stale cached URL (401/403) invalidated + re-resolved once"
  - "204 No Content on miss/no-key/failure (not 200 {imageUrl:null}) — the client treats 204 as a non-error placeholder outcome"
metrics:
  duration: ~22min
  tasks: 1
completed: 2026-06-03
---

# Phase 7 Plan 05: Secure Vehicle Photo Byte-Proxy Summary

Re-architected the vehicle-photo delivery from a JSON image-URL contract into a server-side **byte proxy**, because the real CarImages signed URL embeds the `api_key` and the image 401s without it — so handing the URL to the client would leak the key. The backend now resolves the signed URL **and** fetches the bytes server-side, streaming only the raw bytes; the web and mobile clients consume bytes (blob / authed `<Image>`) and never see a CarImages URL or key.

## What changed

### Backend — `vehicle-image.service.ts`
- `resolveImageUrl(make, model)` now hits the verified `https://carimagesapi.com/api/v1/signed-url` endpoint with the key in an **`Authorization: Bearer`** header (never in the outbound URL), parses `{ url }` defensively (https-only), and returns the signed URL. The return value **does** embed the key (the nature of a CarImages signed URL) — it is strictly server-side and only consumed by `fetchImageBytes`; it is never returned to a client.
- **Two-tier TTL cache:** resolved signed URLs cache for **1h** (`URL_CACHE_TTL_MS`, shorter than the URL's `expires` so a stale URL is never re-served and 401'd); known misses (200-without-photo, no-key) cache for **30d** (`MISS_CACHE_TTL_MS`) to save quota. Transient failures (401/429/5xx/timeout/parse) are **never** cached.
- New `fetchImageBytes(make, model): { body: Buffer; contentType } | null` — resolves the signed URL, fetches it server-side, returns the bytes + content-type. **Never throws** (→ null). If a *cached* signed URL has expired (image returns 401/403), it invalidates the cache key and **re-resolves once** to refresh the signature.

### Backend — `vehicles.controller.ts`
- `GET /vehicles/catalog/image` (kept `@SkipThrottle()` + `@UseGuards(JwtAuthGuard)` + the `CatalogImageQueryDto`) is now a byte proxy via `@Res()`: on a hit → `200` + `Content-Type: image/webp` (from upstream) + `Cache-Control: public, max-age=604800, immutable` (clients cache → they don't re-hit us); on miss/no-key/failure → `204 No Content`. A defensive `try/catch → 204` backstop means it can never 500. The api_key never appears in any response header or body.

### Web — `VehicleImage.tsx`
- Fetches via the authed `apiClient` with `responseType:'blob'` + `validateStatus: s===200||s===204`; on `200` + non-empty blob → `URL.createObjectURL(blob)` → `<img src={objectUrl}>`, **revoked** on cleanup / prop change; on `204` / empty / error / dead blob → the stylized per-brand placeholder. Cancellation preserved (no setState-after-unmount), CLS-safe `aspect-[16/10]` frame kept. No CarImages URL/key ever reaches the browser.

### Mobile — `VehicleImage.tsx`
- Points the native `<Image>` at OUR endpoint with the JWT in an `Authorization` header (`source={{ uri, headers: { Authorization: 'Bearer <token>' } }}`), token read from the existing `expo-secure-store` `getToken()`, base URL from `EXPO_PUBLIC_API_URL` (mirroring the axios client). `onError` (incl. 204) → the stylized brand placeholder; an `ActivityIndicator` overlays until `onLoad`. No JSON round-trip; no CarImages URL/key on the app.

### Types
- Removed the now-dead `CatalogImageResult` JSON contract from both `web/src/types/api.ts` and `mobile/src/types/api.ts` (replaced with an explanatory comment — the endpoint is a byte proxy, consumed as a blob / direct image source).

## Deviations from Plan

**None for Rules 1, 3, 4.**

### Auto-added (Rule 2 — robustness/correctness)
**1. [Rule 2 - Missing critical functionality] Stale-signed-URL retry.**
- **Found during:** Task 1 (service re-architecture).
- **Issue:** A signed URL cached for up to 1h can expire mid-window (CarImages `expires`); a cached-but-expired URL would 401 on the image fetch and the user would see a placeholder for the rest of the cache window.
- **Fix:** `fetchImageBytes` detects a `401/403` on the image fetch (`'expired'`), invalidates the cache key, and re-resolves a fresh signed URL once before giving up. Bounded (single retry → null).
- **Files modified:** `backend/src/vehicles/vehicle-image.service.ts`
- **Tests:** two new unit cases (recovers after one retry; returns null if still expired after retry).

## Security / key-safety verification
- The api_key lives only in `backend/.env` (gitignored, untracked — confirmed via `git check-ignore` + `git ls-files`) and Render env; `.env.example` keeps the empty `CARIMAGES_API_KEY=` placeholder (unchanged).
- The key travels server-side only: in a `Bearer` header on the resolve, and embedded in the signed URL that is fetched server-side. It never appears in any HTTP response header/body, nor in any committed file.
- Secret scan over the full diff (`ci_…` / `api_key=<hex>` / `CARIMAGES_API_KEY=<value>`) → **no matches** (test fixtures use the obvious `SECRET` placeholder).

## Verification
| Check | Result |
|-------|--------|
| backend `tsc --noEmit` | clean |
| backend `nest build` | clean |
| `vehicle-image.service.spec.ts` | 26/26 pass |
| `vehicles.e2e-spec.ts` | 34/34 pass (image case now asserts 204 + no body) |
| web `tsc --noEmit` | clean |
| web `next build` | 18/18 routes |
| mobile `tsc --noEmit` | clean |
| secret in diff | none |

## Self-Check: PASSED
