'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { ALERT_COLORS, AlertLevel, WeatherLog, Alert, Barangay } from '@/lib/types';
import { Cloud, Wind, Droplets, Thermometer, AlertTriangle, MapPin, RefreshCw, Zap, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const [weather, setWeather]           = useState<WeatherLog | null>(null);
  const [alerts, setAlerts]             = useState<Alert[]>([]);
  const [barangays, setBarangays]       = useState<Barangay[]>([]);
  const [loading, setLoading]           = useState(true);
  const [evaluating, setEvaluating]     = useState(false);
  const [evalResult, setEvalResult]     = useState<string>('');
  const supabase = createClient();

  const [sirenActive, setSirenActive] = useState(false);
  const sirenRef = useRef<HTMLAudioElement | null>(null);

  const playAlertSound = useCallback((level: number) => {
    try {
      if (level < 2) return;
      
      // Stop existing siren if any
      if (sirenRef.current) {
        sirenRef.current.pause();
        sirenRef.current = null;
      }

      const audio = new Audio(level === 3 
        ? 'https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3' // Siren
        : 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' // Alert
      );
      
      if (level === 3) {
        audio.loop = true;
        setSirenActive(true);
      }
      
      sirenRef.current = audio;
      audio.play().catch(e => console.log('Audio blocked:', e));
    } catch (err) {
      console.error('Audio play error:', err);
    }
  }, []);

  const stopSiren = () => {
    if (sirenRef.current) {
      sirenRef.current.pause();
      sirenRef.current = null;
    }
    setSirenActive(false);
  };

  const fetchData = useCallback(async () => {
    try {
      // 1. Load from Tactical Cache (LocalStorage) first for instant UI
      const cached = localStorage.getItem('evacsys_last_weather');
      if (cached) setWeather(JSON.parse(cached));

      // 2. Fetch fresh weather through the server-side bridge
      const weatherRes = await fetch('/api/weather/latest');
      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        if (weatherData && !weatherData.error) {
          setWeather(weatherData as WeatherLog);
          localStorage.setItem('evacsys_last_weather', JSON.stringify(weatherData));
        }
      }

      // 3. Load Alerts and Barangays
      const [{ data: aLogs, error: aErr }, { data: bData, error: bErr }] = await Promise.all([
        supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('barangays').select('*').order('name'),
      ]);

      if (aErr) console.error('Alerts Fetch Error:', aErr);
      if (bErr) console.error('Barangays Fetch Error:', bErr);

      if (aLogs) setAlerts(aLogs as Alert[]);
      if (bData) setBarangays(bData as Barangay[]);
    } catch (err) {
      console.error('Fetch Data Exception:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();

    // --- AUTOMATED HEARTBEAT (Auto-Pilot) ---
    // Automatically runs a weather check every 10 minutes
    const heartbeatInterval = setInterval(() => {
      console.log('--- SYSTEM HEARTBEAT: Automated Weather Check Triggered ---');
      runEvaluation();
    }, 10 * 60 * 1000); 

    // Supabase Realtime — listen for new alerts
    const channel = supabase.channel('realtime-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        fetchData();
        if (payload.new && payload.new.alert_level >= 2) {
          playAlertSound(payload.new.alert_level);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'weather_logs' }, () => fetchData())
      .subscribe();

    return () => { 
      clearInterval(heartbeatInterval);
      supabase.removeChannel(channel); 
    };
  }, [fetchData, supabase]);


  const runEvaluation = async () => {
    setEvaluating(true); setEvalResult('');
    const res = await fetch('/api/weather/evaluate', { method: 'POST' });
    const data = await res.json();
    
    if (data.success) {
      setEvalResult(`Level ${data.evaluation.alertLevel} — ${data.evaluation.message.slice(0, 80)}…`);
      // Update weather cards immediately and save to tactical cache
      if (data.weather) {
        setWeather(data.weather);
        localStorage.setItem('evacsys_last_weather', JSON.stringify(data.weather));
      }
      // Play tactical sound if alert level is high
      playAlertSound(data.evaluation.alertLevel);
    } else {
      setEvalResult(`Error: ${data.error}`);
    }
    
    setEvaluating(false);
    fetchData();
  };

  const latestAlertLevel = (alerts[0]?.alert_level ?? 0) as AlertLevel;
  const levelColors = ALERT_COLORS[latestAlertLevel];


  return (
    <DashboardLayout>
      <div className="animate-fade-up">
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="page-title">Command Dashboard</h1>
            <p className="section-label" style={{ marginTop: 4 }}>Real-time Situational Awareness · Butuan City</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {sirenActive && (
              <button 
                onClick={stopSiren} 
                className="btn btn-danger thermal-pulse" 
                style={{ padding: '12px 24px', fontSize: '0.85rem', fontWeight: 900 }}
              >
                <XCircle size={18} /> SILENCE EMERGENCY ALARM
              </button>
            )}
            <button onClick={runEvaluation} disabled={evaluating} className="btn btn-primary" style={{ padding: '12px 24px' }}>
              {evaluating ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={18} />}
              {evaluating ? 'EVALUATING SATELLITE...' : 'RUN WEATHER CHECK'}
            </button>
          </div>
        </div>

        {/* Eval Result Banner */}
        {evalResult && (
          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem', fontSize: '0.82rem', color: 'var(--text)' }}>
            <strong>Last Evaluation:</strong> {evalResult}
          </div>
        )}

        {/* Alert Level Banner */}
        <div className={`glass-card ${levelColors.bg}`} style={{ padding: '20px 24px', marginBottom: '1.75rem', border: `1px solid ${levelColors.border.replace('/40', '')}`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="pulse-dot" style={{ color: levelColors.text.replace('text-', ''), background: 'currentColor', width: 12, height: 12 }}></span>
            <AlertTriangle size={22} color="currentColor" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
              Alert Level {latestAlertLevel} — {levelColors.label}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
              {alerts[0] ? `${alerts[0].triggered_by} · ${formatDistanceToNow(new Date(alerts[0].created_at), { addSuffix: true })}` : 'No active alerts'}
            </div>
          </div>
          <span className={`alert-badge alert-${['safe','warning','critical','emergency'][latestAlertLevel]}`}>
            {levelColors.label}
          </span>
        </div>

        {/* Tactical Environmental Intelligence */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          
          {/* Wind Gauge */}
          <div className="stat-card-tactical" style={{ '--accent-color': '#3b82f6' } as any}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-label">Wind Speed</div>
              <Wind className="wind-icon-animated" size={20} color="#3b82f6" />
            </div>
            <div className="stat-value" style={{ color: '#3b82f6', margin: '8px 0' }}>
              {loading ? '—' : (weather?.wind_speed?.toFixed(1) || '0.0')} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>km/h</span>
            </div>
            <div className="gauge-container"><div className="gauge-bar" style={{ width: `${Math.min((weather?.wind_speed || 0) * 2, 100)}%`, background: '#3b82f6' }} /></div>
          </div>

          {/* Rainfall Gauge */}
          <div className="stat-card-tactical" style={{ '--accent-color': '#06b6d4' } as any}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-label">Rain Intensity</div>
              <Droplets className="rain-bar-animated" size={20} color="#06b6d4" />
            </div>
            <div className="stat-value" style={{ color: '#06b6d4', margin: '8px 0' }}>
              {loading ? '—' : (weather?.rainfall?.toFixed(1) || '0.0')} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>mm/h</span>
            </div>
            <div className="gauge-container"><div className="gauge-bar" style={{ width: `${Math.min((weather?.rainfall || 0) * 5, 100)}%`, background: '#06b6d4' }} /></div>
          </div>

          {/* Thermal Indicator */}
          <div className="stat-card-tactical" style={{ '--accent-color': '#f97316' } as any}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-label">Temperature</div>
              <Thermometer size={20} color="#f97316" />
            </div>
            <div className="stat-value" style={{ color: '#f97316', margin: '8px 0' }}>
              {loading ? '—' : (weather?.temperature?.toFixed(1) || '0.0')} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>°C</span>
            </div>
            <div className="gauge-container" style={{ background: 'rgba(249,115,22,0.1)' }}>
              <div className="gauge-bar thermal-pulse" style={{ width: `${Math.min((weather?.temperature || 0) * 2, 100)}%`, background: '#f97316' }} />
            </div>
          </div>

          {/* Humidity Circle */}
          <div className="stat-card-tactical" style={{ '--accent-color': '#8b5cf6' } as any}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-label">Humidity</div>
              <div className="vapor-ring" style={{ width: 20, height: 20, borderWidth: 2 }} />
            </div>
            <div className="stat-value" style={{ color: '#8b5cf6', margin: '8px 0' }}>
              {loading ? '—' : (weather?.humidity || '0')}<span style={{ fontSize: '0.8rem', opacity: 0.6 }}>%</span>
            </div>
            <div className="gauge-container"><div className="gauge-bar" style={{ width: `${weather?.humidity || 0}%`, background: '#8b5cf6' }} /></div>
          </div>
        </div>

        {/* City Overview Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Total Barangays', value: barangays.length, icon: MapPin, color: 'var(--primary)' },
            { label: 'At Risk Areas', value: barangays.filter(b => b.risk_level !== 'low').length, icon: AlertTriangle, color: 'var(--warning)' },
            { label: 'Registered SMS', value: barangays.filter(b => b.contact_numbers?.length > 0).length, icon: Zap, color: 'var(--safe)' },
            { label: 'Alert History', value: alerts.length, icon: RefreshCw, color: 'var(--muted)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 8, background: `${s.color}15`, borderRadius: 8, color: s.color }}><s.icon size={16} /></div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>{loading ? '—' : s.value}</div>
                  <div className="stat-label" style={{ marginTop: 0 }}>{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Recent Alerts */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} color="var(--critical)" /> Alert History
              </h3>
              <span className="section-label">{alerts.length} records</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr>
                  <th>Level</th><th>Trigger</th><th>Barangays</th><th>Time</th>
                </tr></thead>
                <tbody>
                  {alerts.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No alerts recorded</td></tr>}
                  {alerts.map(a => (
                    <tr key={a.id}>
                      <td><span className={`alert-badge alert-${['safe','warning','critical','emergency'][a.alert_level]}`}>{ALERT_COLORS[a.alert_level as AlertLevel].label}</span></td>
                      <td style={{ fontSize: '0.78rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.triggered_by}</td>
                      <td style={{ fontSize: '0.78rem' }}>{Array.isArray(a.affected_barangays) ? a.affected_barangays.length : 0} barangays</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Barangay Status List */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color="var(--primary)" /> Barangay Status
              </h3>
            </div>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {barangays.map(b => {
                const RISK_COLOR = { low: 'var(--safe)', medium: 'var(--warning)', high: 'var(--critical)', critical: 'var(--emergency)' }[b.risk_level];
                return (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>{b.captain_name || 'Captain N/A'}</div>
                    </div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 999, background: `${RISK_COLOR}18`, color: RISK_COLOR, whiteSpace: 'nowrap' }}>
                      {b.risk_level}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
