/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for shared intelligence analyzer utilities.
 */

// Mock AI provider
jest.mock('@/lib/ai/provider', () => ({
  generateAIText: jest.fn(),
}));

// Mock Redis cache
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock logger
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock BillSummaryCache
const mockGetSummary = jest.fn();
jest.mock('@/features/legislation/services/ai/bill-summary-cache', () => ({
  BillSummaryCache: { getSummary: (...args: unknown[]) => mockGetSummary(...args) },
}));

// Mock embedding classifier
const mockClassifyBillSectors = jest.fn();
const mockClassifyBillSectorsZeroShot = jest.fn();
jest.mock('@/lib/intelligence/embeddings', () => ({
  classifyBillSectors: (...args: unknown[]) => mockClassifyBillSectors(...args),
  classifyBillSectorsZeroShot: (...args: unknown[]) => mockClassifyBillSectorsZeroShot(...args),
}));

// Mock ReadingLevelValidator
const mockMeetsTarget = jest.fn();
jest.mock('@/features/legislation/services/ai/reading-level-validator', () => ({
  ReadingLevelValidator: { meetsTarget: (...args: unknown[]) => mockMeetsTarget(...args) },
}));

// Mock policy-area-map
jest.mock('@/lib/connections/policy-area-map', () => ({
  getIndustrySectorsForPolicyArea: jest.fn((area: string) => {
    const map: Record<string, string[]> = {
      Health: ['HEALTH'],
      'Armed Forces and National Security': ['DEFENSE'],
      Taxation: ['FINANCE_INSURANCE_REAL_ESTATE'],
      Energy: ['ENERGY_NATURAL_RESOURCES'],
    };
    return map[area] ?? [];
  }),
}));

// Mock committee-agency-map with realistic entries
jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [
    {
      committeeCode: 'HSAG',
      committeeName: 'Agriculture',
      topics: ['Agriculture', 'Food'],
    },
    {
      committeeCode: 'HSAP',
      committeeName: 'Appropriations',
      topics: ['Appropriations'],
    },
    {
      committeeCode: 'HSWM',
      committeeName: 'Ways and Means',
      topics: ['Taxation'],
    },
  ],
}));

import { generateAIText } from '@/lib/ai/provider';
import {
  getCurrentElectionCycle,
  findCommitteeMapping,
  getBillSectors,
  inferSectorsFromTitle,
  generateInsightNarrative,
} from '@/lib/intelligence/analyzers/shared';

const mockGenerateAIText = generateAIText as jest.MockedFunction<typeof generateAIText>;

describe('shared intelligence utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getCurrentElectionCycle ──────────────────────────────────────

  describe('getCurrentElectionCycle', () => {
    it('returns an even year', () => {
      const cycle = getCurrentElectionCycle();
      expect(cycle % 2).toBe(0);
    });

    it('returns current year if even', () => {
      const realYear = new Date().getFullYear();
      const expected = realYear % 2 === 0 ? realYear : realYear + 1;
      expect(getCurrentElectionCycle()).toBe(expected);
    });
  });

  // ── findCommitteeMapping ────────────────────────────────────────

  describe('findCommitteeMapping', () => {
    it('finds exact match', () => {
      const result = findCommitteeMapping('Agriculture');
      expect(result?.committeeCode).toBe('HSAG');
    });

    it('finds substring match when input contains mapping name', () => {
      const result = findCommitteeMapping('Committee on Agriculture');
      expect(result?.committeeCode).toBe('HSAG');
    });

    it('finds substring match when mapping name contains input', () => {
      const result = findCommitteeMapping('Ways and Means');
      expect(result?.committeeCode).toBe('HSWM');
    });

    it('is case insensitive', () => {
      const result = findCommitteeMapping('AGRICULTURE');
      expect(result?.committeeCode).toBe('HSAG');
    });

    it('returns undefined for no match', () => {
      const result = findCommitteeMapping('Nonexistent Committee');
      expect(result).toBeUndefined();
    });
  });

  // ── getBillSectors ──────────────────────────────────────────────

  describe('getBillSectors', () => {
    it('returns AI-classified sectors from cache (step 1)', async () => {
      mockGetSummary.mockResolvedValue({
        affectedIndustries: ['HEALTH', 'DEFENSE'],
      });

      const sectors = await getBillSectors('HR1234-119', 'Some bill');
      expect(sectors).toEqual(['HEALTH', 'DEFENSE']);
      expect(mockGetSummary).toHaveBeenCalledWith('HR1234-119');
      // Embedding classifier should NOT be called when cache hits
      expect(mockClassifyBillSectors).not.toHaveBeenCalled();
    });

    it('uses embedding classifier when cache misses (step 2)', async () => {
      mockGetSummary.mockResolvedValue(null);
      mockClassifyBillSectors.mockResolvedValue([
        { sector: 'Communications/Electronics', confidence: 0.72 },
      ]);

      const sectors = await getBillSectors('HR1234-119', 'CHIPS and Science Act');
      expect(sectors).toEqual(['Communications/Electronics']);
      expect(mockClassifyBillSectors).toHaveBeenCalledWith('CHIPS and Science Act');
    });

    it('uses zero-shot when embeddings return empty (step 3)', async () => {
      mockGetSummary.mockResolvedValue(null);
      mockClassifyBillSectors.mockResolvedValue([]);
      mockClassifyBillSectorsZeroShot.mockResolvedValue([{ sector: 'Health', confidence: 0.72 }]);

      const sectors = await getBillSectors('HR1234-119', 'Medicare Health Improvement Act');
      expect(sectors).toEqual(['Health']);
      expect(mockClassifyBillSectorsZeroShot).toHaveBeenCalledWith(
        'Medicare Health Improvement Act'
      );
    });

    it('falls back to keywords when zero-shot returns empty (step 4)', async () => {
      mockGetSummary.mockResolvedValue(null);
      mockClassifyBillSectors.mockResolvedValue([]);
      mockClassifyBillSectorsZeroShot.mockResolvedValue([]);

      const sectors = await getBillSectors('HR1234-119', 'Medicare Health Improvement Act');
      expect(sectors.length).toBeGreaterThan(0);
      expect(sectors).toContain('HEALTH');
    });

    it('falls back to keywords when embeddings throw (step 3 to step 4)', async () => {
      mockGetSummary.mockResolvedValue(null);
      mockClassifyBillSectors.mockRejectedValue(new Error('Model failed'));
      mockClassifyBillSectorsZeroShot.mockResolvedValue([]);

      const sectors = await getBillSectors('HR1234-119', 'Defense Authorization Act');
      expect(sectors).toContain('DEFENSE');
    });

    it('falls back through all 4 steps gracefully', async () => {
      mockGetSummary.mockRejectedValue(new Error('Redis error'));
      mockClassifyBillSectors.mockRejectedValue(new Error('WASM error'));
      mockClassifyBillSectorsZeroShot.mockRejectedValue(new Error('NLI error'));

      const sectors = await getBillSectors('HR1234-119', 'Defense Authorization Act');
      // Step 4 keywords should still work
      expect(sectors).toContain('DEFENSE');
    });

    it('skips zero-shot when embeddings succeed', async () => {
      mockGetSummary.mockResolvedValue(null);
      mockClassifyBillSectors.mockResolvedValue([
        { sector: 'Communications/Electronics', confidence: 0.72 },
      ]);

      await getBillSectors('HR1234-119', 'CHIPS Act');
      expect(mockClassifyBillSectorsZeroShot).not.toHaveBeenCalled();
    });

    it('returns empty array when all steps fail for unrecognized title', async () => {
      mockGetSummary.mockResolvedValue(null);
      mockClassifyBillSectors.mockResolvedValue([]);
      mockClassifyBillSectorsZeroShot.mockResolvedValue([]);

      const sectors = await getBillSectors('HR1234-119', 'Resolution on procedural matters');
      expect(sectors).toEqual([]);
    });
  });

  // ── inferSectorsFromTitle ───────────────────────────────────────

  describe('inferSectorsFromTitle', () => {
    it('maps health keywords to HEALTH sector', () => {
      const sectors = inferSectorsFromTitle('Medicare Improvement Act');
      expect(sectors).toContain('HEALTH');
    });

    it('maps defense keywords to DEFENSE sector', () => {
      const sectors = inferSectorsFromTitle('Military Readiness Act');
      expect(sectors).toContain('DEFENSE');
    });

    it('maps multiple keywords to multiple sectors', () => {
      const sectors = inferSectorsFromTitle('Health and Defense Authorization');
      expect(sectors.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty array for unrecognized title', () => {
      const sectors = inferSectorsFromTitle('Resolution on procedural matters');
      expect(sectors).toEqual([]);
    });

    it('deduplicates sectors', () => {
      const sectors = inferSectorsFromTitle('Medicare health drug pharmaceutical');
      const unique = new Set(sectors);
      expect(sectors.length).toBe(unique.size);
    });
  });

  // ── generateInsightNarrative ────────────────────────────────────

  describe('generateInsightNarrative', () => {
    it('returns AI narrative on success', async () => {
      mockGenerateAIText.mockResolvedValue('This is an AI-generated narrative.');
      mockMeetsTarget.mockReturnValue(true);

      const result = await generateInsightNarrative(
        'System context',
        'User prompt',
        'Fallback text',
        '[Test]'
      );

      expect(result.narrative).toBe('This is an AI-generated narrative.');
      expect(result.source).toBe('ai-generated');
    });

    it('retries on reading level failure then succeeds', async () => {
      mockGenerateAIText
        .mockResolvedValueOnce('Too complex narrative.')
        .mockResolvedValueOnce('Simple narrative.');
      mockMeetsTarget.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const result = await generateInsightNarrative(
        'System context',
        'User prompt',
        'Fallback text',
        '[Test]'
      );

      expect(result.narrative).toBe('Simple narrative.');
      expect(result.source).toBe('ai-generated');
      expect(mockGenerateAIText).toHaveBeenCalledTimes(2);
    });

    it('falls back to statistical summary after max retries', async () => {
      mockGenerateAIText.mockResolvedValue('Complex text.');
      mockMeetsTarget.mockReturnValue(false);

      const result = await generateInsightNarrative(
        'System context',
        'User prompt',
        'Statistical fallback text',
        '[Test]'
      );

      expect(result.narrative).toBe('Statistical fallback text');
      expect(result.source).toBe('statistical-fallback');
      expect(mockGenerateAIText).toHaveBeenCalledTimes(3);
    });

    it('falls back when AI returns null', async () => {
      mockGenerateAIText.mockResolvedValue(null);

      const result = await generateInsightNarrative(
        'System context',
        'User prompt',
        'Fallback',
        '[Test]'
      );

      expect(result.narrative).toBe('Fallback');
      expect(result.source).toBe('statistical-fallback');
    });

    it('falls back when AI throws', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('API error'));

      const result = await generateInsightNarrative(
        'System context',
        'User prompt',
        'Fallback',
        '[Test]'
      );

      expect(result.narrative).toBe('Fallback');
      expect(result.source).toBe('statistical-fallback');
    });
  });
});
