---
phase: 07-showroom-v2
plan: 02
subsystem: web
tags: [showroom, vehicle-image, carimages, editorial-dark, garage-add, cwv, graceful-degradation]
requirements: [SHOW-01, SHOW-02, SHOW-03]
dependency_graph:
  requires:
    - "07-01 GET /vehicles/catalog/image?make=&model= → { imageUrl: string | null } (key-safe, never-throw)"
    - "Phase 4 server-side catalog search + pagination (GET /vehicles/catalog) — the preserved data layer"
    - "Editorial-dark atoms (BrandAvatar, FuelBadge, SectionCard, Input, Modal, Skeleton, CTAButton, Pill, Eyebrow)"
  provides:
    - "VehicleImage atom — photo-or-stylized-brand-placeholder visual (fixed frame, lazy, onError-safe, never-throw)"
    - "Reworked garage/add showroom — designed photo-led cards + simpler primary search"
    - "brandHue export (BrandAvatar) + CatalogImageResult type"
  affects:
    - "Mobile 07-03 (showroom add-flow consumes the same /vehicles/catalog/image endpoint)"
tech_stack:
  added: []
  patterns:
    - "Client atom with a cancellable image-resolve effect → 3 states (loading/image/placeholder); never throws"
    - "Fixed aspect-ratio frame to eliminate CLS while a lazy <img> loads"
    - "Stylized brand placeholder = stable per-brand hue (brandHue) tint + centered BrandAvatar (designed, not gray)"
    - "Visual-layer-only rework over a frozen data layer (MD-2): server search + pagination preserved verbatim"
key_files:
  created:
    - web/src/components/ui/VehicleImage.tsx
  modified:
    - web/src/components/ui/BrandAvatar.tsx
    - web/src/types/api.ts
    - web/src/app/app/garage/add/page.tsx
decisions:
  - "Native <img> (image context, XSS-safe per threat model) with a scoped eslint-disable for @next/next/no-img-element — CarImages CDN host is not configured for next/image"
  - "fuelType kept in the VehicleImage prop interface (caller consistency / future fuel-aware treatment) but only typed, not destructured — no unused-var"
  - "aspect-[16/10] frame + Skeleton fill → zero layout shift; placeholder reuses brandHue so a miss reads as designed"
metrics:
  duration: ~9min
  tasks: 2
  files: 4
  completed: "2026-06-02"
---

# Phase 7 Plan 02: Web Showroom v2 — photo cards + VehicleImage + simpler search Summary

Turned the `garage/add` text-row showroom into a designed, photo-led, easy-to-navigate browse experience: a reusable `VehicleImage` atom (vehicle photo via the 07-01 endpoint, falling back to a stylized brand placeholder on null/error — never a broken image, no CLS) embedded in reworked editorial-dark cards, with the search promoted to the clear primary affordance — all while preserving the Phase-4 server-side search + pagination and the `POST /vehicles/me` add submit verbatim (MD-2).

## What was built

- **`VehicleImage` atom** (`web/src/components/ui/VehicleImage.tsx`) — a client component (`{ brand, model, fuelType, className }`) that runs a **cancellable** effect (keyed `[brand, model]`) calling `apiClient.get<CatalogImageResult>('/vehicles/catalog/image', { params: { make: brand, model } })`. Three states: **loading** → `Skeleton` filling the frame; **image** → a native `<img>` (`loading="lazy"`, `decoding="async"`, `alt`, `object-contain`, `onError`→placeholder); **placeholder** (null OR any failure OR dead URL) → a stylized panel tinted with the stable per-brand `brandHue` (`radial-gradient` over `bg-carbon-surface2`) with a large centered `BrandAvatar`. A fixed `aspect-[16/10]` frame reserves the space up-front → **no CLS**. The atom **never throws** (catch → placeholder); no `console.log`.
- **`garage/add` rework** (`web/src/app/app/garage/add/page.tsx`) — `ModelCard` is now a photo-led editorial-dark card (a `<VehicleImage>` photo region on top, then model name `font-display` / `FuelBadge` / consumption `font-mono` muted on `bg-carbon-surface`/`border-carbon-hairline`/`rounded-card` with hover + `FOCUS_RING` + `Plus`). The config Modal preview is augmented with a `<VehicleImage>` so the user confirms the right car. **SHOW-03:** the search is the clear primary affordance (`h-12`, larger icon, clearer placeholder/aria, clear button) and the fuel chips read quieter; the loading skeleton card height was bumped to match the taller photo cards (no jump).
- **Supporting** — exported `brandHue` from `BrandAvatar` (reused for the placeholder tint) and added the `CatalogImageResult { imageUrl: string | null }` type (the GET generic); `VehicleModel` unchanged.

## Key implementation details

- `<img>` is rendered ONLY as `src` (no `innerHTML`/`dangerouslySetInnerHTML`) and carries a scoped `eslint-disable-next-line @next/next/no-img-element` (CarImages CDN host not configured for next/image; `<img>` is the intended XSS-safe renderer per the threat model).
- `fuelType` stays in the prop interface for caller consistency but is only typed (not destructured) → no unused-var while keeping `<VehicleImage … fuelType={…} />` type-correct at every call site.
- The data layer is untouched: the reset effect, the page1-replaces / page>1-appends cancellable loader, `fuelParams` (chip → one server param), `jumpToBrand`, `openConfig`, and `handleAdd` (`POST /vehicles/me` + redirect) are preserved verbatim — no client load-all, no `.filter(` over the catalog.

## Deviations from Plan

None — plan executed exactly as written. Rules 1–4 not triggered.

## Threat surface

Threat register held: T-07-02-01 (key server-side — the browser only calls our endpoint, no CarImages key in the bundle), T-07-02-02 (URL rendered only as `<img src>` + `onError`→placeholder + 07-01 https-only validation), T-07-02-03 (07-01 caches hits+misses + lazy-load + pagination), T-07-02-SC (no new dependency — native `<img>` + existing axios/atoms). No new security surface beyond the plan's register.

## Verification

| Check | Result |
|-------|--------|
| `cd web && npx tsc --noEmit` | clean (exit 0) |
| `cd web && npm run build` | green — **18/18 routes**, `/app/garage/add` 4.16 kB, 0 ESLint errors |
| grep `VehicleImage` in garage/add | present ×3 (import + card + modal preview) |
| grep `vehicles/catalog` GET present | yes (line 97) |
| grep `POST /vehicles/me` (handleAdd) | unchanged (line 162) |
| grep `.filter(` over catalog items | 0 (no client load-all) |

## Commits

- `7bcbf0e` feat(07-02): VehicleImage atom — photo via /vehicles/catalog/image + stylized brand-placeholder fallback
- `ae43615` feat(07-02): garage/add showroom — designed photo cards + simpler search (data layer preserved)

## Integration note for 07-03

Mobile reuses the same `GET /vehicles/catalog/image?make=&model=` endpoint. The 07-01 service degrades to `null` (placeholder) without `CARIMAGES_API_KEY`, so the mobile showroom can ship the same photo-or-placeholder behavior before the key is set in prod.

## Self-Check: PASSED

- FOUND: web/src/components/ui/VehicleImage.tsx
- FOUND: web/src/app/app/garage/add/page.tsx
- FOUND: web/src/types/api.ts
- FOUND: web/src/components/ui/BrandAvatar.tsx
- FOUND commit: 7bcbf0e
- FOUND commit: ae43615
