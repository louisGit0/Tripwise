'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Share2, BookmarkPlus, Zap, CircleAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type { UserVehicle, TripResult, GeoPoint, ChargingMode, FuelCostResult, ElectricCostResult } from '@/types/api';

const MapboxMap = dynamic(() => import('@/components/MapboxMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] text-sm">
      Chargement de la carte…
    </div>
  ),
});

function DashboardInner() {
  const t = useTranslations('trips');
  const tCommon = useTranslations('common');
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [destination, setDestination] = useState<GeoPoint | null>(null);
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [chargingMode, setChargingMode] = useState<ChargingMode>('home');
  const [chargingMixRatio, setChargingMixRatio] = useState(0.5);
  const [tripResult, setTripResult] = useState<TripResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Favorite modal
  const [showFavModal, setShowFavModal] = useState(false);
  const [favName, setFavName] = useState('');
  const [isSavingFav, setIsSavingFav] = useState(false);

  // Prefill from URL params (favorites deep-link)
  const defaultOriginLabel = searchParams.get('originLabel') ?? '';
  const defaultDestLabel = searchParams.get('destinationLabel') ?? '';

  useEffect(() => {
    const oLat = searchParams.get('originLat');
    const oLng = searchParams.get('originLng');
    const oLabel = searchParams.get('originLabel');
    if (oLat && oLng) {
      setOrigin({ lat: parseFloat(oLat), lng: parseFloat(oLng), label: oLabel ?? undefined });
    }

    const dLat = searchParams.get('destinationLat');
    const dLng = searchParams.get('destinationLng');
    const dLabel = searchParams.get('destinationLabel');
    if (dLat && dLng) {
      setDestination({ lat: parseFloat(dLat), lng: parseFloat(dLng), label: dLabel ?? undefined });
    }
  }, [searchParams]);

  useEffect(() => {
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
  }, [searchParams]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const isElectric = selectedVehicle?.vehicleModel.fuelType === 'ELECTRIC';

  async function handleCalculate() {
    if (!origin || !destination) {
      showToast('info', t('fillBothFields'));
      return;
    }
    if (!selectedVehicleId) {
      showToast('info', t('selectVehicleFirst'));
      return;
    }
    setIsCalculating(true);
    setTripResult(null);
    try {
      const { data } = await apiClient.post<TripResult>('/trips/calculate', {
        origin,
        destination,
        userVehicleId: selectedVehicleId,
        ...(isElectric ? { chargingMode, chargingMixRatio } : {}),
      });
      setTripResult(data);
    } catch {
      showToast('error', tCommon('error'));
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleSaveFavorite() {
    if (!origin || !destination || !favName.trim()) return;
    setIsSavingFav(true);
    try {
      await apiClient.post('/favorites', {
        name: favName.trim(),
        originLabel: origin.label ?? '',
        originLat: origin.lat,
        originLng: origin.lng,
        destinationLabel: destination.label ?? '',
        destinationLat: destination.lat,
        destinationLng: destination.lng,
        vehicleId: selectedVehicleId || undefined,
      });
      setShowFavModal(false);
      setFavName('');
      showToast('success', t('favoriteAdded'));
    } catch {
      showToast('error', tCommon('error'));
    } finally {
      setIsSavingFav(false);
    }
  }

  async function handleShare() {
    const cost = tripResult?.cost;
    const totalCost = cost ? `${cost.totalCost.toFixed(2)} €` : '';
    const text = `Tripwise — ${origin?.label ?? ''} → ${destination?.label ?? ''} : ${tripResult?.distance.km ?? ''} km${totalCost ? `, ${totalCost}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Tripwise', text });
      } else {
        await navigator.clipboard.writeText(text);
        showToast('success', tCommon('copied'));
      }
    } catch {
      // User cancelled share — no-op
    }
  }

  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: v.nickname ?? `${v.vehicleModel.brand} ${v.vehicleModel.model}`,
  }));

  const chargingOptions: { value: ChargingMode; label: string }[] = [
    { value: 'home', label: t('home') },
    { value: 'public', label: t('public') },
    { value: 'mix', label: t('mix') },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold sr-only">{t('resultTitle')}</h1>

      {/* Form */}
      <Card>
        <div className="flex flex-col gap-4">
          <AutocompleteInput
            label={t('origin')}
            placeholder={t('originPlaceholder')}
            onSelect={setOrigin}
            defaultValue={defaultOriginLabel}
          />
          <AutocompleteInput
            label={t('destination')}
            placeholder={t('destinationPlaceholder')}
            onSelect={setDestination}
            defaultValue={defaultDestLabel}
          />

          {vehicles.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">{t('noVehicle')}</p>
          ) : (
            <Select
              label={t('vehicle')}
              options={vehicleOptions}
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              placeholder={t('selectVehicle')}
            />
          )}

          {isElectric && (
            <div className="flex flex-col gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <Select
                label={t('chargingMode')}
                options={chargingOptions}
                value={chargingMode}
                onChange={(e) => setChargingMode(e.target.value as ChargingMode)}
              />
              {chargingMode === 'mix' && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    {t('mixRatio')} : {Math.round(chargingMixRatio * 100)}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={chargingMixRatio}
                    onChange={(e) => setChargingMixRatio(parseFloat(e.target.value))}
                    className="w-full accent-primary-600"
                  />
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleCalculate}
            loading={isCalculating}
            size="lg"
            className="w-full"
            disabled={vehicles.length === 0}
          >
            {isCalculating ? t('calculating') : t('calculate')}
          </Button>
        </div>
      </Card>

      {/* Result */}
      {tripResult && (
        <>
          {/* Map */}
          <MapboxMap
            geometry={tripResult.geometry}
            origin={origin!}
            destination={destination!}
            stations={
              tripResult.cost?.type === 'electric'
                ? (tripResult.cost as ElectricCostResult).nearbyStations
                : undefined
            }
          />

          {/* Summary */}
          <Card>
            <h2 className="font-semibold text-lg mb-4">{t('resultTitle')}</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wide">{t('distance')}</p>
                <p className="font-bold text-xl">{tripResult.distance.km} km</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wide">{t('duration')}</p>
                <p className="font-bold text-xl">{tripResult.duration.formatted}</p>
              </div>
              {tripResult.cost && (
                <>
                  <div>
                    <p className="text-xs text-[var(--muted)] uppercase tracking-wide">{t('consumption')}</p>
                    <p className="font-bold text-xl">
                      {tripResult.cost.type === 'fuel'
                        ? `${(tripResult.cost as FuelCostResult).consumptionLitres.toFixed(1)} ${t('liters')}`
                        : `${(tripResult.cost as ElectricCostResult).consumptionKwh.toFixed(1)} ${t('kwh')}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)] uppercase tracking-wide">{t('costPerUnit')}</p>
                    <p className="font-bold text-xl">
                      {tripResult.cost.type === 'fuel'
                        ? `${(tripResult.cost as FuelCostResult).pricePerLitre.toFixed(3)} €${t('perLiter')}`
                        : `${(tripResult.cost as ElectricCostResult).pricePerKwh.toFixed(4)} €${t('perKwh')}`}
                    </p>
                  </div>
                </>
              )}
            </div>

            {tripResult.cost && (
              <div className="border-t border-[var(--border)] pt-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">{t('totalCost')}</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {tripResult.cost.totalCost.toFixed(2)} €
                  </span>
                </div>
              </div>
            )}

            {/* Electric disclaimer */}
            {tripResult.cost?.type === 'electric' &&
              (tripResult.cost as ElectricCostResult).disclaimer && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300 mb-4">
                  <CircleAlert size={14} className="mt-0.5 shrink-0" />
                  <p>{(tripResult.cost as ElectricCostResult).disclaimer}</p>
                </div>
              )}

            {/* Nearby stations */}
            {tripResult.cost?.type === 'electric' &&
              (tripResult.cost as ElectricCostResult).nearbyStations &&
              (tripResult.cost as ElectricCostResult).nearbyStations!.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-[var(--muted)] mb-2 flex items-center gap-1">
                    <Zap size={12} />
                    {t('stations')} ({(tripResult.cost as ElectricCostResult).nearbyStations!.length})
                  </p>
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {(tripResult.cost as ElectricCostResult).nearbyStations!.slice(0, 5).map((s) => (
                      <div key={s.id} className="text-xs p-2 bg-[var(--background)] rounded flex items-center justify-between">
                        <span className="truncate mr-2">{s.name}</span>
                        <span className="text-[var(--muted)] shrink-0">
                          {s.powerKw ? `${s.powerKw} kW` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFavName(
                    `${origin?.label?.split(',')[0] ?? 'Départ'} → ${destination?.label?.split(',')[0] ?? 'Arrivée'}`,
                  );
                  setShowFavModal(true);
                }}
                className="flex-1"
              >
                <BookmarkPlus size={14} />
                {t('saveFavorite')}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleShare} className="flex-1">
                <Share2 size={14} />
                {t('shareResult')}
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Favorite Modal */}
      <Modal
        open={showFavModal}
        onClose={() => setShowFavModal(false)}
        title={t('saveFavorite')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowFavModal(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSaveFavorite} loading={isSavingFav} disabled={!favName.trim()}>
              {t('addFavorite')}
            </Button>
          </>
        }
      >
        <Input
          label={t('favoriteName')}
          placeholder={t('favoriteNamePlaceholder')}
          value={favName}
          onChange={(e) => setFavName(e.target.value)}
          autoFocus
        />
      </Modal>
    </div>
  );
}

// Wrap in Suspense because useSearchParams requires it
export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}
