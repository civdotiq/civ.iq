/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { openStatesAPI } from '@/lib/openstates-api';
import type { StateCommitteesApiResponse, StateParty } from '@/types/state-legislature';

// ISR: Election-aware revalidation (3 days Oct-Dec, 30 days Jan-Sep)
// Committee rosters change primarily at start of new legislative sessions
export const revalidate = 259200; // 3 days

/**
 * GET /api/state-legislature/[state]/committees
 *
 * Get committees for a specific state legislature
 *
 * Query Parameters:
 * - chamber: 'upper' | 'lower' (optional) - Filter by chamber
 * - classification: 'committee' | 'subcommittee' (optional) - Filter by type
 *
 * Returns: StateCommitteesApiResponse
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const startTime = Date.now();
  const { state } = await params;

  try {
    const searchParams = request.nextUrl.searchParams;
    const chamber = searchParams.get('chamber') as 'upper' | 'lower' | null;
    const classification = searchParams.get('classification') as
      | 'committee'
      | 'subcommittee'
      | null;

    // Validate state parameter
    if (!state || state.length !== 2) {
      return NextResponse.json(
        {
          success: false,
          committees: [],
          total: 0,
          state,
          error: 'Invalid state code. Please provide a 2-letter state abbreviation.',
        } as StateCommitteesApiResponse,
        { status: 400 }
      );
    }

    // Validate chamber if provided
    if (chamber && chamber !== 'upper' && chamber !== 'lower') {
      return NextResponse.json(
        {
          success: false,
          committees: [],
          total: 0,
          state,
          chamber,
          error: 'Invalid chamber. Must be "upper" or "lower".',
        } as StateCommitteesApiResponse,
        { status: 400 }
      );
    }

    // Get committees from OpenStates
    const committees = await openStatesAPI.getCommittees(
      state,
      chamber || undefined,
      classification || undefined,
      true // Include memberships
    );

    const responseTime = Date.now() - startTime;

    // Transform to our StateCommittee interface, filtering out committees without chamber
    const transformedCommittees = committees
      .filter(committee => committee.chamber !== null)
      .map(committee => {
        // Helper to normalize party string to StateParty
        const normalizeParty = (party: string | null | undefined): StateParty | undefined => {
          if (!party) return undefined;
          // Map common party names to StateParty type
          if (party === 'Democratic' || party === 'Democrat') return 'Democratic';
          if (party === 'Republican') return 'Republican';
          if (party === 'Independent') return 'Independent';
          if (party === 'Green') return 'Green';
          if (party === 'Libertarian') return 'Libertarian';
          return 'Other';
        };

        return {
          id: committee.id,
          name: committee.name,
          chamber: committee.chamber as 'upper' | 'lower',
          state: state.toUpperCase(),
          // OpenStates uses 'committee'/'subcommittee', our type expects 'standing'/'special'/etc
          // Default to 'standing' for main committees, omit for subcommittees
          classification:
            committee.classification === 'committee' ? ('standing' as const) : undefined,
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
      });

    const response: StateCommitteesApiResponse = {
      success: true,
      committees: transformedCommittees,
      total: transformedCommittees.length,
      state: state.toUpperCase(),
      chamber: chamber || undefined,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200', // 24h cache, 12h stale
        'X-Response-Time': `${responseTime}ms`,
      },
    });
  } catch (error) {
    const response: StateCommitteesApiResponse = {
      success: false,
      committees: [],
      total: 0,
      state: state.toUpperCase(),
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch state committees. Please try again later.',
    };

    return NextResponse.json(response, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
}
