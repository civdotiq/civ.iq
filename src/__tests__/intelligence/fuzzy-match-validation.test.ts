/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for token-overlap validation in fuzzy org name matching.
 *
 * Levenshtein similarity alone produces false positives for names that
 * differ by a single word (e.g., "Health" vs "Heart"). Token overlap
 * acts as a second gate to prevent wrong-org attribution.
 */

// Mock dependencies pulled in by the influence-chain-analyzer import chain
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/ai/provider', () => ({
  generateAIText: jest.fn(),
}));

jest.mock('@/lib/ai/plain-language', () => ({
  PLAIN_LANGUAGE_RULES: '',
  PLAIN_LANGUAGE_SYSTEM_PROMPT: '',
}));

jest.mock('@/features/legislation/services/ai/reading-level-validator', () => ({
  ReadingLevelValidator: { meetsTarget: jest.fn().mockReturnValue(true) },
}));

jest.mock('@/features/legislation/services/ai/bill-summary-cache', () => ({
  BillSummaryCache: { getSummary: jest.fn() },
}));

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({ get: jest.fn(), set: jest.fn(), keys: jest.fn(), mget: jest.fn() }),
}));

jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: jest.fn(),
}));

jest.mock('@/lib/data/bioguide-fec-mapping', () => ({
  getFECIdFromBioguide: jest.fn(),
}));

jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: { getSampleContributions: jest.fn() },
}));

jest.mock('@/features/representatives/services/batch-voting-service', () => ({
  batchVotingService: { getHouseMemberVotes: jest.fn(), getSenateMemberVotes: jest.fn() },
}));

jest.mock('@/lib/data-sources/senate-lobbying-api', () => ({
  senateLobbyingAPI: { fetchRecentFilings: jest.fn() },
}));

jest.mock('@/lib/intelligence/entity-resolution/lobbying-committee-resolver', () => ({
  resolveFilingEntities: jest.fn(),
  getResolvedCommittees: jest.fn(),
}));

jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [],
}));

jest.mock('@/lib/connections/policy-area-map', () => ({
  getIndustrySectorsForPolicyArea: jest.fn().mockReturnValue([]),
}));

import { validateTokenOverlap } from '@/lib/intelligence/analyzers/influence-chain-analyzer';

describe('validateTokenOverlap', () => {
  it('rejects "american health association" vs "american heart association"', () => {
    expect(validateTokenOverlap('american health association', 'american heart association')).toBe(
      false
    );
  });

  it('accepts "raytheon" vs "raytheon technologies"', () => {
    expect(validateTokenOverlap('raytheon', 'raytheon technologies')).toBe(true);
  });

  it('accepts "lockheed martin" vs "lockheed martin corporation"', () => {
    expect(validateTokenOverlap('lockheed martin', 'lockheed martin corporation')).toBe(true);
  });

  it('accepts "boeing" vs "the boeing company"', () => {
    expect(validateTokenOverlap('boeing', 'the boeing company')).toBe(true);
  });

  it('accepts "pfizer" vs "pfizer inc"', () => {
    expect(validateTokenOverlap('pfizer', 'pfizer inc')).toBe(true);
  });

  it('accepts "northrop grumman" vs "northrup grumman" (typo)', () => {
    // "northrop" vs "northrup" = 1 char diff, similarity ~0.875 > 0.75 token threshold
    expect(validateTokenOverlap('northrop grumman', 'northrup grumman')).toBe(true);
  });
});
