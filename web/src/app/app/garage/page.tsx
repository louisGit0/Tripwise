'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
import { useDebounce } from '@/hooks/useDebounce';
import type { UserVehicle, VehicleModel, UserVehicleWithStats } from '@/types/api';

// UserVehicle may or may not carry stats — support both shapes
type GarageVehicle = UserVehicle | UserVehicleWithStats;

function hasStats(v: GarageVehicle): v is UserVehicleWithStats {
  return 'tripsCount' in v;
}

function isDefaultVehicle(v: GarageVehicle): boolean {
  return 'isDefault' in v && (v as UserVehicleWithStats).isDefault === true;
}

export default function GaragePage() {
  const t = useTranslations('garage');
  const tCommon = useTranslations('common');
  const { showToast } = useToast();

  const [vehicles, setVehicles] = useState<GarageVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Add modal state ─────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState<VehicleModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
  const [addNickname, setAddNickname] = useState('');
  const [addHomePrice, setAddHomePrice] = useState('');
  const [addPublicPrice, setAddPublicPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const debouncedSearch = useDebounce(catalogSearch, 300);

  // ── Edit modal state ────────────────────────────────────────
  const [editVehicle, setEditVehicle] = useState<GarageVehicle | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editHomePrice, setEditHomePrice] = useState('');
  const [editPublicPrice, setEditPublicPrice] = useState('');

  // ── Delete modal state ──────────────────────────────────────
  const [deleteVehicle, setDeleteVehicle] = useState<GarageVehicle | null>(null);

  const loadVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get<GarageVehicle[]>('/vehicles/me');
      setVehicles(data);
    } catch {
      showToast('error', tCommon('error'));
    } finally {
      setIsLoading(false);
    }
  }, [showToast, tCommon]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    if (!showAddModal || debouncedSearch.length < 2) {
      setCatalogResults([]);
      return;
    }
    apiClient
      .get<{ data: VehicleModel[] }>('/vehicles/catalog', {
        params: { search: debouncedSearch, limit: 10 },
      })
      .then(({ data }) => setCatalogResults(data.data ?? []))
      .catch(() => setCatalogResults([]));
  }, [debouncedSearch, showAddModal]);

  function openAddModal() {
    setSelectedModel(null);
    setCatalogSearch('');
    setCatalogResults([]);
    setAddNickname('');
    setAddHomePrice('');
    setAddPublicPrice('');
    setShowAddModal(true);
  }

  async function handleAdd() {
    if (!selectedModel) return;
    const isElectric = selectedModel.fuelType === 'ELECTRIC';
    if (isElectric && (!addHomePrice || !addPublicPrice)) {
      showToast('error', t('electricPricesRequired'));
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.post('/vehicles/me', {
        vehicleModelId: selectedModel.id,
        nickname: addNickname || undefined,
        ...(isElectric
          ? {
              homeElectricityPrice: parseFloat(addHomePrice),
              publicChargingPrice: parseFloat(addPublicPrice),
            }
          : {}),
      });
      setShowAddModal(false);
      showToast('success', tCommon('success'));
      await loadVehicles();
    } catch {
      showToast('error', tCommon('error'));
    } finally {
      setIsSaving(false);
    }
  }

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
      showToast('success', tCommon('success'));
      await loadVehicles();
    } catch {
      showToast('error', tCommon('error'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteVehicle) return;
    try {
      await apiClient.delete(`/vehicles/me/${deleteVehicle.id}`);
      setDeleteVehicle(null);
      showToast('success', tCommon('success'));
      await loadVehicles();
    } catch {
      showToast('error', tCommon('error'));
    }
  }

  const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <Eyebrow className="mb-0.5">{t('title')}</Eyebrow>
          <h1 className="text-2xl font-bold font-display text-carbon-ink">{t('title')}</h1>
        </div>
        <CTAButton
          variant="accent"
          size="sm"
          icon={<Plus size={13} />}
          onClick={openAddModal}
        >
          {t('addTitle')}
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
            <p className="text-sm text-carbon-muted">{t('empty')}</p>
            <CTAButton variant="accent" size="sm" icon={<Plus size={13} />} onClick={openAddModal}>
              {t('addTitle')}
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
                        <Pill color="accent" size="sm">{t('defaultBadge')}</Pill>
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
                    <button
                      type="button"
                      onClick={() => openEdit(v)}
                      aria-label={tCommon('edit')}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-carbon-muted hover:text-carbon-accent hover:bg-blue-500/10 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteVehicle(v)}
                      aria-label={tCommon('delete')}
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
                        { value: stats.tripsCount,                   unit: t('stats.trips') },
                        { value: fmt.format(stats.totalDistance),    unit: t('stats.distance') },
                        { value: `${fmt.format(stats.totalSpent)} €`, unit: t('stats.spent') },
                        { value: stats.costPerKm > 0 ? `${fmt.format(stats.costPerKm)}` : '—', unit: t('stats.perKm') },
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

      {/* ── Add Modal ─────────────────────────────────────────── */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={selectedModel ? t('addTitle') : t('searchCatalog')}
        footer={
          selectedModel ? (
            <>
              <CTAButton variant="ghost" onClick={() => setSelectedModel(null)}>
                {tCommon('back')}
              </CTAButton>
              <CTAButton variant="accent" onClick={handleAdd} loading={isSaving}>
                {tCommon('add')}
              </CTAButton>
            </>
          ) : undefined
        }
      >
        {!selectedModel ? (
          <div className="flex flex-col gap-3">
            <Input
              placeholder={t('searchPlaceholder')}
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              autoFocus
            />
            {catalogResults.length === 0 && catalogSearch.length >= 2 && (
              <p className="text-sm text-carbon-muted text-center py-4">{t('noResults')}</p>
            )}
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
              {catalogResults.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModel(m)}
                  className="flex items-center justify-between px-3 py-2.5 border border-carbon-hairline rounded-xl text-sm bg-carbon-surface2 hover:border-carbon-accent hover:bg-blue-500/8 transition-colors text-left"
                >
                  <span className="text-carbon-ink">
                    {m.brand} {m.model} {m.year ? `(${m.year})` : ''}
                  </span>
                  <FuelBadge fuelType={m.fuelType} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 bg-carbon-surface2 rounded-xl border border-carbon-hairline">
              <BrandAvatar brand={selectedModel.brand} size={32} />
              <div>
                <p className="text-sm font-medium text-carbon-ink">
                  {selectedModel.brand} {selectedModel.model}
                  {selectedModel.year ? ` (${selectedModel.year})` : ''}
                </p>
                <FuelBadge fuelType={selectedModel.fuelType} />
              </div>
            </div>
            <Input
              label={t('nickname')}
              placeholder={t('nicknamePlaceholder')}
              value={addNickname}
              onChange={(e) => setAddNickname(e.target.value)}
            />
            {selectedModel.fuelType === 'ELECTRIC' && (
              <>
                <Input
                  label={t('homePrice')}
                  type="number"
                  step="0.0001"
                  placeholder="0.2272"
                  value={addHomePrice}
                  onChange={(e) => setAddHomePrice(e.target.value)}
                />
                <Input
                  label={t('publicPrice')}
                  type="number"
                  step="0.0001"
                  placeholder="0.4500"
                  value={addPublicPrice}
                  onChange={(e) => setAddPublicPrice(e.target.value)}
                />
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ── Edit Modal ────────────────────────────────────────── */}
      <Modal
        open={!!editVehicle}
        onClose={() => setEditVehicle(null)}
        title={t('editTitle')}
        footer={
          <>
            <CTAButton variant="ghost" onClick={() => setEditVehicle(null)}>
              {tCommon('cancel')}
            </CTAButton>
            <CTAButton variant="accent" onClick={handleEdit} loading={isSaving}>
              {tCommon('save')}
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
              label={t('nickname')}
              placeholder={t('nicknamePlaceholder')}
              value={editNickname}
              onChange={(e) => setEditNickname(e.target.value)}
            />
            {editVehicle.vehicleModel.fuelType === 'ELECTRIC' && (
              <>
                <Input
                  label={t('homePrice')}
                  type="number"
                  step="0.0001"
                  value={editHomePrice}
                  onChange={(e) => setEditHomePrice(e.target.value)}
                />
                <Input
                  label={t('publicPrice')}
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
        title={tCommon('confirm_delete')}
        footer={
          <>
            <CTAButton variant="ghost" onClick={() => setDeleteVehicle(null)}>
              {tCommon('cancel')}
            </CTAButton>
            <CTAButton variant="danger" onClick={handleDelete}>
              {tCommon('delete')}
            </CTAButton>
          </>
        }
      >
        {deleteVehicle && (
          <p className="text-sm text-carbon-ink2">
            {t('deleteConfirm')}
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
