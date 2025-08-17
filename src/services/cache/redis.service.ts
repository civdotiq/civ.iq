/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Redis from 'ioredis';
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

export interface CacheOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  source?: 'redis' | 'fallback';
}

class RedisService {
  private static instance: RedisService;
  private client: Redis;
  private fallbackCache: Map<string, CacheEntry>;
  private isConnected: boolean = false;
  private readonly keyPrefix: string;

  private constructor(config?: Partial<CacheConfig>) {
    this.keyPrefix = config?.keyPrefix || 'civiq:';
    this.fallbackCache = new Map();

    // Default Redis configuration
    const defaultConfig: CacheConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: this.keyPrefix,
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Create Redis client
    this.client = new Redis({
      host: finalConfig.host,
      port: finalConfig.port,
      password: finalConfig.password,
      db: finalConfig.db,
      maxRetriesPerRequest: finalConfig.maxRetriesPerRequest,
      lazyConnect: finalConfig.lazyConnect,
      keyPrefix: finalConfig.keyPrefix,

      // Connection retry strategy
      retryStrategy: times => {
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
    this.startCleanupTask();
  }

  public static getInstance(config?: Partial<CacheConfig>): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService(config);
    }
    return RedisService.instance;
  }

  private setupEventHandlers(): void {
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

  /**
   * Get a value from cache
   */
  async get<T = unknown>(key: string): Promise<CacheOperationResult<T>> {
    const monitor = monitorCache('get', key);

    try {
      if (this.isConnected) {
        const value = await this.client.get(key);

        if (value) {
          monitor.end(true);
          logger.debug('Cache hit', { key });
          return {
            success: true,
            data: JSON.parse(value),
            source: 'redis',
          };
        } else {
          monitor.end(false);
          logger.debug('Cache miss', { key });
          return {
            success: true,
            data: undefined,
            source: 'redis',
          };
        }
      } else {
        // Use fallback cache
        const fallbackKey = this.getFallbackKey(key);
        const entry = this.fallbackCache.get(fallbackKey);

        if (entry && Date.now() - entry.timestamp < entry.ttl) {
          monitor.end(true);
          logger.debug('Cache hit', { key, source: 'fallback' });
          return {
            success: true,
            data: entry.data as T,
            source: 'fallback',
          };
        } else {
          if (entry) {
            this.fallbackCache.delete(fallbackKey);
          }
          monitor.end(false);
          logger.debug('Cache miss', { key, source: 'fallback' });
          return {
            success: true,
            data: undefined,
            source: 'fallback',
          };
        }
      }
    } catch (error) {
      monitor.end(false, error as Error);
      logger.error('Cache operation error', error as Error, { key, operation: 'get' });

      // Try fallback cache on Redis error
      const fallbackKey = this.getFallbackKey(key);
      const entry = this.fallbackCache.get(fallbackKey);

      if (entry && Date.now() - entry.timestamp < entry.ttl) {
        return {
          success: true,
          data: entry.data as T,
          source: 'fallback',
        };
      }

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Set a value in cache
   */
  async set<T = unknown>(
    key: string,
    value: T,
    ttlSeconds: number = 3600
  ): Promise<CacheOperationResult> {
    const monitor = monitorCache('set', key);

    try {
      const serializedValue = JSON.stringify(value);

      if (this.isConnected) {
        await this.client.setex(key, ttlSeconds, serializedValue);
        monitor.end();
        logger.debug('Cache set', { key, ttl: ttlSeconds });
        return {
          success: true,
          source: 'redis',
        };
      } else {
        // Use fallback cache
        const fallbackKey = this.getFallbackKey(key);
        this.fallbackCache.set(fallbackKey, {
          data: value,
          timestamp: Date.now(),
          ttl: ttlSeconds * 1000, // Convert to milliseconds
        });
        monitor.end();
        logger.debug('Cache set', { key, ttl: ttlSeconds, source: 'fallback' });
        return {
          success: true,
          source: 'fallback',
        };
      }
    } catch (error) {
      monitor.end(false, error as Error);
      logger.error('Cache operation error', error as Error, {
        key,
        operation: 'set',
      });

      // Try fallback cache on Redis error
      try {
        const fallbackKey = this.getFallbackKey(key);
        this.fallbackCache.set(fallbackKey, {
          data: value,
          timestamp: Date.now(),
          ttl: ttlSeconds * 1000,
        });
        return {
          success: true,
          source: 'fallback',
        };
      } catch {
        return {
          success: false,
          error: (error as Error).message,
        };
      }
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<CacheOperationResult<boolean>> {
    const monitor = monitorCache('delete', key);

    try {
      if (this.isConnected) {
        const result = await this.client.del(key);
        monitor.end();
        logger.debug('Cache delete', { key, deleted: result > 0 });
        return {
          success: true,
          data: result > 0,
          source: 'redis',
        };
      } else {
        // Use fallback cache
        const fallbackKey = this.getFallbackKey(key);
        const existed = this.fallbackCache.has(fallbackKey);
        this.fallbackCache.delete(fallbackKey);
        monitor.end();
        logger.debug('Cache delete', { key, deleted: existed, source: 'fallback' });
        return {
          success: true,
          data: existed,
          source: 'fallback',
        };
      }
    } catch (error) {
      monitor.end(false, error as Error);
      logger.error('Cache operation error', error as Error, {
        key,
        operation: 'delete',
      });

      // Try fallback cache on Redis error
      const fallbackKey = this.getFallbackKey(key);
      const existed = this.fallbackCache.has(fallbackKey);
      this.fallbackCache.delete(fallbackKey);
      return {
        success: true,
        data: existed,
        source: 'fallback',
      };
    }
  }

  /**
   * Flush all cache data
   */
  async flush(): Promise<CacheOperationResult> {
    try {
      if (this.isConnected) {
        await this.client.flushdb();
        logger.info('Redis cache flushed');
      }

      // Clear fallback cache too
      this.fallbackCache.clear();
      logger.info('Fallback cache cleared');

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Failed to flush cache', error as Error);

      // Clear fallback cache even if Redis fails
      this.fallbackCache.clear();
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<CacheOperationResult<boolean>> {
    try {
      if (this.isConnected) {
        const result = await this.client.exists(key);
        return {
          success: true,
          data: result === 1,
          source: 'redis',
        };
      } else {
        const fallbackKey = this.getFallbackKey(key);
        const entry = this.fallbackCache.get(fallbackKey);
        const exists = entry !== undefined && Date.now() - entry.timestamp < entry.ttl;
        return {
          success: true,
          data: exists,
          source: 'fallback',
        };
      }
    } catch (error) {
      logger.error('Cache operation error', error as Error, {
        key,
        operation: 'exists',
      });

      // Check fallback cache
      const fallbackKey = this.getFallbackKey(key);
      const entry = this.fallbackCache.get(fallbackKey);
      const exists = entry !== undefined && Date.now() - entry.timestamp < entry.ttl;
      return {
        success: true,
        data: exists,
        source: 'fallback',
      };
    }
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<CacheOperationResult<string[]>> {
    try {
      if (this.isConnected) {
        const keys = await this.client.keys(pattern);
        return {
          success: true,
          data: keys,
          source: 'redis',
        };
      } else {
        // Search fallback cache
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        const keys = Array.from(this.fallbackCache.keys()).filter(key => regex.test(key));
        return {
          success: true,
          data: keys,
          source: 'fallback',
        };
      }
    } catch (error) {
      logger.error('Failed to get keys', error as Error, { pattern });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Retry logic for failed requests
   */
  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 3, retryDelay = 1000): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          logger.warn('Retrying cache operation', {
            attempt: attempt + 1,
            maxRetries,
            error: lastError.message,
          });

          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError;
  }

  /**
   * Get cache with automatic retry and fallback
   */
  async getWithRetry<T = unknown>(key: string, maxRetries = 3): Promise<T | null> {
    return this.withRetry(
      async () => {
        const result = await this.get<T>(key);
        if (!result.success) {
          throw new Error(result.error || 'Cache operation failed');
        }
        return result.data || null;
      },
      maxRetries,
      1000
    );
  }

  /**
   * Set cache with automatic retry and fallback
   */
  async setWithRetry<T = unknown>(
    key: string,
    value: T,
    ttlSeconds = 3600,
    maxRetries = 3
  ): Promise<boolean> {
    try {
      const result = await this.withRetry(
        async () => {
          const result = await this.set(key, value, ttlSeconds);
          if (!result.success) {
            throw new Error(result.error || 'Cache operation failed');
          }
          return result.success;
        },
        maxRetries,
        1000
      );
      return result;
    } catch {
      return false;
    }
  }

  /**
   * Get cache status and metrics
   */
  getStatus(): {
    isConnected: boolean;
    fallbackCacheSize: number;
    redisStatus: string;
    keyPrefix: string;
  } {
    return {
      isConnected: this.isConnected,
      fallbackCacheSize: this.fallbackCache.size,
      redisStatus: this.client.status,
      keyPrefix: this.keyPrefix,
    };
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      logger.info('Redis client disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis', error as Error);
    }
  }

  /**
   * Get direct access to Redis client (for advanced operations)
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Batch operations for better performance
   */
  async batch(
    operations: Array<{
      operation: 'get' | 'set' | 'del';
      key: string;
      value?: unknown;
      ttl?: number;
    }>
  ): Promise<CacheOperationResult[]> {
    const results: CacheOperationResult[] = [];

    if (this.isConnected) {
      // Use Redis pipeline for batch operations
      const pipeline = this.client.pipeline();

      operations.forEach(op => {
        switch (op.operation) {
          case 'get':
            pipeline.get(op.key);
            break;
          case 'set':
            if (op.value !== undefined) {
              pipeline.setex(op.key, op.ttl || 3600, JSON.stringify(op.value));
            }
            break;
          case 'del':
            pipeline.del(op.key);
            break;
        }
      });

      try {
        const pipelineResults = await pipeline.exec();

        operations.forEach((op, index) => {
          const pipelineResult = pipelineResults?.[index];
          if (pipelineResult && !pipelineResult[0]) {
            // No error
            if (op.operation === 'get') {
              results.push({
                success: true,
                data: pipelineResult[1] ? JSON.parse(pipelineResult[1] as string) : undefined,
                source: 'redis',
              });
            } else {
              results.push({
                success: true,
                source: 'redis',
              });
            }
          } else {
            results.push({
              success: false,
              error: pipelineResult?.[0]?.message || 'Pipeline operation failed',
            });
          }
        });
      } catch {
        // Fall back to individual operations
        for (const op of operations) {
          try {
            if (op.operation === 'get') {
              results.push(await this.get(op.key));
            } else if (op.operation === 'set' && op.value !== undefined) {
              results.push(await this.set(op.key, op.value, op.ttl));
            } else if (op.operation === 'del') {
              results.push(await this.delete(op.key));
            }
          } catch (opError) {
            results.push({
              success: false,
              error: (opError as Error).message,
            });
          }
        }
      }
    } else {
      // Use fallback cache for batch operations
      for (const op of operations) {
        try {
          if (op.operation === 'get') {
            results.push(await this.get(op.key));
          } else if (op.operation === 'set' && op.value !== undefined) {
            results.push(await this.set(op.key, op.value, op.ttl));
          } else if (op.operation === 'del') {
            results.push(await this.delete(op.key));
          }
        } catch (error) {
          results.push({
            success: false,
            error: (error as Error).message,
          });
        }
      }
    }

    return results;
  }
}

// Export singleton instance
export const redisService = RedisService.getInstance();
export default RedisService;
