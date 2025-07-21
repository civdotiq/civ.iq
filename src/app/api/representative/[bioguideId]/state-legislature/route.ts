/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { structuredLogger } from '@/lib/logging/logger';

interface StateLegislator {
  id: string;
  name: string;
  party: string;
  chamber: 'upper' | 'lower';
  district: string;
  image?: string;
  email?: string;
  phone?: string;
  website?: string;
  offices?: Array<{
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  }>;
}

interface StateBill {
  id: string;
  identifier: string;
  title: string;
  subject: string[];
  abstract?: string;
  latest_action_date: string;
  latest_action_description: string;
  classification: string[];
  sponsors: Array<{
    name: string;
    classification: string;
  }>;
  session: string;
  created_at: string;
  updated_at: string;
}

interface StateSession {
  identifier: string;
  name: string;
  classification: string;
  start_date: string;
  end_date: string;
}

interface StateLegislatureData {
  jurisdiction: {
    name: string;
    abbreviation: string;
    classification: string;
    chambers: Array<{
      name: string;
      classification: string;
    }>;
  };
  current_session: StateSession | null;
  state_legislators: StateLegislator[];
  recent_bills: StateBill[];
  representative_district_bills: StateBill[];
}

// Helper function to get state abbreviation mapping
function getStateAbbreviation(state: string): string {
  const stateMap: { [key: string]: string } = {
    'Alabama': 'al', 'Alaska': 'ak', 'Arizona': 'az', 'Arkansas': 'ar', 'California': 'ca',
    'Colorado': 'co', 'Connecticut': 'ct', 'Delaware': 'de', 'Florida': 'fl', 'Georgia': 'ga',
    'Hawaii': 'hi', 'Idaho': 'id', 'Illinois': 'il', 'Indiana': 'in', 'Iowa': 'ia',
    'Kansas': 'ks', 'Kentucky': 'ky', 'Louisiana': 'la', 'Maine': 'me', 'Maryland': 'md',
    'Massachusetts': 'ma', 'Michigan': 'mi', 'Minnesota': 'mn', 'Mississippi': 'ms', 'Missouri': 'mo',
    'Montana': 'mt', 'Nebraska': 'ne', 'Nevada': 'nv', 'New Hampshire': 'nh', 'New Jersey': 'nj',
    'New Mexico': 'nm', 'New York': 'ny', 'North Carolina': 'nc', 'North Dakota': 'nd', 'Ohio': 'oh',
    'Oklahoma': 'ok', 'Oregon': 'or', 'Pennsylvania': 'pa', 'Rhode Island': 'ri', 'South Carolina': 'sc',
    'South Dakota': 'sd', 'Tennessee': 'tn', 'Texas': 'tx', 'Utah': 'ut', 'Vermont': 'vt',
    'Virginia': 'va', 'Washington': 'wa', 'West Virginia': 'wv', 'Wisconsin': 'wi', 'Wyoming': 'wy'
  };

  // Handle direct state abbreviation inputs
  const directMatch = Object.values(stateMap).includes(state.toLowerCase());
  if (directMatch) return state.toLowerCase();

  // Handle full state name inputs
  return stateMap[state] || state.toLowerCase();
}

// Helper function to get state legislative districts for specific areas
function getStateDistrictsForArea(state: string, congressionalDistrict?: string): { senate: string[], house: string[] } {
  // ZIP 48221 is in Detroit, Michigan Congressional District 13
  // Based on Michigan redistricting, Detroit area includes these districts
  if (state === 'Michigan' && congressionalDistrict === '13') {
    return {
      senate: ['1', '2', '3', '4', '5'], // Detroit metro area senate districts
      house: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] // Detroit metro area house districts
    };
  }
  
  // Default: return empty to fetch all legislators
  return { senate: [], house: [] };
}

async function fetchStateJurisdiction(stateAbbrev: string): Promise<any> {
  const startTime = Date.now();
  try {
    const response = await fetch(
      `https://v3.openstates.org/jurisdictions/${stateAbbrev}`,
      {
        headers: {
          'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
        }
      }
    );
    
    const duration = Date.now() - startTime;
    
    // Log external API call
    structuredLogger.externalApi('OpenStates', 'fetchJurisdiction', duration, response.ok, {
      stateAbbrev,
      statusCode: response.status
    });

    if (!response.ok) {
      throw new Error(`OpenStates jurisdiction API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log failed external API call
    structuredLogger.externalApi('OpenStates', 'fetchJurisdiction', duration, false, {
      stateAbbrev,
      error: error instanceof Error ? error.message : String(error)
    });
    
    structuredLogger.error('Error fetching state jurisdiction', error as Error, {
      stateAbbrev,
      operation: 'state_jurisdiction_fetch'
    });
    return null;
  }
}

async function fetchStateLegislators(stateAbbrev: string, state: string, congressionalDistrict?: string): Promise<StateLegislator[]> {
  try {
    const districts = getStateDistrictsForArea(state, congressionalDistrict);
    const legislators: StateLegislator[] = [];
    
    structuredLogger.info('Fetching state legislators', {
      state,
      congressionalDistrict,
      operation: 'state_legislators_fetch'
    });
    structuredLogger.debug('Target state districts', {
      state,
      congressionalDistrict,
      districts,
      operation: 'state_districts_mapping'
    });
    
    // If we have specific districts to target, fetch them individually
    if (districts.senate.length > 0 || districts.house.length > 0) {
      // Fetch specific districts
      const allDistrictsToFetch = [
        ...districts.senate.map(d => ({ district: d, chamber: 'upper' })),
        ...districts.house.map(d => ({ district: d, chamber: 'lower' }))
      ];
      
      for (const { district, chamber } of allDistrictsToFetch.slice(0, 10)) { // Limit to avoid too many requests
        const url = `https://v3.openstates.org/people?jurisdiction=${stateAbbrev}&current_role=true&district=${district}`;
        
        structuredLogger.debug('Fetching legislators from district', {
          district,
          chamber,
          url: url.replace(process.env.OPENSTATES_API_KEY || '', 'API_KEY_HIDDEN'),
          operation: 'district_legislators_fetch'
        });
        
        const fetchStartTime = Date.now();
        const response = await fetch(url, {
          headers: {
            'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
          }
        });
        
        const fetchDuration = Date.now() - fetchStartTime;
        
        // Log external API call
        structuredLogger.externalApi('OpenStates', 'fetchLegislators', fetchDuration, response.ok, {
          district,
          chamber,
          statusCode: response.status
        });

        if (response.ok) {
          const data = await response.json();
          const districtLegislators = data.results?.map((person: unknown) => ({
            id: person.id,
            name: person.name,
            party: person.current_role?.party || 'Unknown',
            chamber: person.current_role?.org_classification || chamber,
            district: person.current_role?.district || district,
            image: person.image,
            email: person.email,
            phone: person.phone,
            website: person.links?.find((link: unknown) => link.note === 'website')?.url,
            offices: person.offices?.map((office: unknown) => ({
              name: office.name || 'Office',
              address: office.address,
              phone: office.phone,
              email: office.email
            }))
          })) || [];
          
          legislators.push(...districtLegislators);
          structuredLogger.info('Found legislators in district', {
            district,
            legislatorCount: districtLegislators.length,
            operation: 'district_legislators_found'
          });
        }
      }
    } else {
      // Fallback: fetch all current legislators for the state
      const url = `https://v3.openstates.org/people?jurisdiction=${stateAbbrev}&current_role=true&per_page=20`;
      
      structuredLogger.info('Fetching all current legislators', {
        stateAbbrev,
        url: url.replace(process.env.OPENSTATES_API_KEY || '', 'API_KEY_HIDDEN'),
        operation: 'all_legislators_fetch'
      });
      
      const fetchStartTime = Date.now();
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
        }
      });
      
      const fetchDuration = Date.now() - fetchStartTime;
      
      // Log external API call
      structuredLogger.externalApi('OpenStates', 'fetchAllLegislators', fetchDuration, response.ok, {
        stateAbbrev,
        statusCode: response.status
      });

      if (response.ok) {
        const data = await response.json();
        const allLegislators = data.results?.slice(0, 15).map((person: unknown) => ({
          id: person.id,
          name: person.name,
          party: person.current_role?.party || 'Unknown',
          chamber: person.current_role?.org_classification || 'lower',
          district: person.current_role?.district || 'Unknown',
          image: person.image,
          email: person.email,
          phone: person.phone,
          website: person.links?.find((link: unknown) => link.note === 'website')?.url,
          offices: person.offices?.map((office: unknown) => ({
            name: office.name || 'Office',
            address: office.address,
            phone: office.phone,
            email: office.email
          }))
        })) || [];
        
        legislators.push(...allLegislators);
      }
    }
    
    structuredLogger.info('Total legislators found', {
      state,
      congressionalDistrict,
      legislatorCount: legislators.length,
      operation: 'legislators_fetch_complete'
    });
    return legislators;
    
  } catch (error) {
    structuredLogger.error('Error fetching state legislators', error as Error, {
      stateAbbrev,
      state,
      congressionalDistrict,
      operation: 'state_legislators_fetch_error'
    });
    return [];
  }
}

async function fetchRecentStateBills(stateAbbrev: string): Promise<StateBill[]> {
  const startTime = Date.now();
  try {
    const response = await fetch(
      `https://v3.openstates.org/bills?jurisdiction=${stateAbbrev}&sort=updated_desc&per_page=15`,
      {
        headers: {
          'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
        }
      }
    );
    
    const duration = Date.now() - startTime;
    
    // Log external API call
    structuredLogger.externalApi('OpenStates', 'fetchBills', duration, response.ok, {
      stateAbbrev,
      statusCode: response.status
    });

    if (!response.ok) {
      throw new Error(`OpenStates bills API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.results?.map((bill: unknown) => ({
      id: bill.id,
      identifier: bill.identifier,
      title: bill.title,
      subject: bill.subject || [],
      abstract: bill.abstract,
      latest_action_date: bill.latest_action_date,
      latest_action_description: bill.latest_action_description,
      classification: bill.classification || [],
      sponsors: bill.sponsorships?.map((sponsor: unknown) => ({
        name: sponsor.name,
        classification: sponsor.classification
      })) || [],
      session: bill.session,
      created_at: bill.created_at,
      updated_at: bill.updated_at
    })) || [];
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log failed external API call
    structuredLogger.externalApi('OpenStates', 'fetchBills', duration, false, {
      stateAbbrev,
      error: error instanceof Error ? error.message : String(error)
    });
    
    structuredLogger.error('Error fetching state bills', error as Error, {
      stateAbbrev,
      operation: 'state_bills_fetch_error'
    });
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;

  if (!bioguideId) {
    return NextResponse.json(
      { error: 'Bioguide ID is required' },
      { status: 400 }
    );
  }

  try {
    // First, get representative info
    const repResponse = await fetch(
      `${request.nextUrl.origin}/api/representative/${bioguideId}`
    );
    
    if (!repResponse.ok) {
      throw new Error('Failed to fetch representative info');
    }

    const representative = await repResponse.json();
    const stateAbbrev = getStateAbbreviation(representative.state);

    if (process.env.OPENSTATES_API_KEY) {
      // Fetch real data from OpenStates API
      const [jurisdiction, legislators, recentBills] = await Promise.all([
        fetchStateJurisdiction(stateAbbrev),
        fetchStateLegislators(stateAbbrev, representative.state, representative.district),
        fetchRecentStateBills(stateAbbrev)
      ]);

      const stateData: StateLegislatureData = {
        jurisdiction: jurisdiction || {
          name: representative.state,
          abbreviation: stateAbbrev.toUpperCase(),
          classification: 'state',
          chambers: [
            { name: 'House', classification: 'lower' },
            { name: 'Senate', classification: 'upper' }
          ]
        },
        current_session: jurisdiction?.current_session || null,
        state_legislators: legislators,
        recent_bills: recentBills,
        representative_district_bills: recentBills.filter(bill => 
          bill.subject.some(subj => 
            subj.toLowerCase().includes('federal') || 
            subj.toLowerCase().includes('congress')
          )
        ).slice(0, 5)
      };

      return NextResponse.json(stateData);
    }

    // Fallback mock data
    const mockData: StateLegislatureData = {
      jurisdiction: {
        name: representative.state,
        abbreviation: representative.state,
        classification: 'state',
        chambers: [
          { name: 'House of Representatives', classification: 'lower' },
          { name: 'Senate', classification: 'upper' }
        ]
      },
      current_session: {
        identifier: '2024',
        name: '2024 Regular Session',
        classification: 'primary',
        start_date: '2024-01-08',
        end_date: '2024-06-30'
      },
      state_legislators: [
        {
          id: 'mock-1',
          name: `State Sen. ${representative.state} District 1`,
          party: 'Democratic',
          chamber: 'upper',
          district: '1',
          email: 'senator1@state.gov',
          phone: '(555) 123-4567'
        },
        {
          id: 'mock-2',
          name: `State Rep. ${representative.state} District A`,
          party: 'Republican',
          chamber: 'lower',
          district: 'A',
          email: 'rep-a@state.gov',
          phone: '(555) 234-5678'
        },
        {
          id: 'mock-3',
          name: `State Sen. ${representative.state} District 2`,
          party: 'Democratic',
          chamber: 'upper',
          district: '2',
          email: 'senator2@state.gov',
          phone: '(555) 345-6789'
        }
      ],
      recent_bills: [
        {
          id: 'mock-bill-1',
          identifier: 'SB 1234',
          title: 'State Infrastructure Modernization Act',
          subject: ['Transportation', 'Infrastructure'],
          abstract: 'A bill to modernize state transportation infrastructure and improve road safety.',
          latest_action_date: '2024-03-15',
          latest_action_description: 'Passed Senate, sent to House',
          classification: ['bill'],
          sponsors: [
            { name: `State Sen. ${representative.state} District 1`, classification: 'primary' }
          ],
          session: '2024',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-03-15T00:00:00Z'
        },
        {
          id: 'mock-bill-2',
          identifier: 'HB 5678',
          title: 'Education Funding Enhancement Act',
          subject: ['Education', 'Budget'],
          abstract: 'Increases funding for public education and teacher salaries.',
          latest_action_date: '2024-03-10',
          latest_action_description: 'Committee hearing scheduled',
          classification: ['bill'],
          sponsors: [
            { name: `State Rep. ${representative.state} District A`, classification: 'primary' }
          ],
          session: '2024',
          created_at: '2024-01-20T00:00:00Z',
          updated_at: '2024-03-10T00:00:00Z'
        },
        {
          id: 'mock-bill-3',
          identifier: 'SB 9012',
          title: 'Healthcare Access Improvement Act',
          subject: ['Health', 'Insurance'],
          abstract: 'Expands healthcare access in rural communities.',
          latest_action_date: '2024-03-05',
          latest_action_description: 'Introduced in Senate',
          classification: ['bill'],
          sponsors: [
            { name: `State Sen. ${representative.state} District 2`, classification: 'primary' }
          ],
          session: '2024',
          created_at: '2024-03-05T00:00:00Z',
          updated_at: '2024-03-05T00:00:00Z'
        }
      ],
      representative_district_bills: []
    };

    return NextResponse.json(mockData);

  } catch (error) {
    structuredLogger.error('State Legislature API Error', error as Error, {
      bioguideId,
      operation: 'state_legislature_api_error'
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}