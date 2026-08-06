/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/city/[cityId]/district/route';
import { createMockRequest } from '../../utils/test-helpers';
import { geocodeAddress } from '@/lib/census-geocoder';
import { lookupDetroitCouncilDistrict } from '@/lib/local-government/detroit-district-lookup';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/census-geocoder', () => ({
  ...jest.requireActual('@/lib/census-geocoder'),
  geocodeAddress: jest.fn(),
}));

jest.mock('@/lib/local-government/detroit-district-lookup', () => ({
  ...jest.requireActual('@/lib/local-government/detroit-district-lookup'),
  lookupDetroitCouncilDistrict: jest.fn(),
}));

const mockGeocode = geocodeAddress as jest.MockedFunction<typeof geocodeAddress>;
const mockLookup = lookupDetroitCouncilDistrict as jest.MockedFunction<
  typeof lookupDetroitCouncilDistrict
>;

const WOODWARD_MATCH = [
  {
    matchedAddress: '2 WOODWARD AVE, DETROIT, MI, 48226',
    coordinates: { x: -83.0445, y: 42.3289 },
    geographies: {},
    addressComponents: {},
  },
];

function detroitRequest(address?: string) {
  const url = new URL('http://localhost:3000/api/city/detroit/district');
  if (address !== undefined) url.searchParams.set('address', address);
  return createMockRequest(url.toString());
}

describe('/api/city/[cityId]/district', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves an address to a district and its three members', async () => {
    mockGeocode.mockResolvedValue(WOODWARD_MATCH as never);
    mockLookup.mockResolvedValue({ ok: true, district: 6 });

    const response = await GET(detroitRequest('2 Woodward Ave, Detroit, MI 48226'), {
      params: Promise.resolve({ cityId: 'detroit' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.district).toEqual({ number: 6, name: 'District 6' });
    expect(data.members).toHaveLength(3);
    expect(data.members[0].seat).toBe('District 6');
    expect(data.members.filter((m: { seat: string }) => m.seat === 'At-Large')).toHaveLength(2);
    expect(data.metadata.boundariesEffective).toBe('2026-01-01');
  });

  it('rejects a bare ZIP code with guidance', async () => {
    const response = await GET(detroitRequest('48226'), {
      params: Promise.resolve({ cityId: 'detroit' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('full street address');
    expect(mockGeocode).not.toHaveBeenCalled();
  });

  it('requires an address parameter', async () => {
    const response = await GET(detroitRequest(), {
      params: Promise.resolve({ cityId: 'detroit' }),
    });
    expect(response.status).toBe(400);
  });

  it('returns 404 for an address outside Detroit, not a wrong district', async () => {
    mockGeocode.mockResolvedValue(WOODWARD_MATCH as never);
    mockLookup.mockResolvedValue({ ok: true, district: null });

    const response = await GET(detroitRequest('301 E Huron St, Ann Arbor, MI 48104'), {
      params: Promise.resolve({ cityId: 'detroit' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('outside Detroit');
    expect(data.members).toEqual([]);
  });

  it('propagates geocoder no-match as 404 and upstream failure as 502', async () => {
    mockGeocode.mockResolvedValue({ error: 'No matching address found', code: 'NO_MATCH' });
    let response = await GET(detroitRequest('nonsense input'), {
      params: Promise.resolve({ cityId: 'detroit' }),
    });
    expect(response.status).toBe(404);

    mockGeocode.mockResolvedValue(WOODWARD_MATCH as never);
    mockLookup.mockResolvedValue({ ok: false, error: 'Detroit district layer timed out' });
    response = await GET(detroitRequest('2 Woodward Ave, Detroit, MI 48226'), {
      params: Promise.resolve({ cityId: 'detroit' }),
    });
    expect(response.status).toBe(502);
  });

  it('returns 501 for supported cities without district lookup and 400 for unknown cities', async () => {
    let response = await GET(
      createMockRequest('http://localhost:3000/api/city/seattle/district?address=x'),
      { params: Promise.resolve({ cityId: 'seattle' }) }
    );
    expect(response.status).toBe(501);

    response = await GET(
      createMockRequest('http://localhost:3000/api/city/gotham/district?address=x'),
      { params: Promise.resolve({ cityId: 'gotham' }) }
    );
    expect(response.status).toBe(400);
  });

  it('surfaces a roster/layer district mismatch as unavailable instead of partial data', async () => {
    mockGeocode.mockResolvedValue(WOODWARD_MATCH as never);
    mockLookup.mockResolvedValue({ ok: true, district: 9 });

    const response = await GET(detroitRequest('2 Woodward Ave, Detroit, MI 48226'), {
      params: Promise.resolve({ cityId: 'detroit' }),
    });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toContain('not in the verified roster');
  });
});
