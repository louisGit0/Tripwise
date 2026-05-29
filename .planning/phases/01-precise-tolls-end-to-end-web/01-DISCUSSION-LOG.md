# Phase 1: Precise Tolls End-to-End (Web) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 1-precise-tolls-end-to-end-web
**Areas discussed:** Real-vs-estimate indicator, Fallback & transparency, TollGuru request precision, Cache freshness

---

## Real-vs-estimate indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Badge + tooltip | Badge "réel" / "≈ estimé" next to the amount, tooltip explains source (TollGuru vs heuristic) | ✓ |
| Badge discret seul | Badge only, no explanation | |
| Note texte sous le montant | Explicit "Péage estimé — tarifs indicatifs" line, no badge | |

**User's choice:** Badge + tooltip
**Notes:** Driven by the existing `tollIsEstimate` boolean. FR wording.

---

## Fallback & transparency

| Option | Description | Selected |
|--------|-------------|----------|
| Estimation + badge, masquer si 0 | Fallback to heuristic with badge; hide toll line when cost = 0 | ✓ |
| Estimation + badge, toujours afficher 0 € | Same fallback, but keep the toll line visible at "0 €" | |
| Repli + note explicite | Add an explicit note in addition to the badge on fallback | |

**User's choice:** Estimation + badge, hide line when 0 €
**Notes:** No error surfaced to the user on fallback; number always shown when > 0.

---

## TollGuru request precision

| Option | Description | Selected |
|--------|-------------|----------|
| Tracé Mapbox complet (polyline) | Send the real route geometry → barrier-to-barrier exact toll, consistent with displayed route | ✓ |
| Origine → destination | Send only the two points; TollGuru infers the route | |

**User's choice:** Full Mapbox polyline
**Notes:** Geometry already available from `MapboxService.getDirections`; aligns with Core Value (accurate cost).

---

## Cache freshness

| Option | Description | Selected |
|--------|-------------|----------|
| Long — 30 jours | Tolls change ~yearly; long cache conserves free TollGuru quota | ✓ |
| Moyen — 7 jours | Freshness/quota compromise | |
| Court — 24 h | More conservative on freshness, more quota usage | |

**User's choice:** 30-day TTL
**Notes:** Mirrors the in-memory TTL cache pattern from fuel-prices/charging-stations, with a longer TTL.

## Claude's Discretion

- Exact cache-key construction, TollGuru endpoint choice, error/timeout thresholds, badge/tooltip markup.
- Whether to extract a dedicated `TollService` from the 726-line `TripsService` (recommended, planner's call).

## Deferred Ideas

- Multi-class tolls (trucks/motorcycles/towing) — v2
- Per-segment / barrier-by-barrier breakdown — v2
- "Avoid tolls" routing alternative — v2
- Mobile toll display — Phase 5
