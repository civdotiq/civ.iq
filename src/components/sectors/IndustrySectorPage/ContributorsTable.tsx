/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqChip, CqLabel } from '@/components/cq';
import { formatCompactDollars } from './data';
import type { ContributorRow } from './types';

interface ContributorsTableProps {
  rows: ContributorRow[];
  loading?: boolean;
}

const COLUMNS = '40px minmax(0, 1fr) 110px 70px';

function rowHref(row: ContributorRow): string {
  return `/lobby/registrants/${row.registrantId}`;
}

export function ContributorsTable({ rows, loading = false }: ContributorsTableProps) {
  if (loading) {
    return <SkeletonRows columns={COLUMNS} headers={['#', 'Contributor', 'Total', 'Type']} />;
  }
  if (rows.length === 0) {
    return <EmptyState />;
  }

  const max = Math.max(...rows.map(r => r.amount), 1);

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
        {['#', 'Contributor', 'Total', 'Type'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {rows.map((row, i) => {
        const key = `lobby:${row.registrantId ?? row.name}`;
        const pct = (row.amount / max) * 100;
        const rowStyle = {
          display: 'grid',
          gridTemplateColumns: COLUMNS,
          gap: 12,
          padding: '8px 0',
          borderBottom: '1px solid var(--line)',
          alignItems: 'center',
          textDecoration: 'none',
          color: 'var(--fg1)',
          minHeight: 36,
        } as const;
        const inner = (
          <>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--fg3)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--fg3)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 1,
                }}
              >
                {row.sublabel}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCompactDollars(row.amount)}
              </span>
              <div
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${formatCompactDollars(row.amount)} relative to top contributor`}
                style={{ height: 4, background: 'var(--bg3)', position: 'relative' }}
              >
                <div
                  style={{
                    height: '100%',
                    background: 'var(--data-vlau)',
                    width: `${Math.min(100, Math.max(0, pct))}%`,
                  }}
                />
              </div>
            </div>
            <CqChip variant="info" filled={false} size="sm">
              Lobby
            </CqChip>
          </>
        );
        // Merged multi-firm orgs have no single registrant → render un-linked.
        return row.registrantId ? (
          <Link key={key} href={rowHref(row)} style={rowStyle}>
            {inner}
          </Link>
        ) : (
          <div key={key} style={rowStyle}>
            {inner}
          </div>
        );
      })}
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
      No contributor data found for this sector. PAC and lobbying-org rollups draw from FEC
      committee classifications and Senate LDA filings.
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
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
        </div>
      ))}
    </div>
  );
}
