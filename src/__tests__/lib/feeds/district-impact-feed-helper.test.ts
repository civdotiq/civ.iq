/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * District Impact Feed Helper Tests
 *
 * Tests that cached district impacts are correctly read from Redis
 * and converted to Atom feed entries.
 */

import type { DistrictImpact } from '@/types/district-impact';

// Mock Redis client
const mockKeys = jest.fn();
const mockGet = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    keys: mockKeys,
    get: mockGet,
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { getCachedDistrictImpactEntries } from '@/lib/feeds/district-impact-feed-helper';

const MOCK_IMPACT: DistrictImpact = {
  billId: '119-hr-1',
  districtId: 'MI-12',
  overallImpact: 'High',
  summary: 'Significant impact on district infrastructure',
  economicImpact: 'Positive GDP growth',
  infrastructureImpact: 'Road improvements',
  affectedGroups: [{ group: 'Workers', impact: 'Job creation', scale: 'Large' }],
  relevantDistrictData: [{ metric: 'Population', value: '700000', context: 'Census 2020' }],
  confidence: 0.85,
  lastUpdated: '2025-01-15T00:00:00Z',
  source: 'ai-generated',
};

describe('District Impact Feed Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no cached impacts exist', async () => {
    mockKeys.mockResolvedValue([]);
    const entries = await getCachedDistrictImpactEntries('MI-12', 'https://civdotiq.org');
    expect(entries).toEqual([]);
  });

  it('should convert cached impacts to Atom entries', async () => {
    mockKeys.mockResolvedValue(['civiq:district-impact:119-hr-1:MI-12']);
    mockGet.mockResolvedValue(MOCK_IMPACT);

    const entries = await getCachedDistrictImpactEntries('MI-12', 'https://civdotiq.org');

    expect(entries).toHaveLength(1);
    expect(entries[0]!.title).toContain('119-hr-1');
    expect(entries[0]!.title).toContain('High');
    expect(entries[0]!.summary).toBe('Significant impact on district infrastructure');
  });

  it('should include correct Atom entry structure', async () => {
    mockKeys.mockResolvedValue(['civiq:district-impact:119-hr-1:MI-12']);
    mockGet.mockResolvedValue(MOCK_IMPACT);

    const entries = await getCachedDistrictImpactEntries('MI-12', 'https://civdotiq.org');
    const entry = entries[0]!;

    expect(entry.id).toContain('MI-12');
    expect(entry.id).toContain('#impact-119-hr-1');
    expect(entry.link).toContain('/bill/119-hr-1');
    expect(entry.updated).toBeInstanceOf(Date);
    expect(entry.categories).toEqual([
      { term: 'district-impact', label: 'District Impact' },
      { term: 'high', label: 'High' },
    ]);
  });

  it('should strip Redis prefix from keys before get()', async () => {
    mockKeys.mockResolvedValue(['civiq:district-impact:119-hr-1:MI-12']);
    mockGet.mockResolvedValue(MOCK_IMPACT);

    await getCachedDistrictImpactEntries('MI-12', 'https://civdotiq.org');

    // get() should be called with the key WITHOUT the civiq: prefix
    expect(mockGet).toHaveBeenCalledWith('district-impact:119-hr-1:MI-12');
  });

  it('should handle keys without prefix gracefully', async () => {
    mockKeys.mockResolvedValue(['district-impact:119-hr-1:MI-12']);
    mockGet.mockResolvedValue(MOCK_IMPACT);

    const entries = await getCachedDistrictImpactEntries('MI-12', 'https://civdotiq.org');
    expect(entries).toHaveLength(1);
  });

  it('should limit to 10 impacts', async () => {
    const keys = Array.from(
      { length: 15 },
      (_, i) => `civiq:district-impact:119-hr-${i + 1}:MI-12`
    );
    mockKeys.mockResolvedValue(keys);
    mockGet.mockResolvedValue(MOCK_IMPACT);

    const entries = await getCachedDistrictImpactEntries('MI-12', 'https://civdotiq.org');
    expect(entries.length).toBeLessThanOrEqual(10);
  });

  it('should skip impacts that fail to load from cache', async () => {
    mockKeys.mockResolvedValue([
      'civiq:district-impact:119-hr-1:MI-12',
      'civiq:district-impact:119-hr-2:MI-12',
    ]);
    mockGet.mockResolvedValueOnce(MOCK_IMPACT).mockRejectedValueOnce(new Error('Cache read error'));

    const entries = await getCachedDistrictImpactEntries('MI-12', 'https://civdotiq.org');
    expect(entries).toHaveLength(1);
  });

  it('should return empty array when Redis is unavailable', async () => {
    mockKeys.mockRejectedValue(new Error('Connection refused'));

    const entries = await getCachedDistrictImpactEntries('MI-12', 'https://civdotiq.org');
    expect(entries).toEqual([]);
  });

  it('should skip null impacts from cache', async () => {
    mockKeys.mockResolvedValue(['civiq:district-impact:119-hr-1:MI-12']);
    mockGet.mockResolvedValue(null);

    const entries = await getCachedDistrictImpactEntries('MI-12', 'https://civdotiq.org');
    expect(entries).toEqual([]);
  });
});
