/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
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
import logger from '@/lib/logging/simple-logger';

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CURRENT_CONGRESS = 119;
const ACTIVITY_TTL = 2 * 60 * 60; // 2 hours

// Default number of recent bills to enrich per committee
const DEFAULT_BILL_DETAIL_LIMIT = 8;

// Bills API pagination: how far back to search for recent bills
const BILLS_LOOKBACK_DAYS = 180;

// Meetings list fetch size (chamber-wide, then filtered by committee).
// Congress.gov does not expose a committee-filtered meetings endpoint,
// so we fetch a large window and filter in memory. 200 gives good
// coverage of recent committee activity without exceeding API limits.
const MEETINGS_LIST_LIMIT = 200;

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
}

export interface CommitteeActivityResult {
  meetings: CommitteeActivityMeeting[];
  bills: CommitteeActivityBill[];
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

interface CongressMeetingDetail {
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
    fetchCommitteeMeetingsSimple(committeeId, chamber).catch(() => []),
    fetchCommitteeBills(committeeId, chamber).catch(() => []),
  ]);
  return { meetings, bills };
}

// ── Meetings (Simple — used by question page) ─────────────────────

async function fetchCommitteeMeetingsSimple(
  committeeId: string,
  chamber: 'House' | 'Senate' | 'Joint'
): Promise<CommitteeActivityMeeting[]> {
  const detailed = await fetchCommitteeMeetings(committeeId, chamber, 5);
  return detailed.meetings.map(m => ({
    eventId: m.eventId,
    date: m.date,
    title: m.title,
    type: m.type,
    chamber: m.chamber,
  }));
}

// ── Meetings (Detailed — used by API route) ───────────────────────

/**
 * Fetch detailed meetings for a committee from Congress.gov.
 *
 * Returns at most `limit` meetings (default 20). Because Congress.gov
 * only exposes a chamber-wide meeting list (not committee-filtered),
 * this function fetches the list and then fetches meeting details in
 * parallel before filtering to the target committee.
 */
export async function fetchCommitteeMeetings(
  committeeId: string,
  chamber: 'House' | 'Senate' | 'Joint',
  limit: number = 20,
  offset: number = 0
): Promise<{ meetings: CommitteeMeetingDetailed[]; total: number }> {
  if (!CONGRESS_API_KEY) {
    logger.warn('[CommitteeActivity] CONGRESS_API_KEY not configured');
    return { meetings: [], total: 0 };
  }

  const apiChamber = chamberToApiSegment(chamber);
  // v3 suffix busts stale cache from pre-format-json fix and smaller fetch size
  const cacheKey = `committee-meetings-v3:${committeeId}:${apiChamber}:${limit}:${offset}`;
  // Fetch many list items because most won't match the target committee —
  // Congress.gov does not expose a committee-filtered meeting endpoint.
  const fetchLimit = Math.min(Math.max(limit * 20, MEETINGS_LIST_LIMIT), 250);

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        // Congress.gov API requires explicit format=json; the Accept header is ignored
        const listUrl = `https://api.congress.gov/v3/committee-meeting/${CURRENT_CONGRESS}/${apiChamber}?limit=${fetchLimit}&offset=${offset}&format=json`;
        const listResponse = await fetch(listUrl, {
          headers: { Accept: 'application/json', 'X-API-Key': CONGRESS_API_KEY! },
        });

        if (!listResponse.ok) {
          logger.error('[CommitteeActivity] Meeting list fetch failed', undefined, {
            committeeId,
            status: listResponse.status,
          });
          return { meetings: [], total: 0 };
        }

        const listData = await listResponse.json();
        const meetingsList: CongressMeetingListItem[] = listData.committeeMeetings || [];
        const total: number = listData.pagination?.count ?? 0;

        // Parallelize all detail fetches (was serial N+1 before)
        const detailResults = await Promise.all(
          meetingsList.map(item => fetchMeetingDetail(item.eventId, apiChamber))
        );

        const upperCommitteeId = committeeId.toUpperCase();
        const matched: CommitteeMeetingDetailed[] = [];

        for (const detail of detailResults) {
          if (!detail) continue;
          if (matched.length >= limit) break;

          const matchesCommittee = detail.committees?.some(
            c =>
              c.systemCode.toUpperCase() === upperCommitteeId ||
              c.systemCode.toUpperCase().startsWith(upperCommitteeId)
          );
          if (!matchesCommittee) continue;

          matched.push(transformMeetingDetail(detail, apiChamber));
        }

        logger.info('[CommitteeActivity] Fetched meetings', {
          committeeId,
          chamber: apiChamber,
          listCount: meetingsList.length,
          matchedCount: matched.length,
        });

        return { meetings: matched, total };
      } catch (error) {
        logger.error('[CommitteeActivity] Meeting fetch failed', error as Error, {
          committeeId,
        });
        return { meetings: [], total: 0 };
      }
    },
    ACTIVITY_TTL
  );
}

async function fetchMeetingDetail(
  eventId: string,
  apiChamber: 'house' | 'senate'
): Promise<CongressMeetingDetail | null> {
  try {
    const detailUrl = `https://api.congress.gov/v3/committee-meeting/${CURRENT_CONGRESS}/${apiChamber}/${eventId}?format=json`;
    const detailRes = await fetch(detailUrl, {
      headers: { Accept: 'application/json', 'X-API-Key': CONGRESS_API_KEY! },
    });
    if (!detailRes.ok) return null;
    const json = await detailRes.json();
    return (json.committeeMeeting as CongressMeetingDetail) ?? null;
  } catch {
    return null;
  }
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
                status: stub.relationshipType || 'In Committee',
              };
            }
            return {
              billId: `${detail.congress}-${detail.type.toLowerCase()}-${detail.number}`,
              billNumber: `${detail.type.toUpperCase()} ${detail.number}`,
              title: detail.title,
              sponsor: detail.sponsors?.[0]?.fullName ?? 'Unknown',
              introducedDate: detail.introducedDate ?? '',
              status: getStatusFromAction(detail.latestAction?.text ?? ''),
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

function getStatusFromAction(actionText: string): string {
  const lower = actionText.toLowerCase();
  if (lower.includes('passed')) return 'Passed';
  if (lower.includes('reported')) return 'Reported';
  if (lower.includes('referred')) return 'In Committee';
  if (lower.includes('introduced')) return 'Introduced';
  if (lower.includes('amended')) return 'Amended';
  return 'Active';
}
