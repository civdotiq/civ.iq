/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ActivityPub Delivery
 *
 * POSTs signed activities to follower inboxes.
 * Uses HTTP Signatures (draft-cavage) for authentication.
 */

import { getFollowerInboxes } from './followers';
import { signRequest } from './http-signatures';
import { getRedisCache } from '@/lib/cache/redis-client';
import type { APCreateActivity, APUpdateActivity } from '@/types/activitypub';
import logger from '@/lib/logging/simple-logger';

const RETRY_PREFIX = 'activitypub:retry:accept:';
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [60_000, 300_000, 1_800_000]; // 1min, 5min, 30min

export interface DeliveryResult {
  delivered: number;
  failed: number;
}

/** Activity types that can be delivered to followers */
type DeliverableActivity = APCreateActivity | APUpdateActivity;

/** Deliver an activity to all follower inboxes */
export async function deliverToFollowers(activity: DeliverableActivity): Promise<DeliveryResult> {
  const inboxes = await getFollowerInboxes();

  if (inboxes.length === 0) {
    return { delivered: 0, failed: 0 };
  }

  // Deduplicate inboxes (shared inbox optimization)
  const uniqueInboxes = [...new Set(inboxes)];
  const body = JSON.stringify(activity);

  const results = await Promise.allSettled(uniqueInboxes.map(inbox => deliverToInbox(inbox, body)));

  let delivered = 0;
  let failed = 0;

  for (const [i, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      delivered++;
    } else {
      failed++;
      logger.warn('ActivityPub delivery failed', {
        inbox: uniqueInboxes[i],
        error: result.reason instanceof Error ? result.reason.message : 'Unknown',
        operation: 'activitypub_delivery',
      });
    }
  }

  if (delivered > 0) {
    logger.info(`ActivityPub: delivered to ${delivered}/${uniqueInboxes.length} inboxes`, {
      activityId: activity.id,
      operation: 'activitypub_delivery',
    });
  }

  return { delivered, failed };
}

/** POST a signed activity to a single inbox */
async function deliverToInbox(inbox: string, body: string): Promise<void> {
  const sigHeaders = signRequest('POST', inbox, body);
  if (!sigHeaders) {
    throw new Error('Signing not configured');
  }

  const response = await fetch(inbox, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/activity+json',
      ...sigHeaders,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok && response.status !== 202) {
    throw new Error(`HTTP ${response.status}`);
  }
}

// --- Accept retry queue ---

interface AcceptRetryEntry {
  actorId: string;
  inbox: string;
  body: string;
  attempts: number;
  nextRetry: number;
}

/** Queue a failed Accept delivery for retry */
export async function queueAcceptRetry(
  actorId: string,
  inbox: string,
  body: string
): Promise<void> {
  const cache = getRedisCache();
  const key = `${RETRY_PREFIX}${encodeURIComponent(actorId)}`;
  const entry: AcceptRetryEntry = {
    actorId,
    inbox,
    body,
    attempts: 1,
    nextRetry: Date.now() + (BACKOFF_MS[0] ?? 60_000),
  };
  await cache.set(key, entry, 24 * 60 * 60); // 24h TTL
}

/** Process pending Accept retries — call from cron */
export async function processAcceptRetries(): Promise<{ retried: number; failed: number }> {
  const cache = getRedisCache();
  const keys = await cache.keys(`${RETRY_PREFIX}*`);
  let retried = 0;
  let failed = 0;

  for (const key of keys) {
    const entry = await cache.get<AcceptRetryEntry>(key);
    if (!entry || Date.now() < entry.nextRetry) continue;

    try {
      await deliverToInbox(entry.inbox, entry.body);
      await cache.delete(key);
      retried++;
      logger.info('ActivityPub: Accept retry succeeded', {
        actorId: entry.actorId,
        operation: 'activitypub_delivery',
      });
    } catch {
      if (entry.attempts >= MAX_ATTEMPTS) {
        await cache.delete(key);
        failed++;
        logger.warn('ActivityPub: Accept retry exhausted', {
          actorId: entry.actorId,
          attempts: entry.attempts,
          operation: 'activitypub_delivery',
        });
      } else {
        entry.attempts++;
        entry.nextRetry = Date.now() + (BACKOFF_MS[entry.attempts - 1] ?? 1_800_000);
        await cache.set(key, entry, 24 * 60 * 60);
      }
    }
  }

  return { retried, failed };
}
