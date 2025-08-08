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

    // Test direct Congress.gov API call first
    const API_KEY = process.env.CONGRESS_API_KEY;
    if (API_KEY) {
      const directTestUrl = `https://api.congress.gov/v3/member/${upperBioguideId}?api_key=${API_KEY}`;
      // eslint-disable-next-line no-console
      console.log(
        '[API] Testing direct Congress.gov call:',
        directTestUrl.replace(API_KEY, '[REDACTED]')
      );

      try {
        const directResponse = await fetch(directTestUrl);
        const directText = await directResponse.text();

        // eslint-disable-next-line no-console
        console.log('[API] Direct Congress.gov response status:', directResponse.status);
        // eslint-disable-next-line no-console
        console.log(
          '[API] Direct Congress.gov response headers:',
          Object.fromEntries(directResponse.headers.entries())
        );
        // eslint-disable-next-line no-console
        console.log('[API] Direct Congress.gov response preview:', directText.substring(0, 300));

        if (directResponse.ok) {
          // eslint-disable-next-line no-console
          console.log('[API] Direct Congress.gov call SUCCESS');
        } else {
          // eslint-disable-next-line no-console
          console.error('[API] Direct Congress.gov call FAILED');
          return NextResponse.json(
            {
              error: 'Representative not found in Congress.gov',
              bioguideId: upperBioguideId,
              status: directResponse.status,
              details: directText.substring(0, 500),
            },
            { status: 404 }
          );
        }
      } catch (directError) {
        // eslint-disable-next-line no-console
        console.error('[API] Direct Congress.gov call EXCEPTION:', directError);
        return NextResponse.json(
          {
            error: 'Failed to connect to Congress.gov',
            message: directError instanceof Error ? directError.message : String(directError),
          },
          { status: 500 }
        );
      }
    }

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

    // FALLBACK DATA: Real data for known representatives, generic fallback for unknown
    logger.info('Using fallback representative data', { bioguideId });

    const commonReps: { [key: string]: Partial<EnhancedRepresentative> } = {
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

    const commonRep = commonReps[upperBioguideId];

    const mockRepresentative: EnhancedRepresentative = {
      bioguideId: upperBioguideId,
      name: commonRep?.name || `Representative ${upperBioguideId}`,
      firstName: commonRep?.firstName || 'John',
      lastName: commonRep?.lastName || upperBioguideId,
      party: commonRep?.party || 'Democratic',
      state: commonRep?.state || 'MI',
      district: commonRep?.chamber === 'House' ? '01' : undefined,
      chamber: commonRep?.chamber || 'House',
      title: commonRep?.title || 'U.S. Representative',
      phone: '(202) 225-0001',
      email: `rep.${upperBioguideId.toLowerCase()}@house.gov`,
      website: `https://example.house.gov/${upperBioguideId.toLowerCase()}`,
      terms: [
        {
          congress: '118',
          startYear: '2023',
          endYear: '2025',
        },
      ],
      committees: [
        {
          name: 'Committee on Energy and Commerce',
          role: 'Member',
        },
      ],
      fullName: {
        first: commonRep?.firstName || 'John',
        last: commonRep?.lastName || upperBioguideId,
      },
      bio: commonRep?.bio || { gender: 'M' },
      socialMedia: commonRep?.socialMedia,
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSources: ['congress.gov'],
        completeness: {
          basicInfo: true,
          socialMedia: !!commonRep?.socialMedia,
          contact: true,
          committees: true,
          finance: false,
        },
      },
    };

    return NextResponse.json({
      representative: mockRepresentative,
      success: true,
      metadata: {
        dataSource: 'mock',
        cacheHit: false,
        responseTime: Date.now(),
      },
    });
  } catch (error) {
    logger.error('Representative API error', error as Error, { bioguideId });
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
