/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Nostr Publisher Cron Job
 *
 * Detects new civic events from government APIs (Congress.gov, Federal Register,
 * GovInfo), signs them as Nostr events, and publishes to multiple relays.
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
  VoteRecordEvent,
  ExecutiveOrderEvent,
  CommentPeriodEvent,
  HearingEvent,
  RelayPublishResult,
  NostrPublishRun,
} from '@/types/nostr';
import type { FederalRegisterAPIResponse } from '@/types/federal-register';
import type { GovInfoCollectionResponse } from '@/types/govinfo';
import { detectStateEvents } from '@/lib/nostr/state-event-detector';
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

interface CongressVote {
  congress: number;
  chamber: string;
  number: number;
  date: string;
  question: string;
  result: string;
  url: string;
  total?: {
    yea: number;
    nay: number;
    not_voting: number;
    present: number;
  };
}

interface CongressVoteApiResponse {
  votes?: CongressVote[];
}

const FEDERAL_REGISTER_API = 'https://www.federalregister.gov/api/v1';
const GOVINFO_API = 'https://api.govinfo.gov';

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

/** Detect new bill events from Congress.gov API */
async function detectBillEvents(): Promise<CivicEvent[]> {
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

/** Detect new vote events from Congress.gov API */
async function detectVoteEvents(): Promise<CivicEvent[]> {
  const congressApiKey = process.env.CONGRESS_API_KEY;
  if (!congressApiKey) return [];

  const cache = getRedisCache();
  const events: CivicEvent[] = [];

  try {
    const url = 'https://api.congress.gov/v3/vote?limit=20&sort=date+desc&format=json';
    const response = await fetch(url, {
      headers: { 'X-API-Key': congressApiKey },
    });

    if (!response.ok) {
      logger.error('Congress Vote API error', new Error(`HTTP ${response.status}`), {
        operation: 'nostr_publisher',
      });
      return [];
    }

    const data = (await response.json()) as CongressVoteApiResponse;
    const votes = data.votes || [];

    logger.info(`Fetched ${votes.length} recent votes for Nostr publishing`, {
      operation: 'nostr_publisher',
    });

    for (const vote of votes) {
      const chamber = vote.chamber === 'Senate' ? 'Senate' : 'House';
      const dedupKey = `${nostrConfig.dedupPrefix}vote-${chamber.toLowerCase()}-${vote.congress}-${vote.number}`;
      const alreadyPublished = await cache.exists(dedupKey);

      if (!alreadyPublished) {
        const voteData: VoteRecordEvent = {
          voteId: `${chamber.toLowerCase()}-${vote.congress}-${vote.number}`,
          chamber: chamber as 'House' | 'Senate',
          rollNumber: vote.number,
          question: vote.question,
          result: vote.result,
          date: vote.date,
          yeas: vote.total?.yea ?? 0,
          nays: vote.total?.nay ?? 0,
          notVoting: vote.total?.not_voting ?? 0,
        };

        events.push({
          type: 'vote-record',
          id: `vote-${chamber.toLowerCase()}-${vote.congress}-${vote.number}`,
          timestamp: Math.floor(new Date(vote.date).getTime() / 1000),
          title: `${chamber} Vote #${vote.number}: ${vote.question}`,
          summary: `${chamber} Roll Call #${vote.number} — ${vote.question}. Result: ${vote.result}`,
          tags: ['vote', chamber.toLowerCase()],
          source: {
            url:
              vote.url ||
              `https://www.congress.gov/roll-call-vote/${vote.congress}/${chamber.toLowerCase()}/${vote.number}`,
            api: 'congress.gov',
          },
          data: voteData,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to detect vote events', error as Error, {
      operation: 'nostr_publisher',
    });
  }

  return events;
}

/** Detect new executive order events from Federal Register API */
async function detectExecutiveOrderEvents(): Promise<CivicEvent[]> {
  const cache = getRedisCache();
  const events: CivicEvent[] = [];

  try {
    const params = new URLSearchParams();
    params.set('conditions[presidential_document_type]', 'executive_order');
    params.set('per_page', '10');
    params.set('order', 'newest');
    [
      'document_number',
      'title',
      'abstract',
      'publication_date',
      'html_url',
      'agencies',
      'executive_order_number',
      'signing_date',
    ].forEach(f => params.append('fields[]', f));

    const url = `${FEDERAL_REGISTER_API}/documents.json?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
    });

    if (!response.ok) {
      logger.error('Federal Register EO API error', new Error(`HTTP ${response.status}`), {
        operation: 'nostr_publisher',
      });
      return [];
    }

    const data: FederalRegisterAPIResponse = await response.json();

    logger.info(`Fetched ${data.results.length} executive orders for Nostr publishing`, {
      operation: 'nostr_publisher',
    });

    for (const doc of data.results) {
      const dedupKey = `${nostrConfig.dedupPrefix}eo-${doc.document_number}`;
      const alreadyPublished = await cache.exists(dedupKey);

      if (!alreadyPublished) {
        const primaryAgency = doc.agencies?.[0];
        const eoData: ExecutiveOrderEvent = {
          documentNumber: doc.document_number,
          title: doc.title,
          summary: doc.abstract,
          eoNumber: doc.executive_order_number ?? undefined,
          signingDate: doc.signing_date ?? undefined,
          agency: primaryAgency?.name ?? 'Executive Office of the President',
          url: doc.html_url,
        };

        events.push({
          type: 'executive-order',
          id: `eo-${doc.document_number}`,
          timestamp: Math.floor(new Date(doc.publication_date).getTime() / 1000),
          title: doc.executive_order_number
            ? `Executive Order ${doc.executive_order_number}: ${doc.title}`
            : `Executive Order: ${doc.title}`,
          summary: doc.abstract || doc.title,
          tags: ['executive-order', 'presidential'],
          source: {
            url: doc.html_url,
            api: 'federalregister.gov',
          },
          data: eoData,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to detect executive order events', error as Error, {
      operation: 'nostr_publisher',
    });
  }

  return events;
}

/** Detect new open comment period events from Federal Register API */
async function detectCommentPeriodEvents(): Promise<CivicEvent[]> {
  const cache = getRedisCache();
  const events: CivicEvent[] = [];

  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0] ?? '';

    const params = new URLSearchParams();
    params.set('conditions[type]', 'PRORULE');
    params.set('conditions[comment_date][gte]', todayStr);
    params.set('per_page', '20');
    params.set('order', 'newest');
    [
      'document_number',
      'title',
      'abstract',
      'publication_date',
      'html_url',
      'agencies',
      'comment_url',
      'comments_close_on',
    ].forEach(f => params.append('fields[]', f));

    const url = `${FEDERAL_REGISTER_API}/documents.json?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
    });

    if (!response.ok) {
      logger.error(
        'Federal Register comment period API error',
        new Error(`HTTP ${response.status}`),
        {
          operation: 'nostr_publisher',
        }
      );
      return [];
    }

    const data: FederalRegisterAPIResponse = await response.json();

    logger.info(`Fetched ${data.results.length} comment periods for Nostr publishing`, {
      operation: 'nostr_publisher',
    });

    for (const doc of data.results) {
      const dedupKey = `${nostrConfig.dedupPrefix}comment-${doc.document_number}`;
      const alreadyPublished = await cache.exists(dedupKey);

      if (!alreadyPublished) {
        const primaryAgency = doc.agencies?.[0];
        let daysUntilClose: number | undefined;
        if (doc.comments_close_on) {
          const closeDate = new Date(doc.comments_close_on);
          const diffTime = closeDate.getTime() - today.getTime();
          daysUntilClose = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const commentData: CommentPeriodEvent = {
          documentNumber: doc.document_number,
          title: doc.title,
          summary: doc.abstract,
          agency: primaryAgency?.name ?? 'Unknown Agency',
          commentUrl: doc.comment_url ?? undefined,
          commentsCloseOn: doc.comments_close_on ?? undefined,
          daysUntilClose,
          url: doc.html_url,
        };

        const closingNote =
          daysUntilClose !== undefined ? ` (${daysUntilClose} days remaining)` : '';
        events.push({
          type: 'comment-period',
          id: `comment-${doc.document_number}`,
          timestamp: Math.floor(new Date(doc.publication_date).getTime() / 1000),
          title: `Open for Comment: ${doc.title}`,
          summary: `${primaryAgency?.name ?? 'Agency'} — ${doc.abstract || doc.title}${closingNote}`,
          tags: ['comment-period', 'regulation', primaryAgency?.slug ?? 'federal'],
          source: {
            url: doc.html_url,
            api: 'federalregister.gov',
          },
          data: commentData,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to detect comment period events', error as Error, {
      operation: 'nostr_publisher',
    });
  }

  return events;
}

/** Detect new hearing events from GovInfo API */
async function detectHearingEvents(): Promise<CivicEvent[]> {
  const govInfoApiKey = process.env.GOVINFO_API_KEY ?? 'DEMO_KEY';
  const cache = getRedisCache();
  const events: CivicEvent[] = [];

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = startDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

    const url = `${GOVINFO_API}/collections/CHRG/${startDateStr}?pageSize=20`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
        'X-API-Key': govInfoApiKey,
      },
    });

    if (!response.ok) {
      logger.error('GovInfo hearings API error', new Error(`HTTP ${response.status}`), {
        operation: 'nostr_publisher',
      });
      return [];
    }

    const data: GovInfoCollectionResponse = await response.json();

    logger.info(`Fetched ${data.packages.length} hearings for Nostr publishing`, {
      operation: 'nostr_publisher',
    });

    for (const pkg of data.packages) {
      const dedupKey = `${nostrConfig.dedupPrefix}hearing-${pkg.packageId}`;
      const alreadyPublished = await cache.exists(dedupKey);

      if (!alreadyPublished) {
        const chamber = parseChamberFromDocClass(pkg.docClass);
        const hearingData: HearingEvent = {
          packageId: pkg.packageId,
          title: pkg.title,
          congress: parseInt(pkg.congress) || 119,
          chamber,
          dateIssued: pkg.dateIssued,
          url: `https://www.govinfo.gov/app/details/${pkg.packageId}`,
        };

        events.push({
          type: 'hearing',
          id: `hearing-${pkg.packageId}`,
          timestamp: Math.floor(new Date(pkg.dateIssued).getTime() / 1000),
          title: `Hearing: ${pkg.title}`,
          summary: `${chamber} hearing — ${pkg.title}`,
          tags: ['hearing', chamber.toLowerCase()],
          source: {
            url: `https://www.govinfo.gov/app/details/${pkg.packageId}`,
            api: 'govinfo.gov',
          },
          data: hearingData,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to detect hearing events', error as Error, {
      operation: 'nostr_publisher',
    });
  }

  return events;
}

/** Parse chamber from GovInfo document class */
function parseChamberFromDocClass(docClass: string): 'House' | 'Senate' | 'Joint' {
  if (docClass.startsWith('H')) return 'House';
  if (docClass.startsWith('S')) return 'Senate';
  return 'Joint';
}

/** Detect all new civic events from government APIs */
async function detectNewEvents(): Promise<CivicEvent[]> {
  const [billEvents, voteEvents, eoEvents, commentEvents, hearingEvents, stateEvents] =
    await Promise.all([
      detectBillEvents(),
      detectVoteEvents(),
      detectExecutiveOrderEvents(),
      detectCommentPeriodEvents(),
      detectHearingEvents(),
      detectStateEvents(),
    ]);
  return [
    ...billEvents,
    ...voteEvents,
    ...eoEvents,
    ...commentEvents,
    ...hearingEvents,
    ...stateEvents,
  ];
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
