/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Every filed candidate beyond the two compared in the hero. FEC filing
 * is not ballot access, so the label and rows always say "filed" —
 * never "on the ballot".
 */

import { CqChip, CqLabel } from '@/components/cq';
import type { ElectionRaceCandidate } from './types';
import { displayName, formatCompactDollars, incumbencyLabel, partyChipVariant } from './data';

interface AlsoFiledListProps {
  candidates: ElectionRaceCandidate[];
}

export function AlsoFiledList({ candidates }: AlsoFiledListProps) {
  return (
    <div
      style={{
        border: '2px solid var(--ink)',
        background: 'var(--bg1)',
        padding: '20px 28px 8px',
        marginBottom: 32,
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <CqLabel>Also filed with the FEC</CqLabel>
      </div>
      {candidates.map(candidate => (
        <div
          key={candidate.candidateId}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '10px 0',
            borderTop: '1px solid var(--line)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg1)' }}>
              {displayName(candidate.name)}
            </span>
            <CqChip variant={partyChipVariant(candidate.party)} size="sm">
              {candidate.partyLong}
            </CqChip>
            {candidate.incumbentChallenge === 'I' && (
              <CqChip variant="ink" filled={false} size="sm">
                {incumbencyLabel('I')}
              </CqChip>
            )}
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--fg2)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            Raised · {formatCompactDollars(candidate.totalReceipts)}
          </span>
        </div>
      ))}
    </div>
  );
}
