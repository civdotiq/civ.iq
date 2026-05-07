/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import { CqButton, CqChip, CqLabel, CqPortrait } from '@/components/cq';
import { partyKey, partyLong } from '@/components/officials/ProfileHybrid/types';
import type { EnhancedRepresentative } from '@/types/representative';

interface CompactHeroProps {
  representative: EnhancedRepresentative;
  totalVotes: number | undefined;
  loading: boolean;
}

export function CompactHero({ representative: r, totalVotes, loading }: CompactHeroProps) {
  const pKey = partyKey(r.party);
  const role = r.role ?? (r.chamber === 'Senate' ? 'Senator' : 'Representative');
  const districtLabel = r.district ? `${r.state}-${String(r.district).padStart(2, '0')}` : r.state;
  const congress = r.terms?.[0]?.congress ?? '119';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '64px minmax(0, 1fr) auto',
        gap: 20,
        alignItems: 'center',
        paddingBottom: 16,
        borderBottom: '2px solid var(--ink)',
      }}
    >
      <CqPortrait
        name={r.name}
        size={64}
        party={pKey}
        src={r.imageUrl}
        alt={`${r.name} portrait`}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {role} · {partyLong(r.party)} · {districtLabel} · {congress} Congress
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-display)',
            textTransform: 'uppercase',
            margin: '4px 0 0',
            lineHeight: 1.05,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {r.name} · Voting record
        </h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 8,
            flexWrap: 'wrap',
          }}
        >
          <CqChip variant={pKey} size="sm">
            {partyLong(r.party)} · {districtLabel}
          </CqChip>
          <Link
            href={`/representative/${r.bioguideId}`}
            style={{
              fontSize: 11,
              color: 'var(--civiq-blue-active)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
            }}
          >
            View full profile →
          </Link>
          <span
            style={{
              fontSize: 11,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {loading
              ? 'Loading votes…'
              : typeof totalVotes === 'number'
                ? `${totalVotes.toLocaleString('en-US')} vote${totalVotes === 1 ? '' : 's'} loaded`
                : 'Votes unavailable'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <a
          href={`https://www.congress.gov/member/${r.bioguideId}/votes`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <CqButton variant="secondary" size="sm">
            View on Congress.gov →
          </CqButton>
        </a>
      </div>
      <div style={{ gridColumn: '1 / -1', marginTop: 12 }}>
        <CqLabel>Compact profile · linked to full record</CqLabel>
      </div>
    </div>
  );
}
