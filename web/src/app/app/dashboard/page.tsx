'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Navigation, Star, Share2, AlertCircle, MapPin } from 'lucide-react';
import { Suspense } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import AutocompleteInput from '@/components/AutocompleteInput';
import { useToast } from '@/providers/ToastProvider';
import api from '@/lib/api';
import type { GeoPoint, UserVehicle, TripResult, ElectricCost, FuelCost } from '@/types/api';

// Load Mapbox only client-side
const MapboxMap = dynamic(() => import('@/components/MapboxMap'), { ssr: false });

// ── Helpers ────────────────────────────────────────────────────────────────────

const FUEL_LABELS: Record<string, string> = {
  SP95: 'SP95', SP95_E10: 'SP95-E10', SP98: 'SP98',
  DIESEL: 'Diesel', E85: 'E85', GPL: 'GPL', ELECTRIC: 'Électrique',
};

function vehicleLabel(v: UserVehicle): string {
  return v.nickname ?? `${v.vehicleModel.brand} ${v.vehicleModel.model}`;
}

// ── Inner component (reads useSearchParams) ───────────────────────────────────

function DashboardInner() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Pre-fill from favorites deep-link
  const preOrigin = searchParams.get('originLabel')
    ? {
        label: searchParams.get('originLabel')!,
        lat: parseFloat(searchParams.get('originLat')!),
        lng: parseFloat(searchParams.get('originLng')!),
      }
    : null;
  const preDestination = searchParams.get('destinationLabel')
    ? {
        label: searchParams.get('destinationLabel')!,
        lat: parseFloat(searchParams.get('destinationLat')!),
        lng: parseFloat(searchParams.get('destinationLng')!),
      }
    : null;
  const preVehicleId = searchParams.get('vehicleId');

  const [origin, setOrigin] = useState<GeoPoint | null>(preOrigin);
  const [destination, setDestination] = useState<GeoPoint | null>(preDestination);
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string>(preVehicleId ?? '');
  const [chargingMode, setChargingMode] = useState<'home' | 'public' | 'mix'>('home');
  const [chargingRatio, setChargingRatio] = useState(50);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<TripResult | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [favName, setFavName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<UserVehicle[]>('/vehicles/me').then((res) => {
      setVehicles(res.data);
      if (!vehicleId && res.data.length > 0) setVehicleId(res.data[0].id);
    }).catch(() => {/* ignore */});
  }, [vehicleId]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;
  const isElectric = selectedVehicle?.vehicleModel.fuelType === 'ELECTRIC';

  const handleCalculate = async () => {
    if (!origin || !destination || !vehicleId) return;
    setCalculating(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = {
        origin: { lat: origin.lat, lng: origin.lng, label: origin.label },
        destination: { lat: destination.lat, lng: destination.lng, label: destination.label },
        userVehicleId: vehicleId,
      };
      if (isElectric) {
        body.chargingMode = chargingMode;
        if (chargingMode === 'mix') body.chargingMixRatio = chargingRatio / 100;
      }
      const res = await api.post<TripResult>('/trips/calculate', body);
      setResult(res.data);
      setFavName(`${origin.label.split(',')[0]} → ${destination.label.split(',')[0]}`);
    } catch {
      toast(tc('error'), 'error');
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveFavorite = async () => {
    if (!origin || !destination || !favName) return;
    setSaving(true);
    try {
      await api.post('/favorites', {
        name: favName,
        originLabel: origin.label,
        originLat: origin.lat,
        originLng: origin.lng,
        destinationLabel: destination.label,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
        ...(vehicleId ? { vehicleId } : {}),
      });
      toast(t('saveSuccess'), 'success');
      setSaveOpen(false);
    } catch {
      toast(tc('error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!result || !origin || !destination) return;
    const cost = result.cost;
    const shareText = t('shareText', {
      origin: origin.label.split(',')[0],
      destination: destination.label.split(',')[0],
      distance: result.distance.km.toFixed(0),
      duration: result.duration.formatted,
      cost: cost ? cost.totalCost.toFixed(2) : '—',
    });
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Tripwise', text: shareText });
      } catch {/* user cancelled */}
    } else {
      await navigator.clipboard.writeText(shareText);
      toast(t('copied'), 'success');
    }
  };

  const canCalculate = !!origin && !!destination && !!vehicleId;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>

      {/* Form */}
      <Card>
        <div className="flex flex-col gap-4">
          <AutocompleteInput
            label={t('origin')}
            placeholder={t('originPlaceholder')}
            value={origin}
            onChange={setOrigin}
            icon={<MapPin className="h-4 w-4 text-primary-500" />}
          />
          <AutocompleteInput
            label={t('destination')}
            placeholder={t('destinationPlaceholder')}
            value={destination}
            onChange={setDestination}
            icon={<Navigation className="h-4 w-4 text-red-500" />}
          />

          {/* Vehicle selector */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('vehicle')}</label>
            {vehicles.length === 0 ? (
              <p className="text-sm text-slate-500">
                {t('noVehicle')}
                <Link href="/app/vehicles" className="text-primary-600 hover:underline">{t('addVehicle')}</Link>
              </p>
            ) : (
              <select
                value={vehicleId}
                onChange={(e) => { setVehicleId(e.target.value); setResult(null); }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>
                ))}
              </select>
            )}
          </div>

          {/* Charging mode (electric only) */}
          {isElectric && (
            <div className="flex flex-col gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('chargingMode')}</label>
              <div className="flex gap-2">
                {(['home', 'public', 'mix'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setChargingMode(mode)}
                    className={[
                      'flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors',
                      chargingMode === mode
                        ? 'border-primary-500 bg-primary-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700',
                    ].join(' ')}
                  >
                    {t(mode === 'home' ? 'chargingHome' : mode === 'public' ? 'chargingPublic' : 'chargingMix')}
                  </button>
                ))}
              </div>
              {chargingMode === 'mix' && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{t('chargingRatio')}</span>
                    <span>{chargingRatio}% {t('chargingHome')} / {100 - chargingRatio}% {t('chargingPublic')}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={chargingRatio}
                    onChange={(e) => setChargingRatio(parseInt(e.target.value))}
                    className="w-full accent-primary-600"
                  />
                </div>
              )}
            </div>
          )}

          <Button fullWidth disabled={!canCalculate} loading={calculating} onClick={handleCalculate}>
            {calculating ? t('calculating') : t('calculate')}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-4">
          {/* Map */}
          <MapboxMap
            geometry={result.geometry}
            chargingStations={
              result.cost?.type === 'electric' ? (result.cost as ElectricCost).nearbyStations : []
            }
          />

          {/* Result card */}
          <Card>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">{t('resultTitle')}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <ResultStat label={t('distance')} value={`${result.distance.km.toFixed(0)} km`} />
              <ResultStat label={t('duration')} value={result.duration.formatted} />
              {result.cost?.type === 'fuel' && (() => {
                const c = result.cost as FuelCost;
                return (
                  <>
                    <ResultStat label={t('consumption')} value={`${c.consumptionLitres.toFixed(1)} L`} />
                    <ResultStat label={t('priceUnit')} value={`${c.pricePerLitre.toFixed(3)} €/L`} />
                    <ResultStat label={t('totalCost')} value={`${c.totalCost.toFixed(2)} €`} highlight />
                  </>
                );
              })()}
              {result.cost?.type === 'electric' && (() => {
                const c = result.cost as ElectricCost;
                return (
                  <>
                    <ResultStat label={t('consumption')} value={`${c.consumptionKwh.toFixed(1)} kWh`} />
                    <ResultStat label={t('priceUnit')} value={`${c.pricePerKwh.toFixed(4)} €/kWh`} />
                    <ResultStat label={t('totalCost')} value={`${c.totalCost.toFixed(2)} €`} highlight />
                  </>
                );
              })()}
            </div>

            {/* Electric disclaimer */}
            {result.cost?.type === 'electric' && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {(result.cost as ElectricCost).disclaimer}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSaveOpen(true)}>
                <Star className="h-4 w-4" />
                {t('saveToFavorites')}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                {t('share')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Save favorite modal */}
      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title={t('saveToFavorites')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setSaveOpen(false)}>{tc('cancel')}</Button>
            <Button size="sm" loading={saving} onClick={handleSaveFavorite} disabled={!favName}>{tc('save')}</Button>
          </>
        }
      >
        <Input
          label={t('favoriteNameLabel')}
          placeholder={t('favoriteNamePlaceholder')}
          value={favName}
          onChange={(e) => setFavName(e.target.value)}
        />
      </Modal>
    </div>
  );
}

function ResultStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-primary-600 dark:text-primary-400 text-base' : 'text-slate-900 dark:text-white'}`}>
        {value}
      </span>
    </div>
  );
}

// Wrap in Suspense because useSearchParams requires it in Next.js App Router
export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}
