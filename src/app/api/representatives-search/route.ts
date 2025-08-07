/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCongressionalDistrictFromZip,
  getCongressionalDistrictFromAddress,
} from '@/lib/census-api';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_QUERY',
            message: 'Query parameter is required',
          },
        },
        { status: 400 }
      );
    }

    logger.info(
      'Processing enhanced search request',
      {
        operation: 'representatives_search',
        query: query.substring(0, 100), // Log first 100 chars for debugging
      },
      request
    );

    // Detect search type
    const isZipCode = /^\d{5}$/.test(query.trim());
    const isAddress = !isZipCode && query.length > 5;

    let districtInfo = null;
    let searchType = 'unknown';

    if (isZipCode) {
      searchType = 'zip';
      districtInfo = await getCongressionalDistrictFromZip(query.trim());
    } else if (isAddress) {
      searchType = 'address';
      districtInfo = await getCongressionalDistrictFromAddress(query.trim());
    }

    if (!districtInfo) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DISTRICT_NOT_FOUND',
            message: `No congressional district found for: ${query}`,
            searchType,
          },
        },
        { status: 404 }
      );
    }

    // Get all representatives
    const allRepresentatives = await getAllEnhancedRepresentatives();

    // Filter representatives for this district
    const districtRepresentatives = allRepresentatives.filter(rep => {
      if (rep.chamber === 'Senate' && rep.state === districtInfo.state) {
        return true;
      }
      if (
        rep.chamber === 'House' &&
        rep.state === districtInfo.state &&
        rep.district &&
        districtInfo.district
      ) {
        // Normalize district numbers for comparison (handle '04' vs '4')
        const repDistrict = parseInt(rep.district, 10);
        const targetDistrict = parseInt(districtInfo.district, 10);
        return repDistrict === targetDistrict;
      }
      return false;
    });

    if (districtRepresentatives.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_REPRESENTATIVES_FOUND',
            message: `No representatives found for ${districtInfo.state}-${districtInfo.district}`,
            districtInfo,
          },
        },
        { status: 404 }
      );
    }

    // Check if we have the expected number of representatives (2 senators + 1 house rep)
    const expectedCount = 3;
    const actualCount = districtRepresentatives.length;

    if (actualCount < expectedCount) {
      logger.warn(
        'Incomplete representative data',
        {
          operation: 'representatives_search',
          district: `${districtInfo.state}-${districtInfo.district}`,
          expected: expectedCount,
          actual: actualCount,
          missing: expectedCount - actualCount,
        },
        request
      );
    }

    const response = {
      success: true,
      representatives: districtRepresentatives,
      district: districtInfo,
      metadata: {
        searchType,
        query,
        totalFound: districtRepresentatives.length,
        senators: districtRepresentatives.filter(r => r.chamber === 'Senate').length,
        houseReps: districtRepresentatives.filter(r => r.chamber === 'House').length,
        source: 'enhanced-search',
        timestamp: new Date().toISOString(),
        isComplete: actualCount === expectedCount,
        warning:
          actualCount < expectedCount
            ? 'Incomplete representative data - some representatives may be missing'
            : null,
      },
    };

    logger.info(
      'Enhanced search completed successfully',
      {
        operation: 'representatives_search',
        searchType,
        totalFound: districtRepresentatives.length,
        district: `${districtInfo.state}-${districtInfo.district}`,
        matchedAddress: districtInfo.matchedAddress,
      },
      request
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error(
      'Enhanced search failed',
      error as Error,
      {
        operation: 'representatives_search',
      },
      request
    );

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while processing your search',
        },
      },
      { status: 500 }
    );
  }
}
