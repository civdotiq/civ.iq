/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';

/**
 * Select the appropriate FEC ID based on the representative's current office
 * Senate candidates have FEC IDs starting with 'S', House candidates start with 'H'
 */
function selectOfficeAwareFecId(
  fecIds: string[],
  chamber: 'House' | 'Senate' | null
): string | null {
  if (!fecIds.length) return null;

  // If we don't know the chamber, return the first ID (fallback to original behavior)
  if (!chamber) {
    logger.warn('[Election Cycles API] Chamber unknown, using first FEC ID as fallback');
    return fecIds[0] || null;
  }

  // Look for office-specific FEC ID
  const targetPrefix = chamber === 'Senate' ? 'S' : 'H';
  const officeSpecificId = fecIds.find(id => id.startsWith(targetPrefix));

  if (officeSpecificId) {
    logger.info(`[Election Cycles API] Selected ${chamber} FEC ID: ${officeSpecificId}`);
    return officeSpecificId;
  }

  // If no office-specific ID found, log warning and use first ID as fallback
  logger.warn(
    `[Election Cycles API] No ${chamber} FEC ID found in [${fecIds.join(', ')}], using first as fallback`
  );
  return fecIds[0] || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse> {
  try {
    const { bioguideId } = await params;

    if (!bioguideId) {
      return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
    }

    // Get representative to find their FEC candidate ID
    const representative = await getEnhancedRepresentative(bioguideId.toUpperCase());
    if (!representative) {
      return NextResponse.json({ error: 'Representative not found' }, { status: 404 });
    }

    // Get office-aware FEC candidate ID from the ids.fec array
    const fecIds = representative.ids?.fec || [];
    const fecCandidateId = selectOfficeAwareFecId(fecIds, representative.chamber);

    if (!fecCandidateId) {
      return NextResponse.json(
        {
          error: 'FEC candidate ID not available for this representative',
          cycles: [],
        },
        { status: 200 }
      );
    }

    // Fetch election cycles from FEC API
    const cycles = await fecApiService.getCandidateElectionCycles(fecCandidateId);

    return NextResponse.json({
      bioguideId,
      fecCandidateId,
      cycles,
      defaultCycle: cycles.length > 0 ? cycles[0] : null, // Most recent cycle
    });
  } catch (error) {
    logger.error('[Election Cycles API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch election cycles',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
