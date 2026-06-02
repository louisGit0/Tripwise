import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Colors, Fonts, Radius } from '@/constants/theme';
import client from '@/src/api/client';
import type { CatalogImageResult } from '@/src/types/api';

interface VehicleImageProps {
  brand: string;
  model: string;
  /** Carried for caller consistency / future fuel-aware treatment. */
  fuelType: string;
  style?: StyleProp<ViewStyle>;
}

type ImageState =
  | { status: 'loading' }
  | { status: 'image'; url: string }
  | { status: 'placeholder' };

/** Stable per-brand hue (mirrors the web BrandAvatar) so each brand keeps a
 *  consistent accent across web ↔ mobile placeholders. */
function brandHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return hash % 360;
}

/** 1–2 character brand initials (mirrors the web BrandAvatar). */
function brandInitials(brand: string): string {
  const words = brand.trim().split(/\s+/);
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return brand.slice(0, 2).toUpperCase();
}

/**
 * Photo-or-stylized-brand-placeholder visual for a catalog model (RN).
 *
 * Fetches the vehicle photo via `GET /vehicles/catalog/image` (the 07-01 server
 * endpoint — the CarImages key never reaches the app) and, on a null result OR
 * any failure OR a dead CDN URL (`onError`), falls back to a designed brand
 * placeholder tinted with the stable per-brand hue. It NEVER throws and NEVER
 * shows a broken image. The fixed frame is sized by the caller via `style`, so
 * the photo resolving causes no reflow.
 */
export function VehicleImage({ brand, model, style }: VehicleImageProps) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const [state, setState] = useState<ImageState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    client
      .get<CatalogImageResult>('/vehicles/catalog/image', { params: { make: brand, model } })
      .then((r) => {
        if (cancelled) return;
        const url = r.data?.imageUrl;
        setState(url ? { status: 'image', url } : { status: 'placeholder' });
      })
      .catch(() => {
        // Network / non-2xx / parse failure → degrade to the placeholder (never throw).
        if (!cancelled) setState({ status: 'placeholder' });
      });

    return () => {
      cancelled = true;
    };
  }, [brand, model]);

  const hue = brandHue(brand);

  return (
    <View style={[styles.frame, { backgroundColor: c.surface2 }, style]}>
      {state.status === 'loading' && (
        <View style={styles.fill}>
          <ActivityIndicator color={c.accent} size="small" />
        </View>
      )}

      {state.status === 'image' && (
        <Image
          source={{ uri: state.url }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setState({ status: 'placeholder' })}
        />
      )}

      {state.status === 'placeholder' && (
        // Stylized brand placeholder: a faint per-brand tint over the surface2
        // frame + a centered brand-hued avatar — reads as designed, never a flat
        // gray/broken box. No blue literals: only derived hues + tokens.
        <View style={styles.fill}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: `hsla(${hue}, 55%, 24%, 0.45)` }]} />
          <View style={[styles.avatar, { backgroundColor: `hsl(${hue}, 45%, 18%)` }]}>
            <Text style={[styles.initials, { color: `hsl(${hue}, 80%, 72%)` }]}>
              {brandInitials(brand)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
