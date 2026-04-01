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
  detectBillEvents,
  detectVoteEvents,
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
async function withDetectionTimeout(
  fn: () => Promise<CivicEvent[]>,
  label: string,
  timeoutMs = 30000
): Promise<CivicEvent[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<CivicEvent[]>(resolve => {
        timer = setTimeout(() => {
          logger.warn(`Event detection timed out: ${label}`, {
            timeoutMs,
            operation: 'nostr_publisher',
          });
          resolve([]);
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    logger.error(`Event detection failed: ${label}`, error as Error, {
      operation: 'nostr_publisher',
    });
    return [];
  } finally {
    clearTimeout(timer);
  }
}

interface DetectionResult {
  events: CivicEvent[];
  stateStaleness: StateStalenessInfo[];
}

/** Detect all new civic events from government APIs */
async function detectNewEvents(): Promise<DetectionResult> {
  const [billEvents, voteEvents, eoEvents, commentEvents, hearingEvents, stateResult] =
    await Promise.all([
      withDetectionTimeout(detectBillEvents, 'bills'),
      withDetectionTimeout(detectVoteEvents, 'votes'),
      withDetectionTimeout(detectExecutiveOrderEvents, 'executive-orders'),
      withDetectionTimeout(detectCommentPeriodEvents, 'comment-periods'),
      withDetectionTimeout(detectHearingEvents, 'hearings'),
      detectStateEventsWithStaleness().catch(err => {
        logger.error('State event detection failed', err as Error, {
          operation: 'nostr_publisher',
        });
        return { events: [] as CivicEvent[], staleness: [] as StateStalenessInfo[] };
      }),
    ]);
  return {
    events: [
      ...billEvents,
      ...voteEvents,
      ...eoEvents,
      ...commentEvents,
      ...hearingEvents,
      ...stateResult.events,
    ],
    stateStaleness: stateResult.staleness,
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
    const { events, stateStaleness } = await detectNewEvents();

    logger.info(`Detected ${events.length} new civic events`, {
      operation: 'nostr_publisher',
    });

    // Sign, publish, and federate
    const result = await publishAndFederate(events, keypair.privateKey);

    const totalTime = Date.now() - startTime;
    const summary: NostrPublishRun = {
      eventsDetected: events.length,
      eventsPublished: result.eventsPublished,
      eventsSkipped: 0,
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
