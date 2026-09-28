/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  fetchCommitteeMemberships,
  getEnhancedRepresentative,
} from '@/features/representatives/services/congress.service';
import { fetchWithSourceStatus, computeDataQuality } from '@/types/backbone-response';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

/**
 * Current committee and subcommittee assignments for one member.
 *
 * Source: unitedstates/congress-legislators committee-membership-current.yaml
 * (the same data the profile renders). Congress.gov's /v3/member endpoint has
 * no committee field, so it cannot answer this.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse> {
  const { bioguideId } = await params;

  if (!bioguideId) {
    return NextResponse.json({ error: 'BioguideId required' }, { status: 400 });
  }
  const id = bioguideId.toUpperCase();

  const { data, sourceStatus } = await fetchWithSourceStatus(
    'congress-legislators',
    async () => {
      const [memberships, rep] = await Promise.all([
        fetchCommitteeMemberships(),
        getEnhancedRepresentative(id),
      ]);
      // The loader returns [] on any upstream failure. A real roster always has
      // members, so an empty one means "unavailable", never "no committees".
      if (memberships.length === 0) {
        throw new Error('committee-membership-current.yaml unavailable');
      }
      return { found: rep !== null, committees: rep?.committees ?? [] };
    },
    { found: true, committees: [] }
  );

  if (!data.found) {
    return NextResponse.json({ error: 'Representative not found' }, { status: 404 });
  }

  const { committees } = data;
  const dataQuality = computeDataQuality([sourceStatus], committees.length === 0);

  if (sourceStatus.status !== 'ok') {
    logger.error(
      'Committee membership source failed',
      new Error(sourceStatus.errorMessage ?? 'unknown'),
      { bioguideId: id }
    );
  }

  const ok = sourceStatus.status === 'ok';
  return NextResponse.json(
    { committees, dataQuality, sourceStatus: [sourceStatus] },
    {
      status: ok ? 200 : 503,
      headers: {
        'Cache-Control': ok ? 'public, s-maxage=86400, stale-while-revalidate=172800' : 'no-cache',
      },
    }
  );
}
