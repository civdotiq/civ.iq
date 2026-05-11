/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqLabel } from '@/components/cq';
import { MapOutlinePlaceholder } from './MapOutlinePlaceholder';
import { HouseSplitBar } from './HouseSplitBar';
import type { StateRow } from './types';

interface StateResultRowProps {
  readonly s: StateRow;
  readonly first: boolean;
}

/**
 * State row — outline-map placeholder · state code + name · HouseSplitBar
 * (the only place red/green appear in this chassis) · total seats ·
 * 2 senators by surname (no party color).
 *
 * Cuts (Correction 2): partisan lean (commercial source), top industry,
 * top sector spend, governor party-color stripe — all deferred.
 */
export function StateResultRow({ s, first }: StateResultRowProps) {
  const senatorLabel = s.senators.length ? s.senators.map(sen => sen.lastName).join(' · ') : '—';

  return (
    <Link
      href={s.href}
      style={{
        display: 'grid',
        gridTemplateColumns: '74px 220px 200px 1fr 80px 24px',
        gap: 14,
        padding: '16px 0',
        borderTop: first ? 0 : '1px solid var(--line)',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'var(--fg1)',
      }}
    >
      <MapOutlinePlaceholder code={s.code} w={74} h={56} />
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
          {s.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            marginTop: 3,
            letterSpacing: '0.04em',
          }}
        >
          {s.region} · {s.code}
        </div>
      </div>
      <div>
        <CqLabel>Senators</CqLabel>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--fg1)',
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {senatorLabel}
        </div>
      </div>
      <div>
        <CqLabel>House delegation</CqLabel>
        <div style={{ marginTop: 6 }}>
          <HouseSplitBar
            democrats={s.house.democrats}
            republicans={s.house.republicans}
            independents={s.house.independents}
          />
        </div>
      </div>
      <div>
        <CqLabel>Seats</CqLabel>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 3,
            color: 'var(--fg1)',
          }}
        >
          {s.house.total === 0 ? '—' : s.house.total}
        </div>
      </div>
      <span aria-hidden style={{ fontSize: 18, color: 'var(--fg3)', textAlign: 'right' }}>
        →
      </span>
    </Link>
  );
}
