/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { CqLabel } from '@/components/cq';

interface VariantEmptyStateProps {
  readonly headline: string;
  readonly body: ReactNode;
  readonly resetHref?: string;
}

/**
 * Designed empty state — one per variant per the prompt's Correction 1
 * guidance. Not a generic "no results" stub. The headline names the
 * scope, the body explains the data boundary.
 */
export function VariantEmptyState({ headline, body, resetHref }: VariantEmptyStateProps) {
  return (
    <div
      style={{
        border: '2px solid var(--ink)',
        padding: '36px 28px',
        background: 'var(--bg1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
      }}
    >
      <CqLabel>No results</CqLabel>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          color: 'var(--fg1)',
        }}
      >
        {headline}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--fg2)',
          lineHeight: 1.5,
          maxWidth: 520,
          marginTop: 4,
        }}
      >
        {body}
      </div>
      {resetHref && (
        <Link
          href={resetHref}
          style={{
            marginTop: 8,
            fontSize: 11,
            color: 'var(--civiq-blue)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Reset filters →
        </Link>
      )}
    </div>
  );
}
