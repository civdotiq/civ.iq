/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqLabel } from '@/components/cq';
import { MapOutlinePlaceholder } from './MapOutlinePlaceholder';
import { formatNumberWithCommas } from './data';
import type { DistrictRow } from './types';

interface DistrictResultRowProps {
  readonly d: DistrictRow;
  readonly first: boolean;
}

/**
 * District row — outline-map placeholder · code · seated rep mini-portrait
 * + name · population. PVI / seat type / median income deliberately cut
 * (Correction 1 — commercial source / cross-domain join not shipped at
 * the listing level). Non-partisan: rep names render in ink, no party
 * stripe on the row.
 */
export function DistrictResultRow({ d, first }: DistrictResultRowProps) {
  return (
    <Link
      href={d.href}
      style={{
        display: 'grid',
        gridTemplateColumns: '90px 100px 1fr 120px 24px',
        gap: 14,
        padding: '14px 0',
        borderTop: first ? 0 : '1px solid var(--line)',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'var(--fg1)',
      }}
    >
      <div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          {d.code}
        </span>
        <div
          style={{
            fontSize: 10,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            marginTop: 2,
            letterSpacing: '0.04em',
          }}
        >
          District {d.number}
        </div>
      </div>
      <MapOutlinePlaceholder code={d.code} w={92} h={48} />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div
          aria-hidden
          style={{
            width: 36,
            height: 36,
            border: '1.5px solid var(--ink)',
            background: 'var(--bg1)',
            backgroundImage:
              'repeating-linear-gradient(45deg, var(--bg2) 0 4px, var(--bg3) 4px 8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-primary)',
            fontWeight: 700,
            fontSize: 12,
            color: 'var(--fg1)',
            flexShrink: 0,
          }}
        >
          {d.rep.initials}
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--fg1)',
            }}
          >
            {d.rep.name}
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              marginTop: 3,
              letterSpacing: '0.04em',
            }}
          >
            U.S. Representative
          </div>
        </div>
      </div>
      <div>
        <CqLabel>Pop.</CqLabel>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 3,
            color: 'var(--fg1)',
          }}
        >
          {formatNumberWithCommas(d.population)}
        </div>
      </div>
      <span
        aria-hidden
        style={{
          fontSize: 18,
          color: 'var(--fg3)',
          textAlign: 'right',
        }}
      >
        →
      </span>
    </Link>
  );
}
