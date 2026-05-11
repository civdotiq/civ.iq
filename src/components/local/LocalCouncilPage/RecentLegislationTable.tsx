/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Recent legislation table — 4 columns: File · Title · Status · Date.
 *
 * The reference shows a 5th "Vote" column. Legistar /Matters does not
 * include roll-call tallies; resolving them would require N+1 calls to
 * VoteHistory. Cut rather than fabricated.
 *
 * Status uses a design-system carve-out: filled green ('d') means
 * literally "Adopted" or "Enacted" — passed status, not party. See
 * `legislationStatusChip` in ./data.ts.
 */

import { CqChip, CqLabel } from '@/components/cq';
import type { CityLegislation } from '@/types/legistar';
import { formatDateLong, legislationStatusChip } from './data';

interface RecentLegislationTableProps {
  legislation: CityLegislation[] | null;
  loading: boolean;
  cityName: string;
}

const COLUMNS = '160px 1fr 140px 110px';
const SKELETON_ROW_COUNT = 6;

export function RecentLegislationTable({
  legislation,
  loading,
  cityName,
}: RecentLegislationTableProps) {
  const showSkeleton = loading && (legislation === null || legislation.length === 0);
  const showEmpty = !loading && (legislation === null || legislation.length === 0);

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
        <CqLabel>File</CqLabel>
        <CqLabel>Title</CqLabel>
        <CqLabel>Status</CqLabel>
        <CqLabel>Date</CqLabel>
      </div>

      {showSkeleton &&
        Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
          <SkeletonRow key={`skeleton-${i}`} />
        ))}

      {showEmpty && (
        <div
          style={{
            padding: '36px 18px',
            borderBottom: '1px solid var(--line)',
            fontSize: 13,
            color: 'var(--fg2)',
            background: 'var(--bg2)',
          }}
        >
          Data unavailable — no matters introduced in the last 60 days were returned for {cityName}.
          Legistar coverage varies; some cities upload sparsely.
        </div>
      )}

      {!showSkeleton &&
        !showEmpty &&
        legislation?.map(item => <LegislationRow key={item.id} item={item} />)}
    </div>
  );
}

function LegislationRow({ item }: { item: CityLegislation }) {
  const chip = legislationStatusChip(item.status);
  return (
    <div
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
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg1)' }}>
        {item.fileNumber || '—'}
      </span>
      <span style={{ fontSize: 13, color: 'var(--fg1)', lineHeight: 1.4 }}>
        {item.title || '(no title)'}
      </span>
      <span>
        <CqChip variant={chip.variant} size="sm" filled={chip.filled}>
          {chip.label}
        </CqChip>
      </span>
      <span
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatDateLong(item.introducedDate)}
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: COLUMNS,
        gap: 12,
        padding: '14px 0',
        borderBottom: '1px solid var(--line)',
        alignItems: 'center',
        minHeight: 36,
      }}
      aria-hidden="true"
    >
      <SkeletonBar widthPct={60} />
      <SkeletonBar widthPct={80} />
      <SkeletonBar widthPct={50} />
      <SkeletonBar widthPct={50} />
    </div>
  );
}

function SkeletonBar({ widthPct }: { widthPct: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        height: 12,
        width: `${widthPct}%`,
        background: 'var(--bg2)',
      }}
    />
  );
}
