/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  currentFederalFiscalYear,
  currentFederalFiscalYearWindow,
} from '@/lib/helpers/federal-fiscal-year';

describe('currentFederalFiscalYear', () => {
  it('returns the calendar year before October', () => {
    expect(currentFederalFiscalYear(new Date(2026, 5, 9))).toBe(2026); // June 2026
    expect(currentFederalFiscalYear(new Date(2026, 8, 30))).toBe(2026); // Sep 30 2026
  });

  it('rolls to the next year number on October 1', () => {
    // FY2027 starts 2026-10-01 — the pre-fix code served FY2026 here
    expect(currentFederalFiscalYear(new Date(2026, 9, 1))).toBe(2027);
  });

  it('stays on the next year number through December', () => {
    expect(currentFederalFiscalYear(new Date(2026, 11, 31))).toBe(2027);
  });
});

describe('currentFederalFiscalYearWindow', () => {
  it('spans Oct 1 through Sep 30 of the fiscal year', () => {
    expect(currentFederalFiscalYearWindow(new Date(2026, 5, 9))).toEqual({
      startDate: '2025-10-01',
      endDate: '2026-09-30',
    });
    expect(currentFederalFiscalYearWindow(new Date(2026, 10, 15))).toEqual({
      startDate: '2026-10-01',
      endDate: '2027-09-30',
    });
  });
});
