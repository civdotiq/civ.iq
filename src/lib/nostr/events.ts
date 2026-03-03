/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Nostr Event Creation & Signing
 * Builds NIP-23 long-form content events from civic data
 */

import { finalizeEvent, type VerifiedEvent } from 'nostr-tools/pure';
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
