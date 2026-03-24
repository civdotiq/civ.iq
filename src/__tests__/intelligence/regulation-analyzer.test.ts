/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Regulation Analyzer (Phase 2 — Influence Graph).
 */

// ── Mocks ─────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisMget = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    mget: mockRedisMget,
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/ai/provider', () => ({
  generateAIText: jest.fn().mockResolvedValue('AI narrative about regulations.'),
}));

jest.mock('@/lib/ai/plain-language', () => ({
  PLAIN_LANGUAGE_RULES: 'Use plain language.',
  PLAIN_LANGUAGE_SYSTEM_PROMPT: 'Write in plain language. Output valid JSON only.',
}));

jest.mock('@/features/legislation/services/ai/reading-level-validator', () => ({
  ReadingLevelValidator: { meetsTarget: jest.fn().mockReturnValue(true) },
}));

jest.mock('@/lib/analytics/insight-tracker', () => ({
  trackInsightRun: jest.fn(),
  ANALYZER_NAMES: ['regulation'] as const,
}));

const mockSearchAgencyRules = jest.fn();
jest.mock('@/lib/data-sources/federal-register-service', () => ({
  searchAgencyRules: (...args: unknown[]) => mockSearchAgencyRules(...args),
}));

const mockGetOrganizationComments = jest.fn();
jest.mock('@/lib/data-sources/regulations-gov-service', () => ({
  regulationsGovService: {
    getOrganizationComments: (...args: unknown[]) => mockGetOrganizationComments(...args),
  },
}));

const mockFetchRecentFilings = jest.fn();
jest.mock('@/lib/data-sources/senate-lobbying-api', () => ({
  senateLobbyingAPI: {
    fetchRecentFilings: (...args: unknown[]) => mockFetchRecentFilings(...args),
  },
}));

jest.mock('@/lib/intelligence/entity-resolution/lobbying-committee-resolver', () => ({
  resolveFilingEntities: jest.fn().mockReturnValue([]),
  getResolvedCommittees: jest.fn().mockReturnValue([{ committeeCode: 'HSIF' }]),
}));

jest.mock('@/lib/connections/committee-agency-map', () => ({
  getCommitteesForAgency: jest.fn().mockReturnValue([
    {
      committeeCode: 'HSIF',
      committeeName: 'Energy and Commerce',
      chamber: 'House',
      agencies: [
        {
          name: 'Environmental Protection Agency',
          slug: 'environmental-protection-agency',
          abbreviation: 'EPA',
          keywords: ['epa', 'environmental'],
        },
      ],
      topics: ['energy', 'environment'],
    },
  ]),
  ALL_COMMITTEE_MAPPINGS: [
    {
      committeeCode: 'HSIF',
      committeeName: 'Energy and Commerce',
      chamber: 'House',
      agencies: [
        {
          name: 'Environmental Protection Agency',
          slug: 'environmental-protection-agency',
          abbreviation: 'EPA',
          keywords: ['epa'],
        },
      ],
      topics: ['energy', 'environment'],
    },
    {
      committeeCode: 'HSAG',
      committeeName: 'Agriculture',
      chamber: 'House',
      agencies: [
        {
          name: 'Department of Agriculture',
          slug: 'department-of-agriculture',
          abbreviation: 'USDA',
          keywords: ['agriculture'],
        },
      ],
      topics: ['agriculture'],
    },
    {
      committeeCode: 'HSAS',
      committeeName: 'Armed Services',
      chamber: 'House',
      agencies: [
        {
          name: 'Department of Defense',
          slug: 'department-of-defense',
          abbreviation: 'DOD',
          keywords: ['defense'],
        },
      ],
      topics: ['defense'],
    },
  ],
}));

import { analyzeRegulations } from '@/lib/intelligence/analyzers/regulation-analyzer';

// ── Test Data ─────────────────────────────────────────────────────

function makeFRDocs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    document_number: `2025-${String(i + 1).padStart(5, '0')}`,
    title: `Environmental Rule ${i + 1}`,
    abstract: `Regulation about pollution standards ${i + 1}`,
    type: i % 2 === 0 ? 'Rule' : 'Proposed Rule',
    publication_date: `2025-0${(i % 9) + 1}-15`,
    html_url: `https://federalregister.gov/d/2025-${String(i + 1).padStart(5, '0')}`,
    pdf_url: `https://federalregister.gov/d/2025-${String(i + 1).padStart(5, '0')}.pdf`,
    comment_url: i % 2 === 1 ? 'https://regulations.gov/comment' : undefined,
    comments_close_on: i % 2 === 1 ? '2024-06-01' : undefined,
    effective_on: i % 2 === 0 ? '2025-07-01' : undefined,
    regulation_id_number: i < 3 ? `2060-A${String(i).padStart(3, '0')}` : undefined,
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
  }));
}

function makeFilings(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    filing_uuid: `filing-${i}`,
    filing_type: 'First Mid-Year Report',
    filingYear: 2025,
    income: 50000 + i * 10000,
    client: { name: `Environmental Org ${i}` },
    registrant: { name: `Lobby Firm ${i}` },
    government_entities: [{ name: 'House Committee on Energy and Commerce' }],
    issues: [{ code: 'ENV', description: 'Environmental' }],
    specific_issues: ['Clean air standards'],
  }));
}

// ── Tests ─────────────────────────────────────────────────────────

describe('analyzeRegulations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null); // No cache
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisMget.mockResolvedValue([]);
    mockFetchRecentFilings.mockResolvedValue([]);
    mockGetOrganizationComments.mockResolvedValue({ comments: [], total: 0 });
  });

  it('returns cached insight on cache hit', async () => {
    const cachedInsight = {
      agencySlug: 'environmental-protection-agency',
      agencyName: 'EPA',
      confidence: 0.8,
    };
    mockRedisGet.mockResolvedValueOnce(cachedInsight);

    const result = await analyzeRegulations('environmental-protection-agency');
    expect(result).toEqual(cachedInsight);
    expect(mockSearchAgencyRules).not.toHaveBeenCalled();
  });

  it('returns null when no committees oversee the agency', async () => {
    const { getCommitteesForAgency } = jest.requireMock(
      '@/lib/connections/committee-agency-map'
    ) as { getCommitteesForAgency: jest.Mock };
    getCommitteesForAgency.mockReturnValueOnce([]);

    const result = await analyzeRegulations('unknown-agency');
    expect(result).toBeNull();
  });

  it('returns null when no recent rules found', async () => {
    mockSearchAgencyRules.mockResolvedValueOnce([]);

    const result = await analyzeRegulations('environmental-protection-agency');
    expect(result).toBeNull();
  });

  it('returns null when fewer than MIN_REGULATION_LINKS rules', async () => {
    mockSearchAgencyRules.mockResolvedValueOnce(makeFRDocs(1));

    const result = await analyzeRegulations('environmental-protection-agency');
    expect(result).toBeNull();
  });

  it('computes insight with sufficient regulation data', async () => {
    mockSearchAgencyRules.mockResolvedValueOnce(makeFRDocs(5));
    mockFetchRecentFilings.mockResolvedValueOnce(makeFilings(3));

    const result = await analyzeRegulations('environmental-protection-agency');

    expect(result).not.toBeNull();
    expect(result?.agencySlug).toBe('environmental-protection-agency');
    expect(result?.agencyName).toBe('Environmental Protection Agency');
    expect(result?.regulationBillLinks.length).toBeGreaterThan(0);
    expect(result?.activeRulemakings).toBeGreaterThanOrEqual(0);
    expect(result?.finalizedRules).toBeGreaterThanOrEqual(0);
    expect(result?.confidence).toBeGreaterThan(0);
    expect(result?.disclaimer).toContain('Correlation');
    expect(result?.methodology).toContain('Federal Register');
  });

  it('includes InsightBase metadata', async () => {
    mockSearchAgencyRules.mockResolvedValueOnce(makeFRDocs(4));

    const result = await analyzeRegulations('environmental-protection-agency');

    expect(result).not.toBeNull();
    expect(result?.dataAsOf).toBeTruthy();
    expect(result?.lastAnalyzedAt).toBeTruthy();
    expect(result?.source).toMatch(/^(ai-generated|statistical-fallback)$/);
  });

  it('caches result on success', async () => {
    mockSearchAgencyRules.mockResolvedValueOnce(makeFRDocs(3));

    await analyzeRegulations('environmental-protection-agency');

    // Should cache the insight and the regulation score
    expect(mockRedisSet).toHaveBeenCalled();
  });

  it('detects lobbying-comment overlap', async () => {
    mockSearchAgencyRules.mockResolvedValueOnce(makeFRDocs(5));
    mockFetchRecentFilings.mockResolvedValueOnce(makeFilings(3));
    mockGetOrganizationComments.mockResolvedValue({ comments: [{ id: 'c1' }], total: 2 });

    const result = await analyzeRegulations('environmental-protection-agency');

    expect(result).not.toBeNull();
    // Should have attempted overlap detection
    expect(result?.lobbyingCommentOverlap).toBeDefined();
  });

  it('handles lobbying fetch failure gracefully', async () => {
    mockSearchAgencyRules.mockResolvedValueOnce(makeFRDocs(4));
    mockFetchRecentFilings.mockRejectedValueOnce(new Error('LDA API down'));

    const result = await analyzeRegulations('environmental-protection-agency');

    expect(result).not.toBeNull();
    expect(result?.lobbyingCommentOverlap).toEqual([]);
  });

  it('counts active vs finalized rules correctly', async () => {
    // makeFRDocs alternates: even=Rule (effective), odd=Proposed Rule (comment_closed)
    mockSearchAgencyRules.mockResolvedValueOnce(makeFRDocs(6));

    const result = await analyzeRegulations('environmental-protection-agency');

    expect(result).not.toBeNull();
    // 3 Rules (effective) + 3 Proposed Rules (comment_closed since close date is 2024-06-01)
    expect(result!.finalizedRules).toBeGreaterThanOrEqual(1);
  });
});
