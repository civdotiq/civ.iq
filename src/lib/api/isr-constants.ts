/**
 * ISR (Incremental Static Regeneration) Time Constants
 *
 * Centralized configuration for API route revalidation times.
 * Ensures consistency across 90+ API routes.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ISR revalidation times in seconds.
 * Organized by data volatility and update frequency.
 */
export const ISR_TIMES = {
  /**
   * Real-time data - 5 minutes
   * Use for: News, trending topics, search results
   */
  REALTIME: 300,

  /**
   * Frequently updated - 1 hour
   * Use for: Votes, bills, finance data, geocoding
   */
  HOURLY: 3600,

  /**
   * Daily updated - 24 hours
   * Use for: Committee info, representative details, district data
   */
  DAILY: 86400,

  /**
   * Slowly changing - 3 days
   * Use for: State legislature sessions, batch data
   */
  THREE_DAYS: 259200,

  /**
   * Static reference data - 7 days
   * Use for: District boundaries, congress stats, photos
   */
  WEEKLY: 604800,

  /**
   * Very stable data - 30 days
   * Use for: Unified geocoding, state representative mappings
   */
  MONTHLY: 2592000,

  /**
   * Historical/archived data - 6 months
   * Use for: Historical voting records
   */
  SIX_MONTHS: 15552000,
} as const;

/**
 * Type for ISR time values
 */
export type ISRTime = (typeof ISR_TIMES)[keyof typeof ISR_TIMES];

/**
 * Helper to get human-readable description of ISR time
 */
export function describeISRTime(seconds: number): string {
  if (seconds <= 300) return '5 minutes (real-time)';
  if (seconds <= 3600) return '1 hour (frequently updated)';
  if (seconds <= 86400) return '24 hours (daily)';
  if (seconds <= 259200) return '3 days (slowly changing)';
  if (seconds <= 604800) return '7 days (static)';
  if (seconds <= 2592000) return '30 days (very stable)';
  return '6+ months (historical)';
}

/**
 * Recommended ISR times by data category.
 * Reference guide for choosing appropriate revalidation.
 */
export const ISR_RECOMMENDATIONS = {
  // Real-time (5 min)
  news: ISR_TIMES.REALTIME,
  trending: ISR_TIMES.REALTIME,
  search: ISR_TIMES.REALTIME,
  rssFeeds: ISR_TIMES.REALTIME,

  // Hourly (1 hour)
  votes: ISR_TIMES.HOURLY,
  bills: ISR_TIMES.HOURLY,
  finance: ISR_TIMES.HOURLY,
  geocoding: ISR_TIMES.HOURLY,
  comparison: ISR_TIMES.HOURLY,

  // Daily (24 hours)
  committees: ISR_TIMES.DAILY,
  representatives: ISR_TIMES.DAILY,
  districts: ISR_TIMES.DAILY,
  stateExecutives: ISR_TIMES.DAILY,
  stateJudiciary: ISR_TIMES.DAILY,

  // Three days
  stateLegislature: ISR_TIMES.THREE_DAYS,
  stateLegislatorProfiles: ISR_TIMES.THREE_DAYS,
  batchData: ISR_TIMES.THREE_DAYS,

  // Weekly (7 days)
  boundaries: ISR_TIMES.WEEKLY,
  congressStats: ISR_TIMES.WEEKLY,
  photos: ISR_TIMES.WEEKLY,
  wikipedia: ISR_TIMES.WEEKLY,

  // Monthly (30 days)
  unifiedGeocoding: ISR_TIMES.MONTHLY,
  stateRepresentativeMappings: ISR_TIMES.MONTHLY,
  stateCommittees: ISR_TIMES.MONTHLY,

  // Historical (6 months)
  historicalVotes: ISR_TIMES.SIX_MONTHS,
} as const;
