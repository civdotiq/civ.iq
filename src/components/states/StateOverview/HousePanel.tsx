/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqLabel, CqPlainReading } from '@/components/cq';
import type { DelegationMember } from './types';

interface HousePanelProps {
  houseMembers: DelegationMember[];
  stateCode: string;
}

export function HousePanel({ houseMembers, stateCode }: HousePanelProps) {
  const districtCount = houseMembers.length;
  return (
    <section style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 12,
        }}
      >
        <div>
          <CqLabel>
            {districtCount > 0
              ? `${districtCount} House district${districtCount === 1 ? '' : 's'}`
              : 'House delegation'}
          </CqLabel>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: '4px 0 0',
              letterSpacing: '-0.01em',
            }}
          >
            U.S. House delegation
          </h2>
        </div>
        <Link
          href={`/delegation/${stateCode.toLowerCase()}`}
          style={{
            fontSize: 11,
            color: 'var(--civiq-blue-active)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Full delegation →
        </Link>
      </div>

      {districtCount === 0 ? (
        <CqPlainReading label="DATA UNAVAILABLE.">
          No U.S. House delegation found for this state.
        </CqPlainReading>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(13, Math.max(4, districtCount))}, minmax(0, 1fr))`,
              gap: 4,
              padding: 16,
              border: '2px solid var(--ink)',
            }}
          >
            {houseMembers.map(member => (
              <DistrictTile key={member.bioguideId} member={member} />
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 8,
              fontSize: 10,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
            }}
          >
            <LegendSwatch color="var(--party-democrat)" label="Democrat" />
            <LegendSwatch color="var(--civiq-red)" label="Republican" />
            <LegendSwatch color="var(--data-vlau)" label="Other" />
          </div>
        </>
      )}
    </section>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        aria-hidden="true"
        style={{ width: 10, height: 10, background: color, display: 'inline-block' }}
      />
      {label}
    </span>
  );
}

function DistrictTile({ member }: { member: DelegationMember }) {
  const fill =
    member.party === 'd'
      ? 'var(--party-democrat)'
      : member.party === 'r'
        ? 'var(--civiq-red)'
        : 'var(--data-vlau)';
  const districtNum = member.district ? String(member.district).padStart(2, '0') : '—';
  return (
    <Link
      href={`/representative/${member.bioguideId}`}
      title={`${districtNum}: ${member.name}`}
      style={{
        aspectRatio: '1',
        border: '2px solid var(--ink)',
        background: fill,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 700,
        color: '#fff',
        fontFamily: 'var(--font-mono)',
        textDecoration: 'none',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {districtNum}
    </Link>
  );
}
