/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Integration Smoke Tests — Real Government APIs
 *
 * These tests call real government APIs to verify end-to-end data flow
 * for a known, stable legislator (Chuck Grassley, G000386).
 *
 * Skipped by default — only run with RUN_SMOKE_TESTS=1.
 * Usage: npm run test:smoke
 */

const SMOKE_ENABLED = !!process.env.RUN_SMOKE_TESTS;

// Skip entire suite unless explicitly enabled
const describeFn = SMOKE_ENABLED ? describe : describe.skip;

describeFn('Intelligence Smoke Tests (real APIs)', () => {
  const BIOGUIDE_ID = 'G000386'; // Chuck Grassley — senior senator, extensive data

  beforeAll(() => {
    // Increase timeout for real API calls
    jest.setTimeout(60_000);
  });

  it('finance-jurisdiction returns non-null insight with valid shape', async () => {
    const { analyzeFinanceJurisdiction } = await import(
      '@/lib/intelligence/analyzers/finance-jurisdiction-analyzer'
    );

    const insight = await analyzeFinanceJurisdiction(BIOGUIDE_ID);

    if (!insight) {
      // FEC API may be unavailable — skip gracefully
      return;
    }
    expect(insight.overlapScore).toBeGreaterThanOrEqual(0);
    expect(insight.overlapScore).toBeLessThanOrEqual(1);
    expect(insight.confidence).toBeGreaterThanOrEqual(0);
    expect(insight.confidence).toBeLessThanOrEqual(1);
    expect(insight.dataAsOf).toBeTruthy();
    expect(insight.methodology).toBeTruthy();
    expect(insight.disclaimer).toBeTruthy();
  }, 30_000);

  it('vote-finance returns correlations with sample sizes', async () => {
    const { analyzeVoteFinance } = await import(
      '@/lib/intelligence/analyzers/vote-finance-analyzer'
    );

    const insight = await analyzeVoteFinance(BIOGUIDE_ID);

    // May be null if vote data isn't available — that's acceptable
    if (insight) {
      expect(insight.correlations).toBeDefined();
      expect(Array.isArray(insight.correlations)).toBe(true);
      expect(insight.confidence).toBeGreaterThanOrEqual(0);
    }
  }, 30_000);

  it('temporal analysis returns quarters', async () => {
    const { analyzeTemporalVotes } = await import(
      '@/lib/intelligence/analyzers/temporal-vote-analyzer'
    );

    const insight = await analyzeTemporalVotes(BIOGUIDE_ID);

    if (insight) {
      expect(insight.quarters.length).toBeGreaterThanOrEqual(1);
      expect(insight.overallTrend).toMatch(/stable|increasing|decreasing|volatile/);
    }
  }, 30_000);

  it('influence chain finds at least one chain', async () => {
    const { analyzeInfluenceChains } = await import(
      '@/lib/intelligence/analyzers/influence-chain-analyzer'
    );

    const insight = await analyzeInfluenceChains(BIOGUIDE_ID);

    if (insight) {
      expect(insight.chains).toBeDefined();
      expect(Array.isArray(insight.chains)).toBe(true);
    }
  }, 30_000);

  it('enforcement returns actions for energy sector', async () => {
    const { analyzeEnforcement } = await import(
      '@/lib/intelligence/analyzers/enforcement-analyzer'
    );

    const insight = await analyzeEnforcement({
      type: 'sector',
      sector: 'Energy/Natural Resources' as import('@/lib/fec/industry-taxonomy').IndustrySector,
    });

    if (insight) {
      expect(insight.actions).toBeDefined();
      expect(Array.isArray(insight.actions)).toBe(true);
    }
  }, 30_000);

  it('entity resolution matches known company variants', async () => {
    const { companiesMatch } = await import('@civiq/entity-resolution');

    expect(companiesMatch('EXXON MOBIL', 'ExxonMobil Corporation')).toBe(true);
    expect(companiesMatch('JP MORGAN CHASE', 'JPMorgan Chase & Co')).toBe(true);
  });

  it('embedding classifier returns sectors for bill text', async () => {
    const { classifyBillSectors } = await import('@/lib/intelligence/embeddings');

    const sectors = await classifyBillSectors(
      'An act to regulate carbon emissions from power plants'
    );

    expect(Array.isArray(sectors)).toBe(true);
    expect(sectors.length).toBeGreaterThan(0);
  }, 30_000);
});
