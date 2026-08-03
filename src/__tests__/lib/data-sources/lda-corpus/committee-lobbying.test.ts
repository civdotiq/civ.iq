/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { CorpusFiling } from '@/lib/data-sources/lda-corpus/filing-corpus';

const mockForEachFiling = jest.fn();
const mockGetCommittees = jest.fn();
const mockGetMeta = jest.fn();

jest.mock('@/lib/data-sources/lda-corpus/load-filings', () => ({
  forEachFilingForCommittees: (...args: unknown[]) => mockForEachFiling(...args),
  getFilingCorpusCommittees: () => mockGetCommittees(),
  getFilingCorpusMeta: () => mockGetMeta(),
}));

jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [
    { committeeCode: 'HSIF', committeeName: 'Energy and Commerce', chamber: 'House' },
    { committeeCode: 'SSBK', committeeName: 'Banking', chamber: 'Senate' },
  ],
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  describeCorpusCoverage,
  getCommitteeLobbyingFromCorpus,
  getMemberLobbyingFromCorpus,
} from '@/lib/data-sources/lda-corpus/committee-lobbying';

const CORPUS_COMMITTEES = new Map([
  ['HSIF', 'Energy and Commerce'],
  ['SSBK', 'Banking, Housing, and Urban Affairs'],
]);

function filing(overrides: Partial<CorpusFiling> = {}): CorpusFiling {
  return {
    clientName: 'ACME CORPORATION',
    registrantId: '900',
    registrantName: 'ACME CORPORATION',
    quarter: '2026-Q1',
    amount: 100_000,
    issueCodes: ['ENG'],
    governmentEntities: ['SENATE'],
    committeeCodes: ['HSIF'],
    ...overrides,
  };
}

/** Visit these rows for any requested committee code. */
function visits(rows: CorpusFiling[]) {
  return (_codes: string[], visit: (f: CorpusFiling) => void) => {
    for (const row of rows) visit(row);
    return Promise.resolve(true);
  };
}

describe('getCommitteeLobbyingFromCorpus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCommittees.mockResolvedValue(CORPUS_COMMITTEES);
    mockGetMeta.mockResolvedValue({
      generatedAt: '2026-08-01T00:00:00.000Z',
      latestFilingPosted: '2026-07-31T00:00:00-04:00',
      quarters: ['2025-Q4', '2026-Q1'],
      rows: 154957,
      methodology: 'Complete Senate LDA quarterly reports.',
    });
    mockForEachFiling.mockImplementation(visits([filing()]));
  });

  it('resolves a corpus committee code directly', async () => {
    const result = await getCommitteeLobbyingFromCorpus(['HSIF']);

    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({
      committee: 'HSIF',
      committeeCode: 'HSIF',
      matchingMethod: 'corpus',
      matchConfidence: 0.95,
      coverage: 'complete',
    });
  });

  it('resolves a bare topic through the committee mappings', async () => {
    const result = await getCommitteeLobbyingFromCorpus(['Energy']);

    expect(result![0]).toMatchObject({ committee: 'Energy', committeeCode: 'HSIF' });
    expect(result![0]!.matchConfidence).toBe(0.85);
  });

  it('rolls two topics naming the same committee up once', async () => {
    const result = await getCommitteeLobbyingFromCorpus(['Energy', 'Energy and Commerce']);

    expect(result).toHaveLength(1);
    expect(result![0]!.totalSpending).toBe(100_000);
  });

  it('skips a committee the corpus has never seen', async () => {
    const result = await getCommitteeLobbyingFromCorpus(['Ways and Means']);

    expect(result).toEqual([]);
  });

  it('counts every filing but returns bounded company and row lists', async () => {
    const rows = Array.from({ length: 500 }, (_, i) =>
      filing({ clientName: `ORG ${i}`, amount: 1_000 + i })
    );
    mockForEachFiling.mockImplementation(visits(rows));

    const result = await getCommitteeLobbyingFromCorpus(['HSIF']);
    const data = result![0]!;

    expect(data.filingCount).toBe(500);
    expect(data.companyCount).toBe(500);
    expect(data.companies).toHaveLength(200);
    expect(data.filings).toHaveLength(100);
    // Largest first, and the largest row survived the buffer pruning.
    expect(data.filings[0]!.amount).toBe(1_499);
  });

  it('translates corpus quarter keys into LDA filing periods', async () => {
    mockForEachFiling.mockImplementation(visits([filing({ quarter: '2025-Q3' })]));

    const result = await getCommitteeLobbyingFromCorpus(['HSIF']);

    expect(result![0]!.filings[0]).toMatchObject({ quarter: 'third_quarter', year: 2025 });
  });

  it('returns null, never a sample, when the corpus is unavailable', async () => {
    mockGetCommittees.mockResolvedValue(null);

    expect(await getCommitteeLobbyingFromCorpus(['HSIF'])).toBeNull();
  });
});

describe('getMemberLobbyingFromCorpus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCommittees.mockResolvedValue(CORPUS_COMMITTEES);
    mockGetMeta.mockResolvedValue({
      generatedAt: '2026-08-01T00:00:00.000Z',
      latestFilingPosted: '2026-07-31T00:00:00-04:00',
      quarters: ['2025-Q4', '2026-Q1'],
      rows: 154957,
      methodology: 'Complete Senate LDA quarterly reports.',
    });
  });

  it('counts a filing touching two of the member’s committees once', async () => {
    mockForEachFiling.mockImplementation(
      visits([filing({ amount: 80_000, committeeCodes: ['HSIF', 'SSBK'] })])
    );

    const rollup = await getMemberLobbyingFromCorpus(['Energy', 'Banking']);

    expect(rollup!.totalSpending).toBe(80_000);
    expect(rollup!.filingCount).toBe(1);
    // ...but splits it across both committees in the breakdown.
    expect(rollup!.committeeBreakdown.map(c => c.attributedSpending)).toEqual([40_000, 40_000]);
  });

  it('lists every committee an organization reached', async () => {
    mockForEachFiling.mockImplementation(visits([filing({ committeeCodes: ['HSIF', 'SSBK'] })]));

    const rollup = await getMemberLobbyingFromCorpus(['Energy', 'Banking']);

    expect(rollup!.topCompanies[0]!.committees.sort()).toEqual(['Banking', 'Energy']);
  });

  it('reports the corpus quarters so callers do not plot quarters it lacks', async () => {
    mockForEachFiling.mockImplementation(visits([filing()]));

    const rollup = await getMemberLobbyingFromCorpus(['Energy']);

    expect(rollup!.quarters).toEqual(['2025-Q4', '2026-Q1']);
    expect(rollup!.quarterTotals).toEqual({ '2026-Q1': 100_000 });
  });

  it('returns null when no requested committee is in the corpus', async () => {
    mockForEachFiling.mockImplementation(visits([filing()]));

    expect(await getMemberLobbyingFromCorpus(['Ways and Means'])).toBeNull();
  });

  it('returns null when the corpus is unavailable', async () => {
    mockForEachFiling.mockResolvedValue(false);

    expect(await getMemberLobbyingFromCorpus(['Energy'])).toBeNull();
  });
});

describe('describeCorpusCoverage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('states the real window and row count', async () => {
    mockGetMeta.mockResolvedValue({
      generatedAt: '2026-08-01T00:00:00.000Z',
      latestFilingPosted: '2026-07-31T00:00:00-04:00',
      quarters: ['2024-Q3', '2026-Q2'],
      rows: 154957,
      methodology: 'Complete Senate LDA quarterly reports.',
    });

    const text = await describeCorpusCoverage();

    expect(text).toContain('COMPLETE');
    expect(text).toContain('154,957');
    expect(text).toContain('2024-Q3 through 2026-Q2');
  });

  it('says the data is unavailable rather than implying a sample stands in', async () => {
    mockGetMeta.mockResolvedValue(null);

    expect(await describeCorpusCoverage()).toContain('unavailable');
  });
});
