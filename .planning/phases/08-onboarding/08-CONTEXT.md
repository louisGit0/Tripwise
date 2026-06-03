---
phase: 08-onboarding
type: context
source: user feedback (v1.1) + orchestrator defaults (2026-06-03)
requirements: [ONB-01]
---

# Phase 8 Context — Onboarding

## Domain

After creating an account, the user gets a tutorial explaining the app and each screen; it is
replayable any time from Settings. Web + mobile. Editorial-dark language locked — reuse it.

## Decisions (defaults — confirm at checkpoint)

- **ONB-1 — Format: full-screen multi-step carousel/slides** (not anchored coachmarks — simpler +
  cross-platform + robust). One welcome slide + one slide per key area, each with an icon/illustration
  + title + short text + progress dots + Skip / Next / (Précédent) / Terminer. Editorial-dark
  (carbon tokens web / theme tokens mobile, Space Grotesk, NO serif).
- **ONB-2 — Steps (content, FR + EN i18n)**: (1) Bienvenue sur verygoodtrip + value prop; (2) Calculer
  un trajet (dashboard: départ/arrivée, véhicule, coût total énergie + péage); (3) Garage & showroom
  (ajouter un véhicule, rechercher dans le catalogue); (4) Péages (réel/estimé, inclus dans le total);
  (5) Trajets & historique (sauvegarde, stats, partage); (6) Favoris; (7) Paramètres (thème, pseudo,
  langue, rejouer ce tuto). Keep concise.
- **ONB-3 — Persistence: client-side per-user "seen" flag** — NO backend/migration. Web: `localStorage`
  key `verygoodtrip.onboarding.seen.<userId>`. Mobile: `expo-secure-store` (already a dependency) under
  an analogous per-user key. Shown automatically on the first authenticated load when the flag is unset
  (i.e. first login after signup); set on finish/skip. Per-device is acceptable.
- **ONB-4 — Replay from Settings**: a "Revoir le tutoriel" entry in Settings (web + mobile) re-opens
  the carousel on demand (does not require clearing the flag — just open the component).
- **ONB-5 — Trigger**: in the authenticated app shell (web `AppLayout` / mobile tabs layout), on mount,
  if the per-user seen flag is unset → show the tour. Don't block navigation; dismissible.

## Scope Fence

**In:** an `OnboardingTour` component (web + mobile) + the steps content (i18n FR+EN) + the seen-flag
persistence + the auto-trigger on first authenticated load + the Settings "Revoir le tutoriel" entry.
Reuse locked editorial-dark atoms/tokens.

**Out:** backend changes / migration (client-side flag); coachmark anchoring; changing any existing
screen's behavior; release (Phase 9). No new heavy dependency (web: a few divs/state; mobile: RN
Modal + expo-secure-store already present).

## Success Criteria (from ROADMAP / ONB-01)

1. First login after signup shows a multi-step walkthrough of the app + each screen; once seen it does
   not auto-reshow (persisted per user).
2. Settings has a "Revoir le tutoriel" entry that replays it. Web + mobile.
3. Editorial-dark, FR+EN, dismissible, no regression to existing flows.

## Notes / Open

- Web trigger lives in the authenticated `AppLayout` (so it shows across `/app/*`); mobile in the
  `(tabs)/_layout` or a mount in the app root after auth.
- Reduced-motion: keep transitions minimal/compositor-friendly; honor prefers-reduced-motion (web) /
  AccessibilityInfo (mobile) for any slide animation.
- i18n: add an `onboarding.*` namespace (steps titles/bodies + nav labels) symmetric FR/EN (web has
  hardcoded FR strings post-next-intl-removal — follow the web's current string approach; mobile uses i18next).
