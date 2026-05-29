'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, Plus, X } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { FuelBadge } from '@/components/ui/FuelBadge';
import { BrandAvatar } from '@/components/ui/BrandAvatar';
import { Pill } from '@/components/ui/Pill';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type { VehicleModel, UserVehicle, CatalogPage, FuelType } from '@/types/api';

// ── Fuel filter groups ───────────────────────────────────────────
const FUEL_FILTERS: { key: string; label: string; types: FuelType[] | null }[] = [
  { key: 'all', label: 'Tous', types: null },
  { key: 'ev', label: 'Électrique', types: ['ELECTRIC'] },
  { key: 'essence', label: 'Essence', types: ['SP95', 'SP95_E10', 'SP98'] },
  { key: 'diesel', label: 'Diesel', types: ['DIESEL'] },
  { key: 'gpl', label: 'GPL', types: ['GPL'] },
  { key: 'e85', label: 'E85', types: ['E85'] },
];

const MAX_PAGES = 30; // safety cap: 30 × 100 = 3000 models
const brandSlug = (brand: string) => `brand-${brand.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;

export default function AddVehiclePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [allModels, setAllModels] = useState<VehicleModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fuelFilter, setFuelFilter] = useState('all');

  // ── Config (step 2) state ───────────────────────────────────────
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
  const [nickname, setNickname] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [homePrice, setHomePrice] = useState('');
  const [publicPrice, setPublicPrice] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // ── Load the full catalogue once (paginated, parallel) ──────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const first = await apiClient.get<CatalogPage>('/vehicles/catalog', {
          params: { page: 1, limit: 100 },
        });
        const totalPages = Math.min(first.data.totalPages ?? 1, MAX_PAGES);
        let models = first.data.items ?? [];
        if (totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              apiClient.get<CatalogPage>('/vehicles/catalog', {
                params: { page: i + 2, limit: 100 },
              }),
            ),
          );
          models = models.concat(...rest.map((r) => r.data.items ?? []));
        }
        if (!cancelled) setAllModels(models);
      } catch {
        if (!cancelled) showToast('error', 'Impossible de charger le catalogue');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  // ── Filter + group by brand ─────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const types = FUEL_FILTERS.find((f) => f.key === fuelFilter)?.types ?? null;
    return allModels.filter((m) => {
      if (types && !types.includes(m.fuelType)) return false;
      if (q && !`${m.brand} ${m.model}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allModels, search, fuelFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, VehicleModel[]>();
    for (const m of filtered) {
      const list = map.get(m.brand);
      if (list) list.push(m);
      else map.set(m.brand, [m]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  }, [filtered]);

  function jumpToBrand(brand: string) {
    document.getElementById(brandSlug(brand))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openConfig(model: VehicleModel) {
    setSelectedModel(model);
    setNickname('');
    setLicensePlate('');
    setHomePrice('');
    setPublicPrice('');
  }

  async function handleAdd() {
    if (!selectedModel) return;
    const isElectric = selectedModel.fuelType === 'ELECTRIC';
    if (isElectric && (!homePrice || !publicPrice)) {
      showToast('error', "Les prix d'électricité sont requis pour un véhicule électrique.");
      return;
    }
    setIsAdding(true);
    try {
      const { data } = await apiClient.post<UserVehicle>('/vehicles/me', {
        vehicleModelId: selectedModel.id,
        nickname: nickname || undefined,
        licensePlate: licensePlate || undefined,
        ...(isElectric
          ? {
              homeElectricityPrice: parseFloat(homePrice),
              publicChargingPrice: parseFloat(publicPrice),
            }
          : {}),
      });
      showToast('success', 'Véhicule ajouté !');
      router.push(`/app/garage/${data.id}`);
    } catch {
      showToast('error', 'Une erreur est survenue');
    } finally {
      setIsAdding(false);
    }
  }

  const brandCount = grouped.length;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => router.push('/app/garage')}
          className="flex items-center gap-1 text-xs text-carbon-muted hover:text-carbon-accent transition-colors mb-3"
        >
          <ChevronLeft size={13} />
          Retour au garage
        </button>
        <Eyebrow className="mb-0.5">Showroom</Eyebrow>
        <h1 className="text-2xl font-bold font-display text-carbon-ink">Choisir un véhicule</h1>
        <p className="text-sm text-carbon-muted mt-1">
          {isLoading
            ? 'Chargement du catalogue…'
            : `${filtered.length} modèle${filtered.length > 1 ? 's' : ''} · ${brandCount} marque${brandCount > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* ── Sticky toolbar: search + fuel filters ─────────────── */}
      <div className="sticky top-14 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-carbon-bg/95 backdrop-blur-sm border-b border-carbon-hairline">
        <div className="flex flex-col gap-2.5">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-carbon-muted pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une marque ou un modèle…"
              className="w-full h-10 pl-9 pr-9 bg-carbon-surface border border-carbon-hairline rounded-xl text-sm text-carbon-ink placeholder:text-carbon-muted outline-none focus:border-carbon-accent transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Effacer"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-carbon-muted hover:text-carbon-ink hover:bg-carbon-surface2 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
            {FUEL_FILTERS.map((f) => {
              const active = fuelFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFuelFilter(f.key)}
                  className={[
                    'shrink-0 h-7 px-3 rounded-full text-xs font-medium border transition-colors',
                    active
                      ? 'bg-carbon-accent text-white border-transparent'
                      : 'bg-carbon-surface text-carbon-ink2 border-carbon-hairline hover:border-carbon-accent hover:text-carbon-ink',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Loading skeleton ──────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col gap-6">
          {[...Array(2)].map((_, s) => (
            <div key={s} className="flex flex-col gap-3">
              <div className="h-5 w-32 bg-carbon-surface2 rounded animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-20 bg-carbon-surface2 rounded-card animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <SectionCard padding="lg">
          <p className="text-sm text-carbon-muted text-center py-8">
            Aucun modèle ne correspond à votre recherche.
          </p>
        </SectionCard>
      ) : (
        <>
          {/* ── Brand directory (quick jump) ─────────────────── */}
          {brandCount > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {grouped.map(([brand, models]) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => jumpToBrand(brand)}
                  className="inline-flex items-center gap-1.5 h-7 pl-1.5 pr-2.5 rounded-full border border-carbon-hairline bg-carbon-surface hover:border-carbon-accent hover:bg-blue-500/[0.06] transition-colors"
                >
                  <BrandAvatar brand={brand} size={18} />
                  <span className="text-xs text-carbon-ink2">{brand}</span>
                  <span className="text-[10px] text-carbon-muted font-mono">{models.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Brand sections ───────────────────────────────── */}
          <div className="flex flex-col gap-7">
            {grouped.map(([brand, models]) => (
              <section key={brand} id={brandSlug(brand)} className="scroll-mt-44">
                <div className="flex items-center gap-2.5 mb-3">
                  <BrandAvatar brand={brand} size={28} />
                  <h2 className="text-sm font-bold font-display text-carbon-ink">{brand}</h2>
                  <Pill color="default" size="sm">
                    {models.length}
                  </Pill>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {models.map((m) => (
                    <ModelCard key={m.id} model={m} onSelect={openConfig} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {/* ── Config modal ──────────────────────────────────────── */}
      <Modal
        open={!!selectedModel}
        onClose={() => setSelectedModel(null)}
        title="Ajouter au garage"
        footer={
          <>
            <CTAButton variant="ghost" onClick={() => setSelectedModel(null)}>
              Annuler
            </CTAButton>
            <CTAButton variant="accent" onClick={handleAdd} loading={isAdding}>
              {isAdding ? 'Ajout…' : 'Ajouter'}
            </CTAButton>
          </>
        }
      >
        {selectedModel && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 bg-carbon-surface2 rounded-xl border border-carbon-hairline">
              <BrandAvatar brand={selectedModel.brand} size={40} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-carbon-ink truncate">
                  {selectedModel.brand} {selectedModel.model}
                  {selectedModel.year ? ` (${selectedModel.year})` : ''}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <FuelBadge fuelType={selectedModel.fuelType} />
                  <span className="text-[11px] text-carbon-muted font-mono">
                    {selectedModel.consumption}{' '}
                    {selectedModel.fuelType === 'ELECTRIC' ? 'kWh' : 'L'}/100km
                  </span>
                </div>
              </div>
            </div>

            <Input
              label="Surnom (optionnel)"
              placeholder="Ex. Ma citadine"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <Input
              label="Plaque d'immatriculation (optionnel)"
              placeholder="AB-123-CD"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
            />

            {selectedModel.fuelType === 'ELECTRIC' && (
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
                  label="Prix borne publique (€/kWh)"
                  type="number"
                  step="0.0001"
                  placeholder="0.4500"
                  value={publicPrice}
                  onChange={(e) => setPublicPrice(e.target.value)}
                />
                <p className="text-xs text-carbon-muted">
                  Requis pour calculer le coût de recharge.
                </p>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Model card ─────────────────────────────────────────────────────
function ModelCard({
  model,
  onSelect,
}: {
  model: VehicleModel;
  onSelect: (m: VehicleModel) => void;
}) {
  const isEv = model.fuelType === 'ELECTRIC';
  const capacity = isEv ? model.batteryCapacityKwh : model.tankCapacityLiters;

  return (
    <button
      type="button"
      onClick={() => onSelect(model)}
      className="group flex flex-col gap-2.5 p-3.5 text-left rounded-card border border-carbon-hairline bg-carbon-surface hover:border-carbon-accent hover:bg-blue-500/[0.04] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-carbon-ink truncate">{model.model}</p>
          {model.year ? (
            <p className="text-[11px] text-carbon-muted font-mono">{model.year}</p>
          ) : null}
        </div>
        <FuelBadge fuelType={model.fuelType} className="shrink-0" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-carbon-muted font-mono">
          {model.consumption} {isEv ? 'kWh' : 'L'}/100
          {capacity ? ` · ${capacity} ${isEv ? 'kWh' : 'L'}` : ''}
        </span>
        <span
          aria-hidden="true"
          className="w-6 h-6 shrink-0 rounded-full border border-carbon-hairline text-carbon-muted flex items-center justify-center group-hover:bg-carbon-accent group-hover:text-white group-hover:border-transparent transition-colors"
        >
          <Plus size={13} />
        </span>
      </div>
    </button>
  );
}
