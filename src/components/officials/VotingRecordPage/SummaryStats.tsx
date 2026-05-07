/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { CqLabel } from '@/components/cq';
import { categoryCounts, positionCounts, yearCounts } from './data';
import type { ApiVote, VotePosition } from './types';

interface SummaryStatsProps {
  votes: ApiVote[];
}

const POSITION_COLOR: Record<VotePosition, string> = {
  Yea: 'var(--civiq-blue)',
  Nay: 'var(--ink)',
  Present: 'var(--color-warning)',
  'Not Voting': 'var(--fg3)',
};

export function SummaryStats({ votes }: SummaryStatsProps) {
  const categories = categoryCounts(votes);
  const positions = positionCounts(votes);
  const years = yearCounts(votes);
  const total = votes.length;

  if (total === 0) {
    return null;
  }

  const maxCategoryCount = Math.max(...categories.map(c => c.count), 1);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 32,
        marginTop: 32,
      }}
    >
      <section>
        <CqLabel>
          By topic · {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
        </CqLabel>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            marginTop: 4,
            marginBottom: 12,
            letterSpacing: 'var(--tracking-display)',
          }}
        >
          Distribution by topic
        </div>
        {categories.map((row, i) => (
          <div
            key={row.category}
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr 60px',
              gap: 12,
              alignItems: 'center',
              padding: '10px 0',
              borderTop: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)',
              minHeight: 36,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{row.category}</div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--fg3)',
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {row.count} vote{row.count === 1 ? '' : 's'}
              </div>
            </div>
            <div
              role="progressbar"
              aria-valuenow={row.count}
              aria-valuemin={0}
              aria-valuemax={maxCategoryCount}
              aria-label={`${row.category}: ${row.count} of ${maxCategoryCount}`}
              style={{ height: 8, background: 'var(--bg3)' }}
            >
              <div
                style={{
                  width: `${(row.count / maxCategoryCount) * 100}%`,
                  height: '100%',
                  background: 'var(--civiq-blue)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--fg2)',
              }}
            >
              {((row.count / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}

        <div
          style={{
            marginTop: 16,
            padding: '12px 0',
            borderTop: '2px solid var(--ink)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          {positions.map(p => (
            <div
              key={p.position}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--fg2)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 12,
                  height: 12,
                  background: POSITION_COLOR[p.position],
                  border: '1px solid var(--ink)',
                }}
              />
              <span>
                {p.position} · {p.count} ({p.pct.toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <CqLabel>
          By year · {years.length} year{years.length === 1 ? '' : 's'}
        </CqLabel>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            marginTop: 4,
            marginBottom: 12,
            letterSpacing: 'var(--tracking-display)',
          }}
        >
          Year-by-year breakdown
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '60px 80px 1fr 80px',
            gap: 12,
            padding: '10px 0',
            borderTop: '2px solid var(--ink)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          {['Year', 'Votes', 'Yea share', 'Yea %'].map(h => (
            <CqLabel key={h}>{h}</CqLabel>
          ))}
        </div>
        {years.length === 0 ? (
          <div
            style={{
              padding: '16px 0',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: 'var(--fg3)',
            }}
          >
            No date-stamped votes in the loaded set.
          </div>
        ) : (
          years.map(r => {
            const counted = r.yea + r.nay;
            const pct = counted > 0 ? (r.yea / counted) * 100 : 0;
            return (
              <div
                key={r.year}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 80px 1fr 80px',
                  gap: 12,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--line)',
                  alignItems: 'center',
                  minHeight: 36,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {r.year}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {r.count.toLocaleString('en-US')}
                </span>
                <div
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${r.yea} Yea of ${counted} decided votes in ${r.year}`}
                  style={{
                    height: 8,
                    background: 'var(--bg3)',
                    border: counted === 0 ? '1px dashed var(--line)' : 0,
                  }}
                >
                  {counted > 0 && (
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'var(--civiq-blue)',
                      }}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--fg2)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {counted > 0 ? `${pct.toFixed(0)}%` : '—'}
                </span>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
