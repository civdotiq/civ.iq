/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { buildFilingCorpus } from '@/lib/data-sources/lda-corpus/build-filing-corpus';
import { decodeFilingRow } from '@/lib/data-sources/lda-corpus/filing-corpus';
import { parseRawFiling } from '@/lib/data-sources/lda-corpus/parse';
import type { CompactFiling, RawApiFiling } from '@/lib/data-sources/lda-corpus/types';

function rawReport(overrides: Partial<RawApiFiling> = {}): RawApiFiling {
  return {
    filing_uuid: 'uuid-1',
    filing_year: 2025,
    filing_period: 'first_quarter',
    filing_type: 'Q1',
    dt_posted: '2025-04-01T12:00:00-04:00',
    income: '50000.00',
    expenses: null,
    registrant: { id: 301, name: 'Acme Government Affairs LLC' },
    client: { id: 900, name: 'Acme Client Inc' },
    lobbying_activities: [
      { general_issue_code: 'TAX', government_entities: [{ id: 1, name: 'SENATE' }] },
    ],
    ...overrides,
  };
}

function compact(overrides: Partial<CompactFiling> = {}): CompactFiling {
  return { ...parseRawFiling(rawReport())!, ...overrides };
}

const GENERATED_AT = '2026-07-31T00:00:00.000Z';

describe('buildFilingCorpus', () => {
  it('round-trips a filing through the dictionary encoding', () => {
    const corpus = buildFilingCorpus([compact()], GENERATED_AT);

    expect(corpus.rows).toHaveLength(1);
    const decoded = decodeFilingRow(corpus, corpus.rows[0]!);
    expect(decoded.clientName).toBe('Acme Client Inc');
    expect(decoded.registrantId).toBe('301');
    expect(decoded.registrantName).toBe('Acme Government Affairs LLC');
    expect(decoded.quarter).toBe('2025-Q1');
    expect(decoded.amount).toBe(50000);
    expect(decoded.issueCodes).toEqual(['TAX']);
    expect(decoded.governmentEntities).toEqual(['SENATE']);
  });

  it('attributes a filing to the committees its issue codes fall under', () => {
    const corpus = buildFilingCorpus([compact()], GENERATED_AT);
    const decoded = decodeFilingRow(corpus, corpus.rows[0]!);

    // TAX jurisdiction reaches Ways and Means (House) and Finance (Senate).
    expect(decoded.committeeCodes.length).toBeGreaterThan(0);
    expect(decoded.committeeCodes).toContain('HSWM');
  });

  it('stores each repeated string once rather than once per row', () => {
    const rows = [
      compact({ filingUuid: 'a', clientId: '900' }),
      compact({ filingUuid: 'b', clientId: '901', clientName: 'Acme Client Inc' }),
      compact({ filingUuid: 'c', clientId: '902', clientName: 'Beta Corp' }),
    ];
    const corpus = buildFilingCorpus(rows, GENERATED_AT);

    expect(corpus.rows).toHaveLength(3);
    expect(corpus.clients).toEqual(['Acme Client Inc', 'Beta Corp']);
    expect(corpus.entities).toEqual(['SENATE']);
    expect(corpus.issues).toEqual(['TAX']);
    expect(corpus.registrants).toHaveLength(1);
  });

  it('collapses amendments so a superseded report is not counted twice', () => {
    const original = compact({ filingUuid: 'orig', amount: 50000 });
    const amendment = compact({
      filingUuid: 'amended',
      filingType: '1A',
      dtPosted: '2025-05-01T12:00:00-04:00',
      amount: 75000,
    });

    const corpus = buildFilingCorpus([original, amendment], GENERATED_AT);

    expect(corpus.rows).toHaveLength(1);
    expect(decodeFilingRow(corpus, corpus.rows[0]!).amount).toBe(75000);
    expect(corpus.meta.reportFilings).toBe(1);
  });

  it('orders the quarter dictionary chronologically and keeps rows pointing at their own quarter', () => {
    const newer = compact({ filingUuid: 'newer', clientId: '901', quarter: '2026-Q1' });
    const older = compact({ filingUuid: 'older', clientId: '902', quarter: '2025-Q1' });

    const corpus = buildFilingCorpus([newer, older], GENERATED_AT);

    expect(corpus.quarters).toEqual(['2025-Q1', '2026-Q1']);
    const quarters = corpus.rows.map(r => decodeFilingRow(corpus, r).quarter).sort();
    expect(quarters).toEqual(['2025-Q1', '2026-Q1']);
  });

  it('counts gated crank filings and keeps their amount at zero', () => {
    const crank = parseRawFiling(rawReport({ income: '20000000.00' }))!;
    const corpus = buildFilingCorpus([crank], GENERATED_AT);

    expect(corpus.meta.gatedFilings).toBe(1);
    expect(decodeFilingRow(corpus, corpus.rows[0]!).amount).toBe(0);
  });

  it('reports the most recently posted filing for the freshness canary', () => {
    const corpus = buildFilingCorpus(
      [
        compact({ filingUuid: 'a', clientId: '900', dtPosted: '2025-04-01T12:00:00-04:00' }),
        compact({ filingUuid: 'b', clientId: '901', dtPosted: '2026-01-15T12:00:00-05:00' }),
      ],
      GENERATED_AT
    );

    expect(corpus.latestFilingPosted).toBe('2026-01-15T12:00:00-05:00');
  });
});
