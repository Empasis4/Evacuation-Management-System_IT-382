'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

export default function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initial center: provided lat/lng or Butuan City center
    const center: L.LatLngExpression = lat && lng ? [lat, lng] : [8.9475, 125.5406];

    const map = L.map(containerRef.current, {
      center,
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (e) => {
      onChange(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update marker position when lat/lng changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    if (lat && lng) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
      // Pan to new location if it was a manual jump (optional)
      // map.panTo([lat, lng]);
    }
  }, [lat, lng]);

  return (
    <div style={{ width: '100%', height: '200px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ padding: '6px 10px', background: 'rgba(59,130,246,0.1)', fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 600, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        {lat && lng ? `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Click on map to set location'}
      </div>
    </div>
  );
}
