/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * 4-column headline metrics row for the PAC profile (PR 17). Reduced
 * from the reference's 5 columns: "Avg gift size" and "Million-dollar+
 * donor count" both require Schedule A entity resolution we don't have
 * yet, so they are deferred. See PROMPT-... for full deferral
 * rationale.
 */

import { CqStat } from '@/components/cq';
import { formatCompactDollars, isoToReadable } from './data';
import type { CommitteeTotalsPayload } from './types';

interface HeadlineMetricsProps {
  totals: CommitteeTotalsPayload | null;
  loading: boolean;
}

export function HeadlineMetrics({ totals, loading }: HeadlineMetricsProps) {
  const cycle = totals?.cycle;
  const cells = [
    {
      label: 'Total raised',
      value: loading ? '…' : formatCompactDollars(totals?.receipts ?? 0),
      caption: cycle ? `${cycle - 1}–${String(cycle).slice(2)} cycle` : 'Cycle to date',
      color: 'blue' as const,
    },
    {
      label: 'Cash on hand',
      value: loading ? '…' : formatCompactDollars(totals?.cashOnHand ?? 0),
      caption: totals?.coverageEndDate
        ? `As of ${isoToReadable(totals.coverageEndDate)}`
        : 'End of period',
      color: 'ink' as const,
    },
    {
      label: 'Total disbursed',
      value: loading ? '…' : formatCompactDollars(totals?.disbursements ?? 0),
      caption: 'Recipients + ops',
      color: 'ink' as const,
    },
    {
      label: 'Cycle',
      value: cycle ? String(cycle) : '—',
      caption: cycle ? `${cycle - 1}–${cycle}` : 'No filings this cycle',
      color: 'ink' as const,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom: '2px solid var(--ink)',
      }}
    >
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          style={{
            padding: '20px 18px',
            borderLeft: i === 0 ? 0 : '1px solid var(--line)',
          }}
        >
          <CqStat
            label={cell.label}
            value={cell.value}
            caption={cell.caption}
            color={cell.color}
            size={28}
          />
        </div>
      ))}
    </div>
  );
}
