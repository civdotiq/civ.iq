/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { structuredLogger } from '@/lib/logging/logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';

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
    'AL': 'al', 'AK': 'ak', 'AZ': 'az', 'AR': 'ar', 'CA': 'ca',
    'CO': 'co', 'CT': 'ct', 'DE': 'de', 'FL': 'fl', 'GA': 'ga',
    'HI': 'hi', 'ID': 'id', 'IL': 'il', 'IN': 'in', 'IA': 'ia',
    'KS': 'ks', 'KY': 'ky', 'LA': 'la', 'ME': 'me', 'MD': 'md',
    'MA': 'ma', 'MI': 'mi', 'MN': 'mn', 'MS': 'ms', 'MO': 'mo',
    'MT': 'mt', 'NE': 'ne', 'NV': 'nv', 'NH': 'nh', 'NJ': 'nj',
    'NM': 'nm', 'NY': 'ny', 'NC': 'nc', 'ND': 'nd', 'OH': 'oh',
    'OK': 'ok', 'OR': 'or', 'PA': 'pa', 'RI': 'ri', 'SC': 'sc',
    'SD': 'sd', 'TN': 'tn', 'TX': 'tx', 'UT': 'ut', 'VT': 'vt',
    'VA': 'va', 'WA': 'wa', 'WV': 'wv', 'WI': 'wi', 'WY': 'wy'
  };

  return stateMap[state.toUpperCase()] || state.toLowerCase();
}

// Fetch state jurisdiction info from OpenStates API
async function fetchStateJurisdiction(stateAbbrev: string): Promise<any> {
  const monitor = monitorExternalApi('openstates', 'jurisdiction', `https://v3.openstates.org/jurisdictions/${stateAbbrev}`);
  
  try {
    const response = await fetch(
      `https://v3.openstates.org/jurisdictions/${stateAbbrev}`,
      {
        headers: {
          'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
        }
      }
    );

    if (!response.ok) {
      monitor.end(false, response.status);
      structuredLogger.error('OpenStates jurisdiction API error', new Error(`HTTP ${response.status}`), {
        stateAbbrev,
        statusCode: response.status
      });
      return null;
    }

    monitor.end(true, 200);
    const data = await response.json();
    structuredLogger.info('Successfully fetched state jurisdiction', {
      stateAbbrev,
      jurisdictionName: data.name
    });
    
    return data;
  } catch (error) {
    monitor.end(false, undefined, error as Error);
    structuredLogger.error('Error fetching state jurisdiction', error as Error, {
      stateAbbrev
    });
    return null;
  }
}

// Fetch state legislators from OpenStates API
async function fetchStateLegislators(stateAbbrev: string, chamber?: string): Promise<StateLegislator[]> {
  const monitor = monitorExternalApi('openstates', 'legislators', `https://v3.openstates.org/people`);
  
  try {
    const url = new URL('https://v3.openstates.org/people');
    url.searchParams.set('jurisdiction', stateAbbrev);
    url.searchParams.set('current_role', 'true');
    url.searchParams.set('per_page', '200'); // Get more results
    
    if (chamber) {
      url.searchParams.set('chamber', chamber);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
      }
    });

    if (!response.ok) {
      monitor.end(false, response.status);
      structuredLogger.error('OpenStates legislators API error', new Error(`HTTP ${response.status}`), {
        stateAbbrev,
        chamber,
        statusCode: response.status
      });
      return [];
    }

    monitor.end(true, 200);
    const data = await response.json();
    
    structuredLogger.info('Successfully fetched state legislators', {
      stateAbbrev,
      chamber,
      count: data.results?.length || 0
    });

    return data.results?.map((person: any) => transformLegislator(person, stateAbbrev)) || [];
  } catch (error) {
    monitor.end(false, undefined, error as Error);
    structuredLogger.error('Error fetching state legislators', error as Error, {
      stateAbbrev,
      chamber
    });
    return [];
  }
}

// Transform OpenStates legislator data to our format
function transformLegislator(person: any, stateAbbrev: string): StateLegislator {
  const currentRole = person.current_role;
  const contactDetails = person.contact_details || [];
  
  const email = contactDetails.find((c: any) => c.type === 'email')?.value;
  const phone = contactDetails.find((c: any) => c.type === 'voice')?.value;
  
  return {
    id: person.id || `${stateAbbrev}-${currentRole?.chamber}-${currentRole?.district}`,
    name: person.name || 'Unknown',
    party: normalizeParty(person.party) || 'Other',
    chamber: currentRole?.chamber === 'upper' ? 'upper' : 'lower',
    district: currentRole?.district || 'Unknown',
    email,
    phone,
    office: contactDetails.find((c: any) => c.type === 'address')?.value,
    photoUrl: person.image,
    committees: [], // Would need separate API call to get committee memberships
    terms: [{
      startYear: currentRole?.start_date ? new Date(currentRole.start_date).getFullYear() : 2023,
      endYear: currentRole?.end_date ? new Date(currentRole.end_date).getFullYear() : (currentRole?.chamber === 'upper' ? 2027 : 2025),
      chamber: currentRole?.chamber === 'upper' ? 'upper' : 'lower'
    }],
    bills: {
      sponsored: 0, // Would need separate API call to get bill counts
      cosponsored: 0
    },
    votingRecord: {
      totalVotes: 0, // Would need separate API call to get voting records
      partyLineVotes: 0,
      crossoverVotes: 0
    }
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params;
  const { searchParams } = new URL(request.url);
  const chamber = searchParams.get('chamber'); // 'upper', 'lower', or null for both
  const party = searchParams.get('party'); // 'D', 'R', 'I', or null for all

  if (!state || state.length !== 2) {
    return NextResponse.json(
      { error: 'Valid state abbreviation is required' },
      { status: 400 }
    );
  }

  try {
    // Use cached fetch with 60-minute TTL for state legislature data
    const cacheKey = `state-legislature-${state.toUpperCase()}-${chamber || 'all'}-${party || 'all'}`;
    const TTL_60_MINUTES = 60 * 60;

    const legislatureData = await cachedFetch(
      cacheKey,
      async (): Promise<StateLegislatureData> => {
        structuredLogger.info('Fetching state legislature data from OpenStates', {
          state: state.toUpperCase(),
          chamber: chamber || 'all',
          party: party || 'all',
          operation: 'state_legislature_fetch'
        }, request);

        const stateAbbrev = getStateAbbreviation(state);
        
        // Fetch jurisdiction info and legislators from OpenStates API
        const [jurisdiction, legislators] = await Promise.all([
          fetchStateJurisdiction(stateAbbrev),
          fetchStateLegislators(stateAbbrev, chamber || undefined)
        ]);

        // If OpenStates API fails, fall back to mock data
        if (!jurisdiction || legislators.length === 0) {
          structuredLogger.warn('OpenStates API failed, falling back to mock data', {
            state: state.toUpperCase(),
            hasJurisdiction: !!jurisdiction,
            legislatorCount: legislators.length
          });
          
          return await generateFallbackData(state.toUpperCase());
        }

        // Calculate party distribution
        const partyCount = legislators.reduce((acc: any, leg) => {
          acc[leg.party] = (acc[leg.party] || 0) + 1;
          return acc;
        }, {});

        const upperLegislators = legislators.filter(leg => leg.chamber === 'upper');
        const lowerLegislators = legislators.filter(leg => leg.chamber === 'lower');

        const upperPartyCount = upperLegislators.reduce((acc: any, leg) => {
          acc[leg.party] = (acc[leg.party] || 0) + 1;
          return acc;
        }, {});

        const lowerPartyCount = lowerLegislators.reduce((acc: any, leg) => {
          acc[leg.party] = (acc[leg.party] || 0) + 1;
          return acc;
        }, {});

        return {
          state: state.toUpperCase(),
          stateName: jurisdiction.name,
          lastUpdated: new Date().toISOString(),
          session: {
            name: jurisdiction.latest_session?.name || '2024 Session',
            startDate: jurisdiction.latest_session?.start_date || '2024-01-01',
            endDate: jurisdiction.latest_session?.end_date || '2024-12-31',
            type: 'regular'
          },
          chambers: {
            upper: {
              name: jurisdiction.chambers?.find((c: any) => c.chamber === 'upper')?.name || 'State Senate',
              title: 'Senator',
              totalSeats: upperLegislators.length,
              democraticSeats: upperPartyCount['Democratic'] || 0,
              republicanSeats: upperPartyCount['Republican'] || 0,
              otherSeats: upperPartyCount['Independent'] + upperPartyCount['Other'] || 0
            },
            lower: {
              name: jurisdiction.chambers?.find((c: any) => c.chamber === 'lower')?.name || 'House of Representatives',
              title: 'Representative',
              totalSeats: lowerLegislators.length,
              democraticSeats: lowerPartyCount['Democratic'] || 0,
              republicanSeats: lowerPartyCount['Republican'] || 0,
              otherSeats: lowerPartyCount['Independent'] + lowerPartyCount['Other'] || 0
            }
          },
          legislators
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
        'D': 'Democratic',
        'R': 'Republican',
        'I': 'Independent'
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
        party: party || 'all'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    structuredLogger.error('State Legislature API Error', error as Error, {
      state: state.toUpperCase(),
      chamber: chamber || 'all',
      party: party || 'all',
      operation: 'state_legislature_api_error'
    }, request);
    
    // Return empty but valid response structure on error
    const errorResponse = {
      state: state.toUpperCase(),
      stateName: 'Unknown State',
      lastUpdated: new Date().toISOString(),
      session: {
        name: 'Data Unavailable',
        startDate: '',
        endDate: '',
        type: 'regular' as const
      },
      chambers: {
        upper: { name: 'State Senate', title: 'Senator', totalSeats: 0, democraticSeats: 0, republicanSeats: 0, otherSeats: 0 },
        lower: { name: 'State House', title: 'Representative', totalSeats: 0, democraticSeats: 0, republicanSeats: 0, otherSeats: 0 }
      },
      legislators: [],
      totalCount: 0,
      error: 'State legislature data temporarily unavailable'
    };

    return NextResponse.json(errorResponse, { status: 200 });
  }
}

// Fallback function for when OpenStates API is unavailable
async function generateFallbackData(state: string): Promise<StateLegislatureData> {
  const stateInfo = getBasicStateInfo(state);
  
  structuredLogger.info('Generating fallback mock data', {
    state,
    operation: 'fallback_data_generation'
  });
  
  return {
    state,
    stateName: stateInfo.name,
    lastUpdated: new Date().toISOString(),
    session: {
      name: '2024 Regular Session',
      startDate: '2024-01-08',
      endDate: '2024-08-31',
      type: 'regular'
    },
    chambers: stateInfo.chambers,
    legislators: [] // Return empty array when API is unavailable
  };
}

function getBasicStateInfo(state: string) {
  const stateNames: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
  };

  return {
    name: stateNames[state] || 'Unknown State',
    chambers: {
      upper: { name: 'State Senate', title: 'Senator', totalSeats: 0, democraticSeats: 0, republicanSeats: 0, otherSeats: 0 },
      lower: { name: 'House of Representatives', title: 'Representative', totalSeats: 0, democraticSeats: 0, republicanSeats: 0, otherSeats: 0 }
    }
  };
}