/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Address Representatives Resolver
 *
 * Lightweight district resolver: address/ZIP -> congressional district -> rep list.
 * No heavy analysis — just identity resolution for progressive loading.
 *
 * POST /api/intelligence/address/representatives  (street/city/state address)
 * GET  /api/intelligence/address/representatives?zip=20001  (ZIP fallback)
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { CensusGeocoderService } from '@/services/geocoding/census-geocoder.service';
import { getAllDistrictsForZip } from '@/lib/data/zip-district-mapping-119th';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { withTimeout } from '@/lib/intelligence/analyzers/shared';
import type { InsightError } from '@/lib/intelligence/types';
import { ZIP_ACCURACY_NOTE } from '@/lib/backbone/zip-accuracy';
import type { DataQuality, SourceStatus } from '@/types/backbone-response';

function sourceStatusOf(
  source: string,
  status: SourceStatus['status'],
  errorMessage?: string
): SourceStatus {
  return {
    source,
    status,
    ...(errorMessage ? { errorMessage } : {}),
    fetchedAt: new Date().toISOString(),
  };
}

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ── Types ────────────────────────────────────────────────────────────

interface RepresentativeIdentity {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: string | null;
  chamber: 'House' | 'Senate';
}

interface RepresentativesResponse {
  representatives: RepresentativeIdentity[];
  state: string;
  district: string;
  multiDistrict: boolean;
  // accuracyNote is only populated on ZIP (GET) input; address POST leaves it unset.
  accuracyNote?: string;
  // ADDITIVE BackboneResponse fields. This route is publicly documented in
  // openapi.json, so the existing top-level payload is preserved and the
  // envelope's honesty fields are added alongside it (geocode precedent,
  // decision 2026-07-05) rather than wrapping the payload under `data`.
  dataQuality?: DataQuality;
  sourceStatus?: SourceStatus[];
}

type RouteResponse = RepresentativesResponse | { error: string };

// ── Shared Logic ─────────────────────────────────────────────────────

async function resolveRepresentatives(
  state: string,
  district: string,
  multiDistrict: boolean
): Promise<RepresentativesResponse> {
  const allReps = await RepresentativesCoreService.getAllRepresentatives();
  const stateUpper = state.toUpperCase();

  const districtReps = allReps.filter(rep => {
    if (rep.state !== stateUpper) return false;
    if (rep.chamber === 'Senate') return true;
    return rep.chamber === 'House' && rep.district === district;
  });

  return {
    representatives: districtReps.map(rep => ({
      bioguideId: rep.bioguideId,
      name: rep.name,
      party: rep.party,
      state: rep.state,
      district: rep.district ?? null,
      chamber: rep.chamber as 'House' | 'Senate',
    })),
    state: stateUpper,
    district,
    multiDistrict,
  };
}

// ── POST: Address Resolution ─────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse<RouteResponse>> {
  try {
    const body = (await request.json()) as Partial<{
      street: string;
      city: string;
      state: string;
      zip: string;
    }>;

    if (!body.street || !body.city || !body.state) {
      return NextResponse.json({ error: 'street, city, and state are required' }, { status: 400 });
    }

    logger.info('[Representatives] POST address resolution', {
      city: body.city,
      state: body.state,
    });

    const geocodeResult = await withTimeout(
      CensusGeocoderService.geocodeAddress({
        street: body.street,
        city: body.city,
        state: body.state,
        zip: body.zip,
      }),
      15_000,
      'CensusGeocode'
    );

    if (!geocodeResult.congressionalDistrict) {
      return NextResponse.json(
        {
          error: 'Could not resolve congressional district for this address',
          errors: [] as InsightError[],
          status: 'unavailable' as const,
          dataQuality: 'empty' as const,
          sourceStatus: [
            sourceStatusOf('census-geocoder', 'ok', 'No district matched this address'),
          ],
        },
        { status: 404 }
      );
    }

    const result = await resolveRepresentatives(
      body.state.toUpperCase(),
      geocodeResult.congressionalDistrict.number,
      false
    );

    return NextResponse.json(
      {
        ...result,
        errors: [] as InsightError[],
        status: 'complete' as const,
        // Address input resolved via Census: authoritative
        dataQuality: 'complete' as const,
        sourceStatus: [
          sourceStatusOf('census-geocoder', 'ok'),
          sourceStatusOf('congress-legislators', 'ok'),
        ],
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Representatives] POST error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── GET: ZIP Code Fallback ───────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse<RouteResponse>> {
  try {
    const zip = request.nextUrl.searchParams.get('zip');

    if (!zip || !/^\d{5}$/.test(zip)) {
      return NextResponse.json(
        { error: 'A valid 5-digit zip query parameter is required' },
        { status: 400 }
      );
    }

    logger.info('[Representatives] GET zip resolution', { zip });

    const districts = getAllDistrictsForZip(zip);

    if (districts.length === 0) {
      return NextResponse.json(
        {
          error: `No congressional district found for ZIP ${zip}`,
          errors: [] as InsightError[],
          status: 'unavailable' as const,
          dataQuality: 'empty' as const,
          sourceStatus: [
            sourceStatusOf('zip-district-mapping', 'ok', 'ZIP not mapped to any district'),
          ],
        },
        { status: 404 }
      );
    }

    const multiDistrict = districts.length > 1;
    const primary = districts.find(d => d.primary) ?? districts[0]!;

    const result = await resolveRepresentatives(
      primary.state.toUpperCase(),
      primary.district,
      multiDistrict
    );

    return NextResponse.json(
      {
        ...result,
        accuracyNote: ZIP_ACCURACY_NOTE,
        errors: [] as InsightError[],
        // ZIP input is approximate — the wider pipeline signals this as 'partial'.
        status: 'partial' as const,
        dataQuality: 'partial' as const,
        sourceStatus: [
          sourceStatusOf('zip-district-mapping', 'ok'),
          sourceStatusOf('congress-legislators', 'ok'),
        ],
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Representatives] GET error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
