/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for spending display formatters.
 *
 * These strings render directly in the Federal Investment section —
 * a wrong magnitude suffix misstates spending by 1000x.
 */

import { formatCompactCurrency, getFiscalYearLabel } from '@/features/spending/utils/format';

describe('formatCompactCurrency', () => {
  it('formats sub-thousand amounts as whole dollars', () => {
    expect(formatCompactCurrency(0)).toBe('$0');
    expect(formatCompactCurrency(500)).toBe('$500');
    expect(formatCompactCurrency(999)).toBe('$999');
  });

  it('formats thousands with one decimal, dropping trailing .0', () => {
    expect(formatCompactCurrency(1_000)).toBe('$1K');
    expect(formatCompactCurrency(1_234)).toBe('$1.2K');
    expect(formatCompactCurrency(12_345)).toBe('$12.3K');
  });

  it('rounds to whole numbers once the leading value reaches 100', () => {
    expect(formatCompactCurrency(150_000)).toBe('$150K');
    expect(formatCompactCurrency(450_000_000)).toBe('$450M');
    expect(formatCompactCurrency(100_000_000_000)).toBe('$100B');
  });

  it('formats millions and billions', () => {
    expect(formatCompactCurrency(1_200_000)).toBe('$1.2M');
    expect(formatCompactCurrency(1_200_000_000)).toBe('$1.2B');
  });

  it('carries the sign for negative amounts', () => {
    expect(formatCompactCurrency(-450_000_000)).toBe('-$450M');
    expect(formatCompactCurrency(-1_234)).toBe('-$1.2K');
    expect(formatCompactCurrency(-500)).toBe('-$500');
  });

  it('uses the boundary of each magnitude, not rounding, to pick the suffix', () => {
    expect(formatCompactCurrency(999_999)).toBe('$1,000K');
    expect(formatCompactCurrency(999_999_999)).toBe('$1,000M');
  });
});

describe('getFiscalYearLabel', () => {
  it('renders the federal fiscal year with its Oct–Sep range', () => {
    expect(getFiscalYearLabel(2026)).toBe('FY2026 (Oct 2025 – Sep 2026)');
    expect(getFiscalYearLabel(2030)).toBe('FY2030 (Oct 2029 – Sep 2030)');
  });
});
