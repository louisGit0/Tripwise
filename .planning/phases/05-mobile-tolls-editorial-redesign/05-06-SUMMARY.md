---
phase: 05-mobile-tolls-editorial-redesign
plan: 06
subsystem: mobile
tags: [vehicles, garage, catalog, showroom, server-side-search, pagination, editorial-dark, MOB-01, CAT-06]
requires:
  - "mobile editorial ThemeColors + tokens (05-01)"
  - "mobile normalized atoms (Button/Card/Input) + CatalogPage type + vehicles i18n (loadMore/noResults/resultsCount) (05-02)"
  - "mobile Pill / SectionCard / Eyebrow editorial atoms (05-03)"
  - "frozen Phase-4 server-side catalog contract GET /vehicles/catalog → { items, total, page, limit, totalPages } (04-03)"
provides:
  - "mobile/app/(tabs)/vehicles.tsx — editorial-dark garage list + add/edit modals, and a server-side debounced/paginated/brand-grouped add-vehicle catalog browse (no client load-all)"
affects:
  - "Phase 5 success criterion 3 (showroom scales without client load-all) — the mobile slice of CAT-06 lands here"
tech-stack:
  added: []
  patterns:
    - "RN SectionList for brand-grouped catalog (Eyebrow section headers + model rows), Input kept OUTSIDE the list for focus stability"
    - "two-effect server-side pagination mirroring the web showroom: reset effect [debouncedSearch] → page 1; cancellable loader effect [debouncedSearch, page] (page 1 REPLACES / page>1 APPENDS)"
    - "emoji icon buttons replaced with token-styled text controls (delete = fuelGas / destructive)"
key-files:
  created: []
  modified:
    - mobile/app/(tabs)/vehicles.tsx
decisions:
  - "Kept the search Input ABOVE the SectionList (not in ListHeaderComponent) so the input never loses focus when the list re-renders on each keystroke — a known RN SectionList header gotcha."
  - "Used a SectionList (RN idiom for grouped data) rather than a ScrollView+map so the 'Charger plus' footer + empty state slot into the list's native ListFooterComponent/ListEmptyComponent, and rows virtualize."
  - "Brand-grouped model rows show only the model name (brand is the section header) + a FuelPill + mono consumption — mirrors the web ModelCard which puts the brand in the section heading."
  - "Replaced the ✏️/🗑 emoji buttons with localized token-styled text labels (common.edit / common.delete) rather than @expo/vector-icons — unambiguously Expo-Go-safe and consistent with the 05-04 decision to defer vector-icons to an EAS build."
metrics:
  tasks: 2
  files_changed: 1
  commits: 2
  tsc_errors_before: 0
  tsc_errors_after: 0
  completed: 2026-06-02
---

# Phase 5 Plan 06: Editorial-Dark Garage + Server-Side Catalog Browse Summary

Restyled the Expo vehicles/garage screen to editorial-dark and rewired its add-vehicle catalog browse from the broken client read (`r.data.data` against the obsolete `{ data, total }` shape) to the frozen Phase-4 server-side contract (`r.data.items` from `GET /vehicles/catalog → { items, total, page, limit, totalPages }`) — debounced, incrementally paginated ("Charger plus"), and brand-grouped, with NO client load-all. This is the mobile slice of CAT-06 (Phase 5 success criterion 3: the showroom scales to thousands). All garage CRUD (add/edit/delete) + the `POST /vehicles/me` add flow + navigation preserved verbatim (MD-2); no serif (D-11); mobile `tsc --noEmit` GREEN.

## What Was Built

### Task 1 — Editorial-dark garage list + add/edit modals (`4635ece`)
- Page background → editorial `bg`; `useColorScheme()` default flipped `'light'` → `'dark'` (editorial-dark first paint, consistent with 05-04/05-05).
- The page header is a display heading (`Fonts.display` 700, `c.ink`) under an `Eyebrow` surtitle (`nav.vehicles`).
- Vehicle rows moved from the legacy `Card` into the editorial `SectionCard`: name in `c.ink` (display 700), a `FuelPill` badge (accent tint for `ELECTRIC`, neutral otherwise) + a `Fonts.mono` consumption sub line in `c.mutedText`.
- **Emoji icon buttons (✏️ / 🗑) removed** — replaced with localized, token-styled text controls: `common.edit` in `c.ink2`, `common.delete` in `c.fuelGas` (destructive).
- Both modal containers use `c.bg` + a `c.hairline` header; titles in `c.ink` display 700; close / back labels in `c.accent`. Catalog rows carry a `FuelPill` + mono consumption.
- All weights normalized to 400/700 (no 500/600 remain); no blue literals. `loadVehicles`, `handleDelete`, the add `POST /vehicles/me`, edit `PATCH /vehicles/me/:id`, and delete `DELETE /vehicles/me/:id` kept verbatim (MD-2).

### Task 2 — Server-side, paginated, brand-grouped catalog browse (`7ebaebc`)
- The catalog fetch switched from the **broken** `r.data.data` (obsolete `{ data, total }`) to the frozen contract `r.data.items` via `client.get<CatalogPage>('/vehicles/catalog', { params: { search: debouncedSearch || undefined, page, limit: 30 } })`.
- Added `page` / `total` / `totalPages` / `isLoadingMore` state, plus:
  - a **reset effect** `[debouncedSearch] → setPage(1)`;
  - a **cancellable loader effect** `[debouncedSearch, page]`: page 1 **REPLACES** the accumulated list, page>1 **APPENDS**; the cleanup `cancelled` flag discards an in-flight page>1 response when the query resets to page 1, so a search change while paged-in never wrongly appends.
- **Brand grouping:** a `useMemo` folds the accumulated `items` into `{ title, data }` sections (locale-sorted, mirroring the web showroom), rendered by a `SectionList` with `Eyebrow` brand headers + model rows.
- **"Charger plus":** a secondary `Button` (`vehicles.loadMore`) shown only when `page < totalPages`, guarded by `isLoadingMore`, incrementing `page`.
- A results-count header (`vehicles.resultsCount {{loaded}}/{{total}}`, shown when there are results) + a `vehicles.noResults` empty state via `ListEmptyComponent`.
- **NO client load-all / no parallel multi-page prefetch.** `selected` / `handleSave` (the `POST /vehicles/me` add flow) preserved verbatim — the row tap still sets `selected` as before.

## Deviations from Plan

None — the plan executed exactly as written. No Rule 1/2/3/4 deviations were triggered (no bugs, missing critical functionality, blocking issues, or architectural changes).

Minor implementation choices (within plan scope, documented as decisions in the frontmatter): the search `Input` was kept above the `SectionList` (focus stability), and the brand-grouped rows show the model name only (brand is the section header).

## Threat Surface Scan

No new trust boundaries. The two registered threats hold:
- **T-05-06-01 (Denial of Service, catalog pagination):** mitigated — server-side `limit: 30` + incremental "Charger plus" replaces unbounded client load-all (memory-bounded), and the backend already caps `limit` at `@Max(100)` (D-15).
- **T-05-06-02 (Tampering, catalog query input):** accepted — the search string is sent as a bound query param to the existing authed endpoint; the backend binds `:params` with no SQL interpolation (D-15).

No new input, network surface, auth path, or secrets introduced by this plan.

## Known Stubs

None. The catalog rows render live `GET /vehicles/catalog` data (server-side searched + paginated); the garage list renders live `GET /vehicles/me` data. No hardcoded/empty data flows to the UI.

## Self-Check: PASSED

- `mobile/app/(tabs)/vehicles.tsx` — FOUND (modified).
- Commits `4635ece` (editorial-dark restyle), `7ebaebc` (server-side catalog) — FOUND in `git log`.
- mobile `npx tsc --noEmit` → 0 errors (full run, EXIT 0); `grep "data.items"` → 1, `grep "data.data"` → 0; the file has a 'Charger plus' Button (`vehicles.loadMore`), brand-grouped `SectionList`, and the `POST /vehicles/me` add flow + CRUD preserved verbatim.
