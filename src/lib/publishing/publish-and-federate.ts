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
import type { CivicEvent, RelayPublishResult, DedupEntry } from '@/types/nostr';
import logger from '@/lib/logging/simple-logger';

export interface PublishResult {
  eventsPublished: number;
  eventsFailed: number;
  activityPubAdded: number;
  activityPubDelivered: number;
  alertEventsPublished: number;
  correctionsPublished: number;
  relayResults: RelayPublishResult[];
}

/** Compute a content hash for change detection */
export function computeContentHash(data: unknown): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/** Sign, publish to Nostr relays, and federate to ActivityPub */
export async function publishAndFederate(
  events: CivicEvent[],
  privateKey: Uint8Array
): Promise<PublishResult> {
  const cache = getRedisCache();
  const pubkey = getPublicKey(privateKey);
  const relayResults: RelayPublishResult[] = [];
  let eventsPublished = 0;
  let eventsFailed = 0;
  let activityPubAdded = 0;
  let activityPubDelivered = 0;
  let alertEventsPublished = 0;
  let correctionsPublished = 0;

  for (const event of events) {
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

        // Dual publish: Kind 1 alert for social timeline visibility
        if (nostrConfig.enableDualPublish) {
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
        }

        // Also add to ActivityPub outbox
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

  return {
    eventsPublished,
    eventsFailed,
    activityPubAdded,
    activityPubDelivered,
    alertEventsPublished,
    correctionsPublished,
    relayResults,
  };
}
