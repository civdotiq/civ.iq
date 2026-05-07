/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqChip, CqLabel } from '@/components/cq';
import { formatCompactDollars, memberDistrictLabel, partyChipVariant, partyShort } from './data';
import type { LeaderboardEntry } from './types';

interface RecipientsTableProps {
  entries: LeaderboardEntry[];
  loading?: boolean;
}

const COLUMNS = '40px minmax(0, 1fr) 130px 60px';

export function RecipientsTable({ entries, loading = false }: RecipientsTableProps) {
  if (loading) {
    return <SkeletonRows columns={COLUMNS} headers={['#', 'Member', 'Total', 'Party']} />;
  }
  if (entries.length === 0) {
    return <EmptyState />;
  }

  const max = Math.max(...entries.map(e => e.sectorDonationAmount), 1);

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
        {['#', 'Member', 'Total', 'Party'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {entries.map((entry, i) => {
        const pct = (entry.sectorDonationAmount / max) * 100;
        return (
          <Link
            key={entry.bioguideId}
            href={`/representative/${entry.bioguideId}`}
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
                {entry.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--fg3)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 1,
                }}
              >
                {memberDistrictLabel(entry)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--civiq-blue-active)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCompactDollars(entry.sectorDonationAmount)}
              </span>
              <div
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${formatCompactDollars(entry.sectorDonationAmount)} relative to top recipient`}
                style={{ height: 4, background: 'var(--bg3)', position: 'relative' }}
              >
                <div
                  style={{
                    height: '100%',
                    background: 'var(--civiq-blue)',
                    width: `${Math.min(100, Math.max(0, pct))}%`,
                  }}
                />
              </div>
            </div>
            <CqChip variant={partyChipVariant(entry.party)} size="sm">
              {partyShort(entry.party)}
            </CqChip>
          </Link>
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
      No recipient leaderboard data is available for this sector yet. Leaderboards populate as
      individual representative profiles compute vote-finance correlations.
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
