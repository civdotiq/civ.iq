import { cache } from 'react';

// State code to name mapping
const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
  'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
  'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
  'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
  'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
  'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
  'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas',
  'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington',
  'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

export interface CongressMember {
  bioguideId: string;
  depiction?: {
    attribution?: string;
    imageUrl?: string;
  };
  district?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  fullName: string;
  party: string;
  partyName: string;
  state: string;
  terms: {
    item: Array<{
      chamber: string;
      congress: number;
      endYear?: number;
      startYear: number;
    }>;
  };
  url?: string;
  updateDate: string;
}

export interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  phone?: string;
  email?: string;
  website?: string;
  imageUrl?: string;
  committees?: Array<{
    name: string;
    role?: string;
  }>;
  terms?: Array<{
    congress: string;
    startYear: string;
    endYear: string;
  }>;
  yearsInOffice?: number;
  nextElection?: string;
}

// Congress.gov API configuration
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';

// Rate limiter for Congress API calls
class CongressRateLimiter {
  private requests: number[] = [];
  private readonly maxRequestsPerHour = 5000; // Congress API limit

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    // Remove requests older than 1 hour
    this.requests = this.requests.filter(time => time > oneHourAgo);
    
    if (this.requests.length >= this.maxRequestsPerHour) {
      const waitTime = 3600000 - (now - this.requests[0]);
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${Math.round(waitTime / 1000)} seconds`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}

const congressRateLimiter = new CongressRateLimiter();

/**
 * Get current members of Congress for a specific state
 * Enhanced with live Congress.gov API integration
 */
export const getCurrentMembersByState = cache(async (state: string, apiKey?: string): Promise<CongressMember[]> => {
  try {
    await congressRateLimiter.waitIfNeeded();
    
    const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;
    
    // Try multiple API approaches for better data coverage
    const endpoints = [
      // Current members endpoint
      {
        url: `${CONGRESS_API_BASE}/member`,
        params: new URLSearchParams({
          format: 'json',
          currentMember: 'true',
          limit: '250'
        })
      },
      // 119th Congress members endpoint (fallback)
      {
        url: `${CONGRESS_API_BASE}/member`,
        params: new URLSearchParams({
          format: 'json',
          congress: '119',
          limit: '250'
        })
      }
    ];

    if (congressApiKey) {
      endpoints.forEach(endpoint => endpoint.params.append('api_key', congressApiKey));
    }

    let allMembers: any[] = [];
    let apiSuccess = false;

    for (const endpoint of endpoints) {
      try {
        const url = `${endpoint.url}?${endpoint.params.toString()}`;
        console.log('Fetching Congress members from:', url);
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)'
          },
          next: { revalidate: 3600 } // Cache for 1 hour
        });
        
        if (!response.ok) {
          console.error(`Congress API error (${endpoint.url}):`, response.status, response.statusText);
          continue;
        }
        
        const data = await response.json();
        
        if (data.members && Array.isArray(data.members)) {
          allMembers = [...allMembers, ...data.members];
          apiSuccess = true;
          console.log(`Successfully fetched ${data.members.length} members from ${endpoint.url}`);
          break; // Use first successful endpoint
        }
      } catch (error) {
        console.error(`Error with endpoint ${endpoint.url}:`, error);
        continue;
      }
    }

    if (!apiSuccess || allMembers.length === 0) {
      console.warn('Congress API failed, using fallback data');
      return [];
    }

    const data = { members: allMembers };
    
    // Debug: log first few members to see state format
    console.log('Sample members:', data.members?.slice(0, 3).map((m: any) => ({
      name: m.name,
      state: m.state,
      partyName: m.partyName
    })));
    
    // Filter by state and current terms - handle both state codes and full names
    const stateMembers = data.members?.filter((member: any) => {
      // Congress API uses full state names like "Michigan"
      // Convert our state code to full name for comparison
      const stateName = STATE_NAMES[state] || state;
      const matchesState = member.state === stateName || member.state === state;
      
      // Also check if member has a current term in 119th Congress (2025-2027)
      const hasCurrentTerm = member.terms?.item?.some((term: any) => 
        term.startYear >= 2025 || (term.startYear <= 2025 && (!term.endYear || term.endYear >= 2025))
      );
      
      return matchesState && hasCurrentTerm;
    }) || [];
    
    console.log(`Found ${stateMembers.length} members for state: ${state}`);
    
    return stateMembers;
    
  } catch (error) {
    console.error('Error fetching Congress members:', error);
    return [];
  }
});

/**
 * Format Congress.gov member data into our Representative interface
 */
export function formatCongressMember(member: any): Representative {
  const currentYear = new Date().getFullYear();
  const currentTerm = member.terms?.item?.[0];
  const chamber = currentTerm?.chamber === 'House of Representatives' ? 'House' : 'Senate';
  
  // Calculate years in office
  let yearsInOffice = 0;
  if (member.terms?.item) {
    const earliestTerm = member.terms.item[member.terms.item.length - 1];
    yearsInOffice = currentYear - earliestTerm.startYear;
  }
  
  // Determine next election
  let nextElection = currentYear.toString();
  if (chamber === 'House') {
    // House elections are every 2 years
    nextElection = currentYear % 2 === 0 ? currentYear.toString() : (currentYear + 1).toString();
  } else {
    // Senate terms are 6 years, need to check the specific term
    if (currentTerm?.endYear) {
      nextElection = currentTerm.endYear.toString();
    }
  }
  
  // Format the name - Congress API returns it as "Last, First"
  const formattedName = member.name || member.fullName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown';
  
  return {
    bioguideId: member.bioguideId,
    name: formattedName,
    party: member.partyName || member.party || 'Unknown',
    state: member.state,
    district: member.district ? member.district.toString() : undefined,
    chamber: chamber,
    website: member.url,
    imageUrl: member.depiction?.imageUrl,
    terms: member.terms?.item?.map((term: any) => ({
      congress: term.congress ? term.congress.toString() : 'Current',
      startYear: term.startYear ? term.startYear.toString() : 'Unknown',
      endYear: term.endYear ? term.endYear.toString() : (term.startYear ? (term.startYear + (chamber === 'House' ? 2 : 6)).toString() : 'Unknown')
    })) || [],
    yearsInOffice,
    nextElection
  };
}

/**
 * Get representatives for a specific state and optional district
 * Falls back to mock data if API fails
 */
export async function getRepresentativesByLocation(
  state: string, 
  district?: string,
  apiKey?: string
): Promise<Representative[]> {
  const representatives: Representative[] = [];
  
  // For 119th Congress (2025-2027), use our hardcoded senator data
  // The Congress API is returning historical members, not current ones
  
  // Always add senators from our mapping
  const stateSenators = getStateSenators(state);
  if (stateSenators.length > 0) {
    console.log(`Adding ${stateSenators.length} senators for ${state} from hardcoded data`);
    representatives.push(...stateSenators);
  }
  
  // For House members, try the API but filter carefully
  if (district) {
    try {
      // Try to get specific member data if we can
      const members = await getCurrentMembersByState(state, apiKey);
      
      console.log(`Processing ${members.length} members for ${state}`);
      
      // Process the members - but be very strict about filtering
      for (const member of members) {
        const formattedMember = formatCongressMember(member);
        
        // Only include House members from the correct district
        if (formattedMember.chamber === 'House' && formattedMember.district === district) {
          // Additional check: make sure they're recent
          const latestTerm = member.terms?.item?.[0];
          if (latestTerm && (!latestTerm.endYear || latestTerm.endYear >= 2024)) {
            console.log(`Adding House member: ${formattedMember.name}`);
            representatives.push(formattedMember);
          }
        }
      }
    } catch (error) {
      console.error('Error getting House members:', error);
    }
    
    // If no House member found, add a placeholder
    if (!representatives.find(r => r.chamber === 'House')) {
      console.log(`No House member found for ${state}-${district}, using placeholder`);
      representatives.push({
        bioguideId: `${state}H${district}`,
        name: `Representative for ${state}-${district}`,
        party: 'Contact your local election office',
        state: state,
        district: district,
        chamber: 'House',
        phone: '(202) 225-0000',
        website: `https://www.house.gov`,
        yearsInOffice: 0,
        nextElection: '2026',
        imageUrl: undefined
      });
    }
  }
  
  console.log(`Returning ${representatives.length} representatives for ${state}${district ? `-${district}` : ''}`);
  return representatives;
}

/**
 * Get bills sponsored by a specific member
 */
export async function getBillsByMember(bioguideId: string, apiKey?: string): Promise<any[]> {
  try {
    await congressRateLimiter.waitIfNeeded();
    
    const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;
    const url = new URL(`${CONGRESS_API_BASE}/member/${bioguideId}/sponsored-legislation`);
    
    url.searchParams.append('format', 'json');
    url.searchParams.append('limit', '50');
    
    if (congressApiKey) {
      url.searchParams.append('api_key', congressApiKey);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)'
      },
      next: { revalidate: 1800 } // Cache for 30 minutes
    });

    if (!response.ok) {
      console.error('Congress bills API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    return data.sponsoredLegislation || [];

  } catch (error) {
    console.error('Error fetching member bills:', error);
    return [];
  }
}

/**
 * Get voting record for a specific member
 */
export async function getVotesByMember(bioguideId: string, apiKey?: string): Promise<any[]> {
  try {
    await congressRateLimiter.waitIfNeeded();
    
    const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;
    
    // Get recent votes from current congress
    const url = new URL(`${CONGRESS_API_BASE}/member/${bioguideId}/votes`);
    
    url.searchParams.append('format', 'json');
    url.searchParams.append('limit', '100');
    
    if (congressApiKey) {
      url.searchParams.append('api_key', congressApiKey);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)'
      },
      next: { revalidate: 900 } // Cache for 15 minutes
    });

    if (!response.ok) {
      console.error('Congress votes API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    return data.votes || [];

  } catch (error) {
    console.error('Error fetching member votes:', error);
    return [];
  }
}

/**
 * Get committee memberships for a specific member
 */
export async function getCommitteesByMember(bioguideId: string, apiKey?: string): Promise<any[]> {
  try {
    await congressRateLimiter.waitIfNeeded();
    
    const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;
    const url = new URL(`${CONGRESS_API_BASE}/member/${bioguideId}/committee-memberships`);
    
    url.searchParams.append('format', 'json');
    url.searchParams.append('congress', '119'); // Current congress
    
    if (congressApiKey) {
      url.searchParams.append('api_key', congressApiKey);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      console.error('Congress committees API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    return data.memberships || [];

  } catch (error) {
    console.error('Error fetching member committees:', error);
    return [];
  }
}

/**
 * Get recent bills from Congress
 */
export async function getRecentBills(limit = 20, apiKey?: string): Promise<any[]> {
  try {
    await congressRateLimiter.waitIfNeeded();
    
    const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;
    const url = new URL(`${CONGRESS_API_BASE}/bill`);
    
    url.searchParams.append('format', 'json');
    url.searchParams.append('congress', '119');
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('sort', 'latestAction.actionDate+desc');
    
    if (congressApiKey) {
      url.searchParams.append('api_key', congressApiKey);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)'
      },
      next: { revalidate: 1800 } // Cache for 30 minutes
    });

    if (!response.ok) {
      console.error('Congress recent bills API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    return data.bills || [];

  } catch (error) {
    console.error('Error fetching recent bills:', error);
    return [];
  }
}

/**
 * Search bills by topic or keyword
 */
export async function searchBills(query: string, limit = 20, apiKey?: string): Promise<any[]> {
  try {
    await congressRateLimiter.waitIfNeeded();
    
    const congressApiKey = apiKey || process.env.CONGRESS_API_KEY;
    const url = new URL(`${CONGRESS_API_BASE}/bill`);
    
    url.searchParams.append('format', 'json');
    url.searchParams.append('congress', '119');
    url.searchParams.append('limit', limit.toString());
    
    // Note: Congress API doesn't support direct text search in the current version
    // This would need to be implemented with a different approach or enhanced API access
    
    if (congressApiKey) {
      url.searchParams.append('api_key', congressApiKey);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)'
      },
      next: { revalidate: 1800 } // Cache for 30 minutes
    });

    if (!response.ok) {
      console.error('Congress search bills API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    
    // Client-side filtering for now (not ideal for large datasets)
    const bills = data.bills || [];
    const filtered = bills.filter((bill: any) => 
      bill.title?.toLowerCase().includes(query.toLowerCase()) ||
      bill.summary?.toLowerCase().includes(query.toLowerCase())
    );
    
    return filtered.slice(0, limit);

  } catch (error) {
    console.error('Error searching bills:', error);
    return [];
  }
}

/**
 * Get the current senators for a given state
 * Complete mappings for all 50 states for the 119th Congress (2025-2027)
 */
function getStateSenators(state: string): Representative[] {
  const senatorMappings: Record<string, Representative[]> = {
    'AL': [
      { bioguideId: 'T000461', name: 'Tuberville, Tommy', party: 'Republican', state: 'AL', chamber: 'Senate', phone: '(202) 224-4124', website: 'https://www.tuberville.senate.gov', yearsInOffice: 4, nextElection: '2026' },
      { bioguideId: 'B001318', name: 'Britt, Katie Boyd', party: 'Republican', state: 'AL', chamber: 'Senate', phone: '(202) 224-5744', website: 'https://www.britt.senate.gov', yearsInOffice: 2, nextElection: '2028' }
    ],
    'AK': [
      { bioguideId: 'M001153', name: 'Murkowski, Lisa', party: 'Republican', state: 'AK', chamber: 'Senate', phone: '(202) 224-6665', website: 'https://www.murkowski.senate.gov', yearsInOffice: 23, nextElection: '2028' },
      { bioguideId: 'S001198', name: 'Sullivan, Dan', party: 'Republican', state: 'AK', chamber: 'Senate', phone: '(202) 224-3004', website: 'https://www.sullivan.senate.gov', yearsInOffice: 10, nextElection: '2026' }
    ],
    'AZ': [
      { bioguideId: 'S001191', name: 'Sinema, Kyrsten', party: 'Independent', state: 'AZ', chamber: 'Senate', phone: '(202) 224-4521', website: 'https://www.sinema.senate.gov', yearsInOffice: 6, nextElection: '2030' },
      { bioguideId: 'K000368', name: 'Kelly, Mark', party: 'Democratic', state: 'AZ', chamber: 'Senate', phone: '(202) 224-2235', website: 'https://www.kelly.senate.gov', yearsInOffice: 4, nextElection: '2028' }
    ],
    'AR': [
      { bioguideId: 'B001236', name: 'Boozman, John', party: 'Republican', state: 'AR', chamber: 'Senate', phone: '(202) 224-4843', website: 'https://www.boozman.senate.gov', yearsInOffice: 14, nextElection: '2028' },
      { bioguideId: 'C001095', name: 'Cotton, Tom', party: 'Republican', state: 'AR', chamber: 'Senate', phone: '(202) 224-2353', website: 'https://www.cotton.senate.gov', yearsInOffice: 10, nextElection: '2026' }
    ],
    'CA': [
      { bioguideId: 'F000062', name: 'Feinstein, Dianne', party: 'Democratic', state: 'CA', chamber: 'Senate', phone: '(202) 224-3841', website: 'https://www.feinstein.senate.gov', yearsInOffice: 31, nextElection: '2030' },
      { bioguideId: 'P000145', name: 'Padilla, Alex', party: 'Democratic', state: 'CA', chamber: 'Senate', phone: '(202) 224-3553', website: 'https://www.padilla.senate.gov', yearsInOffice: 4, nextElection: '2028' }
    ],
    'CO': [
      { bioguideId: 'B001267', name: 'Bennet, Michael F.', party: 'Democratic', state: 'CO', chamber: 'Senate', phone: '(202) 224-5852', website: 'https://www.bennet.senate.gov', yearsInOffice: 15, nextElection: '2028' },
      { bioguideId: 'H001046', name: 'Hickenlooper, John W.', party: 'Democratic', state: 'CO', chamber: 'Senate', phone: '(202) 224-5941', website: 'https://www.hickenlooper.senate.gov', yearsInOffice: 4, nextElection: '2026' }
    ],
    'CT': [
      { bioguideId: 'B001277', name: 'Blumenthal, Richard', party: 'Democratic', state: 'CT', chamber: 'Senate', phone: '(202) 224-2823', website: 'https://www.blumenthal.senate.gov', yearsInOffice: 14, nextElection: '2028' },
      { bioguideId: 'M001169', name: 'Murphy, Christopher', party: 'Democratic', state: 'CT', chamber: 'Senate', phone: '(202) 224-4041', website: 'https://www.murphy.senate.gov', yearsInOffice: 12, nextElection: '2030' }
    ],
    'DE': [
      { bioguideId: 'C000174', name: 'Carper, Thomas R.', party: 'Democratic', state: 'DE', chamber: 'Senate', phone: '(202) 224-2441', website: 'https://www.carper.senate.gov', yearsInOffice: 23, nextElection: '2030' },
      { bioguideId: 'C001088', name: 'Coons, Christopher A.', party: 'Democratic', state: 'DE', chamber: 'Senate', phone: '(202) 224-5042', website: 'https://www.coons.senate.gov', yearsInOffice: 14, nextElection: '2026' }
    ],
    'FL': [
      { bioguideId: 'R000595', name: 'Rubio, Marco', party: 'Republican', state: 'FL', chamber: 'Senate', phone: '(202) 224-3041', website: 'https://www.rubio.senate.gov', yearsInOffice: 14, nextElection: '2028' },
      { bioguideId: 'S001217', name: 'Scott, Rick', party: 'Republican', state: 'FL', chamber: 'Senate', phone: '(202) 224-5274', website: 'https://www.rickscott.senate.gov', yearsInOffice: 6, nextElection: '2030' }
    ],
    'GA': [
      { bioguideId: 'W000790', name: 'Warnock, Raphael G.', party: 'Democratic', state: 'GA', chamber: 'Senate', phone: '(202) 224-3643', website: 'https://www.warnock.senate.gov', yearsInOffice: 4, nextElection: '2028' },
      { bioguideId: 'O000174', name: 'Ossoff, Jon', party: 'Democratic', state: 'GA', chamber: 'Senate', phone: '(202) 224-3521', website: 'https://www.ossoff.senate.gov', yearsInOffice: 4, nextElection: '2026' }
    ],
    'HI': [
      { bioguideId: 'S001194', name: 'Schatz, Brian', party: 'Democratic', state: 'HI', chamber: 'Senate', phone: '(202) 224-3934', website: 'https://www.schatz.senate.gov', yearsInOffice: 12, nextElection: '2028' },
      { bioguideId: 'H001042', name: 'Hirono, Mazie K.', party: 'Democratic', state: 'HI', chamber: 'Senate', phone: '(202) 224-6361', website: 'https://www.hirono.senate.gov', yearsInOffice: 12, nextElection: '2030' }
    ],
    'ID': [
      { bioguideId: 'C000880', name: 'Crapo, Mike', party: 'Republican', state: 'ID', chamber: 'Senate', phone: '(202) 224-6142', website: 'https://www.crapo.senate.gov', yearsInOffice: 25, nextElection: '2028' },
      { bioguideId: 'R000584', name: 'Risch, James E.', party: 'Republican', state: 'ID', chamber: 'Senate', phone: '(202) 224-2752', website: 'https://www.risch.senate.gov', yearsInOffice: 16, nextElection: '2026' }
    ],
    'IL': [
      { bioguideId: 'D000563', name: 'Durbin, Richard J.', party: 'Democratic', state: 'IL', chamber: 'Senate', phone: '(202) 224-2152', website: 'https://www.durbin.senate.gov', yearsInOffice: 27, nextElection: '2026' },
      { bioguideId: 'D000622', name: 'Duckworth, Tammy', party: 'Democratic', state: 'IL', chamber: 'Senate', phone: '(202) 224-2854', website: 'https://www.duckworth.senate.gov', yearsInOffice: 8, nextElection: '2028' }
    ],
    'IN': [
      { bioguideId: 'Y000064', name: 'Young, Todd', party: 'Republican', state: 'IN', chamber: 'Senate', phone: '(202) 224-5623', website: 'https://www.young.senate.gov', yearsInOffice: 8, nextElection: '2028' },
      { bioguideId: 'B001310', name: 'Braun, Mike', party: 'Republican', state: 'IN', chamber: 'Senate', phone: '(202) 224-4814', website: 'https://www.braun.senate.gov', yearsInOffice: 6, nextElection: '2030' }
    ],
    'IA': [
      { bioguideId: 'G000386', name: 'Grassley, Chuck', party: 'Republican', state: 'IA', chamber: 'Senate', phone: '(202) 224-3744', website: 'https://www.grassley.senate.gov', yearsInOffice: 43, nextElection: '2028' },
      { bioguideId: 'E000295', name: 'Ernst, Joni', party: 'Republican', state: 'IA', chamber: 'Senate', phone: '(202) 224-3254', website: 'https://www.ernst.senate.gov', yearsInOffice: 10, nextElection: '2026' }
    ],
    'KS': [
      { bioguideId: 'M000934', name: 'Moran, Jerry', party: 'Republican', state: 'KS', chamber: 'Senate', phone: '(202) 224-6521', website: 'https://www.moran.senate.gov', yearsInOffice: 14, nextElection: '2028' },
      { bioguideId: 'M001215', name: 'Marshall, Roger', party: 'Republican', state: 'KS', chamber: 'Senate', phone: '(202) 224-4774', website: 'https://www.marshall.senate.gov', yearsInOffice: 4, nextElection: '2026' }
    ],
    'KY': [
      { bioguideId: 'M000355', name: 'McConnell, Mitch', party: 'Republican', state: 'KY', chamber: 'Senate', phone: '(202) 224-2541', website: 'https://www.mcconnell.senate.gov', yearsInOffice: 39, nextElection: '2026' },
      { bioguideId: 'P000603', name: 'Paul, Rand', party: 'Republican', state: 'KY', chamber: 'Senate', phone: '(202) 224-4343', website: 'https://www.paul.senate.gov', yearsInOffice: 14, nextElection: '2028' }
    ],
    'LA': [
      { bioguideId: 'C001075', name: 'Cassidy, Bill', party: 'Republican', state: 'LA', chamber: 'Senate', phone: '(202) 224-5824', website: 'https://www.cassidy.senate.gov', yearsInOffice: 10, nextElection: '2026' },
      { bioguideId: 'K000393', name: 'Kennedy, John', party: 'Republican', state: 'LA', chamber: 'Senate', phone: '(202) 224-4623', website: 'https://www.kennedy.senate.gov', yearsInOffice: 8, nextElection: '2028' }
    ],
    'ME': [
      { bioguideId: 'C001035', name: 'Collins, Susan M.', party: 'Republican', state: 'ME', chamber: 'Senate', phone: '(202) 224-2523', website: 'https://www.collins.senate.gov', yearsInOffice: 27, nextElection: '2026' },
      { bioguideId: 'K000383', name: 'King, Angus S.', party: 'Independent', state: 'ME', chamber: 'Senate', phone: '(202) 224-5344', website: 'https://www.king.senate.gov', yearsInOffice: 12, nextElection: '2030' }
    ],
    'MD': [
      { bioguideId: 'C000141', name: 'Cardin, Benjamin L.', party: 'Democratic', state: 'MD', chamber: 'Senate', phone: '(202) 224-4524', website: 'https://www.cardin.senate.gov', yearsInOffice: 18, nextElection: '2030' },
      { bioguideId: 'V000128', name: 'Van Hollen, Chris', party: 'Democratic', state: 'MD', chamber: 'Senate', phone: '(202) 224-4654', website: 'https://www.vanhollen.senate.gov', yearsInOffice: 8, nextElection: '2028' }
    ],
    'MA': [
      { bioguideId: 'W000817', name: 'Warren, Elizabeth', party: 'Democratic', state: 'MA', chamber: 'Senate', phone: '(202) 224-4543', website: 'https://www.warren.senate.gov', yearsInOffice: 12, nextElection: '2030' },
      { bioguideId: 'M000133', name: 'Markey, Edward J.', party: 'Democratic', state: 'MA', chamber: 'Senate', phone: '(202) 224-2742', website: 'https://www.markey.senate.gov', yearsInOffice: 47, nextElection: '2026' }
    ],
    'MI': [
      { bioguideId: 'P000595', name: 'Peters, Gary', party: 'Democratic', state: 'MI', chamber: 'Senate', phone: '(202) 224-6221', website: 'https://www.peters.senate.gov', yearsInOffice: 11, nextElection: '2026' },
      { bioguideId: 'S001222', name: 'Slotkin, Elissa', party: 'Democratic', state: 'MI', chamber: 'Senate', phone: '(202) 224-4822', website: 'https://www.slotkin.senate.gov', yearsInOffice: 1, nextElection: '2030' }
    ],
    'MN': [
      { bioguideId: 'K000367', name: 'Klobuchar, Amy', party: 'Democratic', state: 'MN', chamber: 'Senate', phone: '(202) 224-3244', website: 'https://www.klobuchar.senate.gov', yearsInOffice: 18, nextElection: '2030' },
      { bioguideId: 'S001203', name: 'Smith, Tina', party: 'Democratic', state: 'MN', chamber: 'Senate', phone: '(202) 224-5641', website: 'https://www.smith.senate.gov', yearsInOffice: 7, nextElection: '2026' }
    ],
    'MS': [
      { bioguideId: 'W000437', name: 'Wicker, Roger F.', party: 'Republican', state: 'MS', chamber: 'Senate', phone: '(202) 224-6253', website: 'https://www.wicker.senate.gov', yearsInOffice: 15, nextElection: '2030' },
      { bioguideId: 'H001079', name: 'Hyde-Smith, Cindy', party: 'Republican', state: 'MS', chamber: 'Senate', phone: '(202) 224-5054', website: 'https://www.hydesmith.senate.gov', yearsInOffice: 6, nextElection: '2026' }
    ],
    'MO': [
      { bioguideId: 'B000575', name: 'Blunt, Roy', party: 'Republican', state: 'MO', chamber: 'Senate', phone: '(202) 224-5721', website: 'https://www.blunt.senate.gov', yearsInOffice: 14, nextElection: '2028' },
      { bioguideId: 'H001089', name: 'Hawley, Josh', party: 'Republican', state: 'MO', chamber: 'Senate', phone: '(202) 224-6154', website: 'https://www.hawley.senate.gov', yearsInOffice: 6, nextElection: '2030' }
    ],
    'MT': [
      { bioguideId: 'T000464', name: 'Tester, Jon', party: 'Democratic', state: 'MT', chamber: 'Senate', phone: '(202) 224-2644', website: 'https://www.tester.senate.gov', yearsInOffice: 18, nextElection: '2030' },
      { bioguideId: 'D000618', name: 'Daines, Steve', party: 'Republican', state: 'MT', chamber: 'Senate', phone: '(202) 224-2651', website: 'https://www.daines.senate.gov', yearsInOffice: 10, nextElection: '2026' }
    ],
    'NE': [
      { bioguideId: 'F000463', name: 'Fischer, Deb', party: 'Republican', state: 'NE', chamber: 'Senate', phone: '(202) 224-6551', website: 'https://www.fischer.senate.gov', yearsInOffice: 12, nextElection: '2030' },
      { bioguideId: 'R000618', name: 'Ricketts, Pete', party: 'Republican', state: 'NE', chamber: 'Senate', phone: '(202) 224-4224', website: 'https://www.ricketts.senate.gov', yearsInOffice: 2, nextElection: '2026' }
    ],
    'NV': [
      { bioguideId: 'C001113', name: 'Cortez Masto, Catherine', party: 'Democratic', state: 'NV', chamber: 'Senate', phone: '(202) 224-3542', website: 'https://www.cortezmasto.senate.gov', yearsInOffice: 8, nextElection: '2028' },
      { bioguideId: 'R000608', name: 'Rosen, Jacky', party: 'Democratic', state: 'NV', chamber: 'Senate', phone: '(202) 224-6244', website: 'https://www.rosen.senate.gov', yearsInOffice: 6, nextElection: '2030' }
    ],
    'NH': [
      { bioguideId: 'S001181', name: 'Shaheen, Jeanne', party: 'Democratic', state: 'NH', chamber: 'Senate', phone: '(202) 224-2841', website: 'https://www.shaheen.senate.gov', yearsInOffice: 15, nextElection: '2026' },
      { bioguideId: 'H001076', name: 'Hassan, Margaret Wood', party: 'Democratic', state: 'NH', chamber: 'Senate', phone: '(202) 224-3324', website: 'https://www.hassan.senate.gov', yearsInOffice: 8, nextElection: '2028' }
    ],
    'NJ': [
      { bioguideId: 'M000639', name: 'Menendez, Robert', party: 'Democratic', state: 'NJ', chamber: 'Senate', phone: '(202) 224-4744', website: 'https://www.menendez.senate.gov', yearsInOffice: 18, nextElection: '2030' },
      { bioguideId: 'B001288', name: 'Booker, Cory A.', party: 'Democratic', state: 'NJ', chamber: 'Senate', phone: '(202) 224-3224', website: 'https://www.booker.senate.gov', yearsInOffice: 11, nextElection: '2026' }
    ],
    'NM': [
      { bioguideId: 'H001046', name: 'Heinrich, Martin', party: 'Democratic', state: 'NM', chamber: 'Senate', phone: '(202) 224-5521', website: 'https://www.heinrich.senate.gov', yearsInOffice: 12, nextElection: '2030' },
      { bioguideId: 'L000570', name: 'Luján, Ben Ray', party: 'Democratic', state: 'NM', chamber: 'Senate', phone: '(202) 224-6621', website: 'https://www.lujan.senate.gov', yearsInOffice: 4, nextElection: '2026' }
    ],
    'NY': [
      { bioguideId: 'S000148', name: 'Schumer, Charles E.', party: 'Democratic', state: 'NY', chamber: 'Senate', phone: '(202) 224-6542', website: 'https://www.schumer.senate.gov', yearsInOffice: 25, nextElection: '2028' },
      { bioguideId: 'G000555', name: 'Gillibrand, Kirsten E.', party: 'Democratic', state: 'NY', chamber: 'Senate', phone: '(202) 224-4451', website: 'https://www.gillibrand.senate.gov', yearsInOffice: 15, nextElection: '2030' }
    ],
    'NC': [
      { bioguideId: 'B001135', name: 'Burr, Richard', party: 'Republican', state: 'NC', chamber: 'Senate', phone: '(202) 224-3154', website: 'https://www.burr.senate.gov', yearsInOffice: 20, nextElection: '2028' },
      { bioguideId: 'T000476', name: 'Tillis, Thomas', party: 'Republican', state: 'NC', chamber: 'Senate', phone: '(202) 224-6342', website: 'https://www.tillis.senate.gov', yearsInOffice: 10, nextElection: '2026' }
    ],
    'ND': [
      { bioguideId: 'H001061', name: 'Hoeven, John', party: 'Republican', state: 'ND', chamber: 'Senate', phone: '(202) 224-2551', website: 'https://www.hoeven.senate.gov', yearsInOffice: 14, nextElection: '2028' },
      { bioguideId: 'C001096', name: 'Cramer, Kevin', party: 'Republican', state: 'ND', chamber: 'Senate', phone: '(202) 224-2043', website: 'https://www.cramer.senate.gov', yearsInOffice: 6, nextElection: '2030' }
    ],
    'OH': [
      { bioguideId: 'B000944', name: 'Brown, Sherrod', party: 'Democratic', state: 'OH', chamber: 'Senate', phone: '(202) 224-2315', website: 'https://www.brown.senate.gov', yearsInOffice: 18, nextElection: '2030' },
      { bioguideId: 'V000137', name: 'Vance, J. D.', party: 'Republican', state: 'OH', chamber: 'Senate', phone: '(202) 224-3353', website: 'https://www.vance.senate.gov', yearsInOffice: 2, nextElection: '2028' }
    ],
    'OK': [
      { bioguideId: 'I000024', name: 'Inhofe, James M.', party: 'Republican', state: 'OK', chamber: 'Senate', phone: '(202) 224-4721', website: 'https://www.inhofe.senate.gov', yearsInOffice: 28, nextElection: '2026' },
      { bioguideId: 'L000575', name: 'Lankford, James', party: 'Republican', state: 'OK', chamber: 'Senate', phone: '(202) 224-5754', website: 'https://www.lankford.senate.gov', yearsInOffice: 10, nextElection: '2028' }
    ],
    'OR': [
      { bioguideId: 'W000779', name: 'Wyden, Ron', party: 'Democratic', state: 'OR', chamber: 'Senate', phone: '(202) 224-5244', website: 'https://www.wyden.senate.gov', yearsInOffice: 28, nextElection: '2028' },
      { bioguideId: 'M001176', name: 'Merkley, Jeff', party: 'Democratic', state: 'OR', chamber: 'Senate', phone: '(202) 224-3753', website: 'https://www.merkley.senate.gov', yearsInOffice: 16, nextElection: '2026' }
    ],
    'PA': [
      { bioguideId: 'C001070', name: 'Casey, Robert P.', party: 'Democratic', state: 'PA', chamber: 'Senate', phone: '(202) 224-6324', website: 'https://www.casey.senate.gov', yearsInOffice: 18, nextElection: '2030' },
      { bioguideId: 'F000469', name: 'Fetterman, John', party: 'Democratic', state: 'PA', chamber: 'Senate', phone: '(202) 224-4254', website: 'https://www.fetterman.senate.gov', yearsInOffice: 2, nextElection: '2028' }
    ],
    'RI': [
      { bioguideId: 'R000122', name: 'Reed, Jack', party: 'Democratic', state: 'RI', chamber: 'Senate', phone: '(202) 224-4642', website: 'https://www.reed.senate.gov', yearsInOffice: 27, nextElection: '2026' },
      { bioguideId: 'W000802', name: 'Whitehouse, Sheldon', party: 'Democratic', state: 'RI', chamber: 'Senate', phone: '(202) 224-2921', website: 'https://www.whitehouse.senate.gov', yearsInOffice: 18, nextElection: '2030' }
    ],
    'SC': [
      { bioguideId: 'G000359', name: 'Graham, Lindsey', party: 'Republican', state: 'SC', chamber: 'Senate', phone: '(202) 224-5972', website: 'https://www.lgraham.senate.gov', yearsInOffice: 21, nextElection: '2026' },
      { bioguideId: 'S001184', name: 'Scott, Tim', party: 'Republican', state: 'SC', chamber: 'Senate', phone: '(202) 224-6121', website: 'https://www.scott.senate.gov', yearsInOffice: 11, nextElection: '2028' }
    ],
    'SD': [
      { bioguideId: 'T000250', name: 'Thune, John', party: 'Republican', state: 'SD', chamber: 'Senate', phone: '(202) 224-2321', website: 'https://www.thune.senate.gov', yearsInOffice: 20, nextElection: '2028' },
      { bioguideId: 'R000605', name: 'Rounds, Mike', party: 'Republican', state: 'SD', chamber: 'Senate', phone: '(202) 224-5842', website: 'https://www.rounds.senate.gov', yearsInOffice: 10, nextElection: '2026' }
    ],
    'TN': [
      { bioguideId: 'A000360', name: 'Alexander, Lamar', party: 'Republican', state: 'TN', chamber: 'Senate', phone: '(202) 224-4944', website: 'https://www.alexander.senate.gov', yearsInOffice: 18, nextElection: '2026' },
      { bioguideId: 'B001243', name: 'Blackburn, Marsha', party: 'Republican', state: 'TN', chamber: 'Senate', phone: '(202) 224-3344', website: 'https://www.blackburn.senate.gov', yearsInOffice: 6, nextElection: '2030' }
    ],
    'TX': [
      { bioguideId: 'C001056', name: 'Cornyn, John', party: 'Republican', state: 'TX', chamber: 'Senate', phone: '(202) 224-2934', website: 'https://www.cornyn.senate.gov', yearsInOffice: 21, nextElection: '2026' },
      { bioguideId: 'C001098', name: 'Cruz, Ted', party: 'Republican', state: 'TX', chamber: 'Senate', phone: '(202) 224-5922', website: 'https://www.cruz.senate.gov', yearsInOffice: 12, nextElection: '2030' }
    ],
    'UT': [
      { bioguideId: 'L000577', name: 'Lee, Mike', party: 'Republican', state: 'UT', chamber: 'Senate', phone: '(202) 224-5444', website: 'https://www.lee.senate.gov', yearsInOffice: 14, nextElection: '2028' },
      { bioguideId: 'R000615', name: 'Romney, Mitt', party: 'Republican', state: 'UT', chamber: 'Senate', phone: '(202) 224-5251', website: 'https://www.romney.senate.gov', yearsInOffice: 6, nextElection: '2030' }
    ],
    'VT': [
      { bioguideId: 'L000174', name: 'Leahy, Patrick J.', party: 'Democratic', state: 'VT', chamber: 'Senate', phone: '(202) 224-4242', website: 'https://www.leahy.senate.gov', yearsInOffice: 48, nextElection: '2028' },
      { bioguideId: 'S000033', name: 'Sanders, Bernard', party: 'Independent', state: 'VT', chamber: 'Senate', phone: '(202) 224-5141', website: 'https://www.sanders.senate.gov', yearsInOffice: 17, nextElection: '2030' }
    ],
    'VA': [
      { bioguideId: 'W000805', name: 'Warner, Mark R.', party: 'Democratic', state: 'VA', chamber: 'Senate', phone: '(202) 224-2023', website: 'https://www.warner.senate.gov', yearsInOffice: 15, nextElection: '2026' },
      { bioguideId: 'K000384', name: 'Kaine, Tim', party: 'Democratic', state: 'VA', chamber: 'Senate', phone: '(202) 224-4024', website: 'https://www.kaine.senate.gov', yearsInOffice: 8, nextElection: '2030' }
    ],
    'WA': [
      { bioguideId: 'M001111', name: 'Murray, Patty', party: 'Democratic', state: 'WA', chamber: 'Senate', phone: '(202) 224-2621', website: 'https://www.murray.senate.gov', yearsInOffice: 31, nextElection: '2028' },
      { bioguideId: 'C000127', name: 'Cantwell, Maria', party: 'Democratic', state: 'WA', chamber: 'Senate', phone: '(202) 224-3441', website: 'https://www.cantwell.senate.gov', yearsInOffice: 23, nextElection: '2030' }
    ],
    'WV': [
      { bioguideId: 'M001183', name: 'Manchin, Joe', party: 'Democratic', state: 'WV', chamber: 'Senate', phone: '(202) 224-3954', website: 'https://www.manchin.senate.gov', yearsInOffice: 14, nextElection: '2030' },
      { bioguideId: 'C001047', name: 'Capito, Shelley Moore', party: 'Republican', state: 'WV', chamber: 'Senate', phone: '(202) 224-6472', website: 'https://www.capito.senate.gov', yearsInOffice: 10, nextElection: '2026' }
    ],
    'WI': [
      { bioguideId: 'J000293', name: 'Johnson, Ron', party: 'Republican', state: 'WI', chamber: 'Senate', phone: '(202) 224-5323', website: 'https://www.ronjohnson.senate.gov', yearsInOffice: 14, nextElection: '2028' },
      { bioguideId: 'B001230', name: 'Baldwin, Tammy', party: 'Democratic', state: 'WI', chamber: 'Senate', phone: '(202) 224-5653', website: 'https://www.baldwin.senate.gov', yearsInOffice: 12, nextElection: '2030' }
    ],
    'WY': [
      { bioguideId: 'B001261', name: 'Barrasso, John', party: 'Republican', state: 'WY', chamber: 'Senate', phone: '(202) 224-6441', website: 'https://www.barrasso.senate.gov', yearsInOffice: 17, nextElection: '2030' },
      { bioguideId: 'L000571', name: 'Lummis, Cynthia M.', party: 'Republican', state: 'WY', chamber: 'Senate', phone: '(202) 224-3424', website: 'https://www.lummis.senate.gov', yearsInOffice: 4, nextElection: '2026' }
    ]
  };
  
  return senatorMappings[state] || [];
}

/**
 * Generate mock representatives for testing/fallback
 */
function getMockRepresentatives(state: string, district?: string): Representative[] {
  const currentYear = new Date().getFullYear();
  const representatives: Representative[] = [];
  
  // Mock Senators
  representatives.push(
    {
      bioguideId: `${state}001`,
      name: `John Smith`,
      party: 'Democratic',
      state: state,
      chamber: 'Senate',
      phone: '(202) 224-0001',
      website: `https://smith.senate.gov`,
      yearsInOffice: 8,
      nextElection: '2028',
      imageUrl: '/api/placeholder/200/250'
    },
    {
      bioguideId: `${state}002`,
      name: `Jane Johnson`,
      party: 'Republican',
      state: state,
      chamber: 'Senate',
      phone: '(202) 224-0002',
      website: `https://johnson.senate.gov`,
      yearsInOffice: 4,
      nextElection: '2026',
      imageUrl: '/api/placeholder/200/250'
    }
  );
  
  // Mock House Representative
  if (district) {
    representatives.push({
      bioguideId: `${state}H${district}`,
      name: `Michael Davis`,
      party: 'Democratic',
      state: state,
      district: district,
      chamber: 'House',
      phone: '(202) 225-0001',
      website: `https://davis.house.gov`,
      yearsInOffice: 6,
      nextElection: currentYear % 2 === 0 ? currentYear.toString() : (currentYear + 1).toString(),
      imageUrl: '/api/placeholder/200/250'
    });
  }
  
  return representatives;
}