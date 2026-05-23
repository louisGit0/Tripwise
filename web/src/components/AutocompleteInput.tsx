'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, LoaderCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import type { GeoPoint, GeocodeFeature } from '@/types/api';

interface AutocompleteInputProps {
  label: string;
  placeholder?: string;
  onSelect: (point: GeoPoint) => void;
  defaultValue?: string;
}

export function AutocompleteInput({
  label,
  placeholder,
  onSelect,
  defaultValue = '',
}: AutocompleteInputProps) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<GeocodeFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    apiClient
      .get<{ features: GeocodeFeature[] }>('/trips/geocode', {
        params: { q: debouncedQuery, country: 'fr', limit: 5 },
      })
      .then(({ data }) => {
        if (!cancelled) {
          setSuggestions(data.features ?? []);
          setIsOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>
      <div className="relative">
        <MapPin
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-[var(--muted)]"
        />
        {isLoading && (
          <LoaderCircle
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] animate-spin"
          />
        )}
      </div>
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl max-h-60 overflow-auto">
          {suggestions.map((feature) => (
            <li
              key={feature.id}
              className="px-4 py-2.5 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 text-sm transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                setQuery(feature.place_name);
                setIsOpen(false);
                setSuggestions([]);
                onSelect({
                  lat: feature.center[1],
                  lng: feature.center[0],
                  label: feature.place_name,
                });
              }}
            >
              {feature.place_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
