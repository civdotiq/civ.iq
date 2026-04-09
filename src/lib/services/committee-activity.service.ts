/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Committee Activity Service — fetches meetings and bills for a committee
 * from Congress.gov API. Used by the committee-activity question template.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CURRENT_CONGRESS = 119;
const ACTIVITY_TTL = 2 * 60 * 60; // 2 hours

// ── Types ─────────────────────────────────────────────────────────

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

// ── Main Entry Point ──────────────────────────────────────────────

export async function fetchCommitteeActivity(
  committeeId: string,
  chamber: 'House' | 'Senate' | 'Joint'
): Promise<CommitteeActivityResult> {
  const [meetings, bills] = await Promise.all([
    fetchMeetingsForCommittee(committeeId, chamber).catch(() => []),
    fetchBillsForCommittee(committeeId, chamber).catch(() => []),
  ]);
  return { meetings, bills };
}

// ── Meetings ──────────────────────────────────────────────────────

interface CongressMeetingListItem {
  chamber: string;
  congress: number;
  eventId: string;
  updateDate: string;
  url: string;
}

interface CongressMeetingDetail {
  eventId: string;
  date: string;
  title: string;
  type: string;
  meetingStatus: string;
  committees?: Array<{ name: string; systemCode: string }>;
}

async function fetchMeetingsForCommittee(
  committeeId: string,
  chamber: 'House' | 'Senate' | 'Joint'
): Promise<CommitteeActivityMeeting[]> {
  if (!CONGRESS_API_KEY) return [];

  const chamberLower = chamber === 'Joint' ? 'senate' : chamber.toLowerCase();
  const cacheKey = `question:committee-meetings:${committeeId}`;

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        const listUrl = `https://api.congress.gov/v3/committee-meeting/${CURRENT_CONGRESS}/${chamberLower}?limit=50`;
        const listResponse = await fetch(listUrl, {
          headers: { Accept: 'application/json', 'X-API-Key': CONGRESS_API_KEY! },
        });

        if (!listResponse.ok) return [];

        const listData = await listResponse.json();
        const meetingsList: CongressMeetingListItem[] = listData.committeeMeetings || [];

        const results: CommitteeActivityMeeting[] = [];
        const upperCommitteeId = committeeId.toUpperCase();

        // Fetch details for meetings and filter by committee (limit fetch count)
        for (const item of meetingsList.slice(0, 25)) {
          if (results.length >= 5) break;

          try {
            const detailUrl = `https://api.congress.gov/v3/committee-meeting/${CURRENT_CONGRESS}/${chamberLower}/${item.eventId}`;
            const detailRes = await fetch(detailUrl, {
              headers: { Accept: 'application/json', 'X-API-Key': CONGRESS_API_KEY! },
            });

            if (!detailRes.ok) continue;

            const detail = await detailRes.json();
            const meeting: CongressMeetingDetail = detail.committeeMeeting;
            if (!meeting) continue;

            const matchesCommittee = meeting.committees?.some(
              c =>
                c.systemCode.toUpperCase() === upperCommitteeId ||
                c.systemCode.toUpperCase().startsWith(upperCommitteeId)
            );

            if (matchesCommittee) {
              results.push({
                eventId: meeting.eventId,
                date: meeting.date,
                title: meeting.title || 'Untitled Meeting',
                type: meeting.type || 'Meeting',
                chamber: chamberLower,
              });
            }
          } catch {
            continue;
          }
        }

        logger.info('[CommitteeActivity] Fetched meetings', {
          committeeId,
          matchedCount: results.length,
        });

        return results;
      } catch (error) {
        logger.error('[CommitteeActivity] Meeting fetch failed', error as Error, {
          committeeId,
        });
        return [];
      }
    },
    ACTIVITY_TTL
  );
}

// ── Bills ─────────────────────────────────────────────────────────

interface CongressBillItem {
  congress: number;
  type: string;
  number: string | number;
  title: string;
  introducedDate?: string;
  latestAction?: { actionDate: string; text: string };
  sponsors?: Array<{ fullName: string; party: string; state: string }>;
}

async function fetchBillsForCommittee(
  committeeId: string,
  chamber: 'House' | 'Senate' | 'Joint'
): Promise<CommitteeActivityBill[]> {
  if (!CONGRESS_API_KEY) return [];

  const chamberLower = chamber === 'Joint' ? 'senate' : chamber.toLowerCase();
  const congressCommitteeId = committeeId.toLowerCase();
  const cacheKey = `question:committee-bills:${committeeId}`;

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        // Try fetching bills filtered by committee
        const url = `https://api.congress.gov/v3/bill/119/${chamberLower}?limit=20&sort=updateDate+desc`;
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'X-API-Key': CONGRESS_API_KEY!,
            'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          },
        });

        if (!response.ok) return [];

        const data = await response.json();
        const bills: CongressBillItem[] = data.bills || [];

        // Congress.gov list endpoint doesn't include committee assignments,
        // so we return recent bills for this chamber. A future enhancement
        // could fetch individual bill details to check committee referrals.
        const results = bills.slice(0, 10).map(bill => ({
          billId: `${bill.congress}-${bill.type}-${bill.number}`,
          billNumber: `${bill.type.toUpperCase()} ${bill.number}`,
          title: bill.title,
          sponsor: bill.sponsors?.[0]?.fullName ?? 'Unknown',
          introducedDate: bill.introducedDate ?? '',
          status: getStatusFromAction(bill.latestAction?.text ?? ''),
        }));

        logger.info('[CommitteeActivity] Fetched bills', {
          committeeId: congressCommitteeId,
          count: results.length,
        });

        return results;
      } catch (error) {
        logger.error('[CommitteeActivity] Bill fetch failed', error as Error, {
          committeeId,
        });
        return [];
      }
    },
    ACTIVITY_TTL
  );
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
