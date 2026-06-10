/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { CqLabel } from '@/components/cq';
import {
  getElectionCycleLabel,
  getNextElectionYear,
  getMostRecentElectionYear,
} from '@/lib/data/state-election-cycles';
import { formatCompactCurrency, formatCurrencyDollars } from './helpers';
import type { StateElectionResult, StateFederalSpending } from './types';

interface AsideProps {
  stateCode: string;
  spending: StateFederalSpending | null;
  governorResult: StateElectionResult | null;
}

export function Aside({ stateCode, spending, governorResult }: AsideProps) {
  const next = getNextElectionYear(stateCode);
  const recent = getMostRecentElectionYear(stateCode);
  const cycleLabel = getElectionCycleLabel(stateCode);

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <GovernorResultCard result={governorResult} />
      <ElectionCalendarCard next={next} recent={recent} cycleLabel={cycleLabel} />
      <PerCapitaCard spending={spending} />
    </aside>
  );
}

function GovernorResultCard({ result }: { result: StateElectionResult | null }) {
  if (!result) {
    return (
      <div style={{ border: '2px solid var(--ink)', padding: 16 }}>
        <CqLabel>Most recent gubernatorial</CqLabel>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginTop: 6,
            color: 'var(--fg4)',
            letterSpacing: '-0.01em',
          }}
        >
          —
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            marginTop: 4,
          }}
        >
          No recent gubernatorial result on file.
        </div>
      </div>
    );
  }
  const winnerColor =
    result.winner === 'D'
      ? 'var(--party-democrat)'
      : result.winner === 'R'
        ? 'var(--civiq-red)'
        : 'var(--data-vlau)';
  const otherPct = Math.max(0, 100 - result.demPct - result.repPct);
  return (
    <div style={{ border: '2px solid var(--ink)', padding: 16 }}>
      <CqLabel>Most recent gubernatorial · {result.year}</CqLabel>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginTop: 6,
          color: winnerColor,
          letterSpacing: '-0.01em',
        }}
      >
        {result.winner === 'D' ? 'Democrat' : result.winner === 'R' ? 'Republican' : 'Other'} won by{' '}
        {result.margin.toFixed(1)} pts
      </div>
      <div
        style={{
          display: 'flex',
          height: 14,
          marginTop: 10,
          border: '1px solid var(--line)',
          background: 'var(--bg2)',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        {result.demPct > 0 && (
          <div style={{ width: `${result.demPct}%`, background: 'var(--party-democrat)' }} />
        )}
        {otherPct > 0.5 && (
          <div style={{ width: `${otherPct}%`, background: 'var(--data-vlau)' }} />
        )}
        {result.repPct > 0 && (
          <div style={{ width: `${result.repPct}%`, background: 'var(--civiq-red)' }} />
        )}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>D {result.demPct.toFixed(1)}%</span>
        <span>R {result.repPct.toFixed(1)}%</span>
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          marginTop: 8,
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {result.totalVotes.toLocaleString()} votes · MIT MEDSL
      </div>
    </div>
  );
}

function PerCapitaCard({ spending }: { spending: StateFederalSpending | null }) {
  if (!spending || !spending.perCapita) {
    return (
      <div style={{ border: '2px solid var(--ink)', padding: 16 }}>
        <CqLabel>Federal funding · per capita</CqLabel>
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            marginTop: 6,
            color: 'var(--fg4)',
            letterSpacing: '-0.02em',
          }}
        >
          —
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            marginTop: 4,
          }}
        >
          Data unavailable from USAspending.gov
        </div>
      </div>
    );
  }
  return (
    <div style={{ border: '2px solid var(--ink)', padding: 16 }}>
      <CqLabel>Federal funding · per capita</CqLabel>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          marginTop: 6,
          color: 'var(--civiq-blue)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
      >
        {formatCurrencyDollars(spending.perCapita)}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          marginTop: 4,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        USAspending · FY{spending.fiscalYear} · total{' '}
        {formatCompactCurrency(spending.aggregatedAmount)}
      </div>
    </div>
  );
}

function ElectionCalendarCard({
  next,
  recent,
  cycleLabel,
}: {
  next: number;
  recent: number;
  cycleLabel: string;
}) {
  return (
    <div
      style={{
        borderLeft: '6px solid var(--civiq-blue)',
        background: 'var(--bg2)',
        padding: '14px 16px',
      }}
    >
      <CqLabel>Election calendar</CqLabel>
      <div style={{ marginTop: 8, fontSize: 13, color: 'var(--fg1)' }}>
        <div style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontWeight: 700 }}>Next state election</div>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--fg3)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {next}
          </div>
        </div>
        <div style={{ padding: '6px 0' }}>
          <div style={{ fontWeight: 700 }}>Most recent</div>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--fg3)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {recent}
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          {cycleLabel}
        </div>
      </div>
    </div>
  );
}
