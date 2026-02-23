/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Public API v1 — District Detail
 *
 * Returns district data including representatives.
 * Wraps the same service as the internal districts route.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { v1Success, v1Error } from '@/lib/api/v1-response';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
): Promise<NextResponse> {
  try {
    const { districtId } = await params;

    // Validate format: "MI-12", "CA-04", "AK-AL"
    if (!districtId || !/^[A-Z]{2}-(\d{1,2}|AL)$/i.test(districtId)) {
      return NextResponse.json(
        v1Error(400, 'Invalid district ID. Expected format: ST-## (e.g., MI-12, CA-04, AK-AL)'),
        { status: 400 }
      );
    }

    const [state, districtNum] = districtId.toUpperCase().split('-') as [string, string];

    const allReps = await getAllEnhancedRepresentatives();

    const normalizeDistrict = (d: string | undefined): string => {
      if (!d || d === '' || d === '0' || d === '00') return '00';
      return d.padStart(2, '0');
    };

    const districtReps = allReps.filter(rep => {
      if (rep.state !== state) return false;
      if (rep.chamber === 'Senate') return true;
      if (rep.chamber === 'House') {
        if (districtNum === 'AL') return true;
        return normalizeDistrict(rep.district) === normalizeDistrict(districtNum);
      }
      return false;
    });

    const districtLabel = districtNum === 'AL' ? 'At-Large' : `District ${districtNum}`;

    const representatives = districtReps.map(rep => ({
      bioguideId: rep.bioguideId,
      name: rep.name,
      party: rep.party,
      state: rep.state,
      district: rep.district ?? null,
      chamber: rep.chamber,
      title: rep.title,
      phone: rep.currentTerm?.phone || rep.phone || null,
      website: rep.currentTerm?.website || rep.website || null,
    }));

    const data = {
      districtId: districtId.toUpperCase(),
      state,
      district: districtNum,
      label: `${state} ${districtLabel}`,
      representatives,
    };

    logger.info('v1 district detail', {
      districtId,
      representativeCount: representatives.length,
    });

    return NextResponse.json(v1Success(data, 'congress-legislators'), {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
      },
    });
  } catch (error) {
    logger.error('v1 district detail error', error as Error);
    return NextResponse.json(v1Error(500, 'Internal server error'), { status: 500 });
  }
}
