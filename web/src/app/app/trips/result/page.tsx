'use client';

import { useState, useEffect } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Minus, Save, RotateCcw } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';
import { FuelBadge } from '@/components/ui/FuelBadge';
import { Pill } from '@/components/ui/Pill';
import { Tooltip } from '@/components/ui/Tooltip';
import { DataBar } from '@/components/ui/DataBar';
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

function categoryColor(category: EnergyComparison['category']): string {
  switch (category) {
    case 'ev':
      return 'bg-emerald-500';
    case 'diesel':
      return 'bg-sky-500';
    case 'gpl':
      return 'bg-violet-500';
    default:
      return 'bg-amber-500';
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
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-8 w-32 bg-carbon-surface2 rounded" />
        <div className="h-40 bg-carbon-surface2 rounded-card" />
        <div className="h-32 bg-carbon-surface2 rounded-card" />
      </div>
    );
  }

  const { result, multiResult, mode } = session;
  const cost = result.cost;
  const tollCost = result.tollCost ?? 0;
  const totalCost = (cost?.totalCost ?? 0) + tollCost;
  const perPerson = totalCost / passengers;
  const tollIsEstimate = result.tollIsEstimate ?? false;
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
  const tollBadge = hasToll ? (
    <Tooltip
      content={
        tollIsEstimate
          ? 'Estimation indicative (calcul français moyen)'
          : 'Prix réel calculé par TollGuru le long de l’itinéraire'
      }
    >
      <Pill color={tollIsEstimate ? 'warning' : 'success'} size="sm">
        {tollIsEstimate ? '≈ estimé' : 'réel'}
      </Pill>
    </Tooltip>
  ) : undefined;

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
          badge: tollBadge,
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
  ].filter(Boolean) as Array<{ label: string; value: string; badge?: ReactNode }>;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <Eyebrow className="mb-0.5">Résultat</Eyebrow>
        <h1 className="font-serif font-normal text-display text-carbon-ink">
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
          <span aria-hidden="true">{animatedTotal.toFixed(2)}</span>
          <span className="sr-only">{fmtEur.format(perPerson)}</span>
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
                {tollBadge}
              </span>
            )}
          </div>
        </div>

        {/* 2×2 metrics grid */}
        <Hairline className="my-4" />
        <div className="grid grid-cols-2 gap-3">
          {metrics.map(({ label, value, badge }, i) => (
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
                {badge}
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
              <Eyebrow>Comparatif énergétique</Eyebrow>
            </span>
          }
          padding="md"
        >
          <div className="flex flex-col gap-3 mt-2">
            {[...comparisons]
              .sort((a, b) => a.totalCost - b.totalCost)
              .map((comp) => {
                const barPct = maxCost > 0 ? (comp.totalCost / maxCost) * 100 : 0;
                return (
                  <div key={comp.category} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold text-carbon-ink2 ${comp.isCurrent ? 'text-carbon-ink' : ''}`}
                        >
                          {comp.label}
                        </span>
                        {comp.isCurrent && (
                          <span className="text-[10px] text-carbon-accent font-medium">
                            ← actuel
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold font-mono text-carbon-ink tabular-nums">
                        {fmtEur.format(comp.totalCost)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-carbon-surface2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${categoryColor(comp.category)} ${comp.isCurrent ? 'opacity-100' : 'opacity-50'}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-mono text-carbon-muted">
                      {comp.consumption.toFixed(comp.consumptionUnit === 'kWh' ? 1 : 2)}{' '}
                      {comp.consumptionUnit} · {comp.unitPrice.toFixed(4)} €/{comp.consumptionUnit}
                    </p>
                  </div>
                );
              })}
          </div>
        </SectionCard>
      )}

      {/* ── Passengers ────────────────────────────────────────── */}
      <SectionCard
        title={
          <span className="flex items-center gap-1.5">
            <Eyebrow>Passagers</Eyebrow>
          </span>
        }
        padding="md"
      >
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-carbon-ink2">Passager ×{passengers}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPassengers((p) => Math.max(1, p - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-carbon-hairline text-carbon-muted hover:text-carbon-ink hover:bg-carbon-surface2 transition-colors disabled:opacity-30"
              disabled={passengers <= 1}
            >
              <Minus size={13} />
            </button>
            <span className="w-8 text-center text-sm font-bold font-mono text-carbon-ink tabular-nums">
              {passengers}
            </span>
            <button
              type="button"
              onClick={() => setPassengers((p) => Math.min(9, p + 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-carbon-hairline text-carbon-muted hover:text-carbon-ink hover:bg-carbon-surface2 transition-colors disabled:opacity-30"
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
