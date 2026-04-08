/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';

export type AlertType = 'votes' | 'finance' | 'legislation';

export interface WatchedEntity {
  type: 'representative';
  id: string; // bioguideId
  name?: string; // display name, stored for email templates
}

export interface Subscription {
  email: string;
  emailHash: string;
  entities: WatchedEntity[];
  alertTypes: AlertType[];
  verified: boolean;
  createdAt: string;
  verifiedAt?: string;
}

const KEY_PREFIX = 'alert:';
const SUB_TTL = 365 * 24 * 60 * 60; // 1 year
const PENDING_TTL = 48 * 60 * 60; // 48 hours for unverified

function subKey(emailHash: string): string {
  return `${KEY_PREFIX}sub:${emailHash}`;
}

function entityKey(entity: WatchedEntity): string {
  return `${KEY_PREFIX}entity:${entity.type}:${entity.id}`;
}

/**
 * Create or update a pending (unverified) subscription.
 * If the email already has a verified subscription, updates entities/alertTypes.
 */
export async function createSubscription(
  email: string,
  emailHash: string,
  entities: WatchedEntity[],
  alertTypes: AlertType[]
): Promise<Subscription> {
  const cache = getRedisCache();
  const key = subKey(emailHash);

  const existing = await cache.get<Subscription>(key);

  const subscription: Subscription = {
    email,
    emailHash,
    entities,
    alertTypes,
    verified: existing?.verified ?? false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    verifiedAt: existing?.verifiedAt,
  };

  const ttl = subscription.verified ? SUB_TTL : PENDING_TTL;
  await cache.set(key, subscription, ttl);

  // If already verified, update entity indexes immediately
  if (subscription.verified) {
    await updateEntityIndexes(emailHash, entities);
  }

  logger.info('[Alerts] Subscription created/updated', {
    emailHash,
    entityCount: entities.length,
    verified: subscription.verified,
  });

  return subscription;
}

/**
 * Verify a subscription (double opt-in confirmation).
 */
export async function verifySubscription(emailHash: string): Promise<Subscription | null> {
  const cache = getRedisCache();
  const key = subKey(emailHash);

  const subscription = await cache.get<Subscription>(key);
  if (!subscription) return null;

  subscription.verified = true;
  subscription.verifiedAt = new Date().toISOString();

  await cache.set(key, subscription, SUB_TTL);
  await updateEntityIndexes(emailHash, subscription.entities);

  logger.info('[Alerts] Subscription verified', { emailHash });
  return subscription;
}

/**
 * Get a subscription by email hash.
 */
export async function getSubscription(emailHash: string): Promise<Subscription | null> {
  const cache = getRedisCache();
  return cache.get<Subscription>(subKey(emailHash));
}

/**
 * Update subscription preferences (entities and/or alert types).
 */
export async function updateSubscription(
  emailHash: string,
  updates: { entities?: WatchedEntity[]; alertTypes?: AlertType[] }
): Promise<Subscription | null> {
  const cache = getRedisCache();
  const key = subKey(emailHash);

  const subscription = await cache.get<Subscription>(key);
  if (!subscription || !subscription.verified) return null;

  // Remove old entity indexes before updating
  await removeEntityIndexes(emailHash, subscription.entities);

  if (updates.entities) subscription.entities = updates.entities;
  if (updates.alertTypes) subscription.alertTypes = updates.alertTypes;

  await cache.set(key, subscription, SUB_TTL);
  await updateEntityIndexes(emailHash, subscription.entities);

  logger.info('[Alerts] Subscription updated', { emailHash });
  return subscription;
}

/**
 * Delete a subscription (unsubscribe).
 */
export async function deleteSubscription(emailHash: string): Promise<boolean> {
  const cache = getRedisCache();
  const key = subKey(emailHash);

  const subscription = await cache.get<Subscription>(key);
  if (!subscription) return false;

  // Remove entity indexes
  await removeEntityIndexes(emailHash, subscription.entities);
  await cache.delete(key);

  logger.info('[Alerts] Subscription deleted', { emailHash });
  return true;
}

/**
 * Get all subscriber email hashes watching a specific entity.
 */
export async function getEntitySubscribers(entity: WatchedEntity): Promise<string[]> {
  const cache = getRedisCache();
  const subscribers = await cache.get<string[]>(entityKey(entity));
  return subscribers ?? [];
}

/**
 * Get all entities that have at least one subscriber.
 * Returns entity keys from Redis matching the alert:entity:* pattern.
 */
export async function getWatchedEntities(): Promise<WatchedEntity[]> {
  const cache = getRedisCache();
  const keys = await cache.keys('alert:entity:*');

  return keys
    .map(key => {
      // Key format: civiq:alert:entity:{type}:{id} or alert:entity:{type}:{id}
      const cleanKey = key.replace(/^civiq:/, '');
      const parts = cleanKey.split(':');
      // alert:entity:representative:A000370
      if (parts.length >= 4) {
        return { type: parts[2] as 'representative', id: parts.slice(3).join(':') };
      }
      return null;
    })
    .filter((e): e is WatchedEntity => e !== null);
}

// --- Internal helpers ---

async function updateEntityIndexes(emailHash: string, entities: WatchedEntity[]): Promise<void> {
  const cache = getRedisCache();

  for (const entity of entities) {
    const key = entityKey(entity);
    const existing = await cache.get<string[]>(key);
    const subscribers = new Set(existing ?? []);
    subscribers.add(emailHash);
    await cache.set(key, Array.from(subscribers), SUB_TTL);
  }
}

async function removeEntityIndexes(emailHash: string, entities: WatchedEntity[]): Promise<void> {
  const cache = getRedisCache();

  for (const entity of entities) {
    const key = entityKey(entity);
    const existing = await cache.get<string[]>(key);
    if (!existing) continue;

    const subscribers = new Set(existing);
    subscribers.delete(emailHash);

    if (subscribers.size === 0) {
      await cache.delete(key);
    } else {
      await cache.set(key, Array.from(subscribers), SUB_TTL);
    }
  }
}
