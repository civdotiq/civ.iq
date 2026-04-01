/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ActivityPub Follower Store
 *
 * Redis-backed follower management. Stores actor IRIs of
 * Mastodon/fediverse instances following CIV.IQ.
 *
 * Uses a single JSON array in Redis. The read-modify-write pattern is
 * not atomic, but Follow requests arrive infrequently (human-initiated)
 * so concurrent races are effectively impossible in practice.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import { activitypubConfig } from '@/config/activitypub.config';

export interface FollowerEntry {
  actorId: string;
  inbox: string;
  sharedInbox?: string;
  followedAt: string;
}

/** Add a follower */
export async function addFollower(
  actorId: string,
  inbox: string,
  sharedInbox?: string
): Promise<void> {
  const cache = getRedisCache();
  const followers = await getFollowerEntries();

  // Don't add duplicates
  if (followers.some(f => f.actorId === actorId)) return;

  followers.push({
    actorId,
    inbox,
    sharedInbox,
    followedAt: new Date().toISOString(),
  });

  await cache.set(activitypubConfig.followersKey, followers, 0);
}

/** Remove a follower */
export async function removeFollower(actorId: string): Promise<void> {
  const cache = getRedisCache();
  const followers = await getFollowerEntries();
  const filtered = followers.filter(f => f.actorId !== actorId);
  await cache.set(activitypubConfig.followersKey, filtered, 0);
}

/** Get all follower entries */
export async function getFollowerEntries(): Promise<FollowerEntry[]> {
  const cache = getRedisCache();
  return (await cache.get<FollowerEntry[]>(activitypubConfig.followersKey)) ?? [];
}

/** Get follower count */
export async function getFollowerCount(): Promise<number> {
  const entries = await getFollowerEntries();
  return entries.length;
}

/** Get all follower actor IDs */
export async function getFollowerIds(): Promise<string[]> {
  const entries = await getFollowerEntries();
  return entries.map(f => f.actorId);
}

/** Get all follower inboxes (for delivering activities), preferring shared inbox */
export async function getFollowerInboxes(): Promise<string[]> {
  const entries = await getFollowerEntries();
  const inboxSet = new Set<string>();
  for (const f of entries) {
    inboxSet.add(f.sharedInbox ?? f.inbox);
  }
  return [...inboxSet];
}
