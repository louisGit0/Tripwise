---
phase: 07-showroom-v2
type: context
source: user feedback (v1.1) + image-source spike (2026-06-02)
requirements: [SHOW-01, SHOW-02, SHOW-03]
---

# Phase 7 Context — Showroom v2

## Domain

Rework the vehicle showroom (web `garage/add` + mobile `vehicles` add flow) so each model is a
**designed card** (not a text row), the **navigation/search is simpler & intuitive**, and each card
shows the **vehicle's photo** (a free source was found). Editorial-dark language is locked (v1.0) —
reuse it. Backend catalog API (Phase 4: `GET /vehicles/catalog` + `/catalog/brands`) is the data source.

## Spike result — vehicle image source (decides SHOW-02)

- imagin.studio: **no free tier** (paid, license-gated CDN) → rejected.
- **CarImages API (carimagesapi.com): free tier 5,000 req/month, no credit card**, by make/model
  (206 brands / ~5,700 models). **Chosen** (matches the "free if possible" rule + the user's photo ask).
- Others (One Auto, Vehicle Databases, CarsXE): paid → rejected.

**Decision (SHOW-02 = YES, photos via CarImages):** integrate server-side with **graceful
degradation** (the TollGuru pattern):
- A backend image endpoint/proxy resolves a photo URL by canonical brand+model, reading the
  **`CARIMAGES_API_KEY` server-side only** (never in any client response/bundle).
- **Cache** results (in-memory, long TTL keyed by brand|model) to stay well under 5k/month
  (the showroom paginates — only ~30–60 models shown at a time).
- **Graceful fallback to a stylized brand placeholder** when: no key configured, over quota, request
  fails, or the model has no photo. So the feature SHIPS without the key (placeholder everywhere) and
  the real photos "light up" once `CARIMAGES_API_KEY` is set in prod (Render) — like tolls.
- Researcher/executor must confirm the exact CarImages endpoint, auth (header vs query), and response
  shape (direct image vs JSON with URL) at integration; build defensively (never throw).

## Decisions (locked)

- **SHOW-01 — Designed cards** (web + mobile): each model is an editorial-dark card with the photo (or
  placeholder), brand (BrandAvatar), model, fuel (FuelBadge), and consumption well-composed — not a
  flat text row. Keep brand grouping.
- **SHOW-02 — Photos via CarImages** (free), server-proxied + cached + key-safe + brand-placeholder
  fallback (see spike). web + mobile.
- **SHOW-03 — Simplify navigation/search** (web + mobile): the current browse is "too complicated /
  not intuitive". Make finding a vehicle simple — clearer search, sensible default ordering, easy
  brand filtering/jumping, less friction. (Planner/UI to define the concrete simpler flow; keep
  server-side search + pagination from Phase 4 — improve the UX layer, not the data layer.)

## Scope Fence

**In:** showroom redesign (web `garage/add` + mobile `vehicles` add) — cards, photos (CarImages proxy
+ cache + fallback), simplified nav/search UX; a backend image-resolve endpoint (key server-side,
cached, graceful); reuse the Phase 4 catalog API + editorial-dark atoms.

**Out:** changing the catalog data/ingestion (Phase 4 done); the garage LIST screen (only the add/
browse showroom); onboarding (Phase 8); release (Phase 9); a paid image provider; no new catalog source.

## Success Criteria (from ROADMAP)

1. Showroom vehicle entries render as designed editorial-dark cards (web + mobile).
2. Each card shows the vehicle's photo when available (CarImages), else a stylized brand placeholder.
3. Browsing/searching the showroom feels simple + intuitive (today "too complicated").
4. No paid dependency; `CARIMAGES_API_KEY` server-side only; graceful degradation (ships without key).

## Open Questions For Research / Planning

- Exact CarImages API: endpoint, auth (header `x-api-key`? query `key=`?), params (make/model/
  year?/angle?), response (image bytes vs JSON URL), free-tier limits + ToS for in-app display.
- Backend image-resolve shape: `GET /vehicles/catalog/:id/image` (or `?make=&model=`) returning a
  CDN URL (or proxying bytes) + cache + fallback signal; how the client renders photo vs placeholder.
- The concrete "simpler nav/search" design (UI-SPEC): default ordering, brand jump/filter, search
  affordance — within the locked editorial-dark system, reusing Phase 4 server search/pagination.
- The stylized brand placeholder design (web + mobile) for misses.
