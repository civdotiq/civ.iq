/**
 * Election-Aware ISR Revalidation Utility
 *
 * Provides dynamic revalidation periods based on election season:
 * - Election Season (Oct-Dec): 3 days (259,200 seconds)
 * - Off-Season (Jan-Sep): 30 days (2,592,000 seconds)
 *
 * This ensures fresh data during critical election periods while
 * reducing API calls during stable periods.
 */

/**
 * Get election-aware ISR revalidation period in seconds
 * @returns Revalidation period in seconds (259200 or 2592000)
 */
export function getElectionAwareRevalidation(): number {
  const now = new Date();
  const month = now.getMonth(); // 0-11 (0=Jan, 9=Oct, 10=Nov, 11=Dec)
  const isElectionSeason = month >= 9 && month <= 11; // Oct-Dec

  return isElectionSeason ? 259200 : 2592000; // 3 days or 30 days
}

/**
 * Check if currently in election season
 * @returns true if Oct-Dec, false otherwise
 */
export function isElectionSeason(): boolean {
  const month = new Date().getMonth();
  return month >= 9 && month <= 11;
}
