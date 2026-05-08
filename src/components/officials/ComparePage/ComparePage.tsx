'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { CqDisclaimer, CqLabel, CqPlainReading, CqSourceTag } from '@/components/cq';
import { CompareHero } from './CompareHero';
import { CompareSection } from './CompareSection';
import { CompareRow } from './CompareRow';
import { SwapButton } from './SwapButton';
import { fetchSide, formatCount, formatDollars, pacSharePercent, smallDonorPercent } from './data';
import { DEFAULT_PAIR } from './types';
import type { CompareSidePayload } from './types';

interface ComparePageProps {
  bioguideA: string;
  bioguideB: string;
}

const EMPTY: CompareSidePayload = {
  official: null,
  voting: null,
  finance: null,
  errors: { profile: false, voting: false, finance: false },
};

export function ComparePage({ bioguideA, bioguideB }: ComparePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const idA = bioguideA.toUpperCase();
  const idB = bioguideB.toUpperCase();

  const { data: sideA, isLoading: loadingA } = useSWR<CompareSidePayload>(
    `compare:${idA}`,
    () => fetchSide(idA),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
  const { data: sideB, isLoading: loadingB } = useSWR<CompareSidePayload>(
    `compare:${idB}`,
    () => fetchSide(idB),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const a = sideA ?? EMPTY;
  const b = sideB ?? EMPTY;
  const loading = loadingA || loadingB;

  const updatePair = useCallback(
    (nextA: string, nextB: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('a', nextA);
      params.set('b', nextB);
      if (params.get('v') !== 'new') params.set('v', 'new');
      router.replace(`/compare?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleSwap = useCallback(() => {
    updatePair(idB, idA);
  }, [idA, idB, updatePair]);

  const dataAsOf = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    []
  );

  const congressLabel = a.official?.chamber === b.official?.chamber ? a.official?.chamber : 'Mixed';
  const headerSummary = (() => {
    if (!a.official || !b.official) return '119th Congress';
    if (a.official.chamber === b.official.chamber) {
      return `119th Congress · ${a.official.chamber}`;
    }
    return `119th Congress · ${a.official.chamber} vs ${b.official.chamber}`;
  })();

  const numericA = (val: number | undefined) =>
    typeof val === 'number' && Number.isFinite(val) ? val : undefined;

  const billsSponsoredA = a.voting?.billsSponsored;
  const billsSponsoredB = b.voting?.billsSponsored;
  const billsEnactedA = a.voting?.billsEnacted;
  const billsEnactedB = b.voting?.billsEnacted;
  const totalVotesA = a.voting?.totalVotes;
  const totalVotesB = b.voting?.totalVotes;
  const partyLoyaltyA = a.voting?.partyLoyaltyScore;
  const partyLoyaltyB = b.voting?.partyLoyaltyScore;
  const committeesA = a.official?.committeesCount;
  const committeesB = b.official?.committeesCount;
  const caucusesA = a.official?.caucusesCount;
  const caucusesB = b.official?.caucusesCount;

  const raisedA = a.finance?.totalRaised;
  const raisedB = b.finance?.totalRaised;
  const cashA = a.finance?.cashOnHand;
  const cashB = b.finance?.cashOnHand;
  const cycleLabel = a.finance?.cycle ?? b.finance?.cycle ?? new Date().getFullYear();

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
          <CqSourceTag compact source="Congress.gov" id="member + votes" />
          <CqSourceTag compact source="FEC.gov" id="cycle filings" />
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
        <CqLabel>
          Tools · Compare officials ·{' '}
          {a.official && b.official
            ? `${a.official.shortName} vs ${b.official.shortName}`
            : `${idA} vs ${idB}`}
        </CqLabel>
        <span
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {headerSummary} · As of {dataAsOf}
        </span>
      </div>

      {/* Two heroes with swap */}
      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderTop: '2px solid var(--ink)',
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <CompareHero official={a.official} side="left" loading={loadingA} bioguideId={idA} />
        <CompareHero official={b.official} side="right" loading={loadingB} bioguideId={idB} />
        <SwapButton onSwap={handleSwap} disabled={loading} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 200px 1fr',
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          padding: '10px 0',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <span style={{ textAlign: 'right', paddingRight: 20 }}>
          <Link
            href={a.official ? `/representative/${idA}` : '/representatives'}
            style={{
              color: 'var(--civiq-blue-active)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            View {a.official?.shortName ?? idA} profile →
          </Link>
        </span>
        <span style={{ textAlign: 'center', color: 'var(--fg4)' }}>{congressLabel ?? ''}</span>
        <span style={{ textAlign: 'left', paddingLeft: 20 }}>
          <Link
            href={b.official ? `/representative/${idB}` : '/representatives'}
            style={{
              color: 'var(--civiq-blue-active)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            View {b.official?.shortName ?? idB} profile →
          </Link>
        </span>
      </div>

      <div style={{ marginTop: 24 }}>
        <CompareSection title="Headline record">
          <CompareRow
            label="Bills sponsored"
            la={formatCount(billsSponsoredA, true)}
            lb={formatCount(billsSponsoredB, true)}
            loading={loading && !a.voting && !b.voting}
            numericA={numericA(billsSponsoredA)}
            numericB={numericA(billsSponsoredB)}
          />
          <CompareRow
            label="Bills enacted"
            la={formatCount(billsEnactedA, true)}
            lb={formatCount(billsEnactedB, true)}
            loading={loading && !a.voting && !b.voting}
            numericA={numericA(billsEnactedA)}
            numericB={numericA(billsEnactedB)}
          />
          <CompareRow
            label="Roll-call votes recorded"
            la={formatCount(totalVotesA)}
            lb={formatCount(totalVotesB)}
            loading={loading && !a.voting && !b.voting}
            numericA={numericA(totalVotesA)}
            numericB={numericA(totalVotesB)}
          />
          <CompareRow
            label="Party loyalty"
            la={partyLoyaltyA && partyLoyaltyA > 0 ? `${Math.round(partyLoyaltyA)}%` : '—'}
            lb={partyLoyaltyB && partyLoyaltyB > 0 ? `${Math.round(partyLoyaltyB)}%` : '—'}
            loading={loading && !a.voting && !b.voting}
            accent="party"
            partyA={a.official?.party}
            partyB={b.official?.party}
          />
          <CompareRow
            label="Committees served"
            la={formatCount(committeesA)}
            lb={formatCount(committeesB)}
            numericA={numericA(committeesA)}
            numericB={numericA(committeesB)}
          />
          <CompareRow
            label="Caucuses joined"
            la={formatCount(caucusesA)}
            lb={formatCount(caucusesB)}
            numericA={numericA(caucusesA)}
            numericB={numericA(caucusesB)}
          />
        </CompareSection>

        <CompareSection title={`Money · ${cycleLabel} cycle`}>
          <CompareRow
            label="Total raised"
            la={formatDollars(raisedA)}
            lb={formatDollars(raisedB)}
            loading={loading && !a.finance && !b.finance}
            numericA={numericA(raisedA)}
            numericB={numericA(raisedB)}
          />
          <CompareRow
            label="Cash on hand"
            la={formatDollars(cashA)}
            lb={formatDollars(cashB)}
            loading={loading && !a.finance && !b.finance}
            numericA={numericA(cashA)}
            numericB={numericA(cashB)}
          />
          <CompareRow
            label="Individual donor share"
            la={smallDonorPercent(a.finance)}
            lb={smallDonorPercent(b.finance)}
            loading={loading && !a.finance && !b.finance}
          />
          <CompareRow
            label="PAC share"
            la={pacSharePercent(a.finance)}
            lb={pacSharePercent(b.finance)}
            loading={loading && !a.finance && !b.finance}
            accent="party"
            partyA={a.official?.party}
            partyB={b.official?.party}
          />
          <CompareRow
            label="Top industry"
            la={a.finance?.topIndustry ?? '—'}
            lb={b.finance?.topIndustry ?? '—'}
            small
          />
        </CompareSection>

        <CompareSection title="Office and tenure">
          <CompareRow
            label="Position"
            la={a.official?.position ?? '—'}
            lb={b.official?.position ?? '—'}
            small
          />
          <CompareRow
            label="In office since"
            la={a.official?.since ?? '—'}
            lb={b.official?.since ?? '—'}
            numericA={numericA(a.official?.since)}
            numericB={numericA(b.official?.since)}
          />
          <CompareRow
            label="Next election"
            la={a.official?.nextElection ?? '—'}
            lb={b.official?.nextElection ?? '—'}
            small
          />
          <CompareRow
            label="District / state"
            la={a.official?.districtLabel ?? '—'}
            lb={b.official?.districtLabel ?? '—'}
            small
          />
        </CompareSection>
      </div>

      {(a.errors.voting || b.errors.voting || a.errors.finance || b.errors.finance) && (
        <div style={{ marginTop: 16 }}>
          <CqPlainReading>
            Some panes returned no data this load. Cold starts on /api/compare can take 3–5 seconds;
            refresh after a moment if rows still show em-dashes.
          </CqPlainReading>
        </div>
      )}

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.9}
          asof={dataAsOf}
          method="Direct ingestion · Congress.gov, FEC.gov"
        >
          {' '}
          Comparison metrics are computed from primary sources for the current Congress only. Empty
          rows indicate the upstream API returned no data — they are not zero values.
        </CqDisclaimer>
      </div>
    </div>
  );
}

export { DEFAULT_PAIR };
