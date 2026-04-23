'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { ShieldAlert, Volume2, VolumeX, Smartphone, Radio } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

function SirenContent() {
  const searchParams = useSearchParams();
  const myBarangayId = searchParams.get('bid'); 

  const [active, setActive] = useState(false);
  const [standby, setStandby] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabase = createClient();

  // Handle Automatic Triggers via Realtime
  useEffect(() => {
    const channel = supabase.channel('mobile-siren')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        if (payload.new && payload.new.alert_level === 3) {
          // CHECK IF TARGETED
          const targets = payload.new.affected_barangay_ids;
          const isTargeted = !targets || (Array.isArray(targets) && targets.includes(myBarangayId));

          if (standby && isTargeted) {
            console.log('--- TARGETED EMERGENCY TRIGGERED ---');
            startSiren();
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, standby, myBarangayId]);

  const startSiren = () => {
    setActive(true);
    setStandby(false);
    
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
      const vibInterval = setInterval(() => {
        if (!active) { clearInterval(vibInterval); return; }
        navigator.vibrate([500, 200, 500, 200, 500]);
      }, 3000);
    }

    const siren = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
    siren.loop = true;
    siren.play().catch(e => console.log('Audio blocked - needs interaction', e));
    audioRef.current = siren;
  };

  const stopSiren = () => {
    setActive(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  };

  const enterStandby = () => {
    setStandby(true);
    // Silent vibration to confirm hardware access
    if ('vibrate' in navigator) navigator.vibrate(100);
    // Request sound permission implicitly
    const silent = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    silent.volume = 0;
    silent.play().catch(() => {});
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: active ? '#ef4444' : (standby ? '#1e293b' : '#060a12'), 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '2rem', 
      transition: 'all 0.5s ease', 
      color: '#fff', 
      textAlign: 'center' 
    }}>
      
      <div style={{ 
        padding: '2.5rem', 
        background: 'rgba(255,255,255,0.03)', 
        borderRadius: '32px', 
        border: `1px solid ${active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`, 
        maxWidth: '420px', 
        width: '100%',
        boxShadow: active ? '0 0 50px rgba(239,68,68,0.5)' : 'none'
      }}>
        {active ? (
          <ShieldAlert size={100} color="#fff" style={{ marginBottom: '1.5rem', animation: 'pulse 0.5s infinite' }} />
        ) : (
          <Radio size={80} color={standby ? '#3b82f6' : '#475569'} style={{ marginBottom: '1.5rem', animation: standby ? 'spin-slow 4s linear infinite' : 'none' }} />
        )}
        
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
          {active ? 'CRITICAL EMERGENCY' : (standby ? 'GUARDIAN STANDBY' : 'SIREN PORTAL')}
        </h1>
        
        <p style={{ color: '#94a3b8', marginBottom: '2.5rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          {active 
            ? 'Satellite detection confirmed. Immediate action required. Coordinate with LGU now.' 
            : (standby 
                ? 'Your device is linked to the LGU Command Center. The siren will activate automatically on detection.' 
                : 'Turn your device into a tactical alarm. Click below to begin listening for emergency broadcasts.')}
        </p>

        {active ? (
          <button onClick={stopSiren} style={{ width: '100%', padding: '1.25rem', background: '#fff', color: '#000', border: 'none', borderRadius: '16px', fontWeight: 900, fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer' }}>
            <VolumeX size={22} /> SILENCE ALARM
          </button>
        ) : (
          !standby ? (
            <button onClick={enterStandby} style={{ width: '100%', padding: '1.25rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 900, fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 8px 32px rgba(59,130,246,0.3)' }}>
              <Radio size={22} /> ENTER STANDBY
            </button>
          ) : (
            <div style={{ padding: '12px', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 999, background: '#3b82f6', animation: 'pulse 1s infinite' }} />
              LISTENING FOR LGU BROADCAST...
            </div>
          )
        )}
      </div>

      <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#475569', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        <Smartphone size={14} /> Tactical Alert System · Butuan City
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function SirenPortal() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#060a12' }} />}>
      <SirenContent />
    </Suspense>
  );
}
