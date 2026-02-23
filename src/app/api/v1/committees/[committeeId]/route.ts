/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Public API v1 — Committee Detail
 *
 * Returns committee detail from the shared committee service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCommitteeDataService } from '@/lib/services/committee.service';
import { v1Success, v1Error } from '@/lib/api/v1-response';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
): Promise<NextResponse> {
  try {
    const { committeeId } = await params;

    if (!committeeId) {
      return NextResponse.json(v1Error(400, 'Committee ID is required'), { status: 400 });
    }

    const committee = await getCommitteeDataService(committeeId);

    if (!committee) {
      return NextResponse.json(v1Error(404, 'Committee not found'), { status: 404 });
    }

    const chair = committee.leadership.chair;
    const rankingMember = committee.leadership.rankingMember;

    const data = {
      id: committee.id,
      name: committee.name,
      chamber: committee.chamber,
      type: committee.type ?? null,
      jurisdiction: committee.jurisdiction ?? null,
      url: committee.url ?? null,
      chair: chair
        ? {
            name: chair.representative.name,
            bioguideId: chair.representative.bioguideId,
            party: chair.representative.party,
            state: chair.representative.state,
          }
        : null,
      rankingMember: rankingMember
        ? {
            name: rankingMember.representative.name,
            bioguideId: rankingMember.representative.bioguideId,
            party: rankingMember.representative.party,
            state: rankingMember.representative.state,
          }
        : null,
      members: committee.members.map(m => ({
        name: m.representative.name,
        bioguideId: m.representative.bioguideId,
        party: m.representative.party,
        state: m.representative.state,
        role: m.role,
      })),
      subcommittees: committee.subcommittees.map(s => ({
        id: s.id,
        name: s.name,
      })),
      lastUpdated: committee.lastUpdated,
    };

    logger.info('v1 committee detail', { committeeId, name: committee.name });

    return NextResponse.json(v1Success(data, 'congress-legislators'), {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('v1 committee detail error', error as Error);
    return NextResponse.json(v1Error(500, 'Internal server error'), { status: 500 });
  }
}
