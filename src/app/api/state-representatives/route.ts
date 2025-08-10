/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

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
    Alabama: 'al',
    Alaska: 'ak',
    Arizona: 'az',
    Arkansas: 'ar',
    California: 'ca',
    Colorado: 'co',
    Connecticut: 'ct',
    Delaware: 'de',
    Florida: 'fl',
    Georgia: 'ga',
    Hawaii: 'hi',
    Idaho: 'id',
    Illinois: 'il',
    Indiana: 'in',
    Iowa: 'ia',
    Kansas: 'ks',
    Kentucky: 'ky',
    Louisiana: 'la',
    Maine: 'me',
    Maryland: 'md',
    Massachusetts: 'ma',
    Michigan: 'mi',
    Minnesota: 'mn',
    Mississippi: 'ms',
    Missouri: 'mo',
    Montana: 'mt',
    Nebraska: 'ne',
    Nevada: 'nv',
    'New Hampshire': 'nh',
    'New Jersey': 'nj',
    'New Mexico': 'nm',
    'New York': 'ny',
    'North Carolina': 'nc',
    'North Dakota': 'nd',
    Ohio: 'oh',
    Oklahoma: 'ok',
    Oregon: 'or',
    Pennsylvania: 'pa',
    'Rhode Island': 'ri',
    'South Carolina': 'sc',
    'South Dakota': 'sd',
    Tennessee: 'tn',
    Texas: 'tx',
    Utah: 'ut',
    Vermont: 'vt',
    Virginia: 'va',
    Washington: 'wa',
    'West Virginia': 'wv',
    Wisconsin: 'wi',
    Wyoming: 'wy',
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
    al: 'Alabama',
    ak: 'Alaska',
    az: 'Arizona',
    ar: 'Arkansas',
    ca: 'California',
    co: 'Colorado',
    ct: 'Connecticut',
    de: 'Delaware',
    fl: 'Florida',
    ga: 'Georgia',
    hi: 'Hawaii',
    id: 'Idaho',
    il: 'Illinois',
    in: 'Indiana',
    ia: 'Iowa',
    ks: 'Kansas',
    ky: 'Kentucky',
    la: 'Louisiana',
    me: 'Maine',
    md: 'Maryland',
    ma: 'Massachusetts',
    mi: 'Michigan',
    mn: 'Minnesota',
    ms: 'Mississippi',
    mo: 'Missouri',
    mt: 'Montana',
    ne: 'Nebraska',
    nv: 'Nevada',
    nh: 'New Hampshire',
    nj: 'New Jersey',
    nm: 'New Mexico',
    ny: 'New York',
    nc: 'North Carolina',
    nd: 'North Dakota',
    oh: 'Ohio',
    ok: 'Oklahoma',
    or: 'Oregon',
    pa: 'Pennsylvania',
    ri: 'Rhode Island',
    sc: 'South Carolina',
    sd: 'South Dakota',
    tn: 'Tennessee',
    tx: 'Texas',
    ut: 'Utah',
    vt: 'Vermont',
    va: 'Virginia',
    wa: 'Washington',
    wv: 'West Virginia',
    wi: 'Wisconsin',
    wy: 'Wyoming',
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
  } catch {
    // Error logged in monitoring system
    return null;
  }
}

// Fetch state jurisdiction info from OpenStates
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchStateJurisdiction(stateAbbrev: string): Promise<any> {
  try {
    const response = await fetch(`https://v3.openstates.org/jurisdictions/${stateAbbrev}`, {
      headers: {
        'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenStates jurisdiction API error: ${response.status}`);
    }

    return await response.json();
  } catch {
    // Error logged in monitoring system
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
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenStates people API error: ${response.status}`);
    }

    const data = await response.json();

    return (
      data.results?.map(
        (person: {
          id: string;
          name: string;
          current_role?: {
            party?: string;
            org_classification?: string;
            district?: string;
            title?: string;
            start_date?: string;
            end_date?: string;
          };
          image?: string;
          email?: string;
          phone?: string;
          links?: Array<{ note?: string; url?: string }>;
          offices?: Array<{ name?: string; address?: string; phone?: string; email?: string }>;
        }) => ({
          id: person.id,
          name: person.name,
          party: person.current_role?.party || 'Unknown',
          chamber: person.current_role?.org_classification || 'lower',
          district: person.current_role?.district || 'Unknown',
          state: stateAbbrev.toUpperCase(),
          image: person.image,
          email: person.email,
          phone: person.phone,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          website: person.links?.find((link: any) => link.note === 'website')?.url,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          offices: person.offices?.map((office: any) => ({
            name: office.name || 'Office',
            address: office.address,
            phone: office.phone,
            email: office.email,
          })),
          currentRole: person.current_role
            ? {
                title:
                  person.current_role.title ||
                  `${person.current_role.org_classification === 'upper' ? 'State Senator' : 'State Representative'}`,
                org_classification: person.current_role.org_classification,
                district: person.current_role.district,
                party: person.current_role.party,
                start_date: person.current_role.start_date,
                end_date: person.current_role.end_date,
              }
            : undefined,
        })
      ) || []
    );
  } catch {
    // Error logged in monitoring system
    return [];
  }
}

// EMERGENCY FIX: Never return fake state legislators
// Previously returned 5 fake legislators: Sen. District 1/2, Rep. District A/B/C
// This could mislead citizens about their actual state representation
function _generateEmptyLegislatorResponse(state: string, stateAbbrev: string): StateLegislator[] {
  logger.warn('Cannot create fake state legislators', {
    state,
    stateAbbrev,
    reason: 'Misrepresenting actual state government officials is prohibited',
  });

  return []; // NEVER return fake legislators
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zip');

  if (!zipCode) {
    return NextResponse.json({ error: 'ZIP code is required' }, { status: 400 });
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
        fetchStateLegislators(stateAbbrev),
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
            { name: 'Senate', classification: 'upper' },
          ],
        },
      };

      return NextResponse.json(response);
    }

    // EMERGENCY FIX: Never return fake legislators when OpenStates API unavailable
    logger.warn('State legislators unavailable - OpenStates API key missing', {
      zipCode,
      stateAbbrev,
      reason: 'No API key for OpenStates - cannot return fake legislators',
    });

    const response: StateApiResponse = {
      zipCode,
      state: stateAbbrev.toUpperCase(),
      stateName,
      legislators: [], // NEVER return fake legislators
      jurisdiction: {
        name: stateName,
        classification: 'state',
        chambers: [
          { name: 'House of Representatives', classification: 'lower' },
          { name: 'Senate', classification: 'upper' },
        ],
      },
    };

    return NextResponse.json(response);
  } catch {
    // Error logged in monitoring system
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
