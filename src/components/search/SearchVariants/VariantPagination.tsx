/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { VariantPaginationProps } from './types';

/**
 * Pagination chrome for the SearchVariants chassis.
 *
 * v1 ships with the visual rail (count + timing + disabled prev/next).
 * Real pagination is a follow-up — every legacy listing has its own
 * pagination story we shouldn't fork in this PR (Correction 6).
 */
export function VariantPagination({ start, end, total, elapsedMs }: VariantPaginationProps) {
  const seconds = Math.max(elapsedMs, 0) / 1000;
  return (
    <div
      style={{
        marginTop: 32,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 0',
        borderTop: '2px solid var(--ink)',
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {total === 0
          ? 'Showing 0 of 0'
          : `Showing ${start.toLocaleString('en-US')}–${end.toLocaleString(
              'en-US'
            )} of ${total.toLocaleString('en-US')}`}
      </span>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span
          aria-disabled
          style={{
            fontSize: 11,
            color: 'var(--fg4)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          ← Prev
        </span>
        <span
          aria-disabled
          style={{
            fontSize: 11,
            color: 'var(--fg4)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Next →
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Listing · {seconds.toFixed(2)}s
        </span>
      </div>
    </div>
  );
}
