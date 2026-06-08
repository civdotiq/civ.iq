/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
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
import { MoneyFlowPanel } from './MoneyFlowPanel';
import { RecipientsList } from './RecipientsList';
import { RegulationsList } from './RegulationsList';
import { computePartyTotals, formatCompactDollars, isoToReadable, topRecipients } from './data';
import type {
  IssueTopicPageProps,
  LeaderboardPayload,
  OrgsPayload,
  PolicyAreaPayload,
} from './types';

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
  const leaderboardUrl = industrySectorSlug
    ? `/api/intelligence/sector/${industrySectorSlug}/leaderboard?limit=100`
    : null;
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

  const { data: leaderboard, isLoading: leaderboardLoading } = useSWR<LeaderboardPayload | null>(
    leaderboardUrl ? `leaderboard:${industrySectorSlug}` : null,
    leaderboardUrl ? () => fetcher(leaderboardUrl) : null,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const { data: orgs } = useSWR<OrgsPayload | null>(
    orgsUrl ? `orgs:${industrySectorSlug}` : null,
    orgsUrl ? () => fetcher(orgsUrl) : null,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const partyTotals = leaderboard?.entries ? computePartyTotals(leaderboard.entries) : null;
  const recipients = leaderboard?.entries ? topRecipients(leaderboard.entries, 6) : [];
  const topRecipient = recipients[0] ?? null;
  const industryTotal = partyTotals && partyTotals.total > 0 ? partyTotals.total : null;

  const dataAsOf = useMemo(
    () =>
      isoToReadable(
        policyAreaData?.metadata.generatedAt ?? leaderboard?.dataAsOf ?? new Date().toISOString()
      ),
    [policyAreaData, leaderboard]
  );

  const billsCount = policyAreaData?.bills.length ?? 0;
  const regulationsCount = policyAreaData?.regulations.length ?? 0;
  const committeesCount = policyAreaData?.committees.length ?? 0;
  const dPct =
    partyTotals && partyTotals.total > 0
      ? Math.round((partyTotals.d / partyTotals.total) * 100)
      : 0;
  const rPct =
    partyTotals && partyTotals.total > 0
      ? Math.round((partyTotals.r / partyTotals.total) * 100)
      : 0;

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
          {industrySectorSlug && <CqSourceTag compact source="FEC" id={industrySectorSlug} />}
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
        <TopicFileAside
          policyArea={policyAreaData ?? null}
          topRecipient={topRecipient}
          industryTotal={industryTotal}
          loading={policyAreaLoading || leaderboardLoading}
        />
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
                Active legislation · {Math.min(8, billsCount)} of {billsCount} shown
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

          <MoneyFlowPanel
            totals={partyTotals}
            industryLabel={industrySectorLabel}
            loading={leaderboardLoading}
          />
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RecipientsList entries={recipients} loading={leaderboardLoading} />
          <RegulationsList
            regulations={policyAreaData?.regulations ?? []}
            loading={policyAreaLoading}
          />
        </aside>
      </div>

      <div style={{ marginTop: 32 }}>
        <CqPlainReading>
          {policyAreaData
            ? `${billsCount} bill${billsCount === 1 ? '' : 's'} under "${policyArea}" are tracked in the current Congress${
                committeesCount > 0
                  ? `, with ${committeesCount} committee${committeesCount === 1 ? '' : 's'} holding jurisdiction`
                  : ''
              }${
                regulationsCount > 0
                  ? ` and ${regulationsCount} recent Federal Register entr${regulationsCount === 1 ? 'y' : 'ies'}`
                  : ''
              }.${
                industryTotal !== null && industrySectorLabel
                  ? ` ${industrySectorLabel} contributions to current members total ${formatCompactDollars(industryTotal)} this cycle — ${dPct}% to Democrats, ${rPct}% to Republicans.`
                  : ''
              }`
            : policyAreaError
              ? 'Cross-domain results are unavailable right now. Refresh in a moment — /api/search/policy-area cold-start joins can take 5–10 seconds.'
              : 'Loading bills, regulations, committees, and industry contributions for this policy area…'}
        </CqPlainReading>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.9}
          asof={dataAsOf}
          method="Direct ingestion · Congress.gov, Federal Register, FEC.gov"
        >
          {' '}
          Topic clustering uses Congress.gov policy-area codes plus FEC industry classifications. A
          bill may appear under multiple topics. Industry contributions reflect cached vote-finance
          insights computed from individual representative profiles.
          {orgs?.metrics
            ? ` Lobby roll-up: ${formatCompactDollars(orgs.metrics.totalLobbyingSpending)} across ${orgs.metrics.activeLobbyingOrgCount} registrants.`
            : ''}
          {/* Slug echo for QA traceability */}
          <span style={{ display: 'none' }}>{slug}</span>
        </CqDisclaimer>
      </div>
    </div>
  );
}
