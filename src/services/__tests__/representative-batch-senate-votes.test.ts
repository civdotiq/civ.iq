/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The profile loads votes through the batch endpoint, not /votes. Before the
 * shared mapping, this path dropped #176's amendment/nomination fields, so
 * every amendment row fell back to the bare bill title.
 */

const mockSenateVotes = jest.fn();

jest.mock('@/services/cache', () => ({
  govCache: { get: async () => null, set: jest.fn() },
}));
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: async () => ({ chamber: 'Senate', name: 'Bernard Sanders' }),
}));
jest.mock('@/features/representatives/services/batch-voting-service', () => ({
  batchVotingService: {
    getSenateMemberVotes: (...a: unknown[]) => mockSenateVotes(...a),
    getHouseMemberVotes: jest.fn(),
  },
}));
jest.mock('@/services/congress/optimized-congress.service', () => ({}));
jest.mock('@/services/congress/bill-response-utils', () => ({ createLegacyResponse: jest.fn() }));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { executeBatchRequest } from '@/services/batch/representative-batch.service';

describe('batch votes endpoint (Senate)', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    mockSenateVotes.mockReset();
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ bill: { title: 'Protect College Sports Act of 2026' } }),
    })) as unknown as typeof fetch;
  });
  afterAll(() => {
    global.fetch = realFetch;
  });

  it('carries amendment, nomination, majority requirement and display title', async () => {
    mockSenateVotes.mockResolvedValue([
      {
        voteId: 'senate-119-2-249',
        date: '2026-09-28T21:21:00.000Z',
        question: 'On the Amendment S.Amdt. 6835',
        position: 'Yea',
        result: 'Rejected',
        rollCallNumber: 249,
        bill: { congress: 119, type: 'S', number: '4668', title: 'A bill to protect…' },
        amendment: { number: 'S.Amdt. 6835', sponsorLabel: 'Booker' },
        majorityRequirement: '1/2',
      },
      {
        voteId: 'senate-119-2-241',
        date: '2026-09-23T14:16:00.000Z',
        question: 'On the Nomination PN999-1',
        position: 'Nay',
        result: 'Confirmed',
        rollCallNumber: 241,
        nomination: { number: 'PN999-1', description: 'Angela Veronica Colmenero, of Texas…' },
      },
    ]);

    const res = await executeBatchRequest({
      bioguideId: 'S000033',
      endpoints: ['votes'],
      options: { votes: { limit: 25 } },
    });
    const votes = (res.data.votes as { votes: Array<Record<string, unknown>> }).votes;

    expect(votes[0]).toMatchObject({
      amendment: { number: 'S.Amdt. 6835', sponsorLabel: 'Booker' },
      majorityRequirement: '1/2',
      bill: { number: '4668', displayTitle: 'Protect College Sports Act of 2026' },
    });
    expect(votes[1]).toMatchObject({
      nomination: { number: 'PN999-1' },
      bill: { type: 'Nomination', title: 'Angela Veronica Colmenero, of Texas…' },
    });
    // current session, not a hard-coded Session 1
    const session = new Date().getFullYear() % 2 === 1 ? 1 : 2;
    expect(mockSenateVotes).toHaveBeenCalledWith('S000033', expect.any(Number), session, 25);
  });
});
