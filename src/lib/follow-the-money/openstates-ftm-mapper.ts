/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OpenStates to FollowTheMoney Entity ID Mapper
 *
 * Maps OpenStates legislator IDs to FollowTheMoney entity IDs.
 * Strategy:
 * 1. Check other_identifiers on the OpenStates legislator for a 'followthemoney' scheme
 * 2. If not found, search FTM API by name + state + district
 * 3. Cache the mapping for 30 days
 */

import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import type { EnhancedStateLegislator } from '@/types/state-legislature';
import type { FTMEntityRecord } from './types';
import { ftmApiService } from './ftm-api-service';

const MAPPING_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Resolve a FollowTheMoney entity ID for a state legislator.
 * Returns the entity ID or null if no match found.
 */
export async function resolveFTMEntityId(
  legislator: EnhancedStateLegislator
): Promise<string | null> {
  const cacheKey = `ftm:mapping:${legislator.id}`;

  try {
    // Check mapping cache
    const cached = await govCache.get<string>(cacheKey);
    if (cached) return cached;

    // 1. Check other_identifiers for followthemoney scheme
    const ftmIdentifier = legislator.other_identifiers?.find(id => id.scheme === 'followthemoney');
    if (ftmIdentifier?.identifier) {
      await govCache.set(cacheKey, ftmIdentifier.identifier, {
        ttl: MAPPING_CACHE_TTL,
        source: 'openstates-identifier',
        dataType: 'finance',
      });
      return ftmIdentifier.identifier;
    }

    // Also check the ids field
    if (legislator.ids?.followthemoney) {
      await govCache.set(cacheKey, legislator.ids.followthemoney, {
        ttl: MAPPING_CACHE_TTL,
        source: 'openstates-identifier',
        dataType: 'finance',
      });
      return legislator.ids.followthemoney;
    }

    // 2. Search FTM API by name + state
    const searchResults = await ftmApiService.searchCandidates(
      legislator.state,
      legislator.lastName ?? legislator.name.split(' ').pop()
    );

    // Find best match by name similarity
    const match = findBestMatch(legislator, searchResults);
    if (match?.eid) {
      await govCache.set(cacheKey, match.eid, {
        ttl: MAPPING_CACHE_TTL,
        source: 'ftm-search',
        dataType: 'finance',
      });

      logger.info('FTM entity mapped via search', {
        legislatorId: legislator.id,
        legislatorName: legislator.name,
        ftmEntityId: match.eid,
        ftmCandidateName: match.candidate_name,
      });

      return match.eid;
    }

    logger.info('No FTM entity match found', {
      legislatorId: legislator.id,
      legislatorName: legislator.name,
      state: legislator.state,
      searchResultCount: searchResults.length,
    });

    return null;
  } catch (error) {
    logger.error('FTM entity mapping failed', error as Error, {
      legislatorId: legislator.id,
      legislatorName: legislator.name,
    });
    return null;
  }
}

/**
 * Find the best matching FTM entity for a legislator by name comparison.
 */
function findBestMatch(
  legislator: EnhancedStateLegislator,
  candidates: FTMEntityRecord[]
): FTMEntityRecord | null {
  if (candidates.length === 0) return null;

  const legislatorName = legislator.name.toLowerCase();
  const legislatorLast = (
    legislator.lastName ??
    legislator.name.split(' ').pop() ??
    ''
  ).toLowerCase();
  const legislatorFirst = (
    legislator.firstName ??
    legislator.name.split(' ')[0] ??
    ''
  ).toLowerCase();

  // Score each candidate
  let bestMatch: FTMEntityRecord | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const candidateName = (candidate.candidate_name ?? '').toLowerCase();
    const candidateLast = (candidate.last_name ?? '').toLowerCase();
    const candidateFirst = (candidate.first_name ?? '').toLowerCase();

    let score = 0;

    // Exact full name match
    if (candidateName === legislatorName) score += 10;
    // Last name match
    if (candidateLast === legislatorLast) score += 5;
    // First name match
    if (candidateFirst === legislatorFirst) score += 3;
    // Name contains the other
    if (candidateName.includes(legislatorLast) || legislatorName.includes(candidateLast))
      score += 2;
    // State match (should always be true from search)
    if (candidate.state?.toUpperCase() === legislator.state.toUpperCase()) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  // Require at least last name match (score >= 5)
  return bestScore >= 5 ? bestMatch : null;
}
