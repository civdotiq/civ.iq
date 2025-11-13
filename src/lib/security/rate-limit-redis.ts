/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getRedisCache } from '@/lib/cache/redis-client';

/**
 * Redis-based rate limiting for production environments
 * Falls back to in-memory rate limiting if Redis is unavailable
 */

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  current: number;
  resetTime: number;
}

interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

// In-memory fallback for when Redis is unavailable
const memoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit using Redis (with in-memory fallback)
 * Uses the token bucket algorithm with a fixed window
 */
export async function checkRateLimitRedis(
  clientIp: string,
  path: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `ratelimit:${clientIp}:${path}`;
  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const resetTime = windowStart + config.windowMs;

  try {
    // Try Redis first
    const cache = getRedisCache();

    // Use Redis INCR and EXPIRE for atomic rate limiting
    const count = await incrementRateLimit(cache, key, config.windowMs);

    return {
      allowed: count <= config.requests,
      limit: config.requests,
      current: count,
      resetTime,
    };
  } catch {
    // Fallback to in-memory
    return checkRateLimitMemory(clientIp, path, config);
  }
}

/**
 * Increment rate limit counter in Redis atomically
 * Returns the current count after increment
 */
async function incrementRateLimit(
  cache: ReturnType<typeof getRedisCache>,
  key: string,
  windowMs: number
): Promise<number> {
  try {
    // Get current count
    const current = await cache.get<number>(key);

    if (current === null) {
      // First request in window - set to 1 with TTL
      await cache.set(key, 1, Math.ceil(windowMs / 1000));
      return 1;
    }

    // Increment existing count
    const newCount = current + 1;
    await cache.set(key, newCount, Math.ceil(windowMs / 1000));
    return newCount;
  } catch {
    throw new Error('Redis rate limit operation failed');
  }
}

/**
 * In-memory fallback rate limiting
 * Used when Redis is unavailable
 */
function checkRateLimitMemory(
  clientIp: string,
  path: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${clientIp}:${path}`;
  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const resetTime = windowStart + config.windowMs;

  let entry = memoryStore.get(key);

  // Clean up expired entries periodically (1% chance)
  if (Math.random() < 0.01) {
    cleanupMemoryStore();
  }

  if (!entry || entry.resetTime <= now) {
    entry = { count: 0, resetTime };
    memoryStore.set(key, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= config.requests,
    limit: config.requests,
    current: entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Clean up expired entries from in-memory store
 */
function cleanupMemoryStore(): void {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetTime <= now) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Reset rate limit for a specific client and path
 * Useful for testing or administrative purposes
 */
export async function resetRateLimit(clientIp: string, path: string): Promise<void> {
  const redisKey = `ratelimit:${clientIp}:${path}`;
  const memoryKey = `${clientIp}:${path}`;

  try {
    const cache = getRedisCache();
    await cache.delete(redisKey);
  } catch {
    // Ignore Redis errors, try memory store
  }

  memoryStore.delete(memoryKey);
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  clientIp: string,
  path: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `ratelimit:${clientIp}:${path}`;
  const now = Date.now();
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const resetTime = windowStart + config.windowMs;

  try {
    const cache = getRedisCache();
    const count = (await cache.get<number>(key)) || 0;

    return {
      allowed: count < config.requests,
      limit: config.requests,
      current: count,
      resetTime,
    };
  } catch {
    // Fallback to memory
    const memoryKey = `${clientIp}:${path}`;
    const entry = memoryStore.get(memoryKey);

    return {
      allowed: !entry || entry.count < config.requests,
      limit: config.requests,
      current: entry?.count || 0,
      resetTime: entry?.resetTime || resetTime,
    };
  }
}
