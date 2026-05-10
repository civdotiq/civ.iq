/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * "Donors by gift size" panel for the PAC profile (PR 17).
 *
 * Substitutes for the reference's named-donor "Top donors" rows: that
 * panel needs entity-resolved Schedule A receipts which are out of
 * scope. The FEC by_size aggregate gives an honest tier breakdown
 * (share of dollars by gift threshold) — labelled clearly so the
 * substitution is unambiguous.
 *
 * Bars use ink/civiq-blue: gift-size is not partisan information.
 */

import { CqBar, CqLabel } from '@/components/cq';
import { formatCompactDollars, formatCount, summariseBuckets } from './data';
import type { DonorSizeBucket } from './types';

interface DonorsBySizePanelProps {
  buckets: DonorSizeBucket[];
  loading: boolean;
  cycle: number;
}

export function DonorsBySizePanel({ buckets, loading, cycle }: DonorsBySizePanelProps) {
  const { rows, total } = summariseBuckets(buckets);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <CqLabel>
          Donors by gift size · {cycle - 1}–{cycle} cycle
        </CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
          Where the money came from · by donor tier
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {rows.map(row => (
            <CqBar
              key={row.size}
              label={row.label}
              pct={row.pct}
              amount={formatCompactDollars(row.total)}
              sub={`${formatCount(row.count)} contributions`}
              color={row.size === 0 ? 'blue' : 'greige'}
            />
          ))}
          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--fg3)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.5,
            }}
          >
            Total Schedule A receipts · {formatCompactDollars(total)} · aggregated by FEC gift-size
            tier. Named donors are not shown — entity resolution is required and is out of scope for
            this view.
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '180px 1fr 60px 90px',
            gap: 14,
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div style={{ height: 14, background: 'var(--bg3)', width: '70%' }} />
          <div style={{ height: 14, background: 'var(--bg3)' }} />
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
      Data unavailable. FEC has no Schedule A by-size aggregate for this committee in the current
      cycle yet. Reports filed late in the quarter often take a few weeks to surface.
    </div>
  );
}
