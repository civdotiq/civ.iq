/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type Redis from 'ioredis';
import logger from '@/lib/logging/simple-logger';
import { monitorCache } from '@/lib/monitoring/telemetry';

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
  keyPrefix?: string;
}

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Result of a real round-trip against the backing store.
 *
 * Distinct from `getStatus()`, which reports *configuration* (are credentials
 * present, did we ever connect). A probe reports *reachability right now* and
 * never falls back to the in-memory cache — see `RedisCache.probe()`.
 */
export interface RedisProbeResult {
  reachable: boolean;
  latencyMs: number;
  transport: 'rest' | 'tcp' | 'none';
  error?: string;
}

/**
 * Longest TTL any cache entry may claim, in seconds (90 days).
 *
 * Guards against passing milliseconds to a seconds parameter. Every caller
 * of `cachedFetch(key, fn, ttlSeconds)` writes its TTL as an expression like
 * `6 * 60 * 60`, and appending `* 1000` to that — which reads naturally if
 * you think the unit is milliseconds — turns 6 hours into 250 days. Nothing
 * rejected it, so the entry outlived its intended life by a factor of 1000
 * and served stale data until someone noticed.
 *
 * That happened: 39 call sites shipped with millisecond TTLs. It surfaced on
 * 2026-07-27 as `congress-legislators-current` holding a 69-day-old roster —
 * two sitting members missing, one departed member still listed — on a
 * platform whose first rule is real government data or nothing.
 *
 * 90 days is comfortably above the longest deliberate TTL in the codebase
 * (30 days, for immutable Federal Register preambles) and far below the
 * smallest plausible millisecond slip (1 hour in ms is 41 days, but 6 hours
 * in ms is 250 — anything genuinely long enough to trip this is suspect).
 */
export const MAX_TTL_SECONDS = 90 * 24 * 60 * 60;

export function clampTtl(key: string, ttlSeconds: number): number {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return 3600;
  if (ttlSeconds <= MAX_TTL_SECONDS) return ttlSeconds;

  logger.error(
    '[Cache] TTL exceeds the maximum and was clamped — check for a milliseconds/seconds mix-up',
    new Error('TTL out of range'),
    {
      key,
      requestedTtlSeconds: ttlSeconds,
      clampedToSeconds: MAX_TTL_SECONDS,
      looksLikeMilliseconds: ttlSeconds % 1000 === 0,
    }
  );
  return MAX_TTL_SECONDS;
}

export class RedisCache {
  private client: Redis | null = null;
  private fallbackCache: Map<string, CacheEntry>;
  private isConnected: boolean = false;
  private readonly keyPrefix: string;
  private redisAvailable: boolean;

  // Every cache operation degrades to the in-memory fallback and reports
  // success, which is the right behaviour for serving traffic but means a
  // total Redis outage is invisible from the outside. These two fields are
  // the breadcrumb: they record that a degrade happened so health checks and
  // logs can see it. Upstash suspended this project's database for six days
  // in 2026-07 while /api/health/redis reported "healthy".
  private lastRestFailure: { op: string; message: string; at: string } | null = null;
  private restFailureCount = 0;

  constructor(config?: Partial<CacheConfig>) {
    this.keyPrefix = config?.keyPrefix || 'civiq:';
    this.fallbackCache = new Map();

    // Don't even try to connect during build phase
    const isBuildPhase =
      process.env.NEXT_PHASE === 'phase-production-build' ||
      (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL);

    if (isBuildPhase) {
      logger.info('Build phase detected, using memory cache only');
      this.redisAvailable = false;
      this.startCleanupTask();
      return;
    }

    this.redisAvailable = Boolean(
      process.env.REDIS_URL ||
        process.env.REDIS_HOST ||
        (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    );

    if (!this.redisAvailable) {
      logger.info('Redis not configured, using fallback cache only');
      this.startCleanupTask();
      return;
    }

    // If we have REST API credentials, log that we'll use them
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      logger.info('Upstash REST API credentials detected - using REST for serverless');
      this.redisAvailable = true;
      this.isConnected = true; // REST API doesn't need persistent connection
      this.startCleanupTask();
      return; // Skip ioredis setup, use REST API via fetch
    }

    // Default Redis configuration
    const defaultConfig: CacheConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: process.env.NODE_ENV === 'development' ? 1 : 3,
      lazyConnect: true,
      keyPrefix: this.keyPrefix,
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Dynamically import Redis only when needed
    this.initializeRedis(finalConfig);
    this.startCleanupTask();
  }

  private async initializeRedis(config: CacheConfig): Promise<void> {
    try {
      const { default: Redis } = await import('ioredis');

      logger.info('Redis Config:', {
        host: config.host,
        port: config.port,
        db: config.db,
        password: config.password ? '***' : 'none',
        lazyConnect: config.lazyConnect,
      });

      // Create Redis client
      this.client = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db,
        maxRetriesPerRequest: config.maxRetriesPerRequest,
        lazyConnect: config.lazyConnect,
        keyPrefix: config.keyPrefix,

        // Connection retry strategy
        retryStrategy: times => {
          // In development, fail fast after a few attempts
          if (process.env.NODE_ENV === 'development' && times > 3) {
            logger.warn('Redis connection failed in development, using fallback cache');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          logger.warn('Redis connection retry', { attempt: times, delay });
          return delay;
        },

        // Reconnect on error
        reconnectOnError: err => {
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        },
      });

      this.setupEventHandlers();
      this.forceConnect();
    } catch (error) {
      logger.warn('Failed to initialize Redis, falling back to memory cache', error as Error);
      this.redisAvailable = false;
      this.client = null;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected successfully');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', error => {
      this.isConnected = false;
      logger.error('Redis connection error', error, {
        redisHost: process.env.REDIS_HOST,
        redisPort: process.env.REDIS_PORT,
      });
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis reconnecting');
    });
  }

  private startCleanupTask(): void {
    // Clean up in-memory fallback cache every 5 minutes
    setInterval(
      () => {
        this.cleanupFallbackCache();
      },
      5 * 60 * 1000
    );
  }

  private cleanupFallbackCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.fallbackCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.fallbackCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cleaned up fallback cache', { entriesRemoved: cleaned });
    }
  }

  private getFallbackKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private async forceConnect(): Promise<void> {
    if (!this.client) return;

    try {
      logger.info('Attempting Redis connection...');
      await this.client.ping();
      logger.info('Redis connection successful');
    } catch (error) {
      logger.error('Redis connection failed:', error as Error, {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || '6379',
      });
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const monitor = monitorCache('get', key);

    try {
      // Try Upstash REST API first if available
      if (
        this.isConnected &&
        !this.client &&
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        try {
          const response = await fetch(
            `${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(this.keyPrefix + key)}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.result) {
              monitor.end(true);
              logger.debug('[Cache] REST API hit', key);
              return JSON.parse(data.result) as T;
            }
          }

          monitor.end(false);
          logger.debug('[Cache] REST API miss', key);
          return null;
        } catch (restError) {
          this.recordRestFailure('get', restError);
          logger.warn('[Cache] REST API error, falling back to memory', {
            key,
            error: (restError as Error).message,
          });
          // Fall through to memory cache
        }
      }

      if (this.isConnected && this.client) {
        const value = await this.client.get(key);

        if (value) {
          monitor.end(true);
          logger.debug('[Cache] hit', key);
          return JSON.parse(value);
        } else {
          monitor.end(false);
          logger.debug('[Cache] miss', key);
          return null;
        }
      } else {
        // Use fallback cache
        const fallbackKey = this.getFallbackKey(key);
        const entry = this.fallbackCache.get(fallbackKey);

        if (entry && Date.now() - entry.timestamp < entry.ttl) {
          monitor.end(true);
          logger.debug('[Cache] hit', key, { source: 'fallback' });
          return entry.data as T;
        } else {
          if (entry) {
            this.fallbackCache.delete(fallbackKey);
          }
          monitor.end(false);
          logger.debug('[Cache] miss', key, { source: 'fallback' });
          return null;
        }
      }
    } catch (error) {
      monitor.end(false, error as Error);
      logger.error('[Cache] error', key, { error: (error as Error).message });

      // Try fallback cache on Redis error
      const fallbackKey = this.getFallbackKey(key);
      const entry = this.fallbackCache.get(fallbackKey);

      if (entry && Date.now() - entry.timestamp < entry.ttl) {
        return entry.data as T;
      }

      return null;
    }
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds: number = 3600): Promise<boolean> {
    const monitor = monitorCache('set', key);
    ttlSeconds = clampTtl(key, ttlSeconds);

    try {
      const serializedValue = JSON.stringify(value);

      // Try Upstash REST API first if available
      if (
        this.isConnected &&
        !this.client &&
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        try {
          // Use SETEX with the value in the request body — Upstash REST treats
          // the body as the last command argument. The previous SET path
          // (.../set/<key>/<value>/EX/<ttl>) put the unencoded JSON in the URL
          // path, so any value containing '/' (every money_report payload, any
          // URL or ISO timestamp) returned 400 "ERR syntax error" and silently
          // fell through to in-memory fallback. Verified with /tmp probe on
          // 2026-05-19 — see commit message.
          const response = await fetch(
            `${process.env.UPSTASH_REDIS_REST_URL}/setex/${encodeURIComponent(this.keyPrefix + key)}/${ttlSeconds}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
              },
              body: serializedValue,
            }
          );

          if (response.ok) {
            monitor.end();
            logger.debug('[Cache] REST API set', key, { ttl: ttlSeconds });
            return true;
          }

          const errorBody = await response.text().catch(() => '');
          throw new Error(`REST API failed: ${response.status} ${errorBody}`);
        } catch (restError) {
          this.recordRestFailure('set', restError);
          logger.warn('[Cache] REST API error on set, falling back to memory', {
            key,
            error: (restError as Error).message,
          });
          // Fall through to memory cache
        }
      }

      if (this.isConnected && this.client) {
        await this.client.setex(key, ttlSeconds, serializedValue);
        monitor.end();
        logger.debug('[Cache] set', key, { ttl: ttlSeconds });
      } else {
        // Use fallback cache
        const fallbackKey = this.getFallbackKey(key);
        this.fallbackCache.set(fallbackKey, {
          data: value,
          timestamp: Date.now(),
          ttl: ttlSeconds * 1000, // Convert to milliseconds
        });
        monitor.end();
        logger.debug('[Cache] set', key, { ttl: ttlSeconds, source: 'fallback' });
      }

      return true;
    } catch (error) {
      monitor.end(false, error as Error);
      logger.error('[Cache] error', key, {
        operation: 'set',
        error: (error as Error).message,
      });

      // Try fallback cache on Redis error
      try {
        const fallbackKey = this.getFallbackKey(key);
        this.fallbackCache.set(fallbackKey, {
          data: value,
          timestamp: Date.now(),
          ttl: ttlSeconds * 1000,
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  async delete(key: string): Promise<boolean> {
    const monitor = monitorCache('delete', key);

    try {
      // Try Upstash REST API first if available
      if (
        this.isConnected &&
        !this.client &&
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        try {
          const response = await fetch(
            `${process.env.UPSTASH_REDIS_REST_URL}/del/${encodeURIComponent(this.keyPrefix + key)}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            monitor.end();
            logger.debug('[Cache] REST API delete', key, { deleted: data.result > 0 });
            return data.result > 0;
          }

          throw new Error(`REST API failed: ${response.status}`);
        } catch (restError) {
          this.recordRestFailure('delete', restError);
          logger.warn('[Cache] REST API error on delete, falling back to memory', {
            key,
            error: (restError as Error).message,
          });
          // Fall through to memory cache
        }
      }

      if (this.isConnected && this.client) {
        const result = await this.client.del(key);
        monitor.end();
        logger.debug('[Cache] delete', key, { deleted: result > 0 });
        return result > 0;
      } else {
        // Use fallback cache
        const fallbackKey = this.getFallbackKey(key);
        const existed = this.fallbackCache.has(fallbackKey);
        this.fallbackCache.delete(fallbackKey);
        monitor.end();
        logger.debug('[Cache] delete', key, { deleted: existed, source: 'fallback' });
        return existed;
      }
    } catch (error) {
      monitor.end(false, error as Error);
      logger.error('[Cache] error', key, {
        operation: 'delete',
        error: (error as Error).message,
      });

      // Try fallback cache on Redis error
      const fallbackKey = this.getFallbackKey(key);
      const existed = this.fallbackCache.has(fallbackKey);
      this.fallbackCache.delete(fallbackKey);
      return existed;
    }
  }

  async flush(): Promise<boolean> {
    try {
      // Try Upstash REST API first if available
      if (
        this.isConnected &&
        !this.client &&
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        try {
          const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/flushdb`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
            },
          });

          if (response.ok) {
            logger.info('REST API cache flushed');
          } else {
            throw new Error(`REST API failed: ${response.status}`);
          }
        } catch (restError) {
          this.recordRestFailure('flush', restError);
          logger.warn('[Cache] REST API error on flush', {
            error: (restError as Error).message,
          });
          // Continue anyway - we'll clear memory cache
        }
      }

      if (this.isConnected && this.client) {
        await this.client.flushdb();
        logger.info('Redis cache flushed');
      }

      // Clear fallback cache too
      this.fallbackCache.clear();
      logger.info('Fallback cache cleared');

      return true;
    } catch (error) {
      logger.error('Failed to flush cache', error as Error);

      // Clear fallback cache even if Redis fails
      this.fallbackCache.clear();
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      // Try Upstash REST API first if available
      if (
        this.isConnected &&
        !this.client &&
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        try {
          const response = await fetch(
            `${process.env.UPSTASH_REDIS_REST_URL}/exists/${encodeURIComponent(this.keyPrefix + key)}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            return data.result === 1;
          }

          throw new Error(`REST API failed: ${response.status}`);
        } catch (restError) {
          this.recordRestFailure('exists', restError);
          logger.warn('[Cache] REST API error on exists, falling back to memory', {
            key,
            error: (restError as Error).message,
          });
          // Fall through to memory cache
        }
      }

      if (this.isConnected && this.client) {
        const result = await this.client.exists(key);
        return result === 1;
      } else {
        const fallbackKey = this.getFallbackKey(key);
        const entry = this.fallbackCache.get(fallbackKey);
        return entry !== undefined && Date.now() - entry.timestamp < entry.ttl;
      }
    } catch (error) {
      logger.error('[Cache] error', key, {
        operation: 'exists',
        error: (error as Error).message,
      });

      // Check fallback cache
      const fallbackKey = this.getFallbackKey(key);
      const entry = this.fallbackCache.get(fallbackKey);
      return entry !== undefined && Date.now() - entry.timestamp < entry.ttl;
    }
  }

  /**
   * Batch get multiple keys at once. Returns results in the same order as keys.
   * Null for keys that don't exist or on error.
   */
  async mget<T = unknown>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];

    try {
      // Upstash REST API
      if (
        this.isConnected &&
        !this.client &&
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        try {
          const prefixedKeys = keys.map(k => encodeURIComponent(this.keyPrefix + k));
          const response = await fetch(
            `${process.env.UPSTASH_REDIS_REST_URL}/mget/${prefixedKeys.join('/')}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const results: (T | null)[] = (data.result as (string | null)[]).map(
              (val: string | null) => (val ? (JSON.parse(val) as T) : null)
            );
            return results;
          }

          throw new Error(`REST API failed: ${response.status}`);
        } catch (restError) {
          this.recordRestFailure('mget', restError);
          logger.warn('[Cache] REST API error on mget, falling back to memory', {
            error: (restError as Error).message,
          });
        }
      }

      // ioredis native mget
      if (this.isConnected && this.client) {
        const values = await this.client.mget(...keys);
        return values.map(v => (v ? (JSON.parse(v) as T) : null));
      }

      // Fallback: individual memory cache lookups
      return keys.map(key => {
        const fallbackKey = this.getFallbackKey(key);
        const entry = this.fallbackCache.get(fallbackKey);
        if (entry && Date.now() - entry.timestamp < entry.ttl) {
          return entry.data as T;
        }
        return null;
      });
    } catch (error) {
      logger.error('[Cache] mget error', {
        error: (error as Error).message,
        keyCount: keys.length,
      });

      // Fallback to individual memory lookups
      return keys.map(key => {
        const fallbackKey = this.getFallbackKey(key);
        const entry = this.fallbackCache.get(fallbackKey);
        if (entry && Date.now() - entry.timestamp < entry.ttl) {
          return entry.data as T;
        }
        return null;
      });
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      // Upstash REST API — without this, /api/cache/invalidate silently
      // returns 0 matches in production because this.client is null (REST
      // mode skips ioredis entirely). Verified post-MR15/MR16 deploy: stale
      // analyzer cache entries could not be flushed without this path.
      if (
        this.isConnected &&
        !this.client &&
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
      ) {
        try {
          const response = await fetch(
            `${process.env.UPSTASH_REDIS_REST_URL}/keys/${encodeURIComponent(pattern)}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            return Array.isArray(data.result) ? (data.result as string[]) : [];
          }
          throw new Error(`REST API failed: ${response.status}`);
        } catch (restError) {
          this.recordRestFailure('keys', restError);
          logger.warn('[Cache] REST API error on keys, falling back to memory', {
            pattern,
            error: (restError as Error).message,
          });
          // Fall through to memory cache
        }
      }

      if (this.isConnected && this.client) {
        return await this.client.keys(pattern);
      }

      // Search fallback cache
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return Array.from(this.fallbackCache.keys()).filter(key => regex.test(key));
    } catch (error) {
      logger.error('Failed to get keys', error as Error, { pattern });
      return [];
    }
  }

  /** Record that an operation degraded to the in-memory fallback. */
  private recordRestFailure(op: string, error: unknown): void {
    this.restFailureCount++;
    this.lastRestFailure = {
      op,
      message: error instanceof Error ? error.message : String(error),
      at: new Date().toISOString(),
    };
  }

  /**
   * Round-trip the backing store and report what actually happened.
   *
   * Deliberately does NOT use get/set/exists: those swallow transport errors
   * and answer from the in-memory fallback, so they return `true` against a
   * suspended database. This writes, reads back, and verifies the value, and
   * surfaces the upstream error verbatim on failure — which is how an
   * operator learns the difference between "cache is cold" and
   * "ERR This database has been suspended for exceeding the defined budget".
   */
  async probe(): Promise<RedisProbeResult> {
    const startedAt = Date.now();
    const elapsed = () => Date.now() - startedAt;
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!this.redisAvailable) {
      return {
        reachable: false,
        latencyMs: elapsed(),
        transport: 'none',
        error: 'Redis is not configured in this environment',
      };
    }

    if (url && token) {
      const auth = { Authorization: `Bearer ${token}` };
      const key = `${this.keyPrefix}health:probe`;
      const token36 = Date.now().toString(36);
      try {
        const write = await fetch(`${url}/setex/${encodeURIComponent(key)}/30`, {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({ probe: token36 }),
        });
        if (!write.ok) {
          const body = await write.text().catch(() => '');
          return {
            reachable: false,
            latencyMs: elapsed(),
            transport: 'rest',
            error: `write failed: ${write.status} ${body}`.trim(),
          };
        }

        const read = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: auth });
        if (!read.ok) {
          const body = await read.text().catch(() => '');
          return {
            reachable: false,
            latencyMs: elapsed(),
            transport: 'rest',
            error: `read failed: ${read.status} ${body}`.trim(),
          };
        }

        const payload: unknown = await read.json();
        const stored =
          typeof payload === 'object' && payload !== null && 'result' in payload
            ? (payload as { result: unknown }).result
            : null;
        const roundTripped = typeof stored === 'string' && stored.includes(token36);

        await fetch(`${url}/del/${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: auth,
        }).catch(() => undefined);

        return {
          reachable: roundTripped,
          latencyMs: elapsed(),
          transport: 'rest',
          ...(roundTripped
            ? {}
            : { error: 'write reported success but the value did not read back' }),
        };
      } catch (error) {
        return {
          reachable: false,
          latencyMs: elapsed(),
          transport: 'rest',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    try {
      const pong = await this.client?.ping();
      return {
        reachable: pong === 'PONG',
        latencyMs: elapsed(),
        transport: 'tcp',
        ...(pong === 'PONG' ? {} : { error: `unexpected PING response: ${String(pong)}` }),
      };
    } catch (error) {
      return {
        reachable: false,
        latencyMs: elapsed(),
        transport: 'tcp',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getStatus(): {
    isConnected: boolean;
    fallbackCacheSize: number;
    redisStatus: string;
    redisAvailable: boolean;
    degraded: boolean;
    restFailureCount: number;
    lastRestFailure: { op: string; message: string; at: string } | null;
  } {
    return {
      isConnected: this.isConnected,
      fallbackCacheSize: this.fallbackCache.size,
      redisStatus: this.client?.status || 'not-available',
      redisAvailable: this.redisAvailable,
      degraded: this.restFailureCount > 0,
      restFailureCount: this.restFailureCount,
      lastRestFailure: this.lastRestFailure,
    };
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.quit();
      logger.info('Redis client disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis', error as Error);
    }
  }
}

// Create singleton instance
let redisCache: RedisCache | null = null;

export function getRedisCache(): RedisCache {
  if (!redisCache) {
    redisCache = new RedisCache();
  }
  return redisCache;
}

export default RedisCache;
