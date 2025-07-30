/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { createRequestLogger } from '@/lib/logging/logger';

// Response interface for all representatives
interface AllRepresentativesResponse {
  success: boolean;
  representatives?: Array<{
    bioguideId: string;
    name: string;
    party: string;
    state: string;
    district?: string;
    chamber: string;
    title: string;
    phone?: string;
    website?: string;
    contactInfo: {
      phone: string;
      website: string;
      office: string;
    };
  }>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    timestamp: string;
    totalCount: number;
    dataSource: string;
    cacheable: boolean;
    processingTime?: number;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const logger = createRequestLogger(request, `all-reps-${Date.now()}`);

  logger.info('All representatives API request started');

  try {
    // Check for optional filters
    const url = new URL(request.url);
    const chamber = url.searchParams.get('chamber'); // 'house' or 'senate'
    const state = url.searchParams.get('state'); // Two-letter state code
    const party = url.searchParams.get('party'); // 'D', 'R', 'I'

    logger.info('Request parameters', { chamber, state, party });

    // Fetch all representatives
    logger.info('Fetching all representatives from congress-legislators');
    const allRepresentatives = await getAllEnhancedRepresentatives();

    if (!allRepresentatives || allRepresentatives.length === 0) {
      logger.warn('No representatives found in database');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_DATA',
            message: 'No representatives found in database',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            totalCount: 0,
            dataSource: 'congress-legislators',
            cacheable: false,
            processingTime: Date.now() - startTime,
          },
        } as AllRepresentativesResponse,
        { status: 503 }
      );
    }

    // Apply filters if provided
    let filteredRepresentatives = allRepresentatives;

    if (chamber) {
      const chamberFilter = chamber.toLowerCase() === 'house' ? 'House' : 'Senate';
      filteredRepresentatives = filteredRepresentatives.filter(
        rep => rep.chamber === chamberFilter
      );
      logger.info(`Filtered by chamber: ${chamber}`, { count: filteredRepresentatives.length });
    }

    if (state) {
      const stateFilter = state.toUpperCase();
      filteredRepresentatives = filteredRepresentatives.filter(rep => rep.state === stateFilter);
      logger.info(`Filtered by state: ${state}`, { count: filteredRepresentatives.length });
    }

    if (party) {
      const partyFilter = party.toUpperCase();
      filteredRepresentatives = filteredRepresentatives.filter(rep => rep.party === partyFilter);
      logger.info(`Filtered by party: ${party}`, { count: filteredRepresentatives.length });
    }

    // Transform data to match expected format
    const representatives = filteredRepresentatives.map(rep => ({
      bioguideId: rep.bioguideId,
      name: rep.name,
      party: rep.party,
      state: rep.state,
      district: rep.district,
      chamber: rep.chamber,
      title: rep.title,
      phone: rep.contact?.dcOffice?.phone || rep.phone,
      website: rep.website,
      contactInfo: {
        phone: rep.contact?.dcOffice?.phone || rep.phone || '',
        website: rep.website || '',
        office: rep.contact?.dcOffice?.address || '',
      },
    }));

    const processingTime = Date.now() - startTime;

    logger.info('All representatives API request completed successfully', {
      totalCount: representatives.length,
      processingTime,
      filters: { chamber, state, party },
    });

    return NextResponse.json(
      {
        success: true,
        representatives,
        metadata: {
          timestamp: new Date().toISOString(),
          totalCount: representatives.length,
          dataSource: 'congress-legislators',
          cacheable: true,
          processingTime,
        },
      } as AllRepresentativesResponse,
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // Cache for 1 hour
        },
      }
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Unexpected error in All Representatives API', error as Error, {
      processingTime,
      hasStack: error instanceof Error && !!error.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred while fetching representatives',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          totalCount: 0,
          dataSource: 'error',
          cacheable: false,
          processingTime,
        },
      } as AllRepresentativesResponse,
      { status: 500 }
    );
  }
}
