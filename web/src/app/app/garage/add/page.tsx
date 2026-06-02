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
import { Skeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type { VehicleModel, UserVehicle, CatalogPage } from '@/types/api';

// Canonical focus token — applied to every interactive element.
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg';

// ── Fuel filter chips ────────────────────────────────────────────
const FUEL_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'ev', label: 'Électrique' },
  { key: 'essence', label: 'Essence' },
  { key: 'diesel', label: 'Diesel' },
  { key: 'gpl', label: 'GPL' },
  { key: 'e85', label: 'E85' },
];

// Map the active chip → a SINGLE server-side fuel param (no client multi-type filter).
function fuelParams(key: string): Record<string, string> {
  switch (key) {
    case 'ev':
      return { fuelCategory: 'ev' };
    case 'essence':
      return { fuelCategory: 'gas' };
    case 'diesel':
      return { fuelCategory: 'diesel' };
    case 'gpl':
      return { fuelCategory: 'gpl' };
    case 'e85':
      return { fuelType: 'E85' };
    default:
      return {};
  }
}

const PAGE_SIZE = 60;
const brandSlug = (brand: string) => `brand-${brand.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;

export default function AddVehiclePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [fuelFilter, setFuelFilter] = useState('all');
  const debounced = useDebounce(search, 300);

  // ── Server-side search + pagination state ───────────────────────
  const [items, setItems] = useState<VehicleModel[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ── Config (step 2) state ───────────────────────────────────────
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
  const [nickname, setNickname] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [homePrice, setHomePrice] = useState('');
  const [publicPrice, setPublicPrice] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // ── Reset to page 1 whenever the query (search / filter) changes ─
  useEffect(() => {
    setPage(1);
  }, [debounced, fuelFilter]);

  // ── Server-side loader: page 1 REPLACES, page > 1 APPENDS ───────
  // Deps include `page`; when search/filter change, the reset effect
  // sets page→1, which re-runs this effect and cancels any in-flight
  // higher-page fetch (so a lingering page>1 never wrongly appends).
  useEffect(() => {
    let cancelled = false;
    const isFirstPage = page === 1;
    if (isFirstPage) setIsLoading(true);
    else setIsLoadingMore(true);

    (async () => {
      try {
        const { data } = await apiClient.get<CatalogPage>('/vehicles/catalog', {
          params: {
            search: debounced || undefined,
            page,
            limit: PAGE_SIZE,
            ...fuelParams(fuelFilter),
          },
        });
        if (cancelled) return;
        const fetched = data.items ?? [];
        setItems((prev) => (isFirstPage ? fetched : [...prev, ...fetched]));
        setTotalPages(data.totalPages ?? 1);
        setTotal(data.total ?? 0);
      } catch {
        if (!cancelled) showToast('error', 'Impossible de charger le catalogue');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debounced, fuelFilter, page, showToast]);

  // ── Group the accumulated items by brand ────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, VehicleModel[]>();
    for (const m of items) {
      const list = map.get(m.brand);
      if (list) list.push(m);
      else map.set(m.brand, [m]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  }, [items]);

  function jumpToBrand(brand: string) {
    document.getElementById(brandSlug(brand))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function loadMore() {
    if (isLoadingMore) return;
    setPage((p) => p + 1);
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

  const loadedCount = items.length;
  const brandCount = grouped.length;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => router.push('/app/garage')}
          className={`flex items-center gap-1 text-xs text-carbon-muted hover:text-carbon-accent transition-colors mb-3 rounded ${FOCUS_RING}`}
        >
          <ChevronLeft size={13} />
          Retour au garage
        </button>
        <Eyebrow className="mb-0.5">Showroom</Eyebrow>
        <h1 className="text-2xl font-bold font-display text-carbon-ink">Choisir un véhicule</h1>
        <p className="text-sm text-carbon-muted mt-1">
          {isLoading
            ? 'Chargement du catalogue…'
            : `${loadedCount} modèle${loadedCount > 1 ? 's' : ''}${
                total > loadedCount ? ` sur ${total}` : ''
              } · ${brandCount} marque${brandCount > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* ── Sticky toolbar: search + fuel filters ─────────────── */}
      <div className="sticky top-14 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-carbon-bg/95 backdrop-blur-sm border-b border-carbon-hairline">
        <div className="flex flex-col gap-2.5">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-carbon-muted pointer-events-none"
            />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une marque ou un modèle…"
              aria-label="Rechercher une marque ou un modèle"
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Effacer la recherche"
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-carbon-muted hover:text-carbon-ink hover:bg-carbon-surface2 transition-colors ${FOCUS_RING}`}
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
                    'shrink-0 h-7 px-3 rounded-full text-xs font-bold border transition-colors',
                    FOCUS_RING,
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
              <Skeleton width={128} height={20} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} height={80} rounded="rounded-card" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : loadedCount === 0 ? (
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
                  aria-label={`Aller à la marque ${brand}`}
                  className={`inline-flex items-center gap-1.5 h-7 pl-1.5 pr-2.5 rounded-full border border-carbon-hairline bg-carbon-surface hover:border-carbon-accent hover:bg-blue-500/[0.06] transition-colors ${FOCUS_RING}`}
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

          {/* ── Load more (server-side pagination, no load-all) ── */}
          {page < totalPages && (
            <div className="flex justify-center pt-2">
              <CTAButton variant="ghost" size="sm" onClick={loadMore} loading={isLoadingMore}>
                Charger plus ({total - loadedCount})
              </CTAButton>
            </div>
          )}
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
                <p className="text-sm font-bold text-carbon-ink truncate">
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
      aria-label={`Ajouter ${model.brand} ${model.model}${model.year ? ` (${model.year})` : ''} au garage`}
      className="group flex flex-col gap-2.5 p-3.5 text-left rounded-card border border-carbon-hairline bg-carbon-surface hover:border-carbon-accent hover:bg-blue-500/[0.04] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-carbon-ink truncate">{model.model}</p>
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
