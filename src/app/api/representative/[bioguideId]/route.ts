/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';
import type { EnhancedRepresentative } from '@/types/representative';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const upperBioguideId = bioguideId?.toUpperCase(); // Ensure uppercase
  const { searchParams } = new URL(request.url);
  const includeCommittees = searchParams.get('includeCommittees') === 'true';
  const includeLeadership = searchParams.get('includeLeadership') === 'true';
  const includeAll = searchParams.get('includeAll') === 'true';

  // Detailed logging for debugging
  // eslint-disable-next-line no-console
  console.log('[API] Representative route called');
  // eslint-disable-next-line no-console
  console.log('[API] Original bioguideId:', bioguideId);
  // eslint-disable-next-line no-console
  console.log('[API] Uppercase bioguideId:', upperBioguideId);
  // eslint-disable-next-line no-console
  console.log('[API] Environment:', process.env.NODE_ENV);
  // eslint-disable-next-line no-console
  console.log('[API] Has CONGRESS_API_KEY:', !!process.env.CONGRESS_API_KEY);
  // eslint-disable-next-line no-console
  console.log('[API] Query params:', { includeCommittees, includeLeadership, includeAll });

  if (!bioguideId) {
    // eslint-disable-next-line no-console
    console.error('[API] No bioguideId provided');
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    logger.info('Fetching representative data', { bioguideId: upperBioguideId });

    // First, try to get enhanced data from congress-legislators
    let enhancedData: EnhancedRepresentative | null = null;
    try {
      enhancedData = await getEnhancedRepresentative(upperBioguideId);
      if (enhancedData) {
        logger.info('Successfully retrieved enhanced representative data', {
          bioguideId,
          hasIds: !!enhancedData.ids,
          hasSocialMedia: !!enhancedData.socialMedia,
          hasCurrentTerm: !!enhancedData.currentTerm,
        });
      }
    } catch (error) {
      logger.warn('Failed to get enhanced representative data', {
        bioguideId,
        error: (error as Error).message,
      });
    }

    // If we have enhanced data, create a comprehensive response
    if (enhancedData) {
      const representative: EnhancedRepresentative = {
        ...enhancedData,
        // Ensure we have the basic required fields
        firstName: enhancedData.fullName?.first || enhancedData.name.split(' ')[0] || 'Unknown',
        lastName: enhancedData.fullName?.last || enhancedData.name.split(' ').pop() || 'Unknown',
        title: enhancedData.chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative',
        phone: enhancedData.currentTerm?.phone || enhancedData.phone,
        website: enhancedData.currentTerm?.website || enhancedData.website,
        terms: [
          {
            congress: '119', // Current congress
            startYear: enhancedData.currentTerm?.start.split('-')[0] || '2023',
            endYear: enhancedData.currentTerm?.end.split('-')[0] || '2025',
          },
        ],
        committees: enhancedData.committees || [],
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSources: ['congress-legislators'],
          completeness: {
            basicInfo: true,
            socialMedia: !!enhancedData.socialMedia,
            contact: !!enhancedData.currentTerm,
            committees: !!enhancedData.committees && enhancedData.committees.length > 0,
            finance: !!enhancedData.ids?.opensecrets || !!enhancedData.ids?.fec,
          },
        },
      };

      // Optionally fetch additional data
      const additionalData: Record<string, unknown> = {};

      if (includeCommittees || includeAll) {
        try {
          const committeeResponse = await fetch(
            `${request.url.split('/api/')[0]}/api/representative/${upperBioguideId}/committees`
          );
          if (committeeResponse.ok) {
            additionalData.committees = await committeeResponse.json();
            representative.metadata!.dataSources.push('congress.gov');
          }
        } catch (error) {
          logger.warn('Failed to fetch committee data', {
            bioguideId,
            error: (error as Error).message,
          });
        }
      }

      if (includeLeadership || includeAll) {
        try {
          const leadershipResponse = await fetch(
            `${request.url.split('/api/')[0]}/api/representative/${upperBioguideId}/leadership`
          );
          if (leadershipResponse.ok) {
            additionalData.leadership = await leadershipResponse.json();
            if (!representative.metadata!.dataSources.includes('congress.gov')) {
              representative.metadata!.dataSources.push('congress.gov');
            }
          }
        } catch (error) {
          logger.warn('Failed to fetch leadership data', {
            bioguideId,
            error: (error as Error).message,
          });
        }
      }

      logger.info('Successfully processed representative data', {
        bioguideId,
        includeCommittees,
        includeLeadership,
        hasAdditionalData: Object.keys(additionalData).length > 0,
      });

      return NextResponse.json({
        representative,
        ...additionalData,
        success: true,
        metadata: {
          dataSource: 'congress-legislators',
          cacheHit: false,
          responseTime: Date.now(),
          includeCommittees,
          includeLeadership,
        },
      });
    }

    // Fallback: Check if we have Congress.gov API key
    if (process.env.CONGRESS_API_KEY) {
      logger.info('Fetching from Congress.gov API', { bioguideId });

      const response = await fetch(
        `https://api.congress.gov/v3/member/${upperBioguideId}?format=json&api_key=${process.env.CONGRESS_API_KEY}`,
        {
          headers: {
            'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const member = data.member;

        const representative: EnhancedRepresentative = {
          bioguideId: member.bioguideId,
          name: `${member.firstName} ${member.lastName}`,
          firstName: member.firstName,
          lastName: member.lastName,
          party: member.partyName || 'Unknown',
          state: member.state,
          district: member.district,
          chamber: member.chamber,
          title: member.chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative',
          phone: member.phone,
          email: member.email,
          website: member.url,
          imageUrl: member.depiction?.imageUrl,
          terms:
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            member.terms?.map((term: any) => ({
              congress: term.congress,
              startYear: term.startYear,
              endYear: term.endYear,
            })) || [],
          committees:
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            member.leadership?.map((role: any) => ({
              name: role.name,
              role: role.type,
            })) || [],
          metadata: {
            lastUpdated: new Date().toISOString(),
            dataSources: ['congress.gov'],
            completeness: {
              basicInfo: true,
              socialMedia: false,
              contact: !!member.phone || !!member.email,
              committees: !!member.leadership && member.leadership.length > 0,
              finance: false,
            },
          },
        };

        logger.info('Successfully retrieved Congress.gov data', { bioguideId });
        return NextResponse.json({
          representative,
          success: true,
          metadata: {
            dataSource: 'congress.gov',
            cacheHit: false,
            responseTime: Date.now(),
          },
        });
      } else {
        logger.warn('Congress.gov API request failed', {
          bioguideId,
          status: response.status,
        });
      }
    }

    // FALLBACK DATA: This section should NEVER fail - always return something
    logger.info('Using fallback representative data', { bioguideId });

    // Ensure we always have valid fallback data
    const _commonReps: { [key: string]: Partial<EnhancedRepresentative> } = {
      P000595: {
        name: 'Gary Peters',
        firstName: 'Gary',
        lastName: 'Peters',
        party: 'Democratic',
        state: 'MI',
        chamber: 'Senate',
        title: 'U.S. Senator',
        bio: { gender: 'M' },
        socialMedia: {
          twitter: 'SenGaryPeters',
          facebook: 'SenatorGaryPeters',
        },
      },
      S000770: {
        name: 'Debbie Stabenow',
        firstName: 'Debbie',
        lastName: 'Stabenow',
        party: 'Democratic',
        state: 'MI',
        chamber: 'Senate',
        title: 'U.S. Senator',
        bio: { gender: 'F' },
      },
    };

    // EMERGENCY FIX: Never return fake representative data
    // Previously returned fake representative with fake bioguideId, phone, email, committees
    // This could seriously mislead citizens about their actual representation
    logger.error(
      'Representative data not found - cannot create fake representative',
      new Error('Representative not found'),
      {
        bioguideId: upperBioguideId,
        reason: 'Real representative data required - cannot return fake contact info or committees',
      }
    );

    return NextResponse.json({
      representative: null,
      success: false,
      error: 'Representative not found',
      metadata: {
        dataSource: 'unavailable',
        cacheHit: false,
        responseTime: Date.now(),
      },
    });
  } catch (error) {
    logger.error('Representative API error', error as Error, { bioguideId: bioguideId });
    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        metadata: {
          dataSource: 'error',
          responseTime: Date.now(),
        },
      },
      { status: 500 }
    );
  }
}
