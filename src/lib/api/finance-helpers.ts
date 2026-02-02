/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Finance Route Helper Utilities
 *
 * This module provides shared utilities for FEC finance API routes to reduce
 * code duplication. It consolidates:
 * - FEC mapping validation
 * - Cache key generation
 * - HTTP cache headers for FEC data
 * - Empty response factories
 */

import { NextResponse } from 'next/server';
import { bioguideToFECMapping, FECMapping } from '@/lib/data/bioguide-fec-mapping';

/**
 * FEC data cache constants
 * FEC data updates quarterly, so long cache times are appropriate
 */
export const FEC_CACHE = {
  /** 30 days in milliseconds - for quarterly FEC data */
  TTL_30_DAYS: 2592000000,
  /** 6 hours in milliseconds - for more frequent updates */
  TTL_6_HOURS: 21600000,
  /** 1 hour in milliseconds */
  TTL_1_HOUR: 3600000,
} as const;

/**
 * Standard HTTP cache headers for FEC data
 * FEC data updates quarterly, so 30-day cache with 1-day stale-while-revalidate
 */
export const FEC_CACHE_HEADERS = new Headers({
  'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400',
  'CDN-Cache-Control': 'public, max-age=2592000',
  Vary: 'Accept-Encoding',
});

/**
 * Cache key generators for finance endpoints
 */
export const FinanceCacheKeys = {
  industries: (bioguideId: string, cycle: number = 2024) =>
    `finance-industries:${bioguideId}:${cycle}`,

  contributors: (bioguideId: string, cycle: number = 2024) =>
    `finance-contributors-v2:${bioguideId}:${cycle}`,

  expenditures: (bioguideId: string, cycle: number = 2024) =>
    `finance-expenditures:${bioguideId}:${cycle}`,

  geography: (bioguideId: string, cycle: number = 2024) =>
    `finance-geography:${bioguideId}:${cycle}`,

  fundingSources: (bioguideId: string, cycle: number = 2024) =>
    `finance-funding-sources:${bioguideId}:${cycle}`,

  comprehensive: (bioguideId: string, cycle: number = 2024) =>
    `finance-comprehensive:${bioguideId}:${cycle}`,
} as const;

/**
 * Result of FEC mapping validation
 */
export interface FECMappingResult {
  success: true;
  mapping: FECMapping;
}

export interface FECMappingNotFound {
  success: false;
  bioguideId: string;
}

/**
 * Validates that a bioguideId has an FEC mapping
 * Returns the mapping if found, or a standardized "not found" indicator
 */
export function validateFECMapping(bioguideId: string): FECMappingResult | FECMappingNotFound {
  const mapping = bioguideToFECMapping[bioguideId];
  if (!mapping) {
    return { success: false, bioguideId };
  }
  return { success: true, mapping };
}

/**
 * Gets FEC mapping or null
 */
export function getFECMapping(bioguideId: string): FECMapping | null {
  return bioguideToFECMapping[bioguideId] || null;
}

/**
 * Creates FEC transparency link
 */
export function getFECCandidateLink(fecId: string): string {
  return `https://www.fec.gov/data/candidate/${fecId}`;
}

/**
 * Creates FEC receipts link
 */
export function getFECReceiptsLink(
  fecId: string,
  committeeId?: string,
  cycle: number = 2024
): string {
  if (committeeId) {
    return `https://www.fec.gov/data/receipts/?two_year_transaction_period=${cycle}&committee_id=${committeeId}`;
  }
  return `https://www.fec.gov/data/receipts/individual-contributions/?candidate_id=${fecId}`;
}

/**
 * Creates FEC disbursements link
 */
export function getFECDisbursementsLink(
  fecId: string,
  committeeId?: string,
  cycle: number = 2024
): string {
  if (committeeId) {
    return `https://www.fec.gov/data/disbursements/?two_year_transaction_period=${cycle}&committee_id=${committeeId}`;
  }
  return `https://www.fec.gov/data/disbursements/?candidate_id=${fecId}`;
}

/**
 * Standard metadata for finance responses
 */
export interface FinanceMetadata {
  bioguideId: string;
  cycle: number;
  lastUpdated: string;
  fecTransparencyLink?: string;
}

/**
 * Creates standard finance metadata
 */
export function createFinanceMetadata(
  bioguideId: string,
  fecId?: string,
  cycle: number = 2024
): FinanceMetadata {
  return {
    bioguideId,
    cycle,
    lastUpdated: new Date().toISOString(),
    fecTransparencyLink: fecId ? getFECCandidateLink(fecId) : undefined,
  };
}

/**
 * Empty response factories for each finance endpoint type
 * Used when no FEC mapping exists or no data is available
 */
export const EmptyFinanceResponses = {
  industries: (bioguideId: string, cycle: number = 2024) => ({
    topIndustries: [],
    dataQuality: {
      totalContributionsAnalyzed: 0,
      contributionsWithEmployer: 0,
      completenessPercentage: 0,
    },
    metadata: createFinanceMetadata(bioguideId, undefined, cycle),
  }),

  contributors: (bioguideId: string, cycle: number = 2024) => ({
    topContributors: [],
    metadata: {
      bioguideId,
      cycle,
      totalContributors: 0,
      totalIndividualContributors: 0,
      totalCommitteeContributors: 0,
      lastUpdated: new Date().toISOString(),
      fecCandidateLink: '',
    },
  }),

  expenditures: (bioguideId: string, fecId?: string, cycle: number = 2024) => ({
    totalDisbursements: 0,
    expenditureCategories: [],
    operatingExpenses: {
      total: 0,
      breakdown: [],
    },
    dataAvailability: {
      hasDetailedData: false,
      dataSource: fecId ? 'FEC.gov' : 'None',
      limitation: fecId ? 'No financial data available for cycle' : 'No FEC mapping available',
    },
    metadata: {
      bioguideId,
      cycle,
      lastUpdated: new Date().toISOString(),
      fecTransparencyLink: fecId ? getFECCandidateLink(fecId) : '',
    },
  }),

  geography: (bioguideId: string, fecId?: string, cycle: number = 2024) => ({
    inStateTotal: 0,
    outOfStateTotal: 0,
    inStatePercentage: 0,
    outOfStatePercentage: 0,
    topStates: [],
    dataQuality: {
      totalContributionsAnalyzed: 0,
      contributionsWithState: 0,
      completenessPercentage: 0,
    },
    metadata: {
      bioguideId,
      representativeState: '',
      cycle,
      lastUpdated: new Date().toISOString(),
      fecTransparencyLink: fecId ? getFECCandidateLink(fecId) : '',
    },
  }),

  fundingSources: (bioguideId: string, fecId?: string, cycle: number = 2024) => ({
    totalRaised: 0,
    individualContributions: { amount: 0, percentage: 0 },
    pacContributions: { amount: 0, percentage: 0, breakdown: [] },
    partyContributions: { amount: 0, percentage: 0 },
    candidateContributions: { amount: 0, percentage: 0 },
    otherContributions: { amount: 0, percentage: 0 },
    metadata: {
      bioguideId,
      cycle,
      lastUpdated: new Date().toISOString(),
      fecTransparencyLink: fecId ? getFECCandidateLink(fecId) : '',
      dataSource: fecId
        ? 'FEC.gov Financial Summary - No data available'
        : 'No FEC mapping available',
    },
  }),

  comprehensive: (bioguideId: string, fecId?: string, cycle: number = 2024) => ({
    finance: {
      totalRaised: 0,
      totalSpent: 0,
      cashOnHand: 0,
      individualContributions: 0,
      pacContributions: 0,
      partyContributions: 0,
      candidateContributions: 0,
      candidateId: fecId,
      fecTransparencyLinks: fecId
        ? {
            candidatePage: getFECCandidateLink(fecId),
            contributions: getFECReceiptsLink(fecId),
            disbursements: getFECDisbursementsLink(fecId),
            financialSummary: `https://www.fec.gov/data/candidate/${fecId}/totals`,
          }
        : undefined,
    },
    contributors: {
      topContributors: [],
      metadata: {
        totalIndividualContributors: 0,
        totalCommitteeContributors: 0,
      },
    },
    industries: {
      topIndustries: [],
      metadata: {
        totalAnalyzed: 0,
      },
    },
    metadata: {
      bioguideId,
      cycle,
      lastUpdated: new Date().toISOString(),
      cacheHit: false,
      sampleSize: 0,
    },
  }),
} as const;

/**
 * Helper to add FEC cache headers to a response
 */
export function withFECCacheHeaders<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { headers: FEC_CACHE_HEADERS });
}

/**
 * Standard cache options for govCache.set()
 */
export const FEC_CACHE_OPTIONS = {
  ttl: FEC_CACHE.TTL_30_DAYS,
  source: 'fec-api',
  dataType: 'finance',
} as const;

/**
 * Shorter cache options for more frequently changing data
 */
export const FEC_SHORT_CACHE_OPTIONS = {
  ttl: FEC_CACHE.TTL_6_HOURS,
  source: 'fec-api',
  dataType: 'finance',
} as const;
