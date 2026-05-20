'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/lib/api';
import type { GeocodeFeature, GeoPoint } from '@/types/api';

interface Props {
  label: string;
  placeholder: string;
  value: GeoPoint | null;
  onChange: (point: GeoPoint | null) => void;
  icon?: React.ReactNode;
}

export default function AutocompleteInput({ label, placeholder, value, onChange, icon }: Props) {
  const [query, setQuery] = useState(value?.label ?? '');
  const [results, setResults] = useState<GeocodeFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync query text when value changes externally
  useEffect(() => {
    setQuery(value?.label ?? '');
  }, [value]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery === value?.label) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get<GeocodeFeature[]>('/trips/geocode', { params: { q: debouncedQuery, limit: 5 } })
      .then((res) => {
        if (!cancelled) setResults(res.data);
      })
      .catch(() => {/* ignore */})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery, value?.label]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (feature: GeocodeFeature) => {
    const point: GeoPoint = {
      lat: feature.center[1],
      lng: feature.center[0],
      label: feature.place_name,
    };
    onChange(point);
    setQuery(feature.place_name);
    setResults([]);
    setOpen(false);
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (value && val !== value.label) onChange(null);
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon ?? <MapPin className="h-4 w-4" />}
        </div>
        <input
          type="text"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}

        {open && results.length > 0 && (
          <ul className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
            {results.map((feature) => (
              <li key={feature.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(feature)}
                  className="w-full text-left px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {feature.place_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
