import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { Header } from '@/shared/components/navigation/Header';
import { SiteFooter } from '@/components/shared/layout/SiteFooter';

// Google Analytics Measurement ID
const GA_MEASUREMENT_ID = 'G-F98819F2NC';

export const metadata: Metadata = {
  title: {
    default: 'CIV.IQ: Who Represents You?',
    template: '%s | CIV.IQ',
  },
  description:
    'Find your federal, state, and local representatives. Track bills, votes, campaign finance, and more with real government data.',
  keywords: [
    'congress',
    'representatives',
    'senators',
    'voting records',
    'bills',
    'legislation',
    'campaign finance',
    'FEC',
    'civic engagement',
    'government transparency',
    'congressional districts',
    'state legislature',
  ],
  authors: [{ name: 'CIV.IQ' }],
  creator: 'CIV.IQ',
  publisher: 'CIV.IQ',
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
    creator: '@civdotiq',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://civdotiq.org',
  },
  metadataBase: new URL('https://civdotiq.org'),
  category: 'government',
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
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-gray-900 focus:border-2 focus:border-black focus:font-semibold"
        >
          Skip to main content
        </a>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main id="main-content" className="flex-grow pt-14">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
