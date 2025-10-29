/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislative District Lookup Service
 *
 * Maps Census district identifiers to OpenStates legislators by:
 * 1. Querying OpenStates API for all legislators in a state
 * 2. Filtering by chamber (upper/lower) and district number
 * 3. Returning matched legislators with full profile data
 */

import logger from '@/lib/logging/simple-logger';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import type { EnhancedStateLegislator } from '@/types/state-legislature';

export interface DistrictLookupRequest {
  /** State abbreviation (e.g., "MI", "CA") */
  state: string;
  /** Upper chamber (State Senate) district number (e.g., "3") */
  upperDistrict?: string | null;
  /** Lower chamber (State House) district number (e.g., "9") */
  lowerDistrict?: string | null;
}

export interface DistrictLookupResult {
  /** State Senate legislator (if upper district provided) */
  senator: EnhancedStateLegislator | null;
  /** State House/Assembly representative (if lower district provided) */
  representative: EnhancedStateLegislator | null;
  /** All legislators queried (for debugging) */
  _debug?: {
    totalLegislators: number;
    upperChamberCount: number;
    lowerChamberCount: number;
  };
}

export class DistrictLookupService {
  /**
   * Find state legislators by district numbers
   */
  static async findLegislatorsByDistrict(
    request: DistrictLookupRequest
  ): Promise<DistrictLookupResult> {
    const startTime = Date.now();
    const { state, upperDistrict, lowerDistrict } = request;

    logger.info('Looking up state legislators by district', {
      state,
      upperDistrict,
      lowerDistrict,
    });

    // Fetch all legislators for the state
    const allLegislators = await StateLegislatureCoreService.getAllStateLegislators(state);

    logger.info('Retrieved legislators from OpenStates', {
      state,
      totalCount: allLegislators.length,
      responseTime: Date.now() - startTime,
    });

    // Find matching senator (upper chamber)
    let senator: EnhancedStateLegislator | null = null;
    if (upperDistrict) {
      senator = this.findLegislatorInChamber(allLegislators, 'upper', upperDistrict);
      if (senator) {
        logger.info('Found matching senator', {
          state,
          district: upperDistrict,
          name: senator.name,
          party: senator.party,
        });
      } else {
        logger.warn('No senator found for district', {
          state,
          district: upperDistrict,
        });
      }
    }

    // Find matching representative (lower chamber)
    let representative: EnhancedStateLegislator | null = null;
    if (lowerDistrict) {
      representative = this.findLegislatorInChamber(allLegislators, 'lower', lowerDistrict);
      if (representative) {
        logger.info('Found matching representative', {
          state,
          district: lowerDistrict,
          name: representative.name,
          party: representative.party,
        });
      } else {
        logger.warn('No representative found for district', {
          state,
          district: lowerDistrict,
        });
      }
    }

    return {
      senator,
      representative,
      _debug: {
        totalLegislators: allLegislators.length,
        upperChamberCount: allLegislators.filter(l => l.chamber === 'upper').length,
        lowerChamberCount: allLegislators.filter(l => l.chamber === 'lower').length,
      },
    };
  }

  /**
   * Find a specific legislator by chamber and district number
   *
   * Matches district strings with normalization:
   * - "3" matches "3", "03", "003"
   * - "District 3" matches "3"
   * - Handles various OpenStates district naming formats
   */
  private static findLegislatorInChamber(
    legislators: EnhancedStateLegislator[],
    chamber: 'upper' | 'lower',
    districtNumber: string
  ): EnhancedStateLegislator | null {
    // Normalize the target district number (remove leading zeros, extract numbers)
    const normalizedTarget = this.normalizeDistrictNumber(districtNumber);

    // Filter to chamber and find matching district
    const matches = legislators.filter(legislator => {
      if (legislator.chamber !== chamber) return false;

      const normalizedLegislatorDistrict = this.normalizeDistrictNumber(legislator.district);
      return normalizedLegislatorDistrict === normalizedTarget;
    });

    if (matches.length > 1) {
      logger.warn('Multiple legislators found for district', {
        chamber,
        districtNumber,
        matchCount: matches.length,
        legislators: matches.map(m => ({ name: m.name, district: m.district })),
      });
      // Return first match (multi-member districts are possible)
      return matches[0] ?? null;
    }

    return matches[0] ?? null;
  }

  /**
   * Normalize district numbers for comparison
   *
   * Examples:
   * - "003" → "3"
   * - "District 9" → "9"
   * - "9" → "9"
   * - "At-Large" → "0"
   */
  private static normalizeDistrictNumber(district: string): string {
    // Extract first number from string
    const match = district.match(/\d+/);
    if (!match) {
      // Handle at-large districts
      if (district.toLowerCase().includes('large')) return '0';
      return district.toLowerCase();
    }

    // Remove leading zeros
    return parseInt(match[0], 10).toString();
  }
}

// Export singleton-style utility function
export const districtLookup = {
  findLegislatorsByDistrict: (request: DistrictLookupRequest) =>
    DistrictLookupService.findLegislatorsByDistrict(request),
};
