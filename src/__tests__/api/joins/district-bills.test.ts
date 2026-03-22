/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/district/[districtId]/bills/route';
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

jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: jest.fn().mockResolvedValue([
    {
      bioguideId: 'S000480',
      name: 'Louise Slaughter',
      party: 'Democratic',
      chamber: 'House',
      state: 'MI',
      district: '05',
      committees: [],
    },
  ]),
  fetchCommitteeMemberships: jest.fn().mockResolvedValue([
    {
      bioguide: 'S000480',
      committees: [{ thomas_id: 'HSAS', title: 'Member' }],
    },
  ]),
  fetchCommittees: jest.fn().mockResolvedValue([
    { thomas_id: 'HSAS', name: 'Armed Services' },
    { thomas_id: 'HSAP', name: 'Appropriations' },
  ]),
}));

const mockSpendingResponse = {
  results: [
    { 'Awarding Agency': 'Department of Defense', 'Award Amount': 5000000 },
    { 'Awarding Agency': 'Department of Health and Human Services', 'Award Amount': 3000000 },
  ],
};

// Bill list response — does NOT include policyArea or introducedDate (matches real API)
const mockCongressListResponse = {
  bills: [
    {
      congress: 119,
      type: 'HR',
      number: 100,
      title: 'National Defense Authorization Act',
      updateDate: '2025-02-01',
      latestAction: { actionDate: '2025-02-01', text: 'Referred to Committee' },
      url: 'https://api.congress.gov/v3/bill/119/hr/100?format=json',
    },
    {
      congress: 119,
      type: 'S',
      number: 50,
      title: 'Education Improvement Act',
      updateDate: '2025-02-05',
      latestAction: { actionDate: '2025-02-05', text: 'Introduced' },
      url: 'https://api.congress.gov/v3/bill/119/s/50?format=json',
    },
  ],
};

// Individual bill detail responses — include policyArea and introducedDate
const mockBillDetail100 = {
  bill: {
    policyArea: { name: 'Armed Forces and National Security' },
    introducedDate: '2025-01-15',
  },
};

const mockBillDetail50 = {
  bill: {
    policyArea: { name: 'Education' },
    introducedDate: '2025-01-20',
  },
};

describe('/api/district/[districtId]/bills', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-key' };
    global.fetch = jest.fn().mockImplementation((url: string | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('usaspending.gov')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSpendingResponse) });
      }
      // Individual bill detail endpoints (contain /hr/ or /s/ with bill number)
      if (urlStr.match(/congress\.gov\/v3\/bill\/\d+\/\w+\/\d+\?/)) {
        if (urlStr.includes('/hr/100')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBillDetail100) });
        }
        if (urlStr.includes('/s/50')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBillDetail50) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ bill: {} }) });
      }
      // Bill list endpoint
      if (urlStr.includes('congress.gov/v3/bill/119')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCongressListResponse) });
      }
      if (urlStr.includes('congress.gov')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return bills for a valid district', async () => {
    const request = createMockRequest('http://localhost:3000/api/district/MI-05/bills');
    const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.districtId).toBe('MI-05');
    expect(data.state).toBe('MI');
    expect(data.district).toBe('05');
    expect(data.metadata.joinType).toBe('district-bills');
  });

  it('should return 400 for invalid district format', async () => {
    const request = createMockRequest('http://localhost:3000/api/district/invalid/bills');
    const response = await GET(request, { params: Promise.resolve({ districtId: 'invalid' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid district ID format');
  });

  it('should return 503 without API key', async () => {
    delete process.env.CONGRESS_API_KEY;

    const request = createMockRequest('http://localhost:3000/api/district/MI-05/bills');
    const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });

    expect(response.status).toBe(503);
  });

  it('should include representative name when found', async () => {
    const request = createMockRequest('http://localhost:3000/api/district/MI-05/bills');
    const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });
    const data = await response.json();

    expect(data.representativeName).toBe('Louise Slaughter');
  });

  it('should include topAgencies from spending data', async () => {
    const request = createMockRequest('http://localhost:3000/api/district/MI-05/bills');
    const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });
    const data = await response.json();

    expect(Array.isArray(data.topAgencies)).toBe(true);
  });

  it('should include relevanceScore on bills', async () => {
    const request = createMockRequest('http://localhost:3000/api/district/MI-05/bills');
    const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });
    const data = await response.json();

    for (const bill of data.bills) {
      expect(bill.relevanceScore).toBeGreaterThan(0);
      expect(Array.isArray(bill.relevanceReasons)).toBe(true);
    }
  });

  it('should handle at-large districts', async () => {
    const request = createMockRequest('http://localhost:3000/api/district/AK-AL/bills');
    const response = await GET(request, { params: Promise.resolve({ districtId: 'AK-AL' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.districtId).toBe('AK-AL');
  });

  it('should include relevant policy areas', async () => {
    const request = createMockRequest('http://localhost:3000/api/district/MI-05/bills');
    const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });
    const data = await response.json();

    expect(Array.isArray(data.relevantPolicyAreas)).toBe(true);
  });
});
