import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CIV.IQ - Civic Information Hub',
  description: 'Know your representatives and stay informed about your government',
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#e11d07',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
