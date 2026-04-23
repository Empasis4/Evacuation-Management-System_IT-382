'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { SmsLog } from '@/lib/types';
import { MessageSquare, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function SmsLogsPage() {
  const [logs, setLogs]     = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase.from('sms_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (data) setLogs(data as SmsLog[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchLogs();
    const ch = supabase.channel('sms-logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sms_logs' }, fetchLogs)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchLogs, supabase]);

  const sent   = logs.filter(l => l.status === 'sent').length;
  const failed = logs.filter(l => l.status === 'failed').length;
  const pending = logs.filter(l => l.status === 'pending').length;

  const STATUS_ICON = {
    sent:    <CheckCircle size={14} color="var(--safe)" />,
    failed:  <XCircle size={14} color="var(--emergency)" />,
    pending: <Clock size={14} color="var(--warning)" />,
  };
  const STATUS_COLOR = { sent: 'var(--safe)', failed: 'var(--emergency)', pending: 'var(--warning)' };

  return (
    <DashboardLayout>
      <div className="animate-fade-up">
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 className="page-title">SMS Delivery Log</h1>
          <p className="section-label" style={{ marginTop: 4 }}>IPROG SMS — complete transmission audit trail</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Messages Sent', value: sent, color: 'var(--safe)', icon: CheckCircle },
            { label: 'Failed', value: failed, color: 'var(--emergency)', icon: XCircle },
            { label: 'Pending', value: pending, color: 'var(--warning)', icon: Clock },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ padding: 10, background: `${s.color}18`, borderRadius: 10, color: s.color }}><s.icon size={20} /></div>
              </div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={16} color="var(--primary)" /> Transmission Records
            </h3>
            <button onClick={fetchLogs} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.7rem' }}><RefreshCw size={13} /> Refresh</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Status</th><th>Recipient</th><th>Message</th><th>Response</th><th>Time</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28 }}><RefreshCw size={18} color="var(--muted)" style={{ animation: 'spin 1s linear infinite' }} /></td></tr>}
                {!loading && logs.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No SMS logs yet</td></tr>}
                {logs.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: STATUS_COLOR[l.status] }}>
                        {STATUS_ICON[l.status]}
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l.status}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{l.recipient_number}</td>
                    <td style={{ fontSize: '0.78rem', maxWidth: 200 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.message}>{l.message}</div></td>
                    <td style={{ fontSize: '0.65rem', color: 'var(--muted)', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={JSON.stringify(l.provider_response)}>
                        {l.provider_response ? JSON.stringify(l.provider_response) : '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      <div>{format(new Date(l.created_at), 'MMM d, HH:mm')}</div>
                      <div>{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</div>
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
