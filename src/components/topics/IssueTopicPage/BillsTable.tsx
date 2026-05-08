/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Bills table for IssueTopic. Note: co-sponsor counts are NOT in the
 * /api/search/policy-area response, so the Co-sp. column from the
 * reference IssueTopic.jsx is intentionally dropped. Re-introducing it
 * would require a per-bill enrichment fetch that is out of PR 16 scope.
 */

import Link from 'next/link';
import { CqChip, CqLabel } from '@/components/cq';
import { billDetailHref, billStatusDisplay, formatBillNumber, isoToReadable } from './data';
import type { BillRow } from './types';

interface BillsTableProps {
  bills: BillRow[];
  loading: boolean;
}

const COLUMNS = '110px minmax(0, 1fr) 130px 120px';
const VISIBLE = 8;

export function BillsTable({ bills, loading }: BillsTableProps) {
  if (loading && bills.length === 0) {
    return <SkeletonRows />;
  }
  if (bills.length === 0) {
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
        No bills filed under this policy area in the current Congress. Congress.gov refreshes
        nightly.
      </div>
    );
  }

  const visible = bills.slice(0, VISIBLE);

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
        {['Bill', 'Title', 'Status', 'Introduced'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {visible.map(bill => {
        const href = billDetailHref(bill.id);
        const status = billStatusDisplay(bill.status);
        const Row = (
          <>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatBillNumber(bill.id)}
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
              {status.isPublicLaw && (
                <span
                  style={{
                    color: 'var(--civiq-green)',
                    marginLeft: 6,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--tracking-label)',
                  }}
                >
                  · public law
                </span>
              )}
            </span>
            <CqChip
              variant={status.isPublicLaw ? 'd' : 'info'}
              filled={status.isPublicLaw}
              size="sm"
            >
              {status.label}
            </CqChip>
            <span
              style={{
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {isoToReadable(bill.introducedDate)}
            </span>
          </>
        );

        const containerStyle = {
          display: 'grid',
          gridTemplateColumns: COLUMNS,
          gap: 12,
          padding: '12px 0',
          borderBottom: '1px solid var(--line)',
          alignItems: 'center',
          textDecoration: 'none',
          color: 'var(--fg1)',
          minHeight: 36,
        } as const;

        return href ? (
          <Link key={bill.id} href={href} style={containerStyle}>
            {Row}
          </Link>
        ) : (
          <div key={bill.id} style={containerStyle}>
            {Row}
          </div>
        );
      })}
    </div>
  );
}

function SkeletonRows() {
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
        {['Bill', 'Title', 'Status', 'Introduced'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: COLUMNS,
            gap: 12,
            padding: '14px 0',
            borderBottom: '1px solid var(--line)',
            alignItems: 'center',
            minHeight: 36,
          }}
        >
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6, width: 80 }} />
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6, width: 80 }} />
        </div>
      ))}
    </div>
  );
}
