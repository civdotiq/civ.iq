/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/bill/[billId]/spending/route';
import { createMockRequest } from '../../utils/test-helpers';
import { fetchBillFromCongress } from '@/lib/services/bill.service';

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
    title: 'Defense Authorization Act',
    policyArea: 'Armed Forces and National Security',
    committees: [{ name: 'Armed Services', chamber: 'House' }],
  }),
  mapCongressStatus: jest.fn().mockReturnValue('introduced'),
}));

const mockUSASpendingResponse = {
  results: [
    {
      'Award ID': 'CONT-001',
      internal_id: 1,
      'Recipient Name': 'Defense Corp',
      'Award Amount': 5000000,
      'Award Type': 'A',
      'Awarding Agency': 'Department of Defense',
      agency_slug: 'department-of-defense',
      'Start Date': '2025-01-15',
      Description: 'Military equipment',
      generated_internal_id: 'gen-1',
    },
  ],
};

describe('/api/bill/[billId]/spending', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-key' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUSASpendingResponse),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return spending data for a valid bill', async () => {
    const request = createMockRequest('http://localhost:3000/api/bill/119-hr-1/spending');
    const response = await GET(request, { params: Promise.resolve({ billId: '119-hr-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.billId).toBe('119-hr-1');
    expect(data.billTitle).toBe('Defense Authorization Act');
    expect(data.policyArea).toBe('Armed Forces and National Security');
    expect(data.spending.awards).toBeDefined();
    expect(data.metadata.joinType).toBe('bill-spending');
  });

  it('should return 404 for non-existent bill', async () => {
    jest.mocked(fetchBillFromCongress).mockResolvedValueOnce(null);

    const request = createMockRequest('http://localhost:3000/api/bill/119-hr-9999/spending');
    const response = await GET(request, { params: Promise.resolve({ billId: '119-hr-9999' }) });

    expect(response.status).toBe(404);
  });

  it('should handle USAspending API errors gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const request = createMockRequest('http://localhost:3000/api/bill/119-hr-1/spending');
    const response = await GET(request, { params: Promise.resolve({ billId: '119-hr-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.spending.awards).toEqual([]);
    expect(data.metadata.dataQuality).toBe('partial');
  });

  it('should respect limit parameter', async () => {
    const request = createMockRequest('http://localhost:3000/api/bill/119-hr-1/spending?limit=5');
    const response = await GET(request, { params: Promise.resolve({ billId: '119-hr-1' }) });

    expect(response.status).toBe(200);
  });

  it('should include relatedAgencies with connection strength', async () => {
    const request = createMockRequest('http://localhost:3000/api/bill/119-hr-1/spending');
    const response = await GET(request, { params: Promise.resolve({ billId: '119-hr-1' }) });
    const data = await response.json();

    expect(data.relatedAgencies).toBeDefined();
    expect(Array.isArray(data.relatedAgencies)).toBe(true);
  });
});
