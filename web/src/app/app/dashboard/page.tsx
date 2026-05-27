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
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';
import { Select } from '@/components/ui/Select';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type {
  UserVehicle,
  TripResult,
  MultiCalcResult,
  GeoPoint,
  ChargingMode,
  FuelCostResult,
  ElectricCostResult,
  TripStats,
  SavedTrip,
  Favorite,
  PendingTripSession,
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
const PRICES_KEY = 'tripwise.userPrices';
const SESSION_KEY = 'tripwise.pendingTrip';
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
    const raw = localStorage.getItem(PRICES_KEY);
    return raw ? (JSON.parse(raw) as UserPrices) : FALLBACK_PRICES;
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

type CalcMode = 'address' | 'distance';

const DISTANCE_CHIPS = [50, 200, 465, 800];

// ── Formatters ────────────────────────────────────────────────────
const fmtEur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});
const fmtNum = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const fmtDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });

const CHARGING_OPTIONS: { value: ChargingMode; label: string }[] = [
  { value: 'home', label: 'Domicile' },
  { value: 'public', label: 'Borne publique' },
  { value: 'mix', label: 'Mix' },
];

const MODE_SEGMENTS: { value: CalcMode; label: string }[] = [
  { value: 'address', label: 'Adresses' },
  { value: 'distance', label: 'Distance' },
];

// ── Inner component (needs useSearchParams) ───────────────────────
function DashboardInner() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Data state ──────────────────────────────────────────────────
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [stats, setStats] = useState<TripStats | null>(null);
  const [recentTrips, setRecentTrips] = useState<SavedTrip[]>([]);
  const [suggestions, setSuggestions] = useState<Favorite[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Calculator mode ─────────────────────────────────────────────
  const [calcMode, setCalcMode] = useState<CalcMode>('address');
  const [distanceKm, setDistanceKm] = useState<number>(100);
  const [distanceInput, setDistanceInput] = useState('100');

  // ── Address mode state ──────────────────────────────────────────
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [destination, setDestination] = useState<GeoPoint | null>(null);
  const [originLabel, setOriginLabel] = useState('');
  const [destinationLabel, setDestinationLabel] = useState('');

  // ── Vehicle + EV ────────────────────────────────────────────────
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [chargingMode, setChargingMode] = useState<ChargingMode>('home');
  const [chargingMixRatio, setChargingMixRatio] = useState(0.5);
  const [isCalculating, setIsCalculating] = useState(false);

  // ── Prefill from URL params ─────────────────────────────────────
  useEffect(() => {
    const oLat = searchParams.get('originLat');
    const oLng = searchParams.get('originLng');
    const oLabel = searchParams.get('originLabel');
    if (oLat && oLng) {
      const pt = { lat: parseFloat(oLat), lng: parseFloat(oLng), label: oLabel ?? undefined };
      setOrigin(pt);
      setOriginLabel(oLabel ?? '');
    }
    const dLat = searchParams.get('destinationLat');
    const dLng = searchParams.get('destinationLng');
    const dLabel = searchParams.get('destinationLabel');
    if (dLat && dLng) {
      const pt = {
        lat: parseFloat(dLat),
        lng: parseFloat(dLng),
        label: dLabel ?? undefined,
      };
      setDestination(pt);
      setDestinationLabel(dLabel ?? '');
    }
  }, [searchParams]);

  // ── Load data on mount ──────────────────────────────────────────
  const loadData = useCallback(() => {
    apiClient
      .get<UserVehicle[]>('/vehicles/me')
      .then(({ data }) => {
        setVehicles(data);
        const urlVehicleId = searchParams.get('vehicleId');
        if (urlVehicleId && data.some((v) => v.id === urlVehicleId)) {
          setSelectedVehicleId(urlVehicleId);
        } else if (data.length > 0) {
          setSelectedVehicleId(data[0].id);
        }
      })
      .catch(() => {});

    setStatsLoading(true);
    Promise.allSettled([
      apiClient.get<TripStats>('/trips/stats'),
      apiClient.get<{ items: SavedTrip[] }>('/trips/history', { params: { limit: 8 } }),
      apiClient.get<Favorite[]>('/favorites'),
    ]).then(([statsRes, tripsRes, favRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (tripsRes.status === 'fulfilled') {
        const raw = tripsRes.value.data;
        // history returns TripHistoryPage with items array
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
  const isElectric = selectedVehicle?.vehicleModel.fuelType === 'ELECTRIC';
  const sparkData = stats?.dailyExpenses?.map((d) => d.cost) ?? [];

  // ── Apply suggestion ─────────────────────────────────────────────
  function applySuggestion(fav: Favorite) {
    setCalcMode('address');
    setOriginLabel(fav.originLabel);
    setDestinationLabel(fav.destinationLabel);
    setOrigin({ lat: fav.originLat, lng: fav.originLng, label: fav.originLabel });
    setDestination({
      lat: fav.destinationLat,
      lng: fav.destinationLng,
      label: fav.destinationLabel,
    });
    if (fav.vehicleId && vehicles.some((v) => v.id === fav.vehicleId)) {
      setSelectedVehicleId(fav.vehicleId);
    }
  }

  // ── Calculate (address mode) ────────────────────────────────────
  async function handleCalculateAddress() {
    if (!origin || !destination) {
      showToast('info', 'Veuillez renseigner le départ et l\'arrivée');
      return;
    }
    if (!selectedVehicleId) {
      showToast('info', 'Sélectionnez d\'abord un véhicule');
      return;
    }
    setIsCalculating(true);
    try {
      const [calcRes, multiRes] = await Promise.allSettled([
        apiClient.post<TripResult>('/trips/calculate', {
          origin,
          destination,
          userVehicleId: selectedVehicleId,
          ...(isElectric ? { chargingMode, chargingMixRatio } : {}),
        }),
        apiClient.post<MultiCalcResult>('/trips/calculate-multi', {
          origin,
          destination,
          userVehicleId: selectedVehicleId,
          ...(isElectric ? { chargingMode } : {}),
        }),
      ]);

      if (calcRes.status === 'rejected') throw new Error('Calculate failed');

      const result = calcRes.value.data;
      const multiResult = multiRes.status === 'fulfilled' ? multiRes.value.data : null;

      const session: PendingTripSession = {
        origin,
        destination,
        result,
        multiResult,
        selectedVehicleId,
        mode: 'address',
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      router.push('/app/trips/result');
    } catch {
      showToast('error', 'Une erreur est survenue');
    } finally {
      setIsCalculating(false);
    }
  }

  // ── Calculate (distance mode) ───────────────────────────────────
  function handleCalculateDistance() {
    if (!distanceKm || distanceKm <= 0) {
      showToast('info', 'Veuillez renseigner le départ et l\'arrivée');
      return;
    }
    if (!selectedVehicleId || !selectedVehicle) {
      showToast('info', 'Sélectionnez d\'abord un véhicule');
      return;
    }

    const prices = readUserPrices();
    const { consumption, fuelType } = selectedVehicle.vehicleModel;
    const totalEnergy = (distanceKm / 100) * consumption;

    let cost: FuelCostResult | ElectricCostResult;
    if (isElectric) {
      const pricePerKwh =
        prices.evHome * (1 - prices.fastShare) + prices.evFast * prices.fastShare;
      cost = {
        type: 'electric',
        consumptionKwh: totalEnergy,
        pricePerKwh,
        chargingMode: 'mix',
        totalCost: totalEnergy * pricePerKwh,
      } satisfies ElectricCostResult;
    } else {
      const pricePerLitre = fuelPrice(fuelType, prices);
      cost = {
        type: 'fuel',
        fuelType,
        consumptionLitres: totalEnergy,
        pricePerLitre,
        totalCost: totalEnergy * pricePerLitre,
      } satisfies FuelCostResult;
    }

    const syntheticResult: TripResult = {
      distance: { meters: distanceKm * 1000, km: distanceKm },
      duration: { seconds: 0, formatted: '' },
      geometry: { type: 'LineString', coordinates: [] },
      waypoints: [],
      vehicle: {
        id: selectedVehicle.id,
        nickname: selectedVehicle.nickname,
        brand: selectedVehicle.vehicleModel.brand,
        model: selectedVehicle.vehicleModel.model,
        fuelType,
        consumption,
      },
      cost,
    };

    const session: PendingTripSession = {
      origin: null,
      destination: null,
      distanceKm,
      result: syntheticResult,
      multiResult: null,
      selectedVehicleId,
      mode: 'distance',
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    router.push('/app/trips/result');
  }

  function handleCalculate() {
    if (calcMode === 'address') {
      void handleCalculateAddress();
    } else {
      handleCalculateDistance();
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
            value={statsLoading ? '—' : fmtEur.format(stats?.savedVsGas?.amount ?? 0)}
            delta={
              !statsLoading && (stats?.savedVsGas?.percent ?? 0) !== 0
                ? stats!.savedVsGas.percent
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
          {vehicles.length === 0 ? (
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

      {/* ── Trip calculator ──────────────────────────────────────── */}
      <SectionCard title={<Eyebrow>Nouveau trajet</Eyebrow>} padding="md">
        <div className="flex flex-col gap-4 pt-3">
          {/* Mode toggle */}
          <SegmentedControl
            segments={MODE_SEGMENTS}
            value={calcMode}
            onChange={setCalcMode}
            className="w-full"
          />

          {/* Address mode inputs */}
          {calcMode === 'address' && (
            <>
              <AutocompleteInput
                label="Départ"
                placeholder="Adresse de départ..."
                onSelect={(pt) => {
                  setOrigin(pt);
                  setOriginLabel(pt.label ?? '');
                }}
                defaultValue={originLabel}
              />
              <AutocompleteInput
                label="Arrivée"
                placeholder="Adresse d'arrivée..."
                onSelect={(pt) => {
                  setDestination(pt);
                  setDestinationLabel(pt.label ?? '');
                }}
                defaultValue={destinationLabel}
              />
            </>
          )}

          {/* Distance mode input */}
          {calcMode === 'distance' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-baseline gap-2">
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={distanceInput}
                    onChange={(e) => {
                      setDistanceInput(e.target.value);
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n > 0) setDistanceKm(n);
                    }}
                    onBlur={() => {
                      if (!distanceKm || distanceKm <= 0) {
                        setDistanceKm(100);
                        setDistanceInput('100');
                      }
                    }}
                    className="w-36 text-[56px] font-bold font-mono text-carbon-ink tabular-nums bg-transparent outline-none text-center leading-none"
                  />
                  <span className="text-xl text-carbon-muted font-mono">km</span>
                </div>
                <p className="text-xs text-carbon-muted">Distance en km</p>
              </div>
              {/* Quick chips */}
              <div className="flex items-center gap-2 justify-center flex-wrap">
                {DISTANCE_CHIPS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDistanceKm(d);
                      setDistanceInput(String(d));
                    }}
                    className={`px-3 py-1.5 rounded-chip text-xs font-semibold transition-colors ${
                      distanceKm === d
                        ? 'bg-carbon-accent text-white'
                        : 'bg-carbon-surface2 border border-carbon-hairline text-carbon-ink2 hover:border-carbon-accent hover:text-carbon-accent'
                    }`}
                  >
                    {d} km
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vehicle selector */}
          {vehicles.length === 0 ? (
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

          {/* EV charging options */}
          {isElectric && (
            <div className="flex flex-col gap-3 p-3 bg-carbon-surface2 rounded-xl border border-carbon-hairline">
              <Select
                label="Mode de charge"
                options={CHARGING_OPTIONS}
                value={chargingMode}
                onChange={(e) => setChargingMode(e.target.value as ChargingMode)}
              />
              {chargingMode === 'mix' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-carbon-ink2">
                    Part domicile : {Math.round(chargingMixRatio * 100)}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={chargingMixRatio}
                    onChange={(e) => setChargingMixRatio(parseFloat(e.target.value))}
                    className="w-full accent-carbon-accent"
                  />
                </div>
              )}
            </div>
          )}

          {/* Calculate button */}
          <CTAButton
            variant="accent"
            size="lg"
            className="w-full"
            onClick={handleCalculate}
            loading={isCalculating}
            disabled={vehicles.length === 0}
          >
            {isCalculating ? 'Calcul en cours...' : 'Calculer'}
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
                  Utiliser
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
