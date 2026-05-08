/**
 * Issue Topic Page — Server component (PR 16)
 *
 * Dynamic route for redesigned topic pages. Resolves a topic slug to a
 * Congress.gov policyArea and renders <IssueTopicPage /> behind ?v=new.
 *
 * Twelve hand-built static topic folders (agriculture, defense, economy,
 * education, environment, finance, foreign-policy, healthcare, immigration,
 * infrastructure, justice, technology) live one level above this file and
 * win the route resolution because Next.js prefers static segments over
 * dynamic. That means this dynamic route is intentionally narrow today —
 * it serves slugs the static set does not cover (housing, taxation,
 * armed-forces-and-national-security, etc.). The full migration of the
 * static SEO pages onto this dynamic route is tracked separately in
 * PLAN-redesign-implementation-2026-05.md (PR 16.5 / PR 0 follow-up).
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { IssueTopicPage } from '@/components/topics/IssueTopicPage';
import {
  policyAreaDisplayName,
  resolveSlugToPolicyArea,
  sectorToIndustrySlug,
} from '@/components/topics/IssueTopicPage/data';
import { getPolicyAreaMapping } from '@/lib/connections/policy-area-map';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}

function ComingSoonStub({ slug }: { slug: string }) {
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
        Topics · Issue file
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
        The redesigned topic page is in preview. Add <code>?v=new</code> to the URL to see the
        redesign, or browse all topics below.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href={`/topics/${slug}?v=new`}
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
          Preview topic →
        </Link>
        <Link
          href="/topics"
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
          All topics
        </Link>
      </div>
    </div>
  );
}

function TopicNotFound({ slug }: { slug: string }) {
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
        Topics · Issue file
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
        Topic not found
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
        We could not match <code>{slug}</code> to a Congress.gov policy area. Browse the topic index
        for the full list.
      </p>
      <Link
        href="/topics"
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
        All topics →
      </Link>
    </div>
  );
}

export default async function TopicPageRoute({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { v } = await searchParams;

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (!useRedesign) {
    return <ComingSoonStub slug={slug} />;
  }

  const policyArea = resolveSlugToPolicyArea(slug);
  if (!policyArea) {
    return <TopicNotFound slug={slug} />;
  }

  const mapping = getPolicyAreaMapping(policyArea);
  const firstSector = mapping?.industrySectors[0] ?? null;
  const industrySectorSlug = firstSector ? sectorToIndustrySlug(firstSector) : null;
  const industrySectorLabel = firstSector ?? null;
  const displayName = policyAreaDisplayName(policyArea);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: displayName, url: `https://civdotiq.org/topics/${slug}` },
        ]}
      />
      <IssueTopicPage
        slug={slug}
        policyArea={policyArea}
        displayName={displayName}
        industrySectorSlug={industrySectorSlug}
        industrySectorLabel={industrySectorLabel}
      />
    </>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const policyArea = resolveSlugToPolicyArea(slug);
  if (!policyArea) {
    return {
      title: 'Topic not found',
      description: 'Browse policy topics across federal legislation, regulation, and finance.',
    };
  }
  const title = `${policyArea} — Federal policy file`;
  const description = `Bills, regulations, oversight committees, and industry contributions tied to ${policyArea} in the current Congress.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://civdotiq.org/topics/${slug}`,
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
