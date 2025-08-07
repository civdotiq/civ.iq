/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger-client';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import type { EnhancedRepresentative } from '@/types/representative';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.toLowerCase() || '';
    const state = url.searchParams.get('state')?.toUpperCase();
    const party = url.searchParams.get('party')?.toLowerCase();
    const chamber = url.searchParams.get('chamber')?.toLowerCase();

    logger.info('Search representatives request', {
      query,
      state,
      party,
      chamber,
    });

    // Get all current representatives from congress-legislators
    const allRepresentatives = await getAllEnhancedRepresentatives();

    if (!allRepresentatives || allRepresentatives.length === 0) {
      return NextResponse.json(
        {
          error: 'No representatives data available',
          message: 'Unable to fetch representatives at this time',
        },
        { status: 503 }
      );
    }

    // Filter representatives based on search criteria
    const filtered = allRepresentatives.filter(rep => {
      // Search by name
      if (query && !rep.name.toLowerCase().includes(query)) {
        return false;
      }

      // Filter by state
      if (state && rep.state !== state) {
        return false;
      }

      // Filter by party
      if (party) {
        const repParty = rep.party.toLowerCase();
        if (party === 'democrat' && !repParty.includes('democrat')) return false;
        if (party === 'republican' && !repParty.includes('republican')) return false;
        if (party === 'independent' && !repParty.includes('independent')) return false;
      }

      // Filter by chamber
      if (chamber) {
        if (chamber === 'house' && rep.chamber !== 'House') return false;
        if (chamber === 'senate' && rep.chamber !== 'Senate') return false;
      }

      return true;
    });

    // Sort results
    const sorted = filtered.sort((a, b) => {
      // Sort by state, then by chamber (Senate first), then by name
      if (a.state !== b.state) return a.state.localeCompare(b.state);
      if (a.chamber !== b.chamber) return a.chamber === 'Senate' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    // Transform to simpler format for response
    const results = sorted.map(rep => ({
      bioguideId: rep.bioguideId,
      name: rep.name,
      party: rep.party,
      state: rep.state,
      district: rep.district,
      chamber: rep.chamber,
      title: rep.title,
      imageUrl: rep.imageUrl || `/api/representative-photo/${rep.bioguideId}`,
      yearsInOffice: calculateYearsInOffice(rep),
    }));

    logger.info('Search representatives completed', {
      totalCount: allRepresentatives.length,
      filteredCount: results.length,
      query,
      state,
      party,
      chamber,
    });

    return NextResponse.json({
      results,
      metadata: {
        totalResults: results.length,
        dataSource: 'congress-legislators',
        timestamp: new Date().toISOString(),
        congress: 119,
        searchCriteria: {
          query: query || undefined,
          state: state || undefined,
          party: party || undefined,
          chamber: chamber || undefined,
        },
      },
    });
  } catch (error) {
    logger.error('Search representatives error', error as Error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Unable to search representatives at this time',
      },
      { status: 500 }
    );
  }
}

function calculateYearsInOffice(rep: EnhancedRepresentative): number {
  if (!rep.currentTerm?.start) return 0;

  const startDate = new Date(rep.currentTerm.start);
  const now = new Date();
  const years = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365));

  return Math.max(0, years);
}
