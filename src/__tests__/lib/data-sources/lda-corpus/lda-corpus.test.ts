/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { parseRawFiling, quarterKey } from '@/lib/data-sources/lda-corpus/parse';
import { dedupeAmendments } from '@/lib/data-sources/lda-corpus/dedupe';
import { buildAggregates } from '@/lib/data-sources/lda-corpus/aggregate';
import type { CompactFiling, RawApiFiling } from '@/lib/data-sources/lda-corpus/types';

function rawReport(overrides: Partial<RawApiFiling> = {}): RawApiFiling {
  return {
    filing_uuid: 'uuid-1',
    filing_year: 2025,
    filing_period: 'first_quarter',
    filing_type: 'Q1',
    filing_type_display: '1st Quarter - Report',
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
  const base = parseRawFiling(rawReport())!;
  return { ...base, ...overrides };
}

describe('quarterKey', () => {
  it('maps API filing periods to quarter keys', () => {
    expect(quarterKey(2025, 'first_quarter')).toBe('2025-Q1');
    expect(quarterKey(2024, 'fourth_quarter')).toBe('2024-Q4');
    expect(quarterKey(2025, 'nonsense')).toBeNull();
  });
});

describe('parseRawFiling', () => {
  it('drops registrations (income and expenses both null)', () => {
    const registration = rawReport({ income: null, expenses: null, filing_type: 'RR' });
    expect(parseRawFiling(registration)).toBeNull();
  });

  it('normalizes a report with income, flattening issues and entities', () => {
    const f = parseRawFiling(rawReport())!;
    expect(f.registrantId).toBe('301');
    expect(f.clientId).toBe('900');
    expect(f.quarter).toBe('2025-Q1');
    expect(f.amount).toBe(50000);
    expect(f.gated).toBe(false);
    expect(f.issueCodes).toEqual(['TAX']);
    expect(f.governmentEntities).toEqual(['SENATE']);
  });

  it('parses self-filer expenses when income is null', () => {
    const f = parseRawFiling(rawReport({ income: null, expenses: '90000.00' }))!;
    expect(f.amount).toBe(90000);
  });

  it('gates an implausible crank income to $0 but keeps the filing', () => {
    const f = parseRawFiling(rawReport({ income: '20000000.00' }))!;
    expect(f.amount).toBe(0);
    expect(f.gated).toBe(true);
  });
});

describe('dedupeAmendments', () => {
  it('keeps only the latest-posted filing per registrant+client+year+period', () => {
    // The LOC NATION pattern: three amendments for the same quarter.
    const filings = [
      compact({ filingUuid: 'a', dtPosted: '2025-04-01T10:00:00-04:00', amount: 20_000 }),
      compact({ filingUuid: 'b', dtPosted: '2025-04-10T10:00:00-04:00', amount: 20_000 }),
      compact({ filingUuid: 'c', dtPosted: '2025-04-20T10:00:00-04:00', amount: 20_000 }),
    ];
    const deduped = dedupeAmendments(filings);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.filingUuid).toBe('c');
  });

  it('keeps distinct (registrant, client, period) tuples separate', () => {
    const filings = [
      compact({ filingUuid: 'a', clientId: '900' }),
      compact({ filingUuid: 'b', clientId: '901' }),
      compact({ filingUuid: 'c', registrantId: '302', clientId: '900' }),
    ];
    expect(dedupeAmendments(filings)).toHaveLength(3);
  });

  it('breaks dt_posted ties deterministically by filing_uuid', () => {
    const filings = [
      compact({ filingUuid: 'aaa', dtPosted: '2025-04-01T10:00:00-04:00' }),
      compact({ filingUuid: 'zzz', dtPosted: '2025-04-01T10:00:00-04:00' }),
    ];
    expect(dedupeAmendments(filings)[0]!.filingUuid).toBe('zzz');
  });
});

describe('buildAggregates', () => {
  const generatedAt = '2025-05-01T00:00:00.000Z';

  it('attributes report spend to committees via issue-code jurisdiction', () => {
    // TAX jurisdiction reaches Ways and Means (HSWM) and Finance (SSFI).
    const filings = [compact({ issueCodes: ['TAX'], amount: 50_000 })];
    const agg = buildAggregates(filings, generatedAt);
    const codes = agg.committees.map(c => c.committeeCode);
    expect(codes).toContain('HSWM');
    expect(codes).toContain('SSFI');
    const finance = agg.committees.find(c => c.committeeCode === 'SSFI')!;
    expect(finance.total).toBe(50_000);
    expect(finance.orgCount).toBe(1);
    expect(finance.topIssues[0]!.code).toBe('TAX');
  });

  it('dedupes before aggregating so amendments do not multiply totals', () => {
    const filings = [
      compact({ filingUuid: 'a', dtPosted: '2025-04-01T10:00:00-04:00', amount: 50_000 }),
      compact({ filingUuid: 'b', dtPosted: '2025-04-20T10:00:00-04:00', amount: 50_000 }),
    ];
    const agg = buildAggregates(filings, generatedAt);
    expect(agg.meta.reportFilingsUsed).toBe(1);
    expect(agg.national[0]!.total).toBe(50_000);
  });

  it('reports national totals, gated counts, and the latest posted date', () => {
    const filings = [
      compact({
        filingUuid: 'a',
        clientId: '900',
        amount: 50_000,
        dtPosted: '2025-04-01T10:00:00-04:00',
      }),
      compact({
        filingUuid: 'b',
        clientId: '901',
        amount: 0,
        gated: true,
        dtPosted: '2025-04-30T10:00:00-04:00',
      }),
    ];
    const agg = buildAggregates(filings, generatedAt);
    expect(agg.national[0]!.filingCount).toBe(2);
    expect(agg.national[0]!.total).toBe(50_000);
    expect(agg.meta.gatedFilingCount).toBe(1);
    expect(agg.latestFilingPosted).toBe('2025-04-30T10:00:00-04:00');
    expect(agg.quarters).toEqual(['2025-Q1']);
  });

  it('caps top organizations per bucket at 50', () => {
    const filings = Array.from({ length: 60 }, (_, i) =>
      compact({ filingUuid: `f${i}`, clientId: `c${i}`, issueCodes: ['TAX'], amount: 1000 + i })
    );
    const agg = buildAggregates(filings, generatedAt);
    const finance = agg.committees.find(c => c.committeeCode === 'SSFI')!;
    expect(finance.orgCount).toBe(60);
    expect(finance.topOrgs).toHaveLength(50);
    // Highest amount first
    expect(finance.topOrgs[0]!.amount).toBe(1059);
  });
});
