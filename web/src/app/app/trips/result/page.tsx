'use client';

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Minus, Save, RotateCcw, Share2 } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';
import { FuelBadge } from '@/components/ui/FuelBadge';
import { DataBar } from '@/components/ui/DataBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCountUp } from '@/hooks/useCountUp';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type {
  PendingTripSession,
  FuelCostResult,
  ElectricCostResult,
  EnergyComparison,
  FuelType,
  SavedTrip,
} from '@/types/api';

const SESSION_KEY = 'verygoodtrip.pendingTrip';

// Standardized focus ring (mirrors CTAButton) — applied to every interactive element.
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg';

function isFuelCost(cost: FuelCostResult | ElectricCostResult): cost is FuelCostResult {
  return cost.type === 'fuel';
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
  return `${m} min`;
}

// Energy fill var for the trip's own fuel type (breakdown bar Énergie segment).
function energyFillVar(fuelType: FuelType): string {
  if (fuelType === 'ELECTRIC') return 'var(--c-ev)';
  if (fuelType === 'DIESEL') return 'var(--c-fuel-die)';
  if (fuelType === 'GPL') return 'var(--c-fuel-gpl)';
  return 'var(--c-fuel-gas)'; // SP95 / SP95_E10 / SP98 / E85
}

// Energy fill var by comparison category (Variant B comparison bars).
function categoryFillVar(category: EnergyComparison['category']): string {
  switch (category) {
    case 'ev':
      return 'var(--c-ev)';
    case 'diesel':
      return 'var(--c-fuel-die)';
    case 'gpl':
      return 'var(--c-fuel-gpl)';
    default:
      return 'var(--c-fuel-gas)'; // gas
  }
}

export default function TripResultPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [session, setSession] = useState<PendingTripSession | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) {
        router.replace('/app/dashboard');
        return;
      }
      const parsed = JSON.parse(raw) as PendingTripSession;
      setSession(parsed);
    } catch {
      router.replace('/app/dashboard');
    }
  }, [router]);

  // Hooks must run unconditionally (before the session guard). The hero target is
  // safe-defaulted to 0 until the session resolves.
  const heroTarget = session
    ? ((session.result.cost?.totalCost ?? 0) + (session.result.tollCost ?? 0)) / passengers
    : 0;
  const animatedTotal = useCountUp(heroTarget);
  const reducedMotion = useReducedMotion();

  // Staggered reveal style (gated off under reduced motion).
  const revealStyle = (index: number): CSSProperties =>
    reducedMotion
      ? {}
      : {
          animation: 'reveal 360ms ease-out both',
          animationDelay: `${Math.min(index * 60, 300)}ms`,
        };

  function handleNewTrip() {
    sessionStorage.removeItem(SESSION_KEY);
    router.push('/app/dashboard');
  }

  async function handleSave() {
    if (!session || !session.origin || !session.destination) return;
    const cost = session.result.cost;
    if (!cost) return;

    setIsSaving(true);
    try {
      const energyAmount = isFuelCost(cost)
        ? cost.consumptionLitres
        : cost.consumptionKwh;
      const energyUnit = isFuelCost(cost) ? 'L' : 'kWh';
      const unitPrice = isFuelCost(cost) ? cost.pricePerLitre : cost.pricePerKwh;

      const { data } = await apiClient.post<SavedTrip>('/trips/save', {
        userVehicleId: session.selectedVehicleId,
        origin: {
          lat: session.origin.lat,
          lng: session.origin.lng,
          label: session.origin.label,
        },
        destination: {
          lat: session.destination.lat,
          lng: session.destination.lng,
          label: session.destination.label,
        },
        distanceMeters: session.result.distance.meters,
        durationSeconds: session.result.duration.seconds,
        fuelType: session.result.vehicle.fuelType,
        energyAmount,
        energyUnit,
        unitPrice,
        energyCost: cost.totalCost,
        totalCost: cost.totalCost + (session.result.tollCost ?? 0),
        tollsCost: session.result.tollCost ?? 0,
        tollIsEstimate: session.result.tollIsEstimate,
        passengersCount: passengers,
      });

      setIsSaved(true);
      showToast('success', 'Trajet enregistré !');
      sessionStorage.removeItem(SESSION_KEY);
      router.push(`/app/trips/${data.id}`);
    } catch {
      showToast('error', 'Une erreur est survenue');
    } finally {
      setIsSaving(false);
    }
  }

  if (!session) {
    // Layout-mirroring skeleton — matches the redesigned structure so the
    // skeleton→content swap produces no layout shift (CLS-safe).
    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <Skeleton width="20%" height={11} />
          <Skeleton width="55%" height={32} rounded="rounded-lg" />
        </div>
        {/* Hero plate */}
        <div className="rounded-card bg-carbon-surface3 border border-carbon-hairline p-5 flex flex-col gap-5">
          <Skeleton width="30%" height={11} />
          <Skeleton width="65%" height={88} rounded="rounded-card" />
          {/* breakdown bar + legend */}
          <div className="flex flex-col gap-2.5">
            <Skeleton width="100%" height={10} rounded="rounded-full" />
            <div className="flex gap-5">
              <Skeleton width={96} height={11} />
              <Skeleton width={80} height={11} />
            </div>
          </div>
          {/* 2×2 tiles */}
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((k) => (
              <Skeleton key={k} height={52} rounded="rounded-xl" />
            ))}
          </div>
        </div>
        {/* Comparison rows */}
        <div className="rounded-card bg-carbon-surface border border-carbon-hairline p-5 flex flex-col gap-3">
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className="flex flex-col gap-1.5">
              <Skeleton width="40%" height={14} />
              <Skeleton width="100%" height={6} rounded="rounded-full" />
            </div>
          ))}
        </div>
        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Skeleton width="100%" height={44} rounded="rounded-xl" />
          <Skeleton width="100%" height={44} rounded="rounded-xl" />
        </div>
      </div>
    );
  }

  const { result, multiResult, mode } = session;
  const cost = result.cost;
  const tollCost = result.tollCost ?? 0;
  const totalCost = (cost?.totalCost ?? 0) + tollCost;
  const perPerson = totalCost / passengers;
  const isElectric = result.vehicle.fuelType === 'ELECTRIC';
  const canSave = mode === 'address' && !!session.origin && !!session.destination && !!cost;
  const energyCost = cost?.totalCost ?? 0;
  const energyFill = energyFillVar(result.vehicle.fuelType);

  const fmtEur = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });

  // Comparison bars — sorted cheapest first
  const comparisons = multiResult?.comparisons ?? [];
  const maxCost = comparisons.reduce((m, c) => Math.max(m, c.totalCost), 0);

  // Metrics grid — péage line dropped entirely when there is no toll (D-04)
  const hasToll = result.tollCost !== null && result.tollCost > 0;

  const metrics = [
    {
      label: 'ÉNERGIE',
      value: cost
        ? `${isFuelCost(cost) ? cost.consumptionLitres.toFixed(2) : cost.consumptionKwh.toFixed(1)} ${isFuelCost(cost) ? 'L' : 'kWh'}`
        : 'Non calculé',
    },
    hasToll
      ? {
          label: 'PÉAGES',
          value: fmtEur.format(result.tollCost as number),
        }
      : false,
    {
      label: '€/KM',
      value:
        result.distance.km > 0
          ? `${(totalCost / result.distance.km).toFixed(3)} €`
          : 'Non calculé',
    },
    {
      label: 'PAR PERS.',
      value: fmtEur.format(perPerson),
    },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  // ── Share summary (POL-02) — toll-inclusive FR text ───────────
  // navigator.share when available (AbortError on cancel is swallowed),
  // else a navigator.clipboard fallback with a success toast.
  const handleShare = async () => {
    const from = session.origin?.label?.split(',')[0] ?? '—';
    const to = session.destination?.label?.split(',')[0] ?? '—';
    const breakdown = hasToll
      ? `Énergie ${fmtEur.format(energyCost)} · Péage ${fmtEur.format(tollCost)}`
      : `Énergie ${fmtEur.format(energyCost)}`;
    const text = [
      `${from} → ${to}`,
      `Coût total : ${fmtEur.format(totalCost)}`,
      breakdown,
      `${result.distance.km.toFixed(1)} km · ${formatDuration(result.duration.seconds)}`,
      'Calculé avec verygoodtrip',
    ].join('\n');
    const title = `${from} → ${to}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text });
        return;
      }
    } catch (err) {
      // User dismissed the share sheet — treat as a no-op, do not fall back.
      if (err instanceof Error && err.name === 'AbortError') return;
      // Any other share failure falls through to the clipboard path below.
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast('success', 'Résumé copié dans le presse-papiers');
      }
    } catch {
      showToast('error', 'Une erreur est survenue');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <Eyebrow className="mb-0.5">Résultat</Eyebrow>
        <h1 className="font-display font-bold text-display text-carbon-ink">
          {session.origin?.label?.split(',')[0] ?? '—'}
          <span className="text-carbon-muted mx-2">→</span>
          {session.destination?.label?.split(',')[0] ?? '—'}
        </h1>
      </div>

      {/* ── Hero cost ─────────────────────────────────────────── */}
      <SectionCard padding="md" className="!bg-carbon-surface3">
        <p className="text-caption font-bold tracking-eye uppercase text-carbon-muted mb-2">
          Coût estimé
        </p>
        <p className="text-hero font-bold font-mono text-carbon-ink leading-none tabular-nums">
          <span aria-hidden="true">{animatedTotal.toFixed(2).replace('.', ',')}</span>
          <span className="sr-only">
            {fmtEur.format(totalCost)}
            {passengers > 1 ? `, soit ${fmtEur.format(perPerson)} par personne` : ''}
          </span>
          <span aria-hidden="true" className="text-display font-normal text-carbon-muted ml-2">
            €
          </span>
        </p>
        {passengers > 1 && (
          <p className="text-caption text-carbon-muted mt-1 font-mono">
            {fmtEur.format(totalCost)} total · {passengers} passagers
          </p>
        )}

        {/* ── Breakdown bar (Variant A — Énergie vs Péage) ──────── */}
        {/* Guarded: a non-positive total (e.g. distance mode without a
            computed cost) would render an empty 0%-width track — hide it
            entirely, mirroring the "Non calculé" affordance in the metrics. */}
        {totalCost > 0 && (
        <div className="mt-5">
          <DataBar
            energyValue={energyCost}
            tollValue={tollCost}
            total={totalCost}
            energyFillVar={energyFill}
          />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2.5">
            <span
              style={revealStyle(0)}
              className="flex items-center gap-1.5 text-caption font-mono text-carbon-ink2"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: energyFill }}
              />
              Énergie · {fmtEur.format(energyCost)}
            </span>
            {hasToll && (
              <span
                style={revealStyle(1)}
                className="flex items-center gap-1.5 text-caption font-mono text-carbon-ink2"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: 'var(--c-toll)' }}
                />
                Péage · {fmtEur.format(result.tollCost as number)}
              </span>
            )}
          </div>
        </div>
        )}

        {/* 2×2 metrics grid */}
        <Hairline className="my-4" />
        <div className="grid grid-cols-2 gap-3">
          {metrics.map(({ label, value }, i) => (
            <div
              key={label}
              style={revealStyle(i)}
              className="flex flex-col gap-0.5 p-3 bg-carbon-surface2 rounded-xl border border-carbon-hairline"
            >
              <span className="text-caption font-bold tracking-eye uppercase text-carbon-muted">
                {label}
              </span>
              <span className="flex items-center gap-1.5 text-body font-bold font-mono text-carbon-ink tabular-nums">
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <FuelBadge fuelType={result.vehicle.fuelType} />
          <span className="text-caption text-carbon-muted font-mono">
            {result.distance.km.toFixed(1)} km
          </span>
          {result.duration.seconds > 0 && (
            <span className="text-caption text-carbon-muted font-mono">
              {formatDuration(result.duration.seconds)}
            </span>
          )}
        </div>

        {/* Estimate note for distance mode */}
        {mode === 'distance' && (
          <p className="mt-3 text-caption text-carbon-ink2 bg-carbon-surface2 border border-carbon-hairline rounded-lg px-3 py-2 leading-relaxed">
            Estimation indicative — calcul sans itinéraire précis.
          </p>
        )}

        {/* Electric disclaimer */}
        {isElectric && cost && !isFuelCost(cost) && cost.disclaimer && (
          <p className="mt-3 text-caption text-carbon-ink2 bg-carbon-surface2 border border-carbon-hairline rounded-lg px-3 py-2 leading-relaxed">
            {cost.disclaimer}
          </p>
        )}
      </SectionCard>

      {/* ── Energy comparison ─────────────────────────────────── */}
      {comparisons.length > 0 && (
        <SectionCard
          title={
            <span className="flex items-center gap-1.5">
              <Eyebrow as="span" className="font-display">
                Comparatif énergétique
              </Eyebrow>
            </span>
          }
          padding="md"
        >
          <div className="flex flex-col gap-3 mt-2">
            {[...comparisons]
              .sort((a, b) => a.totalCost - b.totalCost)
              .map((comp, i) => (
                <div key={comp.category} style={revealStyle(i)} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-body ${comp.isCurrent ? 'font-bold text-carbon-ink' : 'font-normal text-carbon-ink2'}`}
                      >
                        {comp.label}
                      </span>
                      {comp.isCurrent && (
                        <span className="text-caption text-carbon-accent font-bold">
                          ← actuel
                        </span>
                      )}
                    </div>
                    <span className="text-body font-bold font-mono text-carbon-ink tabular-nums">
                      {fmtEur.format(comp.totalCost)}
                    </span>
                  </div>
                  <DataBar
                    height="sm"
                    value={comp.totalCost}
                    max={maxCost}
                    fillVar={categoryFillVar(comp.category)}
                    muted={!comp.isCurrent}
                  />
                  <p className="text-caption font-mono text-carbon-muted">
                    {comp.consumption.toFixed(comp.consumptionUnit === 'kWh' ? 1 : 2)}{' '}
                    {comp.consumptionUnit} · {comp.unitPrice.toFixed(4)} €/{comp.consumptionUnit}
                  </p>
                </div>
              ))}
          </div>
        </SectionCard>
      )}

      {/* ── Passengers ────────────────────────────────────────── */}
      <SectionCard
        title={
          <span className="flex items-center gap-1.5">
            <Eyebrow as="span" className="font-display">
              Passagers
            </Eyebrow>
          </span>
        }
        padding="md"
      >
        <div className="flex items-center justify-between mt-2">
          <p className="text-body text-carbon-ink2">Passager ×{passengers}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Retirer un passager"
              onClick={() => setPassengers((p) => Math.max(1, p - 1))}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border border-carbon-hairline text-carbon-muted hover:text-carbon-ink hover:bg-carbon-surface2 active:bg-carbon-hairline transition-all disabled:opacity-30 ${FOCUS_RING}`}
              disabled={passengers <= 1}
            >
              <Minus size={13} />
            </button>
            <span className="w-8 text-center text-body font-bold font-mono text-carbon-ink tabular-nums">
              {passengers}
            </span>
            <button
              type="button"
              aria-label="Ajouter un passager"
              onClick={() => setPassengers((p) => Math.min(9, p + 1))}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border border-carbon-hairline text-carbon-muted hover:text-carbon-ink hover:bg-carbon-surface2 active:bg-carbon-hairline transition-all disabled:opacity-30 ${FOCUS_RING}`}
              disabled={passengers >= 9}
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ── CTA buttons ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {canSave && !isSaved && (
          <CTAButton
            variant="accent"
            size="lg"
            icon={<Save size={15} />}
            onClick={handleSave}
            loading={isSaving}
            className="w-full"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer dans l\'historique'}
          </CTAButton>
        )}
        <CTAButton
          variant="ghost"
          size="lg"
          icon={<Share2 size={15} />}
          onClick={handleShare}
          className="w-full"
        >
          Partager
        </CTAButton>
        <CTAButton
          variant="ghost"
          size="lg"
          icon={<RotateCcw size={15} />}
          onClick={handleNewTrip}
          className="w-full"
        >
          Nouveau trajet
        </CTAButton>
      </div>

      <Hairline />
    </div>
  );
}
