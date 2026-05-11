/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Two-cell ticker strip: days-to-election + total spent. The reference
 * shows four cells (days, total spent, polling avg, Cook rating); only
 * the first two have programmatic government-data sources, so the
 * strip is rendered at 1fr 1fr to look intentional rather than
 * half-blanked. Polling/Cook rating return when a citable, real source
 * is wired.
 */

import { CqLabel } from '@/components/cq';
import { formatCompactDollars, formatDateLongFromDate } from './data';

interface TickerStripProps {
  electionDay: Date;
  daysRemaining: number;
  totalSpent: number | null;
  totalSpentLoading: boolean;
}

export function TickerStrip({
  electionDay,
  daysRemaining,
  totalSpent,
  totalSpentLoading,
}: TickerStripProps) {
  const isPast = daysRemaining <= 0;
  const daysLabel = isPast ? 'Days since election' : 'Days to election';
  const daysValue = isPast
    ? Math.abs(daysRemaining).toLocaleString()
    : daysRemaining.toLocaleString();
  const daysCaption = `Election day · ${formatDateLongFromDate(electionDay)}`;

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
      <Cell label={daysLabel} value={daysValue} caption={daysCaption} />
      <Cell
        label="Total spent"
        value={totalSpentLoading && totalSpent === null ? '…' : formatCompactDollars(totalSpent)}
        caption="Both campaigns + outside groups · FEC"
        leftBorder
      />
    </div>
  );
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
