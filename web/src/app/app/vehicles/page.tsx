'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, Car } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import type { UserVehicle, VehicleModel } from '@/types/api';

export default function VehiclesPage() {
  const t = useTranslations('vehicles');
  const tCommon = useTranslations('common');
  const { showToast } = useToast();

  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState<VehicleModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
  const [addNickname, setAddNickname] = useState('');
  const [addHomePrice, setAddHomePrice] = useState('');
  const [addPublicPrice, setAddPublicPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const debouncedSearch = useDebounce(catalogSearch, 300);

  // Edit modal state
  const [editVehicle, setEditVehicle] = useState<UserVehicle | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editHomePrice, setEditHomePrice] = useState('');
  const [editPublicPrice, setEditPublicPrice] = useState('');

  // Delete modal state
  const [deleteVehicle, setDeleteVehicle] = useState<UserVehicle | null>(null);

  const loadVehicles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get<UserVehicle[]>('/vehicles/me');
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
    if (!showAddModal || !selectedModel) return;
    if (debouncedSearch.length < 1) {
      setCatalogResults([]);
      return;
    }
    apiClient
      .get<{ data: VehicleModel[] }>('/vehicles/catalog', {
        params: { search: debouncedSearch, limit: 10 },
      })
      .then(({ data }) => setCatalogResults(data.data ?? []))
      .catch(() => setCatalogResults([]));
  }, [debouncedSearch, showAddModal, selectedModel]);

  useEffect(() => {
    if (!showAddModal || selectedModel) return;
    if (debouncedSearch.length < 2) {
      setCatalogResults([]);
      return;
    }
    apiClient
      .get<{ data: VehicleModel[] }>('/vehicles/catalog', {
        params: { search: debouncedSearch, limit: 10 },
      })
      .then(({ data }) => setCatalogResults(data.data ?? []))
      .catch(() => setCatalogResults([]));
  }, [debouncedSearch, showAddModal, selectedModel]);

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

  function openEdit(v: UserVehicle) {
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

  const fuelLabel = (ft: string) =>
    t(`fuelTypes.${ft}` as Parameters<typeof t>[0]) || ft;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={openAddModal} size="sm">
          <Plus size={16} />
          {t('add')}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-[var(--muted)] text-sm">{tCommon('loading')}</p>
      ) : vehicles.length === 0 ? (
        <Card>
          <p className="text-center text-[var(--muted)] py-8">{t('empty')}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {vehicles.map((v) => (
            <Card key={v.id} padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    <Car size={18} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {v.nickname ?? `${v.vehicleModel.brand} ${v.vehicleModel.model}`}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {v.vehicleModel.brand} {v.vehicleModel.model}
                      {v.vehicleModel.year ? ` · ${v.vehicleModel.year}` : ''} ·{' '}
                      {fuelLabel(v.vehicleModel.fuelType)} · {v.vehicleModel.consumption}{' '}
                      {v.vehicleModel.fuelType === 'ELECTRIC' ? 'kWh' : 'L'}/100km
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(v)}
                    className="p-2 rounded-lg text-[var(--muted)] hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteVehicle(v)}
                    className="p-2 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={selectedModel ? t('addTitle') : t('searchCatalog')}
        footer={
          selectedModel ? (
            <>
              <Button variant="secondary" onClick={() => setSelectedModel(null)}>
                {tCommon('back')}
              </Button>
              <Button onClick={handleAdd} loading={isSaving}>
                {tCommon('add')}
              </Button>
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
              <p className="text-sm text-[var(--muted)] text-center py-4">{t('noResults')}</p>
            )}
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {catalogResults.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m)}
                  className="flex items-center justify-between px-3 py-2.5 border border-[var(--border)] rounded-lg text-sm hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                >
                  <span>
                    {m.brand} {m.model} {m.year ? `(${m.year})` : ''}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{fuelLabel(m.fuelType)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-sm">
              <span className="font-medium">
                {selectedModel.brand} {selectedModel.model}
              </span>
              {selectedModel.year ? ` (${selectedModel.year})` : ''} ·{' '}
              {fuelLabel(selectedModel.fuelType)}
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

      {/* Edit Modal */}
      <Modal
        open={!!editVehicle}
        onClose={() => setEditVehicle(null)}
        title={t('editTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditVehicle(null)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleEdit} loading={isSaving}>
              {tCommon('save')}
            </Button>
          </>
        }
      >
        {editVehicle && (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-sm">
              {editVehicle.vehicleModel.brand} {editVehicle.vehicleModel.model} ·{' '}
              {fuelLabel(editVehicle.vehicleModel.fuelType)}
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

      {/* Delete Modal */}
      <Modal
        open={!!deleteVehicle}
        onClose={() => setDeleteVehicle(null)}
        title={tCommon('confirm_delete')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteVehicle(null)}>
              {tCommon('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {tCommon('delete')}
            </Button>
          </>
        }
      >
        {deleteVehicle && (
          <p className="text-sm">
            {t('deleteConfirm')}
            <br />
            <strong>
              {deleteVehicle.nickname ??
                `${deleteVehicle.vehicleModel.brand} ${deleteVehicle.vehicleModel.model}`}
            </strong>
          </p>
        )}
      </Modal>
    </div>
  );
}
