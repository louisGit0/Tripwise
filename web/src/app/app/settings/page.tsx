'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Globe, LogOut } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';
import { logout } from '@/lib/auth';

type Theme = 'light' | 'dark';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tAuth = useTranslations('auth');
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // ── Hydration guard ─────────────────────────────────────────
  // next-themes resolves the active theme only on the client.
  // Rendering theme-conditional UI during SSR causes a mismatch.
  // Return a neutral skeleton until the component is mounted.
  const [mounted, setMounted] = useState(false);
  const [currentLocale, setCurrentLocale] = useState('fr');

  useEffect(() => {
    setMounted(true);
    const match = document.cookie.match(/locale=([^;]*)/);
    setCurrentLocale(match?.[1] ?? 'fr');
  }, []);

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'dark',  label: t('themeDark'),  icon: <Moon size={15} /> },
    { value: 'light', label: t('themeLight'), icon: <Sun size={15} /> },
  ];

  function changeLocale(locale: 'fr' | 'en') {
    document.cookie = `locale=${locale}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
    window.location.reload();
  }

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
        <div className="h-[88px] rounded-xl bg-carbon-surface2" />
        <div className="h-[76px] rounded-xl bg-carbon-surface2" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-md">
      {/* Header */}
      <div>
        <Eyebrow className="mb-1">{t('title')}</Eyebrow>
        <h1 className="text-2xl font-bold font-display text-carbon-ink">{t('title')}</h1>
      </div>

      {/* ── Appearance ─────────────────────────────────────────── */}
      <SectionCard title={t('appearance')} padding="md">
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

      {/* ── Language ───────────────────────────────────────────── */}
      <SectionCard title={t('language')} padding="md">
        <Hairline className="my-3" />
        <div className="flex gap-2">
          {(['fr', 'en'] as const).map((locale) => {
            const label = locale === 'fr' ? t('french') : t('english');
            return (
              <button
                key={locale}
                type="button"
                onClick={() => changeLocale(locale)}
                className={[
                  'flex-1 flex items-center justify-center gap-2 h-9 px-4 rounded-xl border text-sm font-medium transition-all',
                  currentLocale === locale
                    ? 'border-carbon-accent bg-blue-500/10 text-carbon-accent'
                    : 'border-carbon-hairline bg-carbon-surface2 text-carbon-muted hover:bg-carbon-faint',
                ].join(' ')}
              >
                <Globe size={14} />
                {label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ── Account ────────────────────────────────────────────── */}
      <SectionCard title={t('accountSection')} padding="md">
        <Hairline className="my-3" />
        <CTAButton
          variant="danger"
          size="md"
          icon={<LogOut size={14} />}
          onClick={handleLogout}
          className="w-full"
        >
          {tAuth('logout')}
        </CTAButton>
      </SectionCard>

      {/* Version */}
      <p className="text-[11px] text-carbon-muted font-mono text-center">
        {t('version')} · v2.4 — BUILD 0521
      </p>
    </div>
  );
}
