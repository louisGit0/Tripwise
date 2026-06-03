'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Sun, Moon, LogOut, PlayCircle, Trash2 } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/providers/ToastProvider';
import { logout } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { ONBOARDING_OPEN_EVENT } from '@/lib/onboarding';
import type { UserProfile } from '@/types/api';

type Theme = 'light' | 'dark';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();

  // ── Hydration guard ─────────────────────────────────────────
  // next-themes resolves the active theme only on the client.
  // Rendering theme-conditional UI during SSR causes a mismatch.
  // Return a neutral skeleton until the component is mounted.
  const [mounted, setMounted] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
    apiClient
      .get<UserProfile>('/auth/me')
      .then(({ data }) => {
        setUserProfile(data);
        setDisplayName(data.displayName ?? '');
      })
      .catch(() => null);
  }, []);

  async function handleSaveName() {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setIsSavingName(true);
    try {
      const { data } = await apiClient.patch<UserProfile>('/users/me', {
        displayName: trimmed,
      });
      setUserProfile(data);
      setDisplayName(data.displayName ?? '');
      showToast('success', 'Pseudo mis à jour');
    } catch {
      showToast('error', 'Une erreur est survenue');
    } finally {
      setIsSavingName(false);
    }
  }

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'dark',  label: 'Sombre', icon: <Moon size={15} /> },
    { value: 'light', label: 'Clair',  icon: <Sun size={15} /> },
  ];

  async function handleLogout() {
    await logout();
    router.push('/login');
    router.refresh();
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    try {
      await apiClient.delete('/users/me');
    } catch {
      // Échec AVANT suppression : on garde la modale ouverte pour réessayer.
      setIsDeleting(false);
      showToast('error', 'La suppression a échoué. Réessayez.');
      return;
    }
    // Le compte est supprimé côté serveur. La purge de session est best-effort :
    // si elle échoue, l'intercepteur 401 nettoiera de toute façon la session.
    try {
      await logout();
    } catch {
      /* ignore */
    }
    setConfirmDelete(false);
    router.push('/');
    router.refresh();
  }

  // ── Skeleton while mounting (no theme-conditional rendering) ─
  if (!mounted) {
    return (
      <div className="flex flex-col gap-6 max-w-md">
        <div className="flex flex-col gap-2">
          <Skeleton width={64} height={12} />
          <Skeleton width={128} height={32} rounded="rounded-lg" />
        </div>
        <Skeleton height={112} rounded="rounded-card" className="w-full" />
        <Skeleton height={76} rounded="rounded-card" className="w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-md">
      {/* Header */}
      <div>
        <Eyebrow className="mb-1">Paramètres</Eyebrow>
        <h1 className="text-display font-bold font-display text-carbon-ink">Paramètres</h1>
      </div>

      {/* ── Appearance ─────────────────────────────────────────── */}
      <SectionCard title="Apparence" padding="md">
        <Hairline className="my-3" />
        <div className="flex gap-2">
          {themes.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={[
                'flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-xs font-normal transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-bg',
                theme === value
                  ? 'border-carbon-accent bg-blue-500/10 text-carbon-accent'
                  : 'border-carbon-hairline bg-carbon-surface2 text-carbon-muted hover:bg-carbon-faint',
              ].join(' ')}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ── Account ────────────────────────────────────────────── */}
      <SectionCard title="Compte" padding="md">
        <Hairline className="my-3" />
        {userProfile ? (
          <div className="mb-4 flex flex-col gap-3">
            <Input
              label="Pseudo"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre pseudo"
              maxLength={40}
            />
            <CTAButton
              variant="accent"
              size="md"
              onClick={handleSaveName}
              loading={isSavingName}
              disabled={!displayName.trim()}
              className="w-full"
            >
              Enregistrer
            </CTAButton>
            <p className="text-xs text-carbon-muted">{userProfile.email}</p>
          </div>
        ) : (
          <div className="mb-4">
            <Skeleton height={64} rounded="rounded-xl" className="w-full" />
          </div>
        )}
        <CTAButton
          variant="danger"
          size="md"
          icon={<LogOut size={14} />}
          onClick={handleLogout}
          className="w-full"
        >
          Se déconnecter
        </CTAButton>
      </SectionCard>

      {/* ── Aide ──────────────────────────────────────────────── */}
      <SectionCard title="Aide" padding="md">
        <Hairline className="my-3" />
        <p className="text-xs text-carbon-muted mb-3">
          Redécouvrez les fonctionnalités de l&apos;application.
        </p>
        <CTAButton
          variant="ghost"
          size="md"
          icon={<PlayCircle size={14} />}
          onClick={() => window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))}
          className="w-full"
        >
          Revoir le tutoriel
        </CTAButton>
      </SectionCard>

      {/* ── Zone de danger ─────────────────────────────────────── */}
      <SectionCard title="Zone de danger" padding="md">
        <Hairline className="my-3" />
        <p className="text-xs text-carbon-muted mb-3">
          La suppression de votre compte est définitive : vos véhicules, trajets et favoris
          seront effacés et ne pourront pas être récupérés.
        </p>
        <CTAButton
          variant="danger"
          size="md"
          icon={<Trash2 size={14} />}
          onClick={() => setConfirmDelete(true)}
          className="w-full"
        >
          Supprimer mon compte
        </CTAButton>
      </SectionCard>

      {/* Version */}
      <p className="text-caption text-carbon-muted font-mono text-center">
        Version · v2.4 — BUILD 0521
      </p>

      {/* Confirmation de suppression de compte */}
      <Modal
        open={confirmDelete}
        onClose={() => {
          if (!isDeleting) setConfirmDelete(false);
        }}
        title="Supprimer définitivement votre compte ?"
        footer={
          <div className="flex gap-2 justify-end">
            <CTAButton
              variant="ghost"
              size="md"
              onClick={() => setConfirmDelete(false)}
              disabled={isDeleting}
            >
              Annuler
            </CTAButton>
            <CTAButton
              variant="danger"
              size="md"
              icon={<Trash2 size={14} />}
              onClick={handleDeleteAccount}
              loading={isDeleting}
            >
              Supprimer mon compte
            </CTAButton>
          </div>
        }
      >
        <p className="text-sm text-carbon-ink2">
          Cette action est irréversible. Toutes vos données — véhicules, trajets et favoris —
          seront définitivement supprimées.
        </p>
      </Modal>
    </div>
  );
}
