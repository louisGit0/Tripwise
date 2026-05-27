'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowRight, Trash2, Navigation } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type { Favorite } from '@/types/api';

export default function FavoritesPage() {
  const t = useTranslations('favorites');
  const tCommon = useTranslations('common');
  const { showToast } = useToast();
  const router = useRouter();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Favorite | null>(null);

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get<Favorite[]>('/favorites');
      setFavorites(data);
    } catch {
      showToast('error', tCommon('error'));
    } finally {
      setIsLoading(false);
    }
  }, [showToast, tCommon]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  function handleUse(fav: Favorite) {
    const params = new URLSearchParams({
      originLabel: fav.originLabel,
      originLat: String(fav.originLat),
      originLng: String(fav.originLng),
      destinationLabel: fav.destinationLabel,
      destinationLat: String(fav.destinationLat),
      destinationLng: String(fav.destinationLng),
      ...(fav.vehicleId ? { vehicleId: fav.vehicleId } : {}),
    });
    router.push(`/app/dashboard?${params.toString()}`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/favorites/${deleteTarget.id}`);
      setDeleteTarget(null);
      showToast('success', tCommon('success'));
      await loadFavorites();
    } catch {
      showToast('error', tCommon('error'));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Eyebrow className="mb-1">{t('title')}</Eyebrow>
        <h1 className="text-2xl font-bold font-display text-carbon-ink">{t('title')}</h1>
      </div>

      {isLoading ? (
        <p className="text-sm text-carbon-muted">{tCommon('loading')}</p>
      ) : favorites.length === 0 ? (
        <SectionCard padding="lg">
          <p className="text-center text-carbon-muted py-6 text-sm">{t('empty')}</p>
        </SectionCard>
      ) : (
        <div className="flex flex-col gap-2">
          {favorites.map((fav, index) => (
            <SectionCard key={fav.id} padding="none">
              <div className="flex items-center gap-4 px-4 py-3.5">
                {/* Index badge */}
                <span className="shrink-0 w-6 h-6 rounded-full bg-carbon-surface2 border border-carbon-hairline flex items-center justify-center text-[10px] font-mono text-carbon-muted">
                  {index + 1}
                </span>

                {/* Route info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-carbon-ink truncate text-sm">{fav.name}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] text-carbon-muted">
                    <span className="truncate max-w-[110px]">{fav.originLabel}</span>
                    <ArrowRight size={9} className="shrink-0" aria-hidden="true" />
                    <span className="truncate max-w-[110px]">{fav.destinationLabel}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <CTAButton
                    variant="surface"
                    size="sm"
                    icon={<Navigation size={13} />}
                    onClick={() => handleUse(fav)}
                  >
                    {t('use')}
                  </CTAButton>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(fav)}
                    aria-label={tCommon('delete')}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-carbon-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {index < favorites.length - 1 && <Hairline />}
            </SectionCard>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('deleteConfirm')}
        footer={
          <>
            <CTAButton variant="ghost" onClick={() => setDeleteTarget(null)}>
              {tCommon('cancel')}
            </CTAButton>
            <CTAButton variant="danger" onClick={handleDelete}>
              {tCommon('delete')}
            </CTAButton>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-sm text-carbon-ink2">
            <strong className="text-carbon-ink">{deleteTarget.name}</strong>
            <br />
            <span className="text-carbon-muted text-xs">
              {deleteTarget.originLabel} → {deleteTarget.destinationLabel}
            </span>
          </p>
        )}
      </Modal>
    </div>
  );
}
