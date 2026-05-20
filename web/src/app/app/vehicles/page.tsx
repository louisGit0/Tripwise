'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Car, Plus, Trash2, Pencil } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { useToast } from '@/providers/ToastProvider';
import api from '@/lib/api';
import type { UserVehicle, VehicleModel } from '@/types/api';
import { useDebounce } from '@/hooks/useDebounce';

// ── Fuel label map ─────────────────────────────────────────────────────────────

const FUEL_LABELS: Record<string, string> = {
  SP95: 'SP95', SP95_E10: 'SP95-E10', SP98: 'SP98',
  DIESEL: 'Diesel', E85: 'E85', GPL: 'GPL', ELECTRIC: 'Électrique',
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const t = useTranslations('vehicles');
  const tc = useTranslations('common');
  const { toast } = useToast();

  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<UserVehicle | null>(null);
  const [deleteVehicle, setDeleteVehicle] = useState<UserVehicle | null>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await api.get<UserVehicle[]>('/vehicles/me');
      setVehicles(res.data);
    } catch {
      toast(tc('error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, tc]);

  useEffect(() => { void fetchVehicles(); }, [fetchVehicles]);

  const handleDelete = async () => {
    if (!deleteVehicle) return;
    try {
      await api.delete(`/vehicles/me/${deleteVehicle.id}`);
      setVehicles((prev) => prev.filter((v) => v.id !== deleteVehicle.id));
      toast(t('deleteSuccess'), 'success');
    } catch {
      toast(tc('error'), 'error');
    } finally {
      setDeleteVehicle(null);
    }
  };

  if (loading) {
    return <div className="text-slate-500 dark:text-slate-400 text-sm">{tc('loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('add')}
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Car className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('empty')}</p>
            <Button size="sm" onClick={() => setAddOpen(true)}>{t('add')}</Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {vehicles.map((v) => (
            <Card key={v.id} padding="md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">
                    {v.nickname ?? `${v.vehicleModel.brand} ${v.vehicleModel.model}`}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {v.vehicleModel.brand} {v.vehicleModel.model} ·{' '}
                    {FUEL_LABELS[v.vehicleModel.fuelType] ?? v.vehicleModel.fuelType} ·{' '}
                    {v.vehicleModel.fuelType === 'ELECTRIC'
                      ? `${v.vehicleModel.consumptionPer100km} kWh/100km`
                      : `${v.vehicleModel.consumptionPer100km} L/100km`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setEditVehicle(v)} aria-label={t('edit')}>
                    <Pencil className="h-4 w-4 text-slate-500" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteVehicle(v)} aria-label={t('delete')}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add modal */}
      <AddVehicleModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(v) => {
          setVehicles((prev) => [...prev, v]);
          toast(t('addSuccess'), 'success');
          setAddOpen(false);
        }}
      />

      {/* Edit modal */}
      {editVehicle && (
        <EditVehicleModal
          vehicle={editVehicle}
          onClose={() => setEditVehicle(null)}
          onSaved={(updated) => {
            setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
            toast(t('editSuccess'), 'success');
            setEditVehicle(null);
          }}
        />
      )}

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteVehicle}
        onClose={() => setDeleteVehicle(null)}
        title={t('deleteConfirm')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteVehicle(null)}>{tc('cancel')}</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>{t('delete')}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('deleteConfirmDesc')}</p>
      </Modal>
    </div>
  );
}

// ── Add vehicle modal ──────────────────────────────────────────────────────────

interface AddModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: (vehicle: UserVehicle) => void;
}

function AddVehicleModal({ open, onClose, onAdded }: AddModalProps) {
  const t = useTranslations('vehicles');
  const tc = useTranslations('common');
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [catalogResults, setCatalogResults] = useState<VehicleModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
  const [nickname, setNickname] = useState('');
  const [homePrice, setHomePrice] = useState('');
  const [publicPrice, setPublicPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setSearch(''); setSelectedModel(null); setNickname('');
      setHomePrice(''); setPublicPrice(''); setCatalogResults([]); setErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (!debouncedSearch) { setCatalogResults([]); return; }
    api.get<{ data: VehicleModel[] }>('/vehicles/catalog', { params: { search: debouncedSearch, limit: 10 } })
      .then((res) => setCatalogResults(res.data.data))
      .catch(() => {/* ignore */});
  }, [debouncedSearch]);

  const isElectric = selectedModel?.fuelType === 'ELECTRIC';

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!selectedModel) errs.model = 'Sélectionnez un modèle';
    if (isElectric && !homePrice) errs.homePrice = 'Requis';
    if (isElectric && !publicPrice) errs.publicPrice = 'Requis';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { vehicleModelId: selectedModel!.id };
      if (nickname) body.nickname = nickname;
      if (isElectric) {
        body.homeElectricityPrice = parseFloat(homePrice);
        body.publicChargingPrice = parseFloat(publicPrice);
      }
      const res = await api.post<UserVehicle>('/vehicles/me', body);
      onAdded(res.data);
    } catch {
      toast(tc('error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('addModalTitle')}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{tc('cancel')}</Button>
          <Button size="sm" loading={submitting} onClick={handleSubmit}>{tc('save')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!selectedModel ? (
          <>
            <Input
              label={t('search')}
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              error={errors.model}
            />
            {catalogResults.length > 0 && (
              <ul className="border rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 max-h-48 overflow-y-auto">
                {catalogResults.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => { setSelectedModel(m); setSearch(''); }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span className="font-medium text-slate-900 dark:text-white">{m.brand} {m.model}</span>
                      <span className="ml-2 text-slate-500 text-xs">
                        {FUEL_LABELS[m.fuelType] ?? m.fuelType} · {m.consumptionPer100km} {m.fuelType === 'ELECTRIC' ? 'kWh' : 'L'}/100
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {debouncedSearch && catalogResults.length === 0 && (
              <p className="text-sm text-slate-500">{t('noResults')}</p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg bg-primary-50 dark:bg-primary-900/30 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
                  {selectedModel.brand} {selectedModel.model}
                </p>
                <p className="text-xs text-primary-600 dark:text-primary-400">
                  {FUEL_LABELS[selectedModel.fuelType] ?? selectedModel.fuelType} · {selectedModel.consumptionPer100km} {selectedModel.fuelType === 'ELECTRIC' ? 'kWh' : 'L'}/100
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedModel(null)}
                className="text-xs text-primary-600 dark:text-primary-400 underline"
              >
                Changer
              </button>
            </div>

            <Input
              label={t('nickname')}
              placeholder={t('nicknamePlaceholder')}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />

            {isElectric && (
              <>
                <Input
                  label={t('homeElectricity')}
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.2272"
                  value={homePrice}
                  onChange={(e) => setHomePrice(e.target.value)}
                  error={errors.homePrice}
                  hint={t('electricPricesHint')}
                />
                <Input
                  label={t('publicCharging')}
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.55"
                  value={publicPrice}
                  onChange={(e) => setPublicPrice(e.target.value)}
                  error={errors.publicPrice}
                />
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ── Edit vehicle modal ─────────────────────────────────────────────────────────

interface EditModalProps {
  vehicle: UserVehicle;
  onClose: () => void;
  onSaved: (vehicle: UserVehicle) => void;
}

function EditVehicleModal({ vehicle, onClose, onSaved }: EditModalProps) {
  const t = useTranslations('vehicles');
  const tc = useTranslations('common');
  const { toast } = useToast();

  const [nickname, setNickname] = useState(vehicle.nickname ?? '');
  const [homePrice, setHomePrice] = useState(vehicle.homeElectricityPrice?.toString() ?? '');
  const [publicPrice, setPublicPrice] = useState(vehicle.publicChargingPrice?.toString() ?? '');
  const [submitting, setSubmitting] = useState(false);
  const isElectric = vehicle.vehicleModel.fuelType === 'ELECTRIC';

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { nickname: nickname || null };
      if (isElectric) {
        body.homeElectricityPrice = homePrice ? parseFloat(homePrice) : null;
        body.publicChargingPrice = publicPrice ? parseFloat(publicPrice) : null;
      }
      const res = await api.patch<UserVehicle>(`/vehicles/me/${vehicle.id}`, body);
      onSaved(res.data);
    } catch {
      toast(tc('error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('editModalTitle')}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{tc('cancel')}</Button>
          <Button size="sm" loading={submitting} onClick={handleSubmit}>{tc('save')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 px-3 py-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {vehicle.vehicleModel.brand} {vehicle.vehicleModel.model}
          </p>
        </div>
        <Input
          label={t('nickname')}
          placeholder={t('nicknamePlaceholder')}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        {isElectric && (
          <>
            <Input
              label={t('homeElectricity')}
              type="number"
              step="0.001"
              min="0"
              value={homePrice}
              onChange={(e) => setHomePrice(e.target.value)}
            />
            <Input
              label={t('publicCharging')}
              type="number"
              step="0.001"
              min="0"
              value={publicPrice}
              onChange={(e) => setPublicPrice(e.target.value)}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
