/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Related-awards aside: up to 6 peer awards from the same recipient
 * (UEI) and same awarding top-tier agency. Each row links to that
 * award's detail page on this site.
 *
 * NOTE — the reference design also rendered an "Authorizing law" card
 * here. That panel is CUT (see prompt Correction 1): USASpending does
 * not carry program-to-public-law citations and we will not fabricate
 * them. When a curated program → P.L. mapping ships, restore the
 * authorizing-law card as a sibling to this aside.
 */

import Link from 'next/link';
import { CqLabel } from '@/components/cq';
import { formatCompactDollars, truncate } from './data';
import type { USASpendingAwardResult } from '@/types/spending';

interface RelatedAwardsAsideProps {
  related: USASpendingAwardResult[];
  loading: boolean;
}

export function RelatedAwardsAside({ related, loading }: RelatedAwardsAsideProps) {
  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ border: '2px solid var(--ink)' }}>
        <div
          style={{
            background: 'var(--ink)',
            color: '#fff',
            padding: '10px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Related awards · same recipient + agency
        </div>
        <div style={{ padding: '4px 0' }}>
          {loading && related.length === 0 ? (
            <div
              style={{
                padding: '14px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--fg3)',
              }}
            >
              Searching peer awards…
            </div>
          ) : related.length === 0 ? (
            <div
              style={{
                padding: '14px 14px',
                fontSize: 12,
                color: 'var(--fg2)',
                lineHeight: 1.5,
              }}
            >
              <CqLabel>Empty result</CqLabel>
              <div style={{ marginTop: 6 }}>
                No peer awards from this agency-vendor pair surface in USASpending.
              </div>
            </div>
          ) : (
            related.map((row, i) => (
              <Link
                key={row.generated_internal_id}
                href={`/spending/awards/${encodeURIComponent(row.generated_internal_id)}?v=new`}
                style={{
                  display: 'block',
                  padding: '12px 14px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--fg3)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {row['Award ID']}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginTop: 2,
                    color: 'var(--fg1)',
                    lineHeight: 1.4,
                  }}
                >
                  {truncate(row.Description ?? row['Awarding Agency'], 90)}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--civiq-blue)',
                    marginTop: 4,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCompactDollars(row['Award Amount'])}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
