/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State District Profile Service
 *
 * Orchestrates Census demographics + OpenStates legislators + TIGERweb boundaries
 * into a unified district profile. Fetches sources in parallel with graceful degradation.
 */

import { getStateDistrictDemographics } from '@/lib/services/state-census-api.service';
import { getDistrictBoundary } from '@/lib/services/tigerweb-boundary.service';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import { govCache } from '@/services/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  StateChamber,
  StateDistrictProfile,
  StateLegislatorSummary,
} from '@/types/state-legislature';

// 30-day TTL for combined profiles (matches Census data update cycle)
const PROFILE_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

/**
 * Build a complete state district profile by combining data from multiple sources.
 * Returns partial data if any source fails.
 */
export async function getStateDistrictProfile(
  state: string,
  chamber: StateChamber,
  district: string
): Promise<StateDistrictProfile> {
  const stateUpper = state.toUpperCase();
  const cacheKey = `district-profile:${stateUpper}:${chamber}:${district}`;
  const startTime = Date.now();

  try {
    // Check cache first
    const cached = await govCache.get<StateDistrictProfile>(cacheKey);
    if (cached) {
      logger.info('District profile cache hit', { state: stateUpper, chamber, district });
      return cached;
    }

    // Fetch all data sources in parallel — graceful degradation on failures
    const [demographicsResult, boundaryResult, legislatorsResult] = await Promise.allSettled([
      getStateDistrictDemographics(stateUpper, district, chamber),
      getDistrictBoundary(stateUpper, chamber, district),
      getDistrictLegislators(stateUpper, chamber, district),
    ]);

    const demographics =
      demographicsResult.status === 'fulfilled' ? demographicsResult.value : null;
    const boundary = boundaryResult.status === 'fulfilled' ? boundaryResult.value : null;
    const legislators = legislatorsResult.status === 'fulfilled' ? legislatorsResult.value : [];

    const profile: StateDistrictProfile = {
      state: stateUpper,
      chamber,
      district,
      demographics,
      legislators,
      boundary,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the combined profile
    await govCache.set(cacheKey, profile, {
      ttl: PROFILE_CACHE_TTL,
      source: 'district-profile',
      dataType: 'districts',
    });

    logger.info('District profile built', {
      state: stateUpper,
      chamber,
      district,
      hasDemographics: !!demographics,
      hasBoundary: !!boundary,
      legislatorCount: legislators.length,
      responseTime: Date.now() - startTime,
    });

    return profile;
  } catch (error) {
    logger.error('District profile build failed', error as Error, {
      state: stateUpper,
      chamber,
      district,
      responseTime: Date.now() - startTime,
    });

    // Return minimal profile on total failure
    return {
      state: stateUpper,
      chamber,
      district,
      demographics: null,
      legislators: [],
      boundary: null,
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Find legislators for a specific district.
 */
async function getDistrictLegislators(
  state: string,
  chamber: StateChamber,
  district: string
): Promise<StateLegislatorSummary[]> {
  const allLegislators = await StateLegislatureCoreService.getStateLegislatorsSummary(
    state,
    chamber
  );
  return allLegislators.filter(leg => leg.district === district);
}
