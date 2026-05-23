'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MapPin, Car, Heart, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/app/dashboard', icon: MapPin, key: 'dashboard' },
  { href: '/app/vehicles', icon: Car, key: 'vehicles' },
  { href: '/app/favorites', icon: Heart, key: 'favorites' },
  { href: '/app/settings', icon: Settings, key: 'settings' },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden md:flex items-center justify-between px-6 h-14 bg-[var(--card)] border-b border-[var(--border)] sticky top-0 z-40">
        <span className="font-bold text-lg text-primary-600 tracking-tight">Tripwise</span>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, icon: Icon, key }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)]'
                }`}
              >
                <Icon size={15} />
                {t(key)}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-[var(--card)] border-t border-[var(--border)]">
        <div className="flex">
          {NAV_ITEMS.map(({ href, icon: Icon, key }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                  active ? 'text-primary-600' : 'text-[var(--muted)]'
                }`}
              >
                <Icon size={20} />
                {t(key)}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="h-16 md:hidden" aria-hidden />
    </>
  );
}
