/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqLabel } from '@/components/cq';
import type { SectorRow } from './types';

interface SectorResultRowProps {
  readonly s: SectorRow;
  readonly first: boolean;
}

/**
 * Sector row — name + link + "View top recipients →" affordance.
 *
 * Per Correction 3 the chassis is meant to render top recipient + cycle
 * total + "(2 more)" link. At listing scale that requires 13 leaderboard
 * calls per page load (~30s+ uncached) — well outside what a server-render
 * can absorb. Per the prompt's "render — for fields a row lacks" rule,
 * the per-sector aggregate slots show "—" with the disclaimer noting
 * that exact rollups live on each sector's detail page.
 */
export function SectorResultRow({ s, first }: SectorResultRowProps) {
  return (
    <Link
      href={s.href}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 110px 110px 24px',
        gap: 16,
        padding: '16px 0',
        borderTop: first ? 0 : '1px solid var(--line)',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'var(--fg1)',
      }}
    >
      <div>
        <CqLabel>Sector</CqLabel>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            marginTop: 4,
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            color: 'var(--fg1)',
          }}
        >
          {s.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            marginTop: 4,
            letterSpacing: '0.04em',
          }}
        >
          OpenSecrets / FEC categorization
        </div>
      </div>
      <div>
        <CqLabel>Cycle total</CqLabel>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 3,
            color: 'var(--fg2)',
          }}
        >
          —
        </div>
      </div>
      <div>
        <CqLabel>Top recipient</CqLabel>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            marginTop: 3,
            color: 'var(--fg2)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          —
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--civiq-blue)',
            fontFamily: 'var(--font-mono)',
            marginTop: 4,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          View detail →
        </div>
      </div>
      <span aria-hidden style={{ fontSize: 18, color: 'var(--fg3)', textAlign: 'right' }}>
        →
      </span>
    </Link>
  );
}
