/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * One side of the head-to-head hero. Mirrors the reference geometry:
 * portrait + chips + UPPERCASE name + monospace meta line, anchored
 * left or right via the `flip` prop. Text-align flip is load-bearing.
 *
 * Honest meta: "First filing {year}" not "In office since {year}" —
 * FEC's first_file_date marks when the candidate began filing with
 * FEC, which is a proxy for federal-office tenure but not identical.
 */

import { CqChip, CqPortrait } from '@/components/cq';
import type { ElectionRaceCandidate } from './types';
import { displayName, incumbencyLabel, partyChipVariant } from './data';

interface CandidateHeroProps {
  candidate: ElectionRaceCandidate | null;
  loading: boolean;
  flip?: boolean;
}

export function CandidateHero({ candidate, loading, flip = false }: CandidateHeroProps) {
  const align = flip ? 'flex-end' : 'flex-start';
  const ta = flip ? 'right' : 'left';
  const stackDir = flip ? ('row-reverse' as const) : ('row' as const);

  const name = candidate ? displayName(candidate.name) : loading ? 'Loading…' : '—';
  const partyVariant = candidate ? partyChipVariant(candidate.party) : 'i';
  const partyLong = candidate?.partyLong ?? '—';
  const role = incumbencyLabel(candidate?.incumbentChallenge ?? null);
  const filing = candidate?.firstFileYear ?? null;

  return (
    <div
      style={{
        padding: '32px 32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        alignItems: align,
        textAlign: ta,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: stackDir,
          gap: 20,
          alignItems: 'flex-start',
          width: '100%',
        }}
      >
        <CqPortrait name={name === '—' ? '? ?' : name} size={120} party={partyVariant} />
        <div style={{ flex: 1, textAlign: ta }}>
          <div
            style={{
              display: 'flex',
              flexDirection: stackDir,
              gap: 8,
              marginBottom: 10,
            }}
          >
            <CqChip variant={partyVariant} size="sm">
              {partyLong}
            </CqChip>
            <CqChip
              variant={candidate?.incumbentChallenge === 'I' ? 'ink' : 'info'}
              filled={false}
              size="sm"
            >
              {role}
            </CqChip>
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              lineHeight: 1.0,
              color: 'var(--fg1)',
              minHeight: 36,
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              marginTop: 8,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {filing ? `First filing ${filing}` : 'First filing —'} · Age —
          </div>
          {candidate?.candidateId && (
            <div
              style={{
                fontSize: 10,
                color: 'var(--fg4)',
                fontFamily: 'var(--font-mono)',
                marginTop: 4,
                letterSpacing: 'var(--tracking-label)',
              }}
            >
              FEC {candidate.candidateId}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
