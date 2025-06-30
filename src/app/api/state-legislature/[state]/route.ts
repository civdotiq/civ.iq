import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';

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
    const TTL_60_MINUTES = 60 * 60 * 1000;

    const legislatureData = await cachedFetch(
      cacheKey,
      async (): Promise<StateLegislatureData> => {
        // In production, this would integrate with OpenStates.org API or state-specific APIs
        console.log(`Fetching state legislature data for: ${state.toUpperCase()}`);

        // Mock data generation based on state
        const stateInfo = getStateInfo(state.toUpperCase());
        
        // Generate mock legislators
        const legislators: StateLegislator[] = [];
        
        // Generate upper chamber legislators
        for (let i = 1; i <= stateInfo.chambers.upper.totalSeats; i++) {
          legislators.push(generateMockLegislator(
            state.toUpperCase(),
            'upper',
            i.toString(),
            stateInfo.chambers.upper.title
          ));
        }
        
        // Generate lower chamber legislators
        for (let i = 1; i <= stateInfo.chambers.lower.totalSeats; i++) {
          legislators.push(generateMockLegislator(
            state.toUpperCase(),
            'lower',
            i.toString(),
            stateInfo.chambers.lower.title
          ));
        }

        return {
          state: state.toUpperCase(),
          stateName: stateInfo.name,
          lastUpdated: new Date().toISOString(),
          session: {
            name: '2024 Regular Session',
            startDate: '2024-01-08',
            endDate: '2024-08-31',
            type: 'regular'
          },
          chambers: stateInfo.chambers,
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
    console.error('State Legislature API Error:', error);
    
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

function getStateInfo(state: string) {
  // State-specific chamber information
  const stateData: Record<string, any> = {
    'CA': {
      name: 'California',
      chambers: {
        upper: { name: 'State Senate', title: 'Senator', totalSeats: 40, democraticSeats: 32, republicanSeats: 8, otherSeats: 0 },
        lower: { name: 'State Assembly', title: 'Assembly Member', totalSeats: 80, democraticSeats: 62, republicanSeats: 18, otherSeats: 0 }
      }
    },
    'TX': {
      name: 'Texas',
      chambers: {
        upper: { name: 'State Senate', title: 'Senator', totalSeats: 31, democraticSeats: 12, republicanSeats: 19, otherSeats: 0 },
        lower: { name: 'House of Representatives', title: 'Representative', totalSeats: 150, democraticSeats: 64, republicanSeats: 86, otherSeats: 0 }
      }
    },
    'NY': {
      name: 'New York',
      chambers: {
        upper: { name: 'State Senate', title: 'Senator', totalSeats: 63, democraticSeats: 42, republicanSeats: 21, otherSeats: 0 },
        lower: { name: 'State Assembly', title: 'Assembly Member', totalSeats: 150, democraticSeats: 106, republicanSeats: 44, otherSeats: 0 }
      }
    },
    'FL': {
      name: 'Florida',
      chambers: {
        upper: { name: 'State Senate', title: 'Senator', totalSeats: 40, democraticSeats: 12, republicanSeats: 28, otherSeats: 0 },
        lower: { name: 'House of Representatives', title: 'Representative', totalSeats: 120, democraticSeats: 35, republicanSeats: 85, otherSeats: 0 }
      }
    },
    'MI': {
      name: 'Michigan',
      chambers: {
        upper: { name: 'State Senate', title: 'Senator', totalSeats: 38, democraticSeats: 20, republicanSeats: 18, otherSeats: 0 },
        lower: { name: 'House of Representatives', title: 'Representative', totalSeats: 110, democraticSeats: 56, republicanSeats: 54, otherSeats: 0 }
      }
    }
  };

  return stateData[state] || {
    name: 'Generic State',
    chambers: {
      upper: { name: 'State Senate', title: 'Senator', totalSeats: 40, democraticSeats: 20, republicanSeats: 20, otherSeats: 0 },
      lower: { name: 'House of Representatives', title: 'Representative', totalSeats: 100, democraticSeats: 50, republicanSeats: 50, otherSeats: 0 }
    }
  };
}

function generateMockLegislator(
  state: string,
  chamber: 'upper' | 'lower',
  district: string,
  title: string
): StateLegislator {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Maria', 'James', 'Jennifer'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${firstName} ${lastName}`;
  
  // Realistic party distribution based on state and chamber
  const parties: StateLegislator['party'][] = ['Democratic', 'Republican'];
  const party = parties[Math.floor(Math.random() * parties.length)];
  
  const committees = [
    'Appropriations', 'Education', 'Health', 'Transportation', 'Environment',
    'Judiciary', 'Public Safety', 'Labor', 'Agriculture', 'Veterans Affairs'
  ];
  
  const memberCommittees = committees
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.floor(Math.random() * 3) + 1)
    .map((committeeName, index) => ({
      name: committeeName,
      role: index === 0 && Math.random() > 0.8 ? 'chair' as const : 'member' as const
    }));

  return {
    id: `${state}-${chamber}-${district}`,
    name,
    party,
    chamber,
    district,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${state.toLowerCase()}legislature.gov`,
    phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
    office: `Room ${Math.floor(Math.random() * 500) + 100}, State Capitol`,
    committees: memberCommittees,
    terms: [{
      startYear: 2023,
      endYear: chamber === 'upper' ? 2027 : 2025, // Typical terms: Senate 4 years, House 2 years
      chamber
    }],
    bills: {
      sponsored: Math.floor(Math.random() * 20) + 1,
      cosponsored: Math.floor(Math.random() * 50) + 10
    },
    votingRecord: {
      totalVotes: Math.floor(Math.random() * 500) + 200,
      partyLineVotes: Math.floor(Math.random() * 400) + 150,
      crossoverVotes: Math.floor(Math.random() * 20) + 5
    }
  };
}