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

export class RedisCache {
  private client: Redis | null = null;
  private fallbackCache: Map<string, CacheEntry>;
  private isConnected: boolean = false;
  private readonly keyPrefix: string;
  private redisAvailable: boolean;

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
      logger.info('✅ Upstash REST API credentials detected - using REST for serverless');
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

      logger.info('🔧 Redis Config:', {
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
      logger.info('🔌 Attempting Redis connection...');
      await this.client.ping();
      logger.info('✅ Redis connection successful');
    } catch (error) {
      logger.error('❌ Redis connection failed:', error as Error, {
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
          const response = await fetch(
            `${process.env.UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(this.keyPrefix + key)}/${serializedValue}/EX/${ttlSeconds}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
              },
            }
          );

          if (response.ok) {
            monitor.end();
            logger.debug('[Cache] REST API set', key, { ttl: ttlSeconds });
            return true;
          }

          throw new Error(`REST API failed: ${response.status}`);
        } catch (restError) {
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

  async keys(pattern: string): Promise<string[]> {
    try {
      if (this.isConnected && this.client) {
        return await this.client.keys(pattern);
      } else {
        // Search fallback cache
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Array.from(this.fallbackCache.keys()).filter(key => regex.test(key));
      }
    } catch (error) {
      logger.error('Failed to get keys', error as Error, { pattern });
      return [];
    }
  }

  getStatus(): {
    isConnected: boolean;
    fallbackCacheSize: number;
    redisStatus: string;
    redisAvailable: boolean;
  } {
    return {
      isConnected: this.isConnected,
      fallbackCacheSize: this.fallbackCache.size,
      redisStatus: this.client?.status || 'not-available',
      redisAvailable: this.redisAvailable,
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
