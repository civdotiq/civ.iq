/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Nostr Event Creation & Signing
 * Builds NIP-23 long-form content events from civic data
 */

import { finalizeEvent, type VerifiedEvent } from 'nostr-tools/pure';
import { naddrEncode } from 'nostr-tools/nip19';
import type { CivicEvent } from '@/types/nostr';
import { nostrConfig } from '@/config/nostr.config';

/** Build and sign a Nostr event from a CivicEvent */
export function createSignedCivicEvent(event: CivicEvent, privateKey: Uint8Array): VerifiedEvent {
  const dTag = `civiq:${event.type}:${event.id}`;

  const unsignedEvent = {
    kind: nostrConfig.eventKind,
    created_at: event.timestamp,
    tags: [
      ['d', dTag],
      ['title', event.title],
      ['summary', event.summary],
      ['published_at', String(event.timestamp)],
      ['t', event.type],
      ['r', event.source.url],
      ...event.tags.map(t => ['t', t]),
    ],
    content: buildMarkdownContent(event),
  };

  return finalizeEvent(unsignedEvent, privateKey);
}

/**
 * Build and sign a NIP-09 deletion event (Kind 5) for retracting a published event.
 */
export function createDeletionEvent(
  originalEventId: string,
  reason: string,
  privateKey: Uint8Array
): VerifiedEvent {
  const unsignedEvent = {
    kind: 5,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['e', originalEventId]],
    content: reason,
  };

  return finalizeEvent(unsignedEvent, privateKey);
}

/**
 * Build and sign a Kind 1 short note alert for social timeline visibility.
 * Links back to the Kind 30023 article via naddr pointer.
 */
export function createSignedAlertEvent(
  event: CivicEvent,
  privateKey: Uint8Array,
  articleEventId: string,
  pubkey: string
): VerifiedEvent {
  const dTag = `civiq:${event.type}:${event.id}`;

  // Build naddr pointer to the long-form article
  const naddr = naddrEncode({
    identifier: dTag,
    pubkey,
    kind: nostrConfig.eventKind,
    relays: nostrConfig.relays.slice(0, 3),
  });

  // Build hashtags from event tags
  const hashtags = event.tags
    .map(t => `#${t.replace(/[^a-zA-Z0-9]/g, '')}`)
    .concat('#civictech')
    .join(' ');

  const content = [
    event.title,
    '',
    event.summary,
    '',
    hashtags,
    '',
    `Full details: nostr:${naddr}`,
  ].join('\n');

  const tags: string[][] = [
    ['e', articleEventId, '', 'mention'],
    ['r', event.source.url],
    ...event.tags.map(t => ['t', t]),
    ['t', 'civictech'],
  ];

  const unsignedEvent = {
    kind: nostrConfig.alertEventKind,
    created_at: event.timestamp,
    tags,
    content,
  };

  return finalizeEvent(unsignedEvent, privateKey);
}

/** Build Markdown content for NIP-23 long-form events */
function buildMarkdownContent(event: CivicEvent): string {
  const lines = [
    `# ${event.title}`,
    '',
    event.summary,
    '',
    `**Type**: ${event.type} | **Source**: [${event.source.api}](${event.source.url})`,
    '',
    '---',
    '',
    '<details><summary>Structured Data</summary>',
    '',
    '```json',
    JSON.stringify(
      { platform: 'civiq', version: 1, type: event.type, data: event.data, source: event.source },
      null,
      2
    ),
    '```',
    '',
    '</details>',
  ];
  return lines.join('\n');
}
