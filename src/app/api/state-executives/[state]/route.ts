/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

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

        // In production, this would integrate with official state sources
        const stateInfo = getStateInfo(state.toUpperCase());
        const executives: StateExecutive[] = []; // Real state executive API integration needed

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
            offices: ['governor', 'lieutenant_governor', 'attorney_general', 'secretary_of_state'],
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

function getStateInfo(state: string) {
  const stateNames: Record<string, string> = {
    CA: 'California',
    TX: 'Texas',
    NY: 'New York',
    FL: 'Florida',
    MI: 'Michigan',
    PA: 'Pennsylvania',
    IL: 'Illinois',
    OH: 'Ohio',
    GA: 'Georgia',
    NC: 'North Carolina',
    VA: 'Virginia',
    WA: 'Washington',
    MA: 'Massachusetts',
    MD: 'Maryland',
    CO: 'Colorado',
  };

  return {
    name: stateNames[state] || 'Generic State',
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
