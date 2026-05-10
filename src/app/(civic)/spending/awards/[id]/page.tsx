/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Federal award detail route — server component (PR 18).
 *
 * Validates the USASpending generated_unique_award_id format and gates
 * the redesign behind `?v=new`. Outside of preview the route shows a
 * "coming soon" stub pointing at `?v=new` plus `/spending` (the
 * district lookup is the closest thing to an awards index today).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { SpendingContractPage } from '@/components/spending/SpendingContractPage';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}

const AWARD_ID_RE = /^[A-Z0-9_\-]{8,200}$/i;

function ComingSoonStub({ id }: { id: string }) {
  const validated = AWARD_ID_RE.test(id) ? id : null;
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
        Federal spending · Award detail
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
        The redesigned federal award page is in preview. Add <code>?v=new</code> to the URL to see
        it, or browse federal spending by congressional district below.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {validated && (
          <Link
            href={`/spending/awards/${encodeURIComponent(validated)}?v=new`}
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
            Preview award →
          </Link>
        )}
        <Link
          href="/spending"
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
          District spending
        </Link>
      </div>
    </div>
  );
}

function AwardNotFound({ id }: { id: string }) {
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
        Federal spending · Award detail
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
        Award not found
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
        We could not match <code>{id}</code> to a USASpending award. Award ids look like{' '}
        <code>CONT_AWD_NAS1510000_8000_-NONE-_-NONE-</code> for contracts or{' '}
        <code>ASST_NON_69A36520C00009_6925</code> for assistance.
      </p>
      <Link
        href="/spending"
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
        District spending →
      </Link>
    </div>
  );
}

export default async function SpendingAwardRoute({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { v } = await searchParams;

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  const awardId = (id ?? '').trim();

  if (!useRedesign) {
    return <ComingSoonStub id={awardId} />;
  }

  if (!AWARD_ID_RE.test(awardId)) {
    return <AwardNotFound id={awardId} />;
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Federal Spending', url: 'https://civdotiq.org/spending' },
          {
            name: `Award ${awardId}`,
            url: `https://civdotiq.org/spending/awards/${awardId}`,
          },
        ]}
      />
      <SpendingContractPage awardId={awardId} />
    </>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const awardId = (id ?? '').trim();
  if (!AWARD_ID_RE.test(awardId)) {
    return {
      title: 'Award not found',
      description: 'USASpending award ids are alphanumeric, may include underscores and hyphens.',
    };
  }
  const title = `Federal award ${awardId} — file`;
  const description = `USASpending award ${awardId}: awarder, recipient, period of performance, obligation schedule, and peer awards.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://civdotiq.org/spending/awards/${awardId}`,
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
