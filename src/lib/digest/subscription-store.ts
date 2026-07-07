/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Digest subscriber store.
 *
 * The digest is a broadcast list, not an entity watch, so it lives beside
 * the per-representative alert store rather than inside it:
 *   digest:sub:{emailHash} — one subscriber (double opt-in like alerts)
 *   digest:roster          — emailHashes of verified subscribers (send list)
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';

export interface DigestSubscription {
  email: string;
  emailHash: string;
  verified: boolean;
  createdAt: string;
  verifiedAt?: string;
}

const SUB_TTL = 365 * 24 * 60 * 60; // 1 year, refreshed on every send cycle
const PENDING_TTL = 48 * 60 * 60; // unverified subscriptions expire in 48 hours
const ROSTER_KEY = 'digest:roster';

function subKey(emailHash: string): string {
  return `digest:sub:${emailHash}`;
}

export async function createDigestSubscription(
  email: string,
  emailHash: string
): Promise<DigestSubscription> {
  const cache = getRedisCache();
  const existing = await cache.get<DigestSubscription>(subKey(emailHash));
  if (existing?.verified) return existing;

  const subscription: DigestSubscription = {
    email,
    emailHash,
    verified: false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await cache.set(subKey(emailHash), subscription, PENDING_TTL);
  return subscription;
}

export async function verifyDigestSubscription(
  emailHash: string
): Promise<DigestSubscription | null> {
  const cache = getRedisCache();
  const subscription = await cache.get<DigestSubscription>(subKey(emailHash));
  if (!subscription) return null;

  subscription.verified = true;
  subscription.verifiedAt = subscription.verifiedAt ?? new Date().toISOString();
  await cache.set(subKey(emailHash), subscription, SUB_TTL);

  const roster = (await cache.get<string[]>(ROSTER_KEY)) ?? [];
  if (!roster.includes(emailHash)) {
    roster.push(emailHash);
    await cache.set(ROSTER_KEY, roster, SUB_TTL);
  }
  return subscription;
}

export async function deleteDigestSubscription(emailHash: string): Promise<boolean> {
  const cache = getRedisCache();
  const existed = await cache.exists(subKey(emailHash));
  await cache.delete(subKey(emailHash));

  const roster = (await cache.get<string[]>(ROSTER_KEY)) ?? [];
  const next = roster.filter(h => h !== emailHash);
  if (next.length !== roster.length) {
    await cache.set(ROSTER_KEY, next, SUB_TTL);
  }
  logger.info('Digest unsubscribe', { existed });
  return existed;
}

export async function getDigestSubscription(emailHash: string): Promise<DigestSubscription | null> {
  const cache = getRedisCache();
  return cache.get<DigestSubscription>(subKey(emailHash));
}

/**
 * Verified subscribers for a send cycle. Refreshes each subscription's TTL
 * so active lists never age out, and prunes roster entries whose
 * subscription has expired.
 */
export async function listVerifiedDigestSubscribers(): Promise<DigestSubscription[]> {
  const cache = getRedisCache();
  const roster = (await cache.get<string[]>(ROSTER_KEY)) ?? [];
  if (roster.length === 0) return [];

  const subscribers: DigestSubscription[] = [];
  const liveHashes: string[] = [];
  for (const hash of roster) {
    const subscription = await cache.get<DigestSubscription>(subKey(hash));
    if (subscription?.verified) {
      subscribers.push(subscription);
      liveHashes.push(hash);
      await cache.set(subKey(hash), subscription, SUB_TTL);
    }
  }
  if (liveHashes.length !== roster.length) {
    await cache.set(ROSTER_KEY, liveHashes, SUB_TTL);
  }
  return subscribers;
}
