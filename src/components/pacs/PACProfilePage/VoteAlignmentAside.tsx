/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * "Recipients' voting alignment" aside for the PAC profile (PR 17).
 *
 * Renders the top recipients pulled from the PAC vote-tracing analyzer
 * (`/api/intelligence/pac/[committeeId]`). DO NOT label this panel as
 * "Independent expenditures" or "Top sponsors": vote-trace is "this
 * PAC's recipients voted aligned N% of the time", not "this PAC spent
 * $X on Y race". The two are different questions.
 *
 * The "count" column carries party colour because vote alignment is
 * implicitly partisan (caucus discipline drives most floor votes).
 */

import Link from 'next/link';
import { CqLabel } from '@/components/cq';
import { formatCompactDollars, formatCount } from './data';
import type { PACRecipientVoteRow, PACVoteInsightPayload } from './types';

interface VoteAlignmentAsideProps {
  insight: PACVoteInsightPayload | null;
  unavailable: boolean;
  loading: boolean;
}

export function VoteAlignmentAside({ insight, unavailable, loading }: VoteAlignmentAsideProps) {
  const rows = (insight?.recipientVotes ?? [])
    .slice()
    .sort((a, b) => b.amountReceived - a.amountReceived)
    .slice(0, 6);

  return (
    <section style={{ marginTop: 32 }}>
      <div style={{ marginBottom: 12 }}>
        <CqLabel>Recipients&rsquo; voting alignment</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
          How this PAC&rsquo;s recipients voted on relevant bills
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--fg3)',
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          Pattern, not causation. This panel measures how often legislators who received money from
          this PAC voted with the PAC&rsquo;s apparent sector interest &mdash; not where the PAC
          spent on independent expenditures.
        </div>
      </div>

      {loading && !insight && !unavailable ? (
        <SkeletonRows />
      ) : unavailable || !insight || rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {rows.map((row, i) => (
            <RecipientVoteRow key={row.bioguideId} row={row} index={i} />
          ))}
          <div
            style={{
              padding: '12px 0',
              borderTop: '1px solid var(--line)',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--fg3)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            Aggregate yea rate · {(insight.aggregateYeaRate * 100).toFixed(0)}% across{' '}
            {formatCount(insight.relevantBillCount)} relevant bills
            {insight.aggregateBaselineYeaRate !== null &&
              ` · party baseline ${(insight.aggregateBaselineYeaRate * 100).toFixed(0)}%`}
          </div>
        </div>
      )}
    </section>
  );
}

function RecipientVoteRow({ row, index }: { row: PACRecipientVoteRow; index: number }) {
  const partyVar =
    row.party === 'D' || row.party === 'Democrat'
      ? 'var(--civiq-green)'
      : row.party === 'R' || row.party === 'Republican'
        ? 'var(--civiq-red)'
        : 'var(--fg1)';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr 100px 120px 80px',
        gap: 10,
        padding: '12px 0',
        borderTop: index === 0 ? '2px solid var(--ink)' : '1px solid var(--line)',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg3)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <div>
        <Link
          href={`/representative/${row.bioguideId}`}
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--fg1)',
            textDecoration: 'none',
          }}
        >
          {row.legislatorName}
        </Link>
        <div
          style={{
            fontSize: 10,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {row.party} · {row.state} · {row.chamber}
        </div>
      </div>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          textAlign: 'right',
          color: 'var(--fg1)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatCompactDollars(row.amountReceived)}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 700,
          textAlign: 'right',
          color: partyVar,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {(row.yeaRate * 100).toFixed(0)}% yea
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg3)',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {row.relevantVoteCount} votes
      </span>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr 100px 120px 80px',
            gap: 10,
            padding: '12px 0',
            borderTop: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)',
            alignItems: 'center',
          }}
        >
          <div style={{ height: 12, background: 'var(--bg3)' }} />
          <div style={{ height: 14, background: 'var(--bg3)', width: '70%' }} />
          <div style={{ height: 12, background: 'var(--bg3)' }} />
          <div style={{ height: 12, background: 'var(--bg3)' }} />
          <div style={{ height: 12, background: 'var(--bg3)' }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        border: '2px solid var(--ink)',
        padding: '24px 18px',
        fontSize: 12,
        color: 'var(--fg2)',
        lineHeight: 1.6,
      }}
    >
      PAC vote tracing requires a minimum number of linked recipients with floor-vote records on
      bills connected to the PAC&rsquo;s apparent sector interest. This committee does not yet meet
      that threshold &mdash; the analyzer is conservative on purpose.
    </div>
  );
}
