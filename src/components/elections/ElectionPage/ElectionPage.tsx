/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Election head-to-head detail redesigned page (PR 19). Reduced-scope
 * per 2026-05-10 decisions:
 *
 * - PollChart CUT — no government API for opinion polling, FiveThirtyEight
 *   shut down 2025-03, all alternatives are commercial scrapes.
 * - Endorsement panels CUT — no government API; Wikipedia/Ballotpedia
 *   would require structured scraping out of scope here.
 * - Cook rating + polling avg ticker cells CUT — same reason.
 * - "Top industry" / "Top outside group" lines CUT — no FEC industry
 *   rollup endpoint without OpenSecrets enrichment.
 *
 * RENDERED:
 * - Two-cell ticker (days to election + total spent)
 * - Head-to-head hero with both candidates
 * - Two ComparePane finance blocks (FEC totals + by-size small donor)
 * - 2024 result inset (only when state in MEDSL coveredStates)
 *
 * TODO (post-PR-19): when curated polling aggregate (e.g. FiveThirtyEight
 * archive on GitHub, Wikipedia race articles) lands as a real data
 * source, add a polling panel below the ComparePanes. Same for an
 * endorsements panel sourced from a citable, ingestable feed.
 */

'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { CqDisclaimer, CqLabel, CqSourceTag } from '@/components/cq';
import { AlsoFiledList } from './AlsoFiledList';
import { CandidateHero } from './CandidateHero';
import { ComparePane } from './ComparePane';
import { Result2024Inset } from './Result2024Inset';
import { TickerStrip } from './TickerStrip';
import {
  daysUntil,
  formatDateLong,
  generalElectionDay,
  officeLabel,
  parseRaceId,
  raceTitle,
} from './data';
import type {
  ElectionFinancePayload,
  ElectionRacePayload,
  ElectionTotalSpentPayload,
} from './types';

interface ElectionPageProps {
  raceId: string;
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

export function ElectionPage({ raceId }: ElectionPageProps) {
  const parsed = parseRaceId(raceId);
  const encodedId = encodeURIComponent(raceId);

  const { data: raceResult, isLoading: raceLoading } = useSWR<FetchResult<ElectionRacePayload>>(
    `election:race:${raceId}`,
    () => fetcher<ElectionRacePayload>(`/api/elections/${encodedId}`),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const race = raceResult?.data ?? null;
  const raceUnavailable = raceResult?.unavailable ?? false;

  // Compare the top two fundraisers head-to-head (any party); everyone
  // else who has filed appears in the "Also filed" list below the hero.
  const candidates = race?.candidates ?? [];
  const topTwo = candidates.slice(0, 2);
  const alsoFiled = candidates.slice(2);
  const compareIds = topTwo.map(c => c.candidateId);
  const allIds = candidates.map(c => c.candidateId);
  const partiesParam = topTwo.map(c => c.party).join(',');
  const cycle = race?.cycle ?? parsed?.year ?? null;

  const financeKey =
    compareIds.length > 0 && cycle
      ? `election:finance:${raceId}:${cycle}:${compareIds.join(',')}`
      : null;
  const { data: financeResult, isLoading: financeLoading } = useSWR<
    FetchResult<ElectionFinancePayload>
  >(
    financeKey,
    () =>
      fetcher<ElectionFinancePayload>(
        `/api/elections/${encodedId}/finance?ids=${compareIds.join(',')}&parties=${partiesParam}&cycle=${cycle}`
      ),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const totalSpentKey =
    allIds.length > 0 && cycle
      ? `election:totalSpent:${raceId}:${cycle}:${allIds.join(',')}`
      : null;
  const { data: totalResult, isLoading: totalLoading } = useSWR<
    FetchResult<ElectionTotalSpentPayload>
  >(
    totalSpentKey,
    () =>
      fetcher<ElectionTotalSpentPayload>(
        `/api/elections/${encodedId}/total-spent?ids=${allIds.join(',')}&cycle=${cycle}`
      ),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  if (!parsed) {
    return <RaceNotFound raceId={raceId} reason="invalid-format" />;
  }

  if (raceUnavailable && !raceLoading) {
    return <RaceNotFound raceId={raceId} reason="not-contested" />;
  }

  const electionDay = generalElectionDay(parsed.year);
  const daysRemaining = daysUntil(electionDay);

  const totalSpent = totalResult?.data?.totalSpent ?? null;

  const dataAsOf =
    raceResult?.data?.dataAsOf ??
    financeResult?.data?.dataAsOf ??
    totalResult?.data?.dataAsOf ??
    new Date().toISOString();

  const leftCandidate = topTwo[0] ?? null;
  const rightCandidate = topTwo[1] ?? null;
  const financeFor = (candidateId: string | undefined) =>
    financeResult?.data?.candidates.find(c => c.candidateId === candidateId) ?? null;

  // MEDSL 2024 result columns are two-party (D/R); label them with the
  // race's top filer from each major party when one exists.
  const topDem = candidates.find(c => c.party === 'DEM' || c.party === 'DFL') ?? null;
  const topRep = candidates.find(c => c.party === 'REP' || c.party === 'GOP') ?? null;

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
          href={parsed?.year === 2026 ? '/elections/2026' : '/elections'}
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--fg3)',
            textDecoration: 'none',
          }}
        >
          ← All elections
        </Link>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <CqSourceTag compact source="FEC" id={`cycle ${cycle ?? '—'}`} />
          {race?.result2024 && <CqSourceTag compact source="MEDSL · 2024" id={race.state} />}
        </div>
      </div>

      {/* Crumb-line */}
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
        <CqLabel>
          {parsed.year} · {raceTitle(parsed)}
        </CqLabel>
        <span
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          As of {formatDateLong(dataAsOf)}
        </span>
      </div>

      <TickerStrip
        electionDay={electionDay}
        daysRemaining={daysRemaining}
        totalSpent={totalSpent}
        totalSpentLoading={totalLoading || (!!totalSpentKey && !totalResult)}
      />

      {/* Head-to-head hero */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 1fr',
          gap: 0,
          border: '2px solid var(--ink)',
          background: 'var(--bg1)',
          marginBottom: 32,
        }}
      >
        <CandidateHero candidate={leftCandidate} loading={raceLoading} />
        <div
          style={{
            background: 'var(--ink)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 8,
            padding: '40px 0',
            borderLeft: '1px solid var(--line)',
            borderRight: '1px solid var(--line)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: '#9ca3af',
              letterSpacing: '0.12em',
            }}
          >
            VS
          </span>
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: '#fff',
            }}
          >
            ×
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: '#6b7280',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {candidates.length > 2 ? `Top 2 of ${candidates.length} filed` : 'Top filed candidates'}
          </span>
        </div>
        <CandidateHero candidate={rightCandidate} loading={raceLoading} flip />
      </div>

      {/* Side-by-side finance */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          border: '2px solid var(--ink)',
          marginBottom: 32,
          background: 'var(--bg1)',
        }}
      >
        <ComparePane
          candidate={leftCandidate}
          finance={financeFor(leftCandidate?.candidateId)}
          side="left"
          loading={financeLoading || (!!financeKey && !financeResult)}
        />
        <ComparePane
          candidate={rightCandidate}
          finance={financeFor(rightCandidate?.candidateId)}
          side="right"
          loading={financeLoading || (!!financeKey && !financeResult)}
        />
      </div>

      {alsoFiled.length > 0 && <AlsoFiledList candidates={alsoFiled} />}

      {/* 2024 result inset (covered states only) */}
      {race?.result2024 && (
        <Result2024Inset result={race.result2024} democrat={topDem} republican={topRep} />
      )}

      {/* Disclaimer */}
      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.93}
          asof={formatDateLong(dataAsOf)}
          method="FEC cycle totals · /candidates/search · /candidate/{id}/totals · /schedule_a/by_size · /schedule_e/by_candidate · MEDSL 2024 (where covered)"
        >
          {' '}
          Candidate identity, finance totals, and independent-expenditure spending come from FEC.gov
          filings. Candidates shown have filed with the FEC — an FEC filing is not ballot access,
          and state-certified ballots may differ. 2024 result figures, when shown, are MIT Election
          Lab certified precinct rollups. Polling averages, endorsement counts, race ratings, and
          donor-industry rollups are not rendered on this page because no programmatic government
          source covers them at acceptable quality. The {officeLabel(parsed.office)} comparison
          shows the two top fundraisers; every other filed candidate is listed above.
        </CqDisclaimer>
      </div>
    </div>
  );
}

interface RaceNotFoundProps {
  raceId: string;
  reason: 'invalid-format' | 'not-contested';
}

function RaceNotFound({ raceId, reason }: RaceNotFoundProps) {
  const explanation =
    reason === 'invalid-format'
      ? 'Race ids look like 2026-US_SENATE-MI or 2026-US_HOUSE-PA-07.'
      : 'No candidate has filed with the FEC for this race id.';
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
      <CqLabel>Election · Race detail</CqLabel>
      <h1
        style={{
          fontSize: 40,
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
        We could not load <code>{raceId}</code>. {explanation}
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
