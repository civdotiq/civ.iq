import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { structuredLogger } from '@/lib/logging/logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';

interface StateBill {
  id: string;
  billNumber: string;
  title: string;
  summary: string;
  chamber: 'upper' | 'lower';
  status: 'introduced' | 'committee' | 'floor' | 'passed_chamber' | 'other_chamber' | 'passed_both' | 'signed' | 'vetoed' | 'dead';
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
    'AL': 'al', 'AK': 'ak', 'AZ': 'az', 'AR': 'ar', 'CA': 'ca',
    'CO': 'co', 'CT': 'ct', 'DE': 'de', 'FL': 'fl', 'GA': 'ga',
    'HI': 'hi', 'ID': 'id', 'IL': 'il', 'IN': 'in', 'IA': 'ia',
    'KS': 'ks', 'KY': 'ky', 'LA': 'la', 'ME': 'me', 'MD': 'md',
    'MA': 'ma', 'MI': 'mi', 'MN': 'mn', 'MS': 'ms', 'MO': 'mo',
    'MT': 'mt', 'NE': 'ne', 'NV': 'nv', 'NH': 'nh', 'NJ': 'nj',
    'NM': 'nm', 'NY': 'ny', 'NC': 'nc', 'ND': 'nd', 'OH': 'oh',
    'OK': 'ok', 'OR': 'or', 'PA': 'pa', 'RI': 'ri', 'SC': 'sc',
    'SD': 'sd', 'TN': 'tn', 'TX': 'tx', 'UT': 'ut', 'VT': 'vt',
    'VA': 'va', 'WA': 'wa', 'WV': 'wv', 'WI': 'wi', 'WY': 'wy'
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
    perPage?: number;
    page?: number;
  } = {}
): Promise<StateBill[]> {
  const monitor = monitorExternalApi('openstates', 'bills', 'https://v3.openstates.org/bills');
  
  try {
    const url = new URL('https://v3.openstates.org/bills');
    url.searchParams.set('jurisdiction', stateAbbrev);
    url.searchParams.set('per_page', (options.perPage || 50).toString());
    url.searchParams.set('page', (options.page || 1).toString());
    url.searchParams.set('sort', 'updated_desc'); // Get most recently updated bills first
    
    if (options.chamber) {
      url.searchParams.set('chamber', options.chamber);
    }
    
    if (options.subject) {
      url.searchParams.set('subject', options.subject);
    }
    
    if (options.session) {
      url.searchParams.set('session', options.session);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
      }
    });

    if (!response.ok) {
      monitor.end(false, response.status);
      structuredLogger.error('OpenStates bills API error', new Error(`HTTP ${response.status}`), {
        stateAbbrev,
        options,
        statusCode: response.status
      });
      return [];
    }

    monitor.end(true, 200);
    const data = await response.json();
    
    structuredLogger.info('Successfully fetched state bills', {
      stateAbbrev,
      options,
      count: data.results?.length || 0,
      totalCount: data.meta?.total_count || 0
    });

    return data.results?.map((bill: any) => transformBill(bill, stateAbbrev)) || [];
  } catch (error) {
    monitor.end(false, undefined, error as Error);
    structuredLogger.error('Error fetching state bills', error as Error, {
      stateAbbrev,
      options
    });
    return [];
  }
}

// Transform OpenStates bill data to our format
function transformBill(bill: any, stateAbbrev: string): StateBill {
  const sponsors = bill.sponsorships || [];
  const primarySponsor = sponsors.find((s: any) => s.primary) || sponsors[0];
  
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
  const votes = bill.actions?.filter((action: any) => 
    action.classification?.includes('passage') || 
    action.classification?.includes('committee-passage')
  ).map((action: any) => ({
    chamber: action.organization?.chamber || 'unknown',
    date: action.date,
    type: action.classification?.includes('committee') ? 'committee' : 'passage',
    yesVotes: 0, // Would need to fetch actual vote data
    noVotes: 0,
    absentVotes: 0,
    result: action.description?.toLowerCase().includes('passed') ? 'pass' : 'fail'
  })) || [];

  return {
    id: bill.id || `${stateAbbrev}-${bill.identifier}`,
    billNumber: bill.identifier || 'Unknown',
    title: bill.title || 'No title available',
    summary: bill.abstract || bill.title || 'No summary available',
    chamber: bill.from_organization?.chamber === 'upper' ? 'upper' : 'lower',
    status: mapStatus(bill.classification || [], bill.latest_action_description),
    sponsor: {
      name: primarySponsor?.name || 'Unknown',
      party: normalizeParty(primarySponsor?.person?.party) || 'Independent',
      district: primarySponsor?.person?.current_role?.district || 'Unknown'
    },
    cosponsors: sponsors.filter((s: any) => !s.primary).slice(0, 10).map((s: any) => ({
      name: s.name || 'Unknown',
      party: normalizeParty(s.person?.party) || 'Independent',
      district: s.person?.current_role?.district || 'Unknown'
    })),
    committee: bill.actions?.find((a: any) => a.organization?.classification === 'committee') ? {
      name: bill.actions.find((a: any) => a.organization?.classification === 'committee')?.organization?.name || 'Unknown Committee',
      chairman: 'Unknown' // Would need separate API call
    } : undefined,
    introducedDate: bill.first_action_date || bill.created_at || new Date().toISOString().split('T')[0],
    lastActionDate: bill.latest_action_date || bill.updated_at || new Date().toISOString().split('T')[0],
    lastAction: bill.latest_action_description || 'No action recorded',
    subjects: bill.subject || [],
    votes,
    fullTextUrl: bill.sources?.[0]?.url,
    trackingCount: Math.floor(Math.random() * 100) // Mock tracking count
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
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
  };

  return stateNames[state.toUpperCase()] || 'Unknown State';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params;
  const { searchParams } = new URL(request.url);
  
  const status = searchParams.get('status') || undefined;
  const chamber = searchParams.get('chamber') || undefined;
  const subject = searchParams.get('subject') || undefined;
  const sponsor = searchParams.get('sponsor') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const page = parseInt(searchParams.get('page') || '1');

  if (!state || state.length !== 2) {
    return NextResponse.json(
      { error: 'Valid state abbreviation is required' },
      { status: 400 }
    );
  }

  try {
    const cacheKey = `state-bills-${state.toUpperCase()}-${status || 'all'}-${chamber || 'all'}-${subject || 'all'}-${sponsor || 'all'}-${page}`;
    const TTL_30_MINUTES = 30 * 60;

    const billsData = await cachedFetch(
      cacheKey,
      async (): Promise<StateBillsResponse> => {
        structuredLogger.info('Fetching state bills from OpenStates', {
          state: state.toUpperCase(),
          operation: 'state_bills_fetch',
          filters: { status, chamber, subject, sponsor },
          pagination: { limit, page }
        }, request);

        const stateAbbrev = getStateAbbreviation(state);
        
        // Fetch bills from OpenStates API
        const bills = await fetchStateBills(stateAbbrev, {
          chamber: chamber || undefined,
          subject: subject || undefined,
          perPage: limit,
          page
        });

        // If no bills found, provide fallback response
        if (bills.length === 0) {
          structuredLogger.warn('No bills found from OpenStates API', {
            state: state.toUpperCase(),
            stateAbbrev,
            filters: { status, chamber, subject, sponsor }
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
              byParty: {}
            }
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
            byParty
          }
        };
      },
      TTL_30_MINUTES
    );

    // Apply filters
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
        sponsor
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredBills.length / limit),
        hasNextPage: startIndex + limit < filteredBills.length,
        hasPreviousPage: page > 1
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    structuredLogger.error('State Bills API Error', error as Error, {
      state: state.toUpperCase(),
      operation: 'state_bills_api_error',
      filters: { status, chamber, subject, sponsor }
    }, request);
    
    const errorResponse = {
      state: state.toUpperCase(),
      stateName: 'Unknown State',
      session: 'Data Unavailable',
      bills: [],
      totalCount: 0,
      lastUpdated: new Date().toISOString(),
      filters: {},
      summary: { byStatus: {}, byChamber: {}, byParty: {} },
      error: 'State bills data temporarily unavailable'
    };

    return NextResponse.json(errorResponse, { status: 200 });
  }
}

