/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/representative/[bioguideId]/finance-jurisdiction/route';
import { createMockRequest } from '../../utils/test-helpers';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key, fetcher) => fetcher()),
}));

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

jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: jest.fn().mockResolvedValue({
    bioguideId: 'P000197',
    name: 'Nancy Pelosi',
    party: 'Democratic',
    chamber: 'House',
    state: 'CA',
    committees: [{ name: 'Appropriations', role: 'Member' }],
  }),
}));

jest.mock('@/lib/api/finance-helpers', () => ({
  getFECMapping: jest.fn().mockReturnValue({ fecId: 'H0CA08007' }),
}));

jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: {
    getSampleContributions: jest.fn().mockResolvedValue([
      {
        contributor_employer: 'Tech Corp',
        contributor_occupation: 'Engineer',
        contributor_name: 'John Doe',
        contribution_receipt_amount: 2800,
      },
      {
        contributor_employer: 'Goldman Sachs',
        contributor_occupation: 'Banker',
        contributor_name: 'Jane Smith',
        contribution_receipt_amount: 5000,
      },
    ]),
  },
}));

jest.mock('@/lib/fec/industry-taxonomy', () => {
  const actual = jest.requireActual('@/lib/fec/industry-taxonomy');
  return {
    ...actual,
    categorizeContributionSmart: jest.fn().mockReturnValue({
      sector: 'FINANCE_INSURANCE_REAL_ESTATE',
      confidence: 0.8,
    }),
  };
});

describe('/api/representative/[bioguideId]/finance-jurisdiction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return finance-jurisdiction overlap data', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/representative/P000197/finance-jurisdiction'
    );
    const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.committeeName).toBeDefined();
    expect(data.jurisdictionTopics).toBeDefined();
    expect(data.members).toHaveLength(1);
    expect(data.members[0].bioguideId).toBe('P000197');
    expect(data.metadata.joinType).toBe('finance-jurisdiction');
  });

  it('should return 404 for non-existent representative', async () => {
    jest.mocked(getEnhancedRepresentative).mockResolvedValueOnce(null);

    const request = createMockRequest(
      'http://localhost:3000/api/representative/XXXXXX/finance-jurisdiction'
    );
    const response = await GET(request, { params: Promise.resolve({ bioguideId: 'XXXXXX' }) });

    expect(response.status).toBe(404);
  });

  it('should include industrySectors from committee mapping', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/representative/P000197/finance-jurisdiction'
    );
    const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });
    const data = await response.json();

    expect(data.industrySectors).toBeDefined();
    expect(Array.isArray(data.industrySectors)).toBe(true);
  });

  it('should indicate data quality based on FEC data availability', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/representative/P000197/finance-jurisdiction'
    );
    const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });
    const data = await response.json();

    expect(data.metadata.dataSources).toContain('congress.gov');
    expect(data.metadata.dataSources).toContain('fec.gov');
    expect(data.metadata.dataQuality).toBe('complete');
  });
});
