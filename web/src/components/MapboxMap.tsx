'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { ChargingStation } from '@/types/api';

interface Props {
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  chargingStations?: ChargingStation[];
}

export default function MapboxMap({ geometry, chargingStations = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: geometry.coordinates[0],
      zoom: 6,
    });

    mapRef.current = map;

    map.on('load', () => {
      // Route line
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry },
      });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2563eb', 'line-width': 4 },
      });

      // Fit to route bounds
      const coords = geometry.coordinates;
      const bounds = coords.reduce(
        (b, coord) => b.extend(coord as [number, number]),
        new mapboxgl.LngLatBounds(coords[0], coords[0]),
      );
      map.fitBounds(bounds, { padding: 48, maxZoom: 14 });

      // Origin marker (green)
      const start = coords[0];
      new mapboxgl.Marker({ color: '#16a34a' }).setLngLat(start).addTo(map);

      // Destination marker (red)
      const end = coords[coords.length - 1];
      new mapboxgl.Marker({ color: '#dc2626' }).setLngLat(end).addTo(map);

      // Charging station markers (blue bolt)
      chargingStations.forEach((station) => {
        const el = document.createElement('div');
        el.className = 'charging-marker';
        el.style.cssText =
          'width:20px;height:20px;background:#2563eb;border:2px solid white;border-radius:50%;cursor:pointer;';
        new mapboxgl.Marker({ element: el })
          .setLngLat([station.lng, station.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 12 }).setHTML(
              `<strong>${station.name}</strong><br>${station.address}<br>${station.powerKw ? `${station.powerKw} kW` : ''}`,
            ),
          )
          .addTo(map);
      });
    });

    return () => map.remove();
  }, [geometry, chargingStations]);

  return <div ref={containerRef} className="w-full h-64 rounded-xl overflow-hidden" />;
}
