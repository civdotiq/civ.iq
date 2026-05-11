/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqLabel } from '@/components/cq';
import type { TopicRow } from './types';

interface TopicResultRowProps {
  readonly t: TopicRow;
  readonly first: boolean;
}

/**
 * Topic row — name + subtitle.
 *
 * Per Correction 5: bill / rep counts at the listing level would require
 * 12 per-topic aggregation calls; cycle money in/out + primary committee
 * are deferred too (those rollups exist on /topics/[slug] only). The row
 * keeps the topic name + curated subtitle. Glyph slot dropped — no
 * per-topic SVG stamp exists today.
 */
export function TopicResultRow({ t, first }: TopicResultRowProps) {
  return (
    <Link
      href={t.href}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 110px 24px',
        gap: 16,
        padding: '18px 0',
        borderTop: first ? 0 : '1px solid var(--line)',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'var(--fg1)',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            color: 'var(--fg1)',
          }}
        >
          {t.name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--fg2)',
            lineHeight: 1.45,
            marginTop: 4,
            maxWidth: 540,
          }}
        >
          {t.subtitle}
        </div>
      </div>
      <div>
        <CqLabel>Open file</CqLabel>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--civiq-blue)',
            fontFamily: 'var(--font-mono)',
            marginTop: 4,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          View topic →
        </div>
      </div>
      <span aria-hidden style={{ fontSize: 18, color: 'var(--fg3)', textAlign: 'right' }}>
        →
      </span>
    </Link>
  );
}
