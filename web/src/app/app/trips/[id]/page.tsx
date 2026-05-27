'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, Trash2, RotateCcw, ChevronLeft } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { FuelBadge } from '@/components/ui/FuelBadge';
import { Hairline } from '@/components/ui/Hairline';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/providers/ToastProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/lib/api';
import type { SavedTrip } from '@/types/api';

type Props = {
  params: Promise<{ id: string }>;
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
  return `${m} min`;
}

export default function TripDetailPage({ params }: Props) {
  const { id } = use(params);
  const t = useTranslations('trips.detail');
  const tCommon = useTranslations('common');
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
          showToast('error', tCommon('error'));
        }
      })
      .finally(() => setIsLoading(false));
  }, [id, showToast, tCommon]);

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
      .catch(() => showToast('error', tCommon('error')))
      .finally(() => setNoteSaving(false));
  }, [debouncedNote, id, showToast, tCommon]);

  async function handleArchiveToggle() {
    if (!trip) return;
    const newValue = !trip.isArchived;
    setIsArchiving(true);
    try {
      await apiClient.patch(`/trips/${id}`, { isArchived: newValue });
      setTrip((prev) => (prev ? { ...prev, isArchived: newValue } : prev));
    } catch {
      showToast('error', tCommon('error'));
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
      showToast('error', tCommon('error'));
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

  // ── Loading skeleton ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-6 w-24 bg-carbon-surface2 rounded" />
        <div className="h-32 bg-carbon-surface2 rounded-card" />
        <div className="h-24 bg-carbon-surface2 rounded-card" />
        <div className="h-32 bg-carbon-surface2 rounded-card" />
      </div>
    );
  }

  // ── 404 state ────────────────────────────────────────────────
  if (notFound || !trip) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-carbon-muted">
        <p className="font-mono text-xs tracking-widest uppercase">{"// 404"}</p>
        <p className="text-base font-semibold text-carbon-ink">{t('notFound')}</p>
        <p className="text-sm text-center max-w-xs">{t('notFoundDesc')}</p>
        <CTAButton variant="ghost" size="sm" onClick={() => router.push('/app/trips')}>
          {tCommon('back')}
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
          className="flex items-center gap-1 text-xs text-carbon-muted hover:text-carbon-accent transition-colors mb-3"
        >
          <ChevronLeft size={13} />
          {tCommon('back')}
        </button>
        <Eyebrow className="mb-0.5">
          {isElectric ? t('eyebrowElectric') : t('eyebrowFuel')}
        </Eyebrow>
        <div className="flex items-center gap-2 mt-1">
          <h1 className="text-base font-semibold text-carbon-ink truncate max-w-xs">
            {trip.originLabel.split(',')[0]}
            <span className="text-carbon-muted mx-1.5">→</span>
            {trip.destinationLabel.split(',')[0]}
          </h1>
          {trip.isArchived && (
            <span className="text-[10px] text-carbon-muted border border-carbon-hairline rounded px-1.5 py-px shrink-0">
              {t('archivedBadge')}
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
      <SectionCard padding="md">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-carbon-muted mb-1">
          {t('cost')}
        </p>
        <p className="text-[56px] font-bold font-display text-carbon-ink leading-none tabular-nums">
          {trip.totalCost.toFixed(2)}
          <span className="text-2xl font-medium text-carbon-muted ml-1">€</span>
        </p>
        {trip.passengersCount > 1 && (
          <p className="text-xs text-carbon-muted mt-1 font-mono">
            {(trip.totalCost / trip.passengersCount).toFixed(2)} € / pers. ·{' '}
            {trip.passengersCount} passagers
          </p>
        )}

        {/* ── Metrics grid ──────────────────────────────────── */}
        <Hairline className="my-4" />
        <div className="grid grid-cols-3 divide-x divide-carbon-hairline">
          {[
            {
              label: t('distance'),
              value: `${trip.distanceKm.toFixed(1)} km`,
            },
            {
              label: t('duration'),
              value: trip.durationSeconds > 0 ? formatDuration(trip.durationSeconds) : '—',
            },
            {
              label: t('energy'),
              value: `${trip.totalConsumption.toFixed(isElectric ? 1 : 2)} ${trip.energyUnit}`,
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-1 px-2 gap-0.5">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-carbon-muted">
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
            <Eyebrow>{t('vehicle')}</Eyebrow>
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
            <span className="text-xs text-carbon-muted">{t('perKm')}</span>
            <span className="text-sm font-mono font-bold text-carbon-ink tabular-nums">
              {trip.distanceKm > 0
                ? (trip.totalCost / trip.distanceKm).toFixed(3)
                : '—'}{' '}
              €
            </span>
          </div>
        </div>
        {trip.tollsCost > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-carbon-hairline">
            <span className="text-xs text-carbon-muted uppercase tracking-widest font-semibold">
              Péages
            </span>
            <span className="text-sm font-mono font-bold text-carbon-ink tabular-nums">
              {fmtEur.format(trip.tollsCost)}
            </span>
          </div>
        )}
      </SectionCard>

      {/* ── Note ─────────────────────────────────────────────── */}
      <SectionCard
        title={
          <span className="flex items-center gap-1.5">
            <Eyebrow>{t('note')}</Eyebrow>
            {noteSaving && (
              <span className="text-[10px] text-carbon-muted animate-pulse">…</span>
            )}
          </span>
        }
        padding="md"
      >
        <textarea
          className="w-full mt-2 min-h-[80px] bg-transparent text-sm text-carbon-ink placeholder:text-carbon-muted outline-none resize-none leading-relaxed"
          placeholder={t('notePlaceholder')}
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
          {t('redo')}
        </CTAButton>
        <CTAButton
          variant="ghost"
          size="sm"
          icon={trip.isArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
          onClick={handleArchiveToggle}
          loading={isArchiving}
        >
          {trip.isArchived ? t('unarchive') : t('archive')}
        </CTAButton>
        <CTAButton
          variant="danger"
          size="sm"
          icon={<Trash2 size={13} />}
          onClick={() => setShowDeleteModal(true)}
        >
          {tCommon('delete')}
        </CTAButton>
      </div>

      <Hairline />

      {/* ── Delete confirmation modal ─────────────────────────── */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={tCommon('confirm_delete')}
        footer={
          <>
            <CTAButton variant="ghost" onClick={() => setShowDeleteModal(false)}>
              {tCommon('cancel')}
            </CTAButton>
            <CTAButton variant="danger" onClick={handleDelete} loading={isDeleting}>
              {tCommon('delete')}
            </CTAButton>
          </>
        }
      >
        <p className="text-sm text-carbon-ink2">{t('deleteConfirm')}</p>
      </Modal>
    </div>
  );
}
