'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Sun, Moon, LogOut } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';
import { logout } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import type { UserProfile } from '@/types/api';

type Theme = 'light' | 'dark';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // ── Hydration guard ─────────────────────────────────────────
  // next-themes resolves the active theme only on the client.
  // Rendering theme-conditional UI during SSR causes a mismatch.
  // Return a neutral skeleton until the component is mounted.
  const [mounted, setMounted] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setMounted(true);
    apiClient.get<UserProfile>('/auth/me').then(({ data }) => setUserProfile(data)).catch(() => null);
  }, []);

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'dark',  label: 'Sombre', icon: <Moon size={15} /> },
    { value: 'light', label: 'Clair',  icon: <Sun size={15} /> },
  ];

  async function handleLogout() {
    await logout();
    router.push('/login');
    router.refresh();
  }

  // ── Skeleton while mounting (no theme-conditional rendering) ─
  if (!mounted) {
    return (
      <div className="flex flex-col gap-6 max-w-md">
        <div>
          <div className="h-3 w-16 rounded bg-carbon-surface2 mb-2" />
          <div className="h-8 w-32 rounded bg-carbon-surface2" />
        </div>
        <div className="h-[112px] rounded-xl bg-carbon-surface2" />
        <div className="h-[76px] rounded-xl bg-carbon-surface2" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-md">
      {/* Header */}
      <div>
        <Eyebrow className="mb-1">Paramètres</Eyebrow>
        <h1 className="text-2xl font-bold font-display text-carbon-ink">Paramètres</h1>
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
              className={[
                'flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-xs font-medium transition-all',
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
        {userProfile && (
          <div className="mb-4 space-y-1">
            {userProfile.displayName && (
              <p className="text-sm font-semibold text-carbon-ink">{userProfile.displayName}</p>
            )}
            <p className="text-xs text-carbon-muted">{userProfile.email}</p>
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

      {/* Version */}
      <p className="text-[11px] text-carbon-muted font-mono text-center">
        Version · v2.4 — BUILD 0521
      </p>
    </div>
  );
}
