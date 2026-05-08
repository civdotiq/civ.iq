/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Race + ethnicity stacked bar + legend. Colors are non-partisan
 * (blue / amber / greige / ink) — red and green are reserved for
 * party identification only.
 */

'use client';

import { CqLabel } from '@/components/cq';
import type { DistrictDemographics } from './types';

interface DemographicsBlockProps {
  demographics: DistrictDemographics | null | undefined;
  loading: boolean;
}

interface Slice {
  label: string;
  pct: number;
  color: string;
}

function buildSlices(d: DistrictDemographics): Slice[] {
  const ordered: Slice[] = [
    { label: 'Black', pct: d.black_percent, color: 'var(--fg1)' },
    { label: 'Hispanic', pct: d.hispanic_percent, color: 'var(--data-vlau)' },
    { label: 'White', pct: d.white_percent, color: 'var(--data-greige)' },
    { label: 'Asian', pct: d.asian_percent, color: 'var(--civiq-blue)' },
  ].filter(s => s.pct > 0);
  const sum = ordered.reduce((a, b) => a + b.pct, 0);
  const other = Math.max(0, 100 - sum);
  if (other > 0.5) ordered.push({ label: 'Other', pct: other, color: 'var(--fg3)' });
  return ordered;
}

export function DemographicsBlock({ demographics, loading }: DemographicsBlockProps) {
  if (loading) {
    return (
      <div>
        <CqLabel>Race + ethnicity</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
          Demographic composition
        </div>
        <div
          style={{
            height: 32,
            border: '2px solid var(--ink)',
            background: 'var(--bg3)',
            opacity: 0.5,
            marginBottom: 16,
          }}
        />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 14,
              background: 'var(--bg3)',
              opacity: 0.4,
              marginBottom: 10,
            }}
          />
        ))}
      </div>
    );
  }

  if (!demographics) {
    return (
      <div>
        <CqLabel>Race + ethnicity</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
          Demographic composition
        </div>
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
          Data unavailable — Census ACS 5-year demographics did not load for this district.
        </div>
      </div>
    );
  }

  const slices = buildSlices(demographics);

  return (
    <div>
      <CqLabel>Race + ethnicity</CqLabel>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
        Demographic composition
      </div>
      <div
        role="img"
        aria-label="Race and ethnicity composition"
        style={{
          display: 'flex',
          height: 32,
          border: '2px solid var(--ink)',
          marginBottom: 16,
          overflow: 'hidden',
        }}
      >
        {slices.map((s, i) => (
          <div
            key={s.label}
            style={{
              width: `${s.pct}%`,
              background: s.color,
              borderRight: i < slices.length - 1 ? '2px solid var(--ink)' : 'none',
            }}
          />
        ))}
      </div>
      {slices.map((s, i) => (
        <div
          key={s.label}
          style={{
            display: 'grid',
            gridTemplateColumns: '12px 1fr 60px',
            gap: 10,
            padding: '8px 0',
            borderTop: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)',
            alignItems: 'center',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              background: s.color,
              display: 'inline-block',
              border: '1px solid var(--ink)',
            }}
          />
          <span style={{ fontSize: 13 }}>{s.label}</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 700,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {s.pct.toFixed(1)}%
          </span>
        </div>
      ))}
      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid var(--line)',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg3)',
        }}
      >
        Source · Census ACS 5-year
      </div>
    </div>
  );
}
