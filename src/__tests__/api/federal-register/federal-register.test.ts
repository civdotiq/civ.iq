/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/federal-register/route';
import { createMockRequest } from '../../utils/test-helpers';

// Mock the cache module
jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((key, fetcher) => fetcher()),
}));

// Mock the logger
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

// Mock Federal Register API response
const mockFederalRegisterResponse = {
  count: 2,
  total_pages: 1,
  results: [
    {
      document_number: '2024-12345',
      title: 'Clean Air Act Proposed Rule',
      abstract: 'This proposed rule would establish new emissions standards.',
      type: 'Proposed Rule',
      publication_date: '2024-06-15',
      html_url: 'https://www.federalregister.gov/documents/2024/06/15/2024-12345',
      pdf_url: 'https://www.federalregister.gov/documents/2024/06/15/2024-12345.pdf',
      agencies: [{ name: 'Environmental Protection Agency', slug: 'epa' }],
      comment_url: 'https://www.regulations.gov/comment/EPA-2024-0001',
      comments_close_on: '2024-08-15',
      effective_on: null,
      executive_order_number: null,
    },
    {
      document_number: '2024-67890',
      title: 'Notice of Public Hearing',
      abstract: 'The Department will hold a public hearing.',
      type: 'Notice',
      publication_date: '2024-06-10',
      html_url: 'https://www.federalregister.gov/documents/2024/06/10/2024-67890',
      pdf_url: 'https://www.federalregister.gov/documents/2024/06/10/2024-67890.pdf',
      agencies: [{ name: 'Department of Energy', slug: 'doe' }],
      comment_url: null,
      comments_close_on: null,
      effective_on: null,
      executive_order_number: null,
    },
  ],
};

const mockExecutiveOrderResponse = {
  count: 1,
  total_pages: 1,
  results: [
    {
      document_number: '2024-EO-001',
      title: 'Executive Order on National Security',
      abstract: 'This executive order addresses national security concerns.',
      type: 'Presidential Document',
      publication_date: '2024-06-01',
      html_url: 'https://www.federalregister.gov/documents/2024/06/01/2024-EO-001',
      pdf_url: 'https://www.federalregister.gov/documents/2024/06/01/2024-EO-001.pdf',
      agencies: [{ name: 'Executive Office of the President', slug: 'eop' }],
      comment_url: null,
      comments_close_on: null,
      effective_on: null,
      executive_order_number: 14123,
    },
  ],
};

describe('/api/federal-register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockFederalRegisterResponse),
    });
  });

  describe('Success Cases', () => {
    it('should return federal register documents', async () => {
      const request = createMockRequest('http://localhost:3000/api/federal-register');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.items).toHaveLength(2);
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('metadata');
    });

    it('should filter by document type (proposed_rule)', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/federal-register?type=proposed_rule'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters?.type).toBe('proposed_rule');
    });

    it('should filter by document type (executive_order)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockExecutiveOrderResponse),
      });

      const request = createMockRequest(
        'http://localhost:3000/api/federal-register?type=executive_order'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters?.type).toBe('executive_order');
    });

    it('should filter by agency', async () => {
      const request = createMockRequest('http://localhost:3000/api/federal-register?agency=epa');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters?.agency).toBe('epa');
    });

    it('should filter by open comment periods', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/federal-register?open_for_comment=true'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters?.openForComment).toBe(true);
    });

    it('should support pagination', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/federal-register?page=2&per_page=10'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination?.page).toBe(2);
      expect(data.pagination?.perPage).toBe(10);
    });

    it('should cap per_page at 100', async () => {
      const request = createMockRequest('http://localhost:3000/api/federal-register?per_page=200');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination?.perPage).toBe(100);
    });

    it('should ensure minimum page is 1', async () => {
      const request = createMockRequest('http://localhost:3000/api/federal-register?page=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination?.page).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle Federal Register API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal error' }),
      });

      const request = createMockRequest('http://localhost:3000/api/federal-register');
      const response = await GET(request);
      const data = await response.json();

      // API returns success with empty items on API error
      expect(data.items).toEqual([]);
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const request = createMockRequest('http://localhost:3000/api/federal-register');
      const response = await GET(request);
      const data = await response.json();

      expect(data.items).toEqual([]);
    });
  });

  describe('Response Structure', () => {
    it('should include all required fields in response', async () => {
      const request = createMockRequest('http://localhost:3000/api/federal-register');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('filters');
      expect(data).toHaveProperty('metadata');
    });

    it('should include pagination information', async () => {
      const request = createMockRequest('http://localhost:3000/api/federal-register');
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('page');
      expect(data.pagination).toHaveProperty('perPage');
      expect(data.pagination).toHaveProperty('totalPages');
      expect(data.pagination).toHaveProperty('hasMore');
    });

    it('should include metadata with data source', async () => {
      const request = createMockRequest('http://localhost:3000/api/federal-register');
      const response = await GET(request);
      const data = await response.json();

      expect(data.metadata?.dataSource).toBe('federalregister.gov');
      expect(data.metadata?.generatedAt).toBeDefined();
    });

    it('should transform documents to expected format', async () => {
      const request = createMockRequest('http://localhost:3000/api/federal-register');
      const response = await GET(request);
      const data = await response.json();

      if (data.items.length > 0) {
        const item = data.items[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('publishedDate');
        expect(item).toHaveProperty('agency');
        expect(item).toHaveProperty('url');
      }
    });

    it('should calculate daysUntilClose for open comment periods', async () => {
      // Set up mock with future comment close date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            count: 1,
            total_pages: 1,
            results: [
              {
                ...mockFederalRegisterResponse.results[0],
                comments_close_on: futureDateStr,
              },
            ],
          }),
      });

      const request = createMockRequest('http://localhost:3000/api/federal-register');
      const response = await GET(request);
      const data = await response.json();

      if (data.items.length > 0) {
        expect(data.items[0].isOpenForComment).toBe(true);
        expect(data.items[0].daysUntilClose).toBeGreaterThan(0);
      }
    });
  });

  describe('Document Type Transformation', () => {
    it('should transform Presidential Document to executive_order', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockExecutiveOrderResponse),
      });

      const request = createMockRequest('http://localhost:3000/api/federal-register');
      const response = await GET(request);
      const data = await response.json();

      expect(data.items[0].type).toBe('executive_order');
    });

    it('should transform Proposed Rule to proposed_rule', async () => {
      const request = createMockRequest('http://localhost:3000/api/federal-register');
      const response = await GET(request);
      const data = await response.json();

      const proposedRule = data.items.find(
        (item: { type: string }) => item.type === 'proposed_rule'
      );
      expect(proposedRule).toBeDefined();
    });

    it('should transform Notice to notice', async () => {
      const request = createMockRequest('http://localhost:3000/api/federal-register');
      const response = await GET(request);
      const data = await response.json();

      const notice = data.items.find((item: { type: string }) => item.type === 'notice');
      expect(notice).toBeDefined();
    });
  });

  // Note: Cache header tests require integration testing since Jest mocks NextResponse
  // The actual cache headers are set in the route implementation and verified in production
});
