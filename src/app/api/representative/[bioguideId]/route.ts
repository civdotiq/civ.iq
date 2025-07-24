/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedRepresentative } from '@/lib/congress-legislators';
import { structuredLogger } from '@/lib/logging/logger';
import type { EnhancedRepresentative } from '@/types/representative';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = new URL(request.url);
  const includeCommittees = searchParams.get('includeCommittees') === 'true';
  const includeLeadership = searchParams.get('includeLeadership') === 'true';
  const includeAll = searchParams.get('includeAll') === 'true';

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    structuredLogger.info('Fetching representative data', { bioguideId });

    // First, try to get enhanced data from congress-legislators
    let enhancedData: EnhancedRepresentative | null = null;
    try {
      enhancedData = await getEnhancedRepresentative(bioguideId);
      if (enhancedData) {
        structuredLogger.info('Successfully retrieved enhanced representative data', {
          bioguideId,
          hasIds: !!enhancedData.ids,
          hasSocialMedia: !!enhancedData.socialMedia,
          hasCurrentTerm: !!enhancedData.currentTerm,
        });
      }
    } catch (error) {
      structuredLogger.warn('Failed to get enhanced representative data', {
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
      const additionalData: unknown = {};

      if (includeCommittees || includeAll) {
        try {
          const committeeResponse = await fetch(
            `${request.url.split('/api/')[0]}/api/representative/${bioguideId}/committees`
          );
          if (committeeResponse.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (additionalData as any).committees = await committeeResponse.json();
            representative.metadata!.dataSources.push('congress.gov');
          }
        } catch (error) {
          structuredLogger.warn('Failed to fetch committee data', {
            bioguideId,
            error: (error as Error).message,
          });
        }
      }

      if (includeLeadership || includeAll) {
        try {
          const leadershipResponse = await fetch(
            `${request.url.split('/api/')[0]}/api/representative/${bioguideId}/leadership`
          );
          if (leadershipResponse.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (additionalData as any).leadership = await leadershipResponse.json();
            if (!representative.metadata!.dataSources.includes('congress.gov')) {
              representative.metadata!.dataSources.push('congress.gov');
            }
          }
        } catch (error) {
          structuredLogger.warn('Failed to fetch leadership data', {
            bioguideId,
            error: (error as Error).message,
          });
        }
      }

      structuredLogger.info('Successfully processed representative data', {
        bioguideId,
        includeCommittees,
        includeLeadership,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hasAdditionalData: Object.keys(additionalData as any).length > 0,
      });

      return NextResponse.json({
        representative,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(additionalData as any),
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
      structuredLogger.info('Fetching from Congress.gov API', { bioguideId });

      const response = await fetch(
        `https://api.congress.gov/v3/member/${bioguideId}?format=json&api_key=${process.env.CONGRESS_API_KEY}`,
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

        structuredLogger.info('Successfully retrieved Congress.gov data', { bioguideId });
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
        structuredLogger.warn('Congress.gov API request failed', {
          bioguideId,
          status: response.status,
        });
      }
    }

    // Final fallback: Enhanced mock data
    structuredLogger.info('Using mock representative data', { bioguideId });

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

    const commonRep = commonReps[bioguideId];

    const mockRepresentative: EnhancedRepresentative = {
      bioguideId,
      name: commonRep?.name || `Representative ${bioguideId}`,
      firstName: commonRep?.firstName || 'John',
      lastName: commonRep?.lastName || bioguideId,
      party: commonRep?.party || 'Democratic',
      state: commonRep?.state || 'MI',
      district: commonRep?.chamber === 'House' ? '01' : undefined,
      chamber: commonRep?.chamber || 'House',
      title: commonRep?.title || 'U.S. Representative',
      phone: '(202) 225-0001',
      email: `rep.${bioguideId.toLowerCase()}@house.gov`,
      website: `https://example.house.gov/${bioguideId.toLowerCase()}`,
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
        last: commonRep?.lastName || bioguideId,
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
    structuredLogger.error('Representative API error', error as Error, { bioguideId });
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
