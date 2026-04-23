'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Barangay, RiskLevel, RISK_COLORS } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Plus, Pencil, Trash2, MapPin, Phone, Search, X, Save, Loader2 } from 'lucide-react';

const EMPTY: Omit<Barangay, 'id' | 'created_at' | 'updated_at' | 'polygon_geojson'> = {
  name: '', captain_name: '', contact_numbers: [],
  latitude: null, longitude: null,
  risk_level: 'low', evacuation_center: '',
};

import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div style={{ height: 200, background: 'var(--surface2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>
});

export default function BarangaysPage() {
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing]     = useState<Barangay | null>(null);
  const [form, setForm]           = useState({ ...EMPTY });
  const [contactsStr, setContactsStr] = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const supabase = createClient();

  const fetchBarangays = useCallback(async () => {
    const { data } = await supabase.from('barangays').select('*').order('name');
    if (data) setBarangays(data as Barangay[]);
  }, [supabase]);

  useEffect(() => { fetchBarangays(); }, [fetchBarangays]);

  const openAdd = () => {
    setForm({ ...EMPTY }); setContactsStr(''); setEditing(null); setError(''); setModal('add');
  };
  const openEdit = (b: Barangay) => {
    setForm({ name: b.name, captain_name: b.captain_name ?? '', contact_numbers: b.contact_numbers,
      latitude: b.latitude, longitude: b.longitude, risk_level: b.risk_level,
      evacuation_center: b.evacuation_center ?? '' });
    setContactsStr(b.contact_numbers.join(', '));
    setEditing(b); setError(''); setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.latitude || !form.longitude) { setError('Location must be selected on the map'); return; }
    setSaving(true); setError('');
    const payload = {
      ...form,
      contact_numbers: contactsStr.split(',').map(s => s.trim()).filter(Boolean),
    };
    const url    = modal === 'edit' ? `/api/barangays/${editing!.id}` : '/api/barangays';
    const method = modal === 'edit' ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed to save'); setSaving(false); return; }
    setSaving(false); setModal(null); fetchBarangays();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this barangay?')) return;
    await fetch(`/api/barangays/${id}`, { method: 'DELETE' });
    fetchBarangays();
  };

  const filtered = barangays.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.captain_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="animate-fade-up">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Barangay Registry</h1>
            <p className="section-label" style={{ marginTop: 4 }}>{barangays.length} barangays · Butuan City LDRRMO</p>
          </div>
          <button onClick={openAdd} className="btn btn-primary"><Plus size={16} /> Add Barangay</button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input className="field-input" style={{ paddingLeft: 40 }} placeholder="Search barangay or captain…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr>
                <th>Barangay</th><th>Captain</th><th>Contact</th>
                <th>Risk Level</th><th>Evacuation Center</th><th style={{ textAlign: 'right' }}>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>No barangays found</td></tr>
                )}
                {filtered.map(b => {
                  const rc = RISK_COLORS[b.risk_level];
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.name}</td>
                      <td style={{ color: 'var(--muted2)', fontSize: '0.82rem' }}>{b.captain_name || '—'}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--muted2)' }}>
                        {b.contact_numbers?.join(', ') || '—'}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 10px', borderRadius: 999, background: `${rc}18`, color: rc, border: `1px solid ${rc}40` }}>
                          {b.risk_level}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--muted2)' }}>{b.evacuation_center || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button onClick={() => openEdit(b)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.7rem' }}>
                            <Pencil size={13} /> Edit
                          </button>
                          <button onClick={() => handleDelete(b.id)} className="btn" style={{ padding: '6px 12px', fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)', color: 'var(--emergency)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={() => setModal(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(6,10,18,0.8)', backdropFilter: 'blur(8px)' }} />
          <div className="glass" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                {modal === 'add' ? 'Add New Barangay' : `Edit: ${editing?.name}`}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--emergency)', fontSize: '0.8rem' }}>{error}</div>}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="field-label">Barangay Name *</label>
                  <input className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Libertad" />
                </div>
                <div>
                  <label className="field-label">Captain Name</label>
                  <input className="field-input" value={form.captain_name ?? ''} onChange={e => setForm(f => ({ ...f, captain_name: e.target.value }))} placeholder="Juan Dela Cruz" />
                </div>
                <div>
                  <label className="field-label">Risk Level</label>
                  <select className="field-input" value={form.risk_level} onChange={e => setForm(f => ({ ...f, risk_level: e.target.value as RiskLevel }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label">Barangay Location *</label>
                <LocationPicker 
                  lat={form.latitude} 
                  lng={form.longitude} 
                  onChange={(lat, lng) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))} 
                />
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label className="field-label">Contact Numbers (comma-separated)</label>
                <input className="field-input" value={contactsStr} onChange={e => setContactsStr(e.target.value)} placeholder="09171234567, 09281234567" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="field-label">Evacuation Center</label>
                <input className="field-input" value={form.evacuation_center ?? ''} onChange={e => setForm(f => ({ ...f, evacuation_center: e.target.value }))} placeholder="Libertad Central School" />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                <button onClick={() => setModal(null)} className="btn btn-ghost">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                  {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                  {saving ? 'Saving…' : 'Save Barangay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
