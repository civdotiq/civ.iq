/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The Federal Register API filters by type CODE (RULE, PRORULE, PRESDOCU).
 * Display names ('Rule', 'Proposed Rule') are silently ignored and the API
 * answers 200 with count 0, which left this dataset empty (HTTP 503).
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fn: () => Promise<unknown>) => fn()),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { generateFederalRegisterRules } from '@/lib/datasets/generators/federal-register-rules';

describe('generateFederalRegisterRules', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        count: 1,
        results: [
          {
            document_number: '2026-19417',
            title: 'Example Rule',
            type: 'Rule',
            publication_date: '2026-09-22',
            html_url: 'https://www.federalregister.gov/d/2026-19417',
            pdf_url: 'https://www.govinfo.gov/2026-19417.pdf',
            agencies: [{ name: 'Environmental Protection Agency' }],
          },
        ],
      }),
    });
  });

  it('filters by Federal Register type codes, not display names', async () => {
    await generateFederalRegisterRules();

    const url = decodeURIComponent(String(mockFetch.mock.calls[0]?.[0]));
    expect(url).toContain('conditions[type][]=RULE');
    expect(url).toContain('conditions[type][]=PRORULE');
    expect(url).toContain('conditions[type][]=PRESDOCU');
    expect(url).not.toContain('conditions[type][]=Rule');
    expect(url).not.toMatch(/conditions\[type\]\[\]=Proposed/);
  });

  it('maps upstream documents to dataset rows', async () => {
    const result = await generateFederalRegisterRules();

    expect(result.data).toHaveLength(1);
    expect(result.metadata.recordCount).toBe(1);
    expect(result.data[0]).toMatchObject({
      documentNumber: '2026-19417',
      type: 'Rule',
      agencies: 'Environmental Protection Agency',
      publicationDate: '2026-09-22',
    });
  });
});
