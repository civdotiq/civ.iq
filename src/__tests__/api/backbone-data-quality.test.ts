/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Integration tests for the BackboneResponse dataQuality contract.
 *
 * Verifies that the three audited routes (committees, district spending,
 * lobbying) return dataQuality: 'unavailable' when upstream APIs fail,
 * instead of silently returning [].
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    metric: jest.fn(),
  },
}));

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn(async (_key: string, fetcher: () => Promise<unknown>) => fetcher()),
}));

jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: jest.fn(),
  fetchCommitteeMemberships: jest.fn(),
}));

jest.mock('@/lib/data-sources/senate-lobbying-api', () => ({
  senateLobbyingAPI: {
    getCommitteeLobbyingData: jest.fn(),
  },
}));

jest.mock('@/lib/services/spending.service', () => ({
  parseDistrictId: jest.fn(),
  getDistrictSpending: jest.fn(),
}));

import { createMockRequest } from '../utils/test-helpers';
import { GET as committeesGET } from '@/app/api/representative/[bioguideId]/committees/route';
import { GET as lobbyingGET } from '@/app/api/representative/[bioguideId]/lobbying/route';
import { GET as spendingGET } from '@/app/api/spending/district/[districtId]/route';
import {
  fetchCommitteeMemberships,
  getEnhancedRepresentative,
} from '@/features/representatives/services/congress.service';
import { parseDistrictId, getDistrictSpending } from '@/lib/services/spending.service';

const mockGetEnhanced = getEnhancedRepresentative as jest.MockedFunction<
  typeof getEnhancedRepresentative
>;
const mockMemberships = fetchCommitteeMemberships as jest.MockedFunction<
  typeof fetchCommitteeMemberships
>;
const mockParseDistrict = parseDistrictId as jest.MockedFunction<typeof parseDistrictId>;
const mockGetSpending = getDistrictSpending as jest.MockedFunction<typeof getDistrictSpending>;

describe('BackboneResponse dataQuality contract', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('/api/representative/[bioguideId]/committees', () => {
    const ROSTER = [{ bioguide: 'K000367', committees: [{ thomas_id: 'SSJU' }] }];

    async function call() {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/committees'
      );
      const response = await committeesGET(request, {
        params: Promise.resolve({ bioguideId: 'K000367' }),
      });
      return { response, data: await response.json() };
    }

    it('returns dataQuality: unavailable when the membership roster fails', async () => {
      mockMemberships.mockRejectedValue(new Error('ECONNREFUSED'));
      mockGetEnhanced.mockResolvedValue(null);
      const { data } = await call();

      expect(data.dataQuality).toBe('unavailable');
      expect(data.sourceStatus).toEqual([
        expect.objectContaining({
          source: 'congress-legislators',
          status: 'error',
          errorMessage: expect.stringContaining('ECONNREFUSED'),
        }),
      ]);
      expect(data.committees).toEqual([]);
    });

    it('returns dataQuality: empty when member has no committees', async () => {
      mockMemberships.mockResolvedValue(ROSTER);
      mockGetEnhanced.mockResolvedValue({ committees: [] } as never);
      const { response, data } = await call();

      expect(response.status).toBe(200);
      expect(data.dataQuality).toBe('empty');
      expect(data.sourceStatus[0].status).toBe('ok');
    });

    it('returns dataQuality: complete when member has committees', async () => {
      mockMemberships.mockResolvedValue(ROSTER);
      mockGetEnhanced.mockResolvedValue({
        committees: [{ name: 'Senate Committee on the Judiciary', role: 'Member', id: 'SSJU' }],
      } as never);
      const { response, data } = await call();

      expect(response.status).toBe(200);
      expect(data.dataQuality).toBe('complete');
    });

    it('returns dataQuality: unavailable with timeout source status', async () => {
      mockMemberships.mockRejectedValue(new Error('AbortError: signal timed out'));
      mockGetEnhanced.mockResolvedValue(null);
      const { data } = await call();

      expect(data.dataQuality).toBe('unavailable');
      expect(data.sourceStatus[0].status).toBe('timeout');
    });
  });

  describe('/api/spending/district/[districtId]', () => {
    it('returns dataQuality: unavailable when USAspending fails', async () => {
      mockParseDistrict.mockReturnValue({ state: 'MI', district: '05' });
      mockGetSpending.mockRejectedValue(new Error('USAspending API connection refused'));

      const request = createMockRequest('http://localhost:3000/api/spending/district/MI-05');
      const response = await spendingGET(request, {
        params: Promise.resolve({ districtId: 'MI-05' }),
      });
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.dataQuality).toBe('unavailable');
      expect(data.sourceStatus[0].status).toBe('error');
      expect(data.success).toBe(false);
    });

    it('returns dataQuality: complete when all data present', async () => {
      mockParseDistrict.mockReturnValue({ state: 'MI', district: '05' });
      mockGetSpending.mockResolvedValue({
        contracts: [{ id: '1' }],
        grants: [{ id: '2' }],
        contractTotal: 1000,
        grantTotal: 500,
        aggregate: { total: 1500, perCapita: 100, population: 15 },
      });

      const request = createMockRequest('http://localhost:3000/api/spending/district/MI-05');
      const response = await spendingGET(request, {
        params: Promise.resolve({ districtId: 'MI-05' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dataQuality).toBe('complete');
      expect(data.sourceStatus[0].status).toBe('ok');
    });

    it('returns dataQuality: partial when aggregate unavailable', async () => {
      mockParseDistrict.mockReturnValue({ state: 'MI', district: '05' });
      mockGetSpending.mockResolvedValue({
        contracts: [{ id: '1' }],
        grants: [],
        contractTotal: 1000,
        grantTotal: 0,
        aggregate: null,
      });

      const request = createMockRequest('http://localhost:3000/api/spending/district/MI-05');
      const response = await spendingGET(request, {
        params: Promise.resolve({ districtId: 'MI-05' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dataQuality).toBe('partial');
    });
  });

  describe('/api/representative/[bioguideId]/lobbying', () => {
    it('returns dataQuality: unavailable when Congress.gov fails for rep data', async () => {
      mockGetEnhanced.mockRejectedValue(new Error('Congress.gov down'));

      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/lobbying'
      );
      const response = await lobbyingGET(request, {
        params: Promise.resolve({ bioguideId: 'K000367' }),
      });
      const data = await response.json();

      expect(data.dataQuality).toBe('unavailable');
      expect(data.sourceStatus).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: 'congress.gov',
            status: 'error',
          }),
        ])
      );
    });

    it('returns dataQuality: empty when rep has no committee assignments', async () => {
      mockGetEnhanced.mockResolvedValue({
        name: 'Test Rep',
        committees: [],
      });

      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/lobbying'
      );
      const response = await lobbyingGET(request, {
        params: Promise.resolve({ bioguideId: 'K000367' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dataQuality).toBe('empty');
      expect(data.lobbyingData.totalRelevantSpending).toBe(0);
    });

    it('returns dataQuality: empty when rep not found (legitimate 404)', async () => {
      mockGetEnhanced.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/representative/ZZZZ99/lobbying');
      const response = await lobbyingGET(request, {
        params: Promise.resolve({ bioguideId: 'ZZZZ99' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.dataQuality).toBe('empty');
    });
  });
});
