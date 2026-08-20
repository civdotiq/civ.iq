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
import type {
  CivicEvent,
  BillActionEvent,
  BillIntroducedEvent,
  VoteRecordEvent,
  ExecutiveOrderEvent,
  CommentPeriodEvent,
  StateBillIntroducedEvent,
  StateBillActionEvent,
} from '@/types/nostr';
import { nostrConfig } from '@/config/nostr.config';
import { encodeBase64Url } from '@/lib/url-encoding';

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';
}

/**
 * Canonical civdotiq.org page for an event, or null where no page exists
 * (hearings, state floor votes). Paths mirror the app router: bill slugs are
 * `{congress}-{type}-{number}` lowercase, state bill ids are base64url ocd ids.
 */
export function canonicalEventUrl(event: CivicEvent): string | null {
  const base = getSiteUrl();
  switch (event.type) {
    case 'bill-action':
    case 'bill-introduced': {
      const d = event.data as BillActionEvent | BillIntroducedEvent;
      return `${base}/bill/${d.congress}-${d.billType.toLowerCase()}-${d.billNumber}`;
    }
    case 'vote-record': {
      const d = event.data as VoteRecordEvent;
      return `${base}/vote/${d.voteId}`;
    }
    case 'executive-order':
    case 'comment-period': {
      const d = event.data as ExecutiveOrderEvent | CommentPeriodEvent;
      return `${base}/regulations/${d.documentNumber}`;
    }
    case 'state-bill-introduced':
    case 'state-bill-action': {
      const d = event.data as StateBillIntroducedEvent | StateBillActionEvent;
      return `${base}/state-bills/${d.state.toLowerCase()}/${encodeBase64Url(d.billId)}`;
    }
    default:
      return null;
  }
}

/** Build and sign a Nostr event from a CivicEvent */
export function createSignedCivicEvent(event: CivicEvent, privateKey: Uint8Array): VerifiedEvent {
  const dTag = `civiq:${event.type}:${event.id}`;
  const canonicalUrl = canonicalEventUrl(event);

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
      ...(canonicalUrl ? [['r', canonicalUrl]] : []),
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

  const canonicalUrl = canonicalEventUrl(event);
  const content = [
    event.title,
    '',
    event.summary,
    '',
    hashtags,
    '',
    ...(canonicalUrl ? [`Full record: ${canonicalUrl}`] : []),
    `Full details: nostr:${naddr}`,
  ].join('\n');

  const tags: string[][] = [
    ['e', articleEventId, '', 'mention'],
    ['r', event.source.url],
    ...(canonicalUrl ? [['r', canonicalUrl]] : []),
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
  const canonicalUrl = canonicalEventUrl(event);
  const lines = [
    `# ${event.title}`,
    '',
    event.summary,
    '',
    `**Type**: ${event.type} | **Source**: [${event.source.api}](${event.source.url})`,
    ...(canonicalUrl ? ['', `[Full record on CIV.IQ](${canonicalUrl})`] : []),
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
