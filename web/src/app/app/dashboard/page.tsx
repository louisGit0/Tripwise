'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowRight, MapPin, Plus } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { KPICell } from '@/components/ui/KPICell';
import { FuelBadge } from '@/components/ui/FuelBadge';
import { BrandAvatar } from '@/components/ui/BrandAvatar';
import { Sparkline } from '@/components/ui/Sparkline';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type {
  UserVehicle,
  TripStats,
  SavedTrip,
  Favorite,
  FuelType,
} from '@/types/api';

// ── LocalStorage prices (mirrors fuel-prices page) ───────────────
interface UserPrices {
  gas: number;
  diesel: number;
  e85: number;
  gpl: number;
  evHome: number;
  evFast: number;
  fastShare: number;
}
const PRICES_KEY = 'verygoodtrip.userPrices';
const API_CACHE_KEY = 'verygoodtrip.apiPricesCache';
const PRICE_SOURCE_KEY = 'verygoodtrip.priceSource';
const FALLBACK_PRICES: UserPrices = {
  gas: 1.75,
  diesel: 1.68,
  e85: 0.88,
  gpl: 0.92,
  evHome: 0.2272,
  evFast: 0.45,
  fastShare: 0.3,
};

function readUserPrices(): UserPrices {
  if (typeof window === 'undefined') return FALLBACK_PRICES;
  try {
    const source = localStorage.getItem(PRICE_SOURCE_KEY) ?? 'api';
    // 'api' → prix officiels mis en cache, 'custom' → prix personnalisés
    const key = source === 'custom' ? PRICES_KEY : API_CACHE_KEY;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as UserPrices;
    // Fallback : essayer l'autre clé
    const fallbackRaw = localStorage.getItem(PRICES_KEY);
    return fallbackRaw ? (JSON.parse(fallbackRaw) as UserPrices) : FALLBACK_PRICES;
  } catch {
    return FALLBACK_PRICES;
  }
}

function fuelPrice(fuelType: FuelType, p: UserPrices): number {
  switch (fuelType) {
    case 'DIESEL':
      return p.diesel;
    case 'E85':
      return p.e85;
    case 'GPL':
      return p.gpl;
    default:
      return p.gas;
  }
}

// ── Formatters ────────────────────────────────────────────────────
const fmtEur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});
const fmtNum = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const fmtDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });

// ── Inner component (needs useSearchParams) ───────────────────────
function DashboardInner() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Data state ──────────────────────────────────────────────────
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [stats, setStats] = useState<TripStats | null>(null);
  const [recentTrips, setRecentTrips] = useState<SavedTrip[]>([]);
  const [suggestions, setSuggestions] = useState<Favorite[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Vehicle selector ────────────────────────────────────────────
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // ── Quick calculator ─────────────────────────────────────────────
  const [quickCalcTab, setQuickCalcTab] = useState<'distance' | 'budget'>('distance');
  const [quickInput, setQuickInput] = useState('');
  const [quickResult, setQuickResult] = useState<string | null>(null);

  // ── Load data on mount ──────────────────────────────────────────
  const loadData = useCallback(() => {
    setVehiclesLoading(true);
    apiClient
      .get<UserVehicle[]>('/vehicles/me')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setVehicles(list);
        const urlVehicleId = searchParams.get('vehicleId');
        if (urlVehicleId && list.some((v) => v.id === urlVehicleId)) {
          setSelectedVehicleId(urlVehicleId);
        } else if (list.length > 0) {
          setSelectedVehicleId(list[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setVehiclesLoading(false));

    setStatsLoading(true);
    Promise.allSettled([
      apiClient.get<TripStats>('/trips/stats'),
      apiClient.get<{ items: SavedTrip[] }>('/trips/history', { params: { limit: 8 } }),
      apiClient.get<Favorite[]>('/favorites'),
    ]).then(([statsRes, tripsRes, favRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (tripsRes.status === 'fulfilled') {
        const raw = tripsRes.value.data;
        const items = (raw as unknown as { items?: SavedTrip[] }).items ?? (raw as unknown as SavedTrip[]);
        setRecentTrips(Array.isArray(items) ? items.slice(0, 8) : []);
      }
      if (favRes.status === 'fulfilled') {
        setSuggestions(favRes.value.data.slice(0, 5));
      }
      setStatsLoading(false);
    });
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const sparkData = stats?.dailyExpenses?.map((d) => d.cost) ?? [];

  // ── Apply suggestion (simplified) ───────────────────────────────
  function applySuggestion(fav: Favorite) {
    if (fav.vehicleId && vehicles.some((v) => v.id === fav.vehicleId)) {
      setSelectedVehicleId(fav.vehicleId);
    }
    showToast('info', `${fav.name} sélectionné`);
  }

  // ── Quick calculator ─────────────────────────────────────────────
  function handleQuickCalc() {
    if (!selectedVehicleId || !selectedVehicle) {
      showToast('info', 'Sélectionnez un véhicule');
      return;
    }
    const inputNum = parseFloat(quickInput);
    if (isNaN(inputNum) || inputNum <= 0) {
      showToast('info', 'Valeur invalide');
      return;
    }

    const prices = readUserPrices();
    const { consumption, fuelType } = selectedVehicle.vehicleModel;
    const isElectricVehicle = fuelType === 'ELECTRIC';

    if (quickCalcTab === 'distance') {
      // km → cost
      const totalEnergy = (inputNum / 100) * consumption;
      let cost: number;
      if (isElectricVehicle) {
        const pricePerKwh =
          prices.evHome * (1 - prices.fastShare) + prices.evFast * prices.fastShare;
        cost = totalEnergy * pricePerKwh;
      } else {
        const pricePerLitre = fuelPrice(fuelType, prices);
        cost = totalEnergy * pricePerLitre;
      }
      setQuickResult(`${cost.toFixed(2)} €`);
    } else {
      // budget € → km
      let pricePerUnit: number;
      if (isElectricVehicle) {
        pricePerUnit = prices.evHome * (1 - prices.fastShare) + prices.evFast * prices.fastShare;
      } else {
        pricePerUnit = fuelPrice(fuelType, prices);
      }
      const km =
        pricePerUnit > 0
          ? (inputNum / ((pricePerUnit * consumption) / 100))
          : 0;
      setQuickResult(`${Math.round(km)} km`);
    }
  }

  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: v.nickname ?? `${v.vehicleModel.brand} ${v.vehicleModel.model}`,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* ── KPI grid ─────────────────────────────────────────────── */}
      <SectionCard title={<Eyebrow>Ce mois</Eyebrow>} padding="md">
        <div className="grid grid-cols-2 gap-4 pt-3">
          <KPICell
            label="Dépenses du mois"
            value={statsLoading ? '—' : fmtEur.format(stats?.totalCost ?? 0)}
            size="sm"
          />
          <KPICell
            label="Trajets"
            value={statsLoading ? '—' : fmtNum.format(stats?.tripCount ?? 0)}
            size="sm"
          />
          <KPICell
            label="Distance totale"
            value={statsLoading ? '—' : fmtNum.format(stats?.totalDistance ?? 0)}
            unit="km"
            size="sm"
          />
          <KPICell
            label="Économies vs essence"
            value={
              statsLoading
                ? '—'
                : stats?.savedVsGas !== null
                  ? fmtEur.format(stats?.savedVsGas?.amount ?? 0)
                  : <span className="text-xs text-carbon-muted font-normal">Uniquement pour VE</span>
            }
            delta={
              !statsLoading && (stats?.savedVsGas?.percent ?? 0) !== 0
                ? stats?.savedVsGas?.percent
                : undefined
            }
            size="sm"
          />
        </div>
      </SectionCard>

      {/* ── Sparkline + active vehicle ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Dépenses 30j" padding="md">
          <div className="pt-3 h-16">
            {sparkData.length > 0 ? (
              <Sparkline
                data={sparkData}
                color="var(--c-accent)"
                width={300}
                height={64}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-xs text-carbon-muted">Aucune donnée</span>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Véhicule actif" padding="md">
          {vehiclesLoading ? (
            <p className="text-sm text-carbon-muted pt-3">Chargement...</p>
          ) : vehicles.length === 0 ? (
            <div className="pt-3 flex flex-col gap-2">
              <p className="text-sm text-carbon-muted">Aucun véhicule</p>
              <Link
                href="/app/garage/add"
                className="text-xs text-carbon-accent font-medium hover:underline"
              >
                Ajouter un véhicule
              </Link>
            </div>
          ) : selectedVehicle ? (
            <div className="pt-3 flex items-center gap-3">
              <BrandAvatar brand={selectedVehicle.vehicleModel.brand} size={36} />
              <div className="min-w-0">
                <p className="font-semibold text-carbon-ink text-sm truncate">
                  {selectedVehicle.nickname ??
                    `${selectedVehicle.vehicleModel.brand} ${selectedVehicle.vehicleModel.model}`}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <FuelBadge fuelType={selectedVehicle.vehicleModel.fuelType} />
                </div>
              </div>
            </div>
          ) : null}
        </SectionCard>
      </div>

      {/* ── Onboarding banner — shown only when no vehicles yet ─────── */}
      {!statsLoading && vehicles.length === 0 && (
        <SectionCard padding="md">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm font-semibold text-carbon-ink">Bienvenue sur Tripwise</p>
            <p className="text-sm text-carbon-muted max-w-xs">
              Ajoutez votre premier véhicule pour calculer le coût de vos trajets.
            </p>
            <Link href="/app/garage/add">
              <CTAButton variant="accent" size="sm" icon={<Plus size={13} />}>
                Ajouter un véhicule
              </CTAButton>
            </Link>
          </div>
        </SectionCard>
      )}

      {/* ── Quick calculator ─────────────────────────────────────── */}
      <SectionCard title={<Eyebrow>Calcul rapide</Eyebrow>} padding="md">
        <div className="flex flex-col gap-4 pt-3">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-carbon-surface2 rounded-xl border border-carbon-hairline">
            {(['distance', 'budget'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setQuickCalcTab(tab);
                  setQuickResult(null);
                  setQuickInput('');
                }}
                className={[
                  'flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all',
                  quickCalcTab === tab
                    ? 'bg-carbon-surface text-carbon-ink shadow-sm border border-carbon-hairline'
                    : 'text-carbon-muted hover:text-carbon-ink',
                ].join(' ')}
              >
                {tab === 'distance' ? 'Distance → Coût' : 'Budget → Distance'}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              step={quickCalcTab === 'distance' ? 10 : 0.01}
              value={quickInput}
              onChange={(e) => {
                setQuickInput(e.target.value);
                setQuickResult(null);
              }}
              placeholder={
                quickCalcTab === 'distance' ? 'Distance en km...' : 'Budget en €...'
              }
              className="flex-1 h-10 px-3 rounded-xl border border-carbon-hairline bg-carbon-surface2 text-sm text-carbon-ink outline-none focus:border-carbon-accent font-mono"
            />
            <span className="text-xs font-mono text-carbon-muted shrink-0">
              {quickCalcTab === 'distance' ? 'km' : '€'}
            </span>
          </div>

          {/* Quick chips for distance mode */}
          {quickCalcTab === 'distance' && (
            <div className="flex gap-2 flex-wrap">
              {[50, 100, 200, 500].map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => {
                    setQuickInput(String(km));
                    setQuickResult(null);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-carbon-hairline text-carbon-muted hover:text-carbon-ink hover:bg-carbon-surface2 transition-colors font-mono"
                >
                  {km} km
                </button>
              ))}
            </div>
          )}

          {/* Vehicle selector */}
          {vehiclesLoading ? (
            <p className="text-sm text-carbon-muted">Chargement des véhicules...</p>
          ) : vehicles.length === 0 ? (
            <p className="text-sm text-amber-400">Aucun véhicule. Ajoutez-en un dans le Garage.</p>
          ) : (
            <Select
              label="Véhicule"
              options={vehicleOptions}
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              placeholder="Sélectionner un véhicule"
            />
          )}

          {/* Result */}
          {quickResult && (
            <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <span className="text-xs font-semibold text-carbon-muted uppercase tracking-wider">
                {quickCalcTab === 'distance' ? 'Coût estimé' : 'Distance estimée'}
              </span>
              <span className="text-2xl font-bold font-mono text-carbon-ink tabular-nums">
                {quickResult}
              </span>
            </div>
          )}

          {/* Calculate button */}
          <CTAButton
            variant="accent"
            size="lg"
            className="w-full"
            onClick={handleQuickCalc}
            disabled={vehiclesLoading || vehicles.length === 0 || !quickInput}
          >
            Calculer
          </CTAButton>
        </div>
      </SectionCard>

      {/* ── Favorite suggestions ─────────────────────────────────── */}
      {suggestions.length > 0 && (
        <SectionCard
          title={<Eyebrow>Favoris rapides</Eyebrow>}
          action={
            <Link href="/app/favorites" className="text-[11px] text-carbon-accent hover:underline">
              Tout voir
            </Link>
          }
          padding="none"
        >
          <div className="flex flex-col divide-y divide-carbon-hairline">
            {suggestions.map((fav) => (
              <button
                key={fav.id}
                type="button"
                onClick={() => applySuggestion(fav)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-carbon-surface2 transition-colors text-left w-full"
              >
                <MapPin size={13} className="text-carbon-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-carbon-ink truncate">
                    {fav.name}
                  </p>
                  <p className="text-[11px] text-carbon-muted truncate">
                    {fav.originLabel.split(',')[0]}
                    <span className="mx-1">→</span>
                    {fav.destinationLabel.split(',')[0]}
                  </p>
                </div>
                <span className="text-[11px] text-carbon-accent font-medium shrink-0">
                  Sélectionner
                </span>
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Recent trips table ───────────────────────────────────── */}
      {recentTrips.length > 0 && (
        <SectionCard
          title={<Eyebrow>Trajets récents</Eyebrow>}
          action={
            <Link href="/app/trips" className="text-[11px] text-carbon-accent hover:underline">
              Tout voir
            </Link>
          }
          padding="none"
        >
          <div className="flex flex-col divide-y divide-carbon-hairline">
            {recentTrips.map((trip) => (
              <button
                key={trip.id}
                type="button"
                onClick={() => router.push(`/app/trips/${trip.id}`)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-carbon-surface2 transition-colors text-left w-full"
              >
                <span className="text-[11px] text-carbon-muted font-mono w-10 shrink-0 tabular-nums">
                  {fmtDate.format(new Date(trip.tripDate))}
                </span>
                <div className="flex items-center gap-1 flex-1 min-w-0 text-xs text-carbon-ink2">
                  <span className="truncate max-w-[80px]">
                    {trip.originLabel.split(',')[0]}
                  </span>
                  <ArrowRight size={9} className="shrink-0 text-carbon-muted" />
                  <span className="truncate max-w-[80px]">
                    {trip.destinationLabel.split(',')[0]}
                  </span>
                </div>
                <FuelBadge fuelType={trip.fuelType} />
                <span className="text-xs font-bold text-carbon-ink font-mono tabular-nums w-14 text-right shrink-0">
                  {trip.totalCost.toFixed(2)} €
                </span>
              </button>
            ))}
          </div>
        </SectionCard>
      )}
      <Hairline />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}
