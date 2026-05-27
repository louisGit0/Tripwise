'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Navigation,
  Car,
  History,
  Settings,
  Fuel,
  Plus,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { TWAppIcon } from '@/components/ui/TWAppIcon';
import { Wordmark } from '@/components/ui/Wordmark';
import { Hairline } from '@/components/ui/Hairline';
import { StatusDot } from '@/components/ui/StatusDot';

// ── Nav items definition ────────────────────────────────────────
type NavKey = 'dashboard' | 'trips' | 'garage' | 'fuelPrices' | 'settings';

const NAV_LABELS: Record<NavKey, string> = {
  dashboard: 'Dashboard',
  trips: 'Trajets',
  garage: 'Garage',
  fuelPrices: 'Carburant / Prix',
  settings: 'Paramètres',
};

const NAV_ITEMS: Array<{
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  key: NavKey;
  crumb: string;
}> = [
  { href: '/app/dashboard',   icon: Navigation, key: 'dashboard',  crumb: '~/overview' },
  { href: '/app/trips',       icon: History,    key: 'trips',      crumb: '~/trips/log' },
  { href: '/app/garage',      icon: Car,        key: 'garage',     crumb: '~/garage' },
  { href: '/app/fuel-prices', icon: Fuel,       key: 'fuelPrices', crumb: '~/fuel' },
  { href: '/app/settings',    icon: Settings,   key: 'settings',   crumb: '~/settings' },
];

// ── Breadcrumb resolution ───────────────────────────────────────
// /app/favorites is grouped under trips in the nav
function getBreadcrumb(pathname: string): string {
  if (pathname.startsWith('/app/favorites')) return '~/trips/log';
  for (const item of NAV_ITEMS) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.crumb;
    }
  }
  return '~/app';
}

// ── Active state ────────────────────────────────────────────────
// Favorites highlights the TRIPS nav item (arbitrary decision — documented)
function isNavActive(href: string, pathname: string): boolean {
  if (href === '/app/trips') {
    return (
      pathname === '/app/trips' ||
      pathname.startsWith('/app/trips/') ||
      pathname.startsWith('/app/favorites')
    );
  }
  if (href === '/app/dashboard') {
    return pathname === '/app/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ── AppLayout ───────────────────────────────────────────────────
export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const breadcrumb = getBreadcrumb(pathname);

  return (
    <div className="min-h-dvh bg-carbon-bg">

      {/* ── Desktop sidebar (lg+) ───────────────────────────── */}
      <aside
        className={[
          'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30',
          'border-r border-carbon-hairline bg-carbon-surface',
          'transition-[width] duration-200 overflow-hidden',
          collapsed ? 'w-[56px]' : 'w-[220px]',
        ].join(' ')}
      >
        {/* Logo row */}
        <div className="flex items-center h-14 px-3 shrink-0 gap-2.5">
          <TWAppIcon size={30} className="shrink-0" />
          <div
            className={[
              'transition-all duration-200 overflow-hidden whitespace-nowrap',
              collapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100',
            ].join(' ')}
          >
            <Wordmark size="sm" />
          </div>
        </div>

        <Hairline />

        {/* Primary navigation */}
        <nav
          className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5"
          aria-label="Navigation principale"
        >
          {NAV_ITEMS.map(({ href, icon: Icon, key }) => (
            <SidebarItem
              key={href}
              href={href}
              icon={<Icon size={15} />}
              label={NAV_LABELS[key]}
              active={isNavActive(href, pathname)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Bottom: status + version + collapse toggle */}
        <div className="px-2 pb-4 pt-1 shrink-0">
          <Hairline className="mb-3" />

          {/* Status line (hidden when collapsed) */}
          <div
            className={[
              'transition-all duration-200 overflow-hidden',
              collapsed ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100',
            ].join(' ')}
          >
            <div className="px-2 mb-2 flex flex-col gap-1">
              <StatusDot status="online" pulse label="Opérationnel" />
              <p className="text-[10px] font-mono text-carbon-muted leading-snug pl-[18px]">
                status.ok / prices synced · 02m ago
              </p>
            </div>
            <p className="text-[10px] font-mono text-carbon-muted px-2 mb-2 tracking-wide">
              v2.4 — BUILD 0521
            </p>
          </div>

          {/* Collapse toggle */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={
              collapsed ? 'Développer la barre latérale' : 'Réduire la barre latérale'
            }
            className={[
              'flex items-center gap-2 w-full h-8 px-2 rounded-lg',
              'text-[10px] font-mono uppercase tracking-widest text-carbon-muted',
              'hover:text-carbon-ink2 hover:bg-carbon-faint transition-colors',
              collapsed ? 'justify-center' : '',
            ].join(' ')}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            {!collapsed && <span>Réduire</span>}
          </button>
        </div>
      </aside>

      {/* ── Topbar (always visible on all breakpoints) ────── */}
      <header
        className={[
          'fixed top-0 right-0 z-20 h-14 flex items-center justify-between px-4 lg:px-6',
          'border-b border-carbon-hairline bg-carbon-bg/95 backdrop-blur-sm',
          // Full width on mobile; offset by sidebar on desktop
          'left-0 transition-[left] duration-200',
          collapsed ? 'lg:left-[56px]' : 'lg:left-[220px]',
        ].join(' ')}
      >
        {/* Left: mobile logo / desktop breadcrumb */}
        <div className="flex items-center gap-2">
          {/* Mobile: logo + wordmark (sidebar is hidden) */}
          <div className="flex items-center gap-2 lg:hidden">
            <TWAppIcon size={26} />
            <Wordmark size="sm" />
          </div>
          {/* Desktop: breadcrumb in mono */}
          <span className="hidden lg:block text-xs font-mono">
            <span className="text-carbon-ink2">{breadcrumb}</span>
            <span className="text-carbon-muted"> · </span>
            <span className="text-emerald-400">live</span>
          </span>
        </div>

        {/* Right: burger (mobile) + new trip CTA */}
        <div className="flex items-center gap-2">
          {/* Burger — mobile only */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu"
            className="lg:hidden p-2 rounded-lg text-carbon-muted hover:text-carbon-ink2 hover:bg-carbon-faint transition-colors"
          >
            <Menu size={18} />
          </button>

          {/* + NOUVEAU TRAJET — visible on all sizes (icon-only on xs, with label on sm+) */}
          <Link
            href="/app/dashboard"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-carbon-accent text-white text-[10px] font-mono uppercase tracking-widest font-semibold hover:brightness-110 active:brightness-90 transition-all"
          >
            <Plus size={12} aria-hidden="true" />
            <span className="hidden sm:inline">Nouveau trajet</span>
          </Link>
        </div>
      </header>

      {/* ── Mobile drawer (< lg) ────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <aside
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-[220px] flex flex-col bg-carbon-surface border-r border-carbon-hairline"
            aria-label="Menu de navigation"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between h-14 px-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <TWAppIcon size={28} />
                <Wordmark size="sm" />
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Fermer le menu"
                className="p-1.5 rounded-lg text-carbon-muted hover:text-carbon-ink2 hover:bg-carbon-faint transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <Hairline />

            {/* Drawer nav */}
            <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
              {NAV_ITEMS.map(({ href, icon: Icon, key }) => (
                <SidebarItem
                  key={href}
                  href={href}
                  icon={<Icon size={15} />}
                  label={NAV_LABELS[key]}
                  active={isNavActive(href, pathname)}
                  collapsed={false}
                  onClick={closeDrawer}
                />
              ))}
            </nav>

            {/* Drawer footer */}
            <div className="px-4 pb-4 shrink-0">
              <Hairline className="mb-3" />
              <StatusDot status="online" pulse label="Opérationnel" />
              <p className="text-[10px] font-mono text-carbon-muted mt-1 pl-[18px]">
                status.ok / prices synced · 02m ago
              </p>
              <p className="text-[10px] font-mono text-carbon-muted mt-2">
                v2.4 — BUILD 0521
              </p>
            </div>
          </aside>
        </>
      )}

      {/* ── Main content ────────────────────────────────────── */}
      <main
        className={[
          'min-h-dvh pt-14',
          'transition-[padding-left] duration-200',
          collapsed ? 'lg:pl-[56px]' : 'lg:pl-[220px]',
        ].join(' ')}
      >
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// ── SidebarItem ─────────────────────────────────────────────────
interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

function SidebarItem({ href, icon, label, active, collapsed, onClick }: SidebarItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={[
        'relative flex items-center h-8 rounded-lg px-2 transition-colors',
        'text-[10px] font-mono uppercase tracking-widest',
        collapsed ? 'justify-center gap-0' : 'gap-2.5',
        active
          ? 'bg-blue-500/10 text-carbon-accent border border-carbon-hairline'
          : 'text-carbon-muted hover:text-carbon-ink hover:bg-carbon-faint border border-transparent',
      ].join(' ')}
    >
      {/* Icon */}
      <span className="shrink-0">{icon}</span>

      {/* Label (hidden when collapsed) */}
      {!collapsed && (
        <span className="truncate flex-1">{label}</span>
      )}

      {/* Active dot — right side, per design spec */}
      {active && !collapsed && (
        <span
          className="shrink-0 w-1.5 h-1.5 rounded-full bg-carbon-accent"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
