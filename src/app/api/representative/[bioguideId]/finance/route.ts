import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';

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

// Helper function to find FEC candidate by name and state
async function findFECCandidate(representativeName: string, state: string, district?: string): Promise<FECCandidate | null> {
  return cachedFetch(
    `fec-candidate-${representativeName}-${state}-${district || 'senate'}`,
    async () => {
      try {
        const currentCycle = new Date().getFullYear() + (new Date().getFullYear() % 2 === 0 ? 0 : 1);
        
        // Clean up the name for search
        let searchName = representativeName
          .replace(/^(Rep\.|Representative|Senator|Sen\.)\s+/, '')
          .replace(/,.*$/, '') // Remove everything after comma (like "Last, First")
          .trim();
        
        // Try different name formats if needed
        const nameVariants = [searchName];
        
        // If name is in "Last, First" format, also try "First Last"
        if (searchName.includes(',')) {
          const parts = searchName.split(',').map(p => p.trim());
          if (parts.length === 2) {
            nameVariants.push(`${parts[1]} ${parts[0]}`);
          }
        }
        
        console.log(`Searching FEC for candidate: ${searchName} in ${state}${district ? `-${district}` : ''}`);
        
        for (const name of nameVariants) {
          const response = await fetch(
            `https://api.open.fec.gov/v1/candidates/search/?api_key=${process.env.FEC_API_KEY}&q=${encodeURIComponent(name)}&state=${state}&cycle=${currentCycle}&sort=-election_years`
          );

          if (!response.ok) {
            console.error(`FEC search failed for ${name}:`, response.status);
            continue;
          }

          const data = await response.json();
          console.log(`Found ${data.results?.length || 0} FEC candidates for ${name}`);
          
          if (data.results && data.results.length > 0) {
            // Try to find exact match based on office and district
            const candidate = data.results.find((c: any) => {
              const isHouse = c.office === 'H' && district;
              const isSenate = c.office === 'S' && !district;
              const matchesDistrict = !district || c.district === district.padStart(2, '0');
              
              return (isHouse || isSenate) && matchesDistrict && c.state === state;
            });

            if (candidate) {
              console.log(`Found matching FEC candidate: ${candidate.name} (${candidate.candidate_id})`);
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
            
            // If no exact match, try the first result that matches state and current cycle
            const fallbackCandidate = data.results.find((c: any) => c.state === state && c.cycles?.includes(currentCycle));
            if (fallbackCandidate) {
              console.log(`Using fallback FEC candidate: ${fallbackCandidate.name} (${fallbackCandidate.candidate_id})`);
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

        console.log(`No FEC candidate found for ${searchName} in ${state}`);
        return null;
      } catch (error) {
        console.error('Error finding FEC candidate:', error);
        return null;
      }
    },
    60 * 60 * 1000 // 1 hour cache
  );
}

async function getFinancialSummary(candidateId: string): Promise<FinancialSummary[]> {
  return cachedFetch(
    `fec-summary-${candidateId}`,
    async () => {
      try {
        const currentCycle = new Date().getFullYear() + (new Date().getFullYear() % 2 === 0 ? 0 : 1);
        const response = await fetch(
          `https://api.open.fec.gov/v1/candidate/${candidateId}/totals/?api_key=${process.env.FEC_API_KEY}&cycle=${currentCycle}&cycle=${currentCycle - 2}&sort=-cycle`
        );

        if (!response.ok) {
          throw new Error('FEC financial summary failed');
        }

        const data = await response.json();
        
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
        console.error('Error fetching financial summary:', error);
        return [];
      }
    },
    30 * 60 * 1000 // 30 minutes cache
  );
}

async function getContributions(candidateId: string): Promise<ContributionData[]> {
  try {
    const response = await fetch(
      `https://api.open.fec.gov/v1/schedules/schedule_a/?api_key=${process.env.FEC_API_KEY}&candidate_id=${candidateId}&sort=-contribution_receipt_date&per_page=20`
    );

    if (!response.ok) {
      throw new Error('FEC contributions failed');
    }

    const data = await response.json();
    
    return data.results?.map((contrib: any) => ({
      contributor_name: contrib.contributor_name || 'Unknown',
      contributor_employer: contrib.contributor_employer,
      contributor_occupation: contrib.contributor_occupation,
      contribution_receipt_amount: contrib.contribution_receipt_amount || 0,
      contribution_receipt_date: contrib.contribution_receipt_date,
      committee_name: contrib.committee_name || 'Unknown'
    })) || [];
  } catch (error) {
    console.error('Error fetching contributions:', error);
    return [];
  }
}

async function getExpenditures(candidateId: string): Promise<ExpenditureData[]> {
  try {
    const response = await fetch(
      `https://api.open.fec.gov/v1/schedules/schedule_b/?api_key=${process.env.FEC_API_KEY}&candidate_id=${candidateId}&sort=-disbursement_date&per_page=20`
    );

    if (!response.ok) {
      throw new Error('FEC expenditures failed');
    }

    const data = await response.json();
    
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
    console.error('Error fetching expenditures:', error);
    return [];
  }
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
      console.log('Could not fetch representative info, using fallback');
      // Fallback representative data
      representative = {
        name: `Representative ${bioguideId}`,
        state: 'MI',
        district: null,
        bioguideId
      };
    }

    if (process.env.FEC_API_KEY) {
      // Find FEC candidate (convert state to abbreviation)
      const stateAbbr = getStateAbbreviation(representative.state);
      const fecCandidate = await findFECCandidate(
        representative.name,
        stateAbbr,
        representative.district
      );

      if (fecCandidate) {
        // Fetch financial data
        const [financialSummary, contributions, expenditures] = await Promise.all([
          getFinancialSummary(fecCandidate.candidate_id),
          getContributions(fecCandidate.candidate_id),
          getExpenditures(fecCandidate.candidate_id)
        ]);

        // Process top contributors
        const contributorTotals = contributions.reduce((acc: any, contrib) => {
          const name = contrib.contributor_name;
          if (!acc[name]) {
            acc[name] = { name, total_amount: 0, count: 0 };
          }
          acc[name].total_amount += contrib.contribution_receipt_amount;
          acc[name].count += 1;
          return acc;
        }, {});

        const topContributors = Object.values(contributorTotals)
          .sort((a: any, b: any) => b.total_amount - a.total_amount)
          .slice(0, 10);

        // Process expenditure categories
        const categoryTotals = expenditures.reduce((acc: any, exp) => {
          const category = exp.category_code_full || exp.disbursement_description || 'Other';
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

        return NextResponse.json(financeData);
      }
    }

    // Fallback mock data
    const mockFinanceData: CampaignFinanceData = {
      candidate_info: null,
      financial_summary: [
        {
          cycle: 2024,
          total_receipts: 1250000,
          total_disbursements: 980000,
          cash_on_hand_end_period: 270000,
          individual_contributions: 850000,
          pac_contributions: 300000,
          party_contributions: 75000,
          candidate_contributions: 25000
        },
        {
          cycle: 2022,
          total_receipts: 890000,
          total_disbursements: 845000,
          cash_on_hand_end_period: 45000,
          individual_contributions: 650000,
          pac_contributions: 180000,
          party_contributions: 45000,
          candidate_contributions: 15000
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
        { name: 'Healthcare Workers PAC', total_amount: 15000, count: 3 },
        { name: 'Education Fund', total_amount: 12500, count: 2 },
        { name: 'John Smith', total_amount: 5600, count: 2 },
        { name: 'Local Business Coalition', total_amount: 5000, count: 1 }
      ],
      top_expenditure_categories: [
        { category: 'Media and Advertising', total_amount: 125000, count: 15 },
        { category: 'Staff Salaries', total_amount: 85000, count: 12 },
        { category: 'Office Expenses', total_amount: 25000, count: 8 },
        { category: 'Travel and Events', total_amount: 18000, count: 6 }
      ]
    };

    return NextResponse.json(mockFinanceData);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}