/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/govinfo/hearings/connections/route';
import { createMockRequest } from '../../utils/test-helpers';

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

jest.mock('@/lib/services/bill.service', () => ({
  fetchBillFromCongress: jest.fn().mockResolvedValue({
    id: '119-hr-1',
    title: 'National Defense Authorization Act for Fiscal Year 2026',
    policyArea: 'Armed Forces and National Security',
    subjects: [],
  }),
  mapCongressStatus: jest.fn().mockReturnValue('introduced'),
}));

const mockGovInfoResponse = {
  count: 3,
  nextPage: null,
  previousPage: null,
  packages: [
    {
      packageId: 'CHRG-119hhrg12345',
      title: 'Hearing on Military Readiness and Defense Spending',
      docClass: 'HHRG',
      congress: '119',
      dateIssued: '2025-02-01',
      lastModified: '2025-02-02T00:00:00Z',
      packageLink: '',
    },
    {
      packageId: 'CHRG-119shrg67890',
      title: 'Senate Hearing on Health Care Reform',
      docClass: 'SHRG',
      congress: '119',
      dateIssued: '2025-01-25',
      lastModified: '2025-01-26T00:00:00Z',
      packageLink: '',
    },
    {
      packageId: 'CHRG-119hhrg11111',
      title: 'Hearing on Education Funding',
      docClass: 'HHRG',
      congress: '119',
      dateIssued: '2025-01-20',
      lastModified: '2025-01-21T00:00:00Z',
      packageLink: '',
    },
  ],
};

describe('/api/govinfo/hearings/connections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGovInfoResponse),
    });
  });

  it('should require at least one filter', async () => {
    const request = createMockRequest('http://localhost:3000/api/govinfo/hearings/connections');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('At least one filter');
  });

  it('should filter by committeeId', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/govinfo/hearings/connections?committeeId=HSAS'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filter.committeeId).toBe('HSAS');
    expect(data.metadata.joinType).toBe('hearings-connections');
    expect(Array.isArray(data.hearings)).toBe(true);
  });

  it('should filter by billId', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/govinfo/hearings/connections?billId=119-hr-1'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filter.billId).toBe('119-hr-1');
    // Should find the defense hearing via keyword matching
    expect(data.metadata.dataSources).toContain('congress.gov');
  });

  it('should filter by policyArea', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/govinfo/hearings/connections?policyArea=Armed%20Forces%20and%20National%20Security'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filter.policyArea).toBe('Armed Forces and National Security');
  });

  it('should include relevanceScore and matchedTopics on hearings', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/govinfo/hearings/connections?committeeId=HSAS'
    );
    const response = await GET(request);
    const data = await response.json();

    for (const h of data.hearings) {
      expect(h).toHaveProperty('relevanceScore');
      expect(h).toHaveProperty('matchedTopics');
      expect(h).toHaveProperty('connectionType');
      expect(h.relevanceScore).toBeGreaterThan(0);
    }
  });

  it('should include summary with topTopics', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/govinfo/hearings/connections?committeeId=HSAS'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.summary).toHaveProperty('totalMatches');
    expect(data.summary).toHaveProperty('topTopics');
    expect(Array.isArray(data.summary.topTopics)).toBe(true);
  });

  it('should handle GovInfo API errors gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const request = createMockRequest(
      'http://localhost:3000/api/govinfo/hearings/connections?committeeId=HSAS'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hearings).toEqual([]);
  });
});
