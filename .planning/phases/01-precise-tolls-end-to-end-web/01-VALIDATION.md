---
phase: 1
slug: precise-tolls-end-to-end-web
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + ts-jest (backend unit + e2e via supertest); `tsc --noEmit` + `next build` (web gate) |
| **Config file** | unit: inline in `backend/package.json` (`rootDir: src`); e2e: `backend/test/jest-e2e.json` |
| **Quick run command** | `cd backend && npx jest --config test/jest-e2e.json --testPathPatterns="trips" --forceExit` |
| **Full suite command** | `cd backend && npx jest --config test/jest-e2e.json --forceExit` |
| **Web gate** | `cd web && npx tsc --noEmit && npm run build` |
| **Estimated runtime** | ~30–60 s backend e2e; ~30 s web gate |

---

## Sampling Rate

- **After every task commit:** Run the quick run command (trips suite); for plan 01 also `npx jest src/toll/toll.service.spec.ts`
- **After every plan wave:** Run the full suite command (all backend e2e)
- **Before `/gsd:verify-work`:** Full backend e2e green + web gate green + both plan-04 checkpoints approved
- **Max feedback latency:** 60 s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01 | 1 | TOLL-02, TOLL-06 | T-01-03 | Heuristic fallback + cache, no throw | unit (RED) | `cd backend && npx jest src/toll/toll.service.spec.ts` | ❌ created this task (Wave 0) | ⬜ pending |
| 01-01-T2 | 01 | 1 | TOLL-01, TOLL-02, TOLL-03, TOLL-06 | T-01-01, T-01-02, T-01-05 | Server-side key, hard-coded URL, timeout+fallback | unit (GREEN) | `cd backend && npx jest src/toll/toll.service.spec.ts` | ✅ (Task 1) | ⬜ pending |
| 01-01-T3 | 01 | 1 | TOLL-01, TOLL-06 | T-01-01 | No key field in `/calculate` response | e2e | `cd backend && npx jest --config test/jest-e2e.json --testPathPatterns="trips" --forceExit` | ✅ extend `trips.e2e-spec.ts` | ⬜ pending |
| 01-02-T1 | 02 | 2 | TOLL-05 | T-02-03 | Hand-written IF NOT EXISTS migration | build/type | `cd backend && npx tsc --noEmit && npm run build` | ✅ | ⬜ pending |
| 01-02-T2 | 02 | 2 | TOLL-05 | T-02-03 | [BLOCKING] migration applied (no false positive) | migration | `cd backend && npm run migration:show` | ✅ | ⬜ pending |
| 01-02-T3 | 02 | 2 | TOLL-05 | T-02-01, T-02-02 | Validated boolean, per-user access | e2e | `cd backend && npx jest --config test/jest-e2e.json --testPathPatterns="trips-crud" --forceExit` | ✅ extend `trips-crud.e2e-spec.ts` | ⬜ pending |
| 01-03-T1 | 03 | 3 | TOLL-04 | T-03-02 | React text nodes, no dangerouslySetInnerHTML | type | `cd web && npx tsc --noEmit` | ✅ | ⬜ pending |
| 01-03-T2 | 03 | 3 | TOLL-04 | T-03-01 | No key in web bundle | type/build | `cd web && npx tsc --noEmit && npm run build` | ✅ | ⬜ pending |
| 01-03-T3 | 03 | 3 | TOLL-04 | T-03-01 | Same, detail page | type/build | `cd web && npx tsc --noEmit && npm run build` | ✅ | ⬜ pending |
| 01-04-T1 | 04 | 4 | TOLL-01, TOLL-02 | T-04-01, T-04-02 | Real key never in response/DOM | manual (human-verify) | n/a — live key + external API (VALIDATION Manual-Only) | ✅ | ⬜ pending |
| 01-04-T2 | 04 | 4 | TOLL-04 | T-03-01 | Badge/tooltip render, no key leak | manual (human-verify) | n/a — no web test infra (CONCERNS) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/toll/toll.service.spec.ts` — TollGuru precise parse, polyline handoff, silent fallback (no key / non-ok / timeout / parse-fail), no-toll (hasTolls=false) → 0-real, class-1 body, cache hit/miss (created in plan 01 Task 1; heuristic cases MOVED from `trips.service.spec.ts`)
- [ ] Extend `backend/test/trips.e2e-spec.ts` — `POST /trips/calculate` returns `tollCost`/`tollIsEstimate`; no API-key field in response (plan 01 Task 3)
- [ ] Extend `backend/test/trips-crud.e2e-spec.ts` — `POST /trips/save` persists `tollsCost`+`tollIsEstimate`; stats include toll once (plan 02 Task 3)

*Existing Jest e2e infrastructure covers the framework; only new toll assertions + the new toll unit spec are added.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real TollGuru toll on a known route (Paris→Lyon ≈ €37 class 1) | TOLL-01 | Requires a live `TOLLGURU_API_KEY` + external API; cannot assert exact € in CI | Plan 04 Task 1 |
| Real-vs-estimate badge + tooltip + hide-when-0 render | TOLL-04 | Visual/interaction on web; no web test infra (CONCERNS) | Plan 04 Task 2 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (manual tasks are the documented Manual-Only checkpoints)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (toll spec + 2 e2e extensions)
- [x] No watch-mode flags
- [x] Feedback latency < 60 s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planned (per-task map populated by planner)
