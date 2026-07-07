/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for chamber baselines (pure computation over synthetic roll calls).
 * Reuses the real party-majority derivation from party-line-analyzer.
 */

import { computeChamberBaselines } from '@/lib/intelligence/analyzers/chamber-baselines';
import type { StandardizedVote } from '@/features/representatives/services/batch-voting-service';

type Position = 'Yea' | 'Nay' | 'Present' | 'Not Voting';

interface MemberSpec {
  bioguideId: string;
  party: string;
  position: Position;
}

function rollCall(n: number, date: string, members: MemberSpec[]): StandardizedVote {
  return {
    voteId: `house-119-1-${n}`,
    congress: 119,
    session: 1,
    chamber: 'House',
    rollCallNumber: n,
    date,
    question: 'On Passage',
    result: 'Passed',
    totals: {
      yea: members.filter(m => m.position === 'Yea').length,
      nay: members.filter(m => m.position === 'Nay').length,
      present: members.filter(m => m.position === 'Present').length,
      notVoting: members.filter(m => m.position === 'Not Voting').length,
    },
    memberVotes: members.map(m => ({
      bioguideId: m.bioguideId,
      name: m.bioguideId,
      party: m.party,
      state: 'MI',
      position: m.position,
    })),
    sourceUrl: 'https://clerk.house.gov/test',
    processedAt: '2026-07-01T00:00:00.000Z',
  };
}

/**
 * Build N identical-shape roll calls: 6 Democrats voting Yea (except D6 who
 * misses every vote and D5 who votes Nay — a party-breaker), 6 Republicans
 * voting Nay. 25 roll calls clears MIN_APPEARANCES_FOR_MEDIAN (20) and
 * MIN_VOTES_FOR_ALIGNMENT (10).
 */
function buildRollCalls(count: number): StandardizedVote[] {
  const calls: StandardizedVote[] = [];
  for (let i = 1; i <= count; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    calls.push(
      rollCall(i, `2026-06-${day}`, [
        { bioguideId: 'D1', party: 'D', position: 'Yea' },
        { bioguideId: 'D2', party: 'D', position: 'Yea' },
        { bioguideId: 'D3', party: 'D', position: 'Yea' },
        { bioguideId: 'D4', party: 'D', position: 'Yea' },
        { bioguideId: 'D5', party: 'D', position: 'Nay' },
        { bioguideId: 'D6', party: 'D', position: 'Not Voting' },
        { bioguideId: 'R1', party: 'R', position: 'Nay' },
        { bioguideId: 'R2', party: 'R', position: 'Nay' },
        { bioguideId: 'R3', party: 'R', position: 'Nay' },
        { bioguideId: 'R4', party: 'R', position: 'Nay' },
        { bioguideId: 'R5', party: 'R', position: 'Nay' },
        { bioguideId: 'R6', party: 'R', position: 'Nay' },
      ])
    );
  }
  return calls;
}

describe('computeChamberBaselines', () => {
  const baselines = computeChamberBaselines(buildRollCalls(25), 'House', 119, true, 2, 2026);

  it('counts appearances, cast, and missed per member', () => {
    const d1 = baselines.members['D1'];
    const d6 = baselines.members['D6'];
    expect(d1?.appearances).toBe(25);
    expect(d1?.cast).toBe(25);
    expect(d1?.missed).toBe(0);
    expect(d6?.cast).toBe(0);
    expect(d6?.missed).toBe(25);
    expect(d6?.missedPct).toBe(100);
  });

  it('computes party alignment via the shared derivation', () => {
    // Democratic majority is Yea (4-1 among Yea/Nay voters, quorum 5)
    expect(baselines.members['D1']?.partyAlignmentPct).toBe(100);
    expect(baselines.members['D5']?.partyAlignmentPct).toBe(0);
    expect(baselines.members['R1']?.partyAlignmentPct).toBe(100);
    // D6 never cast a Yea/Nay vote — below the alignment sample floor
    expect(baselines.members['D6']?.partyAlignmentPct).toBeNull();
  });

  it('computes chamber and party medians over qualifying members', () => {
    // 12 members, 11 with 0% missed and D6 with 100% — median is 0
    expect(baselines.medianMissedPct).toBe(0);
    expect(baselines.medianSampleSize).toBe(12);
    // D alignment values: 100,100,100,100,0 → median 100; R all 100
    expect(baselines.medianAlignmentByParty.Democratic).toBe(100);
    expect(baselines.medianAlignmentByParty.Republican).toBe(100);
  });

  it('uses each member own appearances as their denominator (late arrivals)', () => {
    const calls = buildRollCalls(25);
    // A member who only appears in the last 5 roll calls
    for (let i = 20; i < 25; i++) {
      calls[i]?.memberVotes.push({
        bioguideId: 'D7',
        name: 'D7',
        party: 'D',
        state: 'MI',
        position: 'Yea',
      });
    }
    const b = computeChamberBaselines(calls, 'House', 119, true, 2, 2026);
    expect(b.members['D7']?.appearances).toBe(5);
    expect(b.members['D7']?.missedPct).toBe(0);
    // Below MIN_APPEARANCES_FOR_MEDIAN — excluded from the median sample
    expect(b.medianSampleSize).toBe(12);
    // Below MIN_VOTES_FOR_ALIGNMENT — no alignment score
    expect(b.members['D7']?.partyAlignmentPct).toBeNull();
  });

  it('reports coverage and freshest roll-call date', () => {
    expect(baselines.rollCallsAnalyzed).toBe(25);
    expect(baselines.fullCoverage).toBe(true);
    // Fixture days run (i % 28) + 1 for i=1..25 → newest is the 26th
    expect(baselines.dataAsOf).toBe('2026-06-26');
    expect(baselines.methodology).toContain('25 House roll calls');
  });

  it('discloses partial coverage for Senate samples', () => {
    const b = computeChamberBaselines(buildRollCalls(25), 'Senate', 119, false, 2, 2026);
    expect(b.fullCoverage).toBe(false);
    expect(b.methodology).toContain('recent sample');
  });
});
