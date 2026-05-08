/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Federal contracts/grants flowing into this district. USASpending.gov
 * proportional bars use blue — never red/green, which are reserved for
 * party identification. Falls back to a designed empty state when the
 * upstream feed is unavailable.
 */

'use client';

import { CqLabel } from '@/components/cq';
import { formatCompactDollars } from './data';
import type { MajorProject } from './types';

interface FederalMoneyTableProps {
  totalSpending: number;
  contractsAndGrants: number;
  projects: MajorProject[];
  loading: boolean;
  failed?: boolean;
}

const COLUMNS = '40px minmax(0, 1fr) 130px';

export function FederalMoneyTable({
  totalSpending,
  contractsAndGrants,
  projects,
  loading,
  failed,
}: FederalMoneyTableProps) {
  return (
    <section>
      <CqLabel>Federal spending · obligations to district · current FY</CqLabel>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
        Where federal money goes here
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: 'var(--civiq-blue)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {loading ? '—' : formatCompactDollars(totalSpending)}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        {loading
          ? 'Loading USASpending rollup…'
          : `${contractsAndGrants.toLocaleString('en-US')} contracts and grants · USASpending.gov`}
      </div>

      {loading ? (
        <SkeletonRows />
      ) : failed ? (
        <EmptyState message="Data unavailable — USASpending.gov rollup did not load. The upstream feed is occasionally slow on cold start; refresh in a moment." />
      ) : projects.length === 0 ? (
        <EmptyState message="No major federal awards published for this district in the current fiscal year." />
      ) : (
        <ProjectsTable projects={projects} />
      )}
    </section>
  );
}

function ProjectsTable({ projects }: { projects: MajorProject[] }) {
  const max = Math.max(...projects.map(p => p.amount), 1);
  const top = projects.slice(0, 8);
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLUMNS,
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid var(--ink)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {['#', 'Award · Agency', 'Amount'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {top.map((p, i) => {
        const pct = (p.amount / max) * 100;
        return (
          <div
            key={`${p.title}-${i}`}
            style={{
              display: 'grid',
              gridTemplateColumns: COLUMNS,
              gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid var(--line)',
              alignItems: 'center',
              minHeight: 36,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--fg3)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={p.title}
              >
                {p.title}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--fg3)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 2,
                }}
              >
                {p.agency}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--civiq-blue-active)',
                  fontVariantNumeric: 'tabular-nums',
                  textAlign: 'right',
                }}
              >
                {formatCompactDollars(p.amount)}
              </span>
              <div
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${formatCompactDollars(p.amount)} relative to top award`}
                style={{ height: 4, background: 'var(--bg3)', position: 'relative' }}
              >
                <div
                  style={{
                    height: '100%',
                    background: 'var(--civiq-blue)',
                    width: `${Math.min(100, Math.max(0, pct))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
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
      {message}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLUMNS,
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid var(--ink)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {['#', 'Award · Agency', 'Amount'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: COLUMNS,
            gap: 12,
            padding: '10px 0',
            borderBottom: '1px solid var(--line)',
            alignItems: 'center',
            minHeight: 36,
          }}
        >
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
        </div>
      ))}
    </div>
  );
}
