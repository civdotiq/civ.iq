/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 *
 * IssueTopicPage — redesigned topic file (PR 16). Reduced-scope per
 * 2026-05-08 plan: no sub-topic taxonomy, no milestones timeline, no
 * sponsor/opposition split, no co-sponsor counts. See PROMPT-... for
 * full deferral rationale.
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { CqDisclaimer, CqLabel, CqPlainReading, CqSourceTag } from '@/components/cq';
import { TopicHero } from './TopicHero';
import { TopicFileAside } from './TopicFileAside';
import { CommitteesStrip } from './CommitteesStrip';
import { BillsTable } from './BillsTable';
import { RegulationsList } from './RegulationsList';
import { isoToReadable } from './data';
import type { IssueTopicPageProps, OrgsPayload, PolicyAreaPayload } from './types';

const fetcher = async <T,>(url: string): Promise<T | null> => {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return (await res.json()) as T;
};

export function IssueTopicPage({
  slug,
  policyArea,
  displayName,
  industrySectorSlug,
  industrySectorLabel,
}: IssueTopicPageProps) {
  const policyAreaUrl = `/api/search/policy-area?policyArea=${encodeURIComponent(policyArea)}&limit=20`;
  const orgsUrl = industrySectorSlug
    ? `/api/industry/${encodeURIComponent(industrySectorSlug)}/organizations`
    : null;

  const {
    data: policyAreaData,
    isLoading: policyAreaLoading,
    error: policyAreaError,
  } = useSWR<PolicyAreaPayload | null>(`policy-area:${policyArea}`, () => fetcher(policyAreaUrl), {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const { data: orgs } = useSWR<OrgsPayload | null>(
    orgsUrl ? `orgs:${industrySectorSlug}` : null,
    orgsUrl ? () => fetcher(orgsUrl) : null,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const dataAsOf = useMemo(
    () => isoToReadable(policyAreaData?.metadata.generatedAt ?? new Date().toISOString()),
    [policyAreaData]
  );

  const billsShown = policyAreaData?.bills.length ?? 0;
  // The area's full count from the corpus; the list is capped at the fetch limit.
  const billsCount = policyAreaData?.billsTotal ?? billsShown;
  const regulationsCount = policyAreaData?.regulations.length ?? 0;
  const committeesCount = policyAreaData?.committees.length ?? 0;

  return (
    <div
      style={{
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        fontFamily: 'var(--font-primary)',
        padding: '32px 36px 56px',
        maxWidth: 1280,
        margin: '0 auto',
      }}
    >
      {/* Top rail */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/topics"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--fg3)',
            textDecoration: 'none',
          }}
        >
          ← All topics
        </Link>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <CqSourceTag compact source="Congress.gov" id="bills + committees" />
          <CqSourceTag compact source="Federal Register" id="regulations" />
          {industrySectorSlug && (
            <CqSourceTag compact source="Senate LDA" id={industrySectorSlug} />
          )}
        </div>
      </div>

      {/* Crumb-line context */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          marginBottom: 16,
          gap: 12,
        }}
      >
        <CqLabel>Topics · {displayName}</CqLabel>
        <span
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          119th Congress · As of {dataAsOf}
        </span>
      </div>

      {/* Hero */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 32,
          paddingBottom: 24,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <TopicHero
          displayName={displayName}
          industrySectorLabel={industrySectorLabel}
          policyArea={policyArea}
        />
        <TopicFileAside policyArea={policyAreaData ?? null} loading={policyAreaLoading} />
      </div>

      {/* Active committees strip */}
      <section style={{ marginTop: 28 }}>
        <div style={{ marginBottom: 12 }}>
          <CqLabel>Active committees · jurisdiction</CqLabel>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
            Where {displayName.toLowerCase()} bills are referred
          </div>
        </div>
        <CommitteesStrip
          committees={policyAreaData?.committees ?? []}
          loading={policyAreaLoading}
        />
      </section>

      {/* Bills + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, marginTop: 32 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <CqLabel>
                Active legislation · {Math.min(8, billsShown)} of{' '}
                {billsCount.toLocaleString('en-US')} shown
              </CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                Bills filed under {displayName}
              </div>
            </div>
            <Link
              href={`/legislation?policyArea=${encodeURIComponent(policyArea)}`}
              style={{
                fontSize: 11,
                color: 'var(--civiq-blue-active)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                fontFamily: 'var(--font-mono)',
              }}
            >
              All matching bills →
            </Link>
          </div>
          <BillsTable bills={policyAreaData?.bills ?? []} loading={policyAreaLoading} />
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {industrySectorSlug && industrySectorLabel && (
            <Link
              href={`/industry/${industrySectorSlug}`}
              style={{
                border: '2px solid var(--ink)',
                padding: '14px 16px',
                display: 'block',
                textDecoration: 'none',
                color: 'var(--fg1)',
              }}
            >
              <CqLabel>Related industry</CqLabel>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>
                {industrySectorLabel}
              </div>
              <div
                style={{
                  fontSize: 11,
                  marginTop: 6,
                  color: 'var(--civiq-blue-active)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                House yes-vote rates on {industrySectorLabel.toLowerCase()} bills →
              </div>
            </Link>
          )}
          <RegulationsList
            regulations={policyAreaData?.regulations ?? []}
            loading={policyAreaLoading}
          />
        </aside>
      </div>

      <div style={{ marginTop: 32 }}>
        <CqPlainReading>
          {policyAreaData
            ? `${billsCount.toLocaleString('en-US')} bill${billsCount === 1 ? '' : 's'} under "${policyArea}" are tracked in the current Congress${
                committeesCount > 0
                  ? `, with ${committeesCount} committee${committeesCount === 1 ? '' : 's'} holding jurisdiction`
                  : ''
              }${
                regulationsCount > 0
                  ? ` and ${regulationsCount} recent Federal Register entr${regulationsCount === 1 ? 'y' : 'ies'}`
                  : ''
              }.`
            : policyAreaError
              ? 'Cross-domain results are unavailable right now. Refresh in a moment — /api/search/policy-area cold-start joins can take 5–10 seconds.'
              : 'Loading bills, regulations, and committees for this policy area…'}
        </CqPlainReading>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.9}
          asof={dataAsOf}
          method="Direct ingestion · Congress.gov, Federal Register, Senate LDA"
        >
          {' '}
          Topic clustering uses Congress.gov policy-area codes plus FEC industry classifications. A
          bill may appear under multiple topics.
          {orgs?.corpusLobbying
            ? ` Lobby roll-up: ${orgs.corpusLobbying.organizationCount.toLocaleString()} organizations across ${orgs.corpusLobbying.filingCount.toLocaleString()} filings on these issue areas, from the complete Senate LDA corpus.`
            : ''}
          {/* Slug echo for QA traceability */}
          <span style={{ display: 'none' }}>{slug}</span>
        </CqDisclaimer>
      </div>
    </div>
  );
}
