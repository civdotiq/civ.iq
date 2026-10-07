/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Event Detector
 * Detects new bill introductions and actions from Congress.gov API.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import { nostrConfig } from '@/config/nostr.config';
import type { CivicEvent, BillActionEvent, BillIntroducedEvent } from '@/types/nostr';
import type { CongressBill, CongressApiResponse } from './types';
import logger from '@/lib/logging/simple-logger';

/**
 * Parse bill number string into type and number
 * e.g., "H.R. 1234" -> { billType: "hr", billNum: "1234" }
 */
export function parseBillNumber(billNumber: string): { billType: string; billNum: string } | null {
  const match = billNumber.match(
    /^(H\.R\.|S\.|H\.Res\.|S\.Res\.|H\.J\.Res\.|S\.J\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.)\s*(\d+)/i
  );
  if (!match) return null;

  const billType = match[1]!.toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
  return { billType, billNum: match[2]! };
}

/**
 * Resolve type + number from a Congress.gov list item. The list API returns
 * `number` as bare digits ("877") with the prefix in the separate `type`
 * field ("HR") — the combined "H.R. 877" form only appears in other feeds,
 * so parseBillNumber is the fallback, not the primary path.
 */
export function resolveBillNumber(
  bill: CongressBill
): { billType: string; billNum: string } | null {
  if (bill.type && /^\d+$/.test(bill.number)) {
    return { billType: bill.type.toLowerCase(), billNum: bill.number };
  }
  return parseBillNumber(bill.number);
}

const BILL_TYPE_DISPLAY: Record<string, string> = {
  hr: 'H.R.',
  s: 'S.',
  hres: 'H.Res.',
  sres: 'S.Res.',
  hjres: 'H.J.Res.',
  sjres: 'S.J.Res.',
  hconres: 'H.Con.Res.',
  sconres: 'S.Con.Res.',
};

/** Format for display, e.g. ("hr", "877") -> "H.R. 877" */
export function formatBillNumber(billType: string, billNum: string): string {
  return `${BILL_TYPE_DISPLAY[billType] ?? billType.toUpperCase()} ${billNum}`;
}

/**
 * The list is sorted by updateDate, so metadata refreshes resurface bills
 * whose latest action is months old. Only actions this recent are news.
 */
const MAX_ACTION_AGE_DAYS = 7;

export function isRecentAction(actionDate: string): boolean {
  const age = Date.now() - new Date(actionDate).getTime();
  return age >= 0 ? age <= MAX_ACTION_AGE_DAYS * 24 * 60 * 60 * 1000 : true;
}

/**
 * Every bill updated since the last fully published run is fetched, not a
 * fixed top-N: Congress.gov updates ~350 bills a day, and the old
 * `limit=20` page meant most bills never reached Nostr or IndexNow.
 */
const BILL_WINDOW_HOURS = 26;
const BILL_PAGE_SIZE = 250;
// 20 pages = 5,000 bills, enough for the full 7-day catch-up window.
const MAX_BILL_PAGES = 20;
// Congress.gov can stall for minutes; bound every page request.
const BILL_PAGE_TIMEOUT_MS = 15000;
const DEDUP_MGET_CHUNK = 50;

/**
 * ISO time up to which every detected bill event was published. Events cut
 * off by the publish deadline have no dedup entry, but a bill that isn't
 * updated again would fall out of a plain 26h window, so the window reaches
 * back to this mark (never past the 7-day action-recency gate).
 */
export const BILL_WATERMARK_KEY = 'nostr:bills:fetched-through';
const BILL_WATERMARK_TTL = (MAX_ACTION_AGE_DAYS + 1) * 24 * 60 * 60;

/** Congress.gov wants `YYYY-MM-DDTHH:MM:SSZ` (no milliseconds). */
export function toCongressDateTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Start of the fetch window: the watermark, clamped to [now-7d, now-26h]. */
export function billWindowStart(now: number, watermark: string | null): Date {
  const latest = now - BILL_WINDOW_HOURS * 60 * 60 * 1000;
  const earliest = now - MAX_ACTION_AGE_DAYS * 24 * 60 * 60 * 1000;
  const mark = watermark ? new Date(watermark).getTime() : NaN;
  if (!Number.isFinite(mark)) return new Date(latest);
  return new Date(Math.max(earliest, Math.min(latest, mark)));
}

export interface BillFetchResult {
  bills: CongressBill[];
  /** False when a later page failed or the page cap cut the list short. */
  complete: boolean;
}

/** Fetch every bill updated since `fromDateTime`, following pagination. */
export async function fetchRecentBills(
  congress: string,
  fromDateTime: Date
): Promise<BillFetchResult> {
  const congressApiKey = process.env.CONGRESS_API_KEY;
  if (!congressApiKey) {
    throw new Error('Congress API key not configured');
  }

  const bills: CongressBill[] = [];
  let url: string | undefined =
    `https://api.congress.gov/v3/bill/${congress}?limit=${BILL_PAGE_SIZE}&sort=updateDate+desc` +
    `&fromDateTime=${toCongressDateTime(fromDateTime)}&format=json`;

  for (let page = 0; url; page++) {
    if (page >= MAX_BILL_PAGES) {
      logger.warn('Bill page cap reached; oldest updates skipped this run', {
        pages: page,
        bills: bills.length,
        operation: 'nostr_publisher',
      });
      return { bills, complete: false };
    }
    try {
      // pagination.next omits the key; it travels in the header.
      const response = await fetch(url, {
        headers: { 'X-API-Key': congressApiKey },
        signal: AbortSignal.timeout(BILL_PAGE_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`Congress API error: ${response.status}`);
      }
      const data = (await response.json()) as CongressApiResponse;
      bills.push(...(data.bills || []));
      url = data.pagination?.next;
    } catch (error) {
      // First page failing means nothing to work with; a later page failing
      // still leaves the newest updates worth publishing.
      if (page === 0) throw error;
      logger.warn('Bill page fetch failed; publishing the pages already fetched', {
        page,
        bills: bills.length,
        error: (error as Error).message,
        operation: 'nostr_publisher',
      });
      return { bills, complete: false };
    }
  }

  return { bills, complete: true };
}

/** Which of these dedup keys already exist, via chunked MGET (1 command per chunk). */
async function findPublished(keys: string[]): Promise<Set<string>> {
  const cache = getRedisCache();
  const published = new Set<string>();
  for (let i = 0; i < keys.length; i += DEDUP_MGET_CHUNK) {
    const chunk = keys.slice(i, i + DEDUP_MGET_CHUNK);
    const values = await cache.mget(chunk);
    chunk.forEach((key, j) => {
      if (values[j] !== null && values[j] !== undefined) published.add(key);
    });
  }
  return published;
}

/** Record that every bill event fetched up to `fetchedThrough` was published. */
export async function advanceBillWatermark(fetchedThrough: string): Promise<void> {
  await getRedisCache().set(BILL_WATERMARK_KEY, fetchedThrough, BILL_WATERMARK_TTL);
}

/** Build a CivicEvent from a bill action */
export function buildBillActionEvent(
  bill: CongressBill,
  billType: string,
  billNum: string
): CivicEvent {
  const billId = `${billType}${billNum}-${bill.congress}`;
  const actionDate = bill.latestAction?.actionDate || new Date().toISOString().split('T')[0]!;
  const actionText = bill.latestAction?.text || 'Action taken';

  const data: BillActionEvent = {
    billId,
    billType,
    billNumber: billNum,
    congress: bill.congress,
    actionText,
    actionDate,
    chamber: bill.originChamber || 'Unknown',
  };

  return {
    type: 'bill-action',
    id: `${billId}-action-${actionDate}`,
    timestamp: Math.floor(new Date(actionDate).getTime() / 1000),
    title: `${formatBillNumber(billType, billNum)}: ${actionText}`,
    summary: `${bill.title} — ${actionText}`,
    tags: ['legislation', bill.originChamber?.toLowerCase() || 'congress'],
    source: {
      url:
        bill.url ||
        `https://www.congress.gov/bill/${bill.congress}th-congress/${bill.originChamber?.toLowerCase() === 'senate' ? 'senate-bill' : 'house-bill'}/${billNum}`,
      api: 'congress.gov',
    },
    data,
  };
}

/** Build a CivicEvent from a newly introduced bill */
export function buildBillIntroducedEvent(
  bill: CongressBill,
  billType: string,
  billNum: string
): CivicEvent {
  const billId = `${billType}${billNum}-${bill.congress}`;
  const introducedDate = bill.latestAction?.actionDate || new Date().toISOString().split('T')[0]!;

  const data: BillIntroducedEvent = {
    billId,
    billType,
    billNumber: billNum,
    congress: bill.congress,
    title: bill.title,
    sponsor: '',
    chamber: bill.originChamber || 'Unknown',
    introducedDate,
  };

  return {
    type: 'bill-introduced',
    id: `${billId}-introduced`,
    timestamp: Math.floor(new Date(introducedDate).getTime() / 1000),
    title: `New Bill: ${formatBillNumber(billType, billNum)} — ${bill.title}`,
    summary: `${formatBillNumber(billType, billNum)} introduced in the ${bill.originChamber || 'Congress'}: ${bill.title}`,
    tags: ['legislation', 'new-bill', bill.originChamber?.toLowerCase() || 'congress'],
    source: {
      url:
        bill.url ||
        `https://www.congress.gov/bill/${bill.congress}th-congress/${bill.originChamber?.toLowerCase() === 'senate' ? 'senate-bill' : 'house-bill'}/${billNum}`,
      api: 'congress.gov',
    },
    data,
  };
}

export interface BillDetection {
  events: CivicEvent[];
  /**
   * Set only when the whole window was fetched: the caller advances the
   * watermark to it once every returned event is published.
   */
  fetchedThrough: string | null;
}

/** Detect new bill events from Congress.gov API, with the window's end time */
export async function detectBillEventsWithWindow(): Promise<BillDetection> {
  const congress = process.env.CURRENT_CONGRESS || '119';
  const cache = getRedisCache();
  const events: CivicEvent[] = [];
  const now = Date.now();

  try {
    const watermark = await cache.get<string>(BILL_WATERMARK_KEY);
    const from = billWindowStart(now, watermark);
    const { bills, complete } = await fetchRecentBills(congress, from);

    logger.info(`Fetched ${bills.length} recent bills for Nostr publishing`, {
      congress,
      from: toCongressDateTime(from),
      complete,
      operation: 'nostr_publisher',
    });

    const candidates: Array<{
      bill: CongressBill;
      billType: string;
      billNum: string;
      actionKey: string;
      introKey: string | null;
    }> = [];
    for (const bill of bills) {
      const parsed = resolveBillNumber(bill);
      if (!parsed) continue;
      if (
        !bill.latestAction?.actionDate ||
        !bill.latestAction?.text ||
        !isRecentAction(bill.latestAction.actionDate)
      ) {
        continue;
      }
      const { billType, billNum } = parsed;
      const billId = `${billType}${billNum}-${bill.congress}`;
      const actionText = bill.latestAction.text.toLowerCase();
      const isIntroduction =
        actionText.includes('introduced') || actionText.includes('referred to');
      candidates.push({
        bill,
        billType,
        billNum,
        actionKey: `${nostrConfig.dedupPrefix}${billId}-action-${bill.latestAction.actionDate}`,
        introKey: isIntroduction ? `${nostrConfig.dedupPrefix}${billId}-introduced` : null,
      });
    }

    const published = await findPublished(
      candidates.flatMap(c => (c.introKey ? [c.actionKey, c.introKey] : [c.actionKey]))
    );

    for (const { bill, billType, billNum, actionKey, introKey } of candidates) {
      if (published.has(actionKey)) continue;
      if (introKey && !published.has(introKey)) {
        events.push(buildBillIntroducedEvent(bill, billType, billNum));
      }
      events.push(buildBillActionEvent(bill, billType, billNum));
    }

    return { events, fetchedThrough: complete ? new Date(now).toISOString() : null };
  } catch (error) {
    logger.error('Failed to detect bill events', error as Error, {
      operation: 'nostr_publisher',
    });
    return { events, fetchedThrough: null };
  }
}

/** Detect new bill events from Congress.gov API */
export async function detectBillEvents(): Promise<CivicEvent[]> {
  return (await detectBillEventsWithWindow()).events;
}
