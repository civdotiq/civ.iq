/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Modifications table — up to MODIFICATIONS_RENDER_LIMIT rows of real
 * USASpending transaction data. Cumulative obligations are computed
 * client-side from the per-mod amounts (do the math in front of the
 * user). The current row (last entry within the rendered window)
 * carries the 3px blue inset shadow used elsewhere as the "current"
 * affordance.
 */

import { CqLabel } from '@/components/cq';
import {
  MODIFICATIONS_RENDER_LIMIT,
  formatCompactDollars,
  formatDateShort,
  modificationLabel,
} from './data';
import type { ModificationRow } from './types';
import type { USASpendingTransactionRow } from '@/types/spending';

interface ObligationScheduleProps {
  rows: ModificationRow[];
  transactions: USASpendingTransactionRow[];
  loading: boolean;
  totalCount: number;
  truncated: boolean;
  awardId: string;
}

const HEADER_COLS = ['#', 'Date', 'Action', 'Obligated', 'Cumulative'];

export function ObligationSchedule({
  rows,
  transactions,
  loading,
  totalCount,
  truncated,
  awardId,
}: ObligationScheduleProps) {
  // Render the last N rows (most recent activity is what readers want).
  const sliced = rows.slice(-MODIFICATIONS_RENDER_LIMIT);
  const totalShown = sliced.length;
  const startIndexOffset = rows.length - sliced.length;
  const usaspendingHref = `https://www.usaspending.gov/award/${encodeURIComponent(awardId)}`;

  return (
    <div>
      <CqLabel>
        Obligation schedule
        {totalCount > 0 ? ` · ${totalCount} modification${totalCount === 1 ? '' : 's'}` : ''}
      </CqLabel>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
        How the award has been funded
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 110px 1fr 130px 110px',
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid var(--ink)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {HEADER_COLS.map(col => (
          <CqLabel key={col}>{col}</CqLabel>
        ))}
      </div>

      {loading && rows.length === 0 ? (
        <div
          style={{
            padding: '24px 0',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--fg3)',
          }}
        >
          Fetching modifications from USASpending…
        </div>
      ) : sliced.length === 0 ? (
        <div
          style={{
            padding: '24px 0',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--fg3)',
          }}
        >
          No transactions returned by USASpending. Action_date may pre-date 2007-10-01 (search
          window limit) — see USASpending bulk download for the full ledger.
        </div>
      ) : (
        sliced.map((row, idx) => {
          const isCurrent = idx === sliced.length - 1;
          const txn = transactions[startIndexOffset + idx];
          const labelText = txn ? modificationLabel(txn) : '—';
          return (
            <div
              key={`${row.date}-${row.modNumber ?? row.index}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 110px 1fr 130px 110px',
                gap: 12,
                padding: '12px 0 12px 8px',
                borderBottom: '1px solid var(--line)',
                alignItems: 'center',
                background: isCurrent ? 'var(--bg2)' : 'transparent',
                boxShadow: isCurrent ? 'inset 3px 0 0 var(--civiq-blue)' : 'none',
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
                {String(startIndexOffset + idx + 1).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--fg2)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatDateShort(row.date)}
              </span>
              <span style={{ fontSize: 13, color: 'var(--fg1)' }}>{labelText}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  textAlign: 'right',
                  color: 'var(--fg1)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCompactDollars(row.obligated)}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--civiq-blue)',
                  fontWeight: 700,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCompactDollars(row.cumulative)}
              </span>
            </div>
          );
        })
      )}

      {totalCount > totalShown && totalShown > 0 && (
        <a
          href={usaspendingHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: 10,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--civiq-blue)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            textDecorationThickness: 1,
          }}
        >
          {totalShown} of {totalCount} modifications shown · view all on USASpending →
        </a>
      )}
      {truncated && totalShown > 0 && (
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--fg3)',
          }}
        >
          USASpending paginated this award; we render the first 100 transactions.
        </div>
      )}
    </div>
  );
}
