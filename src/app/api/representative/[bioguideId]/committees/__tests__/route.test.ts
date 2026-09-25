/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * @jest-environment node
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockMemberships = jest.fn();
const mockGetRep = jest.fn();
jest.mock('@/features/representatives/services/congress.service', () => ({
  fetchCommitteeMemberships: () => mockMemberships(),
  getEnhancedRepresentative: (id: string) => mockGetRep(id),
}));

import { NextRequest } from 'next/server';
import { GET } from '../route';

const ROSTER = [{ bioguide: 'C001035', committees: [{ thomas_id: 'SSAP' }] }];
const APPROPRIATIONS = {
  name: 'Senate Committee on Appropriations',
  role: 'Chair',
  thomas_id: 'SSAP',
  id: 'SSAP',
};

async function call(id: string) {
  const res = await GET(
    new NextRequest(`https://civdotiq.org/api/representative/${id}/committees`),
    { params: Promise.resolve({ bioguideId: id }) }
  );
  return { status: res.status, body: await res.json() };
}

describe('GET /api/representative/[id]/committees', () => {
  it("returns the member's real assignments", async () => {
    mockMemberships.mockResolvedValue(ROSTER);
    mockGetRep.mockResolvedValue({ bioguideId: 'C001035', committees: [APPROPRIATIONS] });
    const { status, body } = await call('C001035');
    expect(status).toBe(200);
    expect(body.committees).toEqual([APPROPRIATIONS]);
    expect(body.dataQuality).toBe('complete');
  });

  it('reports a member with no assignments as empty, not unavailable', async () => {
    mockMemberships.mockResolvedValue(ROSTER);
    mockGetRep.mockResolvedValue({ bioguideId: 'P000197', committees: [] });
    const { status, body } = await call('P000197');
    expect(status).toBe(200);
    expect(body.dataQuality).toBe('empty');
  });

  it('reports an empty roster as unavailable (503), never as no committees', async () => {
    mockMemberships.mockResolvedValue([]);
    mockGetRep.mockResolvedValue({ bioguideId: 'C001035', committees: [] });
    const { status, body } = await call('C001035');
    expect(status).toBe(503);
    expect(body.dataQuality).toBe('unavailable');
  });

  it('404s an unknown member', async () => {
    mockMemberships.mockResolvedValue(ROSTER);
    mockGetRep.mockResolvedValue(null);
    const { status } = await call('X999999');
    expect(status).toBe(404);
  });
});
