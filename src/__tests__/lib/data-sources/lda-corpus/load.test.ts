/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { readFile } from 'node:fs/promises';
import {
  getCommitteeCorpusTotals,
  getCorpusMeta,
  getSectorCorpusTotals,
  __resetCorpusCache,
} from '@/lib/data-sources/lda-corpus/load';
import type { LdaAggregates } from '@/lib/data-sources/lda-corpus/types';

jest.mock('node:fs/promises', () => ({ readFile: jest.fn() }));
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

function cq(committeeCode: string, quarter: string, total: number) {
  return {
    committeeCode,
    committeeName: committeeCode === 'SSFI' ? 'Finance' : 'Armed Services',
    quarter,
    total,
    filingCount: 10,
    orgCount: 8,
    topOrgs: [],
    topIssues: [{ code: 'TAX', label: 'Taxation', count: 5 }],
  };
}

const FIXTURE: LdaAggregates = {
  generatedAt: '2026-07-13T00:00:00.000Z',
  quarters: ['2025-Q1', '2025-Q2'],
  methodology: 'test',
  latestFilingPosted: '2026-07-13T00:00:00-04:00',
  committees: [
    cq('SSFI', '2025-Q1', 30_000_000),
    cq('SSFI', '2025-Q2', 20_000_000),
    cq('SSAS', '2025-Q1', 5_000_000),
    cq('SSAS', '2025-Q2', 5_000_000),
  ],
  issues: [
    {
      code: 'DEF',
      label: 'Defense',
      quarter: '2025-Q1',
      total: 8_000_000,
      filingCount: 5,
      orgCount: 5,
      topOrgs: [],
    },
    {
      code: 'DEF',
      label: 'Defense',
      quarter: '2025-Q2',
      total: 2_000_000,
      filingCount: 3,
      orgCount: 3,
      topOrgs: [],
    },
    {
      code: 'HOM',
      label: 'Homeland Security',
      quarter: '2025-Q1',
      total: 1_000_000,
      filingCount: 2,
      orgCount: 2,
      topOrgs: [],
    },
  ],
  national: [],
  meta: {
    totalFilingsFetched: 100,
    reportFilingsUsed: 90,
    gatedFilingCount: 1,
    committeeMatch: 'entity-resolution+issue-jurisdiction',
  },
};

describe('lda-corpus loader', () => {
  beforeEach(() => {
    __resetCorpusCache();
    mockReadFile.mockReset();
  });

  it('sums a committee window total and orders quarters', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(FIXTURE));
    const totals = await getCommitteeCorpusTotals('SSFI');
    expect(totals).not.toBeNull();
    expect(totals!.windowTotal).toBe(50_000_000);
    expect(totals!.quarterly.map(q => q.quarter)).toEqual(['2025-Q1', '2025-Q2']);
    expect(totals!.committeeName).toBe('Finance');
  });

  it('computes a peer baseline against the median committee total', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(FIXTURE));
    // Window totals: SSFI=50M, SSAS=10M → median of [10M, 50M] = 30M.
    const ssfi = await getCommitteeCorpusTotals('SSFI');
    expect(ssfi!.peer.medianTotal).toBe(30_000_000);
    expect(ssfi!.peer.ratioToMedian).toBeCloseTo(50 / 30, 5);
  });

  it('returns null for a committee absent from the corpus', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(FIXTURE));
    expect(await getCommitteeCorpusTotals('HSAP')).toBeNull();
  });

  it('returns null gracefully when the corpus file is missing', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    expect(await getCommitteeCorpusTotals('SSFI')).toBeNull();
    expect(await getCorpusMeta()).toBeNull();
  });

  it('exposes corpus metadata', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(FIXTURE));
    const meta = await getCorpusMeta();
    expect(meta!.quarters).toEqual(['2025-Q1', '2025-Q2']);
    expect(meta!.latestFilingPosted).toBe('2026-07-13T00:00:00-04:00');
  });

  it('sums sector totals across its issue codes with a per-issue breakdown', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(FIXTURE));
    const totals = await getSectorCorpusTotals(['DEF', 'HOM']);
    expect(totals).not.toBeNull();
    // DEF: 8M + 2M = 10M; HOM: 1M → window 11M
    expect(totals!.windowTotal).toBe(11_000_000);
    // Quarterly: Q1 = 8M + 1M = 9M, Q2 = 2M
    expect(totals!.quarterly).toEqual([
      { quarter: '2025-Q1', total: 9_000_000 },
      { quarter: '2025-Q2', total: 2_000_000 },
    ]);
    // byIssue sorted by total desc: DEF (10M) then HOM (1M)
    expect(totals!.byIssue.map(i => i.code)).toEqual(['DEF', 'HOM']);
    expect(totals!.byIssue[0]!.windowTotal).toBe(10_000_000);
  });

  it('returns null when none of the sector codes appear in the corpus', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify(FIXTURE));
    expect(await getSectorCorpusTotals(['TAX', 'HCR'])).toBeNull();
  });
});
