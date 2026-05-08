/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Compact seated-rep card — 64px portrait + party stripe + name + role.
 * Always links back to the full /representative/[bioguideId] profile.
 */

'use client';

import Link from 'next/link';
import { CqChip, CqLabel, CqPortrait } from '@/components/cq';
import { partyChipVariant, partyShort } from './data';
import type { DistrictRepresentative } from './types';

interface SeatedRepCardProps {
  representative: DistrictRepresentative | null | undefined;
  districtLabel: string;
  loading: boolean;
}

export function SeatedRepCard({ representative, districtLabel, loading }: SeatedRepCardProps) {
  if (loading || !representative) {
    return (
      <section style={{ marginBottom: 32 }}>
        <CqLabel>Who represents {districtLabel}</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
          Seated representative
        </div>
        <div
          style={{
            border: '2px solid var(--ink)',
            padding: '20px 22px',
            display: 'grid',
            gridTemplateColumns: '64px 1fr auto',
            gap: 16,
            alignItems: 'center',
            minHeight: 96,
          }}
        >
          {loading ? (
            <>
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: 'var(--bg3)',
                  opacity: 0.5,
                  border: '2px solid var(--ink)',
                }}
              />
              <div>
                <div
                  style={{
                    width: 200,
                    height: 12,
                    background: 'var(--bg3)',
                    opacity: 0.5,
                    marginBottom: 8,
                  }}
                />
                <div style={{ width: 140, height: 10, background: 'var(--bg3)', opacity: 0.5 }} />
              </div>
              <div />
            </>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--fg2)' }}>
              Data unavailable — seated representative did not load.
            </span>
          )}
        </div>
      </section>
    );
  }

  const variant = partyChipVariant(representative.party);
  const role = 'U.S. Representative';
  const tenure =
    typeof representative.yearsInOffice === 'number' && representative.yearsInOffice > 0
      ? `Since ${new Date().getFullYear() - representative.yearsInOffice}`
      : null;

  return (
    <section style={{ marginBottom: 32 }}>
      <CqLabel>Who represents {districtLabel}</CqLabel>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
        Seated representative
      </div>
      <div
        style={{
          border: '2px solid var(--ink)',
          padding: '20px 22px',
          display: 'grid',
          gridTemplateColumns: '64px minmax(0, 1fr) auto',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <CqPortrait
          name={representative.name}
          size={64}
          party={variant}
          src={representative.imageUrl}
          alt={`${representative.name} portrait`}
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
            {role} · {districtLabel}
            {tenure ? ` · ${tenure}` : ''}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginTop: 6,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {representative.name}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 8,
              flexWrap: 'wrap',
            }}
          >
            <CqChip variant={variant} size="sm">
              {partyShort(representative.party)} · {districtLabel}
            </CqChip>
            <Link
              href={`/representative/${representative.bioguideId}`}
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
            <Link
              href={`/representative/${representative.bioguideId}/votes`}
              style={{
                fontSize: 11,
                color: 'var(--civiq-blue-active)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
              }}
            >
              Voting record →
            </Link>
          </div>
        </div>
        <div />
      </div>
    </section>
  );
}
