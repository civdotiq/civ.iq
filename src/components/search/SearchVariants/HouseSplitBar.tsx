/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

interface HouseSplitBarProps {
  readonly democrats: number;
  readonly republicans: number;
  readonly independents?: number;
}

/**
 * House-seat split bar for StateResultRow.
 *
 * CARVE-OUT: this is the ONE place in the SearchVariants chassis where
 * party tokens (red/blue) appear. The chassis is otherwise non-partisan
 * — rep names, state codes, governor info, etc. all render in ink. The
 * bar encodes vote tallies (D/R seat counts), not row identity, so the
 * party tokens carry semantic weight rather than decoration.
 *
 * Pattern matches PR 18's `isGovernmentRecipient` exception convention:
 * one documented carve-out per chassis, called out in source.
 */
export function HouseSplitBar({ democrats, republicans, independents = 0 }: HouseSplitBarProps) {
  const total = democrats + republicans + independents;
  if (total === 0) {
    return (
      <div
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        No delegation
      </div>
    );
  }

  const dPct = (democrats / total) * 100;
  const rPct = (republicans / total) * 100;
  const iPct = (independents / total) * 100;

  return (
    <div>
      <div
        role="img"
        aria-label={`House delegation: ${democrats} Democrats, ${republicans} Republicans${
          independents > 0 ? `, ${independents} Independents` : ''
        }`}
        style={{
          height: 10,
          display: 'flex',
          border: '1px solid var(--ink)',
        }}
      >
        {dPct > 0 && <div style={{ width: `${dPct}%`, background: 'var(--party-democrat)' }} />}
        {rPct > 0 && <div style={{ width: `${rPct}%`, background: 'var(--civiq-red)' }} />}
        {iPct > 0 && <div style={{ width: `${iPct}%`, background: 'var(--fg3)' }} />}
      </div>
      <div
        style={{
          marginTop: 4,
          display: 'flex',
          gap: 10,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg3)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span style={{ color: 'var(--party-democrat)', fontWeight: 700 }}>D {democrats}</span>
        <span style={{ color: 'var(--civiq-red)', fontWeight: 700 }}>R {republicans}</span>
        {independents > 0 && (
          <span style={{ color: 'var(--fg2)', fontWeight: 700 }}>I {independents}</span>
        )}
      </div>
    </div>
  );
}
