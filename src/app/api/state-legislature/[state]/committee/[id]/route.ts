/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { openStatesAPI } from '@/lib/openstates-api';
import type { StateCommittee, StateParty } from '@/types/state-legislature';

/**
 * GET /api/state-legislature/[state]/committee/[id]
 *
 * Get details for a specific state legislative committee
 *
 * Path Parameters:
 * - state: Two-letter state code (e.g., 'MI', 'CA')
 * - id: OpenStates committee ID
 *
 * Returns: Committee details with full membership roster
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();

  try {
    const { state, id } = await params;

    // Validate state parameter
    if (!state || state.length !== 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid state code. Please provide a 2-letter state abbreviation.',
        },
        { status: 400 }
      );
    }

    // Validate committee ID
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Committee ID is required.',
        },
        { status: 400 }
      );
    }

    // Get committee details from OpenStates
    const committee = await openStatesAPI.getCommitteeById(
      id,
      true // Include memberships
    );

    if (!committee) {
      return NextResponse.json(
        {
          success: false,
          error: 'Committee not found.',
        },
        { status: 404 }
      );
    }

    // Filter out committees without chamber
    if (!committee.chamber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Committee chamber information not available.',
        },
        { status: 404 }
      );
    }

    const responseTime = Date.now() - startTime;

    // Helper to normalize party string to StateParty
    const normalizeParty = (party: string | null | undefined): StateParty | undefined => {
      if (!party) return undefined;
      if (party === 'Democratic' || party === 'Democrat') return 'Democratic';
      if (party === 'Republican') return 'Republican';
      if (party === 'Independent') return 'Independent';
      if (party === 'Green') return 'Green';
      if (party === 'Libertarian') return 'Libertarian';
      return 'Other';
    };

    // Transform to our StateCommittee interface
    const transformedCommittee: StateCommittee = {
      id: committee.id,
      name: committee.name,
      chamber: committee.chamber,
      state: state.toUpperCase(),
      classification: committee.classification === 'committee' ? 'standing' : undefined,
      members: committee.memberships?.map(m => ({
        legislator_id: m.person_id || '',
        legislator_name: m.person_name,
        role: m.role as 'Chair' | 'Vice Chair' | 'Ranking Member' | 'Member',
        party: normalizeParty(m.person?.party),
      })),
      website: committee.links?.[0]?.url,
      sources: committee.sources?.map(s => ({
        url: s.url,
        note: s.note || undefined,
      })),
      parent_id: committee.parent_id || undefined,
    };

    return NextResponse.json(
      {
        success: true,
        committee: transformedCommittee,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200', // 24h cache
          'X-Response-Time': `${responseTime}ms`,
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch committee details. Please try again later.',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
