'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, Trash2, RotateCcw, ChevronLeft } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { FuelBadge } from '@/components/ui/FuelBadge';
import { Hairline } from '@/components/ui/Hairline';
import { Modal } from '@/components/ui/Modal';
import { DataBar } from '@/components/ui/DataBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/providers/ToastProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/lib/api';
import type { SavedTrip, FuelType } from '@/types/api';

type Props = {
  params: Promise<{ id: string }>;
};

// Canonical focus ring (mirrors result/page.tsx) — every interactive element.
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg';

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

export default function TripDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();

  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Note editing
  const [noteValue, setNoteValue] = useState('');
  const debouncedNote = useDebounce(noteValue, 1000);
  const savedNoteRef = useRef<string | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);

  // Load trip
  useEffect(() => {
    setIsLoading(true);
    apiClient
      .get<SavedTrip>(`/trips/${id}`)
      .then(({ data }) => {
        setTrip(data);
        const n = data.note ?? '';
        setNoteValue(n);
        savedNoteRef.current = n;
      })
      .catch((err) => {
        if (err?.response?.status === 404 || err?.response?.status === 403) {
          setNotFound(true);
        } else {
          showToast('error', 'Une erreur est survenue');
        }
      })
      .finally(() => setIsLoading(false));
  }, [id, showToast]);

  // Auto-save note when debounced value changes
  useEffect(() => {
    if (savedNoteRef.current === null) return; // not yet loaded
    if (debouncedNote === savedNoteRef.current) return; // no change
    savedNoteRef.current = debouncedNote;
    setNoteSaving(true);
    apiClient
      .patch(`/trips/${id}`, { note: debouncedNote })
      .then(() => {
        setTrip((prev) => (prev ? { ...prev, note: debouncedNote } : prev));
      })
      .catch(() => showToast('error', 'Une erreur est survenue'))
      .finally(() => setNoteSaving(false));
  }, [debouncedNote, id, showToast]);

  async function handleArchiveToggle() {
    if (!trip) return;
    const newValue = !trip.isArchived;
    setIsArchiving(true);
    try {
      await apiClient.patch(`/trips/${id}`, { isArchived: newValue });
      setTrip((prev) => (prev ? { ...prev, isArchived: newValue } : prev));
    } catch {
      showToast('error', 'Une erreur est survenue');
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/trips/${id}`);
      router.push('/app/trips');
    } catch {
      showToast('error', 'Une erreur est survenue');
      setIsDeleting(false);
    }
  }

  function handleRedo() {
    if (!trip) return;
    const params = new URLSearchParams({
      originLabel: trip.originLabel,
      originLat: trip.originLat.toString(),
      originLng: trip.originLng.toString(),
      destinationLabel: trip.destinationLabel,
      destinationLat: trip.destinationLat.toString(),
      destinationLng: trip.destinationLng.toString(),
    });
    if (trip.vehicleId) params.set('vehicleId', trip.vehicleId);
    router.push(`/app/dashboard?${params.toString()}`);
  }

  // ── Loading skeleton — mirrors the title + hero + breakdown + meta layout ──
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {/* Title block */}
        <div className="flex flex-col gap-2">
          <Skeleton width="18%" height={11} />
          <Skeleton width="60%" height={32} rounded="rounded-lg" />
        </div>
        {/* Hero plate */}
        <div className="rounded-card bg-carbon-surface3 border border-carbon-hairline p-5 flex flex-col gap-5">
          <Skeleton width="30%" height={11} />
          <Skeleton width="55%" height={72} rounded="rounded-card" />
          {/* breakdown bar + legend */}
          <div className="flex flex-col gap-2.5">
            <Skeleton width="100%" height={10} rounded="rounded-full" />
            <div className="flex gap-5">
              <Skeleton width={96} height={11} />
              <Skeleton width={80} height={11} />
            </div>
          </div>
          {/* metrics grid */}
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((k) => (
              <Skeleton key={k} height={44} rounded="rounded-xl" />
            ))}
          </div>
        </div>
        {/* Vehicle + note cards */}
        <Skeleton width="100%" height={88} rounded="rounded-card" />
        <Skeleton width="100%" height={120} rounded="rounded-card" />
      </div>
    );
  }

  // ── 404 state ────────────────────────────────────────────────
  if (notFound || !trip) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-carbon-muted">
        <p className="font-mono text-xs tracking-widest uppercase">{"// 404"}</p>
        <p className="text-base font-bold text-carbon-ink">Trajet introuvable</p>
        <p className="text-sm text-center max-w-xs">
          Ce trajet n&apos;existe pas ou vous n&apos;y avez pas accès.
        </p>
        <CTAButton variant="ghost" size="sm" onClick={() => router.push('/app/trips')}>
          Retour
        </CTAButton>
      </div>
    );
  }

  const isElectric = trip.fuelType === 'ELECTRIC';
  const fmtEur = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* ── Back + eyebrow ────────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => router.push('/app/trips')}
          className={`flex items-center gap-1 text-xs text-carbon-muted hover:text-carbon-accent transition-colors mb-3 ${FOCUS_RING}`}
        >
          <ChevronLeft size={13} aria-hidden="true" />
          Retour
        </button>
        <Eyebrow className="mb-0.5">
          {isElectric ? '// ÉLECTRIQUE' : '// COMBUSTION'}
        </Eyebrow>
        <div className="flex items-center gap-2 mt-1">
          <h1 className="font-display font-bold text-display text-carbon-ink">
            {trip.originLabel.split(',')[0]}
            <span className="text-carbon-muted mx-1.5">→</span>
            {trip.destinationLabel.split(',')[0]}
          </h1>
          {trip.isArchived && (
            <span className="text-[10px] text-carbon-muted border border-carbon-hairline rounded px-1.5 py-px shrink-0">
              Archivé
            </span>
          )}
        </div>
        <p className="text-xs font-mono text-carbon-muted mt-1">
          {new Date(trip.tripDate).toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* ── Hero cost ─────────────────────────────────────────── */}
      <SectionCard padding="md" className="!bg-carbon-surface3">
        <p className="text-caption font-bold tracking-eye uppercase text-carbon-muted mb-2">
          Coût total
        </p>
        <p className="text-hero font-bold font-mono text-carbon-ink leading-none tabular-nums">
          {trip.totalCost.toFixed(2).replace('.', ',')}
          <span className="text-display font-normal text-carbon-muted ml-2">€</span>
        </p>
        {trip.passengersCount > 1 && (
          <p className="text-xs text-carbon-muted mt-1 font-mono">
            {(trip.totalCost / trip.passengersCount).toFixed(2)} € / pers. ·{' '}
            {trip.passengersCount} passagers
          </p>
        )}

        {/* ── Breakdown bar (Variant A — Énergie vs Péage) ───── */}
        {/* Mirrors the result page: render the segmented breakdown only when a
            toll is present (D-04 hide-when-toll-0). The toll-estimate badge was
            removed (POL-01); tollIsEstimate still flows on the trip object. */}
        {trip.tollsCost > 0 && (
          <div className="mt-5">
            <DataBar
              energyValue={trip.totalCost - trip.tollsCost}
              tollValue={trip.tollsCost}
              total={trip.totalCost}
              energyFillVar={energyFillVar(trip.fuelType)}
            />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2.5">
              <span className="flex items-center gap-1.5 text-caption font-mono text-carbon-ink2">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: energyFillVar(trip.fuelType) }}
                />
                Énergie · {fmtEur.format(trip.totalCost - trip.tollsCost)}
              </span>
              <span className="flex items-center gap-1.5 text-caption font-mono text-carbon-ink2">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: 'var(--c-toll)' }}
                />
                Péage · {fmtEur.format(trip.tollsCost)}
              </span>
            </div>
          </div>
        )}

        {/* ── Metrics grid ──────────────────────────────────── */}
        <Hairline className="my-4" />
        <div className="grid grid-cols-3 divide-x divide-carbon-hairline">
          {[
            {
              label: 'Distance',
              value: `${trip.distanceKm.toFixed(1)} km`,
            },
            {
              label: 'Durée',
              value: trip.durationSeconds > 0 ? formatDuration(trip.durationSeconds) : '—',
            },
            {
              label: 'Énergie',
              value: `${trip.totalConsumption.toFixed(isElectric ? 1 : 2)} ${trip.energyUnit}`,
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-1 px-2 gap-0.5">
              <span className="text-caption font-bold tracking-eye uppercase text-carbon-muted">
                {label}
              </span>
              <span className="text-sm font-bold font-mono text-carbon-ink tabular-nums">
                {value}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Vehicle + fuel ────────────────────────────────────── */}
      <SectionCard
        title={
          <span className="flex items-center gap-1.5">
            <Eyebrow>Véhicule</Eyebrow>
          </span>
        }
        padding="md"
      >
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <FuelBadge fuelType={trip.fuelType} />
            <span className="text-sm text-carbon-ink2">
              {trip.pricePerUnit.toFixed(4)} € / {trip.energyUnit}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-carbon-muted">€/km</span>
            <span className="text-sm font-mono font-bold text-carbon-ink tabular-nums">
              {trip.distanceKm > 0
                ? (trip.totalCost / trip.distanceKm).toFixed(3)
                : '—'}{' '}
              €
            </span>
          </div>
        </div>
      </SectionCard>

      {/* ── Note ─────────────────────────────────────────────── */}
      <SectionCard
        title={
          <span className="flex items-center gap-1.5">
            <Eyebrow>Note personnelle</Eyebrow>
            {noteSaving && (
              <span className="text-caption text-carbon-muted">Enregistrement…</span>
            )}
          </span>
        }
        padding="md"
      >
        <textarea
          className="w-full mt-2 min-h-[80px] bg-transparent text-sm text-carbon-ink placeholder:text-carbon-muted outline-none resize-none leading-relaxed"
          placeholder="Ajouter une note..."
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
        />
      </SectionCard>

      {/* ── Actions ───────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <CTAButton
          variant="ghost"
          size="sm"
          icon={<RotateCcw size={13} />}
          onClick={handleRedo}
        >
          Refaire
        </CTAButton>
        <CTAButton
          variant="ghost"
          size="sm"
          icon={trip.isArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
          onClick={handleArchiveToggle}
          loading={isArchiving}
        >
          {trip.isArchived ? 'Désarchiver' : 'Archiver'}
        </CTAButton>
        <CTAButton
          variant="danger"
          size="sm"
          icon={<Trash2 size={13} />}
          onClick={() => setShowDeleteModal(true)}
        >
          Supprimer
        </CTAButton>
      </div>

      <Hairline />

      {/* ── Delete confirmation modal ─────────────────────────── */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmer la suppression"
        footer={
          <>
            <CTAButton variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Annuler
            </CTAButton>
            <CTAButton variant="danger" onClick={handleDelete} loading={isDeleting}>
              Supprimer
            </CTAButton>
          </>
        }
      >
        <p className="text-sm text-carbon-ink2">Supprimer ce trajet définitivement ?</p>
      </Modal>
    </div>
  );
}
