/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Federal fiscal year utilities.
 *
 * The US federal fiscal year runs October 1 through September 30 and is
 * numbered by the calendar year in which it ENDS. Example: FY2026 spans
 * 2025-10-01 through 2026-09-30, so on any date from October through
 * December the current fiscal year is the NEXT calendar year number.
 */

/**
 * Current federal fiscal year number (e.g., returns 2026 on 2025-11-15).
 */
export function currentFederalFiscalYear(now: Date = new Date()): number {
  // getMonth() is 0-indexed: 9 = October
  return now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
}

/**
 * Start/end dates (YYYY-MM-DD) of the current federal fiscal year,
 * suitable for USASpending.gov time_period filters.
 */
export function currentFederalFiscalYearWindow(now: Date = new Date()): {
  startDate: string;
  endDate: string;
} {
  const fiscalYear = currentFederalFiscalYear(now);
  return {
    startDate: `${fiscalYear - 1}-10-01`,
    endDate: `${fiscalYear}-09-30`,
  };
}
