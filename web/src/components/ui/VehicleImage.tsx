'use client';

import { useEffect, useState } from 'react';
import { BrandAvatar, brandHue } from '@/components/ui/BrandAvatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiClient } from '@/lib/api';
import type { CatalogImageResult, FuelType } from '@/types/api';

interface VehicleImageProps {
  brand: string;
  model: string;
  /** Carried for caller consistency / future fuel-aware treatment. */
  fuelType: FuelType;
  className?: string;
}

type ImageState =
  | { status: 'loading' }
  | { status: 'image'; url: string }
  | { status: 'placeholder' };

/**
 * Photo-or-stylized-brand-placeholder visual for a catalog model.
 *
 * Fetches the vehicle photo via `GET /vehicles/catalog/image` (the 07-01 server
 * endpoint — the CarImages key never reaches the browser) and, on a null result
 * OR any failure OR a dead CDN URL (`onError`), falls back to a designed brand
 * placeholder tinted with the stable per-brand hue. It NEVER throws and NEVER
 * shows a broken image. A fixed aspect-ratio frame reserves the space up-front,
 * so loading the photo causes no layout shift (CWV: no CLS).
 */
export function VehicleImage({ brand, model, className = '' }: VehicleImageProps) {
  const [state, setState] = useState<ImageState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        const { data } = await apiClient.get<CatalogImageResult>('/vehicles/catalog/image', {
          params: { make: brand, model },
        });
        if (cancelled) return;
        if (data?.imageUrl) setState({ status: 'image', url: data.imageUrl });
        else setState({ status: 'placeholder' });
      } catch {
        // Network / non-2xx / parse failure → degrade to the placeholder (never throw).
        if (!cancelled) setState({ status: 'placeholder' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [brand, model]);

  // Stable per-brand hue → a designed, brand-tinted placeholder (not a flat gray box).
  const hue = brandHue(brand);
  const tint = `radial-gradient(circle at 50% 35%, hsl(${hue} 50% 22% / 0.6), transparent 72%)`;

  return (
    <div
      className={`relative aspect-[16/10] overflow-hidden rounded-card bg-carbon-surface2 ${className}`}
    >
      {state.status === 'loading' && (
        <Skeleton width="100%" height="100%" rounded="rounded-card" className="absolute inset-0" />
      )}

      {state.status === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element -- CarImages CDN host is not configured for next/image; native <img> is the intended (image-context, XSS-safe) renderer per the threat model.
        <img
          src={state.url}
          alt={`${brand} ${model}`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain"
          onError={() => setState({ status: 'placeholder' })}
        />
      )}

      {state.status === 'placeholder' && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: tint }}
          aria-label={`${brand} ${model}`}
        >
          <BrandAvatar brand={brand} size={52} />
        </div>
      )}
    </div>
  );
}
