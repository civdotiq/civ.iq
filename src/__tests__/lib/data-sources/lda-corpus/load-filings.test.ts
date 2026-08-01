/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { brotliCompressSync } from 'node:zlib';
import {
  forEachFilingForCommittees,
  getFilingCorpusMeta,
  __resetFilingCorpusCache,
} from '@/lib/data-sources/lda-corpus/load-filings';
import type { CorpusFiling, FilingCorpusFile } from '@/lib/data-sources/lda-corpus/filing-corpus';

/**
 * A hand-built corpus file. Row 0 touches both committees (it must be visited
 * once, not twice), row 1 only the second.
 */
const CORPUS: FilingCorpusFile = {
  version: 1,
  generatedAt: '2026-07-31T00:00:00.000Z',
  latestFilingPosted: '2026-07-20T12:00:00-04:00',
  quarters: ['2025-Q4', '2026-Q1'],
  clients: ['Acme Client Inc', 'Beta Corp'],
  registrants: [
    ['301', 'Acme Government Affairs LLC'],
    ['302', 'Beta Corp'],
  ],
  issues: ['TAX', 'HCR'],
  entities: ['SENATE', 'HOUSE OF REPRESENTATIVES'],
  committees: [
    ['HSWM', 'Ways and Means'],
    ['SSFI', 'Finance'],
  ],
  rows: [
    [0, 0, 1, 50000, [0], [0], [0, 1]],
    [1, 1, 0, 90000, [1], [1], [1]],
  ],
  meta: {
    reportFilings: 2,
    gatedFilings: 0,
    committeeMatch: 'entity-resolution+issue-jurisdiction',
    methodology: 'Complete Senate LDA quarterly reports (LD-2) for the window.',
  },
};

const CORPUS_URL = 'https://blob.example.test/lda-filings.json.br';

function mockCorpusResponse(file: FilingCorpusFile = CORPUS): jest.Mock {
  const body = brotliCompressSync(Buffer.from(JSON.stringify(file)));
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

async function collect(committeeCodes: string[]): Promise<CorpusFiling[] | null> {
  const found: CorpusFiling[] = [];
  const available = await forEachFilingForCommittees(committeeCodes, f => found.push(f));
  return available ? found : null;
}

describe('load-filings', () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.LDA_FILINGS_URL;

  beforeEach(() => {
    __resetFilingCorpusCache();
    process.env.LDA_FILINGS_URL = CORPUS_URL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.LDA_FILINGS_URL;
    else process.env.LDA_FILINGS_URL = originalUrl;
  });

  it('decodes filings for a requested committee', async () => {
    mockCorpusResponse();

    const filings = await collect(['HSWM']);

    expect(filings).toHaveLength(1);
    expect(filings![0]).toMatchObject({
      clientName: 'Acme Client Inc',
      registrantId: '301',
      registrantName: 'Acme Government Affairs LLC',
      quarter: '2026-Q1',
      amount: 50000,
      issueCodes: ['TAX'],
      governmentEntities: ['SENATE'],
    });
    expect(filings![0]!.committeeCodes).toEqual(['HSWM', 'SSFI']);
  });

  it('visits a filing touching several requested committees only once', async () => {
    mockCorpusResponse();

    const filings = await collect(['HSWM', 'SSFI']);

    expect(filings!.map(f => f.clientName)).toEqual(['Acme Client Inc', 'Beta Corp']);
  });

  it('reports availability with no visits when the committee is absent', async () => {
    mockCorpusResponse();

    const visits: CorpusFiling[] = [];
    const available = await forEachFilingForCommittees(['HSAG'], f => visits.push(f));

    expect(available).toBe(true);
    expect(visits).toHaveLength(0);
  });

  it('signals unavailable rather than throwing when the corpus cannot be read', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;

    expect(await forEachFilingForCommittees(['HSWM'], () => undefined)).toBe(false);
    expect(await getFilingCorpusMeta()).toBeNull();
  });

  it('fetches the corpus once and shares it across concurrent callers', async () => {
    const fetchMock = mockCorpusResponse();

    await Promise.all([collect(['HSWM']), collect(['SSFI']), collect(['HSWM'])]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('exposes provenance for methodology and the freshness canary', async () => {
    mockCorpusResponse();

    expect(await getFilingCorpusMeta()).toEqual({
      generatedAt: '2026-07-31T00:00:00.000Z',
      latestFilingPosted: '2026-07-20T12:00:00-04:00',
      quarters: ['2025-Q4', '2026-Q1'],
      rows: 2,
      methodology: 'Complete Senate LDA quarterly reports (LD-2) for the window.',
    });
  });
});
