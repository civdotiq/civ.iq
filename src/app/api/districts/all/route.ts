import { NextRequest, NextResponse } from 'next/server';
import { getCookPVI as getRealCookPVI } from '../cook-pvi-data';

export const dynamic = 'force-dynamic';
export const maxDuration = 15; // Can take ~9s for full district data load
import { fetchAllDistrictDemographics } from '../census-helpers';
import { govCache } from '@/services/cache';
import logger from '@/lib/logging/simple-logger';
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

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check for cache-busting parameter
    const { searchParams } = request.nextUrl;
    const bustCache = searchParams.get('bust') === 'true';

    const cacheKey = 'districts:all';

    // Check unified cache first
    if (!bustCache) {
      const cachedDistricts = await govCache.get<District[]>(cacheKey);
      if (cachedDistricts) {
        logger.info('Cache hit for districts-all', {
          districtCount: cachedDistricts.length,
        });
        return NextResponse.json({ districts: cachedDistricts });
      }
    }

    logger.info('Cache miss for districts-all, fetching fresh data');

    // Add timing for actual performance measurement
    const totalProcessingStart = Date.now();

    const congressApiKey = process.env.CONGRESS_API_KEY;
    const censusApiKey = process.env.CENSUS_API_KEY;

    if (!congressApiKey || !censusApiKey) {
      throw new Error('Missing required API keys');
    }

    // Get current Congress members from Congress.gov API with optimized parallel batching
    // We know there are ~441 House members (435 voting + 6 non-voting)
    const congressApiStart = Date.now();
    logger.info('Fetching House members from Congress.gov API using parallel batching');

    const limit = 250; // API max limit per request
    const expectedMemberCount = 441; // 435 voting + 6 non-voting delegates
    const expectedBatches = Math.ceil(expectedMemberCount / limit); // Should be 2 batches

    // Create parallel fetch requests for known batches
    const batchPromises = Array.from({ length: expectedBatches }, (_, batchIndex) => {
      const offset = batchIndex * limit;
      const url = `https://api.congress.gov/v3/member?format=json&limit=${limit}&offset=${offset}&currentMember=true&chamber=house`;

      return fetch(url, {
        headers: {
          'X-API-Key': congressApiKey,
        },
      })
        .then(async response => {
          const apiDuration = Date.now() - congressApiStart;

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const membersData: CongressApiMembersResponse = await response.json();
          const members = membersData.members || [];

          logger.info('Congress.gov API batch completed', {
            operation: 'fetch-members-batch',
            duration: apiDuration,
            success: true,
            batchIndex,
            offset,
            membersReceived: members.length,
          });

          return members;
        })
        .catch(error => {
          logger.error('Congress API batch error', error as Error, {
            batchIndex,
            offset,
            url,
          });
          throw error;
        });
    });

    // Execute all batches in parallel and flatten results
    let allMembers: CongressApiMember[] = [];
    try {
      const batchResults = await Promise.all(batchPromises);
      allMembers = batchResults.flat();

      logger.info('All Congress.gov API batches completed', {
        batchCount: batchResults.length,
        totalMembers: allMembers.length,
        expectedMembers: expectedMemberCount,
      });
    } catch (error) {
      logger.error(
        'Failed to fetch some batches, falling back to sequential approach',
        error as Error
      );

      // Fallback to sequential approach if parallel fails
      let offset = 0;
      let hasMore = true;
      allMembers = [];

      while (hasMore && allMembers.length < expectedMemberCount) {
        const url = `https://api.congress.gov/v3/member?format=json&limit=${limit}&offset=${offset}&currentMember=true&chamber=house`;
        const response = await fetch(url, {
          headers: {
            'X-API-Key': congressApiKey,
          },
        });

        if (!response.ok) {
          throw new Error(`Congress API error: ${response.status}`);
        }

        const membersData: CongressApiMembersResponse = await response.json();
        const members = membersData.members || [];

        if (members.length === 0) {
          hasMore = false;
        } else {
          allMembers.push(...members);
          offset += members.length;
          if (members.length < limit) {
            hasMore = false;
          }
        }
      }
    }

    logger.info('Congress API fetch completed', {
      duration: Date.now() - congressApiStart,
      totalMembers: allMembers.length,
    });
    logger.info(`Fetched total House members from Congress API`, {
      totalMembers: allMembers.length,
      apiCalls: Math.ceil(allMembers.length / limit),
    });
    const members = allMembers;

    // Create a map to store districts
    const districtsMap = new Map<string, District>();

    // First, try to get comprehensive Census demographic data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let censusDataMap = new Map<string, any>();

    try {
      const censusApiStart = Date.now();
      logger.info('Fetching Census data for all districts');
      censusDataMap = await fetchAllDistrictDemographics(censusApiKey);
      logger.info('Census API fetch completed', {
        duration: Date.now() - censusApiStart,
        districtCount: censusDataMap.size,
      });
      logger.info('Fetched Census demographic data', {
        districtCount: censusDataMap.size,
      });
    } catch (error) {
      logger.error(
        'Error fetching comprehensive Census data',
        error instanceof Error ? error : new Error(String(error))
      );
      // Continue without Census data
    }

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

      // Convert to string to ensure string methods work
      districtNumber = String(districtNumber);

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

      // Convert full state name to abbreviation - DIRECT MAPPING
      const stateMapping: { [key: string]: string } = {
        Alabama: 'AL',
        Alaska: 'AK',
        Arizona: 'AZ',
        Arkansas: 'AR',
        California: 'CA',
        Colorado: 'CO',
        Connecticut: 'CT',
        Delaware: 'DE',
        Florida: 'FL',
        Georgia: 'GA',
        Hawaii: 'HI',
        Idaho: 'ID',
        Illinois: 'IL',
        Indiana: 'IN',
        Iowa: 'IA',
        Kansas: 'KS',
        Kentucky: 'KY',
        Louisiana: 'LA',
        Maine: 'ME',
        Maryland: 'MD',
        Massachusetts: 'MA',
        Michigan: 'MI',
        Minnesota: 'MN',
        Mississippi: 'MS',
        Missouri: 'MO',
        Montana: 'MT',
        Nebraska: 'NE',
        Nevada: 'NV',
        'New Hampshire': 'NH',
        'New Jersey': 'NJ',
        'New Mexico': 'NM',
        'New York': 'NY',
        'North Carolina': 'NC',
        'North Dakota': 'ND',
        Ohio: 'OH',
        Oklahoma: 'OK',
        Oregon: 'OR',
        Pennsylvania: 'PA',
        'Rhode Island': 'RI',
        'South Carolina': 'SC',
        'South Dakota': 'SD',
        Tennessee: 'TN',
        Texas: 'TX',
        Utah: 'UT',
        Vermont: 'VT',
        Virginia: 'VA',
        Washington: 'WA',
        'West Virginia': 'WV',
        Wisconsin: 'WI',
        Wyoming: 'WY',
      };

      const stateAbbr = stateMapping[member.state] || member.state;
      const districtKey = `${stateAbbr}-${districtNumber}`;

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
          population: censusData.population || 0,
          medianIncome: censusData.medianIncome || 0,
          medianAge: censusData.medianAge || 0,
          diversityIndex: censusData.diversityIndex || 0,
          urbanPercentage: censusData.urbanPercentage || 0,
        },
        political: {
          cookPVI: getRealCookPVI(member.state, districtNumber),
          lastElection: {
            winner: member.partyName || 'Unknown',
            margin: 0, // Data unavailable - would need FEC data
            turnout: 0, // Data unavailable - would need real turnout data
          },
          registeredVoters: censusData.votingAgePopulation || 0,
        },
        geography: {
          area: 0, // Data unavailable - would need geographic data
          counties: [], // Would need additional API calls
          majorCities: [], // Would need additional API calls
        },
      };

      districtsMap.set(districtKey, district);
      processedCount++;
    }

    logger.info('District processing completed', {
      processedCount,
      skippedCount,
      totalInputMembers: members.length,
    });

    const districtsArray = Array.from(districtsMap.values());
    logger.info('Total API processing completed', {
      duration: Date.now() - totalProcessingStart,
      districtCount: districtsArray.length,
    });
    logger.info('Districts response prepared', {
      districtCount: districtsArray.length,
      processingTime: Date.now() - startTime,
    });

    // Cache the data using unified cache service
    await govCache.set(cacheKey, districtsArray, {
      dataType: 'districts',
      source: 'congress-api-parallel',
    });
    logger.info('Cache set for districts-all using unified cache', {
      districtCount: districtsArray.length,
      cacheKey,
    });

    return NextResponse.json({ districts: districtsArray });
  } catch (error) {
    const errorDuration = Date.now() - startTime;
    logger.error(
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
