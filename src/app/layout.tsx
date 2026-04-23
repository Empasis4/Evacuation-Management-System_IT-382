import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EvacSys | Butuan City Early Warning System',
  description: 'Real-time disaster monitoring, evacuation alerts, and GIS mapping for Butuan City.',
  keywords: ['evacuation', 'disaster management', 'Butuan City', 'early warning', 'GIS'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
