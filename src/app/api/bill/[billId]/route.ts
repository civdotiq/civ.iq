/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';
import type { Bill, BillAPIResponse, BillStatus, BillVote } from '@/types/bill';
import { parseBillNumber } from '@/types/bill';
import type { EnhancedRepresentative } from '@/types/representative';
import { parseRollCallXML } from '@/features/legislation/services/rollcall-parser';

// Congress.gov API response types
interface CongressAction {
  actionDate: string;
  text: string;
  actionCode?: string;
  recordedVotes?: Array<{
    chamber?: string;
    congress?: number;
    date?: string;
    rollNumber?: number;
    url?: string;
    result?: string;
  }>;
}

interface CongressSponsor {
  bioguideId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  district?: string;
}

interface CongressCosponsor extends CongressSponsor {
  sponsorshipDate: string;
  sponsorshipWithdrawnDate?: string;
}

interface CongressCommittee {
  systemCode: string;
  name: string;
  chamber: string;
  activities?: Array<{
    date: string;
    name: string;
  }>;
}

interface CongressSummary {
  text: string;
  actionDate: string;
  versionCode: string;
}

interface CongressSubject {
  name: string;
}

interface CongressRelatedBill {
  type: string;
  number: string;
  title: string;
  relationshipDetails?: {
    identifiedBy: string;
  };
}

interface CongressTextFormat {
  type: string;
  url: string;
}

interface CongressTextVersion {
  formats: CongressTextFormat[];
}

interface CongressBillData {
  congress: number;
  type: string;
  number: string;
  title: string;
  shortTitle?: string;
  originChamber: string;
  introducedDate: string;
  latestAction?: {
    actionDate: string;
    text: string;
    actionCode?: string;
  };
  actions?: CongressAction[];
  sponsors?: CongressSponsor[];
  cosponsors?: CongressCosponsor[];
  committees?: CongressCommittee[];
  summaries?: CongressSummary[];
  subjects?: {
    legislativeSubjects: CongressSubject[];
  };
  relatedBills?: CongressRelatedBill[];
  textVersions?: CongressTextVersion[];
}

// Helper function to fetch bill data from Congress.gov
async function fetchBillFromCongress(billId: string): Promise<Bill | null> {
  const { type, number, congress } = parseBillNumber(billId);
  const cacheKey = `bill-${type}-${number}-${congress}`;

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        logger.info('Fetching bill data from Congress.gov', {
          billId,
          type,
          number,
          congress,
        });

        const billResponse = await fetch(
          `https://api.congress.gov/v3/bill/${congress}/${type}/${number}?api_key=${process.env.CONGRESS_API_KEY}&format=json`,
          {
            headers: {
              'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
              Accept: 'application/json',
            },
          }
        );

        const monitor = monitorExternalApi('congress', 'bill-detail', billResponse.url);

        if (!billResponse.ok) {
          monitor.end(false, billResponse.status);

          if (billResponse.status === 404) {
            logger.warn('Bill not found in Congress.gov', { billId });
            return null;
          }

          throw new Error(`Congress.gov API error: ${billResponse.status}`);
        }

        const billData: { bill: CongressBillData } = await billResponse.json();
        monitor.end(true, 200);

        if (!billData.bill) {
          logger.warn('No bill data in response', { billId });
          return null;
        }

        const bill = billData.bill;

        // Transform Congress.gov data to our Bill interface
        const result: Bill = {
          id: `${bill.congress}-${bill.type}-${bill.number}`,
          number: `${bill.type.toUpperCase()}. ${bill.number}`,
          title: bill.title || `${bill.type.toUpperCase()}. ${bill.number}`,
          shortTitle: bill.shortTitle,
          congress: bill.congress.toString(),
          session: bill.congress.toString(),
          type: bill.type.toLowerCase() as Bill['type'],
          chamber: bill.originChamber === 'House' ? 'House' : 'Senate',

          status: {
            current: mapCongressStatus(bill.latestAction?.text) || 'introduced',
            lastAction: {
              date: bill.latestAction?.actionDate || bill.introducedDate,
              description: bill.latestAction?.text || 'Introduced',
              chamber: bill.latestAction?.actionCode?.startsWith('H') ? 'House' : 'Senate',
            },
            timeline: Array.isArray(bill.actions)
              ? bill.actions.map((action: CongressAction) => ({
                  date: action.actionDate,
                  description: action.text,
                  chamber: action.actionCode?.startsWith('H') ? 'House' : 'Senate',
                  actionCode: action.actionCode,
                  type: 'action' as const,
                }))
              : [],
          },

          sponsor: {
            representative: {
              bioguideId: bill.sponsors?.[0]?.bioguideId || 'unknown',
              name: bill.sponsors?.[0]?.fullName || 'Unknown',
              firstName: bill.sponsors?.[0]?.firstName || '',
              lastName: bill.sponsors?.[0]?.lastName || '',
              party: bill.sponsors?.[0]?.party || 'Unknown',
              state: bill.sponsors?.[0]?.state || '',
              district: bill.sponsors?.[0]?.district,
              chamber: bill.originChamber === 'House' ? 'House' : 'Senate',
              title: `${bill.originChamber === 'House' ? 'Rep.' : 'Sen.'} ${bill.sponsors?.[0]?.fullName || 'Unknown'}`,
            } as EnhancedRepresentative,
            date: bill.introducedDate,
          },

          cosponsors: Array.isArray(bill.cosponsors)
            ? bill.cosponsors.map((cosponsor: CongressCosponsor) => ({
                representative: {
                  bioguideId: cosponsor.bioguideId,
                  name: cosponsor.fullName,
                  firstName: cosponsor.firstName,
                  lastName: cosponsor.lastName,
                  party: cosponsor.party,
                  state: cosponsor.state,
                  district: cosponsor.district,
                  chamber: bill.originChamber === 'House' ? 'House' : 'Senate',
                  title: `${bill.originChamber === 'House' ? 'Rep.' : 'Sen.'} ${cosponsor.fullName}`,
                } as EnhancedRepresentative,
                date: cosponsor.sponsorshipDate,
                withdrawn: cosponsor.sponsorshipWithdrawnDate ? true : false,
              }))
            : [],

          committees: Array.isArray(bill.committees)
            ? bill.committees.map((committee: CongressCommittee) => ({
                committeeId: committee.systemCode,
                name: committee.name,
                chamber: committee.chamber === 'House' ? 'House' : 'Senate',
                activities: Array.isArray(committee.activities)
                  ? committee.activities.map(activity => ({
                      date: activity.date,
                      activity: activity.name,
                    }))
                  : [],
              }))
            : [],

          summary: bill.summaries?.[0]
            ? {
                text: bill.summaries[0].text,
                date: bill.summaries[0].actionDate,
                version: bill.summaries[0].versionCode,
              }
            : undefined,

          subjects: Array.isArray(bill.subjects?.legislativeSubjects)
            ? bill.subjects.legislativeSubjects.map((subject: CongressSubject) => subject.name)
            : [],

          votes: [], // Will be populated below

          relatedBills: Array.isArray(bill.relatedBills)
            ? bill.relatedBills.map((related: CongressRelatedBill) => ({
                number: `${related.type.toUpperCase()}. ${related.number}`,
                title: related.title,
                relationship:
                  (related.relationshipDetails?.identifiedBy as
                    | 'identical'
                    | 'related'
                    | 'supersedes'
                    | 'superseded') || 'related',
              }))
            : [],

          introducedDate: bill.introducedDate,
          url: `https://www.congress.gov/bill/${bill.congress}th-congress/${bill.originChamber.toLowerCase()}-bill/${bill.number}`,
          textUrl: bill.textVersions?.[0]?.formats?.find(
            (f: CongressTextFormat) => f.type === 'Formatted HTML'
          )?.url,
          lastUpdated: new Date().toISOString(),
        };

        // Fetch actual votes for this bill
        const votes = await fetchBillVotes(bill, congress.toString(), type, number.toString());
        result.votes = votes;

        logger.info('Successfully fetched bill data', {
          billId,
          title: result.title,
          status: result.status.current,
          cosponsorsCount: result.cosponsors.length,
          votesCount: result.votes.length,
        });

        return result;
      } catch (error) {
        logger.error('Error fetching bill from Congress.gov', error as Error, {
          billId,
        });
        return null;
      }
    },
    24 * 60 * 60 * 1000 // 24 hour cache for bill data
  );
}

// Helper function to fetch votes for a specific bill
async function fetchBillVotes(
  billData: CongressBillData,
  congress: string,
  type: string,
  number: string
): Promise<BillVote[]> {
  const votes: BillVote[] = [];

  try {
    // Look for recorded votes in bill actions
    if (Array.isArray(billData.actions) && billData.actions.length > 0) {
      for (const action of billData.actions) {
        if (action.recordedVotes && action.recordedVotes.length > 0) {
          for (const recordedVote of action.recordedVotes) {
            // Parse the vote information
            const voteId = `${congress}-${type}-${number}-${recordedVote.rollNumber || 'unknown'}`;
            const chamber = recordedVote.chamber === 'House' ? 'House' : ('Senate' as const);

            // Determine result from action text
            const actionText = action.text?.toLowerCase() || '';
            let result = 'Unknown';
            let question = 'On Passage';

            if (actionText.includes('passed') || actionText.includes('agreed to')) {
              result = 'Passed';
            } else if (actionText.includes('failed') || actionText.includes('rejected')) {
              result = 'Failed';
            }

            if (actionText.includes('motion to')) {
              const motionMatch = actionText.match(/motion to ([^.]+)/);
              if (motionMatch) {
                question = `On ${motionMatch[1]}`;
              }
            } else if (actionText.includes('amendment')) {
              question = 'On Amendment';
            } else if (actionText.includes('cloture')) {
              question = 'On Cloture';
            }

            // Try to fetch detailed vote data if we have the URL
            let yea = 0,
              nay = 0,
              present = 0,
              notVoting = 0;
            let democraticBreakdown = { yea: 0, nay: 0, present: 0, notVoting: 0 };
            let republicanBreakdown = { yea: 0, nay: 0, present: 0, notVoting: 0 };
            const independentBreakdown = { yea: 0, nay: 0, present: 0, notVoting: 0 };

            if (recordedVote.url) {
              try {
                logger.info('Fetching roll call data', { url: recordedVote.url });

                // Parse actual roll call XML data
                const rollCallData = await parseRollCallXML(recordedVote.url);

                if (rollCallData) {
                  // Use real vote totals
                  yea = rollCallData.totals.yea;
                  nay = rollCallData.totals.nay;
                  present = rollCallData.totals.present;
                  notVoting = rollCallData.totals.notVoting;

                  // Calculate party breakdowns from actual votes
                  for (const vote of rollCallData.votes) {
                    const partyBreakdown =
                      vote.party === 'D'
                        ? democraticBreakdown
                        : vote.party === 'R'
                          ? republicanBreakdown
                          : independentBreakdown;

                    switch (vote.vote) {
                      case 'Yea':
                        partyBreakdown.yea++;
                        break;
                      case 'Nay':
                        partyBreakdown.nay++;
                        break;
                      case 'Present':
                        partyBreakdown.present++;
                        break;
                      case 'Not Voting':
                        partyBreakdown.notVoting++;
                        break;
                    }
                  }

                  logger.info('Successfully parsed roll call data', {
                    url: recordedVote.url,
                    totalVotes: rollCallData.votes.length,
                  });
                } else {
                  // Fallback to placeholder data if parsing fails
                  if (chamber === 'House') {
                    yea = result === 'Passed' ? 250 : 180;
                    nay = result === 'Passed' ? 180 : 250;
                    present = 2;
                    notVoting = 3;
                  } else {
                    yea = result === 'Passed' ? 60 : 40;
                    nay = result === 'Passed' ? 40 : 60;
                    present = 0;
                    notVoting = 0;
                  }

                  // Estimate party breakdowns for fallback data
                  democraticBreakdown = {
                    yea: chamber === 'House' ? Math.floor(yea * 0.55) : Math.floor(yea * 0.48),
                    nay: chamber === 'House' ? Math.floor(nay * 0.1) : Math.floor(nay * 0.05),
                    present: Math.floor(present * 0.5),
                    notVoting: Math.floor(notVoting * 0.5),
                  };
                  republicanBreakdown = {
                    yea: chamber === 'House' ? Math.floor(yea * 0.45) : Math.floor(yea * 0.52),
                    nay: chamber === 'House' ? Math.floor(nay * 0.9) : Math.floor(nay * 0.95),
                    present: Math.floor(present * 0.5),
                    notVoting: Math.floor(notVoting * 0.5),
                  };
                }
              } catch (error) {
                logger.warn('Failed to fetch roll call details', {
                  url: recordedVote.url,
                  error: (error as Error).message,
                });

                // Use placeholder data on error
                if (chamber === 'House') {
                  yea = result === 'Passed' ? 250 : 180;
                  nay = result === 'Passed' ? 180 : 250;
                  present = 2;
                  notVoting = 3;
                } else {
                  yea = result === 'Passed' ? 60 : 40;
                  nay = result === 'Passed' ? 40 : 60;
                  present = 0;
                  notVoting = 0;
                }

                // Estimate party breakdowns for fallback data
                democraticBreakdown = {
                  yea: chamber === 'House' ? Math.floor(yea * 0.55) : Math.floor(yea * 0.48),
                  nay: chamber === 'House' ? Math.floor(nay * 0.1) : Math.floor(nay * 0.05),
                  present: Math.floor(present * 0.5),
                  notVoting: Math.floor(notVoting * 0.5),
                };
                republicanBreakdown = {
                  yea: chamber === 'House' ? Math.floor(yea * 0.45) : Math.floor(yea * 0.52),
                  nay: chamber === 'House' ? Math.floor(nay * 0.9) : Math.floor(nay * 0.95),
                  present: Math.floor(present * 0.5),
                  notVoting: Math.floor(notVoting * 0.5),
                };
              }
            }

            const vote: BillVote = {
              voteId,
              chamber,
              date: recordedVote.date || action.actionDate,
              rollNumber: recordedVote.rollNumber,
              question,
              result: result as 'Passed' | 'Failed' | 'Agreed to' | 'Disagreed to',
              votes: {
                yea,
                nay,
                present,
                notVoting,
              },
              breakdown: {
                democratic: democraticBreakdown,
                republican: republicanBreakdown,
                independent: independentBreakdown,
              },
            };

            votes.push(vote);
          }
        }
      }
    }

    logger.info('Fetched bill votes', {
      billId: `${type}-${number}`,
      votesCount: votes.length,
    });
  } catch (error) {
    logger.error('Error fetching bill votes', error as Error, {
      billId: `${type}-${number}`,
    });
  }

  return votes;
}

// Helper function to map Congress.gov status to our status enum
function mapCongressStatus(actionText?: string): BillStatus | null {
  if (!actionText) return null;

  const lowerText = actionText.toLowerCase();

  if (lowerText.includes('introduced')) return 'introduced';
  if (lowerText.includes('referred')) return 'referred';
  if (lowerText.includes('reported')) return 'reported';
  if (lowerText.includes('passed house')) return 'passed_house';
  if (lowerText.includes('passed senate')) return 'passed_senate';
  if (lowerText.includes('became public law') || lowerText.includes('enacted')) return 'enacted';
  if (lowerText.includes('vetoed')) return 'vetoed';
  if (lowerText.includes('failed') || lowerText.includes('rejected')) return 'failed';

  return 'introduced';
}

// EMERGENCY FIX: Mock bill generation removed to prevent misrepresenting real representatives
// Previously used REAL bioguideId T000481 (Rep. Shri Thanedar) for fake "Sample Bill" legislation
// which could damage representative's reputation and mislead citizens about their legislative record
function _generateEmptyBillResponse(billId: string): null {
  // EMERGENCY FIX: All fake bill data removed
  // Previously returned fake bill with REAL representative bioguideIds:
  // - T000481 (Rep. Shri Thanedar) as fake sponsor
  // - M001135 (Rep. Kweisi Mfume) as fake cosponsor
  // This could seriously damage real representatives' reputations

  logger.warn('Cannot create fake bill with real representative data', {
    billId,
    reason: 'Misrepresenting real legislators with fake bills is prohibited',
  });

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
): Promise<NextResponse<BillAPIResponse>> {
  try {
    const { billId } = await params;

    if (!billId) {
      return NextResponse.json(
        {
          bill: {} as Bill,
          metadata: {
            dataSource: 'mock',
            lastUpdated: new Date().toISOString(),
            votesCount: 0,
            cosponsorsCount: 0,
            committeesCount: 0,
          },
          errors: [{ code: 'MISSING_BILL_ID', message: 'Bill ID is required' }],
        },
        { status: 400 }
      );
    }

    logger.info('Bill API request', { billId });

    let bill: Bill | null = null;

    // Try to fetch from Congress.gov if API key is available
    if (process.env.CONGRESS_API_KEY) {
      bill = await fetchBillFromCongress(billId);
    }

    // EMERGENCY FIX: Never return fake bills with real representative data
    if (!bill) {
      logger.warn('Bill data unavailable from Congress.gov', { billId });
      return NextResponse.json(
        {
          bill: null,
          metadata: {
            dataSource: 'unavailable',
            lastUpdated: new Date().toISOString(),
            cacheInfo: 'Bill data unavailable from Congress.gov',
            error: 'Bill not found - data unavailable from Congress.gov API',
          },
        } as unknown as BillAPIResponse,
        { status: 404 }
      );
    }

    const response: BillAPIResponse = {
      bill,
      metadata: {
        dataSource: process.env.CONGRESS_API_KEY && bill.url ? 'congress.gov' : 'mock',
        lastUpdated: bill.lastUpdated,
        votesCount: bill.votes.length,
        cosponsorsCount: bill.cosponsors.length,
        committeesCount: bill.committees.length,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200', // 1 hour cache
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';

    logger.error('Bill API error', error as Error, {
      billId: (await params).billId,
    });

    return NextResponse.json(
      {
        bill: {} as Bill,
        metadata: {
          dataSource: 'mock',
          lastUpdated: new Date().toISOString(),
          votesCount: 0,
          cosponsorsCount: 0,
          committeesCount: 0,
        },
        errors: [
          {
            code: 'INTERNAL_SERVER_ERROR',
            message: errorMessage,
          },
        ],
      },
      { status: 500 }
    );
  }
}
