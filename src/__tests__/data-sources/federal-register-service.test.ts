/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Federal Register Service — Phase 2 extensions.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fn: () => Promise<unknown>) => fn()),
}));

jest.mock('@civiq/entity-resolution', () => ({
  getAgenciesForCommittee: jest.fn().mockReturnValue([
    {
      name: 'Environmental Protection Agency',
      slug: 'environmental-protection-agency',
      abbreviation: 'EPA',
      keywords: ['epa', 'environmental'],
    },
  ]),
}));

jest.mock('@/lib/connections/policy-area-map', () => ({
  getPolicyAreaMapping: jest.fn().mockReturnValue({
    policyArea: 'Environmental Protection',
    topics: ['environment'],
    industrySectors: [],
    agencySlugs: ['environmental-protection-agency'],
    federalRegisterKeywords: ['environmental', 'epa', 'pollution', 'clean air'],
  }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  searchAgencyRules,
  getDocumentsByRIN,
  findRegulationsForBill,
} from '@/lib/data-sources/federal-register-service';

// ── Test Data ─────────────────────────────────────────────────────

const makeFRDoc = (overrides: Record<string, unknown> = {}) => ({
  document_number: '2025-00001',
  title: 'Clean Air Standards Update',
  abstract: 'Environmental regulation update for pollution limits',
  type: 'Rule',
  publication_date: '2025-03-15',
  html_url: 'https://federalregister.gov/d/2025-00001',
  pdf_url: 'https://federalregister.gov/d/2025-00001.pdf',
  regulation_id_number: '2060-A001',
  agencies: [
    {
      raw_name: 'Environmental Protection Agency',
      name: 'Environmental Protection Agency',
      id: 145,
      url: 'https://federalregister.gov/agencies/epa',
      json_url: 'https://federalregister.gov/api/v1/agencies/145',
      parent_id: null,
      slug: 'environmental-protection-agency',
    },
  ],
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────

describe('searchAgencyRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches rules from Federal Register for an agency', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        count: 1,
        results: [makeFRDoc()],
      }),
    });

    const results = await searchAgencyRules('environmental-protection-agency');

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Clean Air Standards Update');
    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('environmental-protection-agency');
  });

  it('returns empty on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const results = await searchAgencyRules('environmental-protection-agency');
    expect(results).toEqual([]);
  });

  it('passes date range filters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 0, results: [] }),
    });

    await searchAgencyRules('environmental-protection-agency', {
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    });

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('2025-01-01');
    expect(calledUrl).toContain('2025-12-31');
  });
});

describe('getDocumentsByRIN', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches documents by regulation ID number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        count: 1,
        results: [makeFRDoc({ regulation_id_number: '2060-A001' })],
      }),
    });

    const results = await getDocumentsByRIN('2060-A001');

    expect(results).toHaveLength(1);
    expect(results[0]?.regulation_id_number).toBe('2060-A001');
  });

  it('returns empty when no documents match RIN', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 0, results: [] }),
    });

    const results = await getDocumentsByRIN('0000-XXXX');
    expect(results).toEqual([]);
  });
});

describe('findRegulationsForBill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('finds regulations via RIN with 0.95 confidence', async () => {
    // RIN search
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        count: 1,
        results: [makeFRDoc({ regulation_id_number: '2060-A001' })],
      }),
    });

    // Committee-agency search (also runs)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 0, results: [] }),
    });

    const results = await findRegulationsForBill(
      'Clean Air Act Amendment',
      'Environmental Protection',
      ['Energy and Commerce'],
      '2060-A001'
    );

    expect(results.length).toBeGreaterThanOrEqual(1);
    const rinResult = results.find(r => r.linkMethod === 'rin');
    expect(rinResult).toBeDefined();
    expect(rinResult?.linkConfidence).toBe(0.95);
  });

  it('finds regulations via committee-agency with 0.80 confidence', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        count: 1,
        results: [
          makeFRDoc({
            title: 'Environmental Pollution Limits',
            abstract: 'Updated clean air standards for epa enforcement',
          }),
        ],
      }),
    });

    const results = await findRegulationsForBill(
      'Environmental Standards Act',
      'Environmental Protection',
      ['Energy and Commerce']
    );

    expect(results.length).toBeGreaterThanOrEqual(1);
    const committeeResult = results.find(r => r.linkMethod === 'committee_agency');
    expect(committeeResult).toBeDefined();
    expect(committeeResult?.linkConfidence).toBe(0.80);
    expect(committeeResult?.agencySlug).toBe('environmental-protection-agency');
  });

  it('deduplicates regulations across methods', async () => {
    const sharedDoc = makeFRDoc({ regulation_id_number: '2060-A001' });

    // RIN search returns a doc
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 1, results: [sharedDoc] }),
    });

    // Committee-agency search returns the same doc
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 1, results: [sharedDoc] }),
    });

    const results = await findRegulationsForBill(
      'Clean Air Act',
      'Environmental Protection',
      ['Energy and Commerce'],
      '2060-A001'
    );

    // Should not have duplicates
    const docketIds = results.map(r => r.docketId);
    const uniqueIds = new Set(docketIds);
    expect(docketIds.length).toBe(uniqueIds.size);
  });

  it('returns empty when no matching regulations', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 0, results: [] }),
    });

    const results = await findRegulationsForBill(
      'Unrelated Bill',
      'Congress',
      ['Foreign Affairs']
    );

    expect(results).toEqual([]);
  });
});
