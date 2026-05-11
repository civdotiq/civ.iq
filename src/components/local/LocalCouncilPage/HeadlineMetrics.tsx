/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Two-cell headline metrics strip: active members + bills (last 60 days).
 *
 * The reference shows five cells (bills introduced, bills enacted,
 * stated meetings, avg attendance, public hearings). Only the cells
 * backed by Legistar at the chamber level without per-matter follow-up
 * calls are rendered. A half-blanked five-cell strip would look broken;
 * a two-cell strip reads as intentional.
 */

import { CqLabel } from '@/components/cq';

interface HeadlineMetricsProps {
  activeMembers: number | null;
  billsLast60Days: number | null;
  membersLoading: boolean;
  billsLoading: boolean;
}

export function HeadlineMetrics({
  activeMembers,
  billsLast60Days,
  membersLoading,
  billsLoading,
}: HeadlineMetricsProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 0,
        border: '2px solid var(--ink)',
        marginBottom: 28,
        fontFamily: 'var(--font-mono)',
        background: 'var(--bg1)',
      }}
    >
      <Cell
        label="Active members"
        value={renderValue(activeMembers, membersLoading)}
        caption="Currently seated · Legistar"
      />
      <Cell
        label="Bills · last 60 days"
        value={renderValue(billsLast60Days, billsLoading)}
        caption="Matters introduced · Legistar"
        leftBorder
      />
    </div>
  );
}

function renderValue(n: number | null, loading: boolean): string {
  if (loading && n === null) return '…';
  if (n === null) return '—';
  return n.toLocaleString('en-US');
}

interface CellProps {
  label: string;
  value: string;
  caption: string;
  leftBorder?: boolean;
}

function Cell({ label, value, caption, leftBorder = false }: CellProps) {
  return (
    <div
      style={{
        padding: '14px 18px',
        borderLeft: leftBorder ? '1px solid var(--line)' : 0,
      }}
    >
      <CqLabel>{label}</CqLabel>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginTop: 4,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
          color: 'var(--fg1)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--fg3)',
          marginTop: 2,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {caption}
      </div>
    </div>
  );
}
