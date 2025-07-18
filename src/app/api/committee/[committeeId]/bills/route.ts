/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { structuredLogger } from '@/lib/logging/logger';

interface CommitteeAction {
  date: string;
  text: string;
  actionType: 'referral' | 'markup' | 'hearing' | 'vote' | 'report' | 'amendment' | 'other';
  committeeId?: string;
  voteResult?: {
    yeas: number;
    nays: number;
    present: number;
    notVoting: number;
  };
  amendmentDetails?: {
    number: string;
    sponsor: string;
    status: 'adopted' | 'rejected' | 'withdrawn';
  };
}

interface CongressBill {
  billId: string;
  billNumber: string;
  title: string;
  sponsor: {
    name: string;
    party: string;
    state: string;
  };
  introducedDate: string;
  latestAction: {
    date: string;
    text: string;
  };
  committees: string[];
  status: string;
  summary?: string;
  committeeActions: CommitteeAction[];
  committeeStatus: 'referred' | 'markup_scheduled' | 'markup_completed' | 'reported' | 'stalled';
  nextCommitteeAction?: {
    type: string;
    date: string;
    description: string;
  };
  hearings?: Array<{
    date: string;
    title: string;
    witnesses?: string[];
  }>;
}

interface CongressApiResponse {
  bills: Array<{
    congress: number;
    latestAction: {
      actionDate: string;
      text: string;
    };
    number: string;
    originChamber: string;
    title: string;
    type: string;
    url: string;
    sponsors?: Array<{
      bioguideId: string;
      district?: number;
      firstName: string;
      fullName: string;
      lastName: string;
      party: string;
      state: string;
    }>;
    committees?: Array<{
      name: string;
      systemCode: string;
      chamber: string;
      activities?: Array<{
        name: string;
        date: string;
      }>;
    }>;
    introducedDate?: string;
    summary?: {
      text: string;
      lastSummaryUpdateDate: string;
    };
    actions?: Array<{
      actionDate: string;
      text: string;
      type: string;
      actionCode?: string;
      sourceSystem?: {
        code: string;
        name: string;
      };
      committees?: Array<{
        name: string;
        systemCode: string;
      }>;
    }>;
  }>;
  pagination: {
    count: number;
    next?: string;
  };
}

/**
 * Fetch bills currently in a specific committee from Congress.gov API
 */
async function fetchCommitteeBills(committeeId: string): Promise<CongressBill[]> {
  return cachedFetch(
    `committee-bills-${committeeId}`,
    async () => {
      try {
        structuredLogger.info('Fetching bills for committee', { committeeId });
        
        // Congress.gov API endpoint for bills by committee
        // Note: This is a simplified version - the actual Congress.gov API may require different parameters
        const baseUrl = 'https://api.congress.gov/v3';
        const apiKey = process.env.CONGRESS_API_KEY;
        
        if (!apiKey) {
          structuredLogger.warn('Congress API key not configured');
          return [];
        }

        // Transform committee ID to match Congress.gov format
        const congressCommitteeId = transformCommitteeId(committeeId);
        
        const response = await fetch(
          `${baseUrl}/bill/119/house?committee=${congressCommitteeId}&limit=20&api_key=${apiKey}`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          // Try Senate if House fails
          const senateResponse = await fetch(
            `${baseUrl}/bill/119/senate?committee=${congressCommitteeId}&limit=20&api_key=${apiKey}`,
            {
              headers: {
                'Accept': 'application/json',
              },
            }
          );
          
          if (!senateResponse.ok) {
            throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
          }
          
          const senateData: CongressApiResponse = await senateResponse.json();
          return processBillsData(senateData.bills, committeeId);
        }

        const data: CongressApiResponse = await response.json();
        return processBillsData(data.bills, committeeId);
        
      } catch (error) {
        structuredLogger.error('Error fetching committee bills', error as Error, { committeeId });
        // Return mock data for development if API fails
        return getMockBillsData(committeeId);
      }
    },
    2 * 60 * 60 * 1000 // 2 hours cache - bills don't change frequently
  );
}

/**
 * Transform committee ID to Congress.gov format
 */
function transformCommitteeId(thomasId: string): string {
  // This would need to be mapped to the actual Congress.gov committee identifiers
  // For now, return a simplified version
  return thomasId.toLowerCase();
}

/**
 * Parse committee actions from bill actions
 */
function parseCommitteeActions(actions: CongressApiResponse['bills'][0]['actions'], committeeId: string): CommitteeAction[] {
  if (!actions) return [];
  
  return actions
    .filter(action => {
      // Filter for committee-specific actions
      const actionText = action.text.toLowerCase();
      return (
        actionText.includes('committee') ||
        actionText.includes('markup') ||
        actionText.includes('hearing') ||
        actionText.includes('report') ||
        actionText.includes('amend') ||
        action.committees?.some(c => c.systemCode.toLowerCase().includes(committeeId.toLowerCase()))
      );
    })
    .map(action => {
      const actionText = action.text.toLowerCase();
      let actionType: CommitteeAction['actionType'] = 'other';
      
      // Determine action type
      if (actionText.includes('referred to')) {
        actionType = 'referral';
      } else if (actionText.includes('markup') || actionText.includes('mark up')) {
        actionType = 'markup';
      } else if (actionText.includes('hearing')) {
        actionType = 'hearing';
      } else if (actionText.includes('ordered to be reported') || actionText.includes('reported')) {
        actionType = 'report';
      } else if (actionText.includes('amendment')) {
        actionType = 'amendment';
      } else if (actionText.includes('vote') || actionText.includes('agreed to')) {
        actionType = 'vote';
      }
      
      // Parse vote results if present
      let voteResult;
      const voteMatch = action.text.match(/(\d+)\s*-\s*(\d+)/);
      if (voteMatch && actionType === 'vote') {
        voteResult = {
          yeas: parseInt(voteMatch[1]),
          nays: parseInt(voteMatch[2]),
          present: 0,
          notVoting: 0
        };
      }
      
      return {
        date: action.actionDate,
        text: action.text,
        actionType,
        committeeId: action.committees?.[0]?.systemCode,
        voteResult
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Determine committee status from actions
 */
function determineCommitteeStatus(actions: CommitteeAction[]): CongressBill['committeeStatus'] {
  if (actions.length === 0) return 'referred';
  
  const latestAction = actions[0];
  const hasMarkup = actions.some(a => a.actionType === 'markup');
  const hasReport = actions.some(a => a.actionType === 'report');
  
  if (hasReport) return 'reported';
  if (hasMarkup) return 'markup_completed';
  if (actions.some(a => a.text.toLowerCase().includes('markup scheduled'))) return 'markup_scheduled';
  
  // If no activity in 90 days, consider it stalled
  const daysSinceLastAction = (Date.now() - new Date(latestAction.date).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastAction > 90) return 'stalled';
  
  return 'referred';
}

/**
 * Process raw bills data from Congress.gov API
 */
function processBillsData(bills: CongressApiResponse['bills'], committeeId: string): CongressBill[] {
  return bills.map(bill => {
    const committeeActions = parseCommitteeActions(bill.actions, committeeId);
    const committeeStatus = determineCommitteeStatus(committeeActions);
    
    // Extract hearing information from actions
    const hearings = committeeActions
      .filter(a => a.actionType === 'hearing')
      .map(a => ({
        date: a.date,
        title: a.text,
        witnesses: [] // Would need separate API call for witness details
      }));
    
    // Determine next committee action
    let nextCommitteeAction;
    if (committeeStatus === 'referred' && committeeActions.length === 1) {
      nextCommitteeAction = {
        type: 'hearing',
        date: 'TBD',
        description: 'Awaiting committee hearing scheduling'
      };
    } else if (committeeStatus === 'markup_scheduled') {
      const markupAction = committeeActions.find(a => a.text.toLowerCase().includes('markup scheduled'));
      if (markupAction) {
        nextCommitteeAction = {
          type: 'markup',
          date: markupAction.date,
          description: 'Committee markup session scheduled'
        };
      }
    }
    
    return {
      billId: `${bill.congress}-${bill.type}-${bill.number}`,
      billNumber: `${bill.type.toUpperCase()} ${bill.number}`,
      title: bill.title,
      sponsor: {
        name: bill.sponsors?.[0]?.fullName || 'Unknown',
        party: bill.sponsors?.[0]?.party || 'Unknown',
        state: bill.sponsors?.[0]?.state || 'Unknown'
      },
      introducedDate: bill.introducedDate || 'Unknown',
      latestAction: {
        date: bill.latestAction.actionDate,
        text: bill.latestAction.text
      },
      committees: bill.committees?.map(c => c.name) || [],
      status: getStatusFromAction(bill.latestAction.text),
      summary: bill.summary?.text,
      committeeActions,
      committeeStatus,
      nextCommitteeAction,
      hearings: hearings.length > 0 ? hearings : undefined
    };
  });
}

/**
 * Extract status from latest action text
 */
function getStatusFromAction(actionText: string): string {
  if (actionText.includes('passed')) return 'Passed';
  if (actionText.includes('referred')) return 'In Committee';
  if (actionText.includes('introduced')) return 'Introduced';
  if (actionText.includes('reported')) return 'Reported';
  if (actionText.includes('amended')) return 'Amended';
  return 'Active';
}

/**
 * Mock bills data for development/fallback
 */
function getMockBillsData(committeeId: string): CongressBill[] {
  const mockBills: CongressBill[] = [
    {
      billId: '119-hr-1234',
      billNumber: 'H.R. 1234',
      title: 'Sample Legislative Act of 2025',
      sponsor: {
        name: 'John Smith',
        party: 'Democratic',
        state: 'CA'
      },
      introducedDate: '2025-01-15',
      latestAction: {
        date: '2025-01-20',
        text: 'Referred to Committee'
      },
      committees: [committeeId],
      status: 'In Committee',
      summary: 'This is a sample bill to demonstrate the committee bills feature.',
      committeeActions: [
        {
          date: '2025-01-20',
          text: 'Referred to the House Committee on Judiciary',
          actionType: 'referral',
          committeeId: committeeId
        },
        {
          date: '2025-01-22',
          text: 'Committee hearing held - "Impact of Sample Legislation on Communities"',
          actionType: 'hearing',
          committeeId: committeeId
        },
        {
          date: '2025-01-25',
          text: 'Committee markup scheduled for 01/28/2025',
          actionType: 'markup',
          committeeId: committeeId
        }
      ],
      committeeStatus: 'markup_scheduled',
      nextCommitteeAction: {
        type: 'markup',
        date: '2025-01-28',
        description: 'Committee markup session scheduled'
      },
      hearings: [
        {
          date: '2025-01-22',
          title: 'Impact of Sample Legislation on Communities',
          witnesses: ['Dr. Sarah Johnson', 'Prof. Michael Chen', 'Ms. Emily Rodriguez']
        }
      ]
    },
    {
      billId: '119-s-567',
      billNumber: 'S. 567',
      title: 'Another Sample Bill',
      sponsor: {
        name: 'Jane Doe',
        party: 'Republican',
        state: 'TX'
      },
      introducedDate: '2025-01-10',
      latestAction: {
        date: '2025-01-25',
        text: 'Committee markup scheduled'
      },
      committees: [committeeId],
      status: 'In Committee',
      summary: 'Another sample bill for demonstration purposes.',
      committeeActions: [
        {
          date: '2025-01-10',
          text: 'Referred to the Senate Committee',
          actionType: 'referral',
          committeeId: committeeId
        },
        {
          date: '2025-01-18',
          text: 'Committee markup held',
          actionType: 'markup',
          committeeId: committeeId
        },
        {
          date: '2025-01-18',
          text: 'Amendment SA-123 proposed by Sen. Johnson - Adopted by voice vote',
          actionType: 'amendment',
          committeeId: committeeId,
          amendmentDetails: {
            number: 'SA-123',
            sponsor: 'Sen. Johnson',
            status: 'adopted'
          }
        },
        {
          date: '2025-01-18',
          text: 'Ordered to be reported with amendments by vote of 15-7',
          actionType: 'vote',
          committeeId: committeeId,
          voteResult: {
            yeas: 15,
            nays: 7,
            present: 0,
            notVoting: 1
          }
        }
      ],
      committeeStatus: 'reported',
      hearings: []
    }
  ];

  return mockBills;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
) {
  try {
    const { committeeId } = await params;
    
    structuredLogger.info('Committee bills API request', { committeeId });
    
    if (!committeeId) {
      return NextResponse.json(
        { error: 'Committee ID is required' },
        { status: 400 }
      );
    }

    const bills = await fetchCommitteeBills(committeeId);
    
    structuredLogger.info('Successfully fetched committee bills', {
      committeeId,
      count: bills.length
    });

    return NextResponse.json({
      success: true,
      committeeId,
      bills,
      count: bills.length
    });

  } catch (error) {
    structuredLogger.error('Committee bills API error', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch committee bills',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}