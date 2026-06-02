---
phase: 07-showroom-v2
plan: 03
subsystem: mobile
tags: [showroom, vehicle-image, carimages, editorial-dark, expo, react-native, graceful-degradation]
requirements: [SHOW-01, SHOW-02, SHOW-03]
dependency_graph:
  requires:
    - "07-01 GET /vehicles/catalog/image?make=&model= → { imageUrl: string | null } (key-safe, never-throw)"
    - "Phase 4 / 05-06 server-side catalog search + pagination (GET /vehicles/catalog → { items, ... }) — the preserved data layer"
    - "Editorial-dark RN atoms + tokens (Pill, SectionCard, Eyebrow, Button, Input; constants/theme.ts ← shared/src/tokens.ts)"
  provides:
    - "RN VehicleImage atom — photo-or-stylized-brand-placeholder (fixed frame, lazy, onError-safe, never-throw)"
    - "Reworked mobile showroom add-flow — designed photo cards + fuel chips + prominent search"
    - "CatalogImageResult type (mobile)"
  affects:
    - "Closes the SHOW-01/02/03 mobile slice; no downstream code consumers in this phase"
tech_stack:
  added: []
  patterns:
    - "RN atom with a cancellable image-resolve effect → 3 states (loading/image/placeholder); never throws → placeholder"
    - "Caller-sized fixed frame (no aspectRatio reflow) for the RN <Image>"
    - "Stylized brand placeholder = web-parity brandHue hash + initials, derived hsl()/hsla() over surface2 + centered avatar (designed, not gray)"
    - "Visual-layer-only rework over a frozen data layer (MD-2): server search + pagination preserved; SHOW-03 fuel chip → one server fuelCategory param (no client filter)"
key_files:
  created:
    - mobile/src/components/ui/VehicleImage.tsx
  modified:
    - mobile/app/(tabs)/vehicles.tsx
    - mobile/src/types/api.ts
    - mobile/src/i18n/translations/fr.ts
    - mobile/src/i18n/translations/en.ts
decisions:
  - "Mirrored the web brandHue + initials algorithm inline in the RN atom (no shared-module import needed) so web↔mobile placeholders feel consistent; RN hsl()/hsla() color strings used for the derived per-brand tint"
  - "RN <Image source={{uri}} resizeMode=cover> (the plan's RN renderer) with onError→placeholder; caller sizes the frame via style (92×58 thumbnail / 16:10 confirm) so no aspectRatio reflow"
  - "Added the OPTIONAL fuel chips (SHOW-03): Tous/Essence/Diesel/EV/GPL → ONE server fuelCategory param (gas/diesel/ev/gpl, all→none) + reset page 1 — server-side only, mirrors the web fuelParams; no client load-all"
metrics:
  duration: ~12min
  tasks: 2
  files: 5
  completed: "2026-06-02"
---

# Phase 7 Plan 03: Mobile Showroom v2 — RN VehicleImage + photo cards + simpler search Summary

Brought the web showroom v2 experience to the Expo app: a reusable RN `VehicleImage` atom (vehicle photo via the 07-01 endpoint, falling back to a stylized per-brand placeholder on null/error — never a broken image) embedded in reworked editorial-dark catalog cards, with the search promoted to the clear primary affordance and lightweight fuel chips — all while preserving the Phase-4 server-side search + pagination and the `POST /vehicles/me` add submit verbatim (MD-2).

## What was built

- **RN `VehicleImage` atom** (`mobile/src/components/ui/VehicleImage.tsx`) — `{ brand, model, fuelType, style }` runs a **cancellable** effect keyed `[brand, model]` calling `client.get<CatalogImageResult>('/vehicles/catalog/image', { params: { make: brand, model } })` (the CarImages key never reaches the app — 07-01). Three states: **loading** → a `surface2` frame + a centered accent `ActivityIndicator`; **image** → an RN `<Image source={{ uri }} resizeMode="cover" onError→placeholder />` (used only as a URI source); **placeholder** (null OR any failure OR a dead URL) → a stylized per-brand panel **mirroring the web `BrandAvatar`** (the same `brandHue` hash + `initials` algorithm) rendered with derived `hsl()`/`hsla()` hues over `surface2` plus a centered brand-hued avatar — reads as designed, never a flat gray/broken box. The frame is sized by the caller via `style`, so the photo resolving causes no reflow. The atom **never throws** (catch → placeholder); no `console.log`.
- **`vehicles.tsx` rework** — the catalog `renderItem` went from a text-only row to a **designed editorial-dark card** (SHOW-01): a leading `<VehicleImage>` 92×58 thumbnail beside a composed info block — model name (`Fonts.display` 700 `c.ink`), the existing `FuelPill`, and the consumption (`Fonts.mono` `c.mutedText`) — on `surface`/`hairline`/`Radius.card`. A `<VehicleImage>` (full-width, `aspectRatio 16/10`) was added to the **selected-model confirm step** so the user confirms the right car. **SHOW-03:** the search is now the clear **primary** affordance (a `selectModel` `Eyebrow` over the `Input`) and a horizontal row of **fuel chips** (Tous/Essence/Diesel/EV/GPL) was added.
- **Supporting** — `CatalogImageResult { imageUrl: string | null }` type (the GET generic); fuel chip i18n keys (`vehicles.fuelAll/fuelGas/fuelDiesel/fuelEv/fuelGpl`) added symmetrically to `fr.ts` + `en.ts`.

## Key implementation details

- The fuel chips map to **ONE** server `fuelCategory` param (`gas`/`diesel`/`ev`/`gpl`; `all` sends none) appended to the catalog GET params and reset to page 1 via the `[debouncedSearch, fuelFilter]` effect — verified valid against the backend `categoryToFuelTypes` contract. **No client-side filtering of `items`.**
- The data layer is untouched: the cancellable `[debouncedSearch, fuelFilter, page]` loader (page 1 REPLACES / page>1 APPENDS, reading `r.data.items`), the brand-grouped `SectionList`, the 'Charger plus' pagination, `handleSave` (`POST /vehicles/me`), and `EditVehicleModal` (`PATCH /vehicles/me/:id`) + delete are preserved verbatim — no client load-all, no `.filter(` over the catalog.
- No serif; no blue literals — the only color literal is the sanctioned `#0e0c0a` accent-ink chip label (mirrors the `Button` atom); the placeholder uses derived per-brand hues + `surface2`/`accent` tokens only.

## Deviations from Plan

None — plan executed exactly as written. The optional SHOW-03 fuel chips were implemented (sanctioned by the plan as "OPTIONAL within reason … only if it stays clean"); they map to a single server param with no client filtering. Rules 1–4 not triggered.

## Threat surface

Threat register held: T-07-03-01 (key server-side — the app only calls our endpoint, no CarImages key in the bundle), T-07-03-02 (URL used only as an `<Image source uri>` + `onError`→placeholder + 07-01 https-only validation), T-07-03-03 (07-01 caches hits+misses + `SectionList` pagination limit 30), T-07-03-04 (`client` auto-injects the JWT; 401 → deleteToken interceptor), T-07-03-SC (no new dependency — RN built-in `Image` + existing atoms/axios). No new security surface beyond the plan's register.

## Verification

| Check | Result |
|-------|--------|
| `cd mobile && npx tsc --noEmit` (Task 1) | clean (exit 0) |
| `cd mobile && npx tsc --noEmit` (Task 2, full) | clean (exit 0) |
| grep `VehicleImage` in vehicles.tsx | present ×3 (import + card + confirm) |
| grep `vehicles/catalog` GET + `r.data.items` | present |
| grep `POST /vehicles/me` (handleSave) + `PATCH` (edit) | unchanged (lines 226 / 421) |
| grep `.filter(` over catalog items | 0 (no client load-all) |
| grep blue literals (`c.primary`/`#3b82f6`/`#2563eb`) | 0 (only `#0e0c0a` accent ink) |

## Commits

- `955c09e` feat(07-03): RN VehicleImage — photo via /vehicles/catalog/image + stylized brand-placeholder fallback
- `bf798f1` feat(07-03): vehicles.tsx showroom — designed photo cards + simpler search (data layer preserved)

## Integration note

Mobile reuses the same `GET /vehicles/catalog/image?make=&model=` endpoint as web (07-02). The 07-01 service degrades to `null` (placeholder) without `CARIMAGES_API_KEY`, so the mobile showroom ships the photo-or-placeholder behavior before the key is set in prod; real photos light up once the key is set on Render. This completes the SHOW-01/02/03 mobile slice.

## Self-Check: PASSED

- FOUND: mobile/src/components/ui/VehicleImage.tsx
- FOUND: mobile/app/(tabs)/vehicles.tsx
- FOUND: mobile/src/types/api.ts
- FOUND commit: 955c09e
- FOUND commit: bf798f1
