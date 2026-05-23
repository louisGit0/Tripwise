'use client';

import { useEffect, useRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { NearbyStation } from '@/types/api';

interface MapboxMapProps {
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  origin: { lat: number; lng: number; label?: string };
  destination: { lat: number; lng: number; label?: string };
  stations?: NearbyStation[];
  className?: string;
}

export default function MapboxMap({
  geometry,
  origin,
  destination,
  stations,
  className = 'w-full h-80 rounded-xl overflow-hidden',
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let map: import('mapbox-gl').Map | undefined;

    (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
      if (!token) {
        console.warn('[MapboxMap] NEXT_PUBLIC_MAPBOX_TOKEN is not set');
      }
      mapboxgl.accessToken = token;

      map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [origin.lng, origin.lat],
        zoom: 9,
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        if (!map) return;

        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry },
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#3b82f6', 'line-width': 4 },
        });

        new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([origin.lng, origin.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(origin.label ?? 'Départ'))
          .addTo(map);

        new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([destination.lng, destination.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(destination.label ?? 'Arrivée'))
          .addTo(map);

        if (stations) {
          for (const station of stations) {
            const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(
              `<p class="font-semibold text-xs">${station.name}</p>${station.powerKw ? `<p class="text-xs">${station.powerKw} kW</p>` : ''}${station.address ? `<p class="text-xs text-gray-500">${station.address}</p>` : ''}`,
            );
            new mapboxgl.Marker({ color: '#22c55e', scale: 0.7 })
              .setLngLat([station.lng, station.lat])
              .setPopup(popup)
              .addTo(map!);
          }
        }

        const bounds = new mapboxgl.LngLatBounds();
        geometry.coordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      });
    })();

    return () => {
      map?.remove();
    };
  }, [geometry, origin, destination, stations]);

  return <div ref={containerRef} className={className} />;
}
