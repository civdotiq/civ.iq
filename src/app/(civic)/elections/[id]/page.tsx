/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Federal election (head-to-head) route — server component (PR 19).
 *
 * Race ids are uppercase, hyphen-separated:
 *   {year}-{office}-{state|NATIONAL}[-{district}]
 *   e.g. 2024-US_SENATE-OH, 2024-US_HOUSE-PA-07, 2026-US_HOUSE-NY-08
 *
 * State-leg races (STATE_SENATE / STATE_HOUSE) are out of scope and
 * fall through to the not-found stub. Outside `?v=new` (or
 * NEXT_PUBLIC_CIVIQ_V=new in non-prod) the route shows a "coming soon"
 * stub pointing at `?v=new` plus `/representatives` (closest existing
 * index — there is no elections index page yet).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { ElectionPage } from '@/components/elections/ElectionPage';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}

const RACE_ID_RE =
  /^(\d{4})-(US_PRESIDENT|US_SENATE|US_HOUSE|GOVERNOR)-([A-Z]{2}|NATIONAL)(?:-(\d{2}|AL|00))?$/;

function isValidRaceId(id: string): boolean {
  return RACE_ID_RE.test(id);
}

function ComingSoonStub({ id }: { id: string }) {
  const validated = isValidRaceId(id) ? id : null;
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
        Election · Race detail
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
        The redesigned head-to-head election page is in preview. Add <code>?v=new</code> to the URL
        to see it, or browse current officials below.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {validated && (
          <Link
            href={`/elections/${encodeURIComponent(validated)}?v=new`}
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
            Preview race →
          </Link>
        )}
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
          Officials
        </Link>
      </div>
    </div>
  );
}

function RaceNotFound({ id }: { id: string }) {
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
        Election · Race detail
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
        Race not found
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
        We could not match <code>{id}</code> to a federal race. Race ids look like{' '}
        <code>2024-US_SENATE-OH</code> for statewide races or <code>2024-US_HOUSE-PA-07</code> for
        House districts.
      </p>
      <Link
        href="/representatives"
        style={{
          display: 'inline-block',
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
        Browse officials →
      </Link>
    </div>
  );
}

export default async function ElectionRoute({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { v } = await searchParams;

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  const raceId = (id ?? '').trim().toUpperCase();

  if (!useRedesign) {
    return <ComingSoonStub id={raceId} />;
  }

  if (!isValidRaceId(raceId)) {
    return <RaceNotFound id={raceId} />;
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Elections', url: 'https://civdotiq.org/elections' },
          {
            name: `Race ${raceId}`,
            url: `https://civdotiq.org/elections/${raceId}`,
          },
        ]}
      />
      <ElectionPage raceId={raceId} />
    </>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const raceId = (id ?? '').trim().toUpperCase();
  if (!isValidRaceId(raceId)) {
    return {
      title: 'Race not found',
      description:
        'Federal race ids are formatted as {year}-{office}-{state} or {year}-US_HOUSE-{state}-{district}.',
    };
  }
  const title = `Election ${raceId} — head-to-head`;
  const description = `Federal race ${raceId}: candidate identity, FEC cycle finance totals, donor breakdown, and 2024 result (where covered by MEDSL).`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://civdotiq.org/elections/${raceId}`,
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
