import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params;
  const { searchParams } = new URL(request.url);
  
  const status = searchParams.get('status');
  const chamber = searchParams.get('chamber');
  const subject = searchParams.get('subject');
  const sponsor = searchParams.get('sponsor');
  const limit = parseInt(searchParams.get('limit') || '50');
  const page = parseInt(searchParams.get('page') || '1');

  if (!state || state.length !== 2) {
    return NextResponse.json(
      { error: 'Valid state abbreviation is required' },
      { status: 400 }
    );
  }

  try {
    const cacheKey = `state-bills-${state.toUpperCase()}-${status || 'all'}-${chamber || 'all'}-${subject || 'all'}-${sponsor || 'all'}`;
    const TTL_30_MINUTES = 30 * 60 * 1000;

    const billsData = await cachedFetch(
      cacheKey,
      async (): Promise<StateBillsResponse> => {
        console.log(`Fetching state bills for: ${state.toUpperCase()}`);

        // In production, this would integrate with OpenStates.org API
        const stateInfo = getStateInfo(state.toUpperCase());
        const bills = generateMockBills(state.toUpperCase(), stateInfo);

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
          stateName: stateInfo.name,
          session: '2024 Regular Session',
          bills,
          totalCount: bills.length,
          lastUpdated: new Date().toISOString(),
          filters: {},
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
    console.error('State Bills API Error:', error);
    
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

function getStateInfo(state: string) {
  const stateNames: Record<string, string> = {
    'CA': 'California',
    'TX': 'Texas',
    'NY': 'New York',
    'FL': 'Florida',
    'MI': 'Michigan',
    'PA': 'Pennsylvania',
    'IL': 'Illinois',
    'OH': 'Ohio',
    'GA': 'Georgia',
    'NC': 'North Carolina'
  };

  return {
    name: stateNames[state] || 'Generic State'
  };
}

function generateMockBills(state: string, stateInfo: any): StateBill[] {
  const bills: StateBill[] = [];
  
  const billTypes = [
    { prefix: 'SB', chamber: 'upper' as const },
    { prefix: 'HB', chamber: 'lower' as const },
    { prefix: 'SR', chamber: 'upper' as const },
    { prefix: 'HR', chamber: 'lower' as const }
  ];

  const subjects = [
    'Healthcare', 'Education', 'Transportation', 'Environment', 'Public Safety',
    'Budget', 'Labor', 'Housing', 'Energy', 'Agriculture', 'Veterans Affairs',
    'Criminal Justice', 'Mental Health', 'Economic Development', 'Technology'
  ];

  const statuses: StateBill['status'][] = [
    'introduced', 'committee', 'floor', 'passed_chamber', 'other_chamber',
    'passed_both', 'signed', 'vetoed', 'dead'
  ];

  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Maria'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

  for (let i = 1; i <= 100; i++) {
    const billType = billTypes[Math.floor(Math.random() * billTypes.length)];
    const billSubjects = subjects.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1);
    const primarySubject = billSubjects[0];
    
    const sponsorName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    const sponsorParty: 'Democratic' | 'Republican' | 'Independent' = Math.random() > 0.5 ? 'Democratic' : 'Republican';
    
    // Generate cosponsors
    const cosponsors = Array.from({ length: Math.floor(Math.random() * 5) }, () => ({
      name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
      party: Math.random() > 0.5 ? 'Democratic' : 'Republican' as const,
      district: `District ${Math.floor(Math.random() * 50) + 1}`
    }));

    const introducedDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const lastActionDate = new Date(introducedDate.getTime() + Math.random() * 180 * 24 * 60 * 60 * 1000);

    const bill: StateBill = {
      id: `${state}-${billType.prefix}-${i}`,
      billNumber: `${billType.prefix} ${i}`,
      title: generateBillTitle(primarySubject),
      summary: generateBillSummary(primarySubject),
      chamber: billType.chamber,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      sponsor: {
        name: sponsorName,
        party: sponsorParty,
        district: `District ${Math.floor(Math.random() * 50) + 1}`
      },
      cosponsors,
      committee: Math.random() > 0.3 ? {
        name: `${primarySubject} Committee`,
        chairman: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`
      } : undefined,
      introducedDate: introducedDate.toISOString().split('T')[0],
      lastActionDate: lastActionDate.toISOString().split('T')[0],
      lastAction: generateLastAction(),
      subjects: billSubjects,
      trackingCount: Math.floor(Math.random() * 500),
      fullTextUrl: `https://legislature.${state.toLowerCase()}.gov/bills/${billType.prefix}${i}/fulltext`
    };

    // Add votes for bills that have progressed
    if (['floor', 'passed_chamber', 'other_chamber', 'passed_both', 'signed'].includes(bill.status)) {
      bill.votes = [{
        chamber: bill.chamber,
        date: new Date(lastActionDate.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'passage',
        yesVotes: Math.floor(Math.random() * 80) + 40,
        noVotes: Math.floor(Math.random() * 40) + 10,
        absentVotes: Math.floor(Math.random() * 10),
        result: Math.random() > 0.3 ? 'pass' : 'fail'
      }];
    }

    bills.push(bill);
  }

  return bills.sort((a, b) => new Date(b.lastActionDate).getTime() - new Date(a.lastActionDate).getTime());
}

function generateBillTitle(subject: string): string {
  const templates = {
    'Healthcare': [
      'An Act to Improve Healthcare Access',
      'Healthcare Affordability and Quality Act',
      'Mental Health Services Enhancement Act'
    ],
    'Education': [
      'Public Education Funding Enhancement Act',
      'Student Safety and Security Act',
      'Higher Education Accessibility Act'
    ],
    'Transportation': [
      'Infrastructure Investment and Modernization Act',
      'Public Transit Improvement Act',
      'Highway Safety Enhancement Act'
    ],
    'Environment': [
      'Clean Energy Development Act',
      'Environmental Protection and Conservation Act',
      'Renewable Energy Incentives Act'
    ],
    'Public Safety': [
      'Community Safety and Crime Prevention Act',
      'Police Reform and Accountability Act',
      'Emergency Response Enhancement Act'
    ]
  };

  const titleOptions = templates[subject as keyof typeof templates] || [
    `${subject} Reform Act`,
    `${subject} Enhancement Act`,
    `${subject} Modernization Act`
  ];

  return titleOptions[Math.floor(Math.random() * titleOptions.length)];
}

function generateBillSummary(subject: string): string {
  const summaries = {
    'Healthcare': 'This bill establishes new programs to improve healthcare access and affordability for state residents.',
    'Education': 'This bill provides additional funding and resources for public education improvements.',
    'Transportation': 'This bill allocates funding for infrastructure improvements and public transit expansion.',
    'Environment': 'This bill establishes environmental protection measures and clean energy initiatives.',
    'Public Safety': 'This bill enhances public safety measures and emergency response capabilities.'
  };

  return summaries[subject as keyof typeof summaries] || `This bill addresses important ${subject.toLowerCase()} policy issues for the state.`;
}

function generateLastAction(): string {
  const actions = [
    'Referred to committee',
    'Committee hearing scheduled',
    'Passed committee',
    'Scheduled for floor vote',
    'Passed chamber',
    'Sent to other chamber',
    'Signed by governor',
    'Returned to committee',
    'Amended in committee'
  ];

  return actions[Math.floor(Math.random() * actions.length)];
}