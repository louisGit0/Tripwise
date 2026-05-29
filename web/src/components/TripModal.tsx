'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { Select } from '@/components/ui/Select';
import { CTAButton } from '@/components/ui/CTAButton';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type {
  UserVehicle,
  GeoPoint,
  ChargingMode,
  TripResult,
  MultiCalcResult,
  PendingTripSession,
} from '@/types/api';

const SESSION_KEY = 'verygoodtrip.pendingTrip';

const CHARGING_OPTIONS: { value: ChargingMode; label: string }[] = [
  { value: 'home', label: 'Domicile' },
  { value: 'public', label: 'Borne publique' },
  { value: 'mix', label: 'Mix' },
];

interface TripModalProps {
  open: boolean;
  onClose: () => void;
}

export function TripModal({ open, onClose }: TripModalProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [destination, setDestination] = useState<GeoPoint | null>(null);
  const [originLabel, setOriginLabel] = useState('');
  const [destinationLabel, setDestinationLabel] = useState('');
  const [chargingMode, setChargingMode] = useState<ChargingMode>('home');
  const [chargingMixRatio, setChargingMixRatio] = useState(0.5);
  const [isCalculating, setIsCalculating] = useState(false);

  const loadVehicles = useCallback(() => {
    setVehiclesLoading(true);
    apiClient
      .get<UserVehicle[]>('/vehicles/me')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setVehicles(list);
        if (list.length > 0) setSelectedVehicleId(list[0].id);
      })
      .catch(() => {})
      .finally(() => setVehiclesLoading(false));
  }, []);

  useEffect(() => {
    if (open) {
      loadVehicles();
      setOrigin(null);
      setDestination(null);
      setOriginLabel('');
      setDestinationLabel('');
      setChargingMode('home');
      setChargingMixRatio(0.5);
    }
  }, [open, loadVehicles]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const isElectric = selectedVehicle?.vehicleModel.fuelType === 'ELECTRIC';

  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: v.nickname ?? `${v.vehicleModel.brand} ${v.vehicleModel.model}`,
  }));

  async function handleCalculate() {
    if (!origin || !destination) {
      showToast('info', "Veuillez renseigner le départ et l'arrivée");
      return;
    }
    if (!selectedVehicleId) {
      showToast('info', "Sélectionnez d'abord un véhicule");
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
      onClose();
      router.push('/app/trips/result');
    } catch {
      showToast('error', 'Une erreur est survenue');
    } finally {
      setIsCalculating(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouveau trajet"
      footer={
        <>
          <CTAButton variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </CTAButton>
          <CTAButton
            variant="accent"
            size="sm"
            onClick={() => { void handleCalculate(); }}
            loading={isCalculating}
            disabled={vehicles.length === 0 && !vehiclesLoading}
          >
            {isCalculating ? 'Calcul...' : 'Calculer'}
          </CTAButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
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

        {vehiclesLoading ? (
          <p className="text-sm text-carbon-muted">Chargement des véhicules...</p>
        ) : vehicles.length === 0 ? (
          <p className="text-sm text-amber-400">
            Aucun véhicule. Ajoutez-en un dans le Garage.
          </p>
        ) : (
          <Select
            label="Véhicule"
            options={vehicleOptions}
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            placeholder="Sélectionner un véhicule"
          />
        )}

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
      </div>
    </Modal>
  );
}
