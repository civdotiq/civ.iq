/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/bill/[billId]/votes/route';
import { createMockRequest } from '../../utils/test-helpers';
import { fetchBillFromCongress } from '@/lib/services/bill.service';

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
    title: 'Test Bill',
    congress: '119',
    votes: [
      {
        date: '2025-03-15',
        chamber: 'House',
        rollNumber: 100,
        question: 'On Passage',
        result: 'Passed',
        url: '',
      },
      {
        date: '2025-04-01',
        chamber: 'Senate',
        rollNumber: 50,
        question: 'On Passage',
        result: 'Failed',
        url: '',
      },
    ],
  }),
  mapCongressStatus: jest.fn().mockReturnValue('introduced'),
}));

describe('/api/bill/[billId]/votes', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return votes for a valid bill', async () => {
    const request = createMockRequest('http://localhost:3000/api/bill/119-hr-1/votes');
    const response = await GET(request, { params: Promise.resolve({ billId: '119-hr-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.billId).toBe('119-hr-1');
    expect(data.billTitle).toBe('Test Bill');
    expect(data.votes).toHaveLength(2);
    expect(data.summary.totalVotes).toBe(2);
    expect(data.summary.passedCount).toBe(1);
    expect(data.summary.failedCount).toBe(1);
    expect(data.metadata.joinType).toBe('bill-votes');
  });

  it('should return 404 for non-existent bill', async () => {
    jest.mocked(fetchBillFromCongress).mockResolvedValueOnce(null);

    const request = createMockRequest('http://localhost:3000/api/bill/119-hr-9999/votes');
    const response = await GET(request, { params: Promise.resolve({ billId: '119-hr-9999' }) });

    expect(response.status).toBe(404);
  });

  it('should return 503 without API key', async () => {
    delete process.env.CONGRESS_API_KEY;

    const request = createMockRequest('http://localhost:3000/api/bill/119-hr-1/votes');
    const response = await GET(request, { params: Promise.resolve({ billId: '119-hr-1' }) });

    expect(response.status).toBe(503);
  });

  it('should include metadata with dataSources', async () => {
    const request = createMockRequest('http://localhost:3000/api/bill/119-hr-1/votes');
    const response = await GET(request, { params: Promise.resolve({ billId: '119-hr-1' }) });
    const data = await response.json();

    expect(data.metadata.dataSources).toContain('congress.gov');
    expect(data.metadata.generatedAt).toBeDefined();
    expect(data.metadata.dataQuality).toBe('complete');
  });
});
