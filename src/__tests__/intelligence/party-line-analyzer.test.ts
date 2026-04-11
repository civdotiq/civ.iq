/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Party-Line Alignment Analyzer.
 *
 * Covers:
 *  - Pure helpers (normalizePartyLabel, derivePartyMajority,
 *    computeChamberAlignment) with synthetic roll-call fixtures.
 *  - analyzePartyLineAlignment end-to-end with mocked data sources.
 *
 * The point of this analyzer is that it uses REAL party-majority computation
 * rather than the old "Yea = party line" heuristic, and that peer averages
 * are computed from actual same-party peers rather than hardcoded constants.
 * Tests are written to make regressions of either property obvious.
 */

// ── Mocks ─────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockGetEnhancedRepresentative = jest.fn();
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: (id: string) => mockGetEnhancedRepresentative(id),
}));

const mockGetHouseChamberRollCalls = jest.fn();
const mockGetSenateChamberRollCalls = jest.fn();
jest.mock('@/features/representatives/services/batch-voting-service', () => ({
  batchVotingService: {
    getHouseChamberRollCalls: (...args: unknown[]) => mockGetHouseChamberRollCalls(...args),
    getSenateChamberRollCalls: (...args: unknown[]) => mockGetSenateChamberRollCalls(...args),
  },
}));

// ── Imports (after mocks) ─────────────────────────────────────────

import {
  analyzePartyLineAlignment,
  computeChamberAlignment,
  derivePartyMajority,
  normalizePartyLabel,
  MIN_VOTES_FOR_ALIGNMENT,
} from '@/lib/intelligence/analyzers/party-line-analyzer';
import type { StandardizedVote } from '@/features/representatives/services/batch-voting-service';

// ── Fixture Helpers ───────────────────────────────────────────────

type Position = 'Yea' | 'Nay' | 'Present' | 'Not Voting';
type MemberVote = StandardizedVote['memberVotes'][number];

function member(id: string, party: string, position: Position, name = id): MemberVote {
  return { bioguideId: id, name, party, state: 'XX', position };
}

/**
 * Build a StandardizedVote with the given member votes. Other fields are
 * filled with reasonable defaults — none of them affect the analyzer.
 */
function rollCall(rollNumber: number, memberVotes: MemberVote[], date?: string): StandardizedVote {
  return {
    voteId: `house-119-${rollNumber}`,
    congress: 119,
    session: 1,
    chamber: 'House',
    rollCallNumber: rollNumber,
    date: date ?? `2025-0${((rollNumber % 9) + 1).toString()}-01`,
    question: 'On Passage',
    result: 'Passed',
    totals: {
      yea: memberVotes.filter(v => v.position === 'Yea').length,
      nay: memberVotes.filter(v => v.position === 'Nay').length,
      present: memberVotes.filter(v => v.position === 'Present').length,
      notVoting: memberVotes.filter(v => v.position === 'Not Voting').length,
    },
    memberVotes,
    sourceUrl: `https://example.test/${rollNumber}`,
    processedAt: new Date().toISOString(),
  };
}

/**
 * Synthesize a 5-Democrat, 5-Republican chamber voting pattern.
 * Each democrat votes Yea, each republican votes Nay → clear party lines.
 */
function partyLineVote(rollNumber: number, independentExtras: MemberVote[] = []): StandardizedVote {
  const votes: MemberVote[] = [
    member('D1', 'D', 'Yea'),
    member('D2', 'D', 'Yea'),
    member('D3', 'D', 'Yea'),
    member('D4', 'D', 'Yea'),
    member('D5', 'D', 'Yea'),
    member('R1', 'R', 'Nay'),
    member('R2', 'R', 'Nay'),
    member('R3', 'R', 'Nay'),
    member('R4', 'R', 'Nay'),
    member('R5', 'R', 'Nay'),
    ...independentExtras,
  ];
  return rollCall(rollNumber, votes);
}

// ── Tests ─────────────────────────────────────────────────────────

describe('normalizePartyLabel', () => {
  it.each([
    ['D', 'Democratic'],
    ['Dem', 'Democratic'],
    ['democrat', 'Democratic'],
    ['Democratic', 'Democratic'],
    ['R', 'Republican'],
    ['Rep', 'Republican'],
    ['republican', 'Republican'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizePartyLabel(input)).toBe(expected);
  });

  it('returns null for Independent', () => {
    expect(normalizePartyLabel('I')).toBeNull();
    expect(normalizePartyLabel('Independent')).toBeNull();
  });

  it('returns null for unknown party labels', () => {
    expect(normalizePartyLabel('Green')).toBeNull();
    expect(normalizePartyLabel('')).toBeNull();
  });
});

describe('derivePartyMajority', () => {
  it('returns Yea when most of the party voted Yea', () => {
    const votes = [
      member('D1', 'D', 'Yea'),
      member('D2', 'D', 'Yea'),
      member('D3', 'D', 'Yea'),
      member('D4', 'D', 'Yea'),
      member('D5', 'D', 'Nay'),
    ];
    expect(derivePartyMajority(votes, 'Democratic')).toEqual({
      position: 'Yea',
      partyQuorum: 5,
    });
  });

  it('returns Nay when most of the party voted Nay', () => {
    const votes = [
      member('R1', 'R', 'Nay'),
      member('R2', 'R', 'Nay'),
      member('R3', 'R', 'Nay'),
      member('R4', 'R', 'Yea'),
      member('R5', 'R', 'Nay'),
    ];
    expect(derivePartyMajority(votes, 'Republican')).toEqual({
      position: 'Nay',
      partyQuorum: 5,
    });
  });

  it('ignores Present and Not Voting when counting party members', () => {
    const votes = [
      member('D1', 'D', 'Yea'),
      member('D2', 'D', 'Yea'),
      member('D3', 'D', 'Yea'),
      member('D4', 'D', 'Present'),
      member('D5', 'D', 'Not Voting'),
      member('D6', 'D', 'Yea'),
      member('D7', 'D', 'Yea'),
    ];
    const result = derivePartyMajority(votes, 'Democratic');
    expect(result).toEqual({ position: 'Yea', partyQuorum: 5 });
  });

  it('returns null when party quorum is below the floor', () => {
    const votes = [
      member('D1', 'D', 'Yea'),
      member('D2', 'D', 'Yea'),
      member('D3', 'D', 'Yea'),
      member('D4', 'D', 'Yea'),
    ];
    expect(derivePartyMajority(votes, 'Democratic')).toBeNull();
  });

  it('returns null on a tied party vote', () => {
    const votes = [
      member('D1', 'D', 'Yea'),
      member('D2', 'D', 'Yea'),
      member('D3', 'D', 'Yea'),
      member('D4', 'D', 'Nay'),
      member('D5', 'D', 'Nay'),
      member('D6', 'D', 'Nay'),
    ];
    expect(derivePartyMajority(votes, 'Democratic')).toBeNull();
  });

  it('does not pull in members of other parties', () => {
    const votes = [
      member('D1', 'D', 'Yea'),
      member('D2', 'D', 'Yea'),
      member('D3', 'D', 'Yea'),
      member('D4', 'D', 'Yea'),
      member('D5', 'D', 'Yea'),
      // Republican Yeas should be ignored when computing Democratic majority
      member('R1', 'R', 'Yea'),
      member('R2', 'R', 'Yea'),
    ];
    expect(derivePartyMajority(votes, 'Democratic')).toEqual({
      position: 'Yea',
      partyQuorum: 5,
    });
  });
});

describe('computeChamberAlignment', () => {
  it('scores a pure party-line member as 100% aligned', () => {
    const rollCalls = [partyLineVote(1), partyLineVote(2), partyLineVote(3)];
    const result = computeChamberAlignment(rollCalls, 'Democratic');

    expect(result.get('D1')).toEqual({
      alignmentRate: 1,
      votesAnalyzed: 3,
      name: 'D1',
    });
  });

  it('scores a cross-party member below 100%', () => {
    // Across 4 party-line votes, D5 defects twice
    const rollCalls = [
      rollCall(1, [
        member('D1', 'D', 'Yea'),
        member('D2', 'D', 'Yea'),
        member('D3', 'D', 'Yea'),
        member('D4', 'D', 'Yea'),
        member('D5', 'D', 'Nay'), // defection
        member('R1', 'R', 'Nay'),
        member('R2', 'R', 'Nay'),
        member('R3', 'R', 'Nay'),
        member('R4', 'R', 'Nay'),
        member('R5', 'R', 'Nay'),
      ]),
      partyLineVote(2),
      rollCall(3, [
        member('D1', 'D', 'Yea'),
        member('D2', 'D', 'Yea'),
        member('D3', 'D', 'Yea'),
        member('D4', 'D', 'Yea'),
        member('D5', 'D', 'Nay'), // defection
        member('R1', 'R', 'Nay'),
        member('R2', 'R', 'Nay'),
        member('R3', 'R', 'Nay'),
        member('R4', 'R', 'Nay'),
        member('R5', 'R', 'Nay'),
      ]),
      partyLineVote(4),
    ];

    const result = computeChamberAlignment(rollCalls, 'Democratic');

    expect(result.get('D5')!.alignmentRate).toBeCloseTo(0.5, 5);
    expect(result.get('D5')!.votesAnalyzed).toBe(4);
    // Non-defectors should still be 100%
    expect(result.get('D1')!.alignmentRate).toBe(1);
  });

  it('excludes Present / Not Voting from the member denominator', () => {
    const rollCalls = [
      partyLineVote(1),
      rollCall(2, [
        member('D1', 'D', 'Present'),
        member('D2', 'D', 'Yea'),
        member('D3', 'D', 'Yea'),
        member('D4', 'D', 'Yea'),
        member('D5', 'D', 'Yea'),
        member('D6', 'D', 'Yea'),
        member('R1', 'R', 'Nay'),
        member('R2', 'R', 'Nay'),
        member('R3', 'R', 'Nay'),
        member('R4', 'R', 'Nay'),
        member('R5', 'R', 'Nay'),
      ]),
      partyLineVote(3),
    ];
    const result = computeChamberAlignment(rollCalls, 'Democratic');

    // D1 was Present on one vote, so it has only 2 qualifying votes (still aligned)
    expect(result.get('D1')!.votesAnalyzed).toBe(2);
    expect(result.get('D1')!.alignmentRate).toBe(1);
  });

  it('skips roll calls where the target party lacks a quorum', () => {
    const rollCalls = [
      // Only 4 Dems voting Yea/Nay — below the MIN_PARTY_QUORUM floor
      rollCall(1, [
        member('D1', 'D', 'Yea'),
        member('D2', 'D', 'Yea'),
        member('D3', 'D', 'Yea'),
        member('D4', 'D', 'Yea'),
        member('R1', 'R', 'Nay'),
        member('R2', 'R', 'Nay'),
        member('R3', 'R', 'Nay'),
        member('R4', 'R', 'Nay'),
        member('R5', 'R', 'Nay'),
      ]),
      partyLineVote(2),
    ];
    const result = computeChamberAlignment(rollCalls, 'Democratic');

    // Only roll #2 should count for Democrats
    expect(result.get('D1')!.votesAnalyzed).toBe(1);
  });

  it('returns an empty map when nothing meets the quorum', () => {
    const rollCalls = [
      rollCall(1, [
        member('D1', 'D', 'Yea'),
        member('D2', 'D', 'Yea'),
        member('R1', 'R', 'Nay'),
        member('R2', 'R', 'Nay'),
      ]),
    ];
    expect(computeChamberAlignment(rollCalls, 'Democratic').size).toBe(0);
  });
});

describe('analyzePartyLineAlignment', () => {
  beforeEach(() => {
    mockRedisGet.mockReset().mockResolvedValue(null);
    mockRedisSet.mockReset().mockResolvedValue(undefined);
    mockGetEnhancedRepresentative.mockReset();
    mockGetHouseChamberRollCalls.mockReset();
    mockGetSenateChamberRollCalls.mockReset();
  });

  function buildChamberFixture(targetId: string, alignedCount: number, defectCount: number) {
    const rollCalls: StandardizedVote[] = [];

    // Target defects on some votes, peers never defect.
    for (let i = 0; i < alignedCount; i++) {
      rollCalls.push(
        rollCall(i + 1, [
          member(targetId, 'D', 'Yea'),
          member('D2', 'D', 'Yea'),
          member('D3', 'D', 'Yea'),
          member('D4', 'D', 'Yea'),
          member('D5', 'D', 'Yea'),
          member('D6', 'D', 'Yea'),
          member('R1', 'R', 'Nay'),
          member('R2', 'R', 'Nay'),
          member('R3', 'R', 'Nay'),
          member('R4', 'R', 'Nay'),
          member('R5', 'R', 'Nay'),
        ])
      );
    }
    for (let i = 0; i < defectCount; i++) {
      rollCalls.push(
        rollCall(alignedCount + i + 1, [
          member(targetId, 'D', 'Nay'), // defection
          member('D2', 'D', 'Yea'),
          member('D3', 'D', 'Yea'),
          member('D4', 'D', 'Yea'),
          member('D5', 'D', 'Yea'),
          member('D6', 'D', 'Yea'),
          member('R1', 'R', 'Nay'),
          member('R2', 'R', 'Nay'),
          member('R3', 'R', 'Nay'),
          member('R4', 'R', 'Nay'),
          member('R5', 'R', 'Nay'),
        ])
      );
    }
    return rollCalls;
  }

  it('returns cached insight without hitting data services', async () => {
    const cached = { bioguideId: 'X000001', alignmentRate: 0.75 };
    mockRedisGet.mockResolvedValueOnce(cached);

    const result = await analyzePartyLineAlignment('X000001');

    expect(result).toBe(cached);
    expect(mockGetEnhancedRepresentative).not.toHaveBeenCalled();
    expect(mockGetHouseChamberRollCalls).not.toHaveBeenCalled();
  });

  it('returns null when rep is not Democratic or Republican', async () => {
    mockGetEnhancedRepresentative.mockResolvedValueOnce({
      name: 'I Rep',
      party: 'Independent',
      state: 'VT',
      chamber: 'Senate',
    });

    const result = await analyzePartyLineAlignment('I000001');
    expect(result).toBeNull();
    expect(mockGetHouseChamberRollCalls).not.toHaveBeenCalled();
    expect(mockGetSenateChamberRollCalls).not.toHaveBeenCalled();
  });

  it('returns null when no roll calls are available', async () => {
    mockGetEnhancedRepresentative.mockResolvedValueOnce({
      name: 'D Rep',
      party: 'Democratic',
      state: 'NY',
      chamber: 'House',
    });
    mockGetHouseChamberRollCalls.mockResolvedValueOnce([]);

    const result = await analyzePartyLineAlignment('D000001');
    expect(result).toBeNull();
  });

  it('returns null when the rep has fewer than MIN_VOTES_FOR_ALIGNMENT qualifying votes', async () => {
    mockGetEnhancedRepresentative.mockResolvedValueOnce({
      name: 'D Rep',
      party: 'Democratic',
      state: 'NY',
      chamber: 'House',
    });
    // Only 5 aligned votes — below floor of 10
    mockGetHouseChamberRollCalls.mockResolvedValueOnce(buildChamberFixture('D000001', 5, 0));

    const result = await analyzePartyLineAlignment('D000001');
    expect(result).toBeNull();
  });

  it('computes a real alignment rate for a qualifying member', async () => {
    mockGetEnhancedRepresentative.mockResolvedValueOnce({
      name: 'D Rep',
      party: 'Democratic',
      state: 'NY',
      chamber: 'House',
    });
    // 15 aligned + 5 defections = 20 qualifying votes, 75% alignment
    mockGetHouseChamberRollCalls.mockResolvedValueOnce(buildChamberFixture('D000001', 15, 5));

    const result = await analyzePartyLineAlignment('D000001');

    expect(result).not.toBeNull();
    expect(result!.party).toBe('Democratic');
    expect(result!.chamber).toBe('House');
    expect(result!.votesAnalyzed).toBe(20);
    expect(result!.alignmentRate).toBeCloseTo(0.75, 5);
    expect(result!.votesWithParty).toBe(15);
    expect(result!.votesAgainstParty).toBe(5);
  });

  it('computes peer averages from actual peer data, not hardcoded constants', async () => {
    mockGetEnhancedRepresentative.mockResolvedValueOnce({
      name: 'D Rep',
      party: 'Democratic',
      state: 'NY',
      chamber: 'House',
    });
    // Peers are 100% aligned in our fixture, target is 80%
    mockGetHouseChamberRollCalls.mockResolvedValueOnce(buildChamberFixture('D000001', 16, 4));

    const result = await analyzePartyLineAlignment('D000001');

    expect(result).not.toBeNull();
    expect(result!.alignmentRate).toBeCloseTo(0.8, 5);
    // Peers (D2..D6) all vote party line every time in the fixture
    expect(result!.peerAverageAlignment).toBeCloseTo(1, 5);
    expect(result!.peerCount).toBe(5);
    // The hardcoded constants from the old broken service were 88/90/85/87 —
    // this test proves we no longer return those magic numbers.
    expect(result!.peerAverageAlignment).not.toBe(0.88);
    expect(result!.peerAverageAlignment).not.toBe(0.9);
  });

  it('writes the computed insight to cache', async () => {
    mockGetEnhancedRepresentative.mockResolvedValueOnce({
      name: 'D Rep',
      party: 'Democratic',
      state: 'NY',
      chamber: 'House',
    });
    mockGetHouseChamberRollCalls.mockResolvedValueOnce(buildChamberFixture('D000001', 15, 0));

    await analyzePartyLineAlignment('D000001');

    expect(mockRedisSet).toHaveBeenCalledTimes(1);
    expect(mockRedisSet.mock.calls[0][0]).toBe('insight:party_line:D000001');
  });

  it('routes Senate representatives to the Senate data path', async () => {
    mockGetEnhancedRepresentative.mockResolvedValueOnce({
      name: 'Senator',
      party: 'Republican',
      state: 'TX',
      chamber: 'Senate',
    });
    const senateRolls = buildChamberFixture('S000001', 12, 0).map(r => ({
      ...r,
      chamber: 'Senate' as const,
      memberVotes: r.memberVotes.map(mv =>
        mv.bioguideId.startsWith('R') || mv.bioguideId === 'S000001' ? { ...mv, party: 'R' } : mv
      ),
    }));
    // Swap roles: target is a Republican, everyone else republican too so we get peers
    const republicanizedRolls = senateRolls.map(r =>
      rollCall(
        r.rollCallNumber,
        [
          member('S000001', 'R', 'Yea'),
          member('R2', 'R', 'Yea'),
          member('R3', 'R', 'Yea'),
          member('R4', 'R', 'Yea'),
          member('R5', 'R', 'Yea'),
          member('R6', 'R', 'Yea'),
          member('D1', 'D', 'Nay'),
          member('D2', 'D', 'Nay'),
          member('D3', 'D', 'Nay'),
          member('D4', 'D', 'Nay'),
          member('D5', 'D', 'Nay'),
        ],
        r.date
      )
    );
    mockGetSenateChamberRollCalls.mockResolvedValueOnce(republicanizedRolls);

    const result = await analyzePartyLineAlignment('S000001');

    expect(mockGetSenateChamberRollCalls).toHaveBeenCalledTimes(1);
    expect(mockGetHouseChamberRollCalls).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.chamber).toBe('Senate');
    expect(result!.party).toBe('Republican');
    expect(result!.alignmentRate).toBe(1);
  });
});

describe('MIN_VOTES_FOR_ALIGNMENT', () => {
  it('is exposed as a public constant so callers can surface the threshold', () => {
    expect(MIN_VOTES_FOR_ALIGNMENT).toBeGreaterThanOrEqual(10);
  });
});
