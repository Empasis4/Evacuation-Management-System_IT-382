'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Map, AlertTriangle, Settings,
  MapPin, LogOut, Shield, Activity, MessageSquare
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/map',        icon: Map,             label: 'GIS Map'    },
  { href: '/barangays',  icon: MapPin,           label: 'Barangays'  },
  { href: '/alerts',     icon: AlertTriangle,    label: 'Alerts'     },
  { href: '/sms-logs',   icon: MessageSquare,    label: 'SMS Logs'   },
  { href: '/settings',   icon: Settings,         label: 'Settings'   },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 10,
            padding: 8,
            color: 'var(--primary)'
          }}>
            <Shield size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.03em' }}>
              Evac<span style={{ color: 'var(--primary)' }}>Sys</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Butuan City
            </div>
          </div>
        </div>
      </div>

      {/* Live Status */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pulse-dot" style={{ color: 'var(--safe)', background: 'var(--safe)' }}></span>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--safe)' }}>
            System Online
          </span>
          <Activity size={12} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 12px' }}>
        <div className="section-label" style={{ padding: '8px 8px 12px' }}>Navigation</div>
        {NAV_ITEMS.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                marginBottom: 4,
                background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
                border: active ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
                color: active ? 'var(--primary)' : 'var(--muted2)',
                fontWeight: active ? 700 : 500,
                fontSize: '0.85rem',
                transition: 'all 0.2s ease',
              }}>
                <item.icon size={17} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <button onClick={handleLogout} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
