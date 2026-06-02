/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * PAC profile route — server component (PR 17).
 *
 * Validates the FEC committee id (`/^C\d{8}$/`), gates the redesign
 * behind `?v=new`, and renders the client `<PACProfilePage />` for the
 * preview. Outside of preview the route shows a "coming soon" stub
 * pointing at `?v=new` plus `/representatives` (no PAC index page
 * exists today).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema, OrganizationSchema } from '@/components/seo/JsonLd';
import { PACProfilePage } from '@/components/pacs/PACProfilePage';
import { fecApiService } from '@/lib/fec/fec-api-service';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}

const COMMITTEE_ID_RE = /^C\d{8}$/;

function ComingSoonStub({ id }: { id: string }) {
  const validated = COMMITTEE_ID_RE.test(id) ? id : null;
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
        Money · Outside groups · PAC profile
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
        The redesigned PAC profile is in preview. PAC index is in development. Add{' '}
        <code>?v=new</code> to the URL to see the redesign, or browse representatives below.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {validated && (
          <Link
            href={`/pacs/${validated}?v=new`}
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
            Preview PAC →
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
          Representatives
        </Link>
      </div>
    </div>
  );
}

function CommitteeNotFound({ id }: { id: string }) {
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
        Money · Outside groups · PAC profile
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
        Committee not found
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
        We could not match <code>{id}</code> to an FEC committee. Committee ids are the letter{' '}
        <code>C</code> followed by eight digits — for example <code>C00484642</code>.
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
        Representatives →
      </Link>
    </div>
  );
}

export default async function PACProfileRoute({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { v } = await searchParams;

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  const upperId = (id ?? '').toUpperCase();

  if (!useRedesign) {
    return <ComingSoonStub id={upperId} />;
  }

  if (!COMMITTEE_ID_RE.test(upperId)) {
    return <CommitteeNotFound id={id} />;
  }

  // Real FEC committee data only — if the lookup fails, omit the Organization
  // node rather than emit a placeholder. (Cached 30 days inside the service.)
  const committeeInfo = await fecApiService.getCommitteeInfo(upperId).catch(() => null);
  const pacUrl = `https://civdotiq.org/pacs/${upperId}`;

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Money', url: 'https://civdotiq.org/finance/filings' },
          { name: `PAC ${upperId}`, url: pacUrl },
        ]}
      />
      {committeeInfo?.name && (
        <OrganizationSchema
          name={committeeInfo.name}
          url={pacUrl}
          id={`${pacUrl}#organization`}
          logo={null}
          description={`${committeeInfo.committee_type_full ?? 'Political committee'} registered with the U.S. Federal Election Commission (committee ${upperId}).`}
          sameAs={[`https://www.fec.gov/data/committee/${upperId}/`]}
          identifier={upperId}
        />
      )}
      <PACProfilePage committeeId={upperId} />
    </>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const upperId = (id ?? '').toUpperCase();
  if (!COMMITTEE_ID_RE.test(upperId)) {
    return {
      title: 'Committee not found',
      description: 'FEC committee ids start with C followed by eight digits.',
    };
  }
  const title = `PAC ${upperId} — campaign finance file`;
  const description = `FEC committee ${upperId}: cycle totals, top recipients, donor-tier breakdown, and recipients' voting alignment.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://civdotiq.org/pacs/${upperId}`,
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
