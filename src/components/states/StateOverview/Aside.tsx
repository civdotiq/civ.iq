/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { CqLabel, CqPlainReading } from '@/components/cq';
import {
  getElectionCycleLabel,
  getNextElectionYear,
  getMostRecentElectionYear,
} from '@/lib/data/state-election-cycles';
import { formatCompactCurrency, formatCurrencyDollars } from './helpers';
import type { StateFederalSpending } from './types';

interface AsideProps {
  stateCode: string;
  spending: StateFederalSpending | null;
}

export function Aside({ stateCode, spending }: AsideProps) {
  const next = getNextElectionYear(stateCode);
  const recent = getMostRecentElectionYear(stateCode);
  const cycleLabel = getElectionCycleLabel(stateCode);

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PerCapitaCard spending={spending} />
      <ElectionCalendarCard next={next} recent={recent} cycleLabel={cycleLabel} />
      <IndustriesCard />
    </aside>
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

function IndustriesCard() {
  return (
    <div style={{ border: '2px solid var(--ink)', padding: 16 }}>
      <CqLabel>Top industries · contributions</CqLabel>
      <div style={{ marginTop: 12 }}>
        <CqPlainReading label="DATA UNAVAILABLE.">
          Per-state industry rollup not yet wired. The federal totals come from FEC filings; the
          state aggregate ships in a follow-up.
        </CqPlainReading>
      </div>
    </div>
  );
}
