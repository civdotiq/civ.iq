/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { CqBar, CqLabel } from '@/components/cq';
import { formatCompactDollars, type PartyTotals } from './data';

interface MoneyFlowPanelProps {
  totals: PartyTotals | null;
  industryLabel: string | null;
  loading: boolean;
}

export function MoneyFlowPanel({ totals, industryLabel, loading }: MoneyFlowPanelProps) {
  const total = totals?.total ?? 0;
  const dPct = total > 0 ? ((totals?.d ?? 0) / total) * 100 : 0;
  const rPct = total > 0 ? ((totals?.r ?? 0) / total) * 100 : 0;
  const iPct = total > 0 ? ((totals?.i ?? 0) / total) * 100 : 0;

  if (loading && !totals) {
    return (
      <div style={{ marginTop: 32 }}>
        <CqLabel>Industry contributions · current cycle</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
          Money to Members of Congress
        </div>
        <div
          style={{
            height: 36,
            border: '2px solid var(--ink)',
            background: 'var(--bg3)',
            opacity: 0.5,
          }}
        />
      </div>
    );
  }

  if (!totals || total === 0) {
    return (
      <div style={{ marginTop: 32 }}>
        <CqLabel>Industry contributions · current cycle</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
          Money to Members of Congress
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
          No industry-contribution data is available for this policy area yet. Sector totals
          populate as legislator vote-finance correlations fill the cache.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 32 }}>
      <CqLabel>
        Industry contributions · current cycle
        {industryLabel ? ` · ${industryLabel}` : ''}
      </CqLabel>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
        Money to Members of Congress
      </div>
      <div
        role="img"
        aria-label={`${dPct.toFixed(0)} percent to Democrats, ${rPct.toFixed(0)} percent to Republicans`}
        style={{
          display: 'flex',
          height: 36,
          border: '2px solid var(--ink)',
          marginBottom: 12,
          overflow: 'hidden',
        }}
      >
        {dPct > 0 && (
          <div
            style={{
              width: `${dPct}%`,
              background: 'var(--civiq-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: rPct > 0 || iPct > 0 ? '2px solid var(--ink)' : 'none',
            }}
          >
            {dPct >= 14 && (
              <span
                style={{
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {dPct.toFixed(0)}%
              </span>
            )}
          </div>
        )}
        {rPct > 0 && (
          <div
            style={{
              width: `${rPct}%`,
              background: 'var(--civiq-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: iPct > 0 ? '2px solid var(--ink)' : 'none',
            }}
          >
            {rPct >= 14 && (
              <span
                style={{
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {rPct.toFixed(0)}%
              </span>
            )}
          </div>
        )}
        {iPct > 0 && (
          <div
            style={{
              width: `${iPct}%`,
              background: 'var(--civiq-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {iPct >= 14 && (
              <span
                style={{
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {iPct.toFixed(0)}%
              </span>
            )}
          </div>
        )}
      </div>
      <CqBar
        label="To Democratic members"
        pct={Math.round(dPct)}
        amount={formatCompactDollars(totals.d)}
        color="green"
      />
      <CqBar
        label="To Republican members"
        pct={Math.round(rPct)}
        amount={formatCompactDollars(totals.r)}
        color="red"
      />
      <CqBar
        label="To Independent members"
        pct={Math.round(iPct)}
        amount={formatCompactDollars(totals.i)}
        color="blue"
      />
    </div>
  );
}
