/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Publish & Federate
 *
 * Signs civic events as Nostr events, publishes to relays,
 * and mirrors to ActivityPub outbox with follower delivery.
 * Supports corrections: when upstream data changes, retracts the
 * original via NIP-09 deletion + AP Delete/Tombstone, then re-publishes.
 */

import { createHash } from 'crypto';
import { getRedisCache } from '@/lib/cache/redis-client';
import {
  createSignedCivicEvent,
  createSignedAlertEvent,
  createDeletionEvent,
  publishToRelays,
} from '@/lib/nostr';
import { getPublicKey } from 'nostr-tools/pure';
import { nostrConfig } from '@/config/nostr.config';
import {
  civicEventToNote,
  wrapInCreate,
  wrapInUpdate,
  addToOutbox,
  isInOutbox,
  createDeleteActivity,
  removeFromOutbox,
} from '@/lib/activitypub/outbox';
import { deliverToFollowers } from '@/lib/activitypub/delivery';
import { submitToIndexNow, eventToCanonicalPath } from '@/lib/publishing/indexnow';
import { getServerBaseUrl } from '@/lib/server-url';
import type { CivicEvent, RelayPublishResult, DedupEntry } from '@/types/nostr';
import logger from '@/lib/logging/simple-logger';

export interface PublishResult {
  eventsPublished: number;
  eventsFailed: number;
  eventsDeferred: number;
  activityPubAdded: number;
  activityPubDelivered: number;
  alertEventsPublished: number;
  correctionsPublished: number;
  relayResults: RelayPublishResult[];
}

export interface PublishOptions {
  /**
   * Epoch ms after which no further events are published. Deferred events
   * have no dedup entry, so the next run picks them up — this trades a
   * one-day delay for never being killed mid-run by the function timeout.
   */
  deadline?: number;
}

/** Compute a content hash for change detection */
export function computeContentHash(data: unknown): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/** Sign, publish to Nostr relays, and federate to ActivityPub */
export async function publishAndFederate(
  events: CivicEvent[],
  privateKey: Uint8Array,
  options?: PublishOptions
): Promise<PublishResult> {
  const cache = getRedisCache();
  const pubkey = getPublicKey(privateKey);
  const relayResults: RelayPublishResult[] = [];
  let eventsPublished = 0;
  let eventsFailed = 0;
  let eventsDeferred = 0;
  let activityPubAdded = 0;
  let activityPubDelivered = 0;
  let alertEventsPublished = 0;
  let correctionsPublished = 0;
  // Canonical civ.iq paths for successfully published events, submitted to
  // IndexNow in one batch after the loop.
  const indexNowPaths: string[] = [];

  for (const event of events) {
    if (options?.deadline && Date.now() >= options.deadline) {
      eventsDeferred = events.length - eventsPublished - eventsFailed;
      logger.warn('Publish deadline reached, deferring remaining events to next run', {
        eventsDeferred,
        operation: 'nostr_publisher',
      });
      break;
    }
    try {
      // If this is a correction, retract the original first
      if (event._correction) {
        try {
          const { originalNostrEventId, originalNoteId } = event._correction;

          // NIP-09: publish Kind 5 deletion
          const deletionEvent = createDeletionEvent(
            originalNostrEventId,
            `Correction: upstream data updated for ${event.id}`,
            privateKey
          );
          await publishToRelays(deletionEvent);

          // AP: deliver Delete with Tombstone
          const deleteActivity = createDeleteActivity(originalNoteId);
          await deliverToFollowers(deleteActivity);
          await removeFromOutbox(originalNoteId);

          correctionsPublished++;
          logger.info('Published correction (retracted original)', {
            originalNostrEventId,
            originalNoteId,
            eventId: event.id,
            operation: 'nostr_publisher',
          });
        } catch (correctionError) {
          logger.warn('Correction retraction failed (proceeding with re-publish)', {
            eventId: event.id,
            error: correctionError instanceof Error ? correctionError.message : 'Unknown',
            operation: 'nostr_publisher',
          });
        }
      }

      const signedEvent = createSignedCivicEvent(event, privateKey);
      const result = await publishToRelays(signedEvent);
      relayResults.push(result);

      if (result.successCount >= nostrConfig.minRelaySuccess) {
        // Record enhanced dedup entry with content hash
        const dedupKey = `${nostrConfig.dedupPrefix}${event.id}`;
        const note = civicEventToNote(event);
        const dedupEntry: DedupEntry = {
          eventId: event.id,
          nostrEventId: signedEvent.id,
          noteId: note.id,
          contentHash: computeContentHash(event.data),
          publishedAt: Date.now(),
        };
        await cache.set(dedupKey, dedupEntry, nostrConfig.dedupTTL);
        eventsPublished++;

        // Queue the canonical civ.iq URL for IndexNow (skips event types with
        // no indexable detail page). Corrections re-publish here too, so an
        // updated page is re-submitted.
        const indexNowPath = eventToCanonicalPath(event);
        if (indexNowPath) indexNowPaths.push(indexNowPath);

        // Kind 1 alert and ActivityPub federation are independent of each
        // other — run them concurrently to keep per-event wall time down.
        // (Outbox index writes stay serialized: one event at a time here.)
        const alertTask = (async () => {
          if (!nostrConfig.enableDualPublish) return;
          try {
            const alertEvent = createSignedAlertEvent(event, privateKey, signedEvent.id, pubkey);
            await publishToRelays(alertEvent);
            alertEventsPublished++;
          } catch (alertError) {
            logger.warn('Kind 1 alert publish failed (non-fatal)', {
              eventId: event.id,
              error: alertError instanceof Error ? alertError.message : 'Unknown',
              operation: 'nostr_publisher',
            });
          }
        })();

        const federateTask = (async () => {
          try {
            const alreadyExists = await isInOutbox(note.id);
            const activity = alreadyExists ? wrapInUpdate(note) : wrapInCreate(note);

            if (!alreadyExists) {
              await addToOutbox(activity as ReturnType<typeof wrapInCreate>);
            }
            activityPubAdded++;

            // Deliver to follower inboxes
            const delivery = await deliverToFollowers(activity);
            activityPubDelivered += delivery.delivered;
          } catch (apError) {
            logger.error('Failed to add event to ActivityPub outbox', apError as Error, {
              eventId: event.id,
              operation: 'nostr_publisher',
            });
          }
        })();

        await Promise.all([alertTask, federateTask]);

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

  // Push freshly published URLs to IndexNow (Bing/Yandex/Seznam/Naver) in a
  // single batch. Non-fatal and gated on INDEXNOW_KEY — a no-op until set.
  // The submit fn logs accepted/rejected internally; log the skip reasons here
  // (no_key, non_canonical_host, no_urls) so a dropped env var leaves a trail
  // instead of looking identical to "nothing new to publish".
  if (indexNowPaths.length > 0) {
    const baseUrl = getServerBaseUrl();
    const indexNowResult = await submitToIndexNow(indexNowPaths.map(path => `${baseUrl}${path}`));
    if (indexNowResult.skipped) {
      logger.info('IndexNow submission skipped', {
        reason: indexNowResult.reason,
        candidates: indexNowPaths.length,
        operation: 'indexnow_publisher',
      });
    }
  }

  return {
    eventsPublished,
    eventsFailed,
    eventsDeferred,
    activityPubAdded,
    activityPubDelivered,
    alertEventsPublished,
    correctionsPublished,
    relayResults,
  };
}
