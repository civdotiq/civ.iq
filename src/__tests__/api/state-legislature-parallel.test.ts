/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Regression tests for the parallelized per-district OpenStates fetch in the
 * state-legislature route (2026-07 audit item 2): all targeted districts are
 * requested, results are order-preserved, and one failing district does not
 * sink the others.
 */

import { GET } from '@/app/api/representative/[bioguideId]/state-legislature/route';
import { createMockRequest, mockFetchResponse } from '../utils/test-helpers';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/server-url', () => ({
  getServerBaseUrl: jest.fn(() => 'http://localhost:3000'),
}));

function makeParams(bioguideId: string): { params: Promise<{ bioguideId: string }> } {
  return { params: Promise.resolve({ bioguideId }) };
}

// The per-district path only triggers for Michigan CD-13 (the one mapped
// congressional district): 5 senate + 10 house districts, capped at 10.
const MI13_REP = { state: 'Michigan', district: '13', name: 'Test Rep' };

function legislatorFor(district: string, chamber: string) {
  return {
    id: `ocd-person/${chamber}-${district}`,
    name: `Legislator ${chamber} ${district}`,
    current_role: { party: 'Democratic', org_classification: chamber, district },
  };
}

describe('/api/representative/[bioguideId]/state-legislature parallel district fetch', () => {
  const originalKey = process.env.OPENSTATES_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENSTATES_API_KEY = 'test-key';
  });

  afterAll(() => {
    process.env.OPENSTATES_API_KEY = originalKey;
  });

  it('fetches all capped districts and preserves per-district results', async () => {
    const requestedDistricts: string[] = [];

    global.fetch = jest.fn().mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/representative/')) {
        return mockFetchResponse(MI13_REP);
      }
      if (u.includes('v3.openstates.org/people')) {
        const district = new URL(u).searchParams.get('district') ?? '';
        requestedDistricts.push(district);
        return mockFetchResponse({ results: [legislatorFor(district, 'upper')] });
      }
      if (u.includes('v3.openstates.org/jurisdictions')) {
        return mockFetchResponse({
          name: 'Michigan',
          classification: 'state',
          legislative_sessions: [],
        });
      }
      if (u.includes('v3.openstates.org/bills')) {
        return mockFetchResponse({ results: [] });
      }
      return Promise.reject(new Error(`unmocked fetch: ${u}`));
    });

    const response = await GET(
      createMockRequest('http://localhost:3000/api/representative/T000000/state-legislature'),
      makeParams('T000000')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    // MI-13 maps to 15 districts, capped at 10 (5 senate + first 5 house)
    expect(requestedDistricts).toHaveLength(10);
    expect(body.state_legislators).toHaveLength(10);
    // Order preserved: senate districts 1-5 first, then house districts 1-5
    expect(body.state_legislators.map((l: { district: string }) => l.district)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
  });

  it('isolates a failing district instead of sinking the whole request', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/representative/')) {
        return mockFetchResponse(MI13_REP);
      }
      if (u.includes('v3.openstates.org/people')) {
        const district = new URL(u).searchParams.get('district') ?? '';
        if (district === '3') {
          return Promise.reject(new Error('connection reset'));
        }
        return mockFetchResponse({ results: [legislatorFor(district, 'upper')] });
      }
      if (u.includes('v3.openstates.org/jurisdictions')) {
        return mockFetchResponse({
          name: 'Michigan',
          classification: 'state',
          legislative_sessions: [],
        });
      }
      if (u.includes('v3.openstates.org/bills')) {
        return mockFetchResponse({ results: [] });
      }
      return Promise.reject(new Error(`unmocked fetch: ${u}`));
    });

    const response = await GET(
      createMockRequest('http://localhost:3000/api/representative/T000000/state-legislature'),
      makeParams('T000000')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    // District '3' fails in both chambers (2 of 10 slots); the rest survive
    expect(body.state_legislators).toHaveLength(8);
    expect(body.state_legislators.every((l: { district: string }) => l.district !== '3')).toBe(
      true
    );
  });
});
