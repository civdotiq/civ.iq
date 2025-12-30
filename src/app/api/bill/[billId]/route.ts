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

// Congress-aware revalidation: 24 hours for current congress bills
export const revalidate = 86400; // 24 hours

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
  type: string;
  date: string;
  formats: CongressTextFormat[];
}

interface CongressCBOEstimate {
  title: string;
  description: string;
  url: string;
  pubDate: string;
}

interface CongressCommitteeReport {
  citation: string;
  url: string;
}

interface CongressLaw {
  type: string;
  number: string;
}

interface CongressPolicyArea {
  name: string;
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
  policyArea?: CongressPolicyArea;
  relatedBills?: CongressRelatedBill[];
  textVersions?: CongressTextVersion[];
  cboCostEstimates?: CongressCBOEstimate[];
  committeeReports?: CongressCommitteeReport[];
  laws?: CongressLaw[];
  amendments?: {
    count: number;
    url: string;
  };
}

// Helper function to fetch bill text content
async function fetchBillText(
  congress: string,
  type: string,
  number: string
): Promise<{ content: string; format: 'html' | 'text'; version: string; date: string } | null> {
  try {
    // First get text versions to find the latest
    const textVersionsResponse = await fetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/text?api_key=${process.env.CONGRESS_API_KEY}&format=json`,
      {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          Accept: 'application/json',
        },
      }
    );

    if (!textVersionsResponse.ok) {
      logger.warn('Failed to fetch text versions', { congress, type, number });
      return null;
    }

    const textVersionsData: { textVersions: CongressTextVersion[] } =
      await textVersionsResponse.json();

    if (!textVersionsData.textVersions || textVersionsData.textVersions.length === 0) {
      return null;
    }

    // Get the most recent text version
    const latestVersion = textVersionsData.textVersions[0];
    if (!latestVersion) {
      return null;
    }

    const htmlFormat = latestVersion.formats.find(f => f.type === 'Formatted Text');

    if (!htmlFormat?.url) {
      return null;
    }

    // Fetch the actual HTML content
    const textResponse = await fetch(htmlFormat.url, {
      headers: {
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
      },
    });

    if (!textResponse.ok) {
      logger.warn('Failed to fetch bill text HTML', { url: htmlFormat.url });
      return null;
    }

    const htmlContent = await textResponse.text();

    // Clean up the HTML - extract just the bill text body
    // The Congress.gov HTML has a lot of wrapper elements
    let cleanedContent = htmlContent;

    // Try to extract just the body content
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch?.[1]) {
      cleanedContent = bodyMatch[1];
    }

    // Remove script tags
    cleanedContent = cleanedContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Remove style tags
    cleanedContent = cleanedContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    logger.info('Successfully fetched bill text', {
      congress,
      type,
      number,
      version: latestVersion.type,
      contentLength: cleanedContent.length,
    });

    return {
      content: cleanedContent,
      format: 'html',
      version: latestVersion.type,
      date: latestVersion.date,
    };
  } catch (error) {
    logger.error('Error fetching bill text', error as Error, { congress, type, number });
    return null;
  }
}

// Helper function to fetch additional bill details (subjects, amendments, etc.)
async function fetchBillDetails(
  congress: string,
  type: string,
  number: string
): Promise<{
  subjects?: { legislativeSubjects: CongressSubject[] };
  policyArea?: CongressPolicyArea;
  textVersions?: CongressTextVersion[];
}> {
  try {
    // Fetch subjects endpoint for detailed subject info
    const subjectsResponse = await fetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/subjects?api_key=${process.env.CONGRESS_API_KEY}&format=json`,
      {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          Accept: 'application/json',
        },
      }
    );

    let subjects: { legislativeSubjects: CongressSubject[] } | undefined;
    let policyArea: CongressPolicyArea | undefined;

    if (subjectsResponse.ok) {
      const subjectsData = await subjectsResponse.json();
      if (subjectsData.subjects) {
        subjects = {
          legislativeSubjects: subjectsData.subjects.legislativeSubjects || [],
        };
        policyArea = subjectsData.subjects.policyArea;
      }
    }

    // Fetch text versions endpoint
    const textResponse = await fetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/text?api_key=${process.env.CONGRESS_API_KEY}&format=json`,
      {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          Accept: 'application/json',
        },
      }
    );

    let textVersions: CongressTextVersion[] | undefined;
    if (textResponse.ok) {
      const textData = await textResponse.json();
      textVersions = textData.textVersions;
    }

    return { subjects, policyArea, textVersions };
  } catch (error) {
    logger.error('Error fetching bill details', error as Error, { congress, type, number });
    return {};
  }
}

// Helper function to fetch bill cosponsors from Congress.gov
async function fetchBillCosponsors(
  congress: string,
  type: string,
  number: string
): Promise<CongressCosponsor[]> {
  try {
    logger.info('Fetching bill cosponsors from Congress.gov', {
      congress,
      type,
      number,
    });

    const cosponsorsResponse = await fetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/cosponsors?api_key=${process.env.CONGRESS_API_KEY}&format=json&limit=250`,
      {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          Accept: 'application/json',
        },
      }
    );

    const monitor = monitorExternalApi('congress', 'bill-cosponsors', cosponsorsResponse.url);

    if (!cosponsorsResponse.ok) {
      monitor.end(false, cosponsorsResponse.status);
      logger.warn('Failed to fetch cosponsors', {
        status: cosponsorsResponse.status,
        congress,
        type,
        number,
      });
      return [];
    }

    const cosponsorsData: { cosponsors: CongressCosponsor[] } = await cosponsorsResponse.json();
    monitor.end(true, 200);

    const cosponsors = cosponsorsData.cosponsors || [];
    logger.info('Successfully fetched cosponsors', {
      congress,
      type,
      number,
      count: cosponsors.length,
    });

    return cosponsors;
  } catch (error) {
    logger.error('Error fetching bill cosponsors', error as Error, {
      congress,
      type,
      number,
    });
    return [];
  }
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

        // Fetch detailed cosponsors data
        const detailedCosponsors = await fetchBillCosponsors(
          congress.toString(),
          type,
          number.toString()
        );

        // Fetch additional bill details (subjects, text versions)
        const billDetails = await fetchBillDetails(congress.toString(), type, number.toString());

        // Fetch full bill text content
        const billText = await fetchBillText(congress.toString(), type, number.toString());

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

          cosponsors: detailedCosponsors.map((cosponsor: CongressCosponsor) => ({
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
          })),

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

          subjects: Array.isArray(billDetails.subjects?.legislativeSubjects)
            ? billDetails.subjects.legislativeSubjects.map(
                (subject: CongressSubject) => subject.name
              )
            : Array.isArray(bill.subjects?.legislativeSubjects)
              ? bill.subjects.legislativeSubjects.map((subject: CongressSubject) => subject.name)
              : [],

          policyArea: billDetails.policyArea?.name || bill.policyArea?.name,

          // Full bill text content
          fullText: billText || undefined,

          // Text versions with formats
          textVersions: Array.isArray(billDetails.textVersions)
            ? billDetails.textVersions.map((tv: CongressTextVersion) => ({
                type: tv.type,
                date: tv.date,
                formats: tv.formats.map((f: CongressTextFormat) => ({
                  type: f.type,
                  url: f.url,
                })),
              }))
            : Array.isArray(bill.textVersions)
              ? bill.textVersions.map((tv: CongressTextVersion) => ({
                  type: tv.type,
                  date: tv.date,
                  formats: tv.formats.map((f: CongressTextFormat) => ({
                    type: f.type,
                    url: f.url,
                  })),
                }))
              : undefined,

          // CBO Cost Estimates
          cboCostEstimates: Array.isArray(bill.cboCostEstimates)
            ? bill.cboCostEstimates.map((cbo: CongressCBOEstimate) => ({
                title: cbo.title,
                description: cbo.description,
                url: cbo.url,
                pubDate: cbo.pubDate,
              }))
            : undefined,

          // Amendments count
          amendments: bill.amendments
            ? {
                count: bill.amendments.count,
                items: [], // Individual amendments would require additional API call
              }
            : undefined,

          // Committee Reports
          committeeReports: Array.isArray(bill.committeeReports)
            ? bill.committeeReports.map((report: CongressCommitteeReport) => ({
                citation: report.citation,
                url: report.url,
              }))
            : undefined,

          // Public Laws (if enacted)
          laws: Array.isArray(bill.laws)
            ? bill.laws.map((law: CongressLaw) => ({
                type: law.type,
                number: law.number,
              }))
            : undefined,

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
            let hasRealVoteData = false;
            let yea = 0,
              nay = 0,
              present = 0,
              notVoting = 0;
            const democraticBreakdown = { yea: 0, nay: 0, present: 0, notVoting: 0 };
            const republicanBreakdown = { yea: 0, nay: 0, present: 0, notVoting: 0 };
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
                  hasRealVoteData = true;

                  // Calculate party breakdowns from actual votes
                  for (const v of rollCallData.votes) {
                    const partyBreakdown =
                      v.party === 'D'
                        ? democraticBreakdown
                        : v.party === 'R'
                          ? republicanBreakdown
                          : independentBreakdown;

                    switch (v.vote) {
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
                  // Vote counts unavailable - don't use placeholder data
                  logger.warn('Roll call data parsing returned no results', {
                    url: recordedVote.url,
                  });
                }
              } catch (error) {
                logger.warn('Failed to fetch roll call details', {
                  url: recordedVote.url,
                  error: (error as Error).message,
                });
                // Vote counts unavailable - don't use placeholder data
              }
            }

            const vote: BillVote = {
              voteId,
              chamber,
              date: recordedVote.date || action.actionDate,
              rollNumber: recordedVote.rollNumber,
              question,
              result: result as 'Passed' | 'Failed' | 'Agreed to' | 'Disagreed to',
              // Only include vote counts if we have real data from Congress.gov
              ...(hasRealVoteData
                ? {
                    votes: { yea, nay, present, notVoting },
                    breakdown: {
                      democratic: democraticBreakdown,
                      republican: republicanBreakdown,
                      independent: independentBreakdown,
                    },
                  }
                : { votesUnavailable: true }),
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

  // Check for enacted/law first (highest priority)
  if (lowerText.includes('became public law') || lowerText.includes('enacted')) return 'enacted';
  if (lowerText.includes('vetoed')) return 'vetoed';

  // Check for passed/agreed to statuses
  if (lowerText.includes('passed house') || lowerText.includes('agreed to in house'))
    return 'passed_house';
  if (
    lowerText.includes('passed senate') ||
    lowerText.includes('agreed to in senate') ||
    lowerText.includes('agreed to without amendment')
  )
    return 'passed_senate';
  if (lowerText.includes('passed both')) return 'passed_both';

  // For simple resolutions that were "agreed to" (like SRES)
  if (lowerText.includes('agreed to') && !lowerText.includes('not agreed')) return 'passed_senate';

  // Check for failed/rejected
  if (
    lowerText.includes('failed') ||
    lowerText.includes('rejected') ||
    lowerText.includes('not agreed')
  )
    return 'failed';

  // Check for committee/progress statuses
  if (lowerText.includes('reported')) return 'reported';
  if (lowerText.includes('referred')) return 'referred';
  if (lowerText.includes('introduced')) return 'introduced';

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
            dataSource: 'unavailable',
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
        dataSource: 'congress.gov',
        lastUpdated: bill.lastUpdated,
        votesCount: bill.votes.length,
        cosponsorsCount: bill.cosponsors.length,
        committeesCount: bill.committees.length,
      },
    };

    // Congress-aware caching:
    // - Past congresses (118th and earlier): Indefinite cache (immutable historical data)
    // - Current congress (119th): 24 hours (active legislation)
    const CURRENT_CONGRESS = 119;
    const billCongress = parseInt(bill.congress);
    const isHistorical = billCongress < CURRENT_CONGRESS;

    const cacheMaxAge = isHistorical ? 31536000 : 86400; // 1 year vs 24 hours
    const staleWhileRevalidate = isHistorical ? 86400 : 3600; // 1 day vs 1 hour

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
        'CDN-Cache-Control': `public, max-age=${cacheMaxAge}`,
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
          dataSource: 'unavailable',
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
