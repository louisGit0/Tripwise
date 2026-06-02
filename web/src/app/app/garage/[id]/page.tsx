'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trash2, Star } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { FuelBadge } from '@/components/ui/FuelBadge';
import { BrandAvatar } from '@/components/ui/BrandAvatar';
import { Pill } from '@/components/ui/Pill';
import { Hairline } from '@/components/ui/Hairline';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { KPICell } from '@/components/ui/KPICell';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type { UserVehicleWithStats } from '@/types/api';

// Canonical focus token — applied to every interactive element.
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg';

type Props = {
  params: Promise<{ id: string }>;
};

export default function VehicleDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();

  const [vehicle, setVehicle] = useState<UserVehicleWithStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [nickname, setNickname] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [homePrice, setHomePrice] = useState('');
  const [publicPrice, setPublicPrice] = useState('');

  const fmtNum = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const fmtEur = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });

  useEffect(() => {
    setIsLoading(true);
    apiClient
      .get<UserVehicleWithStats[]>('/vehicles/me')
      .then(({ data }) => {
        const found = data.find((v) => v.id === id) as UserVehicleWithStats | undefined;
        if (!found) {
          setNotFound(true);
          return;
        }
        setVehicle(found);
        setNickname(found.nickname ?? '');
        setLicensePlate(found.licensePlate ?? '');
        setHomePrice(found.homeElectricityPrice?.toString() ?? '');
        setPublicPrice(found.publicChargingPrice?.toString() ?? '');
      })
      .catch(() => showToast('error', 'Une erreur est survenue'))
      .finally(() => setIsLoading(false));
  }, [id, showToast]);

  async function handleSave() {
    if (!vehicle) return;
    const isElectric = vehicle.vehicleModel.fuelType === 'ELECTRIC';
    if (isElectric && (!homePrice || !publicPrice)) {
      showToast('error', 'Les prix d\'électricité sont requis pour un véhicule électrique.');
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.patch(`/vehicles/me/${id}`, {
        nickname: nickname || undefined,
        licensePlate: licensePlate || undefined,
        ...(isElectric
          ? {
              homeElectricityPrice: homePrice ? parseFloat(homePrice) : undefined,
              publicChargingPrice: publicPrice ? parseFloat(publicPrice) : undefined,
            }
          : {}),
      });
      showToast('success', 'Enregistré !');
      // Refresh vehicle data
      const { data } = await apiClient.get<UserVehicleWithStats[]>('/vehicles/me');
      const updated = data.find((v) => v.id === id) as UserVehicleWithStats | undefined;
      if (updated) setVehicle(updated);
    } catch {
      showToast('error', 'Une erreur est survenue');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetDefault() {
    if (!vehicle || vehicle.isDefault) return;
    setIsSettingDefault(true);
    try {
      await apiClient.patch(`/vehicles/me/${id}/set-default`);
      setVehicle((prev) => (prev ? { ...prev, isDefault: true } : prev));
      showToast('success', 'Enregistré !');
    } catch {
      showToast('error', 'Une erreur est survenue');
    } finally {
      setIsSettingDefault(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/vehicles/me/${id}`);
      router.push('/app/garage');
    } catch {
      showToast('error', 'Une erreur est survenue');
      setIsDeleting(false);
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton width={64} height={12} />
          <Skeleton width="55%" height={26} />
        </div>
        <SectionCard padding="md">
          <div className="flex items-center gap-4">
            <Skeleton width={64} height={64} rounded="rounded-card" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={11} />
            </div>
          </div>
        </SectionCard>
        <SectionCard padding="md">
          <div className="flex flex-col gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} width="100%" height={40} rounded="rounded-xl" />
            ))}
          </div>
        </SectionCard>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────
  if (notFound || !vehicle) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-carbon-muted">
        <p className="font-mono text-xs tracking-widest uppercase">{"// 404"}</p>
        <p className="text-base font-bold text-carbon-ink">Véhicule introuvable</p>
        <p className="text-sm text-center max-w-xs">Ce véhicule n&apos;existe pas ou a été supprimé.</p>
        <CTAButton variant="ghost" size="sm" onClick={() => router.push('/app/garage')}>
          Retour
        </CTAButton>
      </div>
    );
  }

  const isElectric = vehicle.vehicleModel.fuelType === 'ELECTRIC';
  const displayName =
    vehicle.nickname ?? `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.model}`;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Back ──────────────────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => router.push('/app/garage')}
          className={`flex items-center gap-1 text-xs text-carbon-muted hover:text-carbon-accent transition-colors mb-3 rounded ${FOCUS_RING}`}
        >
          <ChevronLeft size={13} />
          Retour
        </button>
        <Eyebrow className="mb-0.5">Véhicule</Eyebrow>
        <div className="flex items-center gap-2 mt-1">
          <h1 className="text-2xl font-bold font-display text-carbon-ink">{displayName}</h1>
          {vehicle.isDefault && (
            <Pill color="accent" size="sm">
              Par défaut
            </Pill>
          )}
        </div>
      </div>

      {/* ── Hero card ─────────────────────────────────────────── */}
      <SectionCard padding="md">
        <div className="flex items-center gap-4">
          <BrandAvatar brand={vehicle.vehicleModel.brand} size={64} />
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-carbon-ink leading-tight">
              {vehicle.vehicleModel.brand} {vehicle.vehicleModel.model}
              {vehicle.vehicleModel.year ? ` (${vehicle.vehicleModel.year})` : ''}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <FuelBadge fuelType={vehicle.vehicleModel.fuelType} />
              <span className="text-[11px] text-carbon-muted font-mono">
                {vehicle.vehicleModel.consumption} {isElectric ? 'kWh' : 'L'}/100km
              </span>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        {vehicle.tripsCount > 0 && (
          <>
            <Hairline className="my-3" />
            <div className="grid grid-cols-4 divide-x divide-carbon-hairline">
              {[
                { label: 'Trajets', value: vehicle.tripsCount },
                { label: 'km', value: fmtNum.format(vehicle.totalDistance) },
                { label: 'Dépensé', value: fmtEur.format(vehicle.totalSpent) },
                {
                  label: '€/km',
                  value: vehicle.costPerKm > 0 ? vehicle.costPerKm.toFixed(3) : '—',
                },
              ].map(({ label, value }, i) => (
                <KPICell
                  key={i}
                  label={label}
                  value={<span className="font-mono tabular-nums">{value}</span>}
                  size="sm"
                  className="items-center text-center px-1"
                />
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {/* ── Settings form ─────────────────────────────────────── */}
      <SectionCard
        title={
          <span className="flex items-center gap-1.5">
            <Eyebrow>Paramètres</Eyebrow>
          </span>
        }
        padding="md"
      >
        <div className="flex flex-col gap-4 mt-2">
          <Input
            label="Surnom"
            placeholder="Ex. La petite"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <Input
            label="Plaque d'immatriculation"
            placeholder="AB-123-CD"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
          />
          <div className="flex items-center justify-between py-2 border-t border-carbon-hairline">
            <span className="text-sm text-carbon-ink2">Consommation</span>
            <span className="text-sm font-mono font-bold text-carbon-ink tabular-nums">
              {vehicle.vehicleModel.consumption} {isElectric ? 'kWh' : 'L'}/100km
            </span>
          </div>
          {isElectric && (
            <>
              <Input
                label="Prix domicile (€/kWh)"
                type="number"
                step="0.0001"
                placeholder="0.2272"
                value={homePrice}
                onChange={(e) => setHomePrice(e.target.value)}
              />
              <Input
                label="Prix borne (€/kWh)"
                type="number"
                step="0.0001"
                placeholder="0.4500"
                value={publicPrice}
                onChange={(e) => setPublicPrice(e.target.value)}
              />
            </>
          )}
          <CTAButton variant="accent" size="md" onClick={handleSave} loading={isSaving}>
            Enregistrer
          </CTAButton>
        </div>
      </SectionCard>

      {/* ── Default vehicle ───────────────────────────────────── */}
      <SectionCard padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-carbon-ink">Véhicule par défaut</p>
            <p className="text-xs text-carbon-muted mt-0.5">
              {vehicle.isDefault
                ? 'Ce véhicule est votre véhicule par défaut.'
                : 'Définir par défaut'}
            </p>
          </div>
          {vehicle.isDefault ? (
            <Star
              size={18}
              role="img"
              aria-label="Véhicule par défaut"
              className="text-carbon-accent fill-carbon-accent"
            />
          ) : (
            <CTAButton
              variant="ghost"
              size="sm"
              icon={<Star size={13} />}
              onClick={handleSetDefault}
              loading={isSettingDefault}
            >
              Définir par défaut
            </CTAButton>
          )}
        </div>
      </SectionCard>

      {/* ── Danger zone ───────────────────────────────────────── */}
      <SectionCard padding="md" className="border-red-500/20">
        <Eyebrow className="mb-2 text-red-400">Zone de danger</Eyebrow>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-carbon-ink">Supprimer ce véhicule</p>
            <p className="text-xs text-carbon-muted mt-0.5 max-w-xs">
              Cette action est irréversible. Tous les trajets associés seront conservés.
            </p>
          </div>
          <CTAButton
            variant="danger"
            size="sm"
            icon={<Trash2 size={13} />}
            onClick={() => setShowDeleteModal(true)}
          >
            Supprimer
          </CTAButton>
        </div>
      </SectionCard>

      <Hairline />

      {/* ── Delete modal ──────────────────────────────────────── */}
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
        <p className="text-sm text-carbon-ink2">
          Supprimer ce véhicule définitivement ?
          <br />
          <strong className="text-carbon-ink">{displayName}</strong>
        </p>
        <p className="text-xs text-carbon-muted mt-2">
          Cette action est irréversible. Tous les trajets associés seront conservés.
        </p>
      </Modal>
    </div>
  );
}
