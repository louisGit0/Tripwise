---
phase: 1
slug: precise-tolls-end-to-end-web
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + ts-jest (backend e2e); `tsc --noEmit` + `next build` (web gate) |
| **Config file** | `backend/test/jest-e2e.json` |
| **Quick run command** | `cd backend && npx jest --config test/jest-e2e.json --testPathPatterns="trips" --forceExit` |
| **Full suite command** | `cd backend && npx jest --config test/jest-e2e.json --forceExit` |
| **Web gate** | `cd web && npx tsc --noEmit && npm run build` |
| **Estimated runtime** | ~30–60 s backend e2e; ~30 s web gate |

---

## Sampling Rate

- **After every task commit:** Run the quick run command (trips suite)
- **After every plan wave:** Run the full suite command (all backend e2e)
- **Before `/gsd:verify-work`:** Full backend e2e green + web gate green
- **Max feedback latency:** 60 s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _(populated by planner)_ | | | TOLL-01..06 | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Toll unit tests (`backend/src/trips/*.spec.ts`) — TollGuru parse, polyline handoff, fallback, cache hit/miss, hide-when-0 (extend existing `trips.service.spec.ts`)
- [ ] e2e: `POST /trips/calculate` returns `tollCost`/`tollIsEstimate`; `POST /trips/save` persists toll + estimate flag (extend `test/trips*.e2e-spec.ts`)

*Existing Jest e2e infrastructure covers the framework; only new toll assertions are added.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real TollGuru toll on a known route (Paris→Lyon ≈ €37 class 1) | TOLL-01 | Requires a live `TOLLGURU_API_KEY` + external API; cannot assert exact € in CI | With key set, calculate Paris→Lyon, confirm a real (non-estimate) toll near €37 and the "réel" badge |
| Real-vs-estimate badge + tooltip render | TOLL-04 | Visual/interaction on web result page | Calculate a tolled route with and without key; confirm badge text + tooltip source |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
