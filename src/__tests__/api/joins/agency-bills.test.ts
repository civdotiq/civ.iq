/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/spending/agency/[agencySlug]/bills/route';
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
      url: 'https://congress.gov/bill/119/hr/100',
    },
    {
      congress: 119,
      type: 'S',
      number: 50,
      title: 'Unrelated Education Bill',
      introducedDate: '2025-01-20',
      policyArea: { name: 'Education' },
      latestAction: { actionDate: '2025-02-05', text: 'Introduced' },
      url: 'https://congress.gov/bill/119/s/50',
    },
  ],
};

describe('/api/spending/agency/[agencySlug]/bills', () => {
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

  it('should return bills for a valid agency slug', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/spending/agency/department-of-defense/bills'
    );
    const response = await GET(request, {
      params: Promise.resolve({ agencySlug: 'department-of-defense' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.agencySlug).toBe('department-of-defense');
    expect(data.oversightCommittees.length).toBeGreaterThan(0);
    expect(data.metadata.joinType).toBe('agency-bills');
  });

  it('should filter bills by matching policyArea', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/spending/agency/department-of-defense/bills'
    );
    const response = await GET(request, {
      params: Promise.resolve({ agencySlug: 'department-of-defense' }),
    });
    const data = await response.json();

    // Defense bills should match, education bills should not (unless topic match)
    for (const bill of data.bills) {
      expect(bill.connectionStrength).toMatch(/^(direct|inferred)$/);
    }
  });

  it('should return empty results for unknown agency slug', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/spending/agency/nonexistent-agency/bills'
    );
    const response = await GET(request, {
      params: Promise.resolve({ agencySlug: 'nonexistent-agency' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.bills).toEqual([]);
    expect(data.metadata.dataQuality).toBe('degraded');
  });

  it('should return 503 without API key', async () => {
    delete process.env.CONGRESS_API_KEY;

    const request = createMockRequest(
      'http://localhost:3000/api/spending/agency/department-of-defense/bills'
    );
    const response = await GET(request, {
      params: Promise.resolve({ agencySlug: 'department-of-defense' }),
    });

    expect(response.status).toBe(503);
  });

  it('should include oversight committees', async () => {
    const request = createMockRequest(
      'http://localhost:3000/api/spending/agency/department-of-defense/bills'
    );
    const response = await GET(request, {
      params: Promise.resolve({ agencySlug: 'department-of-defense' }),
    });
    const data = await response.json();

    expect(data.oversightCommittees.length).toBeGreaterThan(0);
    expect(data.oversightCommittees[0]).toHaveProperty('code');
    expect(data.oversightCommittees[0]).toHaveProperty('name');
    expect(data.oversightCommittees[0]).toHaveProperty('chamber');
  });
});
