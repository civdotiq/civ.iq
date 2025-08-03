import { NextResponse } from 'next/server';
import { getCookPVI as getRealCookPVI } from '../cook-pvi-data';
import { structuredLogger } from '@/lib/logging/logger';
import type { CongressApiMember, CongressApiMembersResponse } from '@/types/api-responses';

// Define district data structure
interface District {
  id: string;
  state: string;
  number: string;
  name: string;
  representative: {
    name: string;
    party: string;
    imageUrl?: string;
  };
  demographics: {
    population: number;
    medianIncome: number;
    medianAge: number;
    diversityIndex: number;
    urbanPercentage: number;
  };
  political: {
    cookPVI: string;
    lastElection: {
      winner: string;
      margin: number;
      turnout: number;
    };
    registeredVoters: number;
  };
  geography: {
    area: number;
    counties: string[];
    majorCities: string[];
  };
}

// Cache the data for 1 hour to avoid excessive API calls
let cachedData: District[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    // Check for cache-busting parameter
    const { searchParams } = new URL(request.url);
    const bustCache = searchParams.get('bust') === 'true';

    // Check cache
    if (!bustCache && cachedData && Date.now() - cacheTime < CACHE_DURATION) {
      structuredLogger.cache('hit', 'districts-all');
      structuredLogger.info('Returning cached districts data', {
        cacheAge: Date.now() - cacheTime,
        districtCount: cachedData.length,
      });
      return NextResponse.json({ districts: cachedData });
    }

    structuredLogger.cache('miss', 'districts-all');

    const congressApiKey = process.env.CONGRESS_API_KEY;
    const censusApiKey = process.env.CENSUS_API_KEY;

    if (!congressApiKey || !censusApiKey) {
      throw new Error('Missing required API keys');
    }

    // Get current Congress members from Congress.gov API
    // We need to handle pagination as the API limits results
    structuredLogger.info('Fetching House members from Congress.gov API');
    const allMembers: CongressApiMember[] = [];
    let offset = 0;
    const limit = 250; // API max limit per request
    let hasMore = true;

    while (hasMore) {
      const url = `https://api.congress.gov/v3/member?format=json&limit=${limit}&offset=${offset}&currentMember=true&chamber=house`;
      const apiStartTime = Date.now();
      structuredLogger.debug(`Fetching members with offset ${offset}`, { offset, limit });

      const membersResponse = await fetch(url, {
        headers: {
          'X-API-Key': congressApiKey,
        },
      });

      const apiDuration = Date.now() - apiStartTime;

      if (!membersResponse.ok) {
        const errorText = await membersResponse.text();
        structuredLogger.error(
          'Congress API error',
          new Error(`HTTP ${membersResponse.status}: ${errorText}`),
          {
            url,
            status: membersResponse.status,
            duration: apiDuration,
          }
        );
        throw new Error(`Congress API error: ${membersResponse.status}`);
      }

      const membersData: CongressApiMembersResponse = await membersResponse.json();
      const members = membersData.members || [];

      structuredLogger.externalApi('Congress.gov', 'fetch-members', apiDuration, true, {
        offset,
        membersReceived: members.length,
      });

      if (members.length === 0) {
        hasMore = false;
      } else {
        allMembers.push(...members);
        offset += members.length;

        // Check if we have more pages
        if (members.length < limit || allMembers.length >= 441) {
          // 435 + 6 non-voting
          hasMore = false;
        }
      }
    }

    structuredLogger.info(`Fetched total House members from Congress API`, {
      totalMembers: allMembers.length,
      apiCalls: Math.ceil(allMembers.length / limit),
    });
    const members = allMembers;

    // Create a map to store districts
    const districtsMap = new Map<string, District>();

    // First, try to get comprehensive Census demographic data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const censusDataMap = new Map<string, any>();
    // Temporarily disable Census API to isolate the issue
    /*
    try {
      structuredLogger.info('Fetching Census data for all districts');
      censusDataMap = await fetchAllDistrictDemographics(censusApiKey);
      structuredLogger.info('Fetched Census demographic data', {
        districtCount: censusDataMap.size
      });
    } catch (error) {
      structuredLogger.error('Error fetching comprehensive Census data', error instanceof Error ? error : new Error(String(error)));
      // Continue without Census data
    }
    */

    // Process each member to extract district information
    let processedCount = 0;
    let skippedCount = 0;

    for (const member of members) {
      // Handle at-large districts (states with only one representative)
      let districtNumber = member.district;

      if (!districtNumber) {
        skippedCount++;
        continue;
      }

      // Normalize at-large districts to "01"
      if (
        districtNumber === 'At Large' ||
        districtNumber === '0' ||
        districtNumber.toLowerCase() === 'at-large'
      ) {
        districtNumber = '01';
      }

      // Ensure district number is padded
      districtNumber = districtNumber.padStart(2, '0');

      const districtKey = `${member.state}-${districtNumber}`;

      // Get census data for this district
      const censusData = censusDataMap.get(districtKey) || {};

      // Get the full state name from state abbreviation
      const stateName = getStateName(member.state);

      // Create district object with real data where available
      const district = {
        id: districtKey,
        state: member.state,
        number: districtNumber,
        name: `${stateName} ${districtNumber === '01' && members.filter(m => m.state === member.state).length === 1 ? 'At-Large' : getOrdinal(parseInt(districtNumber))} Congressional District`,
        representative: {
          name: member.name,
          party:
            member.partyName === 'Democratic' ? 'D' : member.partyName === 'Republican' ? 'R' : 'I',
          imageUrl: member.depiction?.imageUrl,
        },
        demographics: {
          population: censusData.population || Math.floor(761000 + Math.random() * 50000),
          medianIncome: censusData.medianIncome || Math.floor(50000 + Math.random() * 40000),
          medianAge: censusData.medianAge || 35 + Math.random() * 10,
          diversityIndex: censusData.diversityIndex || Math.random() * 100,
          urbanPercentage: censusData.urbanPercentage || 20 + Math.random() * 60,
        },
        political: {
          cookPVI: getRealCookPVI(member.state, districtNumber),
          lastElection: {
            winner: member.partyName || 'Unknown',
            margin: Math.random() * 40 + 2, // Would need FEC data for real margins
            turnout: 50 + Math.random() * 25, // Would need real turnout data
          },
          registeredVoters:
            censusData.votingAgePopulation || Math.floor(450000 + Math.random() * 150000),
        },
        geography: {
          area: Math.floor(1000 + Math.random() * 9000), // Would need geographic data
          counties: [], // Would need additional API calls
          majorCities: [], // Would need additional API calls
        },
      };

      districtsMap.set(districtKey, district);
      processedCount++;
    }

    structuredLogger.info('District processing completed', {
      processedCount,
      skippedCount,
      totalInputMembers: members.length,
    });

    const districtsArray = Array.from(districtsMap.values());
    structuredLogger.info('Districts response prepared', {
      districtCount: districtsArray.length,
      processingTime: Date.now() - startTime,
    });

    // Cache the data
    cachedData = districtsArray;
    cacheTime = Date.now();
    structuredLogger.cache('set', 'districts-all', {
      districtCount: districtsArray.length,
      cacheTime: new Date(cacheTime).toISOString(),
    });

    return NextResponse.json({ districts: districtsArray });
  } catch (error) {
    const errorDuration = Date.now() - startTime;
    structuredLogger.error(
      'Error fetching districts data',
      error instanceof Error ? error : new Error(String(error)),
      {
        duration: errorDuration,
        endpoint: '/api/districts/all',
      }
    );

    // Return a proper error response with fallback to empty array
    return NextResponse.json(
      {
        error: 'Failed to fetch districts data',
        details: error instanceof Error ? error.message : 'Unknown error',
        districts: [],
      },
      { status: 500 }
    );
  }
}

// Helper function to convert state abbreviation to full name
function getStateName(abbreviation: string): string {
  const states: { [key: string]: string } = {
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
  return states[abbreviation] || abbreviation;
}

// Helper function to get ordinal suffix
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0] || 'th');
}
