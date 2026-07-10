/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * City council route — server component (PR 20).
 *
 * Municipality ids are lowercase slugs from `CITY_CONFIGS` in
 * `@/lib/local-government/pilot-cities`. Today: chicago, seattle,
 * boston, denver, austin, portland, oakland, minneapolis, philadelphia,
 * detroit.
 *
 * Outside `?v=new` (or NEXT_PUBLIC_CIVIQ_V=new in non-prod) the route
 * shows a "coming soon" stub pointing at `?v=new` and `/local`.
 *
 * Cities not in CITY_CONFIGS render a designed "City not yet covered"
 * stub. Validation also rejects path-traversal slugs.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { LocalCouncilPage } from '@/components/local/LocalCouncilPage';
import { getCityConfig, isValidMunicipalityId } from '@/components/local/LocalCouncilPage/data';

interface PageProps {
  params: Promise<{ municipalityId: string }>;
  searchParams: Promise<{ v?: string }>;
}

function ComingSoonStub({ municipalityId }: { municipalityId: string }) {
  const cityConfig = getCityConfig(municipalityId);
  const previewHref = cityConfig ? `/local/${encodeURIComponent(cityConfig.id)}?v=new` : null;
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
        Local government · City council
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
        The redesigned city council page is in preview. Add <code>?v=new</code> to the URL to see
        it, or browse the local-government index.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {previewHref && (
          <Link
            href={previewHref}
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
            Preview council →
          </Link>
        )}
        <Link
          href="/local"
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
          Local index
        </Link>
      </div>
    </div>
  );
}

function CityNotCoveredStub({ municipalityId }: { municipalityId: string }) {
  const display = isValidMunicipalityId(municipalityId) ? municipalityId : '(invalid id)';
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
        Local government · City council
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
        City not yet covered
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
        CIV.IQ has not wired council data for <code>{display}</code>. There is no national local-
        government API; coverage expands one city at a time after verifying each Legistar endpoint.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/local/chicago?v=new"
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
          Preview Chicago →
        </Link>
        <Link
          href="/local"
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
          Local index
        </Link>
      </div>
    </div>
  );
}

export default async function LocalCouncilRoute({ params, searchParams }: PageProps) {
  const { municipalityId } = await params;
  const { v } = await searchParams;

  const rawId = (municipalityId ?? '').trim().toLowerCase();
  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (!useRedesign) {
    return <ComingSoonStub municipalityId={rawId} />;
  }

  if (!isValidMunicipalityId(rawId)) {
    return <CityNotCoveredStub municipalityId={rawId} />;
  }

  const cityConfig = getCityConfig(rawId);
  if (!cityConfig) {
    return <CityNotCoveredStub municipalityId={rawId} />;
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Local Government', url: 'https://civdotiq.org/local' },
          {
            name: `${cityConfig.name} City Council`,
            url: `https://civdotiq.org/local/${cityConfig.id}`,
          },
        ]}
      />
      <LocalCouncilPage cityConfig={cityConfig} />
    </>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { municipalityId } = await params;
  const rawId = (municipalityId ?? '').trim().toLowerCase();
  if (!isValidMunicipalityId(rawId)) {
    return {
      title: 'City not yet covered',
      description:
        'CIV.IQ covers a pilot list of city councils via Legistar. The id requested is not on that list.',
    };
  }
  const cityConfig = getCityConfig(rawId);
  if (!cityConfig) {
    return {
      title: 'City not yet covered',
      description:
        'CIV.IQ covers a pilot list of city councils via Legistar. The id requested is not on that list.',
    };
  }
  const title = `${cityConfig.name} City Council`;
  const description = `${cityConfig.name}, ${cityConfig.state}: council roster and recent legislation from Legistar.`;
  return {
    title,
    description,
    alternates: { canonical: `https://civdotiq.org/local/${cityConfig.id}` },
    openGraph: {
      title,
      description,
      url: `https://civdotiq.org/local/${cityConfig.id}`,
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
