import { NextRequest, NextResponse } from 'next/server'
import { cachedFetch } from '@/lib/cache'
import { getFECIdFromBioguide, hasFECMapping } from '@/lib/data/bioguide-fec-mapping'
import { structuredLogger } from '@/lib/logging/logger'
import { monitorExternalApi } from '@/lib/monitoring/telemetry'

// State name to abbreviation mapping
const STATE_ABBR: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC'
};

function getStateAbbreviation(state: string): string {
  // If it's already an abbreviation, return as is
  if (state.length === 2) return state;
  // Otherwise look up the abbreviation
  return STATE_ABBR[state] || state;
}

interface FECCandidate {
  candidate_id: string;
  name: string;
  party: string;
  office: string;
  state: string;
  district?: string;
  election_years: number[];
  cycles: number[];
}

interface ContributionData {
  contributor_name: string;
  contributor_employer?: string;
  contributor_occupation?: string;
  contribution_receipt_amount: number;
  contribution_receipt_date: string;
  committee_name: string;
}

interface ExpenditureData {
  committee_name: string;
  disbursement_description: string;
  disbursement_amount: number;
  disbursement_date: string;
  recipient_name: string;
  category_code?: string;
  category_code_full?: string;
}

interface FinancialSummary {
  cycle: number;
  total_receipts: number;
  total_disbursements: number;
  cash_on_hand_end_period: number;
  individual_contributions: number;
  pac_contributions: number;
  party_contributions: number;
  candidate_contributions: number;
}

interface CampaignFinanceData {
  candidate_info: FECCandidate | null;
  financial_summary: FinancialSummary[];
  recent_contributions: ContributionData[];
  recent_expenditures: ExpenditureData[];
  top_contributors: Array<{
    name: string;
    total_amount: number;
    count: number;
  }>;
  top_expenditure_categories: Array<{
    category: string;
    total_amount: number;
    count: number;
  }>;
}

// Enhanced helper function to find FEC candidate by name and state
async function findFECCandidate(representativeName: string, state: string, district?: string): Promise<FECCandidate | null> {
  return cachedFetch(
    `fec-candidate-${representativeName}-${state}-${district || 'senate'}`,
    async () => {
      try {
        const currentCycle = new Date().getFullYear() + (new Date().getFullYear() % 2 === 0 ? 0 : 1);
        const previousCycle = currentCycle - 2;
        
        // Enhanced name cleaning for better FEC matching
        let searchName = representativeName
          .replace(/^(Rep\.|Representative|Senator|Sen\.)\s+/i, '')
          .replace(/\s+(Jr\.|Sr\.|III|II|IV|Jr|Sr)\s*$/i, '') // Remove suffixes
          .replace(/,\s*.*$/, '') // Remove everything after comma
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        // Generate comprehensive name variants for better matching
        const nameVariants = new Set([searchName]);
        
        // Handle "Last, First" format
        if (representativeName.includes(',')) {
          const parts = representativeName.split(',').map(p => p.trim());
          if (parts.length >= 2) {
            const lastName = parts[0].replace(/^(Rep\.|Representative|Senator|Sen\.)\s+/i, '');
            const firstName = parts[1].split(' ')[0]; // Get first name only
            nameVariants.add(`${firstName} ${lastName}`);
            nameVariants.add(lastName);
            nameVariants.add(`${lastName}, ${firstName}`);
            nameVariants.add(`${lastName.toUpperCase()}, ${firstName.toUpperCase()}`);
          }
        } else {
          // Handle "First Last" format
          const nameParts = searchName.split(' ');
          if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];
            nameVariants.add(lastName); // Last name only
            nameVariants.add(`${lastName}, ${firstName}`); // Formal format
            nameVariants.add(`${lastName.toUpperCase()}, ${firstName.toUpperCase()}`); // Uppercase formal
            
            // Add middle initials variants
            if (nameParts.length > 2) {
              const middleInitial = nameParts[1].charAt(0);
              nameVariants.add(`${firstName} ${middleInitial} ${lastName}`);
              nameVariants.add(`${lastName}, ${firstName} ${middleInitial}`);
              nameVariants.add(`${lastName.toUpperCase()}, ${firstName.toUpperCase()} ${middleInitial.toUpperCase()}`);
            }
          }
        }
        
        structuredLogger.info('Enhanced FEC candidate search', {
          originalName: representativeName,
          searchVariants: Array.from(nameVariants),
          state,
          district,
          cycles: [currentCycle, previousCycle]
        })
        
        // Try each name variant with improved search parameters
        for (const name of Array.from(nameVariants)) {
          // Try current cycle first, then previous cycles (up to 3 cycles back)
          for (const cycle of [currentCycle, previousCycle, currentCycle - 4]) {
            const searchParams = new URLSearchParams({
              api_key: process.env.FEC_API_KEY!,
              name: name, // Use 'name' parameter for better matching
              state: state,
              cycle: cycle.toString(),
              sort: '-total_receipts', // Sort by fundraising to get active candidates first
              per_page: '50' // Increased to catch more potential matches
            });
            
            // Add office filter with better logic
            if (district && district !== '00') {
              searchParams.append('office', 'H');
              searchParams.append('district', district.padStart(2, '0'));
            } else {
              searchParams.append('office', 'S');
            }
            
            // Add candidate status filter for active candidates
            searchParams.append('candidate_status', 'C'); // Active candidates
            
            const response = await fetch(
              `https://api.open.fec.gov/v1/candidates/search/?${searchParams}`
            );

            const monitor = monitorExternalApi('fec', 'candidate-search', response.url)
            
            if (!response.ok) {
              monitor.end(false, response.status)
              structuredLogger.warn('FEC search failed', {
                name,
                cycle,
                status: response.status
              })
              continue
            }

            const data = await response.json()
            monitor.end(true, 200)
            structuredLogger.info('FEC candidate search results', {
              name,
              cycle,
              resultsCount: data.results?.length || 0
            })
            
            if (data.results && data.results.length > 0) {
              // Enhanced candidate matching with multiple criteria
              const candidates = data.results;
              
              // Priority 1: Exact name, office, and district match
              let candidate = candidates.find((c: any) => {
                const nameMatch = isNameMatch(c.name, representativeName, name);
                const officeMatch = district ? c.office === 'H' : c.office === 'S';
                const locationMatch = district ? 
                  (c.district?.padStart(2, '0') === district.padStart(2, '0') && c.state === state) :
                  c.state === state;
                
                return nameMatch && officeMatch && locationMatch;
              });
              
              // Priority 2: Name and office match (relaxed district)
              if (!candidate) {
                candidate = candidates.find((c: any) => {
                  const nameMatch = isNameMatch(c.name, representativeName, name);
                  const officeMatch = district ? c.office === 'H' : c.office === 'S';
                  const stateMatch = c.state === state;
                  
                  return nameMatch && officeMatch && stateMatch;
                });
              }
              
              // Priority 3: Best name match with state
              if (!candidate && candidates.length > 0) {
                candidate = candidates
                  .filter((c: any) => c.state === state)
                  .sort((a: any, b: any) => {
                    const aScore = getNameMatchScore(a.name, representativeName);
                    const bScore = getNameMatchScore(b.name, representativeName);
                    return bScore - aScore; // Higher score first
                  })[0];
              }

              if (candidate) {
                structuredLogger.info('Found matching FEC candidate', {
                  candidateName: candidate.name,
                  candidateId: candidate.candidate_id,
                  searchName,
                  cycle
                })
                return {
                  candidate_id: candidate.candidate_id,
                  name: candidate.name,
                  party: candidate.party,
                  office: candidate.office,
                  state: candidate.state,
                  district: candidate.district,
                  election_years: candidate.election_years || [],
                  cycles: candidate.cycles || []
                };
              }
              
              // If no exact match but we have results for the right state and office type
              const fallbackCandidate = data.results.find((c: any) => {
                return c.state === state && 
                       ((district && c.office === 'H') || (!district && c.office === 'S'));
              });
              
              if (fallbackCandidate) {
                structuredLogger.info('Using fallback FEC candidate', {
                  candidateName: fallbackCandidate.name,
                  candidateId: fallbackCandidate.candidate_id,
                  searchName
                })
                return {
                  candidate_id: fallbackCandidate.candidate_id,
                  name: fallbackCandidate.name,
                  party: fallbackCandidate.party,
                  office: fallbackCandidate.office,
                  state: fallbackCandidate.state,
                  district: fallbackCandidate.district,
                  election_years: fallbackCandidate.election_years || [],
                  cycles: fallbackCandidate.cycles || []
                };
              }
            }
          }
        }

        structuredLogger.warn('No FEC candidate found', { searchName, state })
        return null
      } catch (error) {
        structuredLogger.error('Error finding FEC candidate', error as Error, {
          representativeName,
          state,
          district
        })
        return null
      }
    },
    60 * 60 * 1000 // 1 hour cache
  );
}

// Helper function to check if names match
function isNameMatch(fecName: string, originalName: string, searchName: string): boolean {
  const normalize = (name: string) => name.toLowerCase().replace(/[.,\-]/g, '').replace(/\s+/g, ' ').trim();
  
  const normalizedFec = normalize(fecName);
  const normalizedOriginal = normalize(originalName);
  const normalizedSearch = normalize(searchName);
  
  // Exact match
  if (normalizedFec === normalizedSearch || normalizedFec === normalizedOriginal) {
    return true;
  }
  
  // Check last name matches
  const fecLastName = normalizedFec.split(' ').pop() || '';
  const originalLastName = normalizedOriginal.split(' ').pop() || '';
  const searchLastName = normalizedSearch.split(' ').pop() || '';
  
  if (fecLastName.length > 2 && (fecLastName === originalLastName || fecLastName === searchLastName)) {
    // If last names match, check if first names or initials match
    const fecFirstName = normalizedFec.split(' ')[0] || '';
    const originalFirstName = normalizedOriginal.split(' ')[0] || '';
    const searchFirstName = normalizedSearch.split(' ')[0] || '';
    
    // First name match or initial match
    if (fecFirstName === originalFirstName || fecFirstName === searchFirstName ||
        fecFirstName.charAt(0) === originalFirstName.charAt(0) || 
        fecFirstName.charAt(0) === searchFirstName.charAt(0)) {
      return true;
    }
  }
  
  // Check partial matches for longer names
  return normalizedFec.includes(normalizedSearch) ||
         normalizedSearch.includes(normalizedFec) ||
         normalizedFec.includes(normalizedOriginal.split(' ').pop() || '') ||
         normalizedOriginal.includes(normalizedFec.split(' ').pop() || '');
}

// Helper function to score name matches
function getNameMatchScore(fecName: string, originalName: string): number {
  const normalize = (name: string) => name.toLowerCase().replace(/[.,\-]/g, '').trim();
  
  const fecNorm = normalize(fecName);
  const origNorm = normalize(originalName);
  
  let score = 0;
  
  // Exact match gets highest score
  if (fecNorm === origNorm) score += 100;
  
  // Split names into parts
  const fecParts = fecNorm.split(' ');
  const origParts = origNorm.split(' ');
  
  const fecFirst = fecParts[0] || '';
  const fecLast = fecParts[fecParts.length - 1] || '';
  const origFirst = origParts[0] || '';
  const origLast = origParts[origParts.length - 1] || '';
  
  // Last name exact match
  if (fecLast === origLast && fecLast.length > 2) score += 50;
  
  // First name exact match
  if (fecFirst === origFirst && fecFirst.length > 1) score += 30;
  
  // First name initial match
  if (fecFirst.charAt(0) === origFirst.charAt(0) && fecFirst.charAt(0) !== '') score += 15;
  
  // Partial last name matches
  if (fecLast.includes(origLast) && origLast.length > 2) score += 20;
  if (origLast.includes(fecLast) && fecLast.length > 2) score += 20;
  
  // Middle name/initial matches
  if (fecParts.length > 2 && origParts.length > 2) {
    const fecMiddle = fecParts[1];
    const origMiddle = origParts[1];
    if (fecMiddle === origMiddle) score += 10;
    if (fecMiddle.charAt(0) === origMiddle.charAt(0)) score += 5;
  }
  
  // Penalize length differences
  const lengthDiff = Math.abs(fecNorm.length - origNorm.length);
  if (lengthDiff > 10) score -= 10;
  
  return Math.max(0, score);
}

async function getFinancialSummary(candidateId: string): Promise<FinancialSummary[]> {
  const currentCycle = new Date().getFullYear() + (new Date().getFullYear() % 2 === 0 ? 0 : 1);
  const cacheKey = `fec-summary-${candidateId}-${currentCycle}`;
  
  return cachedFetch(
    cacheKey,
    async () => {
      try {
        structuredLogger.info('Fetching financial summary from FEC', { candidateId, currentCycle });
        
        const response = await fetch(
          `https://api.open.fec.gov/v1/candidate/${candidateId}/totals/?api_key=${process.env.FEC_API_KEY}&cycle=${currentCycle}&cycle=${currentCycle - 2}&sort=-cycle`,
          { 
            headers: {
              'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
              'Accept': 'application/json'
            }
          }
        );

        const monitor = monitorExternalApi('fec', 'candidate-financials', response.url);

        if (!response.ok) {
          monitor.end(false, response.status);
          throw new Error(`FEC financial summary failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        monitor.end(true, 200);
        
        structuredLogger.info('Successfully fetched financial summary', {
          candidateId,
          cycles: data.results?.length || 0
        });
        
        return data.results?.map((total: any) => ({
          cycle: total.cycle,
          total_receipts: total.receipts || 0,
          total_disbursements: total.disbursements || 0,
          cash_on_hand_end_period: total.cash_on_hand_end_period || 0,
          individual_contributions: total.individual_contributions || 0,
          pac_contributions: total.other_political_committee_contributions || 0,
          party_contributions: total.political_party_committee_contributions || 0,
          candidate_contributions: total.candidate_contribution || 0
        })) || [];
      } catch (error) {
        structuredLogger.error('Error fetching financial summary', error as Error, {
          candidateId,
          cacheKey
        })
        return []
      }
    },
    2 * 60 * 60 * 1000 // 2 hours cache for financial summaries (less frequent updates)
  );
}

async function getContributions(candidateId: string): Promise<ContributionData[]> {
  const cacheKey = `fec-contributions-${candidateId}-${new Date().toISOString().split('T')[0]}`; // Daily cache
  
  return cachedFetch(
    cacheKey,
    async () => {
      try {
        structuredLogger.info('Fetching contributions from FEC', { candidateId });
        
        const response = await fetch(
          `https://api.open.fec.gov/v1/schedules/schedule_a/?api_key=${process.env.FEC_API_KEY}&candidate_id=${candidateId}&sort=-contribution_receipt_date&per_page=20`,
          {
            headers: {
              'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
              'Accept': 'application/json'
            }
          }
        );

        const monitor = monitorExternalApi('fec', 'contributions', response.url);

        if (!response.ok) {
          monitor.end(false, response.status);
          throw new Error(`FEC contributions failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        monitor.end(true, 200);
        
        structuredLogger.info('Successfully fetched contributions', {
          candidateId,
          contributionsCount: data.results?.length || 0
        });
        
        return data.results?.map((contrib: any) => ({
          contributor_name: contrib.contributor_name || 'Unknown',
          contributor_employer: contrib.contributor_employer,
          contributor_occupation: contrib.contributor_occupation,
          contribution_receipt_amount: contrib.contribution_receipt_amount || 0,
          contribution_receipt_date: contrib.contribution_receipt_date,
          committee_name: contrib.committee_name || 'Unknown'
        })) || [];
      } catch (error) {
        structuredLogger.error('Error fetching contributions', error as Error, {
          candidateId,
          cacheKey
        })
        return []
      }
    },
    60 * 60 * 1000 // 1 hour cache for contributions (more frequent updates)
  );
}

async function getExpenditures(candidateId: string): Promise<ExpenditureData[]> {
  const cacheKey = `fec-expenditures-${candidateId}-${new Date().toISOString().split('T')[0]}`; // Daily cache
  
  return cachedFetch(
    cacheKey,
    async () => {
      try {
        structuredLogger.info('Fetching expenditures from FEC', { candidateId });
        
        const response = await fetch(
          `https://api.open.fec.gov/v1/schedules/schedule_b/?api_key=${process.env.FEC_API_KEY}&candidate_id=${candidateId}&sort=-disbursement_date&per_page=20`,
          {
            headers: {
              'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
              'Accept': 'application/json'
            }
          }
        );

        const monitor = monitorExternalApi('fec', 'expenditures', response.url);

        if (!response.ok) {
          monitor.end(false, response.status);
          throw new Error(`FEC expenditures failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        monitor.end(true, 200);
        
        structuredLogger.info('Successfully fetched expenditures', {
          candidateId,
          expendituresCount: data.results?.length || 0
        });
        
        return data.results?.map((exp: any) => ({
          committee_name: exp.committee_name || 'Unknown',
          disbursement_description: exp.disbursement_description || 'Unknown',
          disbursement_amount: exp.disbursement_amount || 0,
          disbursement_date: exp.disbursement_date,
          recipient_name: exp.recipient_name || 'Unknown',
          category_code: exp.category_code,
          category_code_full: exp.category_code_full
        })) || [];
      } catch (error) {
        structuredLogger.error('Error fetching expenditures', error as Error, {
          candidateId,
          cacheKey
        })
        return []
      }
    },
    60 * 60 * 1000 // 1 hour cache for expenditures (more frequent updates)
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;

  if (!bioguideId) {
    return NextResponse.json(
      { error: 'Bioguide ID is required' },
      { status: 400 }
    );
  }

  try {
    // First, try to get representative info to search FEC
    let representative;
    try {
      const repResponse = await fetch(
        `${request.nextUrl.origin}/api/representative/${bioguideId}`
      );
      
      if (repResponse.ok) {
        representative = await repResponse.json();
      } else {
        // Fallback representative data
        representative = {
          name: `Representative ${bioguideId}`,
          state: 'MI',
          district: null,
          bioguideId
        };
      }
    } catch (error) {
      structuredLogger.warn('Could not fetch representative info, using fallback', {
        bioguideId,
        error: (error as Error).message
      })
      // Fallback representative data
      representative = {
        name: `Representative ${bioguideId}`,
        state: 'MI',
        district: null,
        bioguideId
      };
    }

    // Enhanced FEC data retrieval with better error handling
    let enhancedRep: any = null;
    if (process.env.FEC_API_KEY) {
      let fecCandidate: FECCandidate | null = null;
      let dataSource = 'fallback';
      
      try {
        // Strategy 1: Enhanced direct mapping using congress-legislators data
        let mappedFECId = getFECIdFromBioguide(bioguideId);
        
        // Try to get enhanced representative data for better FEC matching
        try {
          const { getEnhancedRepresentative } = await import('@/lib/congress-legislators');
          enhancedRep = await getEnhancedRepresentative(bioguideId);
          
          // Use FEC IDs from congress-legislators if available
          if (enhancedRep?.ids?.fec && enhancedRep.ids.fec.length > 0) {
            mappedFECId = enhancedRep.ids.fec[0]; // Use the first FEC ID
            structuredLogger.info('Found enhanced FEC ID from congress-legislators', {
              bioguideId,
              fecId: mappedFECId,
              totalFECIds: enhancedRep.ids.fec.length
            });
          }
        } catch (enhancedError) {
          structuredLogger.warn('Could not get enhanced representative data', {
            bioguideId,
            error: (enhancedError as Error).message
          });
        }
        
        if (mappedFECId) {
          structuredLogger.info('Found direct FEC mapping', {
            bioguideId,
            fecId: mappedFECId,
            source: enhancedRep ? 'congress-legislators' : 'bioguide-mapping'
          })
          
          try {
            const candidateResponse = await fetch(
              `https://api.open.fec.gov/v1/candidate/${mappedFECId}/?api_key=${process.env.FEC_API_KEY}`
            );
            
            if (candidateResponse.ok) {
              const data = await candidateResponse.json();
              if (data.results && data.results.length > 0) {
                const candidate = data.results[0];
                fecCandidate = {
                  candidate_id: candidate.candidate_id,
                  name: candidate.name,
                  party: candidate.party,
                  office: candidate.office,
                  state: candidate.state,
                  district: candidate.district,
                  election_years: candidate.election_years || [],
                  cycles: candidate.cycles || []
                };
                dataSource = enhancedRep ? 'congress-legislators-mapping' : 'direct-mapping';
                structuredLogger.info('Successfully retrieved FEC data via direct mapping', {
                  bioguideId,
                  candidateId: fecCandidate.candidate_id,
                  mappingSource: dataSource
                });
              }
            }
          } catch (mappingError) {
            structuredLogger.warn('Direct FEC mapping failed, trying search', {
              bioguideId,
              fecId: mappedFECId,
              error: (mappingError as Error).message
            });
          }
        }
        
        // Strategy 2: Enhanced name-based search using congress-legislators data (fallback)
        if (!fecCandidate) {
          const stateAbbr = getStateAbbreviation(representative.state);
          
          // Use enhanced name data if available
          const searchName = enhancedRep?.fullName?.official || 
                           enhancedRep?.name || 
                           representative.name;
          
          fecCandidate = await findFECCandidate(
            searchName,
            stateAbbr,
            representative.district
          );
          
          if (fecCandidate) {
            dataSource = 'enhanced-name-search';
            structuredLogger.info('Found FEC candidate via enhanced name search', {
              bioguideId,
              candidateId: fecCandidate.candidate_id,
              searchName,
              originalName: representative.name,
              usedEnhancedData: !!enhancedRep
            });
          }
        }
      } catch (searchError) {
        structuredLogger.error('FEC search failed', searchError as Error, {
          bioguideId,
          representativeName: representative.name
        });
      }

      if (fecCandidate) {
        // Fetch financial data
        const [financialSummary, contributions, expenditures] = await Promise.all([
          getFinancialSummary(fecCandidate.candidate_id),
          getContributions(fecCandidate.candidate_id),
          getExpenditures(fecCandidate.candidate_id)
        ]);

        // Process top contributors with enhanced categorization
        const contributorTotals = contributions.reduce((acc: any, contrib) => {
          const name = contrib.contributor_name;
          if (!acc[name]) {
            acc[name] = { 
              name, 
              total_amount: 0, 
              count: 0,
              employer: contrib.contributor_employer,
              occupation: contrib.contributor_occupation
            };
          }
          acc[name].total_amount += contrib.contribution_receipt_amount;
          acc[name].count += 1;
          return acc;
        }, {});

        const topContributors = Object.values(contributorTotals)
          .sort((a: any, b: any) => b.total_amount - a.total_amount)
          .slice(0, 10);

        // Helper function to categorize expenditures intelligently
        function categorizeExpenditure(exp: ExpenditureData): string {
          const desc = (exp.disbursement_description || '').toLowerCase();
          const category = (exp.category_code_full || '').toLowerCase();
          
          // Media and advertising
          if (desc.includes('media') || desc.includes('advertising') || desc.includes('ad') || 
              desc.includes('television') || desc.includes('radio') || desc.includes('digital') ||
              category.includes('media') || category.includes('advertising')) {
            return 'Media and Advertising';
          }
          
          // Staff and payroll
          if (desc.includes('salary') || desc.includes('payroll') || desc.includes('staff') || 
              desc.includes('consultant') || desc.includes('wage') || 
              category.includes('salary') || category.includes('payroll')) {
            return 'Staff and Payroll';
          }
          
          // Events and fundraising
          if (desc.includes('event') || desc.includes('fundrais') || desc.includes('venue') ||
              desc.includes('catering') || desc.includes('reception') ||
              category.includes('event') || category.includes('fundraising')) {
            return 'Events and Fundraising';
          }
          
          // Travel and transportation
          if (desc.includes('travel') || desc.includes('hotel') || desc.includes('airline') ||
              desc.includes('transportation') || desc.includes('mileage') ||
              category.includes('travel')) {
            return 'Travel and Transportation';
          }
          
          // Office operations
          if (desc.includes('office') || desc.includes('rent') || desc.includes('utilities') ||
              desc.includes('phone') || desc.includes('equipment') || desc.includes('supplies') ||
              category.includes('office') || category.includes('rent')) {
            return 'Office Operations';
          }
          
          // Legal and compliance
          if (desc.includes('legal') || desc.includes('attorney') || desc.includes('compliance') ||
              desc.includes('filing') || desc.includes('audit') ||
              category.includes('legal') || category.includes('compliance')) {
            return 'Legal and Compliance';
          }
          
          // Digital and technology
          if (desc.includes('website') || desc.includes('digital') || desc.includes('technology') ||
              desc.includes('software') || desc.includes('online') || desc.includes('email') ||
              category.includes('digital') || category.includes('technology')) {
            return 'Digital and Technology';
          }
          
          // Use original category if available, otherwise use description or 'Other'
          return exp.category_code_full || 
                 (exp.disbursement_description && exp.disbursement_description !== 'Unknown' 
                   ? exp.disbursement_description 
                   : 'Other');
        }

        // Process expenditure categories with intelligent categorization
        const categoryTotals = expenditures.reduce((acc: any, exp) => {
          const category = categorizeExpenditure(exp);
          if (!acc[category]) {
            acc[category] = { category, total_amount: 0, count: 0 };
          }
          acc[category].total_amount += exp.disbursement_amount;
          acc[category].count += 1;
          return acc;
        }, {});

        const topCategories = Object.values(categoryTotals)
          .sort((a: any, b: any) => b.total_amount - a.total_amount)
          .slice(0, 10);

        const financeData: CampaignFinanceData = {
          candidate_info: fecCandidate,
          financial_summary: financialSummary,
          recent_contributions: contributions.slice(0, 10),
          recent_expenditures: expenditures.slice(0, 10),
          top_contributors: topContributors as any,
          top_expenditure_categories: topCategories as any
        };

        return NextResponse.json({
          ...financeData,
          metadata: {
            dataSource: 'fec.gov',
            retrievalMethod: dataSource,
            mappingUsed: hasFECMapping(bioguideId),
            enhancedDataUsed: !!enhancedRep,
            candidateInfo: {
              fecId: fecCandidate.candidate_id,
              name: fecCandidate.name,
              office: fecCandidate.office,
              state: fecCandidate.state,
              district: fecCandidate.district
            },
            dataQuality: {
              financialSummary: financialSummary.length,
              recentContributions: contributions.length,
              recentExpenditures: expenditures.length,
              topContributors: topContributors.length,
              topCategories: topCategories.length
            },
            lastUpdated: new Date().toISOString(),
            cacheInfo: 'Real FEC data with enhanced congress-legislators matching',
            dataSources: ['fec.gov', ...(enhancedRep ? ['congress-legislators'] : [])]
          }
        });
      }
    }

    // Enhanced fallback mock data matching mockup scale
    const mockFinanceData: CampaignFinanceData = {
      candidate_info: null,
      financial_summary: [
        {
          cycle: 2024,
          total_receipts: 2500000,
          total_disbursements: 1800000,
          cash_on_hand_end_period: 700000,
          individual_contributions: 1750000,
          pac_contributions: 500000,
          party_contributions: 150000,
          candidate_contributions: 100000
        },
        {
          cycle: 2022,
          total_receipts: 1950000,
          total_disbursements: 1850000,
          cash_on_hand_end_period: 100000,
          individual_contributions: 1400000,
          pac_contributions: 350000,
          party_contributions: 125000,
          candidate_contributions: 75000
        }
      ],
      recent_contributions: [
        {
          contributor_name: 'John Smith',
          contributor_employer: 'Tech Corp',
          contributor_occupation: 'Software Engineer',
          contribution_receipt_amount: 2800,
          contribution_receipt_date: '2024-01-15',
          committee_name: `${representative.name} for Congress`
        },
        {
          contributor_name: 'Healthcare Workers PAC',
          contribution_receipt_amount: 5000,
          contribution_receipt_date: '2024-01-10',
          committee_name: `${representative.name} for Congress`
        },
        {
          contributor_name: 'Mary Johnson',
          contributor_employer: 'Local Business Inc',
          contributor_occupation: 'Business Owner',
          contribution_receipt_amount: 1500,
          contribution_receipt_date: '2024-01-08',
          committee_name: `${representative.name} for Congress`
        }
      ],
      recent_expenditures: [
        {
          committee_name: `${representative.name} for Congress`,
          disbursement_description: 'Media Advertisement',
          disbursement_amount: 15000,
          disbursement_date: '2024-01-20',
          recipient_name: 'Digital Media Solutions'
        },
        {
          committee_name: `${representative.name} for Congress`,
          disbursement_description: 'Office Rent',
          disbursement_amount: 3500,
          disbursement_date: '2024-01-15',
          recipient_name: 'Downtown Office Complex'
        },
        {
          committee_name: `${representative.name} for Congress`,
          disbursement_description: 'Staff Salaries',
          disbursement_amount: 12000,
          disbursement_date: '2024-01-15',
          recipient_name: 'Campaign Staff'
        }
      ],
      top_contributors: [
        { name: 'Education Industry', total_amount: 325000, count: 87 },
        { name: 'Technology Companies', total_amount: 280000, count: 62 },
        { name: 'Healthcare Professionals', total_amount: 245000, count: 134 },
        { name: 'Labor Organizations', total_amount: 190000, count: 45 },
        { name: 'Environmental Groups', total_amount: 165000, count: 78 },
        { name: 'Financial Services', total_amount: 140000, count: 33 },
        { name: 'Small Business Coalition', total_amount: 125000, count: 156 },
        { name: 'Women\'s Rights PAC', total_amount: 95000, count: 89 }
      ],
      top_expenditure_categories: [
        { category: 'Media and Advertising', total_amount: 450000, count: 45 },
        { category: 'Staff Salaries', total_amount: 320000, count: 24 },
        { category: 'Digital Marketing', total_amount: 180000, count: 67 },
        { category: 'Event Expenses', total_amount: 125000, count: 28 },
        { category: 'Office Operations', total_amount: 95000, count: 156 },
        { category: 'Travel and Transportation', total_amount: 75000, count: 89 },
        { category: 'Polling and Research', total_amount: 65000, count: 12 },
        { category: 'Legal and Compliance', total_amount: 45000, count: 18 }
      ]
    };

    return NextResponse.json({
      ...mockFinanceData,
      metadata: {
        dataSource: 'mock' as const,
        retrievalMethod: 'fallback',
        mappingUsed: false,
        dataQuality: {
          financialSummary: mockFinanceData.financial_summary.length,
          recentContributions: mockFinanceData.recent_contributions.length,
          recentExpenditures: mockFinanceData.recent_expenditures.length,
          topContributors: mockFinanceData.top_contributors.length,
          topCategories: mockFinanceData.top_expenditure_categories.length
        },
        lastUpdated: new Date().toISOString(),
        cacheInfo: 'Sample data for demonstration'
      }
    });

  } catch (error) {
    structuredLogger.error('Finance API error', error as Error, { bioguideId })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}