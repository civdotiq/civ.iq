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
 * Get voting record for a specific member
 */
export async function getVotesByMember(bioguideId: string, apiKey?: string): Promise<unknown[]> {
  try {
    await congressRateLimiter.waitIfNeeded();

    const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;

    // Get recent votes from current congress
    const url = new URL(`${CONGRESS_API_BASE}/member/${bioguideId}/votes`);

    url.searchParams.append('format', 'json');
    url.searchParams.append('limit', '100');

    if (congressApiKey) {
      url.searchParams.append('api_key', congressApiKey);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
      },
      // @ts-expect-error - Next.js fetch extension
      next: { revalidate: 900 }, // Cache for 15 minutes
    });

    if (!response.ok) {
      structuredLogger.error('Congress votes API error', {
        component: 'congressApi',
        error: new Error(`${response.status} ${response.statusText}`),
        metadata: { status: response.status, statusText: response.statusText },
      });
      return [];
    }

    const data = await response.json();
    return data.votes || [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching member votes:', error);
    structuredLogger.error('Error fetching member votes', {
      component: 'congressApi',
      error: error as Error,
    });
    return [];
  }
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

// This function has been removed as part of the mock data elimination project.
// Senator data is now fetched dynamically from Congress.gov API.

/**
 * Generate mock representatives for testing/fallback
 */
function _getMockRepresentatives(state: string, district?: string): Representative[] {
  const currentYear = new Date().getFullYear();
  const representatives: Representative[] = [];

  // Mock Senators
  representatives.push(
    {
      bioguideId: `${state}001`,
      name: `John Smith`,
      party: 'Democratic',
      state: state,
      chamber: 'Senate',
      phone: '(202) 224-0001',
      website: `https://smith.senate.gov`,
      yearsInOffice: 8,
      nextElection: '2028',
      imageUrl: '/api/placeholder/200/250',
    },
    {
      bioguideId: `${state}002`,
      name: `Jane Johnson`,
      party: 'Republican',
      state: state,
      chamber: 'Senate',
      phone: '(202) 224-0002',
      website: `https://johnson.senate.gov`,
      yearsInOffice: 4,
      nextElection: '2026',
      imageUrl: '/api/placeholder/200/250',
    }
  );

  // Mock House Representative
  if (district) {
    representatives.push({
      bioguideId: `${state}H${district}`,
      name: `Michael Davis`,
      party: 'Democratic',
      state: state,
      district: district,
      chamber: 'House',
      phone: '(202) 225-0001',
      website: `https://davis.house.gov`,
      yearsInOffice: 6,
      nextElection: currentYear % 2 === 0 ? currentYear.toString() : (currentYear + 1).toString(),
      imageUrl: '/api/placeholder/200/250',
    });
  }

  return representatives;
}

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
};
