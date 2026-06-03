'use client';

import { useEffect, useState } from 'react';
import { BrandAvatar, brandHue } from '@/components/ui/BrandAvatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiClient } from '@/lib/api';
import type { FuelType } from '@/types/api';

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
 * Fetches the vehicle photo BYTES via `GET /vehicles/catalog/image` (the byte-proxy
 * server endpoint — the CarImages signed URL and api_key never reach the browser).
 * The 200 response is an image blob → we wrap it in an object URL; a 204 / empty /
 * any failure (or a dead blob via `onError`) falls back to a designed brand
 * placeholder tinted with the stable per-brand hue. It NEVER throws and NEVER
 * shows a broken image. A fixed aspect-ratio frame reserves the space up-front, so
 * loading the photo causes no layout shift (CWV: no CLS). The object URL is revoked
 * on cleanup / prop change to avoid leaking blob memory.
 */
export function VehicleImage({ brand, model, className = '' }: VehicleImageProps) {
  const [state, setState] = useState<ImageState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setState({ status: 'loading' });

    (async () => {
      try {
        const res = await apiClient.get<Blob>('/vehicles/catalog/image', {
          params: { make: brand, model },
          responseType: 'blob',
          // 204 (miss) is a valid, non-error outcome → handle it as a placeholder
          // rather than letting axios reject it.
          validateStatus: (s) => s === 200 || s === 204,
        });
        if (cancelled) return;

        const blob = res.data;
        if (res.status === 200 && blob instanceof Blob && blob.size > 0) {
          objectUrl = URL.createObjectURL(blob);
          setState({ status: 'image', url: objectUrl });
        } else {
          setState({ status: 'placeholder' });
        }
      } catch {
        // Network / non-2xx / parse failure → degrade to the placeholder (never throw).
        if (!cancelled) setState({ status: 'placeholder' });
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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
        // eslint-disable-next-line @next/next/no-img-element -- src is a local blob: object URL (not a remote host), so next/image optimization does not apply; native <img> is the intended renderer.
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
