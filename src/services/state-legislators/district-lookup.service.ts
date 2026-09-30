/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislative District Lookup Service
 *
 * Maps a geocoded address's Census districts to the state legislators who hold
 * them, in the one-senator, one-representative shape the
 * /api/state-legislators-by-address route returns.
 *
 * District matching is resolveSeat's (Census GEOID → corpus district keys, see
 * src/data/sld-district-keys.json). It used to compare the first run of digits
 * on each side, which merged Minnesota's 62A with 62B and every Massachusetts
 * "7th ..." district with every other.
 */

import logger from '@/lib/logging/simple-logger';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import { getJurisdictionRoster } from '@/lib/data-sources/openstates-people/load-people';
import {
  resolveSeat,
  stateMembersByBucket,
  type StateSeat,
} from '@/services/lookup/resolve-representatives.service';
import type { ParsedDistrictInfo } from '@/services/geocoding/census-geocoder.types';
import type { EnhancedStateLegislator } from '@/types/state-legislature';

export interface DistrictLookupRequest {
  /** USPS code (e.g., "MI"). */
  state: string;
  /** The geocoder's answer: the districts and the vintage their GEOIDs belong to. */
  districts: Pick<ParsedDistrictInfo, 'upperDistrict' | 'lowerDistrict' | 'sldVintage'>;
}

export interface DistrictLookupResult {
  /** First member holding the address's upper-bucket district. */
  senator: EnhancedStateLegislator | null;
  /** First member holding the address's lower-bucket district. */
  representative: EnhancedStateLegislator | null;
  /** Every seat, with all its members, for callers that can show more than one. */
  seats: StateSeat[];
}

export class DistrictLookupService {
  static async findLegislatorsByDistrict(
    request: DistrictLookupRequest
  ): Promise<DistrictLookupResult> {
    const state = request.state.toUpperCase();
    const { upperDistrict, lowerDistrict, sldVintage } = request.districts;

    const roster = await getJurisdictionRoster(state);
    const seats: StateSeat[] = [];
    if (upperDistrict) seats.push(resolveSeat(state, 'upper', upperDistrict, sldVintage, roster));
    if (lowerDistrict) seats.push(resolveSeat(state, 'lower', lowerDistrict, sldVintage, roster));

    const byBucket = stateMembersByBucket(seats);
    const senatorId = byBucket.upper.find(m => !m.atLarge)?.id;
    const representativeId = byBucket.lower.find(m => !m.atLarge)?.id;
    if (!senatorId && !representativeId) {
      return { senator: null, representative: null, seats };
    }

    // The route's response carries the full EnhancedStateLegislator profile.
    const all = await StateLegislatureCoreService.getAllStateLegislators(state);
    const byId = (id: string | undefined) => (id ? (all.find(l => l.id === id) ?? null) : null);
    const result = { senator: byId(senatorId), representative: byId(representativeId), seats };

    logger.info('State legislators matched by district', {
      state,
      seats: seats.map(s => `${s.censusChamber}:${s.status}`).join(','),
      hasSenator: !!result.senator,
      hasRepresentative: !!result.representative,
    });
    return result;
  }
}

export const districtLookup = {
  findLegislatorsByDistrict: (request: DistrictLookupRequest) =>
    DistrictLookupService.findLegislatorsByDistrict(request),
};
