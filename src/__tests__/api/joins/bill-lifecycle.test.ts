/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/bills/lifecycle/route';
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
  mapCongressStatus: jest.fn().mockImplementation((text?: string) => {
    if (!text) return null;
    if (text.toLowerCase().includes('enacted')) return 'enacted';
    if (text.toLowerCase().includes('passed house')) return 'passed_house';
    if (text.toLowerCase().includes('referred')) return 'referred';
    return 'introduced';
  }),
}));

const today = new Date();
const recentDate = new Date(today);
recentDate.setDate(recentDate.getDate() - 3);
const recentDateStr = recentDate.toISOString().split('T')[0];

const mockCongressResponse = {
  bills: [
    {
      congress: 119,
      type: 'HR',
      number: 100,
      title: 'Defense Authorization Act',
      originChamber: 'House',
      introducedDate: recentDateStr,
      policyArea: { name: 'Armed Forces and National Security' },
      latestAction: { actionDate: recentDateStr, text: 'Referred to Committee' },
      url: 'https://congress.gov/bill/119/hr/100',
    },
    {
      congress: 119,
      type: 'S',
      number: 50,
      title: 'Clean Energy Act',
      originChamber: 'Senate',
      introducedDate: recentDateStr,
      policyArea: { name: 'Energy' },
      latestAction: { actionDate: recentDateStr, text: 'Passed House' },
      url: 'https://congress.gov/bill/119/s/50',
    },
    {
      congress: 119,
      type: 'HR',
      number: 200,
      title: 'Tax Reform Act',
      originChamber: 'House',
      introducedDate: recentDateStr,
      policyArea: { name: 'Taxation' },
      latestAction: { actionDate: recentDateStr, text: 'Enacted into law' },
      url: 'https://congress.gov/bill/119/hr/200',
    },
  ],
};

describe('/api/bills/lifecycle', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-key' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCongressResponse),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return lifecycle bills with default parameters', async () => {
    const request = createMockRequest('http://localhost:3000/api/bills/lifecycle');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metadata.joinType).toBe('bill-lifecycle');
    expect(data.metadata.dataSources).toContain('congress.gov');
    expect(Array.isArray(data.bills)).toBe(true);
  });

  it('should return 503 without API key', async () => {
    delete process.env.CONGRESS_API_KEY;

    const request = createMockRequest('http://localhost:3000/api/bills/lifecycle');
    const response = await GET(request);

    expect(response.status).toBe(503);
  });

  it('should reject invalid status values', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/bills/lifecycle?status=invalid_status'
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid status');
  });

  it('should filter by status', async () => {
    const request = createMockRequest('http://localhost:3000/api/bills/lifecycle?status=referred');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filters.status).toBe('referred');
    for (const bill of data.bills) {
      expect(bill.status).toBe('referred');
    }
  });

  it('should include statusCounts', async () => {
    const request = createMockRequest('http://localhost:3000/api/bills/lifecycle');
    const response = await GET(request);
    const data = await response.json();

    expect(data.statusCounts).toBeDefined();
    expect(typeof data.statusCounts).toBe('object');
  });

  it('should support relative date format', async () => {
    const request = createMockRequest('http://localhost:3000/api/bills/lifecycle?since=30d');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filters).toHaveProperty('since');
    expect(data.filters).toHaveProperty('until');
  });

  it('should filter by chamber', async () => {
    const request = createMockRequest('http://localhost:3000/api/bills/lifecycle?chamber=house');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filters.chamber).toBe('house');
    for (const bill of data.bills) {
      expect(bill.chamber.toLowerCase()).toBe('house');
    }
  });

  it('should include bill details in response', async () => {
    const request = createMockRequest('http://localhost:3000/api/bills/lifecycle');
    const response = await GET(request);
    const data = await response.json();

    if (data.bills.length > 0) {
      const bill = data.bills[0];
      expect(bill).toHaveProperty('id');
      expect(bill).toHaveProperty('title');
      expect(bill).toHaveProperty('status');
      expect(bill).toHaveProperty('introducedDate');
      expect(bill).toHaveProperty('latestActionDate');
      expect(bill).toHaveProperty('latestActionText');
    }
  });
});
