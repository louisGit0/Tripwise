'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ChevronRight, History } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { FuelBadge } from '@/components/ui/FuelBadge';
import { Hairline } from '@/components/ui/Hairline';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type { TripHistoryPage, TripStats, SavedTrip } from '@/types/api';

type FuelFilter = 'all' | 'ev' | 'gas' | 'diesel' | 'gpl';

const LIMIT = 50;

function groupByMonth(items: SavedTrip[]): { monthKey: string; trips: SavedTrip[] }[] {
  const map = new Map<string, SavedTrip[]>();
  for (const trip of items) {
    const key = trip.tripDate.slice(0, 7); // "YYYY-MM"
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(trip);
  }
  return Array.from(map.entries()).map(([monthKey, trips]) => ({ monthKey, trips }));
}

function formatMonthHeader(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
  return `${m} min`;
}

export default function TripsPage() {
  const t = useTranslations('trips.history');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { showToast } = useToast();

  const [filter, setFilter] = useState<FuelFilter>('all');
  const [page, setPage] = useState(1);
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [stats, setStats] = useState<TripStats | null>(null);

  const fmtEur = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });
  const fmtNum = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  // Load global stats once
  useEffect(() => {
    apiClient
      .get<TripStats>('/trips/stats')
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, []);

  // Reload list when filter changes
  const loadTrips = useCallback(
    (filterKey: FuelFilter) => {
      setIsLoading(true);
      setPage(1);
      setTrips([]);
      const params: Record<string, unknown> = { page: 1, limit: LIMIT };
      if (filterKey !== 'all') params.fuelCategory = filterKey;
      apiClient
        .get<TripHistoryPage>('/trips/history', { params })
        .then(({ data }) => {
          setTrips(data.items);
          setTotalPages(data.totalPages);
          setTotalCount(data.total);
        })
        .catch(() => showToast('error', tCommon('error')))
        .finally(() => setIsLoading(false));
    },
    [showToast, tCommon],
  );

  useEffect(() => {
    loadTrips(filter);
  }, [filter, loadTrips]);

  async function loadMore() {
    const next = page + 1;
    setIsLoadingMore(true);
    const params: Record<string, unknown> = { page: next, limit: LIMIT };
    if (filter !== 'all') params.fuelCategory = filter;
    try {
      const { data } = await apiClient.get<TripHistoryPage>('/trips/history', { params });
      setTrips((prev) => [...prev, ...data.items]);
      setPage(next);
      setTotalPages(data.totalPages);
    } catch {
      showToast('error', tCommon('error'));
    } finally {
      setIsLoadingMore(false);
    }
  }

  const filters: { key: FuelFilter; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'ev', label: t('filterEV') },
    { key: 'gas', label: t('filterGas') },
    { key: 'diesel', label: t('filterDiesel') },
    { key: 'gpl', label: t('filterGpl') },
  ];

  const groups = groupByMonth(trips);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <Eyebrow className="mb-0.5">{t('eyebrow')}</Eyebrow>
        <h1 className="text-2xl font-bold font-display text-carbon-ink">{t('title')}</h1>
      </div>

      {/* ── Stats strip ───────────────────────────────────────── */}
      {stats && stats.tripCount > 0 && (
        <SectionCard padding="none">
          <div className="grid grid-cols-3 divide-x divide-carbon-hairline">
            {[
              { label: t('total'), value: fmtEur.format(stats.totalCost) },
              { label: t('km'), value: `${fmtNum.format(stats.totalDistance)} km` },
              {
                label: t('perKm'),
                value: stats.averageCostPerKm
                  ? `${stats.averageCostPerKm.toFixed(3)} €`
                  : '—',
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center py-3 px-2 gap-0.5">
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
      )}

      {/* ── Filter chips ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`shrink-0 px-3 py-1.5 rounded-chip text-xs font-semibold transition-colors ${
              filter === key
                ? 'bg-carbon-accent text-white'
                : 'bg-carbon-surface2 text-carbon-ink2 border border-carbon-hairline hover:border-carbon-accent hover:text-carbon-accent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Trip list ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-carbon-surface2 rounded-card" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-carbon-muted">
          <History size={40} strokeWidth={1} className="opacity-40" />
          <p className="text-sm text-center">
            {filter === 'all' ? t('empty') : t('emptyFilter')}
          </p>
          {filter === 'all' && (
            <CTAButton
              variant="ghost"
              size="sm"
              onClick={() => router.push('/app/dashboard')}
            >
              {tCommon('new')}
            </CTAButton>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ monthKey, trips: monthTrips }) => (
            <div key={monthKey}>
              {/* ── Month header ──────────────────────────────── */}
              <div className="flex items-baseline justify-between mb-2 px-1">
                <span className="text-xs font-semibold tracking-widest uppercase text-carbon-muted">
                  {formatMonthHeader(monthKey)}
                </span>
                <span className="text-[11px] font-mono text-carbon-muted">
                  {monthTrips.length}{' '}
                  {monthTrips.length > 1 ? t('tripsPlural') : t('trips')}
                </span>
              </div>

              {/* ── Trip rows for this month ───────────────────── */}
              <SectionCard padding="none">
                <div className="flex flex-col divide-y divide-carbon-hairline">
                  {monthTrips.map((trip) => (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => router.push(`/app/trips/${trip.id}`)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-carbon-surface2 transition-colors text-left w-full"
                    >
                      {/* Date */}
                      <span className="text-[11px] font-mono text-carbon-muted w-8 shrink-0 tabular-nums">
                        {formatDate(trip.tripDate)}
                      </span>

                      {/* Route info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-carbon-ink truncate leading-tight">
                          {trip.originLabel.split(',')[0]}
                          <span className="text-carbon-muted mx-1">→</span>
                          {trip.destinationLabel.split(',')[0]}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <FuelBadge fuelType={trip.fuelType} />
                          <span className="text-[11px] text-carbon-muted tabular-nums">
                            {trip.distanceKm.toFixed(0)} km
                          </span>
                          {trip.durationSeconds > 0 && (
                            <span className="text-[11px] text-carbon-muted">
                              · {formatDuration(trip.durationSeconds)}
                            </span>
                          )}
                          {trip.isArchived && (
                            <span className="text-[10px] text-carbon-muted border border-carbon-hairline rounded px-1 py-px">
                              {t('archived')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cost + arrow */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-sm font-bold font-mono text-carbon-ink tabular-nums">
                          {trip.totalCost.toFixed(2)} €
                        </span>
                        <ChevronRight size={13} className="text-carbon-muted" />
                      </div>
                    </button>
                  ))}
                </div>
              </SectionCard>
            </div>
          ))}

          {/* ── Load more ─────────────────────────────────────── */}
          {page < totalPages && (
            <div className="flex justify-center pt-2">
              <CTAButton
                variant="ghost"
                size="sm"
                onClick={loadMore}
                loading={isLoadingMore}
              >
                {t('loadMore')} ({totalCount - trips.length})
              </CTAButton>
            </div>
          )}
        </div>
      )}

      <Hairline />
      <p className="text-xs font-mono text-carbon-muted text-center pb-4">
        {totalCount > 0
          ? `${totalCount} ${totalCount > 1 ? t('tripsPlural') : t('trips')}`
          : '—'}
      </p>
    </div>
  );
}
