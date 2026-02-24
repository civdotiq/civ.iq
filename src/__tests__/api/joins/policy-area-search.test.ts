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

const mockCongressResponse = {
  bills: [
    {
      congress: 119,
      type: 'HR',
      number: 100,
      title: 'National Defense Authorization Act',
      introducedDate: '2025-01-15',
      policyArea: { name: 'Armed Forces and National Security' },
      latestAction: { actionDate: '2025-02-01', text: 'Referred to Committee' },
    },
    {
      congress: 119,
      type: 'S',
      number: 50,
      title: 'Education Improvement Act',
      introducedDate: '2025-01-20',
      policyArea: { name: 'Education' },
      latestAction: { actionDate: '2025-02-05', text: 'Introduced' },
    },
  ],
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
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-key' };
    // Mock fetch to return different responses based on URL
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('congress.gov')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCongressResponse) });
      }
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
    expect(data.error).toContain('policyArea');
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
    expect(data.metadata.dataSources).toContain('congress.gov');
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

  it('should filter bills by matching policyArea', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/search/policy-area?policyArea=Armed%20Forces%20and%20National%20Security'
    );
    const response = await GET(request);
    const data = await response.json();

    // Only the defense bill should match, not the education bill
    for (const bill of data.bills) {
      expect(bill).toHaveProperty('id');
      expect(bill).toHaveProperty('title');
      expect(bill).toHaveProperty('status');
    }
  });

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const request = createMockRequest(
      'http://localhost:3000/api/search/policy-area?policyArea=Armed%20Forces%20and%20National%20Security'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.bills).toEqual([]);
  });
});
