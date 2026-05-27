'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, Zap, Fuel } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { CTAButton } from '@/components/ui/CTAButton';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Hairline } from '@/components/ui/Hairline';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/api';
import type { DefaultPrices } from '@/types/api';

const STORAGE_KEY = 'tripwise.userPrices';

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
  gas: 1.75,
  diesel: 1.68,
  e85: 0.88,
  gpl: 0.92,
  evHome: 0.2272,
  evFast: 0.45,
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

function writeStorage(prices: UserPrices) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
}

// ── Price row ─────────────────────────────────────────────────

interface PriceRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
  isSlider?: boolean;
  sliderMax?: number;
}

function PriceRow({ label, value, onChange, unit, step = 0.001, min = 0, max = 5, isSlider, sliderMax = 1 }: PriceRowProps) {
  const [inputVal, setInputVal] = useState(value.toString());

  useEffect(() => {
    setInputVal(value.toFixed(isSlider ? 0 : 4));
  }, [value, isSlider]);

  function handleBlur() {
    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    } else {
      setInputVal(value.toFixed(isSlider ? 0 : 4));
    }
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex-1 text-sm text-carbon-ink2 min-w-0">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        {isSlider && (
          <input
            type="range"
            min={0}
            max={sliderMax}
            step={0.05}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-24 accent-carbon-accent"
          />
        )}
        <div className="flex items-center gap-1 border border-carbon-hairline rounded-lg bg-carbon-surface2 overflow-hidden">
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
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function FuelPricesPage() {
  const { showToast } = useToast();

  const [defaults, setDefaults] = useState<DefaultPrices | null>(null);
  const [loadingDefaults, setLoadingDefaults] = useState(true);
  const [prices, setPrices] = useState<UserPrices>(FALLBACK_DEFAULTS);
  const [mounted, setMounted] = useState(false);

  // Load defaults from API
  useEffect(() => {
    setLoadingDefaults(true);
    apiClient
      .get<DefaultPrices>('/prices/defaults')
      .then(({ data }) => setDefaults(data))
      .catch(() => {})
      .finally(() => setLoadingDefaults(false));
  }, []);

  // Load user prices from localStorage
  useEffect(() => {
    const stored = readStorage();
    if (stored) setPrices(stored);
    else if (defaults) {
      setPrices({
        gas: defaults.gas,
        diesel: defaults.diesel,
        e85: FALLBACK_DEFAULTS.e85,
        gpl: FALLBACK_DEFAULTS.gpl,
        evHome: defaults.evHome,
        evFast: defaults.evFast,
        fastShare: FALLBACK_DEFAULTS.fastShare,
      });
    }
    setMounted(true);
  }, [defaults]);

  function updatePrice(key: keyof UserPrices, value: number) {
    const updated = { ...prices, [key]: value };
    setPrices(updated);
    writeStorage(updated);
    showToast('success', 'Prix mis à jour');
  }

  function handleReset() {
    const base = defaults
      ? {
          gas: defaults.gas,
          diesel: defaults.diesel,
          e85: FALLBACK_DEFAULTS.e85,
          gpl: FALLBACK_DEFAULTS.gpl,
          evHome: defaults.evHome,
          evFast: defaults.evFast,
          fastShare: FALLBACK_DEFAULTS.fastShare,
        }
      : FALLBACK_DEFAULTS;
    setPrices(base);
    writeStorage(base);
    showToast('success', 'Prix mis à jour');
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

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow className="mb-0.5">Carburant · Prix</Eyebrow>
          <h1 className="text-2xl font-bold font-display text-carbon-ink">Carburant / Prix</h1>
          <p className="text-sm text-carbon-muted mt-1 max-w-sm">
            Personnalisez les prix utilisés pour vos calculs en mode distance.
          </p>
        </div>
        <CTAButton
          variant="ghost"
          size="sm"
          icon={<RotateCcw size={13} />}
          onClick={handleReset}
        >
          Réinitialiser
        </CTAButton>
      </div>

      {/* ── API reference prices ───────────────────────────────── */}
      {!loadingDefaults && defaults && (
        <SectionCard
          title={
            <span className="flex items-center gap-1.5">
              <Eyebrow>Prix de référence</Eyebrow>
            </span>
          }
          padding="md"
        >
          <p className="text-xs text-carbon-muted mb-3">Chargés depuis l&apos;API nationale.</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Essence (€/L)', value: defaults.gas, unit: '€/L' },
              { label: 'Diesel (€/L)', value: defaults.diesel, unit: '€/L' },
              { label: 'Domicile (€/kWh)', value: defaults.evHome, unit: '€/kWh' },
              { label: 'Borne rapide (€/kWh)', value: defaults.evFast, unit: '€/kWh' },
            ].map(({ label, value, unit }) => (
              <div
                key={label}
                className="flex items-center justify-between p-3 bg-carbon-surface2 rounded-xl border border-carbon-hairline"
              >
                <span className="text-xs text-carbon-muted truncate mr-2">{label}</span>
                <span className="font-mono text-sm text-carbon-ink font-semibold tabular-nums shrink-0">
                  {value.toFixed(4)} <span className="text-carbon-muted font-normal">{unit}</span>
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {loadingDefaults && (
        <div className="text-sm text-carbon-muted font-mono">Chargement des prix...</div>
      )}

      {/* ── Fuel prices ───────────────────────────────────────── */}
      <SectionCard
        title={
          <span className="flex items-center gap-1.5">
            <Fuel size={13} className="text-carbon-accent" />
            <Eyebrow>Carburants</Eyebrow>
          </span>
        }
        padding="md"
      >
        <p className="text-xs text-carbon-muted mb-1">
          Ces valeurs remplacent les prix par défaut pour le calcul en mode Distance.
        </p>
        <div className="flex flex-col divide-y divide-carbon-hairline">
          <PriceRow label="Essence (€/L)" value={prices.gas} onChange={(v) => updatePrice('gas', v)} unit="€/L" step={0.001} max={5} />
          <PriceRow label="Diesel (€/L)" value={prices.diesel} onChange={(v) => updatePrice('diesel', v)} unit="€/L" step={0.001} max={5} />
          <PriceRow label="E85 (€/L)" value={prices.e85} onChange={(v) => updatePrice('e85', v)} unit="€/L" step={0.001} max={5} />
          <PriceRow label="GPL (€/L)" value={prices.gpl} onChange={(v) => updatePrice('gpl', v)} unit="€/L" step={0.001} max={5} />
        </div>
      </SectionCard>

      {/* ── Electricity prices ────────────────────────────────── */}
      <SectionCard
        title={
          <span className="flex items-center gap-1.5">
            <Zap size={13} className="text-carbon-accent" />
            <Eyebrow>Électricité</Eyebrow>
          </span>
        }
        padding="md"
      >
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
      </SectionCard>

      {/* ── Footer note ───────────────────────────────────────── */}
      <Hairline />
      <p className="text-xs font-mono text-carbon-muted text-center pb-4">
        Prix de référence nationaux France 2026
      </p>
    </div>
  );
}
