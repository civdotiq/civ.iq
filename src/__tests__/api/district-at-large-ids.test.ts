/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The "-AL" district ID form (WY-AL, DC-AL) is what the geocoder and district
 * links produce. These routes used to 400 on it or return nothing.
 */

import { GET as getBoundary } from '@/app/api/district-boundaries/[districtId]/route';
import { GET as getNeighbors } from '@/app/api/districts/[districtId]/neighbors/route';
import { getCongressionalDistrictBoundary } from '@/lib/services/tigerweb-boundary.service';
import { createMockRequest } from '../utils/test-helpers';

jest.mock('@/lib/services/tigerweb-boundary.service', () => ({
  getCongressionalDistrictBoundary: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

function makeParams(districtId: string): { params: Promise<{ districtId: string }> } {
  return { params: Promise.resolve({ districtId }) };
}

describe('district-boundaries at-large IDs', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['WY-AL', '5600'],
    ['WY-00', '5600'],
    ['DC-AL', '1198'],
    ['DC-00', '1198'],
    ['MI-05', '2605'],
  ])('resolves %s to TIGER GEOID %s', async (districtId, geoid) => {
    const res = await getBoundary(
      createMockRequest(`http://localhost:3000/api/district-boundaries/${districtId}`),
      makeParams(districtId)
    );

    expect(res.status).not.toBe(400);
    expect(getCongressionalDistrictBoundary).toHaveBeenCalledWith(geoid, 0.001);
  });
});

describe('district neighbors at-large IDs', () => {
  async function neighborsOf(districtId: string) {
    const res = await getNeighbors(
      createMockRequest(`http://localhost:3000/api/districts/${districtId}/neighbors`),
      makeParams(districtId)
    );
    return (await res.json()) as { district: string; neighbors: Array<{ id: string }> };
  }

  it.each(['WY-AL', 'WY-00', 'wy-al'])('finds neighbors for %s', async districtId => {
    const body = await neighborsOf(districtId);
    expect(body.district).toBe('WY-AL');
    expect(body.neighbors.length).toBeGreaterThan(0);
  });

  it.each(['DC-AL', 'DC-00'])('finds neighbors for delegate seat %s', async districtId => {
    const body = await neighborsOf(districtId);
    expect(body.district).toBe('DC-AL');
    expect(body.neighbors.map(n => n.id)).toContain('MD-04');
  });

  it('pads unpadded IDs and links at-large neighbors by their -AL form', async () => {
    const nd = await neighborsOf('ND-AL');
    expect(nd.neighbors.map(n => n.id)).toContain('SD-AL');

    const mi = await neighborsOf('MI-5');
    expect(mi.district).toBe('MI-05');
    expect(mi.neighbors.length).toBeGreaterThan(0);
  });
});
