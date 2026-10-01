/**
 * Bill Service
 *
 * Shared service for fetching and transforming bill data from Congress.gov.
 * Extracted from the bill API route so that join endpoints can reuse
 * fetchBillFromCongress and mapCongressStatus without duplicating logic.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';
import type { Bill, BillStatus, BillVote } from '@/types/bill';
import { parseBillNumber } from '@/types/bill';
import { formatBillNumber } from '@/lib/bill-label';
import type { EnhancedRepresentative } from '@/types/representative';
import { parseRollCallXML } from '@/features/legislation/services/rollcall-parser';
import DOMPurify from 'isomorphic-dompurify';

// ── Congress.gov API response types ────────────────────────────────────

export interface CongressAction {
  actionDate: string;
  text: string;
  actionCode?: string;
  sourceSystem?: { code?: number; name?: string };
  recordedVotes?: Array<{
    chamber?: string;
    congress?: number;
    date?: string;
    rollNumber?: number;
    sessionNumber?: number;
    url?: string;
    result?: string;
  }>;
}

/**
 * Chamber an action happened in. Congress.gov marks it via sourceSystem
 * ("House floor actions", "Senate") or a chamber-prefixed actionCode
 * (H11100, Intro-H). Library of Congress codes are chamber-neutral, so
 * unknown stays undefined rather than defaulting to Senate.
 */
export function actionChamber(action: CongressAction | undefined): 'House' | 'Senate' | undefined {
  if (!action) return undefined;
  const source = action.sourceSystem?.name ?? '';
  if (source.startsWith('House')) return 'House';
  if (source.startsWith('Senate')) return 'Senate';
  const code = action.actionCode ?? '';
  if (/^H\d/.test(code) || code.endsWith('-H')) return 'House';
  if (/^S\d/.test(code) || code.endsWith('-S')) return 'Senate';
  return undefined;
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
  /** Plain label for the version, e.g. "Passed House". */
  actionDesc?: string;
  updateDate?: string;
}

interface CongressSubject {
  name: string;
}

interface CongressRelatedBill {
  congress?: number;
  type: string;
  number: string | number;
  title: string;
  relationshipDetails?: Array<{
    type: string;
    identifiedBy: string;
  }>;
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

// ── Internal helpers ───────────────────────────────────────────────────

/** Fetch bill text content (HTML) from Congress.gov */
async function fetchBillText(
  congress: string,
  type: string,
  number: string
): Promise<{ content: string; format: 'html' | 'text'; version: string; date: string } | null> {
  try {
    const textVersionsResponse = await fetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/text?format=json`,
      {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          Accept: 'application/json',
          'X-API-Key': process.env.CONGRESS_API_KEY || '',
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

    const latestVersion = textVersionsData.textVersions[0];
    if (!latestVersion) {
      return null;
    }

    const htmlFormat = latestVersion.formats.find(f => f.type === 'Formatted Text');

    if (!htmlFormat?.url) {
      return null;
    }

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

    let cleanedContent = htmlContent;
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch?.[1]) {
      cleanedContent = bodyMatch[1];
    }

    cleanedContent = DOMPurify.sanitize(cleanedContent, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'b',
        'i',
        'em',
        'strong',
        'u',
        'sub',
        'sup',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'dl',
        'dt',
        'dd',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'caption',
        'colgroup',
        'col',
        'blockquote',
        'pre',
        'code',
        'hr',
        'div',
        'span',
        'a',
        'section',
        'article',
        'header',
        'footer',
      ],
      ALLOWED_ATTR: ['href', 'title', 'class', 'id', 'colspan', 'rowspan'],
      ALLOW_DATA_ATTR: false,
    });

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

/**
 * Fetch a list sub-resource of a bill (committees, relatedbills, summaries).
 * The bill detail response only carries `{ count, url }` pointers for these,
 * never the items — reading them off the detail yields nothing.
 */
async function fetchBillList<T>(
  congress: string,
  type: string,
  number: string,
  path: 'committees' | 'relatedbills' | 'summaries',
  key: 'committees' | 'relatedBills' | 'summaries'
): Promise<T[]> {
  try {
    const response = await fetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/${path}?format=json&limit=250`,
      {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          Accept: 'application/json',
          'X-API-Key': process.env.CONGRESS_API_KEY || '',
        },
      }
    );
    const monitor = monitorExternalApi('congress', `bill-${path}`, response.url);
    if (!response.ok) {
      monitor.end(false, response.status);
      logger.warn(`Failed to fetch bill ${path}`, {
        status: response.status,
        congress,
        type,
        number,
      });
      return [];
    }
    const data: Partial<Record<typeof key, T[]>> = await response.json();
    monitor.end(true, 200);
    return data[key] ?? [];
  } catch (error) {
    logger.error(`Error fetching bill ${path}`, error as Error, { congress, type, number });
    return [];
  }
}

/** Most recent CRS summary — Congress.gov lists them oldest first. */
function latestSummary(summaries: CongressSummary[]): CongressSummary | undefined {
  return [...summaries].sort(
    (a, b) =>
      a.actionDate.localeCompare(b.actionDate) ||
      (a.updateDate ?? '').localeCompare(b.updateDate ?? '')
  )[summaries.length - 1];
}

/** Fetch additional bill details (subjects, policy area, text versions) */
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
    const subjectsResponse = await fetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/subjects?format=json`,
      {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          Accept: 'application/json',
          'X-API-Key': process.env.CONGRESS_API_KEY || '',
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

    const textResponse = await fetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/text?format=json`,
      {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          Accept: 'application/json',
          'X-API-Key': process.env.CONGRESS_API_KEY || '',
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

/** Fetch bill cosponsors from Congress.gov */
async function fetchBillCosponsors(
  congress: string,
  type: string,
  number: string
): Promise<CongressCosponsor[]> {
  try {
    logger.info('Fetching bill cosponsors from Congress.gov', { congress, type, number });

    const cosponsorsResponse = await fetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/cosponsors?format=json&limit=250`,
      {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          Accept: 'application/json',
          'X-API-Key': process.env.CONGRESS_API_KEY || '',
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
    logger.error('Error fetching bill cosponsors', error as Error, { congress, type, number });
    return [];
  }
}

/** Fetch bill actions from Congress.gov */
async function fetchBillActions(
  congress: string,
  type: string,
  number: string
): Promise<CongressAction[]> {
  try {
    logger.info('Fetching bill actions from Congress.gov', { congress, type, number });

    const actionsResponse = await fetch(
      `https://api.congress.gov/v3/bill/${congress}/${type}/${number}/actions?format=json&limit=250`,
      {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          Accept: 'application/json',
          'X-API-Key': process.env.CONGRESS_API_KEY || '',
        },
      }
    );

    const monitor = monitorExternalApi('congress', 'bill-actions', actionsResponse.url);

    if (!actionsResponse.ok) {
      monitor.end(false, actionsResponse.status);
      logger.warn('Failed to fetch actions', {
        status: actionsResponse.status,
        congress,
        type,
        number,
      });
      return [];
    }

    const actionsData: { actions: CongressAction[] } = await actionsResponse.json();
    monitor.end(true, 200);

    const actions = actionsData.actions || [];
    logger.info('Successfully fetched actions', {
      congress,
      type,
      number,
      count: actions.length,
      withVotes: actions.filter(a => a.recordedVotes && a.recordedVotes.length > 0).length,
    });

    return actions;
  } catch (error) {
    logger.error('Error fetching bill actions', error as Error, { congress, type, number });
    return [];
  }
}

/**
 * Map a clerk's result ("Bill Passed", "Motion Rejected", "Concurrent
 * Resolution Rejected", "Agreed to", "Failed") onto BillVote['result'].
 */
export function officialVoteResult(raw: string | undefined): BillVote['result'] | null {
  if (!raw) return null;
  if (/not agreed|disagreed/i.test(raw)) return 'Disagreed to';
  if (/reject|fail|defeat/i.test(raw)) return 'Failed';
  if (/agreed/i.test(raw)) return 'Agreed to';
  if (/pass|adopt|confirm|sustain|concur/i.test(raw)) return 'Passed';
  return null;
}

/** Fetch votes for a specific bill from roll call data */
export async function fetchBillVotes(
  actions: CongressAction[],
  congress: string,
  type: string,
  number: string
): Promise<BillVote[]> {
  const votes: BillVote[] = [];
  // Congress.gov attaches the same roll call to several actions (e.g. the
  // floor result and the "Passed/agreed to" status action) — keep the first.
  const seenRollCalls = new Set<string>();

  try {
    if (actions.length > 0) {
      for (const action of actions) {
        if (action.recordedVotes && action.recordedVotes.length > 0) {
          for (const recordedVote of action.recordedVotes) {
            const voteId = `${congress}-${type}-${number}-${recordedVote.rollNumber || 'unknown'}`;
            const chamber = recordedVote.chamber === 'House' ? 'House' : ('Senate' as const);
            if (recordedVote.rollNumber) {
              const rollKey = `${chamber}-${recordedVote.sessionNumber ?? ''}-${recordedVote.rollNumber}`;
              if (seenRollCalls.has(rollKey)) continue;
              seenRollCalls.add(rollKey);
            }

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

                const rollCallData = await parseRollCallXML(recordedVote.url);

                if (rollCallData) {
                  // The clerk's own labels beat guessing from action text: Senate
                  // amendment and motion votes read as "failed ... passage" otherwise.
                  if (rollCallData.question) question = rollCallData.question;
                  result = officialVoteResult(rollCallData.result) ?? result;
                  yea = rollCallData.totals.yea;
                  nay = rollCallData.totals.nay;
                  present = rollCallData.totals.present;
                  notVoting = rollCallData.totals.notVoting;
                  hasRealVoteData = true;

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
                  logger.warn('Roll call data parsing returned no results', {
                    url: recordedVote.url,
                  });
                }
              } catch (error) {
                logger.warn('Failed to fetch roll call details', {
                  url: recordedVote.url,
                  error: (error as Error).message,
                });
              }
            }

            const vote: BillVote = {
              voteId,
              chamber,
              date: recordedVote.date || action.actionDate,
              rollNumber: recordedVote.rollNumber,
              ...(recordedVote.sessionNumber ? { session: recordedVote.sessionNumber } : {}),
              question,
              result: result as 'Passed' | 'Failed' | 'Agreed to' | 'Disagreed to',
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

// ── Exported functions ─────────────────────────────────────────────────

/**
 * Map Congress.gov action text to a BillStatus enum value.
 * Used by the bill route and by lifecycle/join endpoints.
 */
export function mapCongressStatus(actionText?: string): BillStatus | null {
  if (!actionText) return null;

  const lowerText = actionText.toLowerCase();

  if (lowerText.includes('became public law') || lowerText.includes('enacted')) return 'enacted';
  if (lowerText.includes('vetoed')) return 'vetoed';

  if (lowerText.includes('passed house') || lowerText.includes('agreed to in house'))
    return 'passed_house';
  if (
    lowerText.includes('passed senate') ||
    lowerText.includes('agreed to in senate') ||
    lowerText.includes('agreed to without amendment')
  )
    return 'passed_senate';
  if (lowerText.includes('passed both')) return 'passed_both';

  if (lowerText.includes('agreed to') && !lowerText.includes('not agreed')) return 'passed_senate';

  if (
    lowerText.includes('failed') ||
    lowerText.includes('rejected') ||
    lowerText.includes('not agreed')
  )
    return 'failed';

  if (lowerText.includes('reported')) return 'reported';
  if (lowerText.includes('referred')) return 'referred';
  if (lowerText.includes('introduced')) return 'introduced';

  return 'introduced';
}

/**
 * A bill lookup that keeps "Congress.gov has no such bill" apart from
 * "Congress.gov could not be reached". Only the first may become a 404 page;
 * an outage must never tell search engines a real bill is gone.
 */
export type BillLookup =
  { status: 'found'; bill: Bill } | { status: 'not_found' } | { status: 'unavailable' };

type BillMiss = 'not_found' | 'unavailable';

/**
 * Fetch a bill from Congress.gov, or null when it is missing or unreachable.
 */
export async function fetchBillFromCongress(billId: string): Promise<Bill | null> {
  const result = await lookupBill(billId);
  return result.status === 'found' ? result.bill : null;
}

/**
 * Fetch a bill from Congress.gov, including cosponsors, text, actions, and votes.
 * Found bills are cached for 24 hours via cachedFetch; misses are never cached.
 */
export async function lookupBill(billId: string): Promise<BillLookup> {
  const { type, number, congress } = parseBillNumber(billId);
  // v2: standard bill labels (H.R.) and per-action chamber
  // v3: de-duplicated roll calls + vote session
  // v4: committees, related bills, summaries from their sub-endpoints
  // v6: official roll-call question/result (House + Senate) — bump drops stale entries
  const cacheKey = `bill-v6-${type}-${number}-${congress}`;

  const result = await cachedFetch<Bill | BillMiss>(
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
          `https://api.congress.gov/v3/bill/${congress}/${type}/${number}?format=json`,
          {
            headers: {
              'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
              Accept: 'application/json',
              'X-API-Key': process.env.CONGRESS_API_KEY || '',
            },
          }
        );

        const monitor = monitorExternalApi('congress', 'bill-detail', billResponse.url);

        if (!billResponse.ok) {
          monitor.end(false, billResponse.status);

          if (billResponse.status === 404) {
            logger.warn('Bill not found in Congress.gov', { billId });
            return 'not_found';
          }

          throw new Error(`Congress.gov API error: ${billResponse.status}`);
        }

        const billData: { bill: CongressBillData } = await billResponse.json();
        monitor.end(true, 200);

        if (!billData.bill) {
          logger.warn('No bill data in response', { billId });
          return 'unavailable';
        }

        const bill = billData.bill;

        const c = congress.toString();
        const n = number.toString();
        const [
          detailedCosponsors,
          billDetails,
          billText,
          billActions,
          committees,
          relatedBills,
          summaries,
        ] = await Promise.all([
          fetchBillCosponsors(c, type, n),
          fetchBillDetails(c, type, n),
          fetchBillText(c, type, n),
          fetchBillActions(c, type, n),
          fetchBillList<CongressCommittee>(c, type, n, 'committees', 'committees'),
          fetchBillList<CongressRelatedBill>(c, type, n, 'relatedbills', 'relatedBills'),
          fetchBillList<CongressSummary>(c, type, n, 'summaries', 'summaries'),
        ]);
        const summary = latestSummary(summaries);

        const result: Bill = {
          // Lowercase type so the id is the true canonical slug (119-hr-8814);
          // an uppercase type (119-HR-8814) is only "recoverable" and 308-redirects,
          // which is wrong for a value used as a canonical URL.
          id: `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`,
          number: formatBillNumber(bill.type, bill.number),
          title: bill.title || formatBillNumber(bill.type, bill.number),
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
              // latestAction carries no chamber info; borrow it from the matching action
              chamber: actionChamber(
                billActions.find(
                  (a: CongressAction) =>
                    a.actionDate === bill.latestAction?.actionDate &&
                    a.text === bill.latestAction?.text
                )
              ),
            },
            timeline: billActions.map((action: CongressAction) => ({
              date: action.actionDate,
              description: action.text,
              chamber: actionChamber(action),
              actionCode: action.actionCode,
              type: 'action' as const,
            })),
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

          committees: committees.map((committee: CongressCommittee) => ({
            committeeId: committee.systemCode,
            name: committee.name,
            chamber: committee.chamber === 'House' ? 'House' : 'Senate',
            activities: Array.isArray(committee.activities)
              ? committee.activities.map(activity => ({
                  date: activity.date,
                  activity: activity.name,
                }))
              : [],
          })),

          summary: summary
            ? {
                // Congress.gov summaries arrive as HTML and are rendered with
                // dangerouslySetInnerHTML downstream — sanitize here, same as fullText.
                text: DOMPurify.sanitize(summary.text, {
                  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'u', 'ul', 'ol', 'li', 'a'],
                  ALLOWED_ATTR: ['href', 'title'],
                  ALLOW_DATA_ATTR: false,
                }),
                date: summary.actionDate,
                version: summary.actionDesc || summary.versionCode,
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

          fullText: billText || undefined,

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

          cboCostEstimates: Array.isArray(bill.cboCostEstimates)
            ? bill.cboCostEstimates.map((cbo: CongressCBOEstimate) => ({
                title: cbo.title,
                description: cbo.description,
                url: cbo.url,
                pubDate: cbo.pubDate,
              }))
            : undefined,

          amendments: bill.amendments
            ? {
                count: bill.amendments.count,
                items: [],
              }
            : undefined,

          committeeReports: Array.isArray(bill.committeeReports)
            ? bill.committeeReports.map((report: CongressCommitteeReport) => ({
                citation: report.citation,
                url: report.url,
              }))
            : undefined,

          laws: Array.isArray(bill.laws)
            ? bill.laws.map((law: CongressLaw) => ({
                type: law.type,
                number: law.number,
              }))
            : undefined,

          votes: [],

          relatedBills: relatedBills.map((related: CongressRelatedBill) => ({
            id: `${related.congress ?? bill.congress}-${related.type.toLowerCase()}-${related.number}`,
            number: formatBillNumber(related.type, String(related.number)),
            title: related.title,
            // relationshipDetails[].type is e.g. "Identical bill", "Related bill",
            // "Procedurally-related"; identifiedBy is only who flagged it (CRS, House).
            relationship: related.relationshipDetails?.some(d => /identical/i.test(d.type))
              ? ('identical' as const)
              : ('related' as const),
          })),

          introducedDate: bill.introducedDate,
          url: `https://www.congress.gov/bill/${bill.congress}th-congress/${bill.originChamber.toLowerCase()}-bill/${bill.number}`,
          textUrl: bill.textVersions?.[0]?.formats?.find(
            (f: CongressTextFormat) => f.type === 'Formatted HTML'
          )?.url,
          lastUpdated: new Date().toISOString(),
        };

        const votes = await fetchBillVotes(
          billActions,
          congress.toString(),
          type,
          number.toString()
        );
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
        return 'unavailable';
      }
    },
    24 * 60 * 60,
    data => typeof data === 'object'
  );

  return typeof result === 'object' ? { status: 'found', bill: result } : { status: result };
}
