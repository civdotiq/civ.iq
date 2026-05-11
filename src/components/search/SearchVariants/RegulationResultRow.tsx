/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqChip, CqLabel } from '@/components/cq';
import { formatShortDate } from './data';
import type { RegulationRow } from './types';

interface RegulationResultRowProps {
  readonly r: RegulationRow;
  readonly first: boolean;
}

/**
 * Regulation row — doc number · title · agency · comment-status chip ·
 * posted date. Per Correction 4 the rulemaking-stage chip is dropped
 * (Federal Register's stage flags are fuzzy at the listing level);
 * comment status is reliable since it's derived from comment_period_end
 * vs today.
 *
 * Comment-status chip color rules: filled blue ('info') when open,
 * outline grey when closed. Never amber/red — comment status is a date
 * fact, not a system warning.
 */
export function RegulationResultRow({ r, first }: RegulationResultRowProps) {
  const isOpen = r.isOpenForComment;
  const statusLabel = isOpen ? 'Open' : 'Closed';

  return (
    <Link
      href={r.href}
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr 200px 110px 110px 24px',
        gap: 14,
        padding: '14px 0',
        borderTop: first ? 0 : '1px solid var(--line)',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'var(--fg1)',
      }}
    >
      <div>
        <CqLabel>Doc.</CqLabel>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--fg1)',
            marginTop: 3,
            letterSpacing: '0.02em',
            wordBreak: 'break-all',
          }}
        >
          {r.docNumber}
        </div>
      </div>
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.35,
            color: 'var(--fg1)',
            letterSpacing: '-0.01em',
          }}
        >
          {r.title}
        </div>
      </div>
      <div>
        <CqLabel>Agency</CqLabel>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            marginTop: 3,
            color: 'var(--fg2)',
            lineHeight: 1.3,
          }}
        >
          {r.agency}
        </div>
      </div>
      <div>
        <CqChip variant="info" filled={isOpen} size="sm">
          {statusLabel}
        </CqChip>
        <div
          style={{
            fontSize: 10,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            marginTop: 4,
            letterSpacing: '0.04em',
          }}
        >
          {r.commentsCloseOn
            ? `${isOpen ? 'Closes' : 'Closed'} ${formatShortDate(r.commentsCloseOn)}`
            : 'No comment period'}
        </div>
      </div>
      <div>
        <CqLabel>Posted</CqLabel>
        <div
          style={{
            fontSize: 12,
            color: 'var(--fg2)',
            fontFamily: 'var(--font-mono)',
            marginTop: 3,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatShortDate(r.publishedDate)}
        </div>
      </div>
      <span aria-hidden style={{ fontSize: 18, color: 'var(--fg3)', textAlign: 'right' }}>
        →
      </span>
    </Link>
  );
}
