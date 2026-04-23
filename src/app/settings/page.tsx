'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { Settings, Save, Loader2, RefreshCw, Key, Wind, Droplets, Clock } from 'lucide-react';

interface Setting { key: string; value: string; description: string; }

const SETTING_ICONS: Record<string, any> = {
  wind_speed_warning: Wind, wind_speed_critical: Wind,
  rainfall_warning: Droplets, rainfall_critical: Droplets,
  check_interval_min: Clock,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [values, setValues]     = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const supabase = createClient();

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('system_settings').select('*').order('key');
    if (data) {
      setSettings(data as Setting[]);
      setValues(Object.fromEntries(data.map((s: Setting) => [s.key, s.value])));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    const updates = Object.entries(values).map(([key, value]) =>
      supabase.from('system_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key)
    );
    await Promise.all(updates);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const thresholdKeys = settings.filter(s => !['weather_api_key', 'sms_api_key'].includes(s.key));
  const apiKeys       = settings.filter(s => ['weather_api_key', 'sms_api_key'].includes(s.key));

  return (
    <DashboardLayout>
      <div className="animate-fade-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">System Settings</h1>
            <p className="section-label" style={{ marginTop: 4 }}>Alert thresholds, API keys, and automation config</p>
          </div>
          {saved && <div style={{ padding: '8px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, fontSize: '0.8rem', color: 'var(--safe)' }}>✓ Settings saved</div>}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><RefreshCw size={24} color="var(--muted)" style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : (
          <>
            {/* Alert Thresholds */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={16} color="var(--primary)" /> Alert Thresholds
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {thresholdKeys.map(s => {
                  const Icon = SETTING_ICONS[s.key] ?? Settings;
                  return (
                    <div key={s.key}>
                      <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon size={12} /> {s.description || s.key}
                      </label>
                      <input type="number" className="field-input" value={values[s.key] ?? ''} onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))} />
                      <p style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 4, letterSpacing: '0.05em' }}>
                        key: <code style={{ color: 'var(--primary)' }}>{s.key}</code>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* API Keys */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '1.5rem', border: '1px solid rgba(234,179,8,0.2)' }}>
              <h3 style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={16} color="var(--warning)" /> API Configuration
              </h3>
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                {apiKeys.map(s => (
                  <div key={s.key}>
                    <label className="field-label" style={{ color: 'var(--warning)' }}>{s.description || s.key}</label>
                    <input type="password" className="field-input" value={values[s.key] ?? ''} onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                      style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }} />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ minWidth: 180 }}>
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
              {saving ? 'Saving…' : 'Save All Settings'}
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
