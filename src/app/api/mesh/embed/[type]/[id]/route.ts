/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Embeddable Widget Endpoint
 *
 * Returns self-contained HTML for iframe embedding on external sites.
 *
 * GET /api/mesh/embed/scorecard/A000360
 * GET /api/mesh/embed/district/CA-12
 * GET /api/mesh/embed/record/D000624   (Incumbent Record Card, mockup 1d)
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { renderScorecard, renderDistrictCard } from '@/lib/mesh/protocol/embed';
import { renderRecordEmbed } from '@/features/record-card/embed';
import { getRecordCardData } from '@/features/record-card/record-card-data';
import { hydrateNeighborhood } from '@/lib/graph/hydrator';
import { buildDistrictProfile } from '@/lib/mesh/district-profile';
import { ApiErrors } from '@/lib/api/error-responses';

export const revalidate = 3600;
export const maxDuration = 60;

const VALID_TYPES = new Set(['scorecard', 'district', 'record']);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
): Promise<NextResponse> {
  const { type, id } = await params;

  if (!VALID_TYPES.has(type)) {
    return ApiErrors.validation('Invalid embed type. Use "scorecard", "district", or "record".');
  }

  try {
    if (type === 'scorecard') {
      return await handleScorecard(id);
    } else if (type === 'record') {
      return await handleRecord(id);
    } else {
      return await handleDistrict(id);
    }
  } catch (error) {
    logger.error('[Mesh:Embed API] Error', error as Error, { type, id });
    return ApiErrors.serverError(error as Error);
  }
}

async function handleScorecard(bioguideId: string): Promise<NextResponse> {
  const canonicalId = `rep:${bioguideId}`;
  const neighborhood = await hydrateNeighborhood(canonicalId);

  if (!neighborhood) {
    return ApiErrors.notFound('Representative', bioguideId);
  }

  const props = neighborhood.center.properties;
  const html = renderScorecard({
    name: neighborhood.center.label,
    party: (props.party as string) ?? '',
    state: (props.state as string) ?? '',
    district: props.district as string | undefined,
    dataAsOf: neighborhood.center.dataAsOf,
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      'X-Frame-Options': 'ALLOWALL',
    },
  });
}

async function handleRecord(bioguideId: string): Promise<NextResponse> {
  if (!/^[A-Za-z]\d{6}$/.test(bioguideId)) {
    return ApiErrors.validation('Invalid representative ID format. Expected bioguide ID.');
  }

  const data = await getRecordCardData(bioguideId.toUpperCase());
  if (!data) {
    return ApiErrors.notFound('Representative', bioguideId);
  }

  return new NextResponse(renderRecordEmbed(data), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      'X-Frame-Options': 'ALLOWALL',
    },
  });
}

async function handleDistrict(districtId: string): Promise<NextResponse> {
  if (!/^[A-Z]{2}-(\d{1,2}|Senate)$/i.test(districtId)) {
    return ApiErrors.validation('Invalid district ID format. Expected: "ST-DD" (e.g., "CA-12")');
  }

  const profile = await buildDistrictProfile(districtId.toUpperCase());

  if (!profile) {
    return ApiErrors.notFound('District', districtId);
  }

  const topSector = profile.topSectors[0]?.sector;
  const repAlignment = profile.representatives[0]?.overallAlignment ?? undefined;
  const peerAvg = profile.peerDistricts[0]?.repAlignmentScore ?? undefined;

  const html = renderDistrictCard({
    districtId: districtId.toUpperCase(),
    districtLabel: `${profile.state}-${profile.district}`,
    repAlignment,
    peerAvg,
    topSector,
    dataAsOf: profile.dataAsOf,
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
      'X-Frame-Options': 'ALLOWALL',
    },
  });
}
