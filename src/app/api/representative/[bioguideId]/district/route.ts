/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { logger } from '@/lib/logging/logger-client';
import {
  acsDistrictUrl,
  censusDistrictFor,
  parseAcsDistrictRow,
  type RepDistrictDemographics,
} from '@/lib/services/rep-district-demographics';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

interface RepTerm {
  startYear?: string;
}

interface RepSummary {
  name?: string;
  party?: string;
  state?: string;
  district?: string | null;
  terms?: RepTerm[];
}

interface DistrictInfo {
  district_number: string | null;
  state: string | null;
  representative: {
    name: string | null;
    party: string | null;
    first_year_in_congress: number | null;
  };
  /** Null for senators or when the Census API is unavailable. */
  demographics: RepDistrictDemographics | null;
  /** No election-results source is wired to this endpoint. */
  elections: null;
  last_updated: string;
}

async function fetchDemographics(
  state: string | undefined,
  district: string | null | undefined
): Promise<RepDistrictDemographics | null> {
  const geo = censusDistrictFor(state, district);
  if (!geo) return null;
  try {
    const res = await fetch(
      acsDistrictUrl(geo.stateFips, geo.districtCode, process.env.CENSUS_API_KEY)
    );
    if (!res.ok) throw new Error(`Census API error: ${res.status}`);
    return parseAcsDistrictRow(await res.json());
  } catch (error) {
    logger.error('Error fetching census data', error as Error, { state, district });
    return null;
  }
}

function firstYear(terms: RepTerm[] | undefined): number | null {
  const years = (terms ?? []).map(t => parseInt(t.startYear ?? '', 10)).filter(y => !isNaN(y));
  return years.length > 0 ? Math.min(...years) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    const repResponse = await fetch(`${request.nextUrl.origin}/api/representative/${bioguideId}`);
    if (!repResponse.ok) {
      return NextResponse.json(
        { error: 'Representative not found' },
        { status: repResponse.status === 404 ? 404 : 502 }
      );
    }
    // /api/representative/{id} wraps the member as { representative: {...} }.
    const body = (await repResponse.json()) as { representative?: RepSummary };
    const rep: RepSummary = body.representative ?? {};

    // A null result is never served from cache (cachedFetch treats it as a miss).
    const demographics = await cachedFetch(
      `district-demographics:v2:${bioguideId}`,
      () => fetchDemographics(rep.state, rep.district),
      24 * 60 * 60
    );

    const districtInfo: DistrictInfo = {
      district_number: rep.district ?? null,
      state: rep.state ?? null,
      representative: {
        name: rep.name ?? null,
        party: rep.party ?? null,
        first_year_in_congress: firstYear(rep.terms),
      },
      demographics,
      elections: null,
      last_updated: new Date().toISOString(),
    };

    return NextResponse.json(districtInfo, {
      headers: {
        'Cache-Control': demographics
          ? 'public, s-maxage=86400, stale-while-revalidate=172800'
          : 'public, s-maxage=300',
      },
    });
  } catch (error) {
    logger.error('API Error', error as Error, { bioguideId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
