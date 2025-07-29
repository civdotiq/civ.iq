/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Cache Configuration
 * Centralized configuration for caching strategies and TTL settings
 */

export const cacheConfig = {
  // Redis configuration
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'civiq:',
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
  },

  // TTL settings (in seconds)
  ttl: {
    // Representative data
    representatives: {
      list: 3600, // 1 hour
      individual: 1800, // 30 minutes
      votes: 7200, // 2 hours
      bills: 3600, // 1 hour
      finance: 1800, // 30 minutes
      committees: 7200, // 2 hours
      leadership: 14400, // 4 hours
    },

    // News data
    news: {
      articles: 300, // 5 minutes
      trends: 600, // 10 minutes
      realtime: 60, // 1 minute
      breaking: 30, // 30 seconds
      summary: 1800, // 30 minutes
    },

    // Legislation data
    legislation: {
      bills: 1800, // 30 minutes
      summaries: 7200, // 2 hours
      votes: 3600, // 1 hour
      amendments: 1800, // 30 minutes
    },

    // District and geographic data
    districts: {
      boundaries: 86400, // 24 hours
      demographics: 43200, // 12 hours
      representatives: 3600, // 1 hour
    },

    // Search results
    search: {
      representatives: 600, // 10 minutes
      general: 300, // 5 minutes
      autocomplete: 1800, // 30 minutes
    },

    // External API responses
    external: {
      congress: 1800, // 30 minutes
      fec: 3600, // 1 hour
      census: 43200, // 12 hours
      gdelt: 300, // 5 minutes
      openai: 7200, // 2 hours
    },

    // System and health checks
    system: {
      health: 60, // 1 minute
      metrics: 300, // 5 minutes
      status: 120, // 2 minutes
    },
  },

  // Cache strategies
  strategies: {
    // Write-through: Write to cache and database simultaneously
    writeThrough: {
      enabled: true,
      endpoints: ['representatives', 'legislation'],
    },

    // Write-behind: Write to cache immediately, database asynchronously
    writeBehind: {
      enabled: false,
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
    },

    // Cache-aside: Manual cache management
    cacheAside: {
      enabled: true,
      endpoints: ['news', 'search'],
    },

    // Read-through: Load missing data automatically
    readThrough: {
      enabled: true,
      endpoints: ['districts', 'external'],
    },
  },

  // Fallback configuration
  fallback: {
    // In-memory cache when Redis is unavailable
    memory: {
      enabled: true,
      maxSize: 1000, // Maximum number of entries
      cleanupInterval: 300000, // 5 minutes
    },

    // File-based cache for persistence
    file: {
      enabled: false,
      directory: './cache',
      maxSize: '100MB',
    },
  },

  // Cache invalidation rules
  invalidation: {
    // Patterns for cache key invalidation
    patterns: {
      representatives: ['representatives:*', 'search:representatives:*'],
      news: ['news:*', 'representatives:*/news'],
      legislation: ['legislation:*', 'bills:*'],
      districts: ['districts:*', 'representatives:*/district'],
    },

    // Time-based invalidation
    schedule: {
      // Clear all caches daily at 2 AM
      daily: {
        time: '02:00',
        pattern: '*',
      },
      // Clear news cache every hour
      hourly: {
        pattern: 'news:*',
      },
    },

    // Event-based invalidation
    events: {
      dataUpdate: ['representatives:*', 'legislation:*'],
      newsUpdate: ['news:*'],
      systemUpdate: ['system:*'],
    },
  },

  // Performance optimization
  optimization: {
    // Compression for large cache entries
    compression: {
      enabled: true,
      algorithm: 'gzip',
      threshold: 1024, // bytes
    },

    // Batch operations
    batch: {
      enabled: true,
      maxSize: 100,
      timeout: 1000, // 1 second
    },

    // Connection pooling
    pool: {
      min: 2,
      max: 10,
      acquireTimeout: 5000,
      idleTimeout: 30000,
    },
  },

  // Monitoring and metrics
  monitoring: {
    // Enable detailed metrics collection
    metrics: true,

    // Log cache operations
    logging: {
      hits: false, // Don't log cache hits (too noisy)
      misses: true,
      errors: true,
      performance: true,
    },

    // Health check thresholds
    healthCheck: {
      maxLatency: 100, // milliseconds
      minHitRate: 0.8, // 80%
      maxErrorRate: 0.05, // 5%
    },
  },
} as const;

/**
 * Get TTL for a specific cache key pattern
 */
export function getCacheTTL(category: string, subcategory?: string): number {
  const categoryConfig = cacheConfig.ttl[category as keyof typeof cacheConfig.ttl];

  if (!categoryConfig) {
    return 300; // Default 5 minutes
  }

  if (typeof categoryConfig === 'number') {
    return categoryConfig;
  }

  if (subcategory && typeof categoryConfig === 'object') {
    return (categoryConfig as Record<string, number>)[subcategory] || 300;
  }

  return 300;
}

/**
 * Generate cache key with consistent pattern
 */
export function generateCacheKey(
  category: string,
  identifier: string,
  ...params: string[]
): string {
  const prefix = cacheConfig.redis.keyPrefix;
  const parts = [prefix, category, identifier, ...params].filter(Boolean);
  return parts.join(':');
}

/**
 * Get cache strategy for an endpoint
 */
export function getCacheStrategy(endpoint: string): string[] {
  const strategies: string[] = [];

  Object.entries(cacheConfig.strategies).forEach(([strategy, config]) => {
    if (config.enabled && 'endpoints' in config) {
      const endpoints = config.endpoints as readonly string[];
      if (endpoints.some(ep => endpoint.includes(ep))) {
        strategies.push(strategy);
      }
    }
  });

  return strategies.length > 0 ? strategies : ['cacheAside'];
}

/**
 * Get invalidation patterns for a cache category
 */
export function getInvalidationPatterns(category: string): string[] {
  const patterns =
    cacheConfig.invalidation.patterns[category as keyof typeof cacheConfig.invalidation.patterns];
  return patterns ? [...patterns] : [];
}

/**
 * Check if compression should be used for a value
 */
export function shouldCompress(value: string | object): boolean {
  if (!cacheConfig.optimization.compression.enabled) {
    return false;
  }

  const size =
    typeof value === 'string'
      ? Buffer.byteLength(value, 'utf8')
      : Buffer.byteLength(JSON.stringify(value), 'utf8');

  return size >= cacheConfig.optimization.compression.threshold;
}

/**
 * Type definitions for cache configuration
 */
export type CacheCategory = keyof typeof cacheConfig.ttl;
export type CacheStrategy = keyof typeof cacheConfig.strategies;
export type CacheConfig = typeof cacheConfig;
