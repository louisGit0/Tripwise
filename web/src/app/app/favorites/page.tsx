'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Heart, ArrowRight, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {isLoading ? (
        <p className="text-[var(--muted)] text-sm">{tCommon('loading')}</p>
      ) : favorites.length === 0 ? (
        <Card>
          <p className="text-center text-[var(--muted)] py-8">{t('empty')}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {favorites.map((fav) => (
            <Card key={fav.id} padding="md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center shrink-0">
                    <Heart size={14} className="text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{fav.name}</p>
                    <p className="text-xs text-[var(--muted)] flex items-center gap-1 mt-0.5">
                      <span className="truncate max-w-[120px]">{fav.originLabel}</span>
                      <ArrowRight size={10} className="shrink-0" />
                      <span className="truncate max-w-[120px]">{fav.destinationLabel}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => handleUse(fav)}>
                    {t('use')}
                  </Button>
                  <button
                    onClick={() => setDeleteTarget(fav)}
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

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={tCommon('confirm_delete')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              {tCommon('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {tCommon('delete')}
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-sm">
            {t('deleteConfirm')} <strong>{deleteTarget.name}</strong>
          </p>
        )}
      </Modal>
    </div>
  );
}
