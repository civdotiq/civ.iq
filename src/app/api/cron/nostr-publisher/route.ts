/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Nostr Publisher Cron Job
 *
 * Detects new civic events from government APIs (Congress.gov, Federal Register,
 * GovInfo, OpenStates), signs them as Nostr events, and publishes to multiple relays.
 * Runs daily at 10am UTC via Vercel Cron (after bill-summarizer and rss-aggregator).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNostrKeypair } from '@/lib/nostr';
import {
  detectBillEventsWithWindow,
  advanceBillWatermark,
  detectVoteEvents,
  detectSenateVoteEvents,
  detectExecutiveOrderEvents,
  detectCommentPeriodEvents,
  detectHearingEvents,
} from '@/lib/nostr/detectors';
import { detectStateEventsWithStaleness } from '@/lib/nostr/state-event-detector';
import { publishProfileMetadata, publishRelayList } from '@/lib/nostr/relay-list';
import { processAcceptRetries } from '@/lib/activitypub/delivery';
import { publishAndFederate } from '@/lib/publishing/publish-and-federate';
import type { CivicEvent, NostrPublishRun, StateStalenessInfo } from '@/types/nostr';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

/** Wrap a detection function with a timeout to prevent hanging on slow APIs */
async function withDetectionTimeout<T = CivicEvent[]>(
  fn: () => Promise<T>,
  label: string,
  timeoutMs = 30000,
  fallback: T = [] as T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<T>(resolve => {
        timer = setTimeout(() => {
          logger.warn(`Event detection timed out: ${label}`, {
            timeoutMs,
            operation: 'nostr_publisher',
          });
          resolve(fallback);
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    logger.error(`Event detection failed: ${label}`, error as Error, {
      operation: 'nostr_publisher',
    });
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Bills page through every update since the last fully published run
 * (~350 a day, up to 7 days when catching up), so they get more than the
 * 30s default. Detection runs in parallel and the state sweep already
 * allows 120s, so this adds no wall time.
 */
const BILL_DETECTION_TIMEOUT_MS = 90000;

interface DetectionResult {
  events: CivicEvent[];
  stateStaleness: StateStalenessInfo[];
  billEventIds: string[];
  /** Bill window end; null when detection was partial, failed or timed out. */
  billsFetchedThrough: string | null;
}

/**
 * Budget for the sequential 15-state OpenStates sweep. The detector checks
 * this deadline between states and returns partial results, so a degraded
 * OpenStates costs some states that day instead of the whole run (which is
 * what killed publishing when unbounded calls blew the 300s maxDuration).
 */
const STATE_DETECTION_BUDGET_MS = 120000;

/** Detect all new civic events from government APIs */
async function detectNewEvents(): Promise<DetectionResult> {
  const [
    billEvents,
    voteEvents,
    senateVoteEvents,
    eoEvents,
    commentEvents,
    hearingEvents,
    stateResult,
  ] = await Promise.all([
    withDetectionTimeout(detectBillEventsWithWindow, 'bills', BILL_DETECTION_TIMEOUT_MS, {
      events: [],
      fetchedThrough: null,
    }),
    withDetectionTimeout(detectVoteEvents, 'votes'),
    withDetectionTimeout(detectSenateVoteEvents, 'senate-votes'),
    withDetectionTimeout(detectExecutiveOrderEvents, 'executive-orders'),
    withDetectionTimeout(detectCommentPeriodEvents, 'comment-periods'),
    withDetectionTimeout(detectHearingEvents, 'hearings'),
    detectStateEventsWithStaleness(Date.now() + STATE_DETECTION_BUDGET_MS).catch(err => {
      logger.error('State event detection failed', err as Error, {
        operation: 'nostr_publisher',
      });
      return { events: [] as CivicEvent[], staleness: [] as StateStalenessInfo[] };
    }),
  ]);
  return {
    events: [
      ...billEvents.events,
      ...voteEvents,
      ...senateVoteEvents,
      ...eoEvents,
      ...commentEvents,
      ...hearingEvents,
      ...stateResult.events,
    ],
    stateStaleness: stateResult.staleness,
    billEventIds: billEvents.events.map(e => e.id),
    billsFetchedThrough: billEvents.fetchedThrough,
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron authentication
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
    // Publish NIP-65 relay list (Kind 10002, replaceable — safe every run)
    await publishRelayList(keypair.privateKey).catch(err =>
      logger.warn('NIP-65 relay list publish failed', {
        error: err instanceof Error ? err.message : 'Unknown',
        operation: 'nostr_publisher',
      })
    );

    // Publish NIP-01 profile metadata (Kind 0, replaceable — safe every run)
    await publishProfileMetadata(keypair.privateKey).catch(err =>
      logger.warn('NIP-01 profile metadata publish failed', {
        error: err instanceof Error ? err.message : 'Unknown',
        operation: 'nostr_publisher',
      })
    );

    // Process any pending Accept delivery retries
    await processAcceptRetries().catch(err =>
      logger.warn('Accept retry processing failed', {
        error: err instanceof Error ? err.message : 'Unknown',
        operation: 'nostr_publisher',
      })
    );

    // Detect new events
    const { events, stateStaleness, billEventIds, billsFetchedThrough } = await detectNewEvents();

    logger.info(`Detected ${events.length} new civic events`, {
      operation: 'nostr_publisher',
    });

    // Sign, publish, and federate. Deadline leaves headroom under the 300s
    // maxDuration; events cut off by it have no dedup entry and publish next run.
    const result = await publishAndFederate(events, keypair.privateKey, {
      deadline: startTime + 240000,
    });

    // Move the bill window forward only when every bill event made it out;
    // otherwise the next run reaches back to re-detect the deferred ones.
    const unpublished = new Set(result.unpublishedEventIds);
    if (billsFetchedThrough && !billEventIds.some(id => unpublished.has(id))) {
      await advanceBillWatermark(billsFetchedThrough).catch(err =>
        logger.warn('Bill watermark update failed', {
          error: err instanceof Error ? err.message : 'Unknown',
          operation: 'nostr_publisher',
        })
      );
    }

    const totalTime = Date.now() - startTime;
    const summary: NostrPublishRun = {
      eventsDetected: events.length,
      eventsPublished: result.eventsPublished,
      eventsSkipped: result.eventsDeferred,
      eventsFailed: result.eventsFailed,
      activityPubAdded: result.activityPubAdded,
      activityPubDelivered: result.activityPubDelivered,
      alertEventsPublished: result.alertEventsPublished,
      stateStaleness: stateStaleness.length > 0 ? stateStaleness : undefined,
      relayResults: result.relayResults,
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
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return POST(request);
}
