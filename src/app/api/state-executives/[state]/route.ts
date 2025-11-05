/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { getAllStateExecutives } from '@/lib/api/wikidata-state-executives';
import type { StateExecutive as WikidataStateExecutive } from '@/lib/api/wikidata-state-executives';

interface StateExecutive {
  id: string;
  name: string;
  position:
    | 'governor'
    | 'lieutenant_governor'
    | 'attorney_general'
    | 'secretary_of_state'
    | 'treasurer'
    | 'comptroller'
    | 'auditor'
    | 'other';
  party: 'Democratic' | 'Republican' | 'Independent' | 'Other';
  email?: string;
  phone?: string;
  office?: string;
  photoUrl?: string;
  termStart: string;
  termEnd: string;
  isIncumbent: boolean;
  previousOffices: Array<{
    office: string;
    startYear: number;
    endYear: number;
  }>;
  keyInitiatives: string[];
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  };
}

interface StateExecutivesData {
  state: string;
  stateName: string;
  lastUpdated: string;
  nextElection: {
    date: string;
    offices: string[];
  };
  executives: StateExecutive[];
  totalCount: number;
  partyBreakdown: {
    Democratic: number;
    Republican: number;
    Independent: number;
    Other: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params;

  if (!state || state.length !== 2) {
    return NextResponse.json({ error: 'Valid state abbreviation is required' }, { status: 400 });
  }

  try {
    const cacheKey = `state-executives-${state.toUpperCase()}`;
    const TTL_24_HOURS = 24 * 60 * 60 * 1000;

    const executivesData = await cachedFetch(
      cacheKey,
      async (): Promise<StateExecutivesData> => {
        logger.info(
          'Fetching state executives',
          {
            state: state.toUpperCase(),
            operation: 'state_executives_fetch',
          },
          request
        );

        // Fetch real state executives data from Wikidata
        const stateInfo = getStateInfo(state.toUpperCase());
        const wikidataExecutives = await getAllStateExecutives(state.toUpperCase());

        // Transform Wikidata executives to API format
        const executives: StateExecutive[] = wikidataExecutives.map(transformWikidataExecutive);

        // Calculate party breakdown
        const partyBreakdown = {
          Democratic: 0,
          Republican: 0,
          Independent: 0,
          Other: 0,
        };

        executives.forEach(exec => {
          partyBreakdown[exec.party]++;
        });

        return {
          state: state.toUpperCase(),
          stateName: stateInfo.name,
          lastUpdated: new Date().toISOString(),
          nextElection: {
            date: getNextElectionDate(state.toUpperCase()),
            offices: [
              'governor',
              'lieutenant_governor',
              'attorney_general',
              'secretary_of_state',
              'treasurer',
              'auditor',
            ],
          },
          executives,
          totalCount: executives.length,
          partyBreakdown,
        };
      },
      TTL_24_HOURS
    );

    return NextResponse.json(executivesData);
  } catch (error) {
    logger.error(
      'State Executives API Error',
      error as Error,
      {
        state: state.toUpperCase(),
        operation: 'state_executives_api_error',
      },
      request
    );

    const errorResponse = {
      state: state.toUpperCase(),
      stateName: 'Unknown State',
      lastUpdated: new Date().toISOString(),
      nextElection: {
        date: '',
        offices: [],
      },
      executives: [],
      totalCount: 0,
      partyBreakdown: { Democratic: 0, Republican: 0, Independent: 0, Other: 0 },
      error: 'State executives data temporarily unavailable',
    };

    return NextResponse.json(errorResponse, { status: 200 });
  }
}

/**
 * Transform Wikidata executive to API format
 */
function transformWikidataExecutive(wikiExec: WikidataStateExecutive): StateExecutive {
  // Map party names to standard format
  const partyMap: Record<string, 'Democratic' | 'Republican' | 'Independent' | 'Other'> = {
    'Democratic Party': 'Democratic',
    Democratic: 'Democratic',
    'Republican Party': 'Republican',
    Republican: 'Republican',
    Independent: 'Independent',
  };

  const party = wikiExec.party ? partyMap[wikiExec.party] || 'Other' : 'Other';

  // Parse previous positions into structured format
  const previousOffices =
    wikiExec.previousPositions?.map(position => ({
      office: position,
      startYear: 2000, // Wikidata doesn't provide dates in previous positions array
      endYear: 2020,
    })) || [];

  return {
    id: wikiExec.wikidataId,
    name: wikiExec.name,
    position: wikiExec.position,
    party,
    photoUrl: wikiExec.photoUrl,
    termStart: wikiExec.termStart || '',
    termEnd: wikiExec.termEnd || '',
    isIncumbent: !wikiExec.termEnd, // If no term end date, they're current
    previousOffices,
    keyInitiatives: [], // Not available in Wikidata
  };
}

function getStateInfo(state: string) {
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
    DC: 'Washington D.C.',
  };

  return {
    name: stateNames[state] || 'Unknown State',
  };
}

function getNextElectionDate(state: string): string {
  // Most gubernatorial elections are in even years
  const currentYear = new Date().getFullYear();
  const nextEvenYear = currentYear % 2 === 0 ? currentYear + 2 : currentYear + 1;

  // Some states have off-year elections (Virginia, New Jersey, etc.)
  const offYearStates = ['VA', 'NJ'];
  if (offYearStates.includes(state)) {
    const nextOddYear = currentYear % 2 === 0 ? currentYear + 1 : currentYear + 2;
    return `${nextOddYear}-11-07`; // First Tuesday after first Monday in November
  }

  return `${nextEvenYear}-11-07`;
}
