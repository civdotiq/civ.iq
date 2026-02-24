/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/committee/[committeeId]/regulations/route';
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

const mockFedRegResponse = {
  count: 2,
  total_pages: 1,
  results: [
    {
      document_number: 'FR-2025-001',
      title: 'Proposed Rule on Energy Efficiency Standards',
      abstract: 'New energy efficiency standards for appliances',
      type: 'Proposed Rule',
      publication_date: '2025-02-01',
      html_url: 'https://federalregister.gov/d/FR-2025-001',
      pdf_url: 'https://federalregister.gov/d/FR-2025-001.pdf',
      agencies: [
        {
          name: 'Department of Energy',
          slug: 'department-of-energy',
          id: 1,
          url: '',
          json_url: '',
          parent_id: null,
          raw_name: 'DOE',
        },
      ],
      comment_url: null,
      comments_close_on: null,
      effective_on: null,
    },
    {
      document_number: 'FR-2025-002',
      title: 'Final Rule on Air Quality Standards',
      abstract: 'Updated air quality standards',
      type: 'Rule',
      publication_date: '2025-01-15',
      html_url: 'https://federalregister.gov/d/FR-2025-002',
      pdf_url: 'https://federalregister.gov/d/FR-2025-002.pdf',
      agencies: [
        {
          name: 'EPA',
          slug: 'environmental-protection-agency',
          id: 2,
          url: '',
          json_url: '',
          parent_id: null,
          raw_name: 'EPA',
        },
      ],
      comment_url: null,
      comments_close_on: null,
      effective_on: '2025-03-01',
    },
  ],
};

describe('/api/committee/[committeeId]/regulations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFedRegResponse),
    });
  });

  it('should return regulations for a valid committee', async () => {
    const request = createMockRequest('http://localhost:3000/api/committee/HSIF/regulations');
    const response = await GET(request, { params: Promise.resolve({ committeeId: 'HSIF' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.committeeCode).toBe('HSIF');
    expect(data.committeeName).toBe('Energy and Commerce');
    expect(data.chamber).toBe('House');
    expect(data.oversightAgencies.length).toBeGreaterThan(0);
    expect(data.metadata.joinType).toBe('committee-regulations');
  });

  it('should return 404 for unknown committee code', async () => {
    const request = createMockRequest('http://localhost:3000/api/committee/XXXX/regulations');
    const response = await GET(request, { params: Promise.resolve({ committeeId: 'XXXX' }) });

    expect(response.status).toBe(404);
  });

  it('should handle case-insensitive committee codes', async () => {
    const request = createMockRequest('http://localhost:3000/api/committee/hsif/regulations');
    const response = await GET(request, { params: Promise.resolve({ committeeId: 'hsif' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.committeeCode).toBe('HSIF');
  });

  it('should group results into three categories', async () => {
    const request = createMockRequest('http://localhost:3000/api/committee/HSIF/regulations');
    const response = await GET(request, { params: Promise.resolve({ committeeId: 'HSIF' }) });
    const data = await response.json();

    expect(data).toHaveProperty('activeRulemakings');
    expect(data).toHaveProperty('openCommentPeriods');
    expect(data).toHaveProperty('recentFinalRules');
    expect(Array.isArray(data.activeRulemakings)).toBe(true);
    expect(Array.isArray(data.openCommentPeriods)).toBe(true);
    expect(Array.isArray(data.recentFinalRules)).toBe(true);
  });

  it('should include summary with document counts', async () => {
    const request = createMockRequest('http://localhost:3000/api/committee/HSIF/regulations');
    const response = await GET(request, { params: Promise.resolve({ committeeId: 'HSIF' }) });
    const data = await response.json();

    expect(data.summary).toHaveProperty('totalDocuments');
    expect(data.summary).toHaveProperty('openComments');
    expect(data.summary).toHaveProperty('urgentComments');
    expect(typeof data.summary.totalDocuments).toBe('number');
  });

  it('should handle Federal Register API errors gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const request = createMockRequest('http://localhost:3000/api/committee/HSIF/regulations');
    const response = await GET(request, { params: Promise.resolve({ committeeId: 'HSIF' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.totalDocuments).toBe(0);
  });

  it('should work for Senate committees', async () => {
    const request = createMockRequest('http://localhost:3000/api/committee/SSEG/regulations');
    const response = await GET(request, { params: Promise.resolve({ committeeId: 'SSEG' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.committeeCode).toBe('SSEG');
    expect(data.chamber).toBe('Senate');
  });
});
