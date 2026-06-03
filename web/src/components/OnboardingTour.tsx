'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Route,
  Car,
  Receipt,
  History,
  Star,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { apiClient } from '@/lib/api';
import {
  ONBOARDING_OPEN_EVENT,
  hasSeenOnboarding,
  markOnboardingSeen,
} from '@/lib/onboarding';
import type { UserProfile } from '@/types/api';

// ── Steps (FR, hardcoded — web follows the post-next-intl hardcoded-FR approach) ──
interface OnboardingStep {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  body: string;
}

const STEPS: readonly OnboardingStep[] = [
  {
    icon: Sparkles,
    title: 'Bienvenue sur verygoodtrip',
    body: "Le coût total réel d'un trajet pour votre véhicule — énergie et péage inclus — instantané et fiable.",
  },
  {
    icon: Route,
    title: 'Calculer un trajet',
    body: 'Depuis le dashboard : choisissez un départ, une arrivée et votre véhicule pour obtenir le coût total (énergie + péage).',
  },
  {
    icon: Car,
    title: 'Garage & showroom',
    body: 'Ajoutez vos véhicules et retrouvez-les dans le catalogue en recherchant marque ou modèle.',
  },
  {
    icon: Receipt,
    title: 'Péages',
    body: 'Le péage est estimé et déjà inclus dans le coût total affiché — pas de mauvaise surprise au départ.',
  },
  {
    icon: History,
    title: 'Trajets & historique',
    body: 'Sauvegardez vos trajets, suivez vos statistiques de dépenses et partagez un résumé en un geste.',
  },
  {
    icon: Star,
    title: 'Favoris',
    body: 'Mettez vos trajets préférés en favori pour les recalculer en un clic.',
  },
  {
    icon: Settings,
    title: 'Paramètres',
    body: 'Réglez le thème, votre pseudo, la langue — et rejouez ce tutoriel quand vous voulez.',
  },
] as const;

const STEP_COUNT = STEPS.length;

export function OnboardingTour() {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Fetch the current user once; auto-open only when the per-user flag is unset (ONB-5).
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<UserProfile>('/auth/me')
      .then(({ data }) => {
        if (cancelled || !data?.id) return;
        setUserId(data.id);
        if (!hasSeenOnboarding(data.id)) {
          setStep(0);
          setOpen(true);
        }
      })
      .catch(() => {
        // Not authenticated / network error → never auto-show.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Replay on demand: a window event re-opens the tour regardless of the seen flag (ONB-4).
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(ONBOARDING_OPEN_EVENT, handler);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handler);
  }, []);

  // Dismiss helpers ─────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (userId) markOnboardingSeen(userId);
    setOpen(false);
  }, [userId]);

  const next = useCallback(() => {
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  }, []);

  const prev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  // Escape closes (and marks seen) while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  // Lock background scroll while the modal is open (WR-03).
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Focus management + trap (WR-02): move focus into the dialog on open, keep
  // Tab/Shift+Tab within it, and restore focus to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;

    const getFocusable = (): HTMLElement[] => {
      if (!node) return [];
      const selector =
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(node.querySelectorAll<HTMLElement>(selector));
    };

    // Move focus into the dialog (first focusable, else the panel itself).
    (getFocusable()[0] ?? node)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        node?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !node?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !node?.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === STEP_COUNT - 1;
  const transitionClass = reducedMotion ? '' : 'transition-all duration-200';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Présentation de verygoodtrip"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-carbon-bg/85 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={[
          'relative z-10 w-full max-w-md flex flex-col outline-none',
          'bg-carbon-surface border border-carbon-hairline rounded-card shadow-2xl',
          transitionClass,
        ].join(' ')}
      >
        {/* Close (X) */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer le tutoriel"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-carbon-muted hover:text-carbon-ink hover:bg-carbon-surface2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg"
        >
          <X size={16} />
        </button>

        {/* Body */}
        <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center">
          <Eyebrow className="mb-4">{`Étape ${step + 1} / ${STEP_COUNT}`}</Eyebrow>

          <span
            className={[
              'flex items-center justify-center w-14 h-14 rounded-2xl mb-5',
              'bg-carbon-surface2 border border-carbon-hairline text-carbon-accent',
              transitionClass,
            ].join(' ')}
            aria-hidden="true"
          >
            <Icon size={26} />
          </span>

          <h2 className="text-xl font-bold font-display text-carbon-ink mb-2.5">
            {current.title}
          </h2>
          <p className="text-sm text-carbon-ink2 leading-relaxed max-w-xs">
            {current.body}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pb-5" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={[
                'rounded-full',
                transitionClass,
                i === step
                  ? 'w-5 h-1.5 bg-carbon-accent'
                  : 'w-1.5 h-1.5 bg-carbon-surface2',
              ].join(' ')}
            />
          ))}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-carbon-hairline">
          <CTAButton variant="ghost" size="sm" onClick={dismiss}>
            Passer
          </CTAButton>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <CTAButton
                variant="surface"
                size="sm"
                icon={<ChevronLeft size={14} />}
                onClick={prev}
              >
                Précédent
              </CTAButton>
            )}
            {isLast ? (
              <CTAButton variant="accent" size="sm" onClick={dismiss}>
                Terminer
              </CTAButton>
            ) : (
              <CTAButton
                variant="accent"
                size="sm"
                icon={<ChevronRight size={14} />}
                iconRight
                onClick={next}
              >
                Suivant
              </CTAButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
