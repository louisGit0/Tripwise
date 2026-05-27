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
      .get<GeocodeFeature[]>('/trips/geocode', {
        params: { q: debouncedQuery, country: 'fr', limit: 5 },
      })
      .then(({ data }) => {
        if (!cancelled) {
          setSuggestions(Array.isArray(data) ? data : []);
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
      <label className="text-xs font-semibold tracking-wider uppercase text-carbon-muted">
        {label}
      </label>
      <div className="relative">
        <MapPin
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-carbon-muted pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-2.5 bg-carbon-surface border border-carbon-hairline rounded-xl text-sm text-carbon-ink placeholder:text-carbon-muted focus:outline-none focus:ring-2 focus:ring-carbon-accent focus:border-carbon-accent transition-colors"
        />
        {isLoading && (
          <LoaderCircle
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-carbon-muted animate-spin pointer-events-none"
          />
        )}
      </div>
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-carbon-surface border border-carbon-hairline rounded-xl shadow-2xl max-h-60 overflow-auto">
          {suggestions.map((feature, idx) => (
            <li
              key={feature.id}
              className={`px-4 py-2.5 cursor-pointer hover:bg-carbon-surface2 text-sm text-carbon-ink transition-colors ${
                idx === 0 ? 'rounded-t-xl' : ''
              } ${idx === suggestions.length - 1 ? 'rounded-b-xl' : 'border-b border-carbon-hairline'}`}
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
