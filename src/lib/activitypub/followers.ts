/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ActivityPub Follower Store
 *
 * Redis-backed follower management using per-follower keys for atomic operations.
 * Each follower is stored as an individual Redis key, eliminating race conditions
 * from the previous read-modify-write pattern on a shared JSON array.
 */

import { getRedisCache } from '@/lib/cache/redis-client';

const FOLLOWER_PREFIX = 'activitypub:follower:';

interface FollowerEntry {
  actorId: string;
  inbox: string;
  followedAt: string;
}

/** Add a follower (atomic — single SET per follower) */
export async function addFollower(actorId: string, inbox: string): Promise<void> {
  const cache = getRedisCache();
  const key = `${FOLLOWER_PREFIX}${encodeURIComponent(actorId)}`;
  const entry: FollowerEntry = {
    actorId,
    inbox,
    followedAt: new Date().toISOString(),
  };
  await cache.set(key, entry, 0);
}

/** Remove a follower (atomic — single DELETE per follower) */
export async function removeFollower(actorId: string): Promise<void> {
  const cache = getRedisCache();
  const key = `${FOLLOWER_PREFIX}${encodeURIComponent(actorId)}`;
  await cache.delete(key);
}

/** Get all follower entries */
export async function getFollowerEntries(): Promise<FollowerEntry[]> {
  const cache = getRedisCache();
  const keys = await cache.keys(`${FOLLOWER_PREFIX}*`);
  const entries: FollowerEntry[] = [];

  for (const key of keys) {
    const entry = await cache.get<FollowerEntry>(key);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

/** Get follower count */
export async function getFollowerCount(): Promise<number> {
  const cache = getRedisCache();
  const keys = await cache.keys(`${FOLLOWER_PREFIX}*`);
  return keys.length;
}

/** Get all follower actor IDs */
export async function getFollowerIds(): Promise<string[]> {
  const entries = await getFollowerEntries();
  return entries.map(f => f.actorId);
}

/** Get all follower inboxes (for delivering activities) */
export async function getFollowerInboxes(): Promise<string[]> {
  const entries = await getFollowerEntries();
  return entries.map(f => f.inbox);
}
