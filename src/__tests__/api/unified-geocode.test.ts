/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * /api/unified-geocode input contract (search-growth Phase 4b): street parts,
 * one line, or a device's coordinates. A ZIP alone is refused with a message
 * asking for the street address, because a ZIP can't place anyone.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/unified-geocode/route';
import { resolveByAddress } from '@/services/lookup/resolve-representatives.service';

jest.mock('@/services/lookup/resolve-representatives.service', () => ({
  resolveByAddress: jest.fn(),
  stateMembersByBucket: jest.fn(() => ({ upper: [], lower: [] })),
}));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const resolve = resolveByAddress as jest.Mock;

function post(body: unknown): NextRequest {
  // jsdom's fetch polyfill has no Request body streams (see zip-honesty.test.ts).
  const req = new NextRequest('http://localhost/api/unified-geocode', { method: 'POST' });
  Object.defineProperty(req, 'json', { value: () => Promise.resolve(body) });
  return req;
}

beforeEach(() => {
  resolve.mockReset();
  resolve.mockResolvedValue({
    matchedAddress: '100 S CAPITOL AVE, LANSING, MI, 48933',
    coordinates: { lat: 42.73, lon: -84.55 },
    state: 'MI',
    congressionalDistrict: { number: '7', geoid: '2607', name: 'District 7' },
    federal: [],
    stateSeats: [],
    ballotDistrict2026: null,
  });
});

describe('POST /api/unified-geocode', () => {
  it.each(['48933', ' 48933-1234 '])('refuses a bare ZIP (%s)', async zip => {
    const res = await POST(post({ address: zip }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('ZIP_ONLY');
    expect(body.error.userMessage).toMatch(/street address/);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('passes a one-line address through to the resolver', async () => {
    const res = await POST(post({ address: ' 100 N Capitol Ave, Lansing, MI ' }));

    expect(res.status).toBe(200);
    expect(resolve).toHaveBeenCalledWith({ address: '100 N Capitol Ave, Lansing, MI' });
  });

  it('passes a device location through to the resolver', async () => {
    const res = await POST(post({ lat: 42.7336, lon: -84.5555 }));

    expect(res.status).toBe(200);
    expect(resolve).toHaveBeenCalledWith({ lat: 42.7336, lon: -84.5555 });
  });

  it('rejects coordinates off the globe', async () => {
    const res = await POST(post({ lat: 120, lon: 0 }));

    expect(res.status).toBe(400);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('still accepts street parts', async () => {
    const res = await POST(post({ street: '100 N Capitol Ave', city: 'Lansing', state: 'MI' }));

    expect(res.status).toBe(200);
    expect(resolve).toHaveBeenCalledWith({
      street: '100 N Capitol Ave',
      city: 'Lansing',
      state: 'MI',
      zip: undefined,
    });
  });

  it('asks for a complete address when nothing usable was sent', async () => {
    const res = await POST(post({ city: 'Lansing' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('MISSING_REQUIRED_FIELDS');
  });
});
