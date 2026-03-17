/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Nostr Civic Intelligence Feed
 *
 * Publishes computed civic intelligence insights as signed, verifiable
 * Nostr events using NIP-78 application-specific data (Kind 30078).
 *
 * Distinct from the existing Nostr layer (Kind 30023 NIP-23 long-form)
 * which publishes legislative events. This publishes intelligence outputs.
 */

import { finalizeEvent, type VerifiedEvent } from 'nostr-tools/pure';
import { getNostrKeypair } from '@/lib/nostr/keys';
import { publishToRelays } from '@/lib/nostr/relay-pool';
import type { InsightBase } from '@/lib/intelligence/types';
import type { RelayPublishResult } from '@/types/nostr';
import logger from '@/lib/logging/simple-logger';

/** NIP-78 application-specific data kind */
const CIVIC_INTELLIGENCE_KIND = 30078;

/** Minimum confidence to publish — low-confidence insights are not broadcast */
const MIN_PUBLISH_CONFIDENCE = 0.6;

export interface CivicIntelligenceEvent {
  entityId: string;
  insightType: string;
  confidence: number;
  dataAsOf: string;
  methodology: string;
  disclaimer: string;
  /** Numeric data only — no narrative text */
  payload: Record<string, unknown>;
}

/**
 * Publish a civic intelligence insight as a signed Nostr event.
 *
 * Returns the Nostr event ID, or null if publishing was skipped
 * (no keypair, low confidence, or relay failure).
 */
export async function publishCivicIntelligence(
  entityId: string,
  insightType: string,
  insight: InsightBase,
  payload: Record<string, unknown>
): Promise<string | null> {
  if (insight.confidence < MIN_PUBLISH_CONFIDENCE) {
    logger.info('[Mesh:Feed] Skipping low-confidence insight', {
      entityId,
      insightType,
      confidence: insight.confidence,
    });
    return null;
  }

  const keypair = getNostrKeypair();
  if (!keypair) {
    logger.warn('[Mesh:Feed] No Nostr keypair configured, skipping publish');
    return null;
  }

  const event = buildCivicIntelligenceEvent(entityId, insightType, insight, payload);
  const signed = finalizeEvent(event, keypair.privateKey);

  try {
    const result = await publishToRelays(signed);
    logger.info('[Mesh:Feed] Published civic intelligence', {
      entityId,
      insightType,
      eventId: signed.id,
      relays: result.successCount,
    });
    return signed.id;
  } catch (err) {
    logger.error('[Mesh:Feed] Publish failed', err as Error, { entityId, insightType });
    return null;
  }
}

/**
 * Build an unsigned Nostr event for a civic intelligence insight.
 * Uses NIP-78 (Kind 30078) with structured tags for entity, type, confidence.
 */
function buildCivicIntelligenceEvent(
  entityId: string,
  insightType: string,
  insight: InsightBase,
  payload: Record<string, unknown>
) {
  const dTag = `civiq:intelligence:${entityId}:${insightType}`;

  return {
    kind: CIVIC_INTELLIGENCE_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', dTag],
      ['t', 'civic-intelligence'],
      ['t', insightType],
      ['entity', entityId],
      ['confidence', String(insight.confidence)],
      ['dataAsOf', insight.dataAsOf],
      ['methodology', insight.methodology],
      ['mesh-version', '1.0.0'],
    ],
    content: JSON.stringify({
      entityId,
      insightType,
      confidence: insight.confidence,
      dataAsOf: insight.dataAsOf,
      disclaimer: insight.disclaimer,
      payload,
    }),
  };
}

/**
 * Extract the entity type from a canonical ID for feed filtering.
 */
export function entityTypeFromId(canonicalId: string): string | null {
  const colonIndex = canonicalId.indexOf(':');
  if (colonIndex < 1) return null;
  return canonicalId.substring(0, colonIndex);
}
