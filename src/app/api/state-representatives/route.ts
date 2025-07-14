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

interface StateLegislator {
  id: string;
  name: string;
  party: string;
  chamber: 'upper' | 'lower';
  district: string;
  state: string;
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
  currentRole?: {
    title: string;
    org_classification: string;
    district: string;
    party: string;
    start_date: string;
    end_date?: string;
  };
}

interface StateApiResponse {
  zipCode: string;
  state: string;
  stateName: string;
  legislators: StateLegislator[];
  jurisdiction?: {
    name: string;
    classification: string;
    chambers: Array<{
      name: string;
      classification: string;
    }>;
  };
}

// Helper function to get state abbreviation from full name
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

  // Handle direct abbreviation inputs
  const directMatch = Object.values(stateMap).includes(state.toLowerCase());
  if (directMatch) return state.toLowerCase();

  // Handle full state name inputs
  return stateMap[state] || state.toLowerCase();
}

// Get full state name from abbreviation
function getStateName(abbreviation: string): string {
  const stateNameMap: { [key: string]: string } = {
    'al': 'Alabama', 'ak': 'Alaska', 'az': 'Arizona', 'ar': 'Arkansas', 'ca': 'California',
    'co': 'Colorado', 'ct': 'Connecticut', 'de': 'Delaware', 'fl': 'Florida', 'ga': 'Georgia',
    'hi': 'Hawaii', 'id': 'Idaho', 'il': 'Illinois', 'in': 'Indiana', 'ia': 'Iowa',
    'ks': 'Kansas', 'ky': 'Kentucky', 'la': 'Louisiana', 'me': 'Maine', 'md': 'Maryland',
    'ma': 'Massachusetts', 'mi': 'Michigan', 'mn': 'Minnesota', 'ms': 'Mississippi', 'mo': 'Missouri',
    'mt': 'Montana', 'ne': 'Nebraska', 'nv': 'Nevada', 'nh': 'New Hampshire', 'nj': 'New Jersey',
    'nm': 'New Mexico', 'ny': 'New York', 'nc': 'North Carolina', 'nd': 'North Dakota', 'oh': 'Ohio',
    'ok': 'Oklahoma', 'or': 'Oregon', 'pa': 'Pennsylvania', 'ri': 'Rhode Island', 'sc': 'South Carolina',
    'sd': 'South Dakota', 'tn': 'Tennessee', 'tx': 'Texas', 'ut': 'Utah', 'vt': 'Vermont',
    'va': 'Virginia', 'wa': 'Washington', 'wv': 'West Virginia', 'wi': 'Wisconsin', 'wy': 'Wyoming'
  };

  return stateNameMap[abbreviation.toLowerCase()] || abbreviation.toUpperCase();
}

// Helper function to get state from ZIP code using Census API
async function getStateFromZip(zipCode: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${zipCode}&benchmark=2020&format=json`
    );

    if (!response.ok) {
      throw new Error(`Census geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result?.addressMatches?.[0]?.addressComponents?.state) {
      return data.result.addressMatches[0].addressComponents.state;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting state from ZIP:', error);
    return null;
  }
}

// Fetch state jurisdiction info from OpenStates
async function fetchStateJurisdiction(stateAbbrev: string): Promise<any> {
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
      throw new Error(`OpenStates jurisdiction API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching state jurisdiction:', error);
    return null;
  }
}

// Fetch state legislators from OpenStates
async function fetchStateLegislators(stateAbbrev: string): Promise<StateLegislator[]> {
  try {
    const response = await fetch(
      `https://v3.openstates.org/people?jurisdiction=${stateAbbrev}&current_role=true&per_page=50`,
      {
        headers: {
          'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`OpenStates people API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.results?.map((person: any) => ({
      id: person.id,
      name: person.name,
      party: person.current_role?.party || 'Unknown',
      chamber: person.current_role?.org_classification || 'lower',
      district: person.current_role?.district || 'Unknown',
      state: stateAbbrev.toUpperCase(),
      image: person.image,
      email: person.email,
      phone: person.phone,
      website: person.links?.find((link: any) => link.note === 'website')?.url,
      offices: person.offices?.map((office: any) => ({
        name: office.name || 'Office',
        address: office.address,
        phone: office.phone,
        email: office.email
      })),
      currentRole: person.current_role ? {
        title: person.current_role.title || `${person.current_role.org_classification === 'upper' ? 'State Senator' : 'State Representative'}`,
        org_classification: person.current_role.org_classification,
        district: person.current_role.district,
        party: person.current_role.party,
        start_date: person.current_role.start_date,
        end_date: person.current_role.end_date
      } : undefined
    })) || [];
  } catch (error) {
    console.error('Error fetching state legislators:', error);
    return [];
  }
}

// Generate mock data when OpenStates API is unavailable
function generateMockStateLegislators(state: string, stateAbbrev: string): StateLegislator[] {
  const stateName = getStateName(stateAbbrev);
  
  return [
    {
      id: 'mock-sen-1',
      name: `Sen. ${stateName} District 1`,
      party: 'Democratic',
      chamber: 'upper',
      district: '1',
      state: stateAbbrev.toUpperCase(),
      email: 'senator1@state.gov',
      phone: '(555) 123-4567',
      currentRole: {
        title: 'State Senator',
        org_classification: 'upper',
        district: '1',
        party: 'Democratic',
        start_date: '2021-01-01'
      }
    },
    {
      id: 'mock-rep-1',
      name: `Rep. ${stateName} District A`,
      party: 'Republican',
      chamber: 'lower',
      district: 'A',
      state: stateAbbrev.toUpperCase(),
      email: 'rep-a@state.gov',
      phone: '(555) 234-5678',
      currentRole: {
        title: 'State Representative',
        org_classification: 'lower',
        district: 'A',
        party: 'Republican',
        start_date: '2020-01-01'
      }
    },
    {
      id: 'mock-sen-2',
      name: `Sen. ${stateName} District 2`,
      party: 'Democratic',
      chamber: 'upper',
      district: '2',
      state: stateAbbrev.toUpperCase(),
      email: 'senator2@state.gov',
      phone: '(555) 345-6789',
      currentRole: {
        title: 'State Senator',
        org_classification: 'upper',
        district: '2',
        party: 'Democratic',
        start_date: '2019-01-01'
      }
    },
    {
      id: 'mock-rep-2',
      name: `Rep. ${stateName} District B`,
      party: 'Republican',
      chamber: 'lower',
      district: 'B',
      state: stateAbbrev.toUpperCase(),
      email: 'rep-b@state.gov',
      phone: '(555) 456-7890',
      currentRole: {
        title: 'State Representative',
        org_classification: 'lower',
        district: 'B',
        party: 'Republican',
        start_date: '2022-01-01'
      }
    },
    {
      id: 'mock-rep-3',
      name: `Rep. ${stateName} District C`,
      party: 'Democratic',
      chamber: 'lower',
      district: 'C',
      state: stateAbbrev.toUpperCase(),
      email: 'rep-c@state.gov',
      phone: '(555) 567-8901',
      currentRole: {
        title: 'State Representative',
        org_classification: 'lower',
        district: 'C',
        party: 'Democratic',
        start_date: '2021-01-01'
      }
    }
  ];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zip');

  if (!zipCode) {
    return NextResponse.json(
      { error: 'ZIP code is required' },
      { status: 400 }
    );
  }

  try {
    // Get state from ZIP code
    const stateFromZip = await getStateFromZip(zipCode);
    
    if (!stateFromZip) {
      return NextResponse.json(
        { error: 'Could not determine state from ZIP code' },
        { status: 400 }
      );
    }

    const stateAbbrev = getStateAbbreviation(stateFromZip);
    const stateName = getStateName(stateAbbrev);

    if (process.env.OPENSTATES_API_KEY) {
      // Fetch real data from OpenStates API
      const [jurisdiction, legislators] = await Promise.all([
        fetchStateJurisdiction(stateAbbrev),
        fetchStateLegislators(stateAbbrev)
      ]);

      const response: StateApiResponse = {
        zipCode,
        state: stateAbbrev.toUpperCase(),
        stateName,
        legislators: legislators.sort((a, b) => {
          // Sort by chamber (Senate first), then by district
          if (a.chamber !== b.chamber) {
            return a.chamber === 'upper' ? -1 : 1;
          }
          return a.district.localeCompare(b.district);
        }),
        jurisdiction: jurisdiction || {
          name: stateName,
          classification: 'state',
          chambers: [
            { name: 'House of Representatives', classification: 'lower' },
            { name: 'Senate', classification: 'upper' }
          ]
        }
      };

      return NextResponse.json(response);
    }

    // Fallback mock data
    const mockLegislators = generateMockStateLegislators(stateName, stateAbbrev);
    
    const response: StateApiResponse = {
      zipCode,
      state: stateAbbrev.toUpperCase(),
      stateName,
      legislators: mockLegislators,
      jurisdiction: {
        name: stateName,
        classification: 'state',
        chambers: [
          { name: 'House of Representatives', classification: 'lower' },
          { name: 'Senate', classification: 'upper' }
        ]
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}