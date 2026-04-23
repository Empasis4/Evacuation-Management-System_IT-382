'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Barangay, AlertLevel, RISK_COLORS } from '@/lib/types';

// Fix Leaflet default icon path issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface EvacMapProps {
  barangays:    Barangay[];
  alertLevel:   AlertLevel;
  affectedIds:  string[];
}

export default function EvacMap({ barangays, alertLevel, affectedIds }: EvacMapProps) {
  const mapRef     = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map centered on Butuan City
    const map = L.map(containerRef.current, {
      center:    [8.9475, 125.5406],
      zoom:      13,
      zoomControl: true,
    });

    // Dark CartoDB tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/update markers whenever barangays or alertLevel changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing layers (keep tile)
    map.eachLayer(layer => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    barangays.forEach(b => {
      if (!b.latitude || !b.longitude) return;

      const isAffected = affectedIds.includes(b.id);
      const riskColor  = RISK_COLORS[b.risk_level];
      
      // If affected, we use red for the border/ring, but keep risk color for the fill
      const strokeColor = isAffected ? '#ef4444' : riskColor;

      // Circle marker per barangay
      const circle = L.circleMarker([b.latitude, b.longitude], {
        radius:      isAffected ? 12 : 9,
        fillColor:   riskColor,
        fillOpacity: isAffected ? 0.9 : 0.7,
        color:       strokeColor,
        weight:      isAffected ? 4 : 2,
        opacity:     1,
      });

      // Rich popup
      circle.bindPopup(`
        <div style="min-width:200px; font-family: 'Outfit', sans-serif;">
          <div style="font-weight:800; font-size:1rem; margin-bottom:8px; color:${riskColor}">${b.name}</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.78rem; color:#94a3b8;">
            <div><span style="font-weight:700; color:#475569">Captain</span><br/>${b.captain_name || 'N/A'}</div>
            <div><span style="font-weight:700; color:#475569">Risk</span><br/><span style="color:${riskColor}; font-weight:700; text-transform:uppercase">${b.risk_level}</span></div>
            <div style="grid-column:1/-1"><span style="font-weight:700; color:#475569">Contact</span><br/>${b.contact_numbers?.join(', ') || 'N/A'}</div>
            <div style="grid-column:1/-1"><span style="font-weight:700; color:#475569">Evacuation Center</span><br/>${b.evacuation_center || 'N/A'}</div>
            ${isAffected ? `<div style="grid-column:1/-1; margin-top:4px; padding:6px 10px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:6px; color:#ef4444; font-weight:700; font-size:0.7rem; text-transform:uppercase; text-align:center;">⚠ Currently Affected</div>` : ''}
          </div>
        </div>
      `, { maxWidth: 280 });

      // Pulse ring for affected barangays
      if (isAffected) {
        L.circle([b.latitude, b.longitude], {
          radius: 400, color: '#ef4444', fillColor: '#ef4444',
          fillOpacity: 0.1, weight: 1.5, dashArray: '5, 10'
        }).addTo(map);
      }

      circle.addTo(map);
    });
  }, [barangays, alertLevel, affectedIds]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
