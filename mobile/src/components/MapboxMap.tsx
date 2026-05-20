import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Colors, FontSizes } from '@/constants/theme';
import type { TripResult } from '@/src/types/api';

interface MapboxMapProps {
  result: TripResult;
}

// @rnmapbox/maps is not compatible with Expo Go — requires a native build.
// When running in Expo Go, we show an informational placeholder instead.
const isExpoGo = Constants.appOwnership === 'expo';

let MapView: React.ComponentType<object> | null = null;
let Camera: React.ComponentType<object> | null = null;
let ShapeSource: React.ComponentType<object> | null = null;
let LineLayer: React.ComponentType<object> | null = null;
let MarkerView: React.ComponentType<object> | null = null;

if (!isExpoGo) {
  try {
    const Mapbox = require('@rnmapbox/maps');
    Mapbox.default.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');
    MapView = Mapbox.MapView;
    Camera = Mapbox.Camera;
    ShapeSource = Mapbox.ShapeSource;
    LineLayer = Mapbox.LineLayer;
    MarkerView = Mapbox.MarkerView;
  } catch {
    // native module not linked — treat like Expo Go
  }
}

function computeBounds(coords: [number, number][]): {
  ne: [number, number];
  sw: [number, number];
} {
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return {
    ne: [Math.max(...lngs), Math.max(...lats)],
    sw: [Math.min(...lngs), Math.min(...lats)],
  };
}

export function MapboxMap({ result }: MapboxMapProps) {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  if (isExpoGo || !MapView || !Camera || !ShapeSource || !LineLayer || !MarkerView) {
    return (
      <View style={[styles.placeholder, { backgroundColor: c.muted, borderColor: c.border }]}>
        <Text style={[styles.placeholderText, { color: c.mutedFg }]}>
          {t('dashboard.mapUnavailable')}
        </Text>
      </View>
    );
  }

  const coords = result.geometry.coordinates;
  const bounds = computeBounds(coords);
  const routeGeoJSON = {
    type: 'Feature' as const,
    geometry: result.geometry,
    properties: {},
  };

  const origin = coords[0];
  const destination = coords[coords.length - 1];

  const MV = MapView as React.ComponentType<{
    style: object;
    styleURL: string;
  }>;
  const Cam = Camera as React.ComponentType<{
    bounds: { ne: [number, number]; sw: [number, number]; paddingLeft: number; paddingRight: number; paddingTop: number; paddingBottom: number };
    animationDuration: number;
  }>;
  const SS = ShapeSource as React.ComponentType<{
    id: string;
    shape: object;
    children: React.ReactNode;
  }>;
  const LL = LineLayer as React.ComponentType<{
    id: string;
    style: object;
  }>;
  const MkV = MarkerView as React.ComponentType<{
    coordinate: [number, number];
    children: React.ReactNode;
  }>;

  return (
    <View style={styles.map}>
      <MV style={styles.map} styleURL="mapbox://styles/mapbox/streets-v12">
        <Cam
          bounds={{
            ne: bounds.ne,
            sw: bounds.sw,
            paddingLeft: 40,
            paddingRight: 40,
            paddingTop: 40,
            paddingBottom: 40,
          }}
          animationDuration={500}
        />
        <SS id="route" shape={routeGeoJSON}>
          <LL
            id="routeLine"
            style={{ lineColor: '#2563eb', lineWidth: 4, lineJoin: 'round', lineCap: 'round' }}
          />
        </SS>
        <MkV coordinate={origin as [number, number]}>
          <View style={[styles.dot, { backgroundColor: '#16a34a' }]} />
        </MkV>
        <MkV coordinate={destination as [number, number]}>
          <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
        </MkV>
      </MV>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 220, borderRadius: 12, overflow: 'hidden' },
  placeholder: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placeholderText: { fontSize: FontSizes.sm, textAlign: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
});
