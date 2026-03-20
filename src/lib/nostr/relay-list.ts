/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * NIP-65 Relay List Publisher
 *
 * Publishes Kind 10002 events so clients know which relays
 * to query for CIV.IQ content. Replaceable event — safe to
 * re-publish on every cron run.
 */

import { finalizeEvent } from 'nostr-tools/pure';
import { nostrConfig } from '@/config/nostr.config';
import { publishToRelays } from './relay-pool';
import type { RelayPublishResult } from '@/types/nostr';
import logger from '@/lib/logging/simple-logger';

/** NIP-01 Kind 0 profile metadata for CIV.IQ */
const PROFILE_METADATA = {
  name: 'CIV.IQ',
  about:
    'Open civic intelligence. Bills, votes, spending, committees — real government data, published as public record. civdotiq.org',
  picture: 'https://civdotiq.org/images/civiq-logo.png',
  nip05: 'civiq@civdotiq.org',
  website: 'https://civdotiq.org',
};

/** Publish a NIP-01 profile metadata event (Kind 0, replaceable) */
export async function publishProfileMetadata(privateKey: Uint8Array): Promise<RelayPublishResult> {
  const unsignedEvent = {
    kind: 0,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify(PROFILE_METADATA),
  };

  const signed = finalizeEvent(unsignedEvent, privateKey);
  const result = await publishToRelays(signed);

  logger.info('NIP-01 profile metadata published', {
    successCount: result.successCount,
    operation: 'nostr_publisher',
  });

  return result;
}

/** Publish a NIP-65 relay list (Kind 10002) */
export async function publishRelayList(privateKey: Uint8Array): Promise<RelayPublishResult> {
  const tags = nostrConfig.relays.flatMap(url => [
    ['r', url, 'write'],
    ['r', url, 'read'],
  ]);

  const unsignedEvent = {
    kind: 10002,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: '',
  };

  const signed = finalizeEvent(unsignedEvent, privateKey);
  const result = await publishToRelays(signed);

  logger.info('NIP-65 relay list published', {
    relays: nostrConfig.relays.length,
    successCount: result.successCount,
    operation: 'nostr_publisher',
  });

  return result;
}
