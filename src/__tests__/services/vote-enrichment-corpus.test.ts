/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vote enrichment now computes from the roll-call corpus rather than fanning
 * out to the bills API. Party alignment is the member against their own
 * party's split with their vote removed; key votes come from floor roll calls;
 * no corpus means an empty result, never an invented one.
 */

import { VoteEnrichmentService } from '@/services/enrichment/vote-enrichment.service';
import { getMemberVotes } from '@/lib/data-sources/openstates-votes/load-votes';
import type {
  CorpusMemberVote,
  CorpusRollCall,
} from '@/lib/data-sources/openstates-votes/votes-corpus';

jest.mock('@/lib/data-sources/openstates-votes/load-votes', () => ({
  getMemberVotes: jest.fn(),
  getVotesCorpusStatus: jest.fn(async () => ({
    generatedAt: '2026-10-08T00:00:00Z',
    staleAfter: '2026-12-17',
    baseUrl: '',
    jurisdictions: { VT: { generatedAt: '2026-10-08T00:00:00Z' } },
  })),
}));

jest.mock('@/services/cache', () => ({
  govCache: { get: jest.fn(async () => null), set: jest.fn(async () => true) },
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

function rollCall(overrides: Partial<CorpusRollCall> & { id: string }): CorpusRollCall {
  return {
    date: '2026-01-01',
    result: 'pass',
    chamber: 'lower',
    billId: 'ocd-bill/b',
    billIdentifier: 'H 1',
    billTitle: 'An act relating to public schools',
    motion: 'Shall the bill pass?',
    yes: 60,
    no: 40,
    other: 0,
    floor: true,
    partyTally: new Map([
      ['Democratic', { yes: 50, no: 5 }],
      ['Republican', { yes: 10, no: 35 }],
    ]),
    session: { identifier: '2025-2026', name: '2025-2026' },
    ...overrides,
  };
}

const mockedVotes = getMemberVotes as jest.MockedFunction<typeof getMemberVotes>;

describe('VoteEnrichmentService (corpus)', () => {
  beforeEach(() => mockedVotes.mockReset());

  it('scores party alignment against the party split minus the member’s own vote', async () => {
    const votes: CorpusMemberVote[] = [
      // With party: Democrats 50-5 → member yes
      { rollCall: rollCall({ id: 'ocd-vote/1', date: '2026-03-01' }), option: 'yes' },
      // Against party: Democrats 50-5 → member no
      { rollCall: rollCall({ id: 'ocd-vote/2', date: '2026-02-01' }), option: 'no' },
      // Tie once the member's own yes is removed (3-2 → 2-2): no party data
      {
        rollCall: rollCall({
          id: 'ocd-vote/3',
          date: '2026-01-15',
          partyTally: new Map([['Democratic', { yes: 3, no: 2 }]]),
        }),
        option: 'yes',
      },
      // Not a yes/no: ignored for alignment, counted as absent
      { rollCall: rollCall({ id: 'ocd-vote/4', date: '2026-01-01' }), option: 'absent' },
    ];
    mockedVotes.mockResolvedValue(votes);

    const result = await VoteEnrichmentService.enrichVotes('VT', 'ocd-person/x', 'Democratic');

    expect(result.totalVotesAnalyzed).toBe(4);
    expect(result.floorVotesAnalyzed).toBe(4);
    expect(result.partyBreakdown).toEqual({
      withParty: 1,
      againstParty: 1,
      total: 2,
      alignmentPercentage: 50,
      noPartyData: 1,
    });
    expect(result.attendance).toEqual({ totalVotes: 4, present: 3, absent: 1, attendanceRate: 75 });
    expect(result.dataAsOf).toBe('2026-10-08T00:00:00Z');
    expect(mockedVotes).toHaveBeenCalledWith('VT', 'ocd-person/x');
  });

  it('draws key votes from floor roll calls only and keeps them newest first', async () => {
    mockedVotes.mockResolvedValue([
      // Committee vote against the room: not a key vote
      {
        rollCall: rollCall({ id: 'ocd-vote/c', date: '2026-04-01', floor: false, yes: 5, no: 1 }),
        option: 'no',
      },
      // Floor, close margin
      {
        rollCall: rollCall({ id: 'ocd-vote/close', date: '2026-03-01', yes: 51, no: 49 }),
        option: 'yes',
      },
      // Floor, against chamber majority
      { rollCall: rollCall({ id: 'ocd-vote/against', date: '2026-02-01' }), option: 'no' },
      // Floor, with the majority and lopsided: not key
      { rollCall: rollCall({ id: 'ocd-vote/plain', date: '2026-01-01' }), option: 'yes' },
    ]);

    const result = await VoteEnrichmentService.enrichVotes('VT', 'ocd-person/x', 'Democratic');

    expect(result.keyVotes.map(k => k.voteId)).toEqual(['ocd-vote/close', 'ocd-vote/against']);
    expect(result.keyVotes[0]).toMatchObject({
      isCloseVote: true,
      votedAgainstMajority: false,
      marginPercent: 2,
      yesCount: 51,
      noCount: 49,
      legislatorPosition: 'yes',
      result: 'passed',
    });
    expect(result.keyVotes[1]).toMatchObject({ isCloseVote: false, votedAgainstMajority: true });
  });

  it('answers an empty result when the state has no corpus', async () => {
    mockedVotes.mockResolvedValue(null);
    const result = await VoteEnrichmentService.enrichVotes('ZZ', 'ocd-person/x', 'Democratic');
    expect(result.totalVotesAnalyzed).toBe(0);
    expect(result.keyVotes).toEqual([]);
    expect(result.dataAsOf).toBeUndefined();
  });
});
