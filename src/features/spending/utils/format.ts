/**
 * Formatting utilities for federal spending display
 */

/**
 * Format a currency amount into a compact human-readable string.
 * Examples: $1.2B, $450M, $12.3K, $500
 */
export function formatCompactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const value = abs / 1_000_000_000;
    return `${sign}$${value >= 100 ? Math.round(value).toLocaleString() : value.toFixed(1).replace(/\.0$/, '')}B`;
  }
  if (abs >= 1_000_000) {
    const value = abs / 1_000_000;
    return `${sign}$${value >= 100 ? Math.round(value).toLocaleString() : value.toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (abs >= 1_000) {
    const value = abs / 1_000;
    return `${sign}$${value >= 100 ? Math.round(value).toLocaleString() : value.toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

/**
 * Get a fiscal year label with date range.
 * Example: "FY2026 (Oct 2025 - Sep 2026)"
 */
export function getFiscalYearLabel(year: number): string {
  return `FY${year} (Oct ${year - 1} \u2013 Sep ${year})`;
}
