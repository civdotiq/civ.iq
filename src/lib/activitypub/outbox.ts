/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ActivityPub Outbox
 *
 * Converts CivicEvents into ActivityPub Create activities.
 * Same events as Nostr publisher, different serialization.
 */

import { activitypubConfig } from '@/config/activitypub.config';
import type { CivicEvent } from '@/types/nostr';
import type { APCreateActivity, APUpdateActivity, APNote, APHashtag } from '@/types/activitypub';
import { getRedisCache } from '@/lib/cache/redis-client';

const PUBLIC = 'https://www.w3.org/ns/activitystreams#Public';

/** Convert a CivicEvent into an ActivityPub Note */
export function civicEventToNote(event: CivicEvent): APNote {
  const { actor } = activitypubConfig;
  const noteId = `${activitypubConfig.baseUrl}/api/activitypub/notes/${event.id}`;

  // Build HTML content
  const content = [
    `<p><strong>${escapeHtml(event.title)}</strong></p>`,
    `<p>${escapeHtml(event.summary)}</p>`,
    `<p><a href="${escapeHtml(event.source.url)}">Source: ${escapeHtml(event.source.api)}</a></p>`,
  ].join('');

  const tags: APHashtag[] = event.tags.map(tag => ({
    type: 'Hashtag',
    name: `#${tag.replace(/[^a-zA-Z0-9]/g, '')}`,
  }));

  // Always add civictech tag
  tags.push({ type: 'Hashtag', name: '#civictech' });

  return {
    type: 'Note',
    id: noteId,
    attributedTo: actor.id,
    published: new Date(event.timestamp * 1000).toISOString(),
    content,
    url: event.source.url,
    to: [PUBLIC],
    cc: [actor.followers],
    tag: tags,
    source: {
      content: `${event.title}\n\n${event.summary}\n\nSource: ${event.source.url}`,
      mediaType: 'text/plain',
    },
  };
}

/** Wrap a Note in a Create activity */
export function wrapInCreate(note: APNote): APCreateActivity {
  const { actor } = activitypubConfig;

  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Create',
    id: `${note.id}/activity`,
    actor: actor.id,
    published: note.published,
    to: note.to,
    cc: note.cc,
    object: note,
  };
}

/** Wrap a Note in an Update activity */
export function wrapInUpdate(note: APNote): APUpdateActivity {
  const { actor } = activitypubConfig;

  return {
    '@context': 'https://www.w3.org/ns/activitystreams',
    type: 'Update',
    id: `${note.id}/activity#update-${Date.now()}`,
    actor: actor.id,
    published: new Date().toISOString(),
    to: note.to,
    cc: note.cc,
    object: note,
  };
}

/** Check if a note ID already exists in the outbox */
export async function isInOutbox(noteId: string): Promise<boolean> {
  const cache = getRedisCache();
  const activityKey = `${activitypubConfig.outboxKey}:${noteId}`;
  return cache.exists(activityKey);
}

/** Store a published activity in the outbox (Redis sorted set) */
export async function addToOutbox(activity: APCreateActivity): Promise<void> {
  const cache = getRedisCache();
  const timestamp = new Date(activity.published).getTime();

  // Store individual activity (outbox is public record — use long TTL)
  const activityKey = `${activitypubConfig.outboxKey}:${activity.object.id}`;
  await cache.set(activityKey, activity, activitypubConfig.outboxTTL);

  // Add to index (most recent IDs)
  // Note: read-modify-write is not atomic, but outbox writes only happen from
  // the daily cron job so concurrent races are extremely unlikely in practice.
  const indexKey = `${activitypubConfig.outboxKey}:index`;
  const index = (await cache.get<string[]>(indexKey)) ?? [];
  index.unshift(JSON.stringify({ id: activity.object.id, ts: timestamp }));

  // Trim to max items
  const trimmed = index.slice(0, activitypubConfig.maxOutboxItems);
  await cache.set(indexKey, trimmed, activitypubConfig.outboxTTL);
}

/** Get outbox items (paginated) */
export async function getOutboxItems(
  page: number,
  pageSize: number
): Promise<{ items: APCreateActivity[]; total: number }> {
  const cache = getRedisCache();
  const indexKey = `${activitypubConfig.outboxKey}:index`;
  const index = (await cache.get<string[]>(indexKey)) ?? [];

  const total = index.length;
  const start = page * pageSize;
  const pageEntries = index.slice(start, start + pageSize);

  const items: APCreateActivity[] = [];
  for (const entry of pageEntries) {
    const parsed = JSON.parse(entry) as { id: string; ts: number };
    const activityKey = `${activitypubConfig.outboxKey}:${parsed.id}`;
    const activity = await cache.get<APCreateActivity>(activityKey);
    if (activity) {
      items.push(activity);
    }
  }

  return { items, total };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
