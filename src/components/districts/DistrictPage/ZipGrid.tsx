/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Compact monospace grid of ZIP codes covered by the district. Each cell
 * shows whether the ZIP is wholly inside the district or shared with
 * neighbors. Per CIV.IQ design: ZIP-to-district mapping is approximate
 * (10-20% wrong) — the disclaimer in DistrictPage notes this.
 */

'use client';

import { CqLabel } from '@/components/cq';
import type { ZipShare } from './types';

interface ZipGridProps {
  zips: ZipShare[] | null;
  loading: boolean;
}

export function ZipGrid({ zips, loading }: ZipGridProps) {
  return (
    <section>
      <CqLabel>ZIP codes in district</CqLabel>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
        {loading
          ? 'Compiling ZIP list…'
          : zips && zips.length > 0
            ? `${zips.length} ZIP${zips.length === 1 ? '' : 's'} · whole + partial`
            : 'ZIP list'}
      </div>
      {loading ? (
        <SkeletonGrid />
      ) : !zips || zips.length === 0 ? (
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
          Data unavailable — no ZIP codes mapped to this district in the 119th Congress data set.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            border: '2px solid var(--ink)',
          }}
        >
          {zips.map((z, i) => {
            const pct = Math.round(z.share * 100);
            const labelText = z.share >= 0.99 ? 'whole' : `${pct}%`;
            const labelColor =
              z.share >= 0.99
                ? 'var(--civiq-blue-active)'
                : z.share >= 0.4
                  ? 'var(--civiq-blue)'
                  : 'var(--fg3)';
            return (
              <div
                key={z.zip}
                style={{
                  padding: '10px 12px',
                  borderRight: (i + 1) % 4 ? '1px solid var(--line)' : '0',
                  borderTop: i >= 4 ? '1px solid var(--line)' : '0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
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
                  {z.zip}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: labelColor,
                    fontWeight: 700,
                  }}
                >
                  {labelText}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SkeletonGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0,
        border: '2px solid var(--ink)',
      }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: '10px 12px',
            borderRight: (i + 1) % 4 ? '1px solid var(--line)' : '0',
            borderTop: i >= 4 ? '1px solid var(--line)' : '0',
            minHeight: 36,
          }}
        >
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.5 }} />
        </div>
      ))}
    </div>
  );
}
