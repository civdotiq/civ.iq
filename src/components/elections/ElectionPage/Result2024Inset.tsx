/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * 2024 result inset — only renders when the race year is 2024 AND
 * the state is in MEDSL coveredStates. Two-column readout with the
 * actual result, margin, and a winner badge. Replaces the reference's
 * pre-election ticker for past races.
 */

import { CqChip, CqLabel, CqSourceTag } from '@/components/cq';
import type { RaceResultFull } from '@/types/elections';
import { displayName, formatPct, partyChipVariant, partyColorVar } from './data';
import type { ElectionRaceCandidate } from './types';

interface Result2024InsetProps {
  result: RaceResultFull;
  democrat: ElectionRaceCandidate;
  republican: ElectionRaceCandidate;
}

export function Result2024Inset({ result, democrat, republican }: Result2024InsetProps) {
  const winnerParty = result.winner === 'D' ? 'D' : result.winner === 'R' ? 'R' : null;
  const winnerName =
    winnerParty === 'D'
      ? displayName(democrat.name)
      : winnerParty === 'R'
        ? displayName(republican.name)
        : 'Other';
  const winnerVariant = winnerParty ? partyChipVariant(winnerParty) : 'i';
  const marginText = `${winnerName.split(' ').slice(-1)[0]} +${result.margin.toFixed(1)}`;

  return (
    <div
      style={{
        border: '2px solid var(--ink)',
        background: 'var(--bg1)',
        padding: '24px 28px',
        marginBottom: 32,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <CqLabel>2024 result · certified</CqLabel>
        <CqSourceTag compact source="MEDSL" id={`MIT Election Lab · ${result.districtId}`} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <ResultCell
          name={displayName(democrat.name)}
          pct={result.demPct}
          accent={partyColorVar('D')}
          isWinner={winnerParty === 'D'}
          side="left"
        />
        <ResultCell
          name={displayName(republican.name)}
          pct={result.repPct}
          accent={partyColorVar('R')}
          isWinner={winnerParty === 'R'}
          side="right"
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--fg2)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Margin · {marginText}
        </span>
        <CqChip variant={winnerVariant} size="sm">
          {winnerName} won
        </CqChip>
      </div>
    </div>
  );
}

interface ResultCellProps {
  name: string;
  pct: number;
  accent: string;
  isWinner: boolean;
  side: 'left' | 'right';
}

function ResultCell({ name, pct, accent, isWinner, side }: ResultCellProps) {
  return (
    <div
      style={{
        padding: '18px 20px',
        textAlign: side === 'left' ? 'left' : 'right',
        borderLeft: side === 'right' ? '1px solid var(--line)' : 0,
        background: isWinner ? 'var(--bg2)' : 'transparent',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg3)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: accent,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
          marginTop: 4,
        }}
      >
        {formatPct(pct)}
      </div>
    </div>
  );
}
