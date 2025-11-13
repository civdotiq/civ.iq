/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Heavy data load for all representatives

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
  // Using simple logger}`);

  logger.info('All representatives API request started');

  try {
    // Check for optional filters
    const { searchParams } = request.nextUrl;
    const chamber = searchParams.get('chamber'); // 'house' or 'senate'
    const state = searchParams.get('state'); // Two-letter state code
    const party = searchParams.get('party'); // 'D', 'R', 'I'

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
    const representatives = filteredRepresentatives.map(rep => {
      // Calculate years in office
      const currentYear = new Date().getFullYear();
      let yearsInOffice = 0;
      if (rep.terms && rep.terms.length > 0) {
        const earliestTerm = rep.terms[rep.terms.length - 1];
        if (earliestTerm) {
          const startYear = parseInt(earliestTerm.startYear || '0');
          if (startYear > 0) {
            yearsInOffice = currentYear - startYear;
          }
        }
      }

      // Determine next election
      let nextElection = '';
      if (rep.chamber === 'House') {
        // House elections are every 2 years, always on even years
        nextElection =
          currentYear % 2 === 0 ? currentYear.toString() : (currentYear + 1).toString();
      } else if (rep.chamber === 'Senate') {
        // Senate terms are 6 years
        const currentTerm = rep.terms?.[0];
        if (currentTerm?.endYear) {
          const endYear = parseInt(currentTerm.endYear);
          nextElection = endYear.toString();
        } else {
          // Fallback: calculate based on class
          nextElection = (currentYear + 2).toString(); // Default fallback
        }
      }

      return {
        bioguideId: rep.bioguideId,
        name: rep.name,
        party: rep.party,
        state: rep.state,
        district: rep.district,
        chamber: rep.chamber,
        title: rep.title,
        votingMember: rep.votingMember,
        role: rep.role,
        phone: rep.contact?.dcOffice?.phone || rep.phone,
        website: rep.website,
        contactInfo: {
          phone: rep.contact?.dcOffice?.phone || rep.phone || '',
          website: rep.website || '',
          office: rep.contact?.dcOffice?.address || '',
        },
        yearsInOffice,
        nextElection,
      };
    });

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
