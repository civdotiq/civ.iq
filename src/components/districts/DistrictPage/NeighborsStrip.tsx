/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Adjacent districts list — links each border district back to its own
 * /districts/[id] page. Names beyond the district ID are intentionally
 * omitted (the neighbors API only returns IDs) so we don't fabricate
 * relationships we can't verify.
 */

'use client';

import Link from 'next/link';
import { CqLabel } from '@/components/cq';
import type { NeighborEntry } from './types';

interface NeighborsStripProps {
  neighbors: NeighborEntry[] | null;
  loading: boolean;
}

export function NeighborsStrip({ neighbors, loading }: NeighborsStripProps) {
  return (
    <section>
      <CqLabel>Neighboring districts</CqLabel>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
        Adjacent borders
      </div>
      {loading ? (
        <SkeletonRows />
      ) : !neighbors || neighbors.length === 0 ? (
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
          Data unavailable — no neighbors registered for this district.
        </div>
      ) : (
        neighbors.slice(0, 5).map((n, i) => (
          <Link
            key={n.id}
            href={`/districts/${n.id}?v=new`}
            style={{
              textDecoration: 'none',
              color: 'var(--fg1)',
              display: 'grid',
              gridTemplateColumns: '80px 1fr 24px',
              gap: 14,
              alignItems: 'center',
              padding: '14px 0',
              borderTop: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--civiq-blue-active)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {n.id}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{n.name}</div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--fg3)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 2,
                }}
              >
                Centroid proximity · Census gazetteer
              </div>
            </div>
            <span
              aria-hidden="true"
              style={{
                color: 'var(--civiq-blue-active)',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
              }}
            >
              →
            </span>
          </Link>
        ))
      )}
    </section>
  );
}

function SkeletonRows() {
  return (
    <div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr 24px',
            gap: 14,
            alignItems: 'center',
            padding: '14px 0',
            borderTop: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)',
            minHeight: 36,
          }}
        >
          <div style={{ height: 14, background: 'var(--bg3)', opacity: 0.5 }} />
          <div style={{ height: 14, background: 'var(--bg3)', opacity: 0.5 }} />
          <div />
        </div>
      ))}
    </div>
  );
}
