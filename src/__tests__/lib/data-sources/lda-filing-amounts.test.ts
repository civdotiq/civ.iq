/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  reportedFilingAmount,
  reportedRawFilingAmount,
} from '@/lib/data-sources/lda-filing-amounts';

describe('reportedFilingAmount', () => {
  it('passes through plausible hired-firm income', () => {
    expect(reportedFilingAmount({ income: 500_000, expenses: 0 })).toBe(500_000);
  });

  it('passes through large self-filer expenses (US Chamber scale)', () => {
    expect(reportedFilingAmount({ income: 0, expenses: 20_000_000 })).toBe(20_000_000);
  });

  it('sums income and expenses when both are reported', () => {
    expect(reportedFilingAmount({ income: 100_000, expenses: 50_000 })).toBe(150_000);
  });

  it('gates implausible income (crank filings, e.g. $20M single-client quarter)', () => {
    expect(reportedFilingAmount({ income: 20_000_000, expenses: 0 })).toBe(0);
  });

  it('gates implausible expenses but keeps plausible income', () => {
    expect(reportedFilingAmount({ income: 250_000, expenses: 999_000_000 })).toBe(250_000);
  });

  it('returns 0 for filings with no reported amounts', () => {
    expect(reportedFilingAmount({ income: 0, expenses: 0 })).toBe(0);
  });
});

describe('reportedRawFilingAmount', () => {
  it('parses raw LDA string fields', () => {
    expect(reportedRawFilingAmount({ income: '80000.00', expenses: null })).toBe(80_000);
  });

  it('treats null/undefined/garbage as 0', () => {
    expect(reportedRawFilingAmount({ income: null, expenses: null })).toBe(0);
    expect(reportedRawFilingAmount({})).toBe(0);
    expect(reportedRawFilingAmount({ income: 'n/a', expenses: undefined })).toBe(0);
  });

  it('gates implausible raw income', () => {
    expect(reportedRawFilingAmount({ income: '20000000.00', expenses: null })).toBe(0);
  });
});
