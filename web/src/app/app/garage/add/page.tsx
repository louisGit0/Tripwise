'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { FuelBadge } from '@/components/ui/FuelBadge';
import { BrandAvatar } from '@/components/ui/BrandAvatar';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/providers/ToastProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/lib/api';
import type { VehicleModel, UserVehicle, CatalogPage } from '@/types/api';

type Step = 1 | 2;

export default function AddVehiclePage() {
  const t = useTranslations('garage.add');
  const tGarage = useTranslations('garage');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<VehicleModel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);

  // Step 2 fields
  const [nickname, setNickname] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [homePrice, setHomePrice] = useState('');
  const [publicPrice, setPublicPrice] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // Search catalog
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    apiClient
      .get<CatalogPage>('/vehicles/catalog', {
        params: { search: debouncedSearch, limit: 20 },
      })
      .then(({ data }) => setResults(data.data ?? []))
      .catch(() => setResults([]))
      .finally(() => setIsSearching(false));
  }, [debouncedSearch]);

  function handleSelectModel(model: VehicleModel) {
    setSelectedModel(model);
    setStep(2);
  }

  function handleBack() {
    if (step === 2) {
      setStep(1);
    } else {
      router.push('/app/garage');
    }
  }

  async function handleAdd() {
    if (!selectedModel) return;
    const isElectric = selectedModel.fuelType === 'ELECTRIC';
    if (isElectric && (!homePrice || !publicPrice)) {
      showToast('error', tGarage('electricPricesRequired'));
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
      showToast('success', tCommon('success'));
      router.push(`/app/garage/${data.id}`);
    } catch {
      showToast('error', tCommon('error'));
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1 text-xs text-carbon-muted hover:text-carbon-accent transition-colors mb-3"
        >
          <ChevronLeft size={13} />
          {tCommon('back')}
        </button>
        <Eyebrow className="mb-0.5">
          {step === 1 ? t('step1Eyebrow') : t('step2Eyebrow')}
        </Eyebrow>
        <h1 className="text-2xl font-bold font-display text-carbon-ink">
          {step === 1 ? t('step1Title') : t('step2Title')}
        </h1>
      </div>

      {/* ── Step 1: Model search ──────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <Input
            placeholder={t('searchBrand')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          {isSearching && (
            <p className="text-sm text-carbon-muted">{tCommon('loading')}</p>
          )}

          {!isSearching && search.length >= 2 && results.length === 0 && (
            <p className="text-sm text-carbon-muted text-center py-6">{t('noModels')}</p>
          )}

          {results.length > 0 && (
            <SectionCard padding="none">
              <div className="flex flex-col divide-y divide-carbon-hairline">
                {results.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelectModel(model)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-carbon-surface2 transition-colors text-left w-full"
                  >
                    <BrandAvatar brand={model.brand} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-carbon-ink">
                        {model.brand} {model.model}
                        {model.year ? ` (${model.year})` : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <FuelBadge fuelType={model.fuelType} />
                        <span className="text-[11px] text-carbon-muted font-mono">
                          {model.consumption} {model.fuelType === 'ELECTRIC' ? 'kWh' : 'L'}/100km
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-carbon-muted shrink-0" />
                  </button>
                ))}
              </div>
            </SectionCard>
          )}

          {search.length < 2 && (
            <p className="text-xs text-carbon-muted text-center pt-4">
              Saisir au moins 2 caractères pour rechercher
            </p>
          )}
        </div>
      )}

      {/* ── Step 2: Configure vehicle ─────────────────────────── */}
      {step === 2 && selectedModel && (
        <div className="flex flex-col gap-4">
          {/* Selected model preview */}
          <SectionCard padding="md">
            <div className="flex items-center gap-3">
              <BrandAvatar brand={selectedModel.brand} size={48} />
              <div>
                <p className="text-base font-semibold text-carbon-ink">
                  {selectedModel.brand} {selectedModel.model}
                  {selectedModel.year ? ` (${selectedModel.year})` : ''}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <FuelBadge fuelType={selectedModel.fuelType} />
                  <span className="text-xs text-carbon-muted font-mono">
                    {selectedModel.consumption}{' '}
                    {selectedModel.fuelType === 'ELECTRIC' ? 'kWh' : 'L'}/100km
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Configuration fields */}
          <SectionCard padding="md">
            <div className="flex flex-col gap-4">
              <Input
                label={t('nickname')}
                placeholder={t('nicknamePlaceholder')}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <Input
                label={t('plate')}
                placeholder={t('platePlaceholder')}
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
              />
              {selectedModel.fuelType === 'ELECTRIC' && (
                <>
                  <Input
                    label={t('homePrice')}
                    type="number"
                    step="0.0001"
                    placeholder={t('homePricePlaceholder')}
                    value={homePrice}
                    onChange={(e) => setHomePrice(e.target.value)}
                  />
                  <Input
                    label={t('publicPrice')}
                    type="number"
                    step="0.0001"
                    placeholder={t('publicPricePlaceholder')}
                    value={publicPrice}
                    onChange={(e) => setPublicPrice(e.target.value)}
                  />
                  <p className="text-xs text-carbon-muted">{t('electricRequired')}</p>
                </>
              )}
            </div>
          </SectionCard>

          {/* CTA */}
          <div className="flex gap-3">
            <CTAButton
              variant="ghost"
              size="md"
              onClick={() => setStep(1)}
            >
              {t('back')}
            </CTAButton>
            <CTAButton
              variant="accent"
              size="md"
              onClick={handleAdd}
              loading={isAdding}
              className="flex-1"
            >
              {isAdding ? t('adding') : t('addVehicle')}
            </CTAButton>
          </div>
        </div>
      )}
    </div>
  );
}
