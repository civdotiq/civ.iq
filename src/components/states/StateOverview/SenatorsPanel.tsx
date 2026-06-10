/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqChip, CqLabel, CqPlainReading } from '@/components/cq';
import type { DelegationMember } from './types';

interface SenatorsPanelProps {
  senators: DelegationMember[];
}

export function SenatorsPanel({ senators }: SenatorsPanelProps) {
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
          <CqLabel>U.S. Senators</CqLabel>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginTop: 4,
              margin: '4px 0 0',
              letterSpacing: '-0.01em',
            }}
          >
            Senate delegation
          </h2>
        </div>
      </div>
      {senators.length === 0 ? (
        <CqPlainReading label="DATA UNAVAILABLE.">
          No Senate delegation found for this state.
        </CqPlainReading>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 0,
            border: '2px solid var(--ink)',
          }}
        >
          {senators.map((sen, i) => (
            <SenatorCard key={sen.bioguideId} senator={sen} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

function SenatorCard({ senator, index }: { senator: DelegationMember; index: number }) {
  const stripe =
    senator.party === 'd'
      ? 'var(--party-democrat)'
      : senator.party === 'r'
        ? 'var(--civiq-red)'
        : 'var(--data-vlau)';
  return (
    <Link
      href={`/representative/${senator.bioguideId}`}
      style={{
        padding: '20px 22px',
        textDecoration: 'none',
        color: 'var(--fg1)',
        borderRight: index === 0 ? '1px solid var(--line)' : 0,
        display: 'grid',
        gridTemplateColumns: '64px minmax(0, 1fr)',
        gap: 14,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          position: 'relative',
          border: '2px solid var(--ink)',
          background: 'var(--bg1)',
          backgroundImage:
            'repeating-linear-gradient(45deg, var(--bg2) 0 6px, var(--bg3) 6px 12px)',
        }}
        aria-hidden="true"
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: stripe,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 20,
            color: 'var(--fg1)',
          }}
        >
          {senator.initials}
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
          <CqChip variant={senator.party === 'i' ? 'i' : senator.party} size="sm">
            {senator.party === 'd' ? 'D' : senator.party === 'r' ? 'R' : 'I'}
          </CqChip>
          {senator.yearsInOffice !== undefined && senator.yearsInOffice > 0 && (
            <CqLabel>Since {new Date().getUTCFullYear() - senator.yearsInOffice}</CqLabel>
          )}
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={senator.name}
        >
          {senator.name}
        </div>
        {senator.nextElection && senator.nextElection !== '0' && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              marginTop: 4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            Next election: {senator.nextElection}
          </div>
        )}
      </div>
    </Link>
  );
}
