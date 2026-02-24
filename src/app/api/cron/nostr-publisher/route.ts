/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Nostr Publisher Cron Job
 *
 * Detects new civic events (bill actions, introductions) from Congress.gov,
 * signs them as Nostr events, and publishes to multiple relays.
 * Runs daily at 10am UTC via Vercel Cron (after bill-summarizer and rss-aggregator).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedisCache } from '@/lib/cache/redis-client';
import { getNostrKeypair, createSignedCivicEvent, publishToRelays } from '@/lib/nostr';
import { nostrConfig } from '@/config/nostr.config';
import type {
  CivicEvent,
  BillActionEvent,
  BillIntroducedEvent,
  RelayPublishResult,
  NostrPublishRun,
} from '@/types/nostr';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

interface CongressBill {
  number: string;
  title: string;
  type: string;
  originChamber: string;
  congress: number;
  url: string;
  latestAction?: {
    actionDate: string;
    text: string;
  };
}

interface CongressApiResponse {
  bills?: CongressBill[];
}

/**
 * Parse bill number string into type and number
 * e.g., "H.R. 1234" -> { billType: "hr", billNumber: "1234" }
 */
function parseBillNumber(billNumber: string): { billType: string; billNum: string } | null {
  const match = billNumber.match(
    /^(H\.R\.|S\.|H\.Res\.|S\.Res\.|H\.J\.Res\.|S\.J\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.)\s*(\d+)/i
  );
  if (!match) return null;

  const billType = match[1]!.toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
  return { billType, billNum: match[2]! };
}

/** Fetch recent bills from Congress.gov API */
async function fetchRecentBills(congress: string): Promise<CongressBill[]> {
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
function buildBillActionEvent(bill: CongressBill, billType: string, billNum: string): CivicEvent {
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
function buildBillIntroducedEvent(
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

/** Detect new civic events by comparing bills against Redis dedup cache */
async function detectNewEvents(): Promise<CivicEvent[]> {
  const congress = process.env.CURRENT_CONGRESS || '119';
  const bills = await fetchRecentBills(congress);
  const cache = getRedisCache();
  const events: CivicEvent[] = [];

  logger.info(`Fetched ${bills.length} recent bills for Nostr publishing`, {
    congress,
    operation: 'nostr_publisher',
  });

  for (const bill of bills) {
    const parsed = parseBillNumber(bill.number);
    if (!parsed) continue;

    const { billType, billNum } = parsed;
    const billId = `${billType}${billNum}-${bill.congress}`;

    // Check for new bill action
    if (bill.latestAction?.actionDate && bill.latestAction?.text) {
      const actionDedupKey = `${nostrConfig.dedupPrefix}${billId}-action-${bill.latestAction.actionDate}`;
      const actionAlreadyPublished = await cache.exists(actionDedupKey);

      if (!actionAlreadyPublished) {
        // Check if this is an introduction action
        const actionText = bill.latestAction.text.toLowerCase();
        if (actionText.includes('introduced') || actionText.includes('referred to')) {
          // Also check if the bill-introduced event was already published
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

  return events;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron authentication
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if Nostr publishing is configured
  const keypair = getNostrKeypair();
  if (!keypair) {
    return NextResponse.json({
      success: true,
      message: 'Nostr publishing disabled (no key configured)',
      eventsPublished: 0,
    });
  }

  logger.info('Starting Nostr publisher cron job', {
    operation: 'nostr_publisher',
    publicKey: keypair.publicKey,
  });

  try {
    // Detect new events
    const events = await detectNewEvents();
    const cache = getRedisCache();
    const relayResults: RelayPublishResult[] = [];
    let eventsPublished = 0;
    let eventsFailed = 0;

    logger.info(`Detected ${events.length} new civic events`, {
      operation: 'nostr_publisher',
    });

    // Sign and publish each event
    for (const event of events) {
      try {
        const signedEvent = createSignedCivicEvent(event, keypair.privateKey);
        const result = await publishToRelays(signedEvent);
        relayResults.push(result);

        if (result.successCount > 0) {
          // Record in Redis dedup
          const dedupKey = `${nostrConfig.dedupPrefix}${event.id}`;
          await cache.set(
            dedupKey,
            { eventId: signedEvent.id, publishedAt: Date.now() },
            nostrConfig.dedupTTL
          );
          eventsPublished++;

          logger.info(`Published civic event to Nostr`, {
            eventType: event.type,
            eventId: event.id,
            nostrEventId: signedEvent.id,
            relays: result.successCount,
            operation: 'nostr_publisher',
          });
        } else {
          eventsFailed++;
          logger.error('Failed to publish to any relay', {
            eventType: event.type,
            eventId: event.id,
            failures: result.failures,
            operation: 'nostr_publisher',
          });
        }
      } catch (error) {
        eventsFailed++;
        logger.error('Failed to sign/publish civic event', error as Error, {
          eventType: event.type,
          eventId: event.id,
          operation: 'nostr_publisher',
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const summary: NostrPublishRun = {
      eventsDetected: events.length,
      eventsPublished,
      eventsSkipped: 0,
      eventsFailed,
      relayResults,
      totalTime,
    };

    logger.info('Nostr publisher cron job completed', {
      ...summary,
      relayResults: undefined,
      operation: 'nostr_publisher',
    });

    return NextResponse.json({
      success: true,
      message: 'Nostr publishing completed',
      ...summary,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;

    logger.error('Nostr publisher cron job failed', error as Error, {
      totalTime,
      operation: 'nostr_publisher',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Nostr publishing failed',
        message: (error as Error).message,
        totalTime,
      },
      { status: 500 }
    );
  }
}

// Allow GET requests for manual testing
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return POST(request);
}
