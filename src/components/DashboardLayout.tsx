'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';

/**
 * Shared layout wrapper for all authenticated dashboard pages.
 * Provides the sidebar + main content structure.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
