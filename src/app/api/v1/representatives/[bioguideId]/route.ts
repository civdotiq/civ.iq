/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Public API v1 — Representative Detail
 *
 * Returns detailed info for a single member of Congress by bioguide ID.
 * Wraps getEnhancedRepresentative from congress.service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { v1Success, v1Error } from '@/lib/api/v1-response';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse> {
  try {
    const { bioguideId } = await params;

    if (!bioguideId || !/^[A-Z]\d{6}$/i.test(bioguideId)) {
      return NextResponse.json(v1Error(400, 'Invalid bioguide ID'), { status: 400 });
    }

    const rep = await getEnhancedRepresentative(bioguideId);

    if (!rep) {
      return NextResponse.json(v1Error(404, 'Representative not found'), { status: 404 });
    }

    const data = {
      bioguideId: rep.bioguideId,
      name: rep.name,
      party: rep.party,
      state: rep.state,
      district: rep.district ?? null,
      chamber: rep.chamber,
      title: rep.title,
      isHistorical: rep.isHistorical ?? false,
      votingMember: rep.votingMember,
      role: rep.role,
      bio: rep.bio ?? null,
      currentTerm: rep.currentTerm ?? null,
      socialMedia: rep.socialMedia ?? null,
      contact: rep.contact ?? null,
      committees: rep.committees ?? [],
      leadershipRoles: rep.leadershipRoles ?? [],
      yearsInOffice: rep.yearsInOffice ?? null,
      nextElection: rep.nextElection ?? null,
      ids: rep.ids ?? null,
    };

    logger.info('v1 representative detail', {
      bioguideId,
      name: rep.name,
    });

    return NextResponse.json(v1Success(data, 'congress-legislators'), {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('v1 representative detail error', error as Error);
    return NextResponse.json(v1Error(500, 'Internal server error'), { status: 500 });
  }
}
