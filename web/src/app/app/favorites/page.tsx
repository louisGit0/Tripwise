'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Star, Trash2, MapPin, Navigation, ArrowRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/providers/ToastProvider';
import api from '@/lib/api';
import type { Favorite } from '@/types/api';

export default function FavoritesPage() {
  const t = useTranslations('favorites');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const router = useRouter();

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<Favorite | null>(null);

  useEffect(() => {
    api.get<Favorite[]>('/favorites')
      .then((res) => setFavorites(res.data))
      .catch(() => toast(tc('error'), 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/favorites/${toDelete.id}`);
      setFavorites((prev) => prev.filter((f) => f.id !== toDelete.id));
      toast(t('deleteSuccess'), 'success');
    } catch {
      toast(tc('error'), 'error');
    } finally {
      setToDelete(null);
    }
  };

  const handleUse = (f: Favorite) => {
    const params = new URLSearchParams({
      originLabel: f.originLabel,
      originLat: f.originLat.toString(),
      originLng: f.originLng.toString(),
      destinationLabel: f.destinationLabel,
      destinationLat: f.destinationLat.toString(),
      destinationLng: f.destinationLng.toString(),
      ...(f.vehicleId ? { vehicleId: f.vehicleId } : {}),
    });
    router.push(`/app/dashboard?${params.toString()}`);
  };

  if (loading) {
    return <div className="text-slate-500 dark:text-slate-400 text-sm">{tc('loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>

      {favorites.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Star className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('empty')}</p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {favorites.map((f) => (
            <Card key={f.id} padding="md">
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{f.name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3 w-3 shrink-0 text-primary-500" />
                    <span className="truncate">{f.originLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Navigation className="h-3 w-3 shrink-0 text-red-500" />
                    <span className="truncate">{f.destinationLabel}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 items-start">
                  <Button variant="secondary" size="sm" onClick={() => handleUse(f)}>
                    <ArrowRight className="h-4 w-4" />
                    {t('use')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setToDelete(f)} aria-label={t('delete')}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t('deleteConfirm')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setToDelete(null)}>{tc('cancel')}</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>{t('delete')}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('deleteConfirmDesc')}</p>
      </Modal>
    </div>
  );
}
