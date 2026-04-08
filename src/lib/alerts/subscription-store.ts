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
  chamber?: 'House' | 'Senate';
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
const REGISTRY_KEY = `${KEY_PREFIX}registry`;
const SUB_TTL = 365 * 24 * 60 * 60; // 1 year
const PENDING_TTL = 48 * 60 * 60; // 48 hours for unverified

function subKey(emailHash: string): string {
  return `${KEY_PREFIX}sub:${emailHash}`;
}

function entityKey(entity: WatchedEntity): string {
  return `${KEY_PREFIX}entity:${entity.type}:${entity.id}`;
}

function entityId(entity: WatchedEntity): string {
  return `${entity.type}:${entity.id}`;
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

  // If already verified, update entity indexes + registry
  if (subscription.verified) {
    if (existing?.entities) {
      await removeEntityIndexes(emailHash, existing.entities);
      await pruneRegistryEntities(existing.entities);
    }
    await updateEntityIndexes(emailHash, entities);
    await addRegistryEntities(entities);
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
  await addRegistryEntities(subscription.entities);

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

  const oldEntities = subscription.entities;

  if (updates.entities) subscription.entities = updates.entities;
  if (updates.alertTypes) subscription.alertTypes = updates.alertTypes;

  await cache.set(key, subscription, SUB_TTL);

  // Update entity indexes: remove old, add new
  await removeEntityIndexes(emailHash, oldEntities);
  await pruneRegistryEntities(oldEntities);
  await updateEntityIndexes(emailHash, subscription.entities);
  await addRegistryEntities(subscription.entities);

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

  await removeEntityIndexes(emailHash, subscription.entities);
  await cache.delete(key);
  await pruneRegistryEntities(subscription.entities);

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
 * Reads from the explicit registry key — no KEYS/SCAN needed.
 * Works with Upstash REST, ioredis, and in-memory fallback.
 */
export async function getWatchedEntities(): Promise<WatchedEntity[]> {
  const cache = getRedisCache();
  const registry = await cache.get<WatchedEntity[]>(REGISTRY_KEY);
  return registry ?? [];
}

// --- Entity index helpers ---

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

// --- Registry helpers ---

/**
 * Add entities to the registry (idempotent).
 * Merges new entities, updates name/chamber on existing ones.
 */
async function addRegistryEntities(entities: WatchedEntity[]): Promise<void> {
  const cache = getRedisCache();
  const registry = (await cache.get<WatchedEntity[]>(REGISTRY_KEY)) ?? [];
  const byId = new Map(registry.map(e => [entityId(e), e]));

  for (const entity of entities) {
    const id = entityId(entity);
    const existing = byId.get(id);
    if (existing) {
      // Update metadata (name/chamber) if provided
      if (entity.name) existing.name = entity.name;
      if (entity.chamber) existing.chamber = entity.chamber;
    } else {
      byId.set(id, { ...entity });
    }
  }

  await cache.set(REGISTRY_KEY, Array.from(byId.values()), SUB_TTL);
}

/**
 * Remove entities from the registry IF they have no remaining subscribers.
 * Checks the entity index key before removing.
 */
async function pruneRegistryEntities(entities: WatchedEntity[]): Promise<void> {
  const cache = getRedisCache();
  const registry = (await cache.get<WatchedEntity[]>(REGISTRY_KEY)) ?? [];

  const toCheck = new Set(entities.map(entityId));
  const kept: WatchedEntity[] = [];

  for (const entry of registry) {
    if (!toCheck.has(entityId(entry))) {
      // Not a candidate for pruning — keep
      kept.push(entry);
      continue;
    }

    // Check if this entity still has subscribers
    const subscribers = await cache.get<string[]>(entityKey(entry));
    if (subscribers && subscribers.length > 0) {
      kept.push(entry);
    }
    // else: no subscribers, drop from registry
  }

  await cache.set(REGISTRY_KEY, kept, SUB_TTL);
}
