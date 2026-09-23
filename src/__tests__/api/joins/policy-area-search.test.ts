/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/search/policy-area/route';
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
  mapCongressStatus: jest.fn().mockReturnValue('introduced'),
}));

const mockGetBillsByPolicyArea = jest.fn();
jest.mock('@/lib/data-sources/bill-policy-areas/load', () => ({
  getBillsByPolicyArea: (...args: unknown[]) => mockGetBillsByPolicyArea(...args),
}));

const defenseBill = {
  id: '119-hr-100',
  congress: 119,
  type: 'hr',
  number: 100,
  title: 'National Defense Authorization Act',
  policyArea: 'Armed Forces and National Security',
  introducedDate: '2025-01-15',
  latestActionDate: '2025-02-01',
  latestActionText: 'Referred to Committee',
};

const mockFedRegResponse = {
  count: 1,
  total_pages: 1,
  results: [
    {
      document_number: 'FR-2025-001',
      title: 'Military Equipment Standards',
      abstract: 'Proposed defense equipment standards',
      type: 'Proposed Rule',
      publication_date: '2025-02-01',
      html_url: 'https://federalregister.gov/d/FR-2025-001',
      pdf_url: 'https://federalregister.gov/d/FR-2025-001.pdf',
      agencies: [
        {
          name: 'Department of Defense',
          slug: 'department-of-defense',
          id: 1,
          url: '',
          json_url: '',
          parent_id: null,
          raw_name: 'DOD',
        },
      ],
      comment_url: null,
      comments_close_on: null,
      effective_on: null,
    },
  ],
};

const mockSpendingResponse = {
  results: [{ 'Award Amount': 5000000, 'Awarding Agency': 'Department of Defense' }],
};

describe('/api/search/policy-area', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockGetBillsByPolicyArea.mockResolvedValue({
      total: 1366,
      bills: [defenseBill],
      congress: 119,
      generatedAt: '2026-09-23T00:00:00.000Z',
    });
    // Mock fetch to return different responses based on URL
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('federalregister.gov')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockFedRegResponse) });
      }
      if (typeof url === 'string' && url.includes('usaspending.gov')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSpendingResponse) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should require policyArea parameter', async () => {
    const request = createMockRequest('http://localhost:3000/api/search/policy-area');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toContain('policyArea');
  });

  it('should return 404 for unknown policy area', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/search/policy-area?policyArea=Nonexistent%20Area'
    );
    const response = await GET(request);

    expect(response.status).toBe(404);
  });

  it('should return cross-domain results for valid policy area', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/search/policy-area?policyArea=Armed%20Forces%20and%20National%20Security'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.policyArea).toBe('Armed Forces and National Security');
    expect(data.metadata.joinType).toBe('policy-area-search');
    expect(data.metadata.dataSources).toContain('govinfo.gov');
  });

  it('should include all four domain sections', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/search/policy-area?policyArea=Armed%20Forces%20and%20National%20Security'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data).toHaveProperty('bills');
    expect(data).toHaveProperty('regulations');
    expect(data).toHaveProperty('spending');
    expect(data).toHaveProperty('committees');
    expect(Array.isArray(data.bills)).toBe(true);
    expect(Array.isArray(data.regulations)).toBe(true);
    expect(Array.isArray(data.committees)).toBe(true);
  });

  it('serves bills and the full area count from the corpus', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/search/policy-area?policyArea=Armed%20Forces%20and%20National%20Security&limit=5'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(mockGetBillsByPolicyArea).toHaveBeenCalledWith('Armed Forces and National Security', 5);
    expect(data.bills).toEqual([
      {
        id: '119-hr-100',
        title: 'National Defense Authorization Act',
        status: 'introduced',
        introducedDate: '2025-01-15',
      },
    ]);
    expect(data.billsTotal).toBe(1366);
    expect(data.billsCongress).toBe(119);
  });

  it('reports bills as unavailable, not zero, when the corpus is missing', async () => {
    mockGetBillsByPolicyArea.mockResolvedValue(null);
    const request = createMockRequest(
      'http://localhost:3000/api/search/policy-area?policyArea=Armed%20Forces%20and%20National%20Security'
    );
    const data = await (await GET(request)).json();

    expect(data.bills).toEqual([]);
    expect(data.billsTotal).toBeNull();
    expect(data.metadata.dataQuality).toBe('partial');
  });

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const request = createMockRequest(
      'http://localhost:3000/api/search/policy-area?policyArea=Armed%20Forces%20and%20National%20Security'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.regulations).toEqual([]);
    // Bills come from the committed corpus, so upstream outages don't blank them.
    expect(data.bills).toHaveLength(1);
  });
});
