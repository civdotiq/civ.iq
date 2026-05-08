import type { Metadata } from 'next';
import Link from 'next/link';
import { ComparePage, DEFAULT_PAIR } from '@/components/officials/ComparePage';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

interface PageProps {
  searchParams: Promise<{ a?: string; b?: string; v?: string }>;
}

const BIOGUIDE_RX = /^[A-Z][0-9]{6}$/;

function normalize(id: string | undefined, fallback: string): string {
  if (!id) return fallback;
  const upper = id.toUpperCase();
  return BIOGUIDE_RX.test(upper) ? upper : fallback;
}

export default async function CompareRoute({ searchParams }: PageProps) {
  const { a, b, v } = await searchParams;
  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  const bioguideA = normalize(a, DEFAULT_PAIR.a);
  const bioguideB = normalize(b, DEFAULT_PAIR.b);

  if (!useRedesign) {
    return (
      <div
        style={{
          background: 'var(--bg1)',
          color: 'var(--fg1)',
          fontFamily: 'var(--font-primary)',
          padding: '64px 36px',
          maxWidth: 720,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--fg3)',
          }}
        >
          Tools · Compare officials
        </div>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-display)',
            lineHeight: 1.0,
            margin: '12px 0 16px',
            textTransform: 'uppercase',
          }}
        >
          Coming soon
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--fg2)',
            margin: '0 auto 24px',
            maxWidth: 520,
          }}
        >
          The compare-officials view is in preview. Add <code>?v=new</code> to the URL to see the
          redesigned page, or browse all officials below.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href={`/compare?v=new&a=${bioguideA}&b=${bioguideB}`}
            style={{
              padding: '10px 18px',
              border: '2px solid var(--ink)',
              background: 'var(--ink)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              textDecoration: 'none',
              borderRadius: 'var(--radius-interactive)',
            }}
          >
            Preview compare →
          </Link>
          <Link
            href="/representatives"
            style={{
              padding: '10px 18px',
              border: '2px solid var(--ink)',
              background: 'var(--bg1)',
              color: 'var(--fg1)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              textDecoration: 'none',
              borderRadius: 'var(--radius-interactive)',
            }}
          >
            All officials
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Tools', url: 'https://civdotiq.org/representatives' },
          { name: 'Compare officials', url: 'https://civdotiq.org/compare' },
        ]}
      />
      <ComparePage bioguideA={bioguideA} bioguideB={bioguideB} />
    </>
  );
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { a, b } = await searchParams;
  const bioguideA = normalize(a, DEFAULT_PAIR.a);
  const bioguideB = normalize(b, DEFAULT_PAIR.b);
  const title = `Compare officials · ${bioguideA} vs ${bioguideB}`;
  const description =
    'Side-by-side comparison of two federal officials — voting record, campaign finance, committees, and tenure — sourced from Congress.gov and FEC filings.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://civdotiq.org/compare?a=${bioguideA}&b=${bioguideB}`,
      siteName: 'CIV.IQ',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      site: '@civdotiq',
    },
  };
}
