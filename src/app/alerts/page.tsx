'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Alert, AlertLevel, ALERT_COLORS } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Send, Loader2, RefreshCw, MapPin } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function AlertsPage() {
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [level, setLevel]     = useState<AlertLevel>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult]   = useState<string>('');
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('barangays').select('id, name').order('name'),
    ]);
    if (a) setAlerts(a as Alert[]);
    if (b) setBarangays(b);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
    const ch = supabase.channel('alerts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData, supabase]);

  const dispatch = async () => {
    if (!message.trim()) return;
    setSending(true); setResult('');
    const res = await fetch('/api/alerts/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_level: level, message, affected_barangay_ids: selectedIds.length ? selectedIds : undefined }),
    });
    const data = await res.json();
    setResult(data.success ? `✓ Dispatched — ${data.smsCount} SMS sent` : `Error: ${data.error}`);
    if (data.success) { setMessage(''); setSelectedIds([]); fetchData(); }
    setSending(false);
  };

  const toggle = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const TEMPLATES = {
    0: "[EVACSYS BUTUAN] STATUS: All clear. Conditions have returned to safe levels.",
    1: "[EVACSYS BUTUAN] WARNING: Heavy rain/wind detected in your sector. Please monitor local conditions and stay alert for further updates.",
    2: "[EVACSYS BUTUAN] CRITICAL: Severe weather conditions incoming. Prepare your emergency kits and be ready for possible evacuation instructions.",
    3: "🚨 ALERT! 🚨 ALERT! 🚨\n[!!! FLASH ALERT !!!]\n\n[EVACSYS BUTUAN] EMERGENCY: IMMEDIATE EVACUATION REQUIRED! Click link to activate your phone SIREN: http://localhost:3000/siren \n\nEVACUATE IMMEDIATELY!",
  };

  const handleLevelChange = (newLevel: AlertLevel) => {
    setLevel(newLevel);
    // Auto-fill template
    setMessage(TEMPLATES[newLevel]);
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-up">
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 className="page-title">Alert Management</h1>
          <p className="section-label" style={{ marginTop: 4 }}>Manual dispatch & alert history log</p>
        </div>

        {/* Dispatch Panel */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '2rem', border: '1px solid rgba(239,68,68,0.2)' }}>
          <h3 style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send size={16} color="var(--emergency)" /> Manual Alert Dispatch
          </h3>

          {result && (
            <div style={{ marginBottom: '1rem', padding: '10px 16px', background: result.startsWith('✓') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${result.startsWith('✓') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 10, fontSize: '0.82rem', color: result.startsWith('✓') ? 'var(--safe)' : 'var(--emergency)' }}>
              {result}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="field-label">Alert Level</label>
              <select className="field-input" value={level} onChange={e => handleLevelChange(Number(e.target.value) as AlertLevel)}>
                <option value={1}>1 — Warning</option>
                <option value={2}>2 — Critical</option>
                <option value={3}>3 — Emergency</option>
              </select>
            </div>
            <div>
              <label className="field-label">Target Barangays <span style={{ color: 'var(--muted)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(leave empty = all)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, background: 'rgba(6,10,18,0.6)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', minHeight: 44 }}>
                {barangays.map(b => (
                  <button key={b.id} type="button" onClick={() => toggle(b.id)} style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s', background: selectedIds.includes(b.id) ? 'rgba(239,68,68,0.2)' : 'transparent', borderColor: selectedIds.includes(b.id) ? 'rgba(239,68,68,0.5)' : 'var(--border)', color: selectedIds.includes(b.id) ? 'var(--emergency)' : 'var(--muted2)' }}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="field-label">Alert Message</label>
            <textarea className="field-input" rows={3} style={{ resize: 'vertical' }} value={message} onChange={e => setMessage(e.target.value)} placeholder="[EVACSYS BUTUAN] Enter your emergency alert message here…" />
          </div>

          <button onClick={dispatch} disabled={sending || !message.trim()} className="btn btn-danger">
            {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <AlertTriangle size={16} />}
            {sending ? 'Dispatching…' : 'Dispatch Alert + SMS'}
          </button>
        </div>

        {/* History Table */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem' }}>Alert History</h3>
            <button onClick={fetchData} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.7rem' }}><RefreshCw size={13} /> Refresh</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Level</th><th>Message</th><th>Triggered By</th><th>Barangays</th><th>Time</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28 }}><RefreshCw size={18} color="var(--muted)" style={{ animation: 'spin 1s linear infinite' }} /></td></tr>}
                {!loading && alerts.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No alerts recorded yet</td></tr>}
                {alerts.map(a => (
                  <tr key={a.id}>
                    <td><span className={`alert-badge alert-${['safe','warning','critical','emergency'][a.alert_level]}`}>{ALERT_COLORS[a.alert_level as AlertLevel].label}</span></td>
                    <td style={{ fontSize: '0.78rem', maxWidth: 260 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</div></td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--muted2)' }}>{a.triggered_by}</td>
                    <td style={{ fontSize: '0.78rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} color="var(--primary)" />{Array.isArray(a.affected_barangays) ? a.affected_barangays.length : 0}</div></td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      <div>{format(new Date(a.created_at), 'MMM d, HH:mm')}</div>
                      <div>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
