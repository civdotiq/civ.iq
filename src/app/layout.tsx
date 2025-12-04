import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { SiteFooter } from '@/components/shared/layout/SiteFooter';

// Google Analytics Measurement ID
const GA_MEASUREMENT_ID = 'G-F98819F2NC';

export const metadata: Metadata = {
  title: 'CIV.IQ: Who Represents You?',
  description:
    'Find your federal, state, and local representatives. Track bills, votes, campaign finance, and more with real government data.',
  icons: {
    icon: '/favicon.svg',
    apple: '/images/civiq-logo.png',
  },
  openGraph: {
    title: 'CIV.IQ: Who Represents You?',
    description:
      'Find your federal, state, and local representatives. Track bills, votes, campaign finance, and more with real government data.',
    url: 'https://civdotiq.org',
    siteName: 'CIV.IQ',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CIV.IQ - Civic Intelligence Hub',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CIV.IQ: Who Represents You?',
    description:
      'Find your federal, state, and local representatives. Track bills, votes, campaign finance, and more.',
    images: ['/images/og-image.png'],
    site: '@civdotiq',
  },
  metadataBase: new URL('https://civdotiq.org'),
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
      <head>
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <div className="min-h-screen flex flex-col">
          <div className="flex-grow">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
