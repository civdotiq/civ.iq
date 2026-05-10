/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * PAC profile redesigned page (PR 17). Reduced-scope per 2026-05-10
 * decisions:
 * - 4 headline metrics (no "avg gift size" or "million-dollar+" — both
 *   need Schedule A entity resolution we don't have)
 * - donors-by-size aggregate panel replaces the named-donor "Top
 *   donors" list (entity resolution out of scope)
 * - vote-trace aside replaces "Independent expenditures by race"
 *   (Schedule-E-by-committee wrapper not yet built — see TODO below)
 * - cycle-by-cycle bars replace the quarterly chart (Form 3X parsing
 *   needed for quarters)
 *
 * TODO (post-PR-17): when fecApiService.getIndependentExpendituresByCommittee
 * lands, restore the IE-by-race panel as a third body column. The
 * current vote-alignment aside answers a different question and is not
 * a substitute.
 */

'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { CqDisclaimer, CqLabel, CqPlainReading, CqSourceTag } from '@/components/cq';
import { PACHero } from './PACHero';
import { HeadlineMetrics } from './HeadlineMetrics';
import { RecipientsPanel } from './RecipientsPanel';
import { DonorsBySizePanel } from './DonorsBySizePanel';
import { CycleSpendChart } from './CycleSpendChart';
import { VoteAlignmentAside } from './VoteAlignmentAside';
import { DEFAULT_CYCLE, formatCompactDollars, isoToReadable, summariseBuckets } from './data';
import type {
  CommitteeInfoPayload,
  CommitteeTotalsPayload,
  CyclesPayload,
  DonorsBySizePayload,
  PACVoteInsightPayload,
  RecipientsPayload,
} from './types';

interface PACProfilePageProps {
  committeeId: string;
}

interface FetchResult<T> {
  data: T | null;
  unavailable: boolean;
}

async function fetcher<T>(url: string): Promise<FetchResult<T>> {
  const res = await fetch(url);
  if (res.status === 404) return { data: null, unavailable: true };
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return { data: (await res.json()) as T, unavailable: false };
}

export function PACProfilePage({ committeeId }: PACProfilePageProps) {
  const cycle = DEFAULT_CYCLE;

  const { data: infoResult, isLoading: infoLoading } = useSWR<FetchResult<CommitteeInfoPayload>>(
    `pac:info:${committeeId}`,
    () => fetcher<CommitteeInfoPayload>(`/api/pac/${committeeId}/info`),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const { data: totalsResult, isLoading: totalsLoading } = useSWR<
    FetchResult<CommitteeTotalsPayload>
  >(
    `pac:totals:${committeeId}:${cycle}`,
    () => fetcher<CommitteeTotalsPayload>(`/api/pac/${committeeId}/totals?cycle=${cycle}`),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const { data: recipientsResult, isLoading: recipientsLoading } = useSWR<
    FetchResult<RecipientsPayload>
  >(
    `pac:recipients:${committeeId}:${cycle}`,
    () => fetcher<RecipientsPayload>(`/api/pac/${committeeId}/recipients?cycle=${cycle}&limit=12`),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const { data: cyclesResult, isLoading: cyclesLoading } = useSWR<FetchResult<CyclesPayload>>(
    `pac:cycles:${committeeId}`,
    () => fetcher<CyclesPayload>(`/api/pac/${committeeId}/cycles`),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const { data: donorsResult, isLoading: donorsLoading } = useSWR<FetchResult<DonorsBySizePayload>>(
    `pac:donors:${committeeId}:${cycle}`,
    () => fetcher<DonorsBySizePayload>(`/api/pac/${committeeId}/donors-by-size?cycle=${cycle}`),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const { data: voteResult, isLoading: voteLoading } = useSWR<FetchResult<PACVoteInsightPayload>>(
    `pac:vote:${committeeId}`,
    () => fetcher<PACVoteInsightPayload>(`/api/intelligence/pac/${committeeId}`),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const info = infoResult?.data ?? null;
  const totals = totalsResult?.data ?? null;
  const recipients = recipientsResult?.data?.recipients ?? [];
  const cycles = cyclesResult?.data?.cycles ?? [];
  const donorBuckets = donorsResult?.data?.buckets ?? [];
  const voteInsight = voteResult?.data ?? null;
  const voteUnavailable = voteResult?.unavailable ?? false;

  const dataAsOf = isoToReadable(
    info?.dataAsOf ?? totals?.dataAsOf ?? cyclesResult?.data?.dataAsOf ?? new Date().toISOString()
  );

  const { smallShare, total: donorTotal } = summariseBuckets(donorBuckets);
  const topRecipientName = recipients[0]?.recipientName ?? null;

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
          href="/representatives"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--fg3)',
            textDecoration: 'none',
          }}
        >
          ← All officials
        </Link>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <CqSourceTag compact source="FEC" id={committeeId} />
          <CqSourceTag compact source="FEC vote-trace" id="recipients × votes" />
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
        <CqLabel>Money · Outside groups · PAC profile</CqLabel>
        <span
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          As of {dataAsOf}
        </span>
      </div>

      <PACHero committeeId={committeeId} info={info} loading={infoLoading} />

      <HeadlineMetrics totals={totals} loading={totalsLoading} />

      {/* 2-column body: top recipients (left) + donors by size (right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 32,
          marginTop: 32,
          marginBottom: 32,
        }}
      >
        <RecipientsPanel recipients={recipients} loading={recipientsLoading} cycle={cycle} />
        <DonorsBySizePanel buckets={donorBuckets} loading={donorsLoading} cycle={cycle} />
      </div>

      {/* Cycle spend chart */}
      <div style={{ marginBottom: 32 }}>
        <CqLabel>Cycle pace · last 5 cycles</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
          Raised vs disbursed by cycle
        </div>
        <div
          style={{
            border: '2px solid var(--ink)',
            padding: 24,
            height: 260,
            position: 'relative',
            background: 'var(--bg1)',
          }}
        >
          {cyclesLoading && cycles.length === 0 ? (
            <div
              style={{
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Fetching cycle totals…
            </div>
          ) : (
            <CycleSpendChart cycles={cycles} />
          )}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--fg3)',
            lineHeight: 1.5,
          }}
        >
          Cycle aggregates from FEC committee totals. Quarterly view requires Form 3X parsing and is
          deferred.
        </div>
      </div>

      <VoteAlignmentAside
        insight={voteInsight}
        unavailable={voteUnavailable}
        loading={voteLoading}
      />

      <div style={{ marginTop: 32 }}>
        <CqPlainReading>
          {plainReading({
            info,
            totals,
            cycle,
            topRecipientName,
            smallShare,
            donorTotal,
          })}
        </CqPlainReading>
      </div>

      <div
        style={{
          marginTop: 28,
          paddingTop: 16,
          borderTop: '2px solid var(--ink)',
        }}
      >
        <CqDisclaimer
          confidence={voteInsight?.confidence ?? 0.92}
          asof={dataAsOf}
          method="Direct ingestion · FEC openFEC committee totals + schedule_b/by_recipient_id + schedule_a/by_size; vote tracing via /api/intelligence/pac"
        >
          {' '}
          Top recipients reflect FEC Schedule B aggregations only. Donor tiers are aggregate by gift
          size &mdash; named donors are not entity-resolved. Vote tracing is a correlational measure
          of recipients&rsquo; floor votes vs the PAC&rsquo;s apparent sector interest, not a claim
          that money caused the votes.
        </CqDisclaimer>
      </div>
    </div>
  );
}

function plainReading({
  info,
  totals,
  cycle,
  topRecipientName,
  smallShare,
  donorTotal,
}: {
  info: CommitteeInfoPayload | null;
  totals: CommitteeTotalsPayload | null;
  cycle: number;
  topRecipientName: string | null;
  smallShare: number;
  donorTotal: number;
}): string {
  if (!info && !totals) {
    return 'Loading committee filings, recipients, and donor-tier breakdown for this PAC…';
  }
  const name = info?.name ?? 'This committee';
  const raised = totals?.receipts ? formatCompactDollars(totals.receipts) : '—';
  const cycleSpan = `${cycle - 1}–${cycle}`;
  const smallPct = donorTotal > 0 ? Math.round(smallShare * 100) : null;
  const recipientFragment = topRecipientName
    ? ` The largest single recipient of disbursements this cycle is ${topRecipientName}.`
    : '';
  const smallFragment =
    smallPct !== null
      ? ` ${smallPct}% of itemised receipts came from contributions under $200.`
      : '';
  return `${name} raised ${raised} in the ${cycleSpan} cycle to date.${smallFragment}${recipientFragment}`;
}
