import Link from 'next/link';
import { MapPin, Car, Star, Settings } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

const navItems = [
  { href: '/app/dashboard', label: 'Tableau de bord', icon: MapPin },
  { href: '/app/vehicles', label: 'Véhicules', icon: Car },
  { href: '/app/favorites', label: 'Favoris', icon: Star },
  { href: '/app/settings', label: 'Paramètres', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/app/dashboard" className="font-bold text-primary-600 text-lg tracking-tight">
            Tripwise
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="sm:hidden border-t bg-white dark:bg-slate-900 fixed bottom-0 left-0 right-0">
        <div className="flex">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
