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

/** Fetch recent bills from Congress.gov API */
export async function fetchRecentBills(congress: string): Promise<CongressBill[]> {
  const congressApiKey = process.env.CONGRESS_API_KEY;
  if (!congressApiKey) {
    throw new Error('Congress API key not configured');
  }

  const url = `https://api.congress.gov/v3/bill/${congress}?limit=20&sort=updateDate+desc&format=json`;
  const response = await fetch(url, {
    headers: { 'X-API-Key': congressApiKey },
  });

  if (!response.ok) {
    throw new Error(`Congress API error: ${response.status}`);
  }

  const data = (await response.json()) as CongressApiResponse;
  return data.bills || [];
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
    title: `${bill.number}: ${actionText}`,
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
    title: `New Bill: ${bill.number} — ${bill.title}`,
    summary: `${bill.number} introduced in the ${bill.originChamber || 'Congress'}: ${bill.title}`,
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

/** Detect new bill events from Congress.gov API */
export async function detectBillEvents(): Promise<CivicEvent[]> {
  const congress = process.env.CURRENT_CONGRESS || '119';
  const cache = getRedisCache();
  const events: CivicEvent[] = [];

  try {
    const bills = await fetchRecentBills(congress);

    logger.info(`Fetched ${bills.length} recent bills for Nostr publishing`, {
      congress,
      operation: 'nostr_publisher',
    });

    for (const bill of bills) {
      const parsed = parseBillNumber(bill.number);
      if (!parsed) continue;

      const { billType, billNum } = parsed;
      const billId = `${billType}${billNum}-${bill.congress}`;

      if (bill.latestAction?.actionDate && bill.latestAction?.text) {
        const actionDedupKey = `${nostrConfig.dedupPrefix}${billId}-action-${bill.latestAction.actionDate}`;
        const actionAlreadyPublished = await cache.exists(actionDedupKey);

        if (!actionAlreadyPublished) {
          const actionText = bill.latestAction.text.toLowerCase();
          if (actionText.includes('introduced') || actionText.includes('referred to')) {
            const introDedupKey = `${nostrConfig.dedupPrefix}${billId}-introduced`;
            const introAlreadyPublished = await cache.exists(introDedupKey);

            if (!introAlreadyPublished) {
              events.push(buildBillIntroducedEvent(bill, billType, billNum));
            }
          }

          events.push(buildBillActionEvent(bill, billType, billNum));
        }
      }
    }
  } catch (error) {
    logger.error('Failed to detect bill events', error as Error, {
      operation: 'nostr_publisher',
    });
  }

  return events;
}
