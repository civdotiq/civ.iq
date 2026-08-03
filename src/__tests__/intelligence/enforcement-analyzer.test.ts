/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Enforcement Analyzer (Phase 3 — Influence Graph).
 */

// ── Mocks ─────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisMget = jest.fn();
const mockRedisKeys = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    mget: mockRedisMget,
    keys: mockRedisKeys,
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/ai/provider', () => ({
  generateAIText: jest.fn().mockResolvedValue('AI narrative about enforcement.'),
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
  ANALYZER_NAMES: ['enforcement'] as const,
}));

const mockSearchEnforcementCases = jest.fn();
jest.mock('@/lib/data-sources/epa-echo-service', () => ({
  epaEchoService: {
    searchEnforcementCases: (...args: unknown[]) => mockSearchEnforcementCases(...args),
  },
}));

const mockSearchInspections = jest.fn();
jest.mock('@/lib/data-sources/osha-service', () => ({
  oshaService: {
    searchInspections: (...args: unknown[]) => mockSearchInspections(...args),
  },
}));

const mockSearchComplaints = jest.fn();
jest.mock('@/lib/data-sources/cfpb-complaint-service', () => ({
  cfpbComplaintService: {
    searchComplaints: (...args: unknown[]) => mockSearchComplaints(...args),
  },
}));

jest.mock('@civiq/entity-resolution', () => ({
  sicToSector: jest.fn().mockReturnValue('Energy/Natural Resources'),
  resolveCompanyName: jest.fn().mockReturnValue({
    canonicalName: 'Test Company',
    confidence: 0.9,
  }),
}));

import {
  analyzeEnforcement,
  type EnforcementScope,
} from '@/lib/intelligence/analyzers/enforcement-analyzer';

// ── Test Data ─────────────────────────────────────────────────────

function makeEPACases(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    caseNumber: `CASE-${i}`,
    caseName: `EPA v. Polluter ${i}`,
    activityTypeDesc: 'Civil Judicial',
    enforcementOutcome: 'Penalty',
    totalPenalties: 50000 + i * 10000,
    federalPenalty: 50000 + i * 10000,
    stateLocalPenalty: 0,
    complianceActionCost: 0,
    settlementDate: `2025-0${(i % 9) + 1}-15`,
    leadAgency: 'EPA',
    defendants: [`Polluter Inc ${i}`],
    facilityState: 'CA',
    facilitySICCode: '2911',
  }));
}

function makeOSHAInspections(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    activityNumber: `INSP-${i}`,
    establishmentName: `Factory ${i}`,
    siteAddress: `${i} Main St`,
    siteCity: 'City',
    siteState: 'CA',
    siteZip: '90001',
    sicCode: '2911',
    naicsCode: '324110',
    inspectionType: 'Planned',
    openDate: `2025-0${(i % 9) + 1}-10`,
    closeDate: null,
    totalCurrentPenalty: 5000 + i * 2000,
    violationCount: i + 1,
    seriousViolationCount: i > 0 ? 1 : 0,
  }));
}

// ── Tests ─────────────────────────────────────────────────────────

describe('analyzeEnforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisMget.mockResolvedValue([]);
    mockRedisKeys.mockResolvedValue([]);
    mockSearchEnforcementCases.mockResolvedValue([]);
    mockSearchInspections.mockResolvedValue([]);
    mockSearchComplaints.mockResolvedValue({ complaints: [], total: 0 });
  });

  it('returns cached insight on cache hit', async () => {
    const cachedInsight = {
      scope: { type: 'state', state: 'CA' },
      confidence: 0.8,
    };
    mockRedisGet.mockResolvedValueOnce(cachedInsight);

    const result = await analyzeEnforcement({ type: 'state', state: 'CA' });
    expect(result).toEqual(cachedInsight);
    expect(mockSearchEnforcementCases).not.toHaveBeenCalled();
  });

  it('returns null when fewer than MIN_ENFORCEMENT_ACTIONS', async () => {
    mockSearchEnforcementCases.mockResolvedValue(makeEPACases(1));

    const result = await analyzeEnforcement({ type: 'state', state: 'CA' });
    expect(result).toBeNull();
  });

  it('computes insight with sufficient enforcement data (state scope)', async () => {
    mockSearchEnforcementCases.mockResolvedValue(makeEPACases(3));
    mockSearchInspections.mockResolvedValue(makeOSHAInspections(2));

    const result = await analyzeEnforcement({ type: 'state', state: 'CA' });

    expect(result).not.toBeNull();
    expect(result?.scope).toEqual({ type: 'state', state: 'CA' });
    expect(result?.stats.totalActions).toBeGreaterThanOrEqual(3);
    expect(result?.stats.totalPenalties).toBeGreaterThan(0);
    expect(result?.stats.byAgency.length).toBeGreaterThan(0);
    expect(result?.confidence).toBeGreaterThan(0);
    expect(result?.disclaimer).toContain('Correlation');
  });

  describe('cap disclosure', () => {
    it('reports a true total when every source came back short of its cap', async () => {
      mockSearchEnforcementCases.mockResolvedValue(makeEPACases(3));
      mockSearchInspections.mockResolvedValue(makeOSHAInspections(2));

      const result = await analyzeEnforcement({ type: 'state', state: 'CA' });

      expect(result?.stats.totalIsLowerBound).toBe(false);
    });

    it('pages OSHA by offset and stops once a page comes back short', async () => {
      mockSearchEnforcementCases.mockResolvedValue(makeEPACases(3));
      mockSearchInspections
        .mockResolvedValueOnce(makeOSHAInspections(200))
        .mockResolvedValueOnce(makeOSHAInspections(5));

      const result = await analyzeEnforcement({ type: 'state', state: 'CA' });

      expect(mockSearchInspections).toHaveBeenCalledTimes(2);
      expect(mockSearchInspections.mock.calls[0]?.[0]).toMatchObject({ limit: 200, offset: 0 });
      expect(mockSearchInspections.mock.calls[1]?.[0]).toMatchObject({ limit: 200, offset: 200 });
      // It ran out of rows before the page bound, so the count is a real total.
      expect(result?.stats.totalIsLowerBound).toBe(false);
    });

    it('marks the total a lower bound when OSHA is still full at the page bound', async () => {
      mockSearchEnforcementCases.mockResolvedValue(makeEPACases(3));
      mockSearchInspections.mockResolvedValue(makeOSHAInspections(200));

      const result = await analyzeEnforcement({ type: 'organization', name: 'Big Employer' });

      expect(mockSearchInspections).toHaveBeenCalledTimes(5);
      expect(result?.stats.totalIsLowerBound).toBe(true);
    });

    it('marks the total a lower bound when EPA fills its responseset', async () => {
      mockSearchEnforcementCases.mockResolvedValue(makeEPACases(100));

      const result = await analyzeEnforcement({ type: 'state', state: 'CA' });

      expect(result?.stats.totalIsLowerBound).toBe(true);
    });

    it('marks the total a lower bound when CFPB fills its page', async () => {
      mockSearchEnforcementCases.mockResolvedValue(makeEPACases(3));
      mockSearchComplaints.mockResolvedValue({
        complaints: Array.from({ length: 100 }, (_, i) => ({
          company: `Bank ${i % 4}`,
          dateReceived: '2025-05-01',
          state: 'CA',
        })),
        total: 5000,
      });

      const result = await analyzeEnforcement({ type: 'state', state: 'CA' });

      expect(result?.stats.totalIsLowerBound).toBe(true);
    });
  });

  it('computes insight for organization scope', async () => {
    mockSearchEnforcementCases.mockResolvedValue(makeEPACases(3));

    const result = await analyzeEnforcement({ type: 'organization', name: 'Polluter Inc' });

    expect(result).not.toBeNull();
    expect(result?.scope).toEqual({ type: 'organization', name: 'Polluter Inc' });
  });

  it('includes InsightBase metadata', async () => {
    mockSearchEnforcementCases.mockResolvedValue(makeEPACases(4));

    const result = await analyzeEnforcement({ type: 'state', state: 'TX' });

    expect(result).not.toBeNull();
    expect(result?.dataAsOf).toBeTruthy();
    expect(result?.lastAnalyzedAt).toBeTruthy();
    expect(result?.methodology).toContain('EPA ECHO');
    // Only EPA cases were mocked — OSHA contributed nothing and must not be
    // cited in the methodology or listed as a source (provenance honesty).
    expect(result?.methodology).not.toContain('OSHA');
    expect(result?.sources.some(s => s.name.includes('OSHA'))).toBe(false);
    expect(result?.source).toMatch(/^(ai-generated|statistical-fallback)$/);
  });

  it('caches result on success', async () => {
    mockSearchEnforcementCases.mockResolvedValue(makeEPACases(5));

    await analyzeEnforcement({ type: 'state', state: 'NY' });

    expect(mockRedisSet).toHaveBeenCalled();
  });

  it('handles EPA fetch failure gracefully', async () => {
    mockSearchEnforcementCases.mockRejectedValue(new Error('EPA down'));
    mockSearchInspections.mockResolvedValue(makeOSHAInspections(4));

    const result = await analyzeEnforcement({ type: 'state', state: 'CA' });

    // Should still work with OSHA data alone
    expect(result).not.toBeNull();
    expect(result?.stats.byAgency.some(a => a.agency === 'OSHA')).toBe(true);
  });

  it('fetches from all three agencies in parallel', async () => {
    mockSearchEnforcementCases.mockResolvedValue(makeEPACases(2));
    mockSearchInspections.mockResolvedValue(makeOSHAInspections(2));
    mockSearchComplaints.mockResolvedValue({
      complaints: [
        { company: 'Test Corp', dateReceived: '2025-01-01', state: 'CA' },
        { company: 'Test Corp', dateReceived: '2025-02-01', state: 'CA' },
      ],
      total: 2,
    });

    const result = await analyzeEnforcement({ type: 'state', state: 'CA' });

    expect(result).not.toBeNull();
    expect(mockSearchEnforcementCases).toHaveBeenCalled();
    expect(mockSearchInspections).toHaveBeenCalled();
    expect(mockSearchComplaints).toHaveBeenCalled();
  });

  it('computes trend direction from action dates', async () => {
    // Create enough actions with dates to determine a trend
    const cases = makeEPACases(8);
    mockSearchEnforcementCases.mockResolvedValue(cases);

    const result = await analyzeEnforcement({ type: 'state', state: 'CA' });

    expect(result).not.toBeNull();
    expect(['increasing', 'decreasing', 'stable']).toContain(result?.stats.trend);
  });
});
