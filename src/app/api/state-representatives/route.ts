/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Representatives API Route
 *
 * Returns state legislators for a given ZIP code using the StateLegislatureCoreService.
 * Replaces direct OpenStates HTTP calls with core service (GraphQL + caching).
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import logger from '@/lib/logging/simple-logger';
import type { EnhancedStateLegislator, StateJurisdiction } from '@/types/state-legislature';
import { getAllCongressionalDistrictsForZip } from '@/lib/data/zip-district-mapping';

export const dynamic = 'force-dynamic';

// API Response shape (for backwards compatibility with existing frontend)
interface StateApiResponse {
  zipCode: string;
  state: string;
  stateName: string;
  legislators: Array<{
    id: string;
    name: string;
    party: string;
    chamber: 'upper' | 'lower';
    district: string;
    state: string;
    image?: string;
    email?: string;
    phone?: string;
    website?: string;
  }>;
  jurisdiction?: {
    name: string;
    classification: string;
    chambers: Array<{
      name: string;
      classification: string;
    }>;
  };
}

// Helper function to get state from ZIP code using our ZIP-to-district mapping
function getStateFromZip(zipCode: string): string | null {
  try {
    const districts = getAllCongressionalDistrictsForZip(zipCode);

    if (districts && districts.length > 0) {
      // Return the state from the first district
      const firstDistrict = districts[0];
      return firstDistrict?.state || null;
    }

    return null;
  } catch (error) {
    logger.error('Failed to get state from ZIP', error as Error, { zipCode });
    return null;
  }
}

// Get full state name from abbreviation
function getStateName(abbreviation: string): string {
  const stateNameMap: Record<string, string> = {
    al: 'Alabama',
    ak: 'Alaska',
    az: 'Arizona',
    ar: 'Arkansas',
    ca: 'California',
    co: 'Colorado',
    ct: 'Connecticut',
    de: 'Delaware',
    fl: 'Florida',
    ga: 'Georgia',
    hi: 'Hawaii',
    id: 'Idaho',
    il: 'Illinois',
    in: 'Indiana',
    ia: 'Iowa',
    ks: 'Kansas',
    ky: 'Kentucky',
    la: 'Louisiana',
    me: 'Maine',
    md: 'Maryland',
    ma: 'Massachusetts',
    mi: 'Michigan',
    mn: 'Minnesota',
    ms: 'Mississippi',
    mo: 'Missouri',
    mt: 'Montana',
    ne: 'Nebraska',
    nv: 'Nevada',
    nh: 'New Hampshire',
    nj: 'New Jersey',
    nm: 'New Mexico',
    ny: 'New York',
    nc: 'North Carolina',
    nd: 'North Dakota',
    oh: 'Ohio',
    ok: 'Oklahoma',
    or: 'Oregon',
    pa: 'Pennsylvania',
    ri: 'Rhode Island',
    sc: 'South Carolina',
    sd: 'South Dakota',
    tn: 'Tennessee',
    tx: 'Texas',
    ut: 'Utah',
    vt: 'Vermont',
    va: 'Virginia',
    wa: 'Washington',
    wv: 'West Virginia',
    wi: 'Wisconsin',
    wy: 'Wyoming',
  };

  return stateNameMap[abbreviation.toLowerCase()] || abbreviation.toUpperCase();
}

/**
 * Transform EnhancedStateLegislator to API response format
 */
function transformLegislatorForResponse(legislator: EnhancedStateLegislator) {
  return {
    id: legislator.id,
    name: legislator.name,
    party: legislator.party,
    chamber: legislator.chamber,
    district: legislator.district,
    state: legislator.state,
    image: legislator.photo_url,
    email: legislator.email,
    phone: legislator.phone,
    website: legislator.links?.find(
      (link: { note?: string; url?: string }) => link.note === 'website'
    )?.url,
  };
}

/**
 * Transform StateJurisdiction to API response format
 */
function transformJurisdictionForResponse(jurisdiction: StateJurisdiction) {
  return {
    name: jurisdiction.name,
    classification: jurisdiction.classification,
    chambers: [
      {
        name: jurisdiction.chambers.upper.name,
        classification: 'upper',
      },
      {
        name: jurisdiction.chambers.lower.name,
        classification: 'lower',
      },
    ],
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = request.nextUrl;
  const zipCode = searchParams.get('zip');
  const stateParam = searchParams.get('state'); // Optional state parameter

  if (!zipCode) {
    logger.warn('State representatives request missing ZIP code');
    return NextResponse.json({ error: 'ZIP code is required' }, { status: 400 });
  }

  try {
    // Get state from param first, then fall back to ZIP-to-district mapping
    const stateAbbrev = stateParam || getStateFromZip(zipCode);

    if (!stateAbbrev) {
      logger.warn('Could not determine state from ZIP code', { zipCode });
      return NextResponse.json(
        { error: 'Could not determine state from ZIP code' },
        { status: 400 }
      );
    }

    const stateName = getStateName(stateAbbrev);
    const stateAbbrevUpper = stateAbbrev.toUpperCase();

    logger.info('Fetching state legislators via core service', {
      zipCode,
      state: stateAbbrevUpper,
    });

    // Get jurisdiction info
    const jurisdiction = await StateLegislatureCoreService.getStateJurisdiction(stateAbbrevUpper);

    // Get all state legislators first
    const allLegislators = await StateLegislatureCoreService.getAllStateLegislators(
      stateAbbrevUpper,
      undefined
    );

    if (allLegislators.length === 0) {
      logger.warn('No state legislators found', {
        zipCode,
        state: stateAbbrevUpper,
        reason: 'OpenStates returned empty results or API unavailable',
      });
    }

    // ZIP codes don't map precisely to state legislative districts
    // Return all legislators with a note that address-based lookup is more accurate
    logger.info(
      'ZIP-based lookup: returning all state legislators (address-based lookup recommended)',
      {
        zipCode,
        state: stateAbbrevUpper,
        legislatorCount: allLegislators.length,
      }
    );

    // Transform and sort legislators
    const transformedLegislators = allLegislators
      .map(transformLegislatorForResponse)
      .sort((a, b) => {
        // Sort by chamber (Senate first), then by district
        if (a.chamber !== b.chamber) {
          return a.chamber === 'upper' ? -1 : 1;
        }
        // Natural sort for districts (handles "1", "2", "10" correctly)
        return a.district.localeCompare(b.district, undefined, { numeric: true });
      });

    const response: StateApiResponse = {
      zipCode,
      state: stateAbbrevUpper,
      stateName,
      legislators: transformedLegislators,
      jurisdiction: jurisdiction
        ? transformJurisdictionForResponse(jurisdiction)
        : {
            name: stateName,
            classification: 'state',
            chambers: [
              { name: 'House of Representatives', classification: 'lower' },
              { name: 'Senate', classification: 'upper' },
            ],
          },
    };

    logger.info('State representatives request successful', {
      zipCode,
      state: stateAbbrevUpper,
      legislatorCount: transformedLegislators.length,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('State representatives request failed', error as Error, {
      zipCode,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch state representatives',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
