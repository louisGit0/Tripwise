'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Monitor } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { logout } from '@/lib/auth';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [locale, setLocaleState] = useState(
    typeof document !== 'undefined'
      ? document.cookie.split('; ').find((r) => r.startsWith('locale='))?.split('=')[1] ?? 'fr'
      : 'fr',
  );

  const THEMES = [
    { value: 'light', label: t('themeLight'), icon: Sun },
    { value: 'dark', label: t('themeDark'), icon: Moon },
    { value: 'system', label: t('themeSystem'), icon: Monitor },
  ];

  const LOCALES = [
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'en', label: '🇬🇧 English' },
  ];

  const handleLocaleChange = (value: string) => {
    setLocaleState(value);
    document.cookie = `locale=${value}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>

      {/* Theme */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('theme')}</h2>
        <div className="flex gap-2">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={[
                'flex-1 flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs font-medium transition-colors',
                theme === value
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Language */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('language')}</h2>
        <div className="flex gap-2">
          {LOCALES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleLocaleChange(value)}
              className={[
                'flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors',
                locale === value
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Account */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('account')}</h2>
        <Button variant="destructive" size="sm" onClick={() => setLogoutOpen(true)}>
          {t('logout')}
        </Button>
      </Card>

      <Modal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title={t('logoutConfirm')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setLogoutOpen(false)}>{tc('cancel')}</Button>
            <Button variant="destructive" size="sm" onClick={handleLogout}>{t('logout')}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('logoutConfirmDesc')}</p>
      </Modal>
    </div>
  );
}
