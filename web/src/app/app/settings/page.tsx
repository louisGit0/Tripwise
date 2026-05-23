'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Monitor, Globe } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { logout } from '@/lib/auth';

type Theme = 'light' | 'dark' | 'system';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tAuth = useTranslations('auth');
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('themeLight'), icon: <Sun size={16} /> },
    { value: 'dark', label: t('themeDark'), icon: <Moon size={16} /> },
    { value: 'system', label: t('themeSystem'), icon: <Monitor size={16} /> },
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

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Theme */}
      <Card>
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Sun size={18} className="text-primary-600" />
          {t('theme')}
        </h2>
        <div className="flex gap-2">
          {themes.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-xs font-medium transition-all ${
                theme === value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'border-[var(--border)] hover:bg-[var(--card)]'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Language */}
      <Card>
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Globe size={18} className="text-primary-600" />
          {t('language')}
        </h2>
        <div className="flex gap-2">
          {(['fr', 'en'] as const).map((locale) => {
            const label = locale === 'fr' ? t('french') : t('english');
            const currentLocale =
              typeof document !== 'undefined'
                ? document.cookie.match(/locale=([^;]*)/)?.[1] ?? 'fr'
                : 'fr';
            return (
              <button
                key={locale}
                onClick={() => changeLocale(locale)}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                  currentLocale === locale
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'border-[var(--border)] hover:bg-[var(--card)]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Account */}
      <Card>
        <h2 className="font-semibold mb-4">{t('account')}</h2>
        <Button variant="destructive" onClick={handleLogout} className="w-full">
          {tAuth('logout')}
        </Button>
      </Card>
    </div>
  );
}
