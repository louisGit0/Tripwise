'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Pill } from '@/components/ui/Pill';
import { FuelBadge } from '@/components/ui/FuelBadge';
import { BrandAvatar } from '@/components/ui/BrandAvatar';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type { UserVehicle, UserVehicleWithStats } from '@/types/api';

// UserVehicle may or may not carry stats — support both shapes
type GarageVehicle = UserVehicle | UserVehicleWithStats;

function hasStats(v: GarageVehicle): v is UserVehicleWithStats {
  return 'tripsCount' in v;
}

function isDefaultVehicle(v: GarageVehicle): boolean {
  return 'isDefault' in v && (v as UserVehicleWithStats).isDefault === true;
}

export default function GaragePage() {
  const { showToast } = useToast();
  const router = useRouter();

  const [vehicles, setVehicles] = useState<GarageVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ── Edit modal state ────────────────────────────────────────
  const [editVehicle, setEditVehicle] = useState<GarageVehicle | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editHomePrice, setEditHomePrice] = useState('');
  const [editPublicPrice, setEditPublicPrice] = useState('');

  // ── Delete modal state ──────────────────────────────────────
  const [deleteVehicle, setDeleteVehicle] = useState<GarageVehicle | null>(null);

  // ── Set default state ───────────────────────────────────────
  const [isSettingDefault, setIsSettingDefault] = useState<string | null>(null);

  const loadVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get<GarageVehicle[]>('/vehicles/me');
      setVehicles(data);
    } catch {
      showToast('error', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  function openEdit(v: GarageVehicle) {
    setEditVehicle(v);
    setEditNickname(v.nickname ?? '');
    setEditHomePrice(v.homeElectricityPrice?.toString() ?? '');
    setEditPublicPrice(v.publicChargingPrice?.toString() ?? '');
  }

  async function handleEdit() {
    if (!editVehicle) return;
    const isElectric = editVehicle.vehicleModel.fuelType === 'ELECTRIC';
    setIsSaving(true);
    try {
      await apiClient.patch(`/vehicles/me/${editVehicle.id}`, {
        nickname: editNickname || undefined,
        ...(isElectric
          ? {
              homeElectricityPrice: editHomePrice ? parseFloat(editHomePrice) : undefined,
              publicChargingPrice: editPublicPrice ? parseFloat(editPublicPrice) : undefined,
            }
          : {}),
      });
      setEditVehicle(null);
      showToast('success', 'Enregistré !');
      await loadVehicles();
    } catch {
      showToast('error', 'Une erreur est survenue');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetDefault(vehicleId: string) {
    setIsSettingDefault(vehicleId);
    try {
      await apiClient.patch(`/vehicles/me/${vehicleId}/set-default`);
      showToast('success', 'Véhicule actif mis à jour');
      await loadVehicles();
    } catch {
      showToast('error', 'Une erreur est survenue');
    } finally {
      setIsSettingDefault(null);
    }
  }

  async function handleDelete() {
    if (!deleteVehicle) return;
    try {
      await apiClient.delete(`/vehicles/me/${deleteVehicle.id}`);
      setDeleteVehicle(null);
      showToast('success', 'Enregistré !');
      await loadVehicles();
    } catch {
      showToast('error', 'Une erreur est survenue');
    }
  }

  const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <Eyebrow className="mb-0.5">Garage</Eyebrow>
          <h1 className="text-2xl font-bold font-display text-carbon-ink">Garage</h1>
        </div>
        <CTAButton
          variant="accent"
          size="sm"
          icon={<Plus size={13} />}
          onClick={() => router.push('/app/garage/add')}
        >
          Ajouter au garage
        </CTAButton>
      </div>

      {/* ── Vehicle list ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col gap-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-carbon-surface2 rounded-card" />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <SectionCard padding="lg">
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <p className="text-sm text-carbon-muted">
              Aucun véhicule dans le garage. Ajoutez-en un pour calculer vos trajets.
            </p>
            <CTAButton variant="accent" size="sm" icon={<Plus size={13} />} onClick={() => router.push('/app/garage/add')}>
              Ajouter au garage
            </CTAButton>
          </div>
        </SectionCard>
      ) : (
        <div className="flex flex-col gap-3">
          {vehicles.map((v) => {
            const name = v.nickname ?? `${v.vehicleModel.brand} ${v.vehicleModel.model}`;
            const isElectric = v.vehicleModel.fuelType === 'ELECTRIC';
            const isDefault = isDefaultVehicle(v);
            const stats = hasStats(v) ? v : null;

            return (
              <SectionCard key={v.id} padding="none">
                <div className="px-4 py-3 flex items-center gap-3">
                  {/* Brand avatar */}
                  <BrandAvatar brand={v.vehicleModel.brand} size={36} />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-carbon-ink text-sm truncate">{name}</span>
                      {isDefault && (
                        <Pill color="accent" size="sm">Par défaut</Pill>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <FuelBadge fuelType={v.vehicleModel.fuelType} />
                      <span className="text-[11px] text-carbon-muted">
                        {v.vehicleModel.brand} {v.vehicleModel.model}
                        {v.vehicleModel.year ? ` · ${v.vehicleModel.year}` : ''}
                      </span>
                      <span className="text-[11px] text-carbon-muted">
                        {v.vehicleModel.consumption} {isElectric ? 'kWh' : 'L'}/100km
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(v.id)}
                        aria-label="Définir comme actif"
                        disabled={isSettingDefault === v.id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-carbon-muted hover:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
                      >
                        <Star size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(v)}
                      aria-label="Modifier"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-carbon-muted hover:text-carbon-accent hover:bg-blue-500/10 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteVehicle(v)}
                      aria-label="Supprimer"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-carbon-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Stats strip */}
                {stats && (stats.tripsCount > 0 || stats.totalDistance > 0) && (
                  <>
                    <Hairline />
                    <div className="grid grid-cols-4 divide-x divide-carbon-hairline">
                      {[
                        { value: stats.tripsCount,                    unit: 'trajets' },
                        { value: fmt.format(stats.totalDistance),     unit: 'km' },
                        { value: `${fmt.format(stats.totalSpent)} €`, unit: 'dépensé' },
                        { value: stats.costPerKm > 0 ? `${fmt.format(stats.costPerKm)}` : '—', unit: '€/km' },
                      ].map(({ value, unit }, i) => (
                        <div key={i} className="flex flex-col items-center py-2 gap-0">
                          <span className="text-sm font-bold font-mono text-carbon-ink tabular-nums">
                            {value}
                          </span>
                          <span className="text-[10px] text-carbon-muted">{unit}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </SectionCard>
            );
          })}
        </div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────── */}
      <Modal
        open={!!editVehicle}
        onClose={() => setEditVehicle(null)}
        title="Modifier le véhicule"
        footer={
          <>
            <CTAButton variant="ghost" onClick={() => setEditVehicle(null)}>
              Annuler
            </CTAButton>
            <CTAButton variant="accent" onClick={handleEdit} loading={isSaving}>
              Enregistrer
            </CTAButton>
          </>
        }
      >
        {editVehicle && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 bg-carbon-surface2 rounded-xl border border-carbon-hairline">
              <BrandAvatar brand={editVehicle.vehicleModel.brand} size={32} />
              <div>
                <p className="text-sm font-medium text-carbon-ink">
                  {editVehicle.vehicleModel.brand} {editVehicle.vehicleModel.model}
                </p>
                <FuelBadge fuelType={editVehicle.vehicleModel.fuelType} />
              </div>
            </div>
            <Input
              label="Surnom"
              placeholder="Ex. La petite"
              value={editNickname}
              onChange={(e) => setEditNickname(e.target.value)}
            />
            {editVehicle.vehicleModel.fuelType === 'ELECTRIC' && (
              <>
                <Input
                  label="Prix domicile (€/kWh)"
                  type="number"
                  step="0.0001"
                  value={editHomePrice}
                  onChange={(e) => setEditHomePrice(e.target.value)}
                />
                <Input
                  label="Prix borne (€/kWh)"
                  type="number"
                  step="0.0001"
                  value={editPublicPrice}
                  onChange={(e) => setEditPublicPrice(e.target.value)}
                />
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ── Delete Modal ──────────────────────────────────────── */}
      <Modal
        open={!!deleteVehicle}
        onClose={() => setDeleteVehicle(null)}
        title="Confirmer la suppression"
        footer={
          <>
            <CTAButton variant="ghost" onClick={() => setDeleteVehicle(null)}>
              Annuler
            </CTAButton>
            <CTAButton variant="danger" onClick={handleDelete}>
              Supprimer
            </CTAButton>
          </>
        }
      >
        {deleteVehicle && (
          <p className="text-sm text-carbon-ink2">
            Supprimer ce véhicule définitivement ?
            <br />
            <strong className="text-carbon-ink">
              {deleteVehicle.nickname ??
                `${deleteVehicle.vehicleModel.brand} ${deleteVehicle.vehicleModel.model}`}
            </strong>
          </p>
        )}
      </Modal>
    </div>
  );
}
