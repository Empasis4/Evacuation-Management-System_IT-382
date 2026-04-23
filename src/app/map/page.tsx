'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { Barangay, Alert, ALERT_COLORS, AlertLevel, RISK_COLORS } from '@/lib/types';
import { MapPin, RefreshCw } from 'lucide-react';

// Dynamic import — Leaflet requires browser APIs
const EvacMap = dynamic(() => import('@/components/EvacMap'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', borderRadius: 12 }}>
      <RefreshCw size={24} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  ),
});

export default function MapPage() {
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [latestAlert, setLatestAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: b }, { data: a }] = await Promise.all([
        supabase.from('barangays').select('*'),
        supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(1),
      ]);
      if (b) setBarangays(b as Barangay[]);
      if (a?.[0]) setLatestAlert(a[0] as Alert);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const alertLevel = (latestAlert?.alert_level ?? 0) as AlertLevel;
  const levelColors = ALERT_COLORS[alertLevel];

  return (
    <DashboardLayout>
      <div className="animate-fade-up" style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h1 className="page-title">GIS Tactical Map</h1>
            <p className="section-label" style={{ marginTop: 4 }}>Butuan City · {barangays.length} barangays loaded</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([['low', 'Low Risk'], ['medium', 'Medium Risk'], ['high', 'High Risk'], ['critical', 'Critical']] as const).map(([risk, label]) => (
              <div key={risk} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: `${RISK_COLORS[risk]}15`, border: `1px solid ${RISK_COLORS[risk]}40`, borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: RISK_COLORS[risk] }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[risk], display: 'inline-block' }}></span>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Alert Banner */}
        {alertLevel > 0 && (
          <div className={`glass-sm`} style={{ padding: '12px 20px', border: `1px solid ${levelColors.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <MapPin size={16} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Active {levelColors.label}: {Array.isArray(latestAlert?.affected_barangays) ? latestAlert!.affected_barangays.length : 0} barangays affected
            </span>
            <span className={`alert-badge alert-${['safe','warning','critical','emergency'][alertLevel]}`}>{levelColors.label}</span>
          </div>
        )}

        {/* Map */}
        <div style={{ flex: 1, minHeight: 500, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {loading ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
              <span className="section-label">Loading barangay data…</span>
            </div>
          ) : (
            <EvacMap barangays={barangays} alertLevel={alertLevel} affectedIds={
              latestAlert && Array.isArray(latestAlert.affected_barangays)
                ? latestAlert.affected_barangays.map((b: any) => b.id)
                : []
            } />
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
