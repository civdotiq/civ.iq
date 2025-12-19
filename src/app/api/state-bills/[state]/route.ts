/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';

export const runtime = 'edge';

// Bills can be cached - 24 hours for current session data
export const revalidate = 86400; // 24 hours

interface StateBill {
  id: string;
  billNumber: string;
  title: string;
  summary: string;
  chamber: 'upper' | 'lower';
  status:
    | 'introduced'
    | 'committee'
    | 'floor'
    | 'passed_chamber'
    | 'other_chamber'
    | 'passed_both'
    | 'signed'
    | 'vetoed'
    | 'dead';
  sponsor: {
    name: string;
    party: 'Democratic' | 'Republican' | 'Independent';
    district: string;
  };
  cosponsors: Array<{
    name: string;
    party: 'Democratic' | 'Republican' | 'Independent';
    district: string;
  }>;
  committee?: {
    name: string;
    chairman: string;
  };
  introducedDate: string;
  lastActionDate: string;
  lastAction: string;
  subjects: string[];
  votes?: Array<{
    chamber: 'upper' | 'lower';
    date: string;
    type: 'passage' | 'committee' | 'amendment';
    yesVotes: number;
    noVotes: number;
    absentVotes: number;
    result: 'pass' | 'fail';
  }>;
  fullTextUrl?: string;
  trackingCount: number; // How many users are tracking this bill
}

interface StateBillsResponse {
  state: string;
  stateName: string;
  session: string;
  bills: StateBill[];
  totalCount: number;
  lastUpdated: string;
  filters: {
    status?: string;
    chamber?: string;
    subject?: string;
    sponsor?: string;
  };
  summary: {
    byStatus: Record<string, number>;
    byChamber: Record<string, number>;
    byParty: Record<string, number>;
  };
}

// Helper function to get state abbreviation for OpenStates API
function getStateAbbreviation(state: string): string {
  const stateMap: { [key: string]: string } = {
    AL: 'al',
    AK: 'ak',
    AZ: 'az',
    AR: 'ar',
    CA: 'ca',
    CO: 'co',
    CT: 'ct',
    DE: 'de',
    FL: 'fl',
    GA: 'ga',
    HI: 'hi',
    ID: 'id',
    IL: 'il',
    IN: 'in',
    IA: 'ia',
    KS: 'ks',
    KY: 'ky',
    LA: 'la',
    ME: 'me',
    MD: 'md',
    MA: 'ma',
    MI: 'mi',
    MN: 'mn',
    MS: 'ms',
    MO: 'mo',
    MT: 'mt',
    NE: 'ne',
    NV: 'nv',
    NH: 'nh',
    NJ: 'nj',
    NM: 'nm',
    NY: 'ny',
    NC: 'nc',
    ND: 'nd',
    OH: 'oh',
    OK: 'ok',
    OR: 'or',
    PA: 'pa',
    RI: 'ri',
    SC: 'sc',
    SD: 'sd',
    TN: 'tn',
    TX: 'tx',
    UT: 'ut',
    VT: 'vt',
    VA: 'va',
    WA: 'wa',
    WV: 'wv',
    WI: 'wi',
    WY: 'wy',
  };

  return stateMap[state.toUpperCase()] || state.toLowerCase();
}

// Fetch bills from OpenStates API
async function fetchStateBills(
  stateAbbrev: string,
  options: {
    chamber?: string;
    subject?: string;
    session?: string;
    search?: string;
    perPage?: number;
    page?: number;
  } = {}
): Promise<StateBill[]> {
  const monitor = monitorExternalApi('openstates', 'bills', 'https://v3.openstates.org/bills');

  try {
    const url = new URL('https://v3.openstates.org/bills');
    url.searchParams.set('jurisdiction', stateAbbrev);
    // OpenStates bills API has a maximum of 20 items per page (different from people API)
    const perPage = Math.min(options.perPage || 20, 20);
    url.searchParams.set('per_page', perPage.toString());
    url.searchParams.set('page', (options.page || 1).toString());

    if (options.chamber) {
      url.searchParams.set('chamber', options.chamber);
    }

    if (options.subject) {
      url.searchParams.set('subject', options.subject);
    }

    if (options.session) {
      url.searchParams.set('session', options.session);
    }

    // Add full-text search support using OpenStates 'q' parameter
    if (options.search && options.search.trim().length > 0) {
      url.searchParams.set('q', options.search.trim());
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
      },
    });

    if (!response.ok) {
      monitor.end(false, response.status);
      logger.error('OpenStates bills API error', new Error(`HTTP ${response.status}`), {
        stateAbbrev,
        options,
        statusCode: response.status,
      });
      return [];
    }

    monitor.end(true, 200);
    const data = await response.json();

    logger.info('Successfully fetched state bills', {
      stateAbbrev,
      options,
      count: data.results?.length || 0,
      totalCount: data.meta?.total_count || 0,
    });

    return data.results?.map((bill: unknown) => transformBill(bill, stateAbbrev)) || [];
  } catch (error) {
    monitor.end(false, undefined, error as Error);
    logger.error('Error fetching state bills', error as Error, {
      stateAbbrev,
      options,
    });
    return [];
  }
}

// Transform OpenStates bill data to our format
function transformBill(bill: unknown, stateAbbrev: string): StateBill {
  const billData = bill as Record<string, unknown>;
  const sponsors = (billData.sponsorships as Record<string, unknown>[]) || [];
  const primarySponsor = sponsors.find(s => s.primary as boolean) || sponsors[0];

  // Map OpenStates bill status to our simplified status
  const mapStatus = (classification: string[], latestAction?: string): StateBill['status'] => {
    const action = latestAction?.toLowerCase() || '';

    if (action.includes('signed') || action.includes('enacted')) return 'signed';
    if (action.includes('vetoed')) return 'vetoed';
    if (action.includes('passed') && action.includes('both')) return 'passed_both';
    if (action.includes('passed')) return 'passed_chamber';
    if (action.includes('committee')) return 'committee';
    if (action.includes('floor')) return 'floor';
    if (action.includes('died') || action.includes('failed')) return 'dead';

    return 'introduced';
  };

  // Extract voting data from actions
  const actions = (billData.actions as Record<string, unknown>[]) || [];
  const votes: Array<{
    chamber: 'upper' | 'lower';
    date: string;
    type: 'passage' | 'committee' | 'amendment';
    yesVotes: number;
    noVotes: number;
    absentVotes: number;
    result: 'pass' | 'fail';
  }> = actions
    .filter(
      action =>
        (action.classification as string[])?.includes('passage') ||
        (action.classification as string[])?.includes('committee-passage')
    )
    .map(action => {
      const chamber = ((action.organization as Record<string, unknown>)?.chamber as string) || '';
      return {
        chamber: (chamber === 'upper' || chamber === 'lower' ? chamber : 'lower') as
          | 'upper'
          | 'lower',
        date: (action.date as string) || '',
        type: (action.classification as string[])?.includes('committee')
          ? ('committee' as const)
          : ('passage' as const),
        yesVotes: 0, // Would need to fetch actual vote data
        noVotes: 0,
        absentVotes: 0,
        result: (action.description as string)?.toLowerCase().includes('passed')
          ? ('pass' as const)
          : ('fail' as const),
      };
    });

  const fromOrganization = billData.from_organization as Record<string, unknown> | undefined;

  return {
    id: (billData.id as string) || `${stateAbbrev}-${billData.identifier as string}`,
    billNumber: (billData.identifier as string) || 'Unknown',
    title: (billData.title as string) || 'No title available',
    summary: (billData.abstract as string) || (billData.title as string) || 'No summary available',
    chamber: fromOrganization?.chamber === 'upper' ? 'upper' : 'lower',
    status: mapStatus(
      (billData.classification as string[]) || [],
      billData.latest_action_description as string | undefined
    ),
    sponsor: {
      name: (primarySponsor?.name as string) || 'Unknown',
      party:
        normalizeParty(
          ((primarySponsor?.person as Record<string, unknown>)?.party as string) || undefined
        ) || 'Independent',
      district:
        ((
          (primarySponsor?.person as Record<string, unknown>)?.current_role as Record<
            string,
            unknown
          >
        )?.district as string) || 'Unknown',
    },
    cosponsors: sponsors
      .filter(s => !(s.primary as boolean))
      .slice(0, 10)
      .map(s => ({
        name: (s.name as string) || 'Unknown',
        party:
          normalizeParty(((s.person as Record<string, unknown>)?.party as string) || undefined) ||
          'Independent',
        district:
          (((s.person as Record<string, unknown>)?.current_role as Record<string, unknown>)
            ?.district as string) || 'Unknown',
      })),
    committee: actions.find(
      a => ((a.organization as Record<string, unknown>)?.classification as string) === 'committee'
    )
      ? {
          name:
            ((
              actions.find(
                a =>
                  ((a.organization as Record<string, unknown>)?.classification as string) ===
                  'committee'
              )?.organization as Record<string, unknown>
            )?.name as string) || 'Unknown Committee',
          chairman: 'Unknown', // Would need separate API call
        }
      : undefined,
    introducedDate: ((billData.first_action_date as string | undefined) ||
      (billData.created_at as string | undefined) ||
      new Date().toISOString().split('T')[0]) as string,
    lastActionDate: ((billData.latest_action_date as string | undefined) ||
      (billData.updated_at as string | undefined) ||
      new Date().toISOString().split('T')[0]) as string,
    lastAction: (billData.latest_action_description as string) || 'No action recorded',
    subjects: (billData.subject as string[]) || [],
    votes,
    fullTextUrl: ((billData.sources as Record<string, unknown>[])?.[0]?.url as string) || undefined,
    trackingCount: 0, // Data unavailable - would need citizen engagement API
  };
}

// Normalize party names
function normalizeParty(party?: string): 'Democratic' | 'Republican' | 'Independent' {
  if (!party) return 'Independent';

  const normalized = party.toLowerCase();
  if (normalized.includes('democrat')) return 'Democratic';
  if (normalized.includes('republican')) return 'Republican';
  return 'Independent';
}

// Get state names for display
function getStateName(state: string): string {
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
  };

  return stateNames[state.toUpperCase()] || 'Unknown State';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params;
  const { searchParams } = request.nextUrl;

  const status = searchParams.get('status') || undefined;
  const chamber = searchParams.get('chamber') || undefined;
  const subject = searchParams.get('subject') || undefined;
  const sponsor = searchParams.get('sponsor') || undefined;
  const search = searchParams.get('search') || searchParams.get('q') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const page = parseInt(searchParams.get('page') || '1');

  if (!state || state.length !== 2) {
    return NextResponse.json({ error: 'Valid state abbreviation is required' }, { status: 400 });
  }

  try {
    const session = searchParams.get('session') || undefined;
    const cacheKey = `state-bills-${state.toUpperCase()}-${status || 'all'}-${chamber || 'all'}-${subject || 'all'}-${sponsor || 'all'}-${search || 'none'}-${session || 'current'}-${page}`;
    // Session-aware caching: specific session gets 7 days, current/all gets 24 hours
    // Search queries get shorter cache (1 hour) since results may change frequently
    const cacheTTL = search ? 60 * 60 : session ? 7 * 24 * 60 * 60 : 24 * 60 * 60;

    const billsData = await cachedFetch(
      cacheKey,
      async (): Promise<StateBillsResponse> => {
        logger.info(
          'Fetching state bills from OpenStates',
          {
            state: state.toUpperCase(),
            operation: 'state_bills_fetch',
            filters: { status, chamber, subject, sponsor, search },
            pagination: { limit, page },
          },
          request
        );

        const stateAbbrev = getStateAbbreviation(state);

        // Fetch bills from OpenStates API
        const bills = await fetchStateBills(stateAbbrev, {
          chamber: chamber || undefined,
          subject: subject || undefined,
          session: session || undefined,
          search: search || undefined,
          perPage: limit,
          page,
        });

        // If no bills found, provide fallback response
        if (bills.length === 0) {
          logger.warn('No bills found from OpenStates API', {
            state: state.toUpperCase(),
            stateAbbrev,
            filters: { status, chamber, subject, sponsor, search },
          });

          return {
            state: state.toUpperCase(),
            stateName: getStateName(state),
            session: '2024 Session',
            bills: [],
            totalCount: 0,
            lastUpdated: new Date().toISOString(),
            filters: { status, chamber, subject, sponsor },
            summary: {
              byStatus: {},
              byChamber: {},
              byParty: {},
            },
          };
        }

        // Calculate summary statistics
        const byStatus: Record<string, number> = {};
        const byChamber: Record<string, number> = {};
        const byParty: Record<string, number> = {};

        bills.forEach(bill => {
          byStatus[bill.status] = (byStatus[bill.status] || 0) + 1;
          byChamber[bill.chamber] = (byChamber[bill.chamber] || 0) + 1;
          byParty[bill.sponsor.party] = (byParty[bill.sponsor.party] || 0) + 1;
        });

        return {
          state: state.toUpperCase(),
          stateName: getStateName(state),
          session: '2024 Regular Session',
          bills,
          totalCount: bills.length,
          lastUpdated: new Date().toISOString(),
          filters: { status, chamber, subject, sponsor },
          summary: {
            byStatus,
            byChamber,
            byParty,
          },
        };
      },
      cacheTTL
    );

    // Apply client-side filters (for refined filtering beyond API search)
    let filteredBills = billsData.bills;

    if (status) {
      filteredBills = filteredBills.filter(bill => bill.status === status);
    }

    if (chamber) {
      filteredBills = filteredBills.filter(bill => bill.chamber === chamber);
    }

    if (subject) {
      filteredBills = filteredBills.filter(bill =>
        bill.subjects.some(s => s.toLowerCase().includes(subject.toLowerCase()))
      );
    }

    if (sponsor) {
      filteredBills = filteredBills.filter(bill =>
        bill.sponsor.name.toLowerCase().includes(sponsor.toLowerCase())
      );
    }

    // Note: Full-text search is handled server-side by OpenStates API via 'q' parameter
    // No need for client-side search filtering as API already returns filtered results

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedBills = filteredBills.slice(startIndex, startIndex + limit);

    const response = {
      ...billsData,
      bills: paginatedBills,
      totalCount: filteredBills.length,
      filters: {
        status,
        chamber,
        subject,
        sponsor,
        search,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredBills.length / limit),
        hasNextPage: startIndex + limit < filteredBills.length,
        hasPreviousPage: page > 1,
      },
    };

    // Session-aware HTTP cache headers
    const cacheMaxAge = session ? 604800 : 86400; // 7 days vs 24 hours
    const headers = new Headers({
      'Cache-Control': `public, max-age=${cacheMaxAge}, stale-while-revalidate=86400`,
      'CDN-Cache-Control': `public, max-age=${cacheMaxAge}`,
      Vary: 'Accept-Encoding',
    });

    return NextResponse.json(response, { headers });
  } catch (error) {
    logger.error(
      'State Bills API Error',
      error as Error,
      {
        state: state.toUpperCase(),
        operation: 'state_bills_api_error',
        filters: { status, chamber, subject, sponsor, search },
      },
      request
    );

    const errorResponse = {
      state: state.toUpperCase(),
      stateName: 'Unknown State',
      session: 'Data Unavailable',
      bills: [],
      totalCount: 0,
      lastUpdated: new Date().toISOString(),
      filters: {},
      summary: { byStatus: {}, byChamber: {}, byParty: {} },
      error: 'State bills data temporarily unavailable',
    };

    return NextResponse.json(errorResponse, { status: 200 });
  }
}
