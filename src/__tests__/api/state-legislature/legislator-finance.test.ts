/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Contract tests for /api/state-legislature/[state]/legislator/[id]/finance.
 *
 * Pins the two BackboneResponse paths the route can take:
 *   - FOLLOWTHEMONEY_API_KEY absent (production reality): 503 / 'unavailable'
 *   - FOLLOWTHEMONEY_API_KEY present but no FTM entity match: 200 / 'empty'
 *
 * The configured-success path is dormant documentation in this environment;
 * see docs/fixtures/phase4/README.md for why.
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

jest.mock('@/services/cache', () => ({
  govCache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/core/state-legislature-core.service', () => ({
  StateLegislatureCoreService: {
    getStateLegislatorById: jest.fn(),
  },
}));

jest.mock('@/lib/follow-the-money', () => ({
  resolveFTMEntityId: jest.fn(),
  ftmApiService: {
    getEntityDetails: jest.fn(),
    getIndustryBreakdown: jest.fn(),
  },
}));

import { GET } from '@/app/api/state-legislature/[state]/legislator/[id]/finance/route';
import { createMockRequest } from '../../utils/test-helpers';
import { encodeBase64Url } from '@/lib/url-encoding';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import { resolveFTMEntityId } from '@/lib/follow-the-money';

const mockGetLegislator = StateLegislatureCoreService.getStateLegislatorById as jest.MockedFunction<
  typeof StateLegislatureCoreService.getStateLegislatorById
>;
const mockResolveFTM = resolveFTMEntityId as jest.MockedFunction<typeof resolveFTMEntityId>;

describe('/api/state-legislature/[state]/legislator/[id]/finance', () => {
  const originalEnv = process.env;
  const legislatorId = 'ocd-person/abc-123';
  const encodedId = encodeBase64Url(legislatorId);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.FOLLOWTHEMONEY_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 503 with dataQuality: unavailable when FTM key is absent', async () => {
    const request = createMockRequest(
      `http://localhost:3000/api/state-legislature/ca/legislator/${encodedId}/finance`
    );
    const response = await GET(request, {
      params: Promise.resolve({ state: 'ca', id: encodedId }),
    });
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.dataQuality).toBe('unavailable');
    expect(data.sourceStatus).toHaveLength(1);
    expect(data.sourceStatus[0].source).toBe('followthemoney');
    expect(data.sourceStatus[0].status).toBe('not-configured');
    expect(data.metadata.note).toContain('OpenSecrets merger');
    // Service must not be called when FTM is not configured
    expect(mockGetLegislator).not.toHaveBeenCalled();
  });

  it('returns 200 with dataQuality: empty when FTM configured but entity cannot be resolved', async () => {
    process.env.FOLLOWTHEMONEY_API_KEY = 'test-key-present';

    mockGetLegislator.mockResolvedValue({
      id: legislatorId,
      name: 'Jane Doe',
      firstName: 'Jane',
      lastName: 'Doe',
      party: 'Democratic',
      state: 'CA',
      chamber: 'upper',
      district: '1',
      isActive: true,
      terms: [],
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSources: ['openstates'],
        completeness: {
          basicInfo: true,
          biography: false,
          contact: false,
          committees: false,
          voting: false,
          legislation: false,
        },
      },
    } as Awaited<ReturnType<typeof StateLegislatureCoreService.getStateLegislatorById>>);

    mockResolveFTM.mockResolvedValue(null);

    const request = createMockRequest(
      `http://localhost:3000/api/state-legislature/ca/legislator/${encodedId}/finance`
    );
    const response = await GET(request, {
      params: Promise.resolve({ state: 'ca', id: encodedId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.dataQuality).toBe('empty');
    expect(data.sourceStatus).toHaveLength(1);
    expect(data.sourceStatus[0].source).toBe('followthemoney');
    expect(data.sourceStatus[0].status).toBe('ok');
    expect(data.legislator?.name).toBe('Jane Doe');
    expect(mockResolveFTM).toHaveBeenCalledTimes(1);
  });
});
