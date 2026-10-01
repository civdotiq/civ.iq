/**
 * State Demographics API
 * Fetches state-level demographic data from Census Bureau ACS 5-Year Survey
 *
 * Data Source: Census.gov ACS 5-Year (see census-state-demographics.ts)
 * Endpoint: GET /api/state-demographics/[stateCode]
 *
 * Provides comprehensive demographic data for Senator profiles:
 * - Population and demographics
 * - Income and economics
 * - Education attainment
 * - Housing statistics
 * - Age distribution
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getStateDemographics,
  hasStateDemographics,
  STATE_DEMOGRAPHICS_ACS_YEAR,
} from '@/lib/data-sources/census-state-demographics';

export const dynamic = 'force-dynamic';

/**
 * Main API route handler
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stateCode: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const { stateCode } = await params;
    const normalizedCode = stateCode.trim().toUpperCase();

    // Validate state code
    if (!hasStateDemographics(normalizedCode)) {
      return NextResponse.json(
        {
          error: 'Invalid state code',
          message:
            'State code must be a 2-letter abbreviation for a state, DC or Puerto Rico (the ACS areas)',
          examples: ['CA', 'NY', 'TX', 'FL'],
          provided: stateCode,
        },
        { status: 400 }
      );
    }

    const demographics = await getStateDemographics(normalizedCode);

    const processingTime = Date.now() - startTime;

    // Return with cache headers
    return NextResponse.json(demographics, {
      headers: {
        'Cache-Control': 'public, max-age=1800, s-maxage=3600', // 30 min client, 1 hr CDN
        'Content-Type': 'application/json; charset=utf-8',
        'X-Processing-Time': `${processingTime}ms`,
        'X-Data-Source': `Census Bureau ACS ${STATE_DEMOGRAPHICS_ACS_YEAR}`,
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch state demographics',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        processing_time_ms: processingTime,
      },
      {
        status: 500,
        headers: {
          'X-Processing-Time': `${processingTime}ms`,
        },
      }
    );
  }
}
