/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { govCache } from '@/services/cache';
import logger from '@/lib/logging/simple-logger';
import { withPerformanceTiming } from '@/lib/performance/api-timer';
import { getServerBaseUrl } from '@/lib/server-url';
import type { EnhancedRepresentative } from '@/types/representative';

// ISR: Revalidate every 24 hours (representative profile data)
export const revalidate = 86400; // 24 hours

export const dynamic = 'force-dynamic';

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const upperBioguideId = bioguideId?.toUpperCase(); // Ensure uppercase
  const { searchParams } = request.nextUrl;
  const includeCommittees = searchParams.get('includeCommittees') === 'true';
  const includeLeadership = searchParams.get('includeLeadership') === 'true';
  const includeAll = searchParams.get('includeAll') === 'true';

  logger.debug('Representative route called', {
    originalBioguideId: bioguideId,
    upperBioguideId,
    environment: process.env.NODE_ENV,
    hasCongressApiKey: !!process.env.CONGRESS_API_KEY,
    queryParams: { includeCommittees, includeLeadership, includeAll },
  });

  if (!bioguideId) {
    logger.error('No bioguideId provided');
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    logger.info('Fetching representative data', { bioguideId: upperBioguideId });

    // First, try to get enhanced data from congress-legislators with caching
    let enhancedData: EnhancedRepresentative | null = null;
    try {
      const cacheKey = `representative:${upperBioguideId}`;

      // Try cache first
      enhancedData = await govCache.get<EnhancedRepresentative>(cacheKey);

      if (enhancedData) {
        logger.info('Cache hit for representative data', { bioguideId: upperBioguideId });
      } else {
        logger.info('Cache miss, fetching representative data', { bioguideId: upperBioguideId });
        enhancedData = await getEnhancedRepresentative(upperBioguideId);

        if (enhancedData) {
          // Cache the result for 6 hours
          await govCache.set(cacheKey, enhancedData, {
            dataType: 'representatives',
            source: 'congress-legislators',
          });
          logger.info('Successfully retrieved and cached enhanced representative data', {
            bioguideId,
            hasIds: !!enhancedData.ids,
            hasSocialMedia: !!enhancedData.socialMedia,
            hasCurrentTerm: !!enhancedData.currentTerm,
          });
        }
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
        terms: enhancedData.terms || [],
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

      // Optionally fetch additional data in parallel for better performance
      const additionalData: Record<string, unknown> = {};

      // Prepare parallel fetch requests
      const fetchPromises: Array<Promise<{ type: string; data: unknown; error?: Error }>> = [];

      if (includeCommittees || includeAll) {
        fetchPromises.push(
          fetch(`${getServerBaseUrl()}/api/representative/${upperBioguideId}/committees`)
            .then(async response => {
              if (response.ok) {
                const data = await response.json();
                return { type: 'committees', data };
              }
              throw new Error(`Committee fetch failed: ${response.status}`);
            })
            .catch(error => ({ type: 'committees', data: null, error: error as Error }))
        );
      }

      if (includeLeadership || includeAll) {
        fetchPromises.push(
          fetch(`${getServerBaseUrl()}/api/representative/${upperBioguideId}/leadership`)
            .then(async response => {
              if (response.ok) {
                const data = await response.json();
                return { type: 'leadership', data };
              }
              throw new Error(`Leadership fetch failed: ${response.status}`);
            })
            .catch(error => ({ type: 'leadership', data: null, error: error as Error }))
        );
      }

      // Execute all fetches in parallel
      if (fetchPromises.length > 0) {
        const results = await Promise.all(fetchPromises);

        results.forEach(result => {
          if (result.error) {
            logger.warn(`Failed to fetch ${result.type} data`, {
              bioguideId,
              error: result.error.message,
            });
          } else if (result.data) {
            additionalData[result.type] = result.data;
            if (!representative.metadata!.dataSources.includes('congress.gov')) {
              representative.metadata!.dataSources.push('congress.gov');
            }
          }
        });
      }

      logger.info('Successfully processed representative data', {
        bioguideId,
        includeCommittees,
        includeLeadership,
        hasAdditionalData: Object.keys(additionalData).length > 0,
      });

      // Enhanced response structure with all required fields
      const enhancedResponse = {
        // Legacy format (keep for backward compatibility)
        representative: {
          ...representative,
          isHistorical: representative.isHistorical || false,
        },
        ...additionalData,
        success: true,

        // Enhanced format with structured data
        profile: {
          basic: {
            bioguideId: representative.bioguideId,
            name: representative.name,
            firstName: representative.firstName,
            lastName: representative.lastName,
            title: representative.title,
            party: representative.party,
            state: representative.state,
            district: representative.district,
            chamber: representative.chamber,
            isHistorical: representative.isHistorical || false,
          },
          contact: {
            phone: representative.phone || null,
            email: representative.email || null,
            website: representative.website || null,
            officeAddress: representative.currentTerm?.address || null,
          },
          terms: enhancedData.terms || [],
          imageUrl: representative.imageUrl || null,
        },
        committees: {
          count: (representative.committees || []).length,
          memberships: (representative.committees || []).map(c => ({
            name: c.name,
            role: c.role || 'Member',
            type: 'committee',
            position: c.role || 'Member',
            chamber: representative.chamber,
            jurisdiction: 'Not specified',
            website: null,
          })),
          leadership: (representative.committees || []).filter(c => c.role && c.role !== 'Member'),
        },
        biography: {
          gender: representative.bio?.gender || null,
          birthday: representative.bio?.birthday || null,
          religion: representative.bio?.religion || null,
          education: [],
          profession: 'Not specified',
          birthDate: representative.bio?.birthday || null,
          birthPlace: 'Not specified',
          familyStatus: 'Not specified',
          militaryService: null,
        },
        socialMedia: {
          ...(representative.socialMedia || {}),
          platforms: {
            twitter: representative.socialMedia?.twitter || null,
            facebook: representative.socialMedia?.facebook || null,
            instagram: representative.socialMedia?.instagram || null,
            youtube: representative.socialMedia?.youtube || null,
            mastodon: representative.socialMedia?.mastodon || null,
          },
          verified: {
            twitter: !!representative.socialMedia?.twitter,
            facebook: !!representative.socialMedia?.facebook,
            instagram: !!representative.socialMedia?.instagram,
            youtube: !!representative.socialMedia?.youtube,
            mastodon: !!representative.socialMedia?.mastodon,
          },
          lastUpdated: new Date().toISOString(),
        },
        identifiers: {
          bioguideId: representative.bioguideId,
          fecId: representative.ids?.fec?.[0] || null,
          openSecretsId: representative.ids?.opensecrets || null,
          govtrackId: representative.ids?.govtrack || null,
          ballotpediaId: representative.ids?.ballotpedia || null,
          wikipediaId: representative.ids?.wikipedia || null,
        },
        metadata: {
          dataSource: 'congress-legislators',
          cacheHit: false,
          responseTime: Date.now(),
          includeCommittees,
          includeLeadership,
          lastUpdated: new Date().toISOString(),
          dataSources: representative.metadata?.dataSources || ['congress-legislators'],
          completeness: representative.metadata?.completeness,
          dataStructure: 'enhanced',
        },
      };

      return NextResponse.json(enhancedResponse);
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

        // Determine voting status based on state (territories are non-voting)
        const nonVotingTerritories = ['DC', 'PR', 'VI', 'GU', 'AS', 'MP'];
        const isTerritory = nonVotingTerritories.includes(member.state);
        const votingMember = member.chamber === 'Senate' ? true : !isTerritory;
        const role =
          member.chamber === 'Senate'
            ? 'Senator'
            : isTerritory
              ? member.state === 'PR'
                ? 'Resident Commissioner'
                : 'Delegate'
              : 'Representative';

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
          votingMember,
          role,
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
        // Enhanced Congress.gov response structure
        const enhancedResponse = {
          // Legacy format (keep for backward compatibility)
          representative,
          success: true,

          // Enhanced format with structured data
          profile: {
            basic: {
              bioguideId: representative.bioguideId,
              name: representative.name,
              firstName: representative.firstName,
              lastName: representative.lastName,
              title: representative.title,
              party: representative.party,
              state: representative.state,
              district: representative.district,
              chamber: representative.chamber,
            },
            contact: {
              phone: representative.phone || null,
              email: representative.email || null,
              website: representative.website || null,
              officeAddress: null,
            },
            terms: representative.terms || [],
            imageUrl: representative.imageUrl || null,
          },
          committees: {
            count: (representative.committees || []).length,
            memberships: (representative.committees || []).map(c => ({
              name: c.name,
              role: c.role || 'Member',
              type: 'leadership',
              position: c.role || 'Member',
              chamber: representative.chamber,
              jurisdiction: 'Not specified',
              website: null,
            })),
            leadership: (representative.committees || []).filter(
              c => c.role && c.role !== 'Member'
            ),
          },
          biography: {
            gender: null,
            birthday: null,
            religion: null,
            education: [],
            profession: 'Not specified',
            birthDate: null,
            birthPlace: 'Not specified',
            familyStatus: 'Not specified',
            militaryService: null,
          },
          socialMedia: {
            platforms: {
              twitter: null,
              facebook: null,
              instagram: null,
              youtube: null,
              mastodon: null,
            },
            verified: {
              twitter: false,
              facebook: false,
              instagram: false,
              youtube: false,
              mastodon: false,
            },
            lastUpdated: new Date().toISOString(),
          },
          identifiers: {
            bioguideId: representative.bioguideId,
            fecId: null,
            openSecretsId: null,
            govtrackId: null,
            ballotpediaId: null,
            wikipediaId: null,
          },
          metadata: {
            dataSource: 'congress.gov',
            cacheHit: false,
            responseTime: Date.now(),
            lastUpdated: new Date().toISOString(),
            dataSources: ['congress.gov'],
            completeness: representative.metadata?.completeness,
            dataStructure: 'enhanced',
          },
        };

        return NextResponse.json(enhancedResponse);
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

// Export the wrapped handler with performance timing
export const GET = withPerformanceTiming('/api/representative/[bioguideId]', getHandler);
