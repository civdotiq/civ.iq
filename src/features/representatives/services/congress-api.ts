/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { unstable_cache as cache } from 'next/cache';
import type {
  CongressApiMember,
  CongressApiMembersResponse,
  CongressApiBill,
} from '@/types/api-responses';
import { structuredLogger } from '@/lib/logging/universal-logger';
import { getAllEnhancedRepresentatives } from './congress.service';

// State code to name mapping
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

export interface CongressMember {
  bioguideId: string;
  depiction?: {
    attribution?: string;
    imageUrl?: string;
  };
  district?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  fullName: string;
  party: string;
  partyName: string;
  state: string;
  terms: {
    item: Array<{
      chamber: string;
      congress: number;
      endYear?: number;
      startYear: number;
    }>;
  };
  url?: string;
  updateDate: string;
}

export interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  phone?: string;
  email?: string;
  website?: string;
  imageUrl?: string;
  committees?: Array<{
    name: string;
    role?: string;
  }>;
  terms?: Array<{
    congress: string;
    startYear: string;
    endYear: string;
  }>;
  yearsInOffice?: number;
  nextElection?: string;
}

// Congress.gov API configuration
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';

// Bioguide ID validation
export function isValidBioguideId(bioguideId: string): boolean {
  // Valid bioguide IDs: Letter followed by 6 digits (e.g., "P000197", "J000282")
  return /^[A-Z]\d{6}$/.test(bioguideId);
}

// Filter out representatives with invalid bioguide IDs
export function validateRepresentatives(reps: Representative[]): Representative[] {
  return reps.filter(rep => {
    const isValid = isValidBioguideId(rep.bioguideId);
    if (!isValid) {
      structuredLogger.warn('Invalid bioguide ID detected, filtering out representative', {
        component: 'congressApi',
        bioguideId: rep.bioguideId,
        name: rep.name,
        metadata: { state: rep.state, district: rep.district },
      });
    }
    return isValid;
  });
}

// Rate limiter for Congress API calls
class CongressRateLimiter {
  private requests: number[] = [];
  private readonly maxRequestsPerHour = 5000; // Congress API limit

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // Remove requests older than 1 hour
    this.requests = this.requests.filter(time => time > oneHourAgo);

    if (this.requests.length >= this.maxRequestsPerHour) {
      const waitTime = 3600000 - (now - (this.requests[0] || 0));
      if (waitTime > 0) {
        structuredLogger.info('Rate limit reached', {
          component: 'congressApi',
          metadata: { waitTimeSeconds: Math.round(waitTime / 1000) },
        });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.requests.push(now);
  }
}

const congressRateLimiter = new CongressRateLimiter();

/**
 * Get current members of Congress for a specific state
 * Enhanced with live Congress.gov API integration
 */
export const getCurrentMembersByState = cache(
  async (state: string, apiKey?: string): Promise<CongressMember[]> => {
    try {
      await congressRateLimiter.waitIfNeeded();

      const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;

      // Try multiple API approaches for better data coverage
      const endpoints = [
        // Current members endpoint
        {
          url: `${CONGRESS_API_BASE}/member`,
          params: new URLSearchParams({
            format: 'json',
            currentMember: 'true',
            limit: '250',
          }),
        },
        // 119th Congress members endpoint (fallback)
        {
          url: `${CONGRESS_API_BASE}/member`,
          params: new URLSearchParams({
            format: 'json',
            congress: '119',
            limit: '250',
          }),
        },
      ];

      if (congressApiKey) {
        endpoints.forEach(endpoint => endpoint.params.append('api_key', congressApiKey));
      }

      let allMembers: CongressApiMember[] = [];
      let apiSuccess = false;

      for (const endpoint of endpoints) {
        try {
          const url = `${endpoint.url}?${endpoint.params.toString()}`;

          const response = await fetch(url, {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
            },
            // @ts-expect-error - Next.js fetch extension
            next: { revalidate: 3600 }, // Cache for 1 hour
          });

          if (!response.ok) {
            structuredLogger.error('Congress API error', {
              component: 'congressApi',
              error: new Error(`${response.status} ${response.statusText}`),
              metadata: {
                url: endpoint.url,
                status: response.status,
                statusText: response.statusText,
              },
            });
            continue;
          }

          const data = (await response.json()) as CongressApiMembersResponse;

          if (data.members && Array.isArray(data.members)) {
            allMembers = [...allMembers, ...data.members];
            apiSuccess = true;
            break; // Use first successful endpoint
          }
        } catch {
          // API endpoint failed, try next one
          continue;
        }
      }

      if (!apiSuccess || allMembers.length === 0) {
        return [];
      }

      const data = { members: allMembers };

      // Filter by state and current terms - handle both state codes and full names
      const stateMembers =
        data.members?.filter((member: CongressApiMember) => {
          // Congress API uses full state names like "Michigan"
          // Convert our state code to full name for comparison
          const stateName = STATE_NAMES[state] || state;
          const matchesState = member.state === stateName || member.state === state;

          // Also check if member has a current term in 119th Congress (2025-2027)
          const hasCurrentTerm = member.terms?.item?.some(
            term =>
              term.startYear >= 2025 ||
              (term.startYear <= 2025 && (!term.endYear || term.endYear >= 2025))
          );

          return matchesState && hasCurrentTerm;
        }) || [];

      // Convert CongressApiMember to CongressMember format
      const convertedMembers: CongressMember[] = stateMembers.map(
        (member: CongressApiMember): CongressMember => ({
          ...member,
          fullName: member.name || `${member.firstName} ${member.lastName}`.trim(),
        })
      );

      return convertedMembers;
    } catch (_error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching Congress members:', _error);
      structuredLogger.error('Error fetching Congress members', {
        component: 'congressApi',
        error: _error as Error,
      });
      return [];
    }
  }
);

/**
 * Format Congress.gov member data into our Representative interface
 */
export function formatCongressMember(member: CongressApiMember): Representative {
  const currentYear = new Date().getFullYear();
  const currentTerm = member.terms?.item?.[0];
  const chamber = currentTerm?.chamber === 'House of Representatives' ? 'House' : 'Senate';

  // Calculate years in office
  let yearsInOffice = 0;
  if (member.terms?.item && member.terms.item.length > 0) {
    const earliestTerm = member.terms.item[member.terms.item.length - 1];
    if (earliestTerm) {
      yearsInOffice = currentYear - earliestTerm.startYear;
    }
  }

  // Determine next election
  let nextElection = currentYear.toString();
  if (chamber === 'House') {
    // House elections are every 2 years
    nextElection = currentYear % 2 === 0 ? currentYear.toString() : (currentYear + 1).toString();
  } else {
    // Senate terms are 6 years, need to check the specific term
    if (currentTerm?.endYear) {
      nextElection = currentTerm.endYear.toString();
    }
  }

  // Format the name - Congress API returns it as "Last, First"
  const formattedName =
    member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown';

  return {
    bioguideId: member.bioguideId,
    name: formattedName,
    party: member.partyName || member.party || 'Unknown',
    state: member.state,
    district: member.district ? member.district.toString() : undefined,
    chamber: chamber,
    website: member.url,
    imageUrl: member.depiction?.imageUrl,
    terms:
      member.terms?.item?.map(term => ({
        congress: term.congress ? term.congress.toString() : 'Current',
        startYear: term.startYear ? term.startYear.toString() : 'Unknown',
        endYear: term.endYear
          ? term.endYear.toString()
          : term.startYear
            ? (term.startYear + (chamber === 'House' ? 2 : 6)).toString()
            : 'Unknown',
      })) || [],
    yearsInOffice,
    nextElection,
  };
}

/**
 * Get representatives for a specific state and optional district
 * Falls back to congress-legislators data if API fails
 */
export async function getRepresentativesByLocation(
  state: string,
  district?: string,
  apiKey?: string
): Promise<Representative[]> {
  const representatives: Representative[] = [];

  // Track if we need to use congress-legislators data as fallback
  let shouldUseFallback = false;

  // Try to get senators from Congress.gov API first
  try {
    const members = await getCurrentMembersByState(state, apiKey);
    const apiSenators = members
      .filter(member => {
        // Check if latest term is in Senate
        const latestTerm = member.terms?.item?.[0];
        return latestTerm?.chamber === 'Senate';
      })
      .map(member => {
        // Convert CongressMember to Representative format
        const latestTerm = member.terms?.item?.[0];
        const chamber = latestTerm?.chamber === 'House of Representatives' ? 'House' : 'Senate';

        return {
          bioguideId: member.bioguideId,
          name: member.fullName || `${member.firstName} ${member.lastName}`.trim(),
          party: member.partyName || member.party,
          state: member.state,
          district: member.district,
          chamber: chamber as 'House' | 'Senate',
          website: member.url,
          imageUrl: member.depiction?.imageUrl,
          terms: member.terms?.item?.map(term => ({
            congress: term.congress.toString(),
            startYear: term.startYear.toString(),
            endYear: term.endYear?.toString() || 'Current',
          })),
          yearsInOffice: 0, // Will be calculated if needed
          nextElection: '2026', // Default, will be calculated if needed
        } as Representative;
      });

    if (apiSenators.length > 0) {
      structuredLogger.info('Adding senators from Congress.gov API', {
        component: 'congressApi',
        metadata: { count: apiSenators.length, state },
      });
      representatives.push(...apiSenators);
    } else {
      structuredLogger.info('No senators found via API - data unavailable', {
        component: 'congressApi',
        metadata: { state },
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting senators from API:', error);
    structuredLogger.error('Error getting senators from API', {
      component: 'congressApi',
      error: error as Error,
      metadata: { state },
    });
    shouldUseFallback = true;
  }

  // For House members, try the API but filter carefully
  if (district) {
    try {
      // Try to get specific member data if we can
      const members = await getCurrentMembersByState(state, apiKey);

      structuredLogger.info('Processing members for state', {
        component: 'congressApi',
        metadata: { count: members.length, state },
      });

      // Process the members - but be very strict about filtering
      for (const member of members) {
        // Check if member is in House and correct district
        const latestTerm = member.terms?.item?.[0];
        const isHouseMember = latestTerm?.chamber === 'House of Representatives';
        const isCorrectDistrict = member.district === district;

        if (isHouseMember && isCorrectDistrict) {
          // Additional check: make sure they're recent
          if (latestTerm && (!latestTerm.endYear || latestTerm.endYear >= 2024)) {
            const formattedMember: Representative = {
              bioguideId: member.bioguideId,
              name: member.fullName || `${member.firstName} ${member.lastName}`.trim(),
              party: member.partyName || member.party,
              state: member.state,
              district: member.district,
              chamber: 'House',
              website: member.url,
              imageUrl: member.depiction?.imageUrl,
              terms: member.terms?.item?.map(term => ({
                congress: term.congress.toString(),
                startYear: term.startYear.toString(),
                endYear: term.endYear?.toString() || 'Current',
              })),
              yearsInOffice: 0,
              nextElection: '2026',
            };

            structuredLogger.info('Adding House member', {
              component: 'congressApi',
              metadata: { name: formattedMember.name },
            });
            representatives.push(formattedMember);
          }
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error getting House members:', error);
      structuredLogger.error('Error getting House members', {
        component: 'congressApi',
        error: error as Error,
      });
      shouldUseFallback = true;
    }

    // If no House member found, log but don't create fake data
    if (!representatives.find(r => r.chamber === 'House')) {
      structuredLogger.warn('No House member found for district', {
        component: 'congressApi',
        metadata: { state, district },
      });
      // Return empty array rather than creating fake representatives
    }
  }

  // If we have no representatives or API failed, try congress-legislators fallback
  if (representatives.length === 0 || shouldUseFallback) {
    try {
      structuredLogger.info('Using congress-legislators fallback for missing representatives', {
        component: 'congressApi',
        metadata: { state, district },
      });

      const allEnhanced = await getAllEnhancedRepresentatives();
      const filteredReps = allEnhanced
        .filter(rep => {
          // Match state
          if (rep.state !== state) return false;

          // If district specified, match House members only for that district
          if (district) {
            return rep.chamber === 'House' && rep.district === district;
          }

          // If no district specified, return all (Senate and House)
          return true;
        })
        .map(enhanced => ({
          bioguideId: enhanced.bioguideId,
          name: enhanced.name,
          party: enhanced.party,
          state: enhanced.state,
          district: enhanced.district,
          chamber: enhanced.chamber,
          website: enhanced.website,
          phone: enhanced.phone,
          imageUrl: enhanced.imageUrl,
          yearsInOffice: 0, // Will be calculated from terms if needed
          nextElection: '2026', // Default next election year
          terms: enhanced.terms || [],
        }));

      representatives.push(...filteredReps);

      structuredLogger.info('Added representatives from congress-legislators fallback', {
        component: 'congressApi',
        metadata: { count: filteredReps.length, state, district },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error using congress-legislators fallback:', error);
      structuredLogger.error('Error using congress-legislators fallback', {
        component: 'congressApi',
        error: error as Error,
        metadata: { state, district },
      });
    }
  }

  // Validate all bioguide IDs before returning
  const validatedRepresentatives = validateRepresentatives(representatives);

  structuredLogger.info('Returning representatives', {
    component: 'congressApi',
    metadata: {
      count: validatedRepresentatives.length,
      originalCount: representatives.length,
      state,
      district: district || 'all',
    },
  });
  return validatedRepresentatives;
}

/**
 * Get bills sponsored by a specific member
 */
export async function getBillsByMember(bioguideId: string, apiKey?: string): Promise<unknown[]> {
  try {
    await congressRateLimiter.waitIfNeeded();

    const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;
    const url = new URL(`${CONGRESS_API_BASE}/member/${bioguideId}/sponsored-legislation`);

    url.searchParams.append('format', 'json');
    url.searchParams.append('limit', '50');

    if (congressApiKey) {
      url.searchParams.append('api_key', congressApiKey);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
      },
      // @ts-expect-error - Next.js fetch extension
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!response.ok) {
      structuredLogger.error('Congress bills API error', {
        component: 'congressApi',
        error: new Error(`${response.status} ${response.statusText}`),
        metadata: { status: response.status, statusText: response.statusText },
      });
      return [];
    }

    const data = await response.json();
    return data.sponsoredLegislation || [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching member bills:', error);
    structuredLogger.error('Error fetching member bills', {
      component: 'congressApi',
      error: error as Error,
    });
    return [];
  }
}

/**
 * Get voting record for a specific member using the new House Roll Call Votes API (May 2025)
 * Uses Congress.gov /house-vote endpoints introduced in beta for 119th Congress
 */
export async function getVotesByMember(bioguideId: string, apiKey?: string): Promise<unknown[]> {
  try {
    await congressRateLimiter.waitIfNeeded();

    const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;
    if (!congressApiKey) {
      structuredLogger.warn('Congress API key not available', {
        component: 'congressApi',
        bioguideId,
      });
      return [];
    }

    // Get House roll call votes for 119th Congress using new API
    const houseVotesUrl = new URL(`${CONGRESS_API_BASE}/house-vote/119`);
    houseVotesUrl.searchParams.append('format', 'json');
    houseVotesUrl.searchParams.append('limit', '50'); // Get recent votes
    houseVotesUrl.searchParams.append('api_key', congressApiKey);

    const response = await fetch(houseVotesUrl.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
      },
      // @ts-expect-error - Next.js fetch extension
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!response.ok) {
      structuredLogger.error('House votes API error', {
        component: 'congressApi',
        error: new Error(`${response.status} ${response.statusText}`),
        metadata: { status: response.status, statusText: response.statusText, bioguideId },
      });
      return [];
    }

    const data = await response.json();
    const rollCallVotes = data.houseRollCallVotes || [];

    structuredLogger.info('House roll call votes retrieved', {
      component: 'congressApi',
      bioguideId,
      votesCount: rollCallVotes.length,
      metadata: { congress: 119, source: 'house-vote-api' },
    });

    // Transform the roll call votes and fetch individual member positions
    const transformedVotes = await Promise.all(
      rollCallVotes.slice(0, 10).map(async (vote: unknown, index: number) => {
        const voteData = vote as Record<string, unknown>;
        const rollNumber = voteData.rollCallNumber as number;
        const session = voteData.sessionNumber as number;

        // Fetch individual member voting position using the live API
        let memberPosition: 'Yea' | 'Nay' | 'Present' | 'Not Voting' = 'Not Voting';
        let memberVoteData: unknown = null;

        try {
          const memberVoteResult = await getMemberVotingPositions(
            119, // 119th Congress only
            session,
            rollNumber,
            bioguideId,
            'house', // Chamber type
            congressApiKey
          );

          if (memberVoteResult.position) {
            memberPosition = memberVoteResult.position;
            memberVoteData = memberVoteResult.memberData;

            structuredLogger.info('Individual member vote retrieved', {
              component: 'congressApi',
              bioguideId,
              rollNumber,
              position: memberPosition,
            });
          }
        } catch (memberVoteError) {
          structuredLogger.warn('Could not fetch individual member vote', {
            component: 'congressApi',
            bioguideId,
            rollNumber,
            error: (memberVoteError as Error).message,
          });
        }

        return {
          voteId: `119-${rollNumber || index}`,
          bill: {
            number:
              voteData.legislationType && voteData.legislationNumber
                ? `${voteData.legislationType} ${voteData.legislationNumber}`
                : 'Roll Call Vote',
            title: (voteData.voteQuestion as string) || `Roll Call ${rollNumber}`,
            congress: (voteData.congress as number).toString(),
            type: (voteData.legislationType as string) || 'Vote',
            url: voteData.legislationUrl as string,
          },
          question: (voteData.voteQuestion as string) || 'On the Vote',
          result: (voteData.result as string) || 'Unknown',
          date: voteData.startDate
            ? new Date(voteData.startDate as string).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          // REAL individual member position from live API
          position: memberPosition,
          chamber: 'House' as const,
          rollNumber,
          voteType: voteData.voteType as string,
          sessionNumber: session,
          isKeyVote: false, // Could be enhanced based on bill importance
          category: 'Other' as const, // Could be enhanced with bill categorization logic
          metadata: {
            sourceUrl: voteData.sourceDataURL as string,
            lastUpdated: new Date().toISOString(),
            confidence: 'high',
            memberVoteData,
            dataSource: 'live-congress-api',
          },
        };
      })
    );

    return transformedVotes;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching House roll call votes:', error);
    structuredLogger.error('Error fetching House roll call votes', {
      component: 'congressApi',
      error: error as Error,
      metadata: { bioguideId },
    });
    return [];
  }
}

/**
 * Get vote details with member positions - unified function for both chambers
 * Currently uses chamber-specific endpoints, ready for unified /vote endpoint when available
 */
export async function getVoteDetails(
  congress: number,
  chamber: 'house' | 'senate',
  session: number,
  rollCallNumber: number,
  apiKey?: string
): Promise<{
  voteMetadata?: unknown;
  memberVotes: Array<{
    bioguideId: string;
    position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
    name: string;
    party: string;
    state: string;
  }>;
  success: boolean;
}> {
  try {
    await congressRateLimiter.waitIfNeeded();

    const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;
    if (!congressApiKey) {
      structuredLogger.warn('Congress API key not available for vote details', {
        component: 'congressApi',
        congress,
        chamber,
        rollCallNumber,
      });
      return { memberVotes: [], success: false };
    }

    // NOTE: When Congress.gov releases unified /vote endpoint, we can use:
    // const unifiedUrl = `${CONGRESS_API_BASE}/vote/${congress}/${chamber}/${session}/${rollCallNumber}/members`;

    // Handle chamber-specific endpoints
    if (chamber === 'senate') {
      // Use Senate.gov XML parsing for Senate votes
      structuredLogger.info('Using Senate.gov XML for Senate vote details', {
        component: 'congressApi',
        congress,
        chamber,
        rollCallNumber,
        note: 'Fetching from Senate.gov XML via proxy',
      });

      return await getSenateVoteDetails(congress, session, rollCallNumber);
    }

    // House Roll Call Votes API is available
    const membersUrl = `${CONGRESS_API_BASE}/house-vote/${congress}/${session}/${rollCallNumber}/members`;

    const url = new URL(membersUrl);
    url.searchParams.append('format', 'json');
    url.searchParams.append('api_key', congressApiKey);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
      },
      // @ts-expect-error - Next.js fetch extension
      next: { revalidate: 3600 }, // Cache for 1 hour since votes don't change
    });

    if (!response.ok) {
      structuredLogger.error('Vote details API error', {
        component: 'congressApi',
        error: new Error(`${response.status} ${response.statusText}`),
        metadata: {
          status: response.status,
          statusText: response.statusText,
          congress,
          chamber,
          rollCallNumber,
        },
      });
      return { memberVotes: [], success: false };
    }

    const data = await response.json();

    if (chamber === 'house') {
      // Parse House vote data structure
      const voteData = data.houseRollCallVoteMemberVotes;
      const results = voteData?.results || [];

      const memberVotes = results.map((vote: unknown) => {
        const voteRecord = vote as Record<string, unknown>;
        return {
          bioguideId: voteRecord.bioguideID as string,
          position: voteRecord.voteCast as 'Yea' | 'Nay' | 'Present' | 'Not Voting',
          name: `${voteRecord.firstName} ${voteRecord.lastName}`,
          party: voteRecord.voteParty as string,
          state: voteRecord.voteState as string,
        };
      });

      structuredLogger.info('Vote details retrieved successfully', {
        component: 'congressApi',
        congress,
        chamber,
        rollCallNumber,
        memberCount: memberVotes.length,
      });

      return {
        voteMetadata: voteData,
        memberVotes,
        success: true,
      };
    }

    return { memberVotes: [], success: false };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching vote details:', error);
    structuredLogger.error('Error fetching vote details', {
      component: 'congressApi',
      error: error as Error,
      metadata: { congress, chamber, rollCallNumber, session },
    });
    return { memberVotes: [], success: false };
  }
}

/**
 * Get individual member voting position for a specific vote
 * Uses the unified getVoteDetails function
 */
export async function getMemberVotingPositions(
  congress: number,
  session: number,
  rollCallNumber: number,
  bioguideId: string,
  _chamber: 'house' | 'senate' = 'house',
  apiKey?: string
): Promise<{
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting' | null;
  memberData?: unknown;
  voteData?: unknown;
}> {
  // Use the new getVoteDetails function which handles chamber logic
  const voteDetails = await getVoteDetails(congress, 'house', session, rollCallNumber, apiKey);

  if (!voteDetails.success) {
    return { position: null };
  }

  const memberVote = voteDetails.memberVotes.find(vote => vote.bioguideId === bioguideId);

  if (memberVote) {
    structuredLogger.info('Individual member vote found via getVoteDetails', {
      component: 'congressApi',
      bioguideId,
      position: memberVote.position,
      rollCallNumber,
      session,
      congress,
    });

    return {
      position: memberVote.position,
      memberData: memberVote,
      voteData: voteDetails.voteMetadata,
    };
  }

  return { position: null };
}

/**
 * Get committee memberships for a specific member
 */
export async function getCommitteesByMember(
  bioguideId: string,
  apiKey?: string
): Promise<unknown[]> {
  try {
    await congressRateLimiter.waitIfNeeded();

    const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;
    const url = new URL(`${CONGRESS_API_BASE}/member/${bioguideId}/committee-memberships`);

    url.searchParams.append('format', 'json');
    url.searchParams.append('congress', '119'); // Current congress

    if (congressApiKey) {
      url.searchParams.append('api_key', congressApiKey);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
      },
      // @ts-expect-error - Next.js fetch extension
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      structuredLogger.error('Congress committees API error', {
        component: 'congressApi',
        error: new Error(`${response.status} ${response.statusText}`),
        metadata: { status: response.status, statusText: response.statusText },
      });
      return [];
    }

    const data = await response.json();
    return data.memberships || [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching member committees:', error);
    structuredLogger.error('Error fetching member committees', {
      component: 'congressApi',
      error: error as Error,
    });
    return [];
  }
}

/**
 * Get recent bills from Congress
 */
export async function getRecentBills(limit = 20, apiKey?: string): Promise<unknown[]> {
  try {
    await congressRateLimiter.waitIfNeeded();

    const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;
    const url = new URL(`${CONGRESS_API_BASE}/bill`);

    url.searchParams.append('format', 'json');
    url.searchParams.append('congress', '119');
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('sort', 'latestAction.actionDate+desc');

    if (congressApiKey) {
      url.searchParams.append('api_key', congressApiKey);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
      },
      // @ts-expect-error - Next.js fetch extension
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!response.ok) {
      structuredLogger.error('Congress recent bills API error', {
        component: 'congressApi',
        error: new Error(`${response.status} ${response.statusText}`),
        metadata: { status: response.status, statusText: response.statusText },
      });
      return [];
    }

    const data = await response.json();
    return data.bills || [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching recent bills:', error);
    structuredLogger.error('Error fetching recent bills', {
      component: 'congressApi',
      error: error as Error,
    });
    return [];
  }
}

/**
 * Search bills by topic or keyword
 */
export async function searchBills(query: string, limit = 20, apiKey?: string): Promise<unknown[]> {
  try {
    await congressRateLimiter.waitIfNeeded();

    const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;
    const url = new URL(`${CONGRESS_API_BASE}/bill`);

    url.searchParams.append('format', 'json');
    url.searchParams.append('congress', '119');
    url.searchParams.append('limit', limit.toString());

    // Note: Congress API doesn't support direct text search in the current version
    // This would need to be implemented with a different approach or enhanced API access

    if (congressApiKey) {
      url.searchParams.append('api_key', congressApiKey);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
      },
      // @ts-expect-error - Next.js fetch extension
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!response.ok) {
      structuredLogger.error('Congress search bills API error', {
        component: 'congressApi',
        error: new Error(`${response.status} ${response.statusText}`),
        metadata: { status: response.status, statusText: response.statusText },
      });
      return [];
    }

    const data = await response.json();

    // Client-side filtering for now (not ideal for large datasets)
    const bills = data.bills || [];
    const filtered = bills.filter(
      (bill: CongressApiBill) =>
        bill.title?.toLowerCase().includes(query.toLowerCase()) ||
        bill.summaries?.[0]?.text?.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.slice(0, limit);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error searching bills:', error);
    structuredLogger.error('Error searching bills', {
      component: 'congressApi',
      error: error as Error,
    });
    return [];
  }
}

// Mock data has been removed as part of the data integrity improvements.
// All representative data is now fetched from real sources:
// - Congress.gov API for federal representatives
// - congress-legislators enhanced data for additional details

/**
 * Get detailed bill information including actions and recorded votes
 */
export async function getBillDetails(
  congress: string,
  billType: string,
  billNumber: string,
  apiKey?: string
): Promise<unknown> {
  try {
    await congressRateLimiter.waitIfNeeded();
    const key = apiKey || process.env.CONGRESS_API_KEY;

    if (!key) {
      throw new Error('Congress API key is required');
    }

    const url = `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}?format=json&api_key=${key}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.bill;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching bill details:', error);
    structuredLogger.error('Error fetching bill details', {
      component: 'congressApi',
      error: error as Error,
    });
    throw error;
  }
}

/**
 * Get Senate vote details with member positions from Senate.gov XML data
 * Uses the proxy route to handle CORS and parse XML voting records
 */
export async function getSenateVoteDetails(
  congress: number,
  _session: number,
  voteNumber: number
): Promise<{
  voteMetadata?: {
    question: string;
    result: string;
    date: string;
    bill?: { number: string; title: string };
  };
  memberVotes: Array<{
    bioguideId: string;
    position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
    name: string;
    party: string;
    state: string;
  }>;
  success: boolean;
}> {
  try {
    // Only support 119th Congress for now
    if (congress !== 119) {
      structuredLogger.warn('Senate votes only supported for 119th Congress', {
        component: 'congressApi',
        congress,
        voteNumber,
      });
      return { memberVotes: [], success: false };
    }

    // Fetch Senate XML data through our CORS proxy
    const proxyUrl = `/api/senate-votes/${voteNumber}`;

    structuredLogger.info('Fetching Senate vote XML via proxy', {
      component: 'congressApi',
      congress,
      voteNumber,
      proxyUrl,
    });

    const response = await fetch(proxyUrl);

    if (!response.ok) {
      structuredLogger.error('Senate vote proxy error', {
        component: 'congressApi',
        error: new Error(`${response.status} ${response.statusText}`),
        metadata: { status: response.status, voteNumber },
      });
      return { memberVotes: [], success: false };
    }

    const xmlText = await response.text();

    // Parse the Senate XML data
    // Senate XML structure includes vote metadata and member votes
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    // Check for XML parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      structuredLogger.error('Senate XML parsing error', {
        component: 'congressApi',
        error: new Error('Invalid XML structure'),
        metadata: { voteNumber, xmlLength: xmlText.length },
      });
      return { memberVotes: [], success: false };
    }

    // Extract vote metadata
    const voteDateText = xmlDoc.querySelector('vote_date')?.textContent?.trim();
    const voteDate = voteDateText || new Date().toISOString().split('T')[0];

    const voteMetadata = {
      question: xmlDoc.querySelector('vote_question')?.textContent?.trim() || 'Senate Vote',
      result: xmlDoc.querySelector('vote_result')?.textContent?.trim() || 'Unknown',
      date: voteDate as string,
      bill: {
        number:
          xmlDoc.querySelector('document > document_name')?.textContent?.trim() ||
          `Senate Vote ${voteNumber}`,
        title:
          xmlDoc.querySelector('vote_title')?.textContent?.trim() ||
          xmlDoc.querySelector('vote_question')?.textContent?.trim() ||
          `Senate Vote ${voteNumber}`,
      },
    };

    // Extract member votes
    const memberVotes: Array<{
      bioguideId: string;
      position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
      name: string;
      party: string;
      state: string;
    }> = [];

    // Parse members - Senate XML has all members in a single <members> section
    // Each member has a <vote_cast> field showing their actual vote
    const members = xmlDoc.querySelectorAll('members > member');

    for (const member of members) {
      const memberName =
        member.querySelector('member_full')?.textContent?.trim() ||
        `${member.querySelector('first_name')?.textContent?.trim() || ''} ${member.querySelector('last_name')?.textContent?.trim() || ''}`.trim();
      const state = member.querySelector('state')?.textContent?.trim() || '';
      const party = member.querySelector('party')?.textContent?.trim() || '';
      const voteCast = member.querySelector('vote_cast')?.textContent?.trim() || 'Not Voting';

      // Map Senate vote cast to our position format
      let position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
      switch (voteCast.toLowerCase()) {
        case 'yea':
          position = 'Yea';
          break;
        case 'nay':
          position = 'Nay';
          break;
        case 'present':
          position = 'Present';
          break;
        default:
          position = 'Not Voting';
      }

      // Try to extract LIS member ID or bioguide ID if available
      const lisMemberId = member.querySelector('lis_member_id')?.textContent?.trim();
      const bioguideId =
        member.querySelector('bioguide_id')?.textContent?.trim() ||
        lisMemberId ||
        `${memberName?.replace(/\s+/g, '')}_${state}`.toUpperCase();

      if (memberName && state) {
        memberVotes.push({
          bioguideId,
          position,
          name: memberName,
          party,
          state,
        });
      }
    }

    structuredLogger.info('Senate vote details parsed successfully', {
      component: 'congressApi',
      congress,
      voteNumber,
      memberCount: memberVotes.length,
      question: voteMetadata.question,
      result: voteMetadata.result,
    });

    return {
      voteMetadata,
      memberVotes,
      success: true,
    };
  } catch (error) {
    structuredLogger.error('Error parsing Senate vote XML', {
      component: 'congressApi',
      error: error as Error,
      metadata: { congress, voteNumber },
    });
    return { memberVotes: [], success: false };
  }
}

/**
 * Export consolidated congress API instance
 */
export const congressApi = {
  getCurrentMembersByState,
  getRepresentativesByLocation,
  getBillsByMember,
  getVotesByMember,
  getCommitteesByMember,
  getRecentBills,
  searchBills,
  getBillDetails,
  formatCongressMember,
  getSenateVoteDetails,
};
