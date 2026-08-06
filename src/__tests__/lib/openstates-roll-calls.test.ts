/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OpenStates has no vote-by-id endpoint — `/vote_events/{id}`, `/votes/{id}`
 * and the `/vote_events` list all 404, including for an `ocd-vote/...` id taken
 * straight out of a bill payload. A roll call is reachable only through its
 * bill, and every member's position rides along on that same response.
 */

import { openStatesAPI } from '@/lib/openstates-api';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const rollCall = {
  id: 'ocd-vote/roll-1',
  identifier: 'HV-1',
  motion_text: 'Passage of the bill',
  motion_classification: ['passage'],
  start_date: '2025-03-04',
  result: 'pass',
  // The Senate voted on a House bill — the vote's own chamber, not the bill's.
  organization: { id: 'org-upper', name: 'Senate', classification: 'upper' },
  counts: [
    { option: 'yes', value: 2 },
    { option: 'no', value: 1 },
  ],
  votes: [
    {
      id: 'v1',
      option: 'yes',
      voter_name: 'Alexander',
      voter: { id: 'ocd-person/greg', name: 'Greg Alexander', party: 'Republican' },
    },
    {
      id: 'v2',
      option: 'no',
      voter_name: 'Unmatched Member',
      voter: null,
    },
  ],
};

const billFixture = {
  id: 'ocd-bill/roll-call-test',
  identifier: 'HB 5697',
  title: 'A bill with a roll call',
  session: '2025-2026',
  from_organization: { id: 'org-lower', name: 'House', classification: 'lower' },
  votes: [rollCall],
};

function mockFetch(body: unknown, ok = true) {
  const fn = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? 'OK' : 'Not Found',
    text: async () => JSON.stringify(body),
    json: async () => body,
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('state roll calls come off the bill', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps every member position when transforming a bill', async () => {
    mockFetch({ ...billFixture, id: 'ocd-bill/transform-path' });

    const bill = await openStatesAPI.getBillById('ocd-bill/transform-path');
    const vote = bill?.votes?.[0];

    expect(vote?.votes).toHaveLength(2);
    // The resolved person's full name beats the surname the chamber printed.
    expect(vote?.votes?.[0]).toEqual({
      option: 'yes',
      voter_name: 'Greg Alexander',
      voter_id: 'ocd-person/greg',
    });
    // A member OpenStates could not resolve keeps the printed name and gets no
    // id, so the UI can name them without inventing a profile link.
    expect(vote?.votes?.[1]).toEqual({
      option: 'no',
      voter_name: 'Unmatched Member',
      voter_id: null,
    });
  });

  it('labels the roll call with the chamber that voted, not the bill origin', async () => {
    mockFetch({ ...billFixture, id: 'ocd-bill/chamber-path' });

    const bill = await openStatesAPI.getBillById('ocd-bill/chamber-path');

    // A House bill still gets a Senate floor vote.
    expect(bill?.chamber).toBe('lower');
    expect(bill?.votes?.[0]?.chamber).toBe('upper');
  });

  it('fetches a single vote through its bill rather than a vote endpoint', async () => {
    const fetchMock = mockFetch({ ...billFixture, id: 'ocd-bill/lookup-path' });

    const vote = await openStatesAPI.getBillVoteById('ocd-bill/lookup-path', 'ocd-vote/roll-1');

    const requested = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requested.pathname).toContain('/bills/');
    expect(requested.pathname).not.toContain('vote_events');
    expect(requested.searchParams.getAll('include')).toContain('votes');

    expect(vote?.motion_text).toBe('Passage of the bill');
    expect(vote?.votes).toHaveLength(2);
    expect(vote?.organization.classification).toBe('upper');
    expect(vote?.bill?.identifier).toBe('HB 5697');
  });

  it('returns null when the bill holds no vote with that id', async () => {
    mockFetch({ ...billFixture, id: 'ocd-bill/missing-vote-path' });

    const vote = await openStatesAPI.getBillVoteById(
      'ocd-bill/missing-vote-path',
      'ocd-vote/not-on-this-bill'
    );

    expect(vote).toBeNull();
  });
});
