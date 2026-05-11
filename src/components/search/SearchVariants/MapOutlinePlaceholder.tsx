/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

interface MapOutlinePlaceholderProps {
  readonly code: string;
  readonly w?: number;
  readonly h?: number;
  readonly accent?: string;
}

/**
 * Diagonal-stripe map placeholder, used by district + state rows.
 *
 * Real district/state outline geometry is deferred (chat10 decision #8).
 * This is the same Aicher stripe pattern as DistrictPage's MapPlaceholder
 * (PR 14). The placeholder marks the slot — it does NOT pretend to draw
 * boundaries.
 *
 * Per Correction 1 + 2 the accent stripe is non-partisan ink, not party
 * red/green. The chassis is non-partisan; the only carve-out is the
 * HouseSplitBar, which encodes vote tallies, not row identity.
 */
export function MapOutlinePlaceholder({
  code,
  w = 64,
  h = 48,
  accent = 'var(--ink)',
}: MapOutlinePlaceholderProps) {
  return (
    <div
      aria-label={`Map placeholder for ${code}`}
      style={{
        width: w,
        height: h,
        position: 'relative',
        border: '2px solid var(--ink)',
        background: 'var(--bg1)',
        backgroundImage: 'repeating-linear-gradient(45deg, var(--bg2) 0 6px, var(--bg3) 6px 12px)',
        flexShrink: 0,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: accent,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--fg2)',
          letterSpacing: '-0.01em',
        }}
      >
        {code}
      </div>
    </div>
  );
}
