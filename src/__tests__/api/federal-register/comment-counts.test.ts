/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { NextRequest } from 'next/server';
import { POST } from '@/app/api/federal-register/comments/counts/route';
import { regulationsGovService } from '@/lib/data-sources/regulations-gov-service';

jest.mock('@/lib/data-sources/regulations-gov-service', () => ({
  regulationsGovService: {
    searchDocuments: jest.fn(),
    getCommentStats: jest.fn(),
  },
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

const mockSearch = regulationsGovService.searchDocuments as jest.Mock;
const mockStats = regulationsGovService.getCommentStats as jest.Mock;

// The route only reads request.json(); stub it directly. NextRequest body-stream
// parsing is unreliable under the jsdom test env, so we avoid it.
function postRequest(body: unknown, opts?: { invalidJson?: boolean }): NextRequest {
  return {
    json: async () => {
      if (opts?.invalidJson) throw new SyntaxError('Unexpected token');
      return body;
    },
  } as unknown as NextRequest;
}

describe('POST /api/federal-register/comments/counts', () => {
  const ORIGINAL_KEY = process.env.DATA_GOV_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATA_GOV_API_KEY = 'test-key';
  });

  afterAll(() => {
    process.env.DATA_GOV_API_KEY = ORIGINAL_KEY;
  });

  it('rejects a non-array documentNumbers field with 400', async () => {
    const response = await POST(postRequest({ documentNumbers: 'not-an-array' }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON with 400', async () => {
    const response = await POST(postRequest(null, { invalidJson: true }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('returns empty counts for an empty array without calling the service', async () => {
    const response = await POST(postRequest({ documentNumbers: [] }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.counts).toEqual({});
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('returns empty counts when the API key is absent', async () => {
    delete process.env.DATA_GOV_API_KEY;
    const response = await POST(postRequest({ documentNumbers: ['2025-AAA'] }));
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.counts).toEqual({});
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('resolves comment totals per document, defaulting unmatched docs to 0', async () => {
    mockSearch.mockImplementation(async ({ searchTerm }: { searchTerm: string }) =>
      searchTerm === '2025-AAA'
        ? [{ docketId: 'DKT-A', documentId: 'D-A', title: 't', agencyId: 'EPA' }]
        : []
    );
    mockStats.mockResolvedValue({ total: 412 });

    const response = await POST(postRequest({ documentNumbers: ['2025-AAA', '2025-BBB'] }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.counts).toEqual({ '2025-AAA': 412, '2025-BBB': 0 });
    expect(data.metadata.dataSource).toBe('regulations.gov');
  });

  it('deduplicates repeated document numbers', async () => {
    mockSearch.mockResolvedValue([
      { docketId: 'DKT-A', documentId: 'D-A', title: 't', agencyId: 'EPA' },
    ]);
    mockStats.mockResolvedValue({ total: 5 });

    const response = await POST(
      postRequest({ documentNumbers: ['2025-AAA', '2025-AAA', ' 2025-AAA '] })
    );
    const data = await response.json();

    expect(data.counts).toEqual({ '2025-AAA': 5 });
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it('still returns counts for healthy docs when one lookup throws', async () => {
    mockSearch.mockImplementation(async ({ searchTerm }: { searchTerm: string }) => {
      if (searchTerm === '2025-BAD') throw new Error('upstream 500');
      return [{ docketId: 'DKT-A', documentId: 'D-A', title: 't', agencyId: 'EPA' }];
    });
    mockStats.mockResolvedValue({ total: 9 });

    const response = await POST(postRequest({ documentNumbers: ['2025-AAA', '2025-BAD'] }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.counts['2025-AAA']).toBe(9);
    expect(data.counts['2025-BAD']).toBeUndefined();
  });
});
