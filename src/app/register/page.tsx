'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Mail, Lock, User, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true);
  };

  if (done) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '1.5rem' }}>
      <div className="glass" style={{ padding: '2.5rem', maxWidth: 420, textAlign: 'center' }}>
        <Shield size={48} color="var(--safe)" style={{ marginBottom: 16 }} />
        <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: 8 }}>Access Request Sent</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Check your email to confirm your account. An admin will assign your role.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>Go to Login</Link>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }} className="animate-fade-up">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 16, marginBottom: 16 }}>
            <User size={32} color="var(--cyan)" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 6 }}>Request Access</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Disaster Officer Registration</p>
        </div>
        <div className="glass" style={{ padding: '2rem' }}>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--emergency)' }}>{error}</div>}
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="field-label" style={{ color: 'var(--cyan)' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input type="text" required className="field-input" style={{ paddingLeft: 40 }}
                  placeholder="Juan Dela Cruz" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="field-label" style={{ color: 'var(--cyan)' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input type="email" required className="field-input" style={{ paddingLeft: 40 }}
                  placeholder="officer@dilg.gov.ph" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="field-label" style={{ color: 'var(--cyan)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input type="password" required minLength={6} className="field-input" style={{ paddingLeft: 40 }}
                  placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', background: 'var(--cyan)', boxShadow: '0 4px 16px rgba(6,182,212,0.3)' }}>
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Submit Registration'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
            Already registered? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Sign In</Link>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
