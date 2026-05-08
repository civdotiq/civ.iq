/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Replaces the reference IssueTopic.jsx "sub-topic" bar (which would
 * require per-bill sub-policy classification we do not have) with the
 * list of committees that hold jurisdiction over this policy area —
 * derived directly from policy-area-search committeeSet.
 */

import { CqChip, CqLabel } from '@/components/cq';
import type { CommitteeRow } from './types';

interface CommitteesStripProps {
  committees: CommitteeRow[];
  loading: boolean;
}

const SKELETON_COUNT = 4;

export function CommitteesStrip({ committees, loading }: CommitteesStripProps) {
  if (loading && committees.length === 0) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SKELETON_COUNT}, minmax(0, 1fr))`,
          borderTop: '2px solid var(--ink)',
          borderBottom: '2px solid var(--ink)',
        }}
      >
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: '14px 12px',
              borderLeft: i === 0 ? 0 : '1px solid var(--line)',
              minHeight: 64,
            }}
          >
            <div style={{ height: 10, background: 'var(--bg3)', opacity: 0.6, marginBottom: 8 }} />
            <div style={{ height: 16, background: 'var(--bg3)', opacity: 0.6, width: '70%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (committees.length === 0) {
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
        No oversight committees are currently mapped to this policy area.
      </div>
    );
  }

  const max = Math.min(6, committees.length);
  const visible = committees.slice(0, max);
  const cols = Math.max(2, Math.min(visible.length, 6));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        borderTop: '2px solid var(--ink)',
        borderBottom: '2px solid var(--ink)',
      }}
    >
      {visible.map((c, i) => (
        <div
          key={c.code}
          style={{
            padding: '14px 12px',
            borderLeft: i === 0 ? 0 : '1px solid var(--line)',
            minHeight: 64,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <CqLabel>{c.chamber}</CqLabel>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.25,
              color: 'var(--fg1)',
            }}
          >
            {c.name}
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              marginTop: 'auto',
            }}
          >
            <CqChip variant="ink" filled={false} size="sm">
              {c.code}
            </CqChip>
          </div>
        </div>
      ))}
    </div>
  );
}
