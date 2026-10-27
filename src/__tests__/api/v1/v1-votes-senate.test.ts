/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Senate votes in the public v1 API come from the stored copy of senate.gov's
 * roll-call XML (senate.gov blocks Vercel), never from a live senate.gov fetch.
 * The old /api/senate-votes proxy redirects there.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { UnifiedVoteDetail, VoteLookup } from '@/lib/services/vote.service';

const lookupVote = jest.fn<Promise<VoteLookup>, [string]>();

jest.mock('@/lib/services/vote.service', () => ({
  ...jest.requireActual('@/lib/services/vote.service'),
  lookupVote: (voteId: string) => lookupVote(voteId),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// The shared next/server mock (jest.setup.js) has no redirect().
Object.assign(NextResponse, {
  redirect: (url: URL, status: number) => ({
    status,
    headers: new Map([['location', url.toString()]]),
  }),
});

import { GET } from '@/app/api/v1/votes/[voteId]/route';
import { GET as legacyGET } from '@/app/api/senate-votes/[voteNumber]/route';

const vote: UnifiedVoteDetail = {
  voteId: '00253',
  congress: '119',
  session: '2',
  rollNumber: 253,
  date: '2026-09-30T21:29:00.000Z',
  title: 'On the Cloture Motion',
  question: 'On the Cloture Motion',
  description: 'On the Cloture Motion',
  result: 'Cloture Motion Agreed to',
  chamber: 'Senate',
  yeas: 1,
  nays: 1,
  present: 0,
  absent: 1,
  totalVotes: 3,
  members: [
    {
      id: 'A000001',
      bioguideId: 'A000001',
      firstName: 'Ann',
      lastName: 'Able',
      fullName: 'Ann Able',
      state: 'MI',
      party: 'D',
      position: 'Yea',
    },
    {
      id: 'B000002',
      bioguideId: 'B000002',
      firstName: 'Bob',
      lastName: 'Baker',
      fullName: 'Bob Baker',
      state: 'OH',
      party: 'R',
      position: 'Nay',
    },
    {
      id: 'S999',
      firstName: '',
      lastName: '',
      fullName: 'Senator (LIS ID S999)',
      state: '',
      party: 'I',
      position: 'Not Voting',
    },
  ],
  metadata: { source: 'senate-corpus-mirror', confidence: 'high', processingDate: '' },
};

function call(voteId: string) {
  return GET(new NextRequest(`http://localhost:3000/api/v1/votes/${voteId}`), {
    params: Promise.resolve({ voteId }),
  });
}

describe('GET /api/v1/votes/senate-*', () => {
  const originalFetch = global.fetch;
  const fetchSpy = jest.fn();

  beforeEach(() => {
    lookupVote.mockReset();
    fetchSpy.mockReset();
    global.fetch = fetchSpy as unknown as typeof fetch;
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('serves a stored Senate vote without calling senate.gov', async () => {
    lookupVote.mockResolvedValue({ status: 'found', vote });
    const res = await call('senate-119-253');
    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(lookupVote).toHaveBeenCalledWith('senate-119-253');

    const body = await res.json();
    expect(body.meta.source).toBe('senate.gov');
    expect(body.data).toMatchObject({
      voteId: 'senate-119-253',
      chamber: 'Senate',
      congress: 119,
      session: 2,
      rollNumber: 253,
      result: 'Cloture Motion Agreed to',
      totals: { yea: 1, nay: 1, present: 0, notVoting: 1 },
      url: 'https://civdotiq.org/vote/senate-119-2-253',
    });
    expect(body.data.positions[0]).toEqual({
      name: 'Ann Able',
      party: 'D',
      state: 'MI',
      vote: 'Yea',
      bioguideId: 'A000001',
    });
    // An unmapped senator is never given a fake bioguide ID.
    expect(body.data.positions[2].bioguideId).toBeUndefined();
  });

  it('accepts a vote ID with a session', async () => {
    lookupVote.mockResolvedValue({ status: 'found', vote });
    const res = await call('senate-119-2-253');
    expect(res.status).toBe(200);
    expect(lookupVote).toHaveBeenCalledWith('senate-119-2-253');
  });

  it('is 404 for a vote that does not exist and 502 when votes cannot be loaded', async () => {
    lookupVote.mockResolvedValueOnce({ status: 'not_found' });
    expect((await call('senate-119-2-9999')).status).toBe(404);
    lookupVote.mockResolvedValueOnce({ status: 'unavailable' });
    expect((await call('senate-119-2-257')).status).toBe(502);
  });

  it('is 404 for a Congress outside the served range, without a lookup', async () => {
    expect((await call('senate-117-42')).status).toBe(404);
    expect(lookupVote).not.toHaveBeenCalled();
  });
});

describe('GET /api/senate-votes/[voteNumber]', () => {
  function legacy(path: string, voteNumber: string) {
    return legacyGET(new NextRequest(`http://localhost:3000/api/senate-votes/${path}`), {
      params: Promise.resolve({ voteNumber }),
    });
  }

  it('redirects a single vote to the v1 API', async () => {
    const res = await legacy('253?congress=119&session=2', '253');
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('http://localhost:3000/api/v1/votes/senate-119-2-253');
  });

  it('leaves the session to the v1 API when none is given', async () => {
    const res = await legacy('00042?congress=119', '00042');
    expect(res.headers.get('location')).toBe('http://localhost:3000/api/v1/votes/senate-119-42');
  });

  it('rejects bad input and retired vote lists', async () => {
    expect((await legacy('abc', 'abc')).status).toBe(400);
    expect((await legacy('1?session=3', '1')).status).toBe(400);
    const gone = await legacy('list', 'list');
    expect(gone.status).toBe(410);
    expect((await gone.json()).replacement).toBe(
      '/api/v1/votes/senate-{congress}-{session}-{rollNumber}'
    );
  });
});
