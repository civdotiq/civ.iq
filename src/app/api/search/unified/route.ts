/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Search API
 *
 * Searches across representatives, bills, committees, and state legislators.
 * Returns grouped results for autocomplete/typeahead UI.
 *
 * State-level search: Prefix query with state code or name
 * @example GET /api/search/unified?q=CA pelosi     (state prefix)
 * @example GET /api/search/unified?q=michigan:sanders (state name with colon)
 * @example GET /api/search/unified?q=pelosi&limit=5   (federal only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import { COMMITTEE_INFO } from '@/lib/data/committee-names';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

// State code to name mapping
const STATE_CODES: Record<string, string> = {
  AL: 'alabama',
  AK: 'alaska',
  AZ: 'arizona',
  AR: 'arkansas',
  CA: 'california',
  CO: 'colorado',
  CT: 'connecticut',
  DE: 'delaware',
  FL: 'florida',
  GA: 'georgia',
  HI: 'hawaii',
  ID: 'idaho',
  IL: 'illinois',
  IN: 'indiana',
  IA: 'iowa',
  KS: 'kansas',
  KY: 'kentucky',
  LA: 'louisiana',
  ME: 'maine',
  MD: 'maryland',
  MA: 'massachusetts',
  MI: 'michigan',
  MN: 'minnesota',
  MS: 'mississippi',
  MO: 'missouri',
  MT: 'montana',
  NE: 'nebraska',
  NV: 'nevada',
  NH: 'new hampshire',
  NJ: 'new jersey',
  NM: 'new mexico',
  NY: 'new york',
  NC: 'north carolina',
  ND: 'north dakota',
  OH: 'ohio',
  OK: 'oklahoma',
  OR: 'oregon',
  PA: 'pennsylvania',
  RI: 'rhode island',
  SC: 'south carolina',
  SD: 'south dakota',
  TN: 'tennessee',
  TX: 'texas',
  UT: 'utah',
  VT: 'vermont',
  VA: 'virginia',
  WA: 'washington',
  WV: 'west virginia',
  WI: 'wisconsin',
  WY: 'wyoming',
  DC: 'district of columbia',
};

// Reverse mapping: state name to code
const STATE_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_CODES).map(([code, name]) => [name, code])
);

interface Representative {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  district?: string;
}

interface StateLegislator {
  id: string;
  name: string;
  party: string;
  state: string;
  chamber: string;
  district: string;
  photo_url?: string;
}

interface Bill {
  number: string;
  title: string;
  type: string;
  congress: number;
  status?: string;
}

interface Committee {
  id: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
  type?: string;
}

interface UnifiedSearchResult {
  representatives: Representative[];
  stateLegislators: StateLegislator[];
  bills: Bill[];
  committees: Committee[];
  query: string;
  stateFilter?: string;
  totalResults: number;
}

/**
 * Parse state prefix from query
 * Supports: "CA pelosi", "CA:pelosi", "california pelosi", "california:pelosi"
 */
function parseStatePrefix(query: string): { stateCode: string | null; searchQuery: string } {
  const trimmed = query.trim();

  // Check for colon separator first (e.g., "CA:pelosi" or "michigan:sanders")
  if (trimmed.includes(':')) {
    const [prefix, ...rest] = trimmed.split(':');
    const potentialState = prefix?.trim().toUpperCase();
    const searchQuery = rest.join(':').trim();

    if (potentialState && potentialState.length === 2 && STATE_CODES[potentialState]) {
      return { stateCode: potentialState, searchQuery };
    }

    // Try state name
    const stateName = prefix?.trim().toLowerCase();
    if (stateName && STATE_NAMES[stateName]) {
      return { stateCode: STATE_NAMES[stateName], searchQuery };
    }
  }

  // Check for space separator with state code first (e.g., "CA pelosi")
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const firstPart = parts[0]?.toUpperCase();
    if (firstPart && firstPart.length === 2 && STATE_CODES[firstPart]) {
      return { stateCode: firstPart, searchQuery: parts.slice(1).join(' ') };
    }

    // Check for state name (could be multi-word like "new york")
    for (let i = 1; i <= Math.min(3, parts.length - 1); i++) {
      const potentialStateName = parts.slice(0, i).join(' ').toLowerCase();
      if (STATE_NAMES[potentialStateName]) {
        return {
          stateCode: STATE_NAMES[potentialStateName],
          searchQuery: parts.slice(i).join(' '),
        };
      }
    }
  }

  return { stateCode: null, searchQuery: trimmed };
}

/**
 * Search representatives directly using the congress service
 */
async function searchRepresentatives(query: string, limit: number): Promise<Representative[]> {
  try {
    const allReps = await getAllEnhancedRepresentatives();
    const q = query.toLowerCase();

    // Common nickname mappings for flexible name matching
    const nicknameMap: Record<string, string[]> = {
      bernard: ['bernie'],
      bernie: ['bernard'],
      william: ['bill', 'billy'],
      bill: ['william'],
      robert: ['bob', 'bobby'],
      bob: ['robert'],
      richard: ['rick', 'dick'],
      rick: ['richard'],
      elizabeth: ['liz', 'beth'],
      liz: ['elizabeth'],
      charles: ['chuck', 'charlie'],
      chuck: ['charles'],
      thomas: ['tom', 'tommy'],
      tom: ['thomas'],
      michael: ['mike'],
      mike: ['michael'],
      joseph: ['joe'],
      joe: ['joseph'],
      alexandra: ['alex'],
      alex: ['alexandra', 'alexander'],
      nancy: ['nan'],
    };

    const nameMatches = (searchWord: string, repName: string): boolean => {
      const searchLower = searchWord.toLowerCase();
      const nameLower = repName.toLowerCase();
      if (nameLower.includes(searchLower)) return true;

      for (const [formal, nicknames] of Object.entries(nicknameMap)) {
        if (searchLower === formal && nameLower.includes(formal)) return true;
        if (nicknames.includes(searchLower) && nameLower.includes(formal)) return true;
        if (searchLower === formal && nicknames.some(nick => nameLower.includes(nick))) return true;
      }
      return false;
    };

    const filtered = allReps.filter(rep => {
      const searchText = [rep.state, rep.party, rep.district]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const searchWords = q.split(' ').filter(word => word.length > 0);

      return searchWords.every(word => {
        if (rep.name && nameMatches(word, rep.name)) return true;
        return searchText.includes(word.toLowerCase());
      });
    });

    return filtered.slice(0, limit).map(rep => {
      const nameParts = rep.name.split(' ');
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      return {
        bioguideId: rep.bioguideId,
        name: rep.name,
        firstName,
        lastName,
        party: rep.party || 'Unknown',
        state: rep.state,
        chamber: rep.chamber as 'House' | 'Senate',
        district: rep.district,
      };
    });
  } catch (error) {
    logger.error('Error searching representatives', error as Error);
    return [];
  }
}

/**
 * Search state legislators using OpenStates (cached for 30 days)
 */
async function searchStateLegislators(
  stateCode: string,
  query: string,
  limit: number
): Promise<StateLegislator[]> {
  try {
    const legislators = await StateLegislatureCoreService.getStateLegislatorsSummary(stateCode);

    if (!legislators || legislators.length === 0) {
      return [];
    }

    const q = query.toLowerCase();

    const filtered = legislators.filter(leg => {
      const searchText = [leg.name, leg.party, leg.district, leg.chamber]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(q) || leg.name.toLowerCase().includes(q);
    });

    return filtered.slice(0, limit).map(leg => ({
      id: leg.id,
      name: leg.name,
      party: leg.party,
      state: leg.state,
      chamber: leg.chamber,
      district: leg.district,
      photo_url: leg.photo_url,
    }));
  } catch (error) {
    logger.error('Error searching state legislators', error as Error, { stateCode, query });
    return [];
  }
}

/**
 * Search bills directly from Congress.gov API
 */
async function searchBills(query: string, limit: number): Promise<Bill[]> {
  const cacheKey = `bills-search-${query}-${limit}`;

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        if (!process.env.CONGRESS_API_KEY) {
          logger.warn('Congress API key not available for bill search');
          return [];
        }

        const congress = process.env.CURRENT_CONGRESS || '119';
        const response = await fetch(
          `https://api.congress.gov/v3/bill/${congress}?api_key=${process.env.CONGRESS_API_KEY}&limit=100&sort=updateDate+desc`,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
            },
          }
        );

        if (!response.ok) {
          logger.error('Congress.gov bills API failed', new Error(`HTTP ${response.status}`));
          return [];
        }

        const data = await response.json();
        const bills: Bill[] = (data.bills ?? []).map(
          (bill: { number: string; title: string; type: string; congress: number }) => ({
            number: `${bill.type}${bill.number}`,
            title: bill.title,
            type: bill.type,
            congress: bill.congress,
          })
        );

        const q = query.toLowerCase();
        return bills
          .filter(
            bill => bill.number.toLowerCase().includes(q) || bill.title.toLowerCase().includes(q)
          )
          .slice(0, limit);
      } catch (error) {
        logger.error('Error searching bills', error as Error);
        return [];
      }
    },
    5 * 60 * 1000 // 5 minute cache
  );
}

/**
 * Search committees using static data
 */
function searchCommittees(query: string, limit: number): Committee[] {
  const q = query.toLowerCase();

  const committees: Committee[] = Object.entries(COMMITTEE_INFO).map(([id, info]) => ({
    id,
    name: info.name,
    chamber: (info.chamber === 'house'
      ? 'House'
      : info.chamber === 'senate'
        ? 'Senate'
        : 'Joint') as 'House' | 'Senate' | 'Joint',
    type: info.type,
  }));

  return committees
    .filter(
      committee =>
        committee.name.toLowerCase().includes(q) || committee.id.toLowerCase().includes(q)
    )
    .slice(0, limit);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') ?? '';
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 10) : 5;

  if (!query || query.length < 2) {
    return NextResponse.json({
      representatives: [],
      stateLegislators: [],
      bills: [],
      committees: [],
      query,
      totalResults: 0,
    });
  }

  // Parse state prefix from query
  const { stateCode, searchQuery } = parseStatePrefix(query);

  // If state prefix detected but no search query, return empty
  if (stateCode && !searchQuery) {
    return NextResponse.json({
      representatives: [],
      stateLegislators: [],
      bills: [],
      committees: [],
      query,
      stateFilter: stateCode,
      totalResults: 0,
    });
  }

  // Determine what to search based on state prefix
  const effectiveQuery = stateCode ? searchQuery : query;

  // Build parallel search promises
  const searchPromises: Promise<unknown>[] = [
    searchRepresentatives(effectiveQuery, limit),
    searchBills(effectiveQuery, limit),
  ];

  // Add state legislator search if state prefix provided
  if (stateCode) {
    searchPromises.push(searchStateLegislators(stateCode, effectiveQuery, limit));
  }

  const results = await Promise.all(searchPromises);

  const representatives = results[0] as Representative[];
  const bills = results[1] as Bill[];
  const stateLegislators = stateCode ? (results[2] as StateLegislator[]) : [];

  // Committees search is synchronous (static data)
  const committees = searchCommittees(effectiveQuery, limit);

  const result: UnifiedSearchResult = {
    representatives,
    stateLegislators,
    bills,
    committees,
    query,
    ...(stateCode && { stateFilter: stateCode }),
    totalResults:
      representatives.length + stateLegislators.length + bills.length + committees.length,
  };

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
