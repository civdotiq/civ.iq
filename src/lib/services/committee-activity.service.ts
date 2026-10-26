/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Committee Activity Service — fetches meetings and bills for a committee
 * from Congress.gov API.
 *
 * Used by:
 * - Question template (committee-activity) via fetchCommitteeActivity()
 * - /api/committee/[id]/meetings route via fetchCommitteeMeetings()
 *
 * Bills are fetched through the committee-specific bills endpoint
 * (/v3/committee/{chamber}/{code}/bills), filtered to the current
 * Congress, and enriched with parallel detail fetches. Meetings use
 * the chamber-wide list endpoint (Congress.gov does not expose a
 * committee-filtered meetings endpoint), with parallel detail fetches.
 */

import { cachedFetch } from '@/lib/cache';
import { cachedStaleWhileRevalidate } from '@/services/cache/unified-cache.service';
import logger from '@/lib/logging/simple-logger';
import { mapWithConcurrency } from '@/lib/utils/concurrency';

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CURRENT_CONGRESS = 119;
const ACTIVITY_TTL = 2 * 60 * 60; // 2 hours

// Default number of recent bills to enrich per committee
const DEFAULT_BILL_DETAIL_LIMIT = 8;

// Bills API pagination: how far back to search for recent bills
const BILLS_LOOKBACK_DAYS = 180;

// Meetings list fetch size (chamber-wide, then filtered by committee).
// Congress.gov does not expose a committee-filtered meetings endpoint and
// lists meetings by update date, so we read the largest page it serves (250)
// and filter and sort in memory.
const MEETINGS_LIST_LIMIT = 250;

// Meeting details are fetched this many at a time: an unbounded burst of 250
// gets throttled, and each dropped detail silently hid a hearing.
const MEETING_DETAIL_CONCURRENCY = 10;

// Meeting lists are served stale-while-revalidate, like member bill counts:
// fresh for 2 hours, then served while refreshed in the background, for up to
// a week.
const MEETINGS_FRESH_MS = 2 * 60 * 60 * 1000;
const MEETINGS_MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;

// More failed meeting details than this share means a throttled run; it is
// not saved.
const MAX_DETAIL_FAILURE_SHARE = 0.1;

// ── Public Types ──────────────────────────────────────────────────

export interface CommitteeActivityMeeting {
  eventId: string;
  date: string;
  title: string;
  type: string;
  chamber: string;
}

export interface CommitteeActivityBill {
  billId: string;
  billNumber: string;
  title: string;
  sponsor: string;
  introducedDate: string;
  status: string;
  // The raw `latestAction.text` from Congress.gov, kept alongside the
  // citizen-language `status` label so the UI can surface the full text
  // on hover or in a tooltip without re-fetching the bill.
  latestActionText?: string;
}

export interface CommitteeActivityResult {
  meetings: CommitteeActivityMeeting[];
  bills: CommitteeActivityBill[];
  // ISO timestamp of when this data was fetched from Congress.gov, so the
  // UI can render an "As of {date}" caveat. Bills listings skew sparse for
  // smaller committees — the caveat is the honest way to explain why.
  fetchedAt: string;
}

/**
 * Rich meeting shape used by the /api/committee/[id]/meetings route.
 */
export interface CommitteeMeetingDetailed {
  eventId: string;
  date: string;
  title: string;
  type: 'Hearing' | 'Markup' | 'Meeting';
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Postponed';
  chamber: 'House' | 'Senate';
  location?: {
    building?: string;
    room?: string;
  };
  committees: Array<{
    name: string;
    systemCode: string;
  }>;
  videos: Array<{
    name: string;
    url: string;
    isYouTube: boolean;
  }>;
  witnesses: Array<{
    name: string;
    organization?: string;
    position?: string;
  }>;
  documents: Array<{
    type: string;
    name?: string;
    url?: string;
    format?: string;
  }>;
  hasTranscript: boolean;
  congressGovUrl: string;
}

// ── Congress.gov API Response Types ───────────────────────────────

interface CongressMeetingListItem {
  chamber: string;
  congress: number;
  eventId: string;
  updateDate: string;
  url: string;
}

export interface CongressMeetingDetail {
  chamber: string;
  congress: number;
  eventId: string;
  date: string;
  title: string;
  type: string;
  meetingStatus: string;
  updateDate: string;
  location?: {
    building?: string;
    room?: string;
  };
  committees?: Array<{
    name: string;
    systemCode: string;
    url?: string;
  }>;
  videos?: Array<{ name: string; url: string }>;
  witnesses?: Array<{ name: string; organization?: string; position?: string }>;
  meetingDocuments?: Array<{ documentType: string; format?: string; name?: string; url?: string }>;
  witnessDocuments?: Array<{ documentType: string; format?: string; name?: string; url?: string }>;
  hearingTranscript?: Array<{ jacketNumber: number; url: string }>;
}

interface CongressCommitteeBillListItem {
  actionDate: string | null;
  congress: number;
  number: string | number;
  relationshipType: string;
  type: string;
  updateDate: string;
  url: string;
}

interface CongressBillDetail {
  congress: number;
  number: string | number;
  type: string;
  title: string;
  introducedDate?: string;
  latestAction?: { actionDate: string; text: string };
  sponsors?: Array<{ fullName: string; party: string; state: string }>;
  policyArea?: { name: string };
}

// ── Committee Code Normalization ──────────────────────────────────

/**
 * Normalize a committee system code for Congress.gov API URLs.
 *
 * Congress.gov expects lowercase system codes with a numeric suffix:
 *   - Parent committees (4 letters): append "00" → "hsag" → "hsag00"
 *   - Subcommittees (4 letters + 2 digits): lowercase only → "HSAG22" → "hsag22"
 *   - Already suffixed codes: lowercase → "hsag00" → "hsag00"
 */
export function normalizeCommitteeSystemCode(committeeId: string): string {
  const lower = committeeId.toLowerCase();
  // If already has 2-digit suffix, return as-is
  if (/^[a-z]{4}\d{2}$/.test(lower)) return lower;
  // Parent committee — append "00"
  if (/^[a-z]{4}$/.test(lower)) return `${lower}00`;
  return lower;
}

function chamberToApiSegment(chamber: 'House' | 'Senate' | 'Joint'): 'house' | 'senate' {
  return chamber === 'Joint' ? 'senate' : (chamber.toLowerCase() as 'house' | 'senate');
}

// ── Main Entry Point (Question Page) ──────────────────────────────

export async function fetchCommitteeActivity(
  committeeId: string,
  chamber: 'House' | 'Senate' | 'Joint'
): Promise<CommitteeActivityResult> {
  const [meetings, bills] = await Promise.all([
    fetchCommitteeMeetingsSimple(committeeId, chamber).catch(() => ({
      meetings: [],
      fetchedAt: null,
    })),
    fetchCommitteeBills(committeeId, chamber).catch(() => []),
  ]);
  // "As of" is when the served hearing list was read, which can be up to the
  // stale window old; fall back to now when there is no saved list.
  return {
    meetings: meetings.meetings,
    bills,
    fetchedAt: new Date(meetings.fetchedAt ?? Date.now()).toISOString(),
  };
}

// ── Meetings (Simple — used by question page) ─────────────────────

async function fetchCommitteeMeetingsSimple(
  committeeId: string,
  chamber: 'House' | 'Senate' | 'Joint'
): Promise<{ meetings: CommitteeActivityMeeting[]; fetchedAt: number | null }> {
  const detailed = await fetchCommitteeMeetings(committeeId, chamber, 5);
  const meetings = detailed.meetings.map(m => ({
    eventId: m.eventId,
    date: m.date,
    title: m.title,
    type: m.type,
    chamber: m.chamber,
  }));
  return { meetings, fetchedAt: detailed.fetchedAt };
}

// ── Meetings (Detailed — used by API route) ───────────────────────

/**
 * A committee's most recent held meetings, served stale-while-revalidate like
 * member bill counts: a saved list younger than MEETINGS_FRESH_MS is served
 * as is; an older one (up to MEETINGS_MAX_STALE_MS) is served immediately and
 * refreshed in the background, so no visitor waits on the ~250 Congress.gov
 * requests a refresh takes. Only a first-ever (or week-old) request fetches
 * inline. `fetchedAt` is when the served list was read, for "As of" dates.
 */
export async function fetchCommitteeMeetings(
  committeeId: string,
  chamber: 'House' | 'Senate' | 'Joint',
  limit: number = 20,
  offset: number = 0
): Promise<{ meetings: CommitteeMeetingDetailed[]; total: number; fetchedAt: number | null }> {
  if (!CONGRESS_API_KEY) {
    logger.warn('[CommitteeActivity] CONGRESS_API_KEY not configured');
    return { meetings: [], total: 0, fetchedAt: null };
  }

  const apiChamber = chamberToApiSegment(chamber);
  // v6: stale-while-revalidate envelope (v5 was a plain 2-hour cache entry).
  const cacheKey = `committee-meetings-v6:${committeeId}:${apiChamber}:${limit}:${offset}`;

  try {
    const { data, fetchedAt } = await cachedStaleWhileRevalidate(
      cacheKey,
      () => loadCommitteeMeetings(committeeId, apiChamber, limit, offset),
      { freshMs: MEETINGS_FRESH_MS, maxStaleMs: MEETINGS_MAX_STALE_MS, source: 'congress.gov' }
    );
    return { ...data, fetchedAt };
  } catch (error) {
    logger.error('[CommitteeActivity] Meeting fetch failed', error as Error, { committeeId });
    return { meetings: [], total: 0, fetchedAt: null };
  }
}

/**
 * Read the chamber's meeting list and the committee's meetings from
 * Congress.gov. Throws on failure so nothing is cached and a saved list keeps
 * being served.
 */
async function loadCommitteeMeetings(
  committeeId: string,
  apiChamber: 'house' | 'senate',
  limit: number,
  offset: number
): Promise<{ meetings: CommitteeMeetingDetailed[]; total: number }> {
  // Fetch many list items because most won't match the target committee —
  // Congress.gov does not expose a committee-filtered meeting endpoint.
  // Congress.gov API requires explicit format=json; the Accept header is ignored
  const listUrl = `https://api.congress.gov/v3/committee-meeting/${CURRENT_CONGRESS}/${apiChamber}?limit=${MEETINGS_LIST_LIMIT}&offset=${offset}&format=json`;
  const listResponse = await fetch(listUrl, {
    headers: { Accept: 'application/json', 'X-API-Key': CONGRESS_API_KEY! },
    signal: AbortSignal.timeout(15_000),
  });
  if (!listResponse.ok) {
    throw new Error(`Meeting list fetch failed: HTTP ${listResponse.status}`);
  }

  const listData = await listResponse.json();
  const meetingsList: CongressMeetingListItem[] = listData.committeeMeetings || [];
  const total: number = listData.pagination?.count ?? 0;

  const detailResults = await mapWithConcurrency(meetingsList, MEETING_DETAIL_CONCURRENCY, item =>
    fetchMeetingDetail(item.eventId, apiChamber)
  );
  // A heavily throttled run would save a list with hearings missing; keep the
  // previous list instead.
  const failed = detailResults.filter(d => d === null).length;
  if (meetingsList.length > 0 && failed / meetingsList.length > MAX_DETAIL_FAILURE_SHARE) {
    throw new Error(`${failed} of ${meetingsList.length} meeting details failed`);
  }

  const upperCommitteeId = committeeId.toUpperCase();
  // For parent committees (codes ending in "00" like "HSIF00"), the
  // chamber-wide meeting list returns subcommittee meetings under
  // codes like "HSIF03" or "HSIF14". Matching the 4-letter base
  // prefix catches those; without it the pod looked empty for major
  // committees because nearly all their hearings happen in
  // subcommittees.
  const matchPrefix = upperCommitteeId.endsWith('00')
    ? upperCommitteeId.slice(0, 4)
    : upperCommitteeId;
  const matched = selectRecentMeetings(detailResults, matchPrefix, apiChamber, limit);

  logger.info('[CommitteeActivity] Fetched meetings', {
    committeeId,
    chamber: apiChamber,
    listCount: meetingsList.length,
    failedDetails: failed,
    matchedCount: matched.length,
  });

  return { meetings: matched, total };
}

/** One meeting's detail; retried once, since a dropped detail hides a hearing. */
async function fetchMeetingDetail(
  eventId: string,
  apiChamber: 'house' | 'senate',
  attempt = 1
): Promise<CongressMeetingDetail | null> {
  try {
    const detailUrl = `https://api.congress.gov/v3/committee-meeting/${CURRENT_CONGRESS}/${apiChamber}/${eventId}?format=json`;
    const detailRes = await fetch(detailUrl, {
      headers: { Accept: 'application/json', 'X-API-Key': CONGRESS_API_KEY! },
      signal: AbortSignal.timeout(10_000),
    });
    if (!detailRes.ok) throw new Error(`HTTP ${detailRes.status}`);
    const json = await detailRes.json();
    return (json.committeeMeeting as CongressMeetingDetail) ?? null;
  } catch {
    return attempt < 2 ? fetchMeetingDetail(eventId, apiChamber, attempt + 1) : null;
  }
}

/**
 * The committee's most recent held meetings, newest first. Congress.gov lists
 * meetings in update order, not meeting date, so every match is collected and
 * sorted. Canceled and postponed meetings and future dates are dropped; past
 * meetings often stay "Scheduled" in Congress.gov, so status alone can't mark
 * them held.
 */
export function selectRecentMeetings(
  details: ReadonlyArray<CongressMeetingDetail | null>,
  matchPrefix: string,
  apiChamber: 'house' | 'senate',
  limit: number,
  now: number = Date.now()
): CommitteeMeetingDetailed[] {
  return details
    .filter(
      (detail): detail is CongressMeetingDetail =>
        !!detail &&
        (detail.committees?.some(c => c.systemCode.toUpperCase().startsWith(matchPrefix)) ?? false)
    )
    .map(detail => transformMeetingDetail(detail, apiChamber))
    .filter(m => m.status !== 'Cancelled' && m.status !== 'Postponed')
    .filter(m => Date.parse(m.date) <= now)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, limit);
}

function transformMeetingDetail(
  detail: CongressMeetingDetail,
  apiChamber: 'house' | 'senate'
): CommitteeMeetingDetailed {
  const chamberCapitalized: 'House' | 'Senate' = detail.chamber === 'House' ? 'House' : 'Senate';

  return {
    eventId: detail.eventId,
    date: detail.date,
    title: detail.title || 'Untitled Meeting',
    type: (detail.type as CommitteeMeetingDetailed['type']) || 'Meeting',
    status: mapMeetingStatus(detail.meetingStatus),
    chamber: chamberCapitalized,
    location: detail.location,
    committees:
      detail.committees?.map(c => ({
        name: c.name,
        systemCode: c.systemCode,
      })) || [],
    videos:
      detail.videos?.map(v => ({
        name: v.name,
        url: v.url,
        isYouTube: v.url.includes('youtube.com') || v.url.includes('youtu.be'),
      })) || [],
    witnesses:
      detail.witnesses?.map(w => ({
        name: w.name,
        organization: w.organization,
        position: w.position,
      })) || [],
    documents: [...(detail.meetingDocuments || []), ...(detail.witnessDocuments || [])].map(d => ({
      type: d.documentType,
      name: d.name,
      url: d.url,
      format: d.format,
    })),
    hasTranscript: (detail.hearingTranscript?.length ?? 0) > 0,
    congressGovUrl: `https://www.congress.gov/event/${CURRENT_CONGRESS}th-Congress/${apiChamber}-event/${detail.eventId}`,
  };
}

function mapMeetingStatus(status: string): 'Scheduled' | 'Completed' | 'Cancelled' | 'Postponed' {
  const s = status?.toLowerCase() || '';
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('postpone')) return 'Postponed';
  if (s.includes('schedul')) return 'Scheduled';
  return 'Completed';
}

// ── Bills (Real committee filtering) ──────────────────────────────

/**
 * Fetch bills actually referred to (or reported by) the target committee.
 *
 * Uses Congress.gov's committee-specific bills endpoint:
 *   /v3/committee/{chamber}/{committeeCode}/bills
 *
 * Filters to the current Congress, sorts by actionDate descending,
 * and enriches the top N bills with parallel detail fetches to get
 * titles, sponsors, and latest action.
 */
export async function fetchCommitteeBills(
  committeeId: string,
  chamber: 'House' | 'Senate' | 'Joint',
  detailLimit: number = DEFAULT_BILL_DETAIL_LIMIT
): Promise<CommitteeActivityBill[]> {
  if (!CONGRESS_API_KEY) return [];

  const apiChamber = chamberToApiSegment(chamber);
  const systemCode = normalizeCommitteeSystemCode(committeeId);
  // v2 suffix busts stale cache from development iterations
  const cacheKey = `committee-bills-referred-v2:${systemCode}:${apiChamber}`;

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        // Last N days, ISO8601 — Congress.gov applies this to updateDate
        const fromDate = new Date(Date.now() - BILLS_LOOKBACK_DAYS * 86400 * 1000)
          .toISOString()
          .replace(/\.\d{3}Z$/, 'Z');

        const listUrl =
          `https://api.congress.gov/v3/committee/${apiChamber}/${systemCode}/bills` +
          `?fromDateTime=${fromDate}&limit=250&format=json`;

        const listResponse = await fetch(listUrl, {
          headers: {
            Accept: 'application/json',
            'X-API-Key': CONGRESS_API_KEY!,
            'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          },
        });

        if (!listResponse.ok) {
          logger.warn('[CommitteeActivity] Committee bills list fetch failed', {
            committeeId,
            systemCode,
            status: listResponse.status,
          });
          return [];
        }

        const listData = await listResponse.json();
        const billList: CongressCommitteeBillListItem[] = listData['committee-bills']?.bills ?? [];

        // Filter to current Congress and pick bills with recent actionDate
        const currentCongressBills = billList
          .filter(b => b.congress === CURRENT_CONGRESS && b.actionDate)
          .sort((a, b) => (b.actionDate ?? '').localeCompare(a.actionDate ?? ''))
          .slice(0, detailLimit);

        if (currentCongressBills.length === 0) {
          logger.info('[CommitteeActivity] No current-Congress bills for committee', {
            committeeId,
            systemCode,
            listCount: billList.length,
          });
          return [];
        }

        // Parallel detail fetches for title, sponsor, latestAction
        const detailedBills = await Promise.all(
          currentCongressBills.map(bill =>
            fetchBillDetail(bill.congress, bill.type, String(bill.number))
          )
        );

        const results: CommitteeActivityBill[] = detailedBills
          .map((detail, idx) => {
            const stub = currentCongressBills[idx];
            if (!stub) return null;
            if (!detail) {
              // Minimal fallback using list data
              return {
                billId: `${stub.congress}-${stub.type.toLowerCase()}-${stub.number}`,
                billNumber: `${stub.type.toUpperCase()} ${stub.number}`,
                title: 'Title unavailable',
                sponsor: 'Unknown',
                introducedDate: '',
                status: mapRelationshipType(stub.relationshipType),
              };
            }
            const actionText = detail.latestAction?.text ?? '';
            return {
              billId: `${detail.congress}-${detail.type.toLowerCase()}-${detail.number}`,
              billNumber: `${detail.type.toUpperCase()} ${detail.number}`,
              title: detail.title,
              sponsor: detail.sponsors?.[0]?.fullName ?? 'Unknown',
              introducedDate: detail.introducedDate ?? '',
              status: getStatusFromAction(actionText),
              latestActionText: actionText || undefined,
            };
          })
          .filter((b): b is CommitteeActivityBill => b !== null);

        logger.info('[CommitteeActivity] Fetched committee-referred bills', {
          committeeId,
          systemCode,
          listCount: billList.length,
          currentCongressCount: currentCongressBills.length,
          detailedCount: results.length,
        });

        return results;
      } catch (error) {
        logger.error('[CommitteeActivity] Bill fetch failed', error as Error, {
          committeeId,
          systemCode,
        });
        return [];
      }
    },
    ACTIVITY_TTL
  );
}

async function fetchBillDetail(
  congress: number,
  type: string,
  number: string
): Promise<CongressBillDetail | null> {
  try {
    const url = `https://api.congress.gov/v3/bill/${congress}/${type.toLowerCase()}/${number}?format=json`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'X-API-Key': CONGRESS_API_KEY! },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.bill as CongressBillDetail) ?? null;
  } catch {
    return null;
  }
}

/**
 * Collapse a Congress.gov `latestAction.text` into a citizen-language
 * status label. Order matters — chamber-transit signals ("received in the
 * Senate", "became public law") must beat the generic "referred" / "passed"
 * substrings, because many actions carry both. Example: "Received in the
 * Senate and Read twice and referred to the Committee on Environment and
 * Public Works" describes a bill that already passed the House; without
 * the chamber-transit check the older substring matcher labeled it as
 * "In Committee" on the House committee's page even though the bill had
 * cleared the House weeks earlier.
 *
 * Exported for unit testing and for callers that want to translate an
 * arbitrary latestAction string the same way the committee-activity pod
 * does.
 */
export function getStatusFromAction(actionText: string): string {
  const lower = actionText.toLowerCase();
  if (lower.includes('became public law') || lower.includes('became law')) return 'Now law';
  if (lower.includes('signed by president')) return 'Signed by president';
  if (lower.includes('vetoed')) return 'Vetoed';
  if (lower.includes('received in the senate')) return 'Passed House, in Senate';
  if (lower.includes('received in the house')) return 'Passed Senate, in House';
  if (lower.includes('passed senate') || lower.includes('passed/agreed to in senate'))
    return 'Passed Senate';
  if (lower.includes('passed house') || lower.includes('passed/agreed to in house'))
    return 'Passed House';
  if (lower.includes('passed')) return 'Passed';
  if (lower.includes('ordered to be reported') || lower.includes('reported by'))
    return 'Voted out of committee';
  if (lower.includes('reported')) return 'Voted out of committee';
  if (lower.includes('placed on the union calendar') || lower.includes('placed on senate calendar'))
    return 'On calendar';
  if (lower.includes('referred')) return 'Awaiting committee review';
  if (lower.includes('introduced')) return 'Introduced';
  return 'Under review';
}

/**
 * Citizen-language translation for the committee-bills endpoint's
 * `relationshipType` field. Only used when the bill-detail fetch fails
 * and we must fall back to list data. Congress.gov returns values like
 * "Referred To" and "Reported By"; "Unknown" falls through to a neutral
 * "Under review" so we never expose the raw API label to citizens.
 */
function mapRelationshipType(type: string | undefined): string {
  const t = (type ?? '').toLowerCase();
  if (t.includes('reported')) return 'Voted out of committee';
  if (t.includes('markup')) return 'In committee markup';
  if (t.includes('discharged')) return 'Discharged from committee';
  if (t.includes('referred')) return 'Awaiting committee review';
  return 'Under review';
}
