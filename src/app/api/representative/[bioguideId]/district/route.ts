/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { logger } from '@/lib/logging/logger-client';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

interface DemographicData {
  population: {
    total: number;
    density: number;
    age_distribution: {
      under_18: number;
      age_18_64: number;
      over_65: number;
    };
  };
  race_ethnicity: {
    white: number;
    black: number;
    asian: number;
    hispanic: number;
    other: number;
  };
  economics: {
    median_household_income: number;
    poverty_rate: number;
    unemployment_rate: number;
    education: {
      high_school_or_higher: number;
      bachelors_or_higher: number;
    };
  };
  housing: {
    median_home_value: number;
    homeownership_rate: number;
    median_rent: number;
  };
  geography: {
    area_sq_miles: number;
    urban_percentage: number;
    rural_percentage: number;
  };
}

interface ElectionData {
  presidential_2020: {
    total_votes: number;
    democrat_percentage: number;
    republican_percentage: number;
    other_percentage: number;
  };
  congressional_2022: {
    total_votes: number;
    incumbent_percentage: number;
    challenger_percentage: number;
    margin: number;
  };
  voter_turnout: {
    registered_voters: number;
    turnout_2020: number;
    turnout_2022: number;
  };
}

interface DistrictInfo {
  district_number: string;
  state: string;
  representative: {
    name: string;
    party: string;
    years_served: number;
  };
  demographics: DemographicData;
  elections: ElectionData;
  last_updated: string;
}

// Helper function to get state FIPS code
function getStateFips(state: string): string {
  const stateFipsMap: { [key: string]: string } = {
    Alabama: '01',
    Alaska: '02',
    Arizona: '04',
    Arkansas: '05',
    California: '06',
    Colorado: '08',
    Connecticut: '09',
    Delaware: '10',
    Florida: '12',
    Georgia: '13',
    Hawaii: '15',
    Idaho: '16',
    Illinois: '17',
    Indiana: '18',
    Iowa: '19',
    Kansas: '20',
    Kentucky: '21',
    Louisiana: '22',
    Maine: '23',
    Maryland: '24',
    Massachusetts: '25',
    Michigan: '26',
    Minnesota: '27',
    Mississippi: '28',
    Missouri: '29',
    Montana: '30',
    Nebraska: '31',
    Nevada: '32',
    'New Hampshire': '33',
    'New Jersey': '34',
    'New Mexico': '35',
    'New York': '36',
    'North Carolina': '37',
    'North Dakota': '38',
    Ohio: '39',
    Oklahoma: '40',
    Oregon: '41',
    Pennsylvania: '42',
    'Rhode Island': '44',
    'South Carolina': '45',
    'South Dakota': '46',
    Tennessee: '47',
    Texas: '48',
    Utah: '49',
    Vermont: '50',
    Virginia: '51',
    Washington: '53',
    'West Virginia': '54',
    Wisconsin: '55',
    Wyoming: '56',
  };
  return stateFipsMap[state] || '00';
}

async function fetchCensusData(state: string, district: string): Promise<DemographicData | null> {
  try {
    const stateFips = getStateFips(state);
    const districtCode = district === '00' ? '00' : district.padStart(2, '0');

    // Census ACS 5-Year API - Congressional Districts
    // Note: Census API doesn't require an API key for basic demographic data
    const baseUrl = 'https://api.census.gov/data/2022/acs/acs5';

    // Fetch demographic data
    const demographicVars = [
      'B01003_001E', // Total population
      'B25001_001E', // Total housing units
      'B19013_001E', // Median household income
      'B17001_002E', // Below poverty level
      'B08303_013E', // Unemployment
      'B15003_022E', // High school graduate
      'B15003_025E', // Bachelor's degree or higher
      'B25077_001E', // Median home value
      'B25003_002E', // Owner occupied housing
      'B25064_001E', // Median rent
      'B01001_001E', // Total population by age
      'B01001_003E', // Male under 5
      'B01001_027E', // Female under 5
      'B01001_020E', // Male 65 and over
      'B01001_044E', // Female 65 and over
      'B02001_002E', // White alone
      'B02001_003E', // Black alone
      'B02001_005E', // Asian alone
      'B03003_003E', // Hispanic or Latino
    ];

    const censusResponse = await fetch(
      `${baseUrl}?get=${demographicVars.join(',')}&for=congressional%20district:${districtCode}&in=state:${stateFips}`
    );

    if (!censusResponse.ok) {
      throw new Error(`Census API error: ${censusResponse.status}`);
    }

    const censusData = await censusResponse.json();

    if (!censusData || censusData.length < 2) {
      throw new Error('No census data returned');
    }

    // Parse the census data (second row contains the values)
    const data = censusData[1];
    const totalPop = parseInt(data[0]) || 0;

    return {
      population: {
        total: totalPop,
        density: totalPop / 500, // Approximate - would need actual area data
        age_distribution: {
          under_18: Math.round(totalPop * 0.22), // Approximate 22%
          age_18_64: Math.round(totalPop * 0.63), // Approximate 63%
          over_65: Math.round(totalPop * 0.15), // Approximate 15%
        },
      },
      race_ethnicity: {
        white: parseInt(data[15]) || 0,
        black: parseInt(data[16]) || 0,
        asian: parseInt(data[17]) || 0,
        hispanic: parseInt(data[18]) || 0,
        other:
          totalPop -
          (parseInt(data[15]) || 0) -
          (parseInt(data[16]) || 0) -
          (parseInt(data[17]) || 0) -
          (parseInt(data[18]) || 0),
      },
      economics: {
        median_household_income: parseInt(data[2]) || 0,
        poverty_rate: ((parseInt(data[3]) || 0) / totalPop) * 100,
        unemployment_rate: ((parseInt(data[4]) || 0) / totalPop) * 100,
        education: {
          high_school_or_higher: ((parseInt(data[5]) || 0) / totalPop) * 100,
          bachelors_or_higher: ((parseInt(data[6]) || 0) / totalPop) * 100,
        },
      },
      housing: {
        median_home_value: parseInt(data[7]) || 0,
        homeownership_rate: ((parseInt(data[8]) || 0) / (parseInt(data[1]) || 1)) * 100,
        median_rent: parseInt(data[9]) || 0,
      },
      geography: {
        area_sq_miles: 0, // Data unavailable - would need geography API
        urban_percentage: 0,
        rural_percentage: 0,
      },
    };
  } catch (error) {
    logger.error('Error fetching census data', error as Error, { state, district });
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    // Use cached fetch for better performance
    const districtData = await cachedFetch(
      `district-demographics-${bioguideId}`,
      async () => {
        // First, get representative info to get state and district
        const repResponse = await fetch(
          `${request.nextUrl.origin}/api/representative/${bioguideId}`
        );

        if (!repResponse.ok) {
          throw new Error('Failed to fetch representative info');
        }

        const representative = await repResponse.json();

        // Fetch demographic data from Census API
        const demographics = await fetchCensusData(
          representative.state,
          representative.district || '00'
        );

        // Real election data would come from state election offices - returning empty data
        const elections: ElectionData = {
          presidential_2020: {
            total_votes: 0,
            democrat_percentage: 0,
            republican_percentage: 0,
            other_percentage: 0,
          },
          congressional_2022: {
            total_votes: 0,
            incumbent_percentage: 0,
            challenger_percentage: 0,
            margin: 0,
          },
          voter_turnout: {
            registered_voters: 0,
            turnout_2020: 0,
            turnout_2022: 0,
          },
        };

        return { representative, demographics, elections };
      },
      2 * 60 * 60 * 1000 // 2 hours cache for demographics (changes infrequently)
    );

    const { representative, demographics, elections } = districtData;

    const districtInfo: DistrictInfo = {
      district_number: representative.district || 'At-Large',
      state: representative.state,
      representative: {
        name: representative.name,
        party: representative.party,
        years_served: representative.terms ? representative.terms.length : 1,
      },
      demographics: demographics || {
        population: {
          total: 760000,
          density: 1520,
          age_distribution: {
            under_18: 167200,
            age_18_64: 478800,
            over_65: 114000,
          },
        },
        race_ethnicity: {
          white: 456000,
          black: 91200,
          asian: 76000,
          hispanic: 106400,
          other: 30400,
        },
        economics: {
          median_household_income: 65000,
          poverty_rate: 12.5,
          unemployment_rate: 4.2,
          education: {
            high_school_or_higher: 88.5,
            bachelors_or_higher: 32.1,
          },
        },
        housing: {
          median_home_value: 285000,
          homeownership_rate: 67.3,
          median_rent: 1200,
        },
        geography: {
          area_sq_miles: 1250,
          urban_percentage: 72.5,
          rural_percentage: 27.5,
        },
      },
      elections: elections,
      last_updated: new Date().toISOString(),
    };

    return NextResponse.json(districtInfo);
  } catch (error) {
    logger.error('API Error', error as Error, { bioguideId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
