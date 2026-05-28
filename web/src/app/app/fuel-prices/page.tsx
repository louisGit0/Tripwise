'use client';

import { useState, useEffect } from 'react';
import { Save, Zap, Fuel, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type { DefaultPrices } from '@/types/api';

const STORAGE_KEY = 'tripwise.userPrices';
const API_CACHE_KEY = 'tripwise.apiPricesCache';
const SOURCE_KEY = 'tripwise.priceSource';

type PriceSource = 'api' | 'custom';

interface UserPrices {
  gas: number;
  diesel: number;
  e85: number;
  gpl: number;
  evHome: number;
  evFast: number;
  fastShare: number;
}

const FALLBACK_DEFAULTS: UserPrices = {
  gas: 1.85,
  diesel: 1.65,
  e85: 0.88,
  gpl: 0.92,
  evHome: 0.21,
  evFast: 0.49,
  fastShare: 0.3,
};

function readStorage(): UserPrices | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(p: UserPrices) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function readPriceSource(): PriceSource {
  if (typeof window === 'undefined') return 'api';
  try {
    const raw = localStorage.getItem(SOURCE_KEY);
    return raw === 'custom' ? 'custom' : 'api';
  } catch {
    return 'api';
  }
}

function writePriceSource(src: PriceSource) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOURCE_KEY, src);
}

function writeApiCache(defaults: DefaultPrices) {
  if (typeof window === 'undefined') return;
  try {
    const cached: UserPrices = {
      gas:       defaults.gas,
      diesel:    defaults.diesel,
      e85:       defaults.e85 ?? FALLBACK_DEFAULTS.e85,
      gpl:       defaults.gpl ?? FALLBACK_DEFAULTS.gpl,
      evHome:    defaults.evHome,
      evFast:    defaults.evFast,
      fastShare: defaults.fastShare ?? FALLBACK_DEFAULTS.fastShare,
    };
    localStorage.setItem(API_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // ignore storage errors
  }
}

// ── Delta helpers ──────────────────────────────────────────────────────────

function priceDeltaPct(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

interface DeltaBadgeProps {
  current: number;
  previous: number | undefined;
}

function DeltaBadge({ current, previous }: DeltaBadgeProps) {
  const pct = priceDeltaPct(current, previous);
  if (pct === null || Math.abs(pct) < 0.01) return null;

  const isUp = pct > 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-[10px] font-mono font-semibold shrink-0 ${
        isUp ? 'text-red-400' : 'text-emerald-400'
      }`}
    >
      {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {isUp ? '+' : ''}{pct.toFixed(2)} %
    </span>
  );
}

// ── Price row ──────────────────────────────────────────────────────────────

interface PriceRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
}

function PriceRow({ label, value, onChange, unit, step = 0.001, min = 0, max = 5 }: PriceRowProps) {
  const [inputVal, setInputVal] = useState(value.toFixed(4));

  useEffect(() => {
    setInputVal(value.toFixed(4));
  }, [value]);

  function handleBlur() {
    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    } else {
      setInputVal(value.toFixed(4));
    }
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex-1 text-sm text-carbon-ink2 min-w-0">{label}</span>
      <div className="flex items-center gap-1 border border-carbon-hairline rounded-lg bg-carbon-surface2 overflow-hidden shrink-0">
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={handleBlur}
          className="w-[84px] h-8 px-2 text-sm font-mono text-carbon-ink text-right bg-transparent outline-none border-none"
        />
        <span className="pr-2 text-xs font-mono text-carbon-muted shrink-0">{unit}</span>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function FuelPricesPage() {
  const { showToast } = useToast();

  const [defaults, setDefaults] = useState<DefaultPrices | null>(null);
  const [loadingDefaults, setLoadingDefaults] = useState(true);
  const [prices, setPrices] = useState<UserPrices>(FALLBACK_DEFAULTS);
  const [mounted, setMounted] = useState(false);
  const [priceSource, setPriceSourceState] = useState<PriceSource>('api');

  useEffect(() => {
    setLoadingDefaults(true);
    apiClient
      .get<DefaultPrices>('/prices/defaults')
      .then(({ data }) => {
        setDefaults(data);
        writeApiCache(data);
      })
      .catch(() => {})
      .finally(() => setLoadingDefaults(false));
  }, []);

  useEffect(() => {
    const storedSource = readPriceSource();
    setPriceSourceState(storedSource);

    const stored = readStorage();
    if (stored) {
      setPrices(stored);
    } else if (defaults) {
      setPrices({
        gas:       defaults.gas,
        diesel:    defaults.diesel,
        e85:       defaults.e85 ?? FALLBACK_DEFAULTS.e85,
        gpl:       defaults.gpl ?? FALLBACK_DEFAULTS.gpl,
        evHome:    defaults.evHome,
        evFast:    defaults.evFast,
        fastShare: defaults.fastShare ?? FALLBACK_DEFAULTS.fastShare,
      });
    }
    setMounted(true);
  }, [defaults]);

  function handleSourceChange(src: PriceSource) {
    setPriceSourceState(src);
    writePriceSource(src);
    showToast(
      'info',
      src === 'api'
        ? 'Calculs avec les prix officiels en temps réel'
        : 'Calculs avec vos prix personnalisés',
    );
  }

  function updatePrice(key: keyof UserPrices, value: number) {
    setPrices((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    writeStorage(prices);
    showToast('success', 'Prix personnalisés enregistrés');
  }

  function formatSyncTime(iso: string) {
    try {
      return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  }

  if (!mounted) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-carbon-surface2 rounded-xl w-48" />
        <div className="h-48 bg-carbon-surface2 rounded-card" />
        <div className="h-48 bg-carbon-surface2 rounded-card" />
      </div>
    );
  }

  const prev = defaults?.previousPrices;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <Eyebrow className="mb-0.5">Carburant · Prix</Eyebrow>
        <h1 className="text-2xl font-bold font-display text-carbon-ink">Carburant / Prix</h1>
        <p className="text-sm text-carbon-muted mt-1 max-w-sm">
          Consultez les prix en temps réel et choisissez la source utilisée pour vos calculs.
        </p>
      </div>

      {/* ── Toggle source de prix ──────────────────────────────── */}
      <SectionCard padding="md">
        <p className="text-xs font-semibold text-carbon-muted uppercase tracking-wider mb-3">
          Source des prix pour les calculs
        </p>
        <div className="flex rounded-xl overflow-hidden border border-carbon-hairline">
          {(['api', 'custom'] as PriceSource[]).map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => handleSourceChange(src)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                priceSource === src
                  ? 'bg-carbon-accent text-white'
                  : 'bg-carbon-surface2 text-carbon-ink2 hover:bg-carbon-surface'
              }`}
            >
              {src === 'api' ? '📡 Prix officiels' : '✏️ Mes prix'}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-carbon-muted mt-2 leading-relaxed">
          {priceSource === 'api'
            ? 'Les calculs utilisent les prix carburants officiels en temps réel (données gouvernementales françaises).'
            : 'Les calculs utilisent les prix que vous avez saisis ci-dessous.'}
        </p>
      </SectionCard>

      {/* ── Section 1 : Prix en temps réel (read-only) ────────── */}
      <SectionCard
        title={
          <span className="flex items-center gap-1.5">
            <RefreshCw size={13} className="text-carbon-accent" />
            <Eyebrow>Prix en temps réel</Eyebrow>
          </span>
        }
        padding="md"
      >
        {loadingDefaults ? (
          <p className="text-sm text-carbon-muted font-mono">Chargement...</p>
        ) : defaults ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-carbon-muted">
                Source : données nationales France 2026
              </p>
              {defaults.lastUpdate && (
                <span className="text-[10px] font-mono text-carbon-muted bg-carbon-surface2 px-2 py-0.5 rounded-full border border-carbon-hairline">
                  Sync {formatSyncTime(defaults.lastUpdate)}
                </span>
              )}
            </div>
            {prev && (
              <p className="text-[10px] text-carbon-muted mb-2 font-mono">
                Évolution vs veille (dernier rafraîchissement)
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'SP95',        value: defaults.sp95,    prevValue: prev?.sp95,   unit: '€/L' },
                { label: 'SP98',        value: defaults.sp98,    prevValue: prev?.sp98,   unit: '€/L' },
                { label: 'SP95-E10',    value: defaults.e10,     prevValue: prev?.e10,    unit: '€/L' },
                { label: 'Gazole',      value: defaults.gazole,  prevValue: prev?.diesel, unit: '€/L' },
                { label: 'Recharge dom.', value: defaults.evHome, prevValue: prev?.evHome, unit: '€/kWh' },
                { label: 'Borne rapide',  value: defaults.evFast, prevValue: prev?.evFast, unit: '€/kWh' },
              ].map(({ label, value, prevValue, unit }) => (
                <div
                  key={label}
                  className="flex items-center justify-between p-3 bg-carbon-surface2 rounded-xl border border-carbon-hairline gap-2"
                >
                  <span className="text-xs text-carbon-muted truncate mr-1">{label}</span>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="font-mono text-sm text-carbon-ink font-semibold tabular-nums">
                      {value?.toFixed(4)}{' '}
                      <span className="text-carbon-muted font-normal text-[10px]">{unit}</span>
                    </span>
                    <DeltaBadge current={value} previous={prevValue} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-carbon-muted">Impossible de charger les prix de référence.</p>
        )}
      </SectionCard>

      {/* ── Section 2 : Prix personnalisés ────────────────────── */}
      <SectionCard
        title={
          <span className="flex items-center gap-1.5">
            <Fuel size={13} className="text-carbon-accent" />
            <Eyebrow>Prix personnalisés</Eyebrow>
          </span>
        }
        padding="md"
      >
        <p className="text-xs text-carbon-muted mb-1">
          Ces valeurs sont utilisées quand vous avez sélectionné &ldquo;Mes prix&rdquo; ci-dessus.
        </p>
        <Hairline className="my-2" />

        {/* Carburants */}
        <p className="text-xs font-semibold text-carbon-muted uppercase tracking-wider mb-1">Carburants</p>
        <div className="flex flex-col divide-y divide-carbon-hairline">
          <PriceRow label="SP95 / Essence (€/L)" value={prices.gas} onChange={(v) => updatePrice('gas', v)} unit="€/L" step={0.001} max={5} />
          <PriceRow label="Gazole / Diesel (€/L)" value={prices.diesel} onChange={(v) => updatePrice('diesel', v)} unit="€/L" step={0.001} max={5} />
          <PriceRow label="E85 (€/L)" value={prices.e85} onChange={(v) => updatePrice('e85', v)} unit="€/L" step={0.001} max={5} />
          <PriceRow label="GPL (€/L)" value={prices.gpl} onChange={(v) => updatePrice('gpl', v)} unit="€/L" step={0.001} max={5} />
        </div>

        <Hairline className="my-3" />

        {/* Électricité */}
        <p className="text-xs font-semibold text-carbon-muted uppercase tracking-wider mb-1 flex items-center gap-1">
          <Zap size={11} /> Électricité
        </p>
        <div className="flex flex-col divide-y divide-carbon-hairline">
          <PriceRow label="Domicile (€/kWh)" value={prices.evHome} onChange={(v) => updatePrice('evHome', v)} unit="€/kWh" step={0.0001} max={2} />
          <PriceRow label="Borne rapide (€/kWh)" value={prices.evFast} onChange={(v) => updatePrice('evFast', v)} unit="€/kWh" step={0.0001} max={2} />
          <div className="py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-carbon-ink2">Part borne rapide</span>
              <span className="font-mono text-sm text-carbon-accent tabular-nums">
                {Math.round(prices.fastShare * 100)}&thinsp;%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prices.fastShare}
              onChange={(e) => updatePrice('fastShare', parseFloat(e.target.value))}
              className="w-full accent-carbon-accent"
            />
            <div className="flex justify-between text-[10px] font-mono text-carbon-muted">
              <span>100% domicile</span>
              <span>100% borne rapide</span>
            </div>
          </div>
        </div>

        <Hairline className="my-3" />

        {/* Save button */}
        <CTAButton
          variant="accent"
          size="md"
          icon={<Save size={14} />}
          onClick={handleSave}
          className="w-full"
        >
          Enregistrer mes prix
        </CTAButton>
      </SectionCard>

      <Hairline />
      <p className="text-xs font-mono text-carbon-muted text-center pb-4">
        Prix de référence nationaux France 2026
      </p>
    </div>
  );
}
