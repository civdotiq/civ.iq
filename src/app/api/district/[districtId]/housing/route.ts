/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { hudService } from '@/lib/data-sources/hud-service';
import logger from '@/lib/logging/simple-logger';

export const revalidate = 86400; // 24 hours — HUD data updates annually

/**
 * Housing affordability data for a congressional district.
 *
 * Returns HUD fair market rents and income limits by county FIPS.
 * District ID is used to extract the state, then we look up county FIPS
 * codes for that state to fetch HUD data.
 *
 * @example GET /api/district/CA-12/housing
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  const { districtId } = await params;

  try {
    if (!districtId) {
      return NextResponse.json({ error: 'District ID is required' }, { status: 400 });
    }

    const stateMatch = districtId.match(/^([A-Z]{2})/i);
    if (!stateMatch?.[1]) {
      return NextResponse.json(
        { error: 'Invalid district ID format. Expected format: ST-NN (e.g., CA-12)' },
        { status: 400 }
      );
    }

    const state = stateMatch[1].toUpperCase();

    // State FIPS codes for HUD API lookup
    const stateFips: Record<string, string> = {
      AL: '01',
      AK: '02',
      AZ: '04',
      AR: '05',
      CA: '06',
      CO: '08',
      CT: '09',
      DE: '10',
      FL: '12',
      GA: '13',
      HI: '15',
      ID: '16',
      IL: '17',
      IN: '18',
      IA: '19',
      KS: '20',
      KY: '21',
      LA: '22',
      ME: '23',
      MD: '24',
      MA: '25',
      MI: '26',
      MN: '27',
      MS: '28',
      MO: '29',
      MT: '30',
      NE: '31',
      NV: '32',
      NH: '33',
      NJ: '34',
      NM: '35',
      NY: '36',
      NC: '37',
      ND: '38',
      OH: '39',
      OK: '40',
      OR: '41',
      PA: '42',
      RI: '44',
      SC: '45',
      SD: '46',
      TN: '47',
      TX: '48',
      UT: '49',
      VT: '50',
      VA: '51',
      WA: '53',
      WV: '54',
      WI: '55',
      WY: '56',
      DC: '11',
    };

    const fips = stateFips[state];
    if (!fips) {
      return NextResponse.json({ error: 'Unknown state code' }, { status: 400 });
    }

    // Use state-level FIPS + "001" as default county (statewide data)
    // HUD API accepts state FIPS for statewide fair market rents
    const countyFips = `${fips}001`;

    const [fairMarketRents, incomeLimits] = await Promise.all([
      hudService.getFairMarketRents(countyFips).catch(e => {
        logger.error('HUD FMR fetch failed', e as Error, { districtId });
        return null;
      }),
      hudService.getIncomeLimits(countyFips).catch(e => {
        logger.error('HUD income limits fetch failed', e as Error, { districtId });
        return null;
      }),
    ]);

    if (!fairMarketRents && !incomeLimits) {
      return NextResponse.json(
        { error: 'Housing data not available. HUD API token may not be configured.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        districtId,
        state,
        fairMarketRents,
        incomeLimits,
        dataSource: 'U.S. Department of Housing and Urban Development',
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      }
    );
  } catch (error) {
    logger.error('Housing data error', error as Error, { districtId });
    return NextResponse.json({ error: 'Failed to fetch housing data' }, { status: 500 });
  }
}
