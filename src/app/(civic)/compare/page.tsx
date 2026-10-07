/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * /compare?a=<bioguide>&b=<bioguide> — side-by-side officials.
 *
 * Both ids are required. A missing id renders a designed, noindex empty
 * state that explains the URL form; a malformed id is a real 404. There
 * is no silent default pair: the page never substitutes officials the
 * citizen did not ask for.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ComparePage } from '@/components/officials/ComparePage';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { SITE_OG_IMAGES } from '@/lib/social/site-og-image';

interface PageProps {
  searchParams: Promise<{ a?: string; b?: string }>;
}

const BIOGUIDE_RX = /^[A-Z][0-9]{6}$/;

type Resolved = { kind: 'ok'; a: string; b: string } | { kind: 'missing' } | { kind: 'invalid' };

function resolvePair(a: string | undefined, b: string | undefined): Resolved {
  if (!a || !b) return { kind: 'missing' };
  const upperA = a.toUpperCase();
  const upperB = b.toUpperCase();
  if (!BIOGUIDE_RX.test(upperA) || !BIOGUIDE_RX.test(upperB)) return { kind: 'invalid' };
  return { kind: 'ok', a: upperA, b: upperB };
}

function ChoosePairEmptyState() {
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
        }}
      >
        Choose two officials
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
        This page compares two members of Congress side by side: voting record, campaign finance,
        committees, and tenure. Open it from an official&apos;s profile, or build the address by
        hand as <code>/compare?a=&lt;id&gt;&amp;b=&lt;id&gt;</code> using the Bioguide ids from
        their profile pages.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/representatives"
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
          All officials
        </Link>
      </div>
    </div>
  );
}

export default async function CompareRoute({ searchParams }: PageProps) {
  const { a, b } = await searchParams;
  const pair = resolvePair(a, b);

  if (pair.kind === 'invalid') {
    notFound();
  }

  if (pair.kind === 'missing') {
    return <ChoosePairEmptyState />;
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
      <ComparePage bioguideA={pair.a} bioguideB={pair.b} />
    </>
  );
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { a, b } = await searchParams;
  const pair = resolvePair(a, b);
  const description =
    'Side-by-side comparison of two federal officials — voting record, campaign finance, committees, and tenure — sourced from Congress.gov and FEC filings.';

  if (pair.kind !== 'ok') {
    return {
      title: 'Compare officials',
      description,
      robots: { index: false, follow: true },
    };
  }

  const title = `Compare officials · ${pair.a} vs ${pair.b}`;
  const url = `https://civdotiq.org/compare?a=${pair.a}&b=${pair.b}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      images: SITE_OG_IMAGES,
      title,
      description,
      url,
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
