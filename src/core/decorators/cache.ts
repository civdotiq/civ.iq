/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Cache Decorators for Automatic Caching and Invalidation
 *
 * Provides TypeScript decorators for method-level caching:
 * - @Cacheable(ttl, keyGenerator) - Automatic caching
 * - @CacheInvalidate(pattern) - Cache invalidation
 * - @CacheEvict(keys) - Selective cache eviction
 * - @CachePut(key, condition) - Cache update
 *
 * Features:
 * - Automatic key generation from method arguments
 * - Conditional caching based on return values
 * - Cache warming strategies
 * - Performance metrics integration
 */

import type { CacheService } from '../services/implementations/CacheService';

// Cache decorator configuration
interface CacheableOptions {
  ttl?: number; // Time to live in milliseconds
  keyGenerator?: (...args: unknown[]) => string; // Custom key generation
  condition?: (...args: unknown[]) => boolean; // Conditional caching
  unless?: (result: unknown) => boolean; // Skip caching if condition is true
  tags?: string[]; // Cache tags for invalidation
}

interface CacheInvalidateOptions {
  allEntries?: boolean; // Clear all cache entries
  beforeInvocation?: boolean; // Clear before method execution
  condition?: (...args: unknown[]) => boolean; // Conditional invalidation
}

interface CacheEvictOptions {
  keys?: string[]; // Specific keys to evict
  patterns?: string[]; // Patterns to match for eviction
  beforeInvocation?: boolean; // Evict before method execution
}

interface CachePutOptions {
  key?: string; // Fixed cache key
  keyGenerator?: (...args: unknown[]) => string; // Dynamic key generation
  condition?: (...args: unknown[]) => boolean; // Conditional put
  unless?: (result: unknown) => boolean; // Skip put if condition is true
}

// Global cache service instance
let cacheService: CacheService | null = null;

/**
 * Initialize cache decorators with a cache service instance
 */
export function initializeCacheDecorators(cache: CacheService): void {
  cacheService = cache;
}

/**
 * Get the current cache service instance
 */
function getCacheService(): CacheService {
  if (!cacheService) {
    throw new Error('Cache decorators not initialized. Call initializeCacheDecorators() first.');
  }
  return cacheService;
}

/**
 * Generate a cache key from method context and arguments
 */
function generateCacheKey(
  target: object,
  propertyKey: string | symbol,
  args: unknown[],
  customGenerator?: (...args: unknown[]) => string
): string {
  if (customGenerator) {
    return customGenerator(...args);
  }

  const className = target.constructor.name;
  const methodName = String(propertyKey);
  const argsKey = args
    .map(arg => {
      if (arg === null || arg === undefined) return String(arg);
      if (typeof arg === 'object') return JSON.stringify(arg);
      return String(arg);
    })
    .join(':');

  return `${className}:${methodName}:${argsKey}`;
}

/**
 * @Cacheable decorator - Automatically cache method results
 */
export function Cacheable(options: CacheableOptions = {}) {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cache = getCacheService();

      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const cacheKey = generateCacheKey(target, propertyKey, args, options.keyGenerator);

      // Try to get from cache first
      try {
        const cachedResult = await cache.get(cacheKey);
        if (cachedResult !== null) {
          return cachedResult;
        }
      } catch {
        // Cache miss - continue with method execution
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Check unless condition
      if (options.unless && options.unless(result)) {
        return result;
      }

      // Cache the result
      try {
        await cache.set(cacheKey, result, {
          ttlMs: options.ttl,
          tags: options.tags,
        });
      } catch {
        // Failed to cache - continue with result
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * @CacheInvalidate decorator - Invalidate cache entries
 */
export function CacheInvalidate(pattern: string | string[], options: CacheInvalidateOptions = {}) {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cache = getCacheService();
      const patterns = Array.isArray(pattern) ? pattern : [pattern];

      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Invalidate before execution if configured
      if (options.beforeInvocation) {
        try {
          if (options.allEntries) {
            await cache.clear();
          } else {
            for (const pat of patterns) {
              await cache.deleteByPattern(pat);
            }
          }
        } catch {
          // Failed to invalidate - continue with method execution
        }
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Invalidate after execution (default)
      if (!options.beforeInvocation) {
        try {
          if (options.allEntries) {
            await cache.clear();
          } else {
            for (const pat of patterns) {
              await cache.deleteByPattern(pat);
            }
          }
        } catch {
          // Failed to invalidate - continue with result
        }
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * @CacheEvict decorator - Evict specific cache entries
 */
export function CacheEvict(options: CacheEvictOptions = {}) {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cache = getCacheService();

      // Evict before execution if configured
      if (options.beforeInvocation) {
        try {
          if (options.keys) {
            for (const key of options.keys) {
              await cache.delete(key);
            }
          }
          if (options.patterns) {
            for (const pattern of options.patterns) {
              await cache.deleteByPattern(pattern);
            }
          }
        } catch {
          // Failed to evict - continue with method execution
        }
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Evict after execution (default)
      if (!options.beforeInvocation) {
        try {
          if (options.keys) {
            for (const key of options.keys) {
              await cache.delete(key);
            }
          }
          if (options.patterns) {
            for (const pattern of options.patterns) {
              await cache.deleteByPattern(pattern);
            }
          }
        } catch {
          // Failed to evict - continue with result
        }
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * @CachePut decorator - Always cache method result
 */
export function CachePut(options: CachePutOptions = {}) {
  return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cache = getCacheService();

      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Check unless condition
      if (options.unless && options.unless(result)) {
        return result;
      }

      // Generate cache key
      const cacheKey =
        options.key || generateCacheKey(target, propertyKey, args, options.keyGenerator);

      // Always put the result in cache
      try {
        await cache.set(cacheKey, result);
      } catch {
        // Failed to cache - continue with result
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache warming utility for preloading frequently accessed data
 */
export class CacheWarmer {
  private cache: CacheService;
  private warmupStrategies = new Map<string, () => Promise<void>>();

  constructor(cache: CacheService) {
    this.cache = cache;
  }

  /**
   * Register a cache warming strategy
   */
  register(name: string, strategy: () => Promise<void>): void {
    this.warmupStrategies.set(name, strategy);
  }

  /**
   * Execute a specific warming strategy
   */
  async warm(name: string): Promise<void> {
    const strategy = this.warmupStrategies.get(name);
    if (!strategy) {
      throw new Error(`Cache warming strategy '${name}' not found`);
    }
    await strategy();
  }

  /**
   * Execute all registered warming strategies
   */
  async warmAll(): Promise<void> {
    const promises = Array.from(this.warmupStrategies.values()).map(strategy => strategy());
    await Promise.allSettled(promises);
  }

  /**
   * Warm cache with representative data
   */
  async warmRepresentatives(): Promise<void> {
    // Example warming strategy for representatives
    const popularStates = ['CA', 'TX', 'FL', 'NY', 'PA'];
    const popularZips = ['90210', '10001', '60601', '02101', '94102'];

    try {
      // Warm state-based cache
      for (const state of popularStates) {
        await this.cache.warmCache([`representatives:state:${state}`], async _key => {
          // Mock fetcher - would call actual service
          return { state, representatives: [] };
        });
      }

      // Warm ZIP-based cache
      for (const zip of popularZips) {
        await this.cache.warmCache([`representatives:zip:${zip}`], async _key => {
          // Mock fetcher - would call actual service
          return { zip, representatives: [] };
        });
      }
    } catch {
      // Warming failed - continue without error
    }
  }
}

/**
 * Cache metrics collector for monitoring cache performance
 */
export class CacheMetricsCollector {
  private cache: CacheService;
  private metricsHistory: Array<{
    timestamp: number;
    metrics: Awaited<ReturnType<CacheService['getMetrics']>>;
  }> = [];

  constructor(cache: CacheService) {
    this.cache = cache;
  }

  /**
   * Collect current cache metrics
   */
  async collect(): Promise<void> {
    try {
      const metrics = await this.cache.getMetrics();
      this.metricsHistory.push({
        timestamp: Date.now(),
        metrics,
      });

      // Keep only last 100 entries
      if (this.metricsHistory.length > 100) {
        this.metricsHistory = this.metricsHistory.slice(-100);
      }
    } catch {
      // Failed to collect metrics - continue silently
    }
  }

  /**
   * Get metrics history
   */
  getHistory(): typeof this.metricsHistory {
    return [...this.metricsHistory];
  }

  /**
   * Get average hit rate over time window
   */
  getAverageHitRate(windowMs = 300000): number {
    // Default 5 minutes window
    const now = Date.now();
    const cutoff = now - windowMs;

    const recentMetrics = this.metricsHistory.filter(entry => entry.timestamp >= cutoff);
    if (recentMetrics.length === 0) return 0;

    const totalHitRate = recentMetrics.reduce((sum, entry) => sum + entry.metrics.hitRate, 0);
    return totalHitRate / recentMetrics.length;
  }

  /**
   * Start automatic metrics collection
   */
  startCollection(intervalMs = 30000): NodeJS.Timeout {
    // Default 30 seconds interval
    const timer = setInterval(() => {
      this.collect();
    }, intervalMs);

    // Don't keep the process alive just for metrics collection
    timer.unref?.();
    return timer;
  }
}

/**
 * Cache configuration builder for easy setup
 */
export class CacheConfigBuilder {
  private config: {
    maxMemorySize?: number;
    maxMemoryItems?: number;
    defaultTTL?: number;
    redis?: {
      enabled: boolean;
      host?: string;
      port?: number;
      password?: string;
      keyPrefix?: string;
    };
    compressionThreshold?: number;
    warmupEnabled?: boolean;
  } = {};

  maxMemory(sizeInMB: number): this {
    this.config.maxMemorySize = sizeInMB * 1024 * 1024;
    return this;
  }

  maxItems(count: number): this {
    this.config.maxMemoryItems = count;
    return this;
  }

  defaultTTL(ttlInSeconds: number): this {
    this.config.defaultTTL = ttlInSeconds * 1000;
    return this;
  }

  enableRedis(host = 'localhost', port = 6379, password?: string): this {
    this.config.redis = {
      enabled: true,
      host,
      port,
      password,
      keyPrefix: 'civiq:',
    };
    return this;
  }

  compressionThreshold(sizeInKB: number): this {
    this.config.compressionThreshold = sizeInKB * 1024;
    return this;
  }

  enableWarmup(enabled = true): this {
    this.config.warmupEnabled = enabled;
    return this;
  }

  build(): typeof this.config {
    return { ...this.config };
  }
}
