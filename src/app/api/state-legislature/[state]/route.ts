/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';

// ISR: Election-aware revalidation (3 days Oct-Dec, 30 days Jan-Sep)
// State jurisdiction data changes infrequently (only during redistricting or session changes)
export const revalidate = 259200; // 3 days

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

interface StateLegislator {
  id: string;
  name: string;
  party: 'Democratic' | 'Republican' | 'Independent' | 'Other';
  chamber: 'upper' | 'lower';
  district: string;
  email?: string;
  phone?: string;
  office?: string;
  photoUrl?: string;
  committees: Array<{
    name: string;
    role?: 'chair' | 'vice-chair' | 'member';
  }>;
  terms: Array<{
    startYear: number;
    endYear: number;
    chamber: 'upper' | 'lower';
  }>;
  bills: {
    sponsored: number;
    cosponsored: number;
  };
  votingRecord: {
    totalVotes: number;
    partyLineVotes: number;
    crossoverVotes: number;
  };
}

interface StateLegislatureData {
  state: string;
  stateName: string;
  lastUpdated: string;
  session: {
    name: string;
    startDate: string;
    endDate: string;
    type: 'regular' | 'special';
    status?: 'active' | 'in-recess' | 'adjourned' | 'upcoming';
  };
  chambers: {
    upper: {
      name: string;
      title: string; // e.g., "Senator", "State Senator"
      totalSeats: number;
      democraticSeats: number;
      republicanSeats: number;
      otherSeats: number;
    };
    lower: {
      name: string;
      title: string; // e.g., "Representative", "Assembly Member"
      totalSeats: number;
      democraticSeats: number;
      republicanSeats: number;
      otherSeats: number;
    };
  };
  legislators: StateLegislator[];
}

// Helper function to get state abbreviation mapping
function getStateAbbreviation(state: string): string {
  const stateMap: { [key: string]: string } = {
    AL: 'al',
    AK: 'ak',
    AZ: 'az',
    AR: 'ar',
    CA: 'ca',
    CO: 'co',
    CT: 'ct',
    DE: 'de',
    FL: 'fl',
    GA: 'ga',
    HI: 'hi',
    ID: 'id',
    IL: 'il',
    IN: 'in',
    IA: 'ia',
    KS: 'ks',
    KY: 'ky',
    LA: 'la',
    ME: 'me',
    MD: 'md',
    MA: 'ma',
    MI: 'mi',
    MN: 'mn',
    MS: 'ms',
    MO: 'mo',
    MT: 'mt',
    NE: 'ne',
    NV: 'nv',
    NH: 'nh',
    NJ: 'nj',
    NM: 'nm',
    NY: 'ny',
    NC: 'nc',
    ND: 'nd',
    OH: 'oh',
    OK: 'ok',
    OR: 'or',
    PA: 'pa',
    RI: 'ri',
    SC: 'sc',
    SD: 'sd',
    TN: 'tn',
    TX: 'tx',
    UT: 'ut',
    VT: 'vt',
    VA: 'va',
    WA: 'wa',
    WV: 'wv',
    WI: 'wi',
    WY: 'wy',
  };

  return stateMap[state.toUpperCase()] || state.toLowerCase();
}

// Helper: Sleep for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Retry with exponential backoff for rate limiting
async function fetchWithRetry(
  url: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
        },
      });

      // If rate limited (429), wait and retry
      if (response.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        logger.warn('OpenStates rate limit hit, retrying...', {
          attempt: attempt + 1,
          maxRetries,
          delayMs: delay,
          url,
        });
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(baseDelay * Math.pow(2, attempt));
    }
  }
  return null;
}

// Fetch state jurisdiction info from OpenStates API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchStateJurisdiction(stateAbbrev: string): Promise<any> {
  const monitor = monitorExternalApi(
    'openstates',
    'jurisdiction',
    `https://v3.openstates.org/jurisdictions/${stateAbbrev}`
  );

  try {
    const response = await fetchWithRetry(`https://v3.openstates.org/jurisdictions/${stateAbbrev}`);

    if (!response || !response.ok) {
      monitor.end(false, response?.status);
      logger.error('OpenStates jurisdiction API error', new Error(`HTTP ${response?.status}`), {
        stateAbbrev,
        statusCode: response?.status,
      });
      return null;
    }

    monitor.end(true, 200);
    const data = await response.json();
    logger.info('Successfully fetched state jurisdiction', {
      stateAbbrev,
      jurisdictionName: data.name,
    });

    return data;
  } catch (error) {
    monitor.end(false, undefined, error as Error);
    logger.error('Error fetching state jurisdiction', error as Error, {
      stateAbbrev,
    });
    return null;
  }
}

// Fetch state legislators from OpenStates API
async function fetchStateLegislators(
  stateAbbrev: string,
  requestedChamber?: string
): Promise<StateLegislator[]> {
  const monitor = monitorExternalApi(
    'openstates',
    'legislators',
    `https://v3.openstates.org/people`
  );

  try {
    // NOTE: OpenStates API's 'chamber' parameter is unreliable (returns wrong data for some states like MI)
    // So we fetch ALL legislators with pagination and filter by org_classification ourselves
    const allLegislators: StateLegislator[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = new URL('https://v3.openstates.org/people');
      url.searchParams.set('jurisdiction', stateAbbrev);
      url.searchParams.set('current_role', 'true');
      url.searchParams.set('per_page', '50'); // OpenStates API maximum is 50
      url.searchParams.set('page', page.toString());

      const response = await fetchWithRetry(url.toString());

      if (!response || !response.ok) {
        monitor.end(false, response?.status);
        logger.error('OpenStates legislators API error', new Error(`HTTP ${response?.status}`), {
          stateAbbrev,
          requestedChamber,
          page,
          statusCode: response?.status,
        });
        break;
      }

      const data = await response.json();
      const results = data.results || [];

      if (results.length === 0) {
        hasMore = false;
      } else {
        const transformed = results.map((person: unknown) =>
          transformLegislator(person, stateAbbrev)
        );
        allLegislators.push(...transformed);
        page++;
        hasMore = results.length === 50; // If we got exactly 50, there might be more
      }
    }

    monitor.end(true, 200);

    logger.info('Fetched all state legislators from OpenStates', {
      stateAbbrev,
      requestedChamber,
      totalPages: page - 1,
      totalFetched: allLegislators.length,
    });

    // Filter by chamber if requested (using org_classification from transform)
    if (requestedChamber) {
      const filtered = allLegislators.filter(
        (leg: StateLegislator) => leg.chamber === requestedChamber
      );
      logger.info('Filtered legislators by chamber', {
        requestedChamber,
        beforeFilter: allLegislators.length,
        afterFilter: filtered.length,
      });
      return filtered;
    }

    return allLegislators;
  } catch (error) {
    monitor.end(false, undefined, error as Error);
    logger.error('Error fetching state legislators', error as Error, {
      stateAbbrev,
      requestedChamber,
    });
    return [];
  }
}

// Transform OpenStates legislator data to our format
function transformLegislator(person: unknown, stateAbbrev: string): StateLegislator {
  const personData = person as Record<string, unknown>;
  const currentRole = personData.current_role as Record<string, unknown> | undefined;

  // OpenStates v3 uses 'org_classification' not 'chamber'
  const orgClassification = currentRole?.org_classification as string | undefined;
  const contactDetails = (personData.contact_details as Record<string, unknown>[]) || [];

  const email = contactDetails.find((c: Record<string, unknown>) => c.type === 'email')?.value as
    | string
    | undefined;
  const phone = contactDetails.find((c: Record<string, unknown>) => c.type === 'voice')?.value as
    | string
    | undefined;

  return {
    id: (personData.id as string) || `${stateAbbrev}-${orgClassification}-${currentRole?.district}`,
    name: (personData.name as string) || 'Unknown',
    party: normalizeParty(personData.party as string) || 'Other',
    chamber: orgClassification === 'upper' ? 'upper' : 'lower',
    district: (currentRole?.district as string) || 'Unknown',
    email,
    phone,
    office: contactDetails.find((c: Record<string, unknown>) => c.type === 'address')?.value as
      | string
      | undefined,
    photoUrl: personData.image as string | undefined,
    committees: [], // Would need separate API call to get committee memberships
    terms: [
      {
        startYear: currentRole?.start_date
          ? new Date(currentRole.start_date as string).getFullYear()
          : 2023,
        endYear: currentRole?.end_date
          ? new Date(currentRole.end_date as string).getFullYear()
          : orgClassification === 'upper'
            ? 2027
            : 2025,
        chamber: orgClassification === 'upper' ? 'upper' : 'lower',
      },
    ],
    bills: {
      sponsored: 0, // Would need separate API call to get bill counts
      cosponsored: 0,
    },
    votingRecord: {
      totalVotes: 0, // Would need separate API call to get voting records
      partyLineVotes: 0,
      crossoverVotes: 0,
    },
  };
}

// Normalize party names
function normalizeParty(party: string): StateLegislator['party'] {
  if (!party) return 'Other';

  const normalized = party.toLowerCase();
  if (normalized.includes('democrat')) return 'Democratic';
  if (normalized.includes('republican')) return 'Republican';
  if (normalized.includes('independent')) return 'Independent';
  return 'Other';
}

// Determine session status based on dates
function determineSessionStatus(
  startDate: string,
  endDate: string
): 'active' | 'in-recess' | 'adjourned' | 'upcoming' {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) {
    return 'upcoming';
  } else if (now > end) {
    return 'adjourned';
  } else {
    // Between start and end - could be active or in recess
    // Without detailed recess data, we'll assume active during session dates
    return 'active';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params;
  const { searchParams } = request.nextUrl;
  const chamber = searchParams.get('chamber'); // 'upper', 'lower', or null for both
  const party = searchParams.get('party'); // 'D', 'R', 'I', or null for all

  if (!state || state.length !== 2) {
    return NextResponse.json({ error: 'Valid state abbreviation is required' }, { status: 400 });
  }

  try {
    // Use cached fetch with 60-minute TTL for state legislature data
    const cacheKey = `state-legislature-${state.toUpperCase()}-${chamber || 'all'}-${party || 'all'}`;
    const TTL_60_MINUTES = 60 * 60;

    const legislatureData = await cachedFetch(
      cacheKey,
      async (): Promise<StateLegislatureData> => {
        logger.info(
          'Fetching state legislature data from OpenStates',
          {
            state: state.toUpperCase(),
            chamber: chamber || 'all',
            party: party || 'all',
            operation: 'state_legislature_fetch',
          },
          request
        );

        const stateAbbrev = getStateAbbreviation(state);

        // Fetch jurisdiction info and legislators from OpenStates API
        const [jurisdiction, legislators] = await Promise.all([
          fetchStateJurisdiction(stateAbbrev),
          fetchStateLegislators(stateAbbrev, chamber || undefined),
        ]);

        // EMERGENCY FIX: Never return fake legislators - return empty results with clear message
        if (!jurisdiction || legislators.length === 0) {
          logger.warn('OpenStates API unavailable - returning empty results', {
            state: state.toUpperCase(),
            hasJurisdiction: !!jurisdiction,
            legislatorCount: legislators.length,
            reason: 'Real state legislature data not available from OpenStates API',
          });

          return {
            state: state.toUpperCase(),
            stateName: jurisdiction?.name || getBasicStateInfo(state.toUpperCase()).name,
            lastUpdated: new Date().toISOString(),
            session: {
              name: 'Data Loading from OpenStates...',
              startDate: '',
              endDate: '',
              type: 'regular' as const,
            },
            chambers: getBasicStateInfo(state.toUpperCase()).chambers,
            legislators: [], // NEVER return fake legislators
          };
        }

        // Calculate party distribution
        const upperLegislators = legislators.filter(leg => leg.chamber === 'upper');
        const lowerLegislators = legislators.filter(leg => leg.chamber === 'lower');

        const upperPartyCount = upperLegislators.reduce((acc: Record<string, number>, leg) => {
          acc[leg.party] = (acc[leg.party] || 0) + 1;
          return acc;
        }, {});

        const lowerPartyCount = lowerLegislators.reduce((acc: Record<string, number>, leg) => {
          acc[leg.party] = (acc[leg.party] || 0) + 1;
          return acc;
        }, {});

        const sessionStartDate = jurisdiction.latest_session?.start_date || '2024-01-01';
        const sessionEndDate = jurisdiction.latest_session?.end_date || '2024-12-31';

        return {
          state: state.toUpperCase(),
          stateName: jurisdiction.name,
          lastUpdated: new Date().toISOString(),
          session: {
            name: jurisdiction.latest_session?.name || '2024 Session',
            startDate: sessionStartDate,
            endDate: sessionEndDate,
            type: 'regular',
            status: determineSessionStatus(sessionStartDate, sessionEndDate),
            // Note: recesses and deadlines require state-specific data not provided by OpenStates API
            // These fields can be populated with manual data or state-specific scraping in the future
          },
          chambers: {
            upper: {
              name:
                ((jurisdiction.chambers as Record<string, unknown>[] | undefined)?.find(
                  (c: Record<string, unknown>) => c.chamber === 'upper'
                )?.name as string) || 'State Senate',
              title: 'Senator',
              totalSeats: upperLegislators.length,
              democraticSeats: upperPartyCount['Democratic'] || 0,
              republicanSeats: upperPartyCount['Republican'] || 0,
              otherSeats: (upperPartyCount['Independent'] || 0) + (upperPartyCount['Other'] || 0),
            },
            lower: {
              name:
                ((jurisdiction.chambers as Record<string, unknown>[] | undefined)?.find(
                  (c: Record<string, unknown>) => c.chamber === 'lower'
                )?.name as string) || 'House of Representatives',
              title: 'Representative',
              totalSeats: lowerLegislators.length,
              democraticSeats: lowerPartyCount['Democratic'] || 0,
              republicanSeats: lowerPartyCount['Republican'] || 0,
              otherSeats: (lowerPartyCount['Independent'] || 0) + (lowerPartyCount['Other'] || 0),
            },
          },
          legislators,
        };
      },
      TTL_60_MINUTES
    );

    // Apply filters
    let filteredLegislators = legislatureData.legislators;

    if (chamber) {
      filteredLegislators = filteredLegislators.filter(leg => leg.chamber === chamber);
    }

    if (party) {
      const partyMap: Record<string, string> = {
        D: 'Democratic',
        R: 'Republican',
        I: 'Independent',
      };
      const fullPartyName = partyMap[party.toUpperCase()];
      if (fullPartyName) {
        filteredLegislators = filteredLegislators.filter(leg => leg.party === fullPartyName);
      }
    }

    const response = {
      ...legislatureData,
      legislators: filteredLegislators,
      totalCount: filteredLegislators.length,
      filters: {
        chamber: chamber || 'all',
        party: party || 'all',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error(
      'State Legislature API Error',
      error as Error,
      {
        state: state.toUpperCase(),
        chamber: chamber || 'all',
        party: party || 'all',
        operation: 'state_legislature_api_error',
      },
      request
    );

    // Return empty but valid response structure on error
    const errorResponse = {
      state: state.toUpperCase(),
      stateName: 'Unknown State',
      lastUpdated: new Date().toISOString(),
      session: {
        name: 'Data Unavailable',
        startDate: '',
        endDate: '',
        type: 'regular' as const,
      },
      chambers: {
        upper: {
          name: 'State Senate',
          title: 'Senator',
          totalSeats: 0,
          democraticSeats: 0,
          republicanSeats: 0,
          otherSeats: 0,
        },
        lower: {
          name: 'State House',
          title: 'Representative',
          totalSeats: 0,
          democraticSeats: 0,
          republicanSeats: 0,
          otherSeats: 0,
        },
      },
      legislators: [],
      totalCount: 0,
      error: 'State legislature data temporarily unavailable',
    };

    return NextResponse.json(errorResponse, { status: 200 });
  }
}

// EMERGENCY FIX: Removed generateFallbackData function
// Never return fake legislators - this was generating mock data

function getBasicStateInfo(state: string) {
  const stateNames: Record<string, string> = {
    AL: 'Alabama',
    AK: 'Alaska',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
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

  return {
    name: stateNames[state] || 'Unknown State',
    chambers: {
      upper: {
        name: 'State Senate',
        title: 'Senator',
        totalSeats: 0,
        democraticSeats: 0,
        republicanSeats: 0,
        otherSeats: 0,
      },
      lower: {
        name: 'House of Representatives',
        title: 'Representative',
        totalSeats: 0,
        democraticSeats: 0,
        republicanSeats: 0,
        otherSeats: 0,
      },
    },
  };
}
