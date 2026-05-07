/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqChip, CqLabel } from '@/components/cq';
import { billDetailHref, formatBillNumber } from './data';
import type { BillRow } from './types';

interface BillsTableProps {
  bills: BillRow[];
  loading?: boolean;
}

const COLUMNS = '110px minmax(0, 1fr) 160px';

export function BillsTable({ bills, loading = false }: BillsTableProps) {
  if (loading) {
    return <SkeletonRows columns={COLUMNS} headers={['Bill', 'Title', 'Policy area']} />;
  }
  if (bills.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLUMNS,
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid var(--ink)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {['Bill', 'Title', 'Policy area'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {bills.map(bill => (
        <Link
          key={bill.id}
          href={billDetailHref(bill)}
          style={{
            display: 'grid',
            gridTemplateColumns: COLUMNS,
            gap: 12,
            padding: '8px 0',
            borderBottom: '1px solid var(--line)',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'var(--fg1)',
            minHeight: 36,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatBillNumber(bill.type, bill.number)}
          </span>
          <span
            style={{
              fontSize: 13,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {bill.title}
          </span>
          {bill.policyArea ? (
            <CqChip variant="info" filled={false} size="sm">
              {bill.policyArea}
            </CqChip>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>
              —
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        border: '2px solid var(--ink)',
        padding: '16px 18px',
        background: 'var(--bg2)',
        fontSize: 13,
        color: 'var(--fg2)',
        lineHeight: 1.55,
      }}
    >
      No recent bills matched this sector&rsquo;s policy areas. We refresh from Congress.gov daily.
    </div>
  );
}

function SkeletonRows({ columns, headers }: { columns: string; headers: string[] }) {
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: columns,
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid var(--ink)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {headers.map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: columns,
            gap: 12,
            padding: '8px 0',
            borderBottom: '1px solid var(--line)',
            alignItems: 'center',
            minHeight: 36,
          }}
        >
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
        </div>
      ))}
    </div>
  );
}
