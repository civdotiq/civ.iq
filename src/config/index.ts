/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Configuration Index
 * Central export point for all configuration modules
 */

// Import configurations first
import { apiConfig } from './api.config';
import { cacheConfig } from './cache.config';
import { appConfig } from './app.config';

// Export all configuration modules
export * from './api.config';
export * from './cache.config';
export * from './app.config';

// Re-export main config objects for convenience
export { apiConfig, cacheConfig, appConfig };

// Export utility functions
export { getApiUrl, getExternalApiConfig, getRateLimitConfig } from './api.config';
export {
  getCacheTTL,
  generateCacheKey,
  getCacheStrategy,
  getInvalidationPatterns,
  shouldCompress,
} from './cache.config';
export {
  getFeatureFlag,
  getEnvironmentConfig,
  getUrlConfig,
  isFeatureEnabled,
  getPerformanceConfig,
  getSecurityConfig,
} from './app.config';

// Export types
export type { ApiEndpoint, ExternalService, ApiConfig } from './api.config';
export type { CacheCategory, CacheStrategy, CacheConfig } from './cache.config';
export type { AppFeature, AppEnvironment, AppConfig } from './app.config';

/**
 * Master configuration object combining all configs
 */
export const config = {
  api: apiConfig,
  cache: cacheConfig,
  app: appConfig,
} as const;

/**
 * Environment-aware configuration getter
 */
export function getConfig() {
  return config;
}

/**
 * Get all environment variables used by the application
 */
export function getEnvironmentVariables() {
  return {
    // API Configuration
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    CONGRESS_API_KEY: process.env.CONGRESS_API_KEY ? '[SET]' : '[NOT SET]',
    FEC_API_KEY: process.env.FEC_API_KEY ? '[SET]' : '[NOT SET]',
    CENSUS_API_KEY: process.env.CENSUS_API_KEY ? '[SET]' : '[NOT SET]',
    GDELT_API_KEY: process.env.GDELT_API_KEY ? '[SET]' : '[NOT SET]',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]',

    // Cache Configuration
    REDIS_URL: process.env.REDIS_URL ? '[SET]' : '[NOT SET]',
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: process.env.REDIS_PORT || '6379',
    REDIS_PASSWORD: process.env.REDIS_PASSWORD ? '[SET]' : '[NOT SET]',
    REDIS_DB: process.env.REDIS_DB || '0',
    ENABLE_REDIS: process.env.ENABLE_REDIS || 'false',

    // App Configuration
    NODE_ENV: process.env.NODE_ENV || 'development',
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,

    // Feature Flags
    ENABLE_AI_SUMMARIES: process.env.ENABLE_AI_SUMMARIES || 'false',
    ENABLE_AI_CHAT: process.env.ENABLE_AI_CHAT || 'false',
    ENABLE_READING_LEVEL_VALIDATION: process.env.ENABLE_READING_LEVEL_VALIDATION || 'false',
    ENABLE_CACHE_COMPRESSION: process.env.ENABLE_CACHE_COMPRESSION || 'false',
    ENABLE_REAL_TIME_NEWS: process.env.ENABLE_REAL_TIME_NEWS || 'false',
    ENABLE_GDELT: process.env.ENABLE_GDELT || 'false',
    ENABLE_CENSUS: process.env.ENABLE_CENSUS || 'false',
    ENABLE_FEC: process.env.ENABLE_FEC || 'false',
    ENABLE_DARK_MODE: process.env.ENABLE_DARK_MODE || 'false',
    ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS || 'false',
    ENABLE_PWA: process.env.ENABLE_PWA || 'false',
    ENABLE_SERVICE_WORKER: process.env.ENABLE_SERVICE_WORKER || 'false',
    ENABLE_LAZY_LOADING: process.env.ENABLE_LAZY_LOADING || 'true',
    ENABLE_IMAGE_OPTIMIZATION: process.env.ENABLE_IMAGE_OPTIMIZATION || 'true',
    ENABLE_CODE_SPLITTING: process.env.ENABLE_CODE_SPLITTING || 'true',
    ENABLE_DEBUG: process.env.ENABLE_DEBUG || 'false',
    ENABLE_TELEMETRY: process.env.ENABLE_TELEMETRY || 'false',
    ENABLE_PERFORMANCE_MONITORING: process.env.ENABLE_PERFORMANCE_MONITORING || 'false',
    ENABLE_ERROR_REPORTING: process.env.ENABLE_ERROR_REPORTING || 'false',

    // Security
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,

    // Monitoring
    SENTRY_DSN: process.env.SENTRY_DSN ? '[SET]' : '[NOT SET]',
    SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
    GA_TRACKING_ID: process.env.GA_TRACKING_ID ? '[SET]' : '[NOT SET]',
    PLAUSIBLE_DOMAIN: process.env.PLAUSIBLE_DOMAIN,
    DATADOG_API_KEY: process.env.DATADOG_API_KEY ? '[SET]' : '[NOT SET]',
    NEW_RELIC_LICENSE_KEY: process.env.NEW_RELIC_LICENSE_KEY ? '[SET]' : '[NOT SET]',

    // Performance
    IMAGE_QUALITY: process.env.IMAGE_QUALITY || '80',
    REDUCE_MOTION: process.env.REDUCE_MOTION || 'false',
    HIGH_CONTRAST: process.env.HIGH_CONTRAST || 'false',
    ANALYZE: process.env.ANALYZE || 'false',
    ENABLE_TURBO: process.env.ENABLE_TURBO || 'false',

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_FORMAT: process.env.LOG_FORMAT || 'json',
    LOG_DESTINATION: process.env.LOG_DESTINATION || 'console',

    // Web Vitals
    ENABLE_WEB_VITALS: process.env.ENABLE_WEB_VITALS || 'false',
    WEB_VITALS_ENDPOINT: process.env.WEB_VITALS_ENDPOINT || '/api/vitals',
  };
}

/**
 * Validate configuration and return any issues
 */
export function validateConfiguration(): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check required environment variables for production
  if (config.app.isProduction) {
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      issues.push('NEXT_PUBLIC_BASE_URL is required in production');
    }

    if (!process.env.REDIS_URL && config.app.features.caching) {
      issues.push('REDIS_URL is required when caching is enabled');
    }

    if (!process.env.OPENAI_API_KEY && config.app.features.aiSummaries) {
      issues.push('OPENAI_API_KEY is required when AI summaries are enabled');
    }

    if (!process.env.CONGRESS_API_KEY) {
      issues.push('CONGRESS_API_KEY is recommended for production');
    }

    if (!process.env.FEC_API_KEY && config.app.features.fecIntegration) {
      issues.push('FEC_API_KEY is required when FEC integration is enabled');
    }
  }

  // Check for conflicting configurations
  if (config.app.features.caching && !config.app.features.caching) {
    issues.push('Redis caching is enabled but Redis connection is not configured');
  }

  // Validate API timeouts
  if (config.api.timeout < 1000) {
    issues.push('API timeout should be at least 1000ms');
  }

  // Validate cache TTL values
  const cacheTTLs = Object.values(config.cache.ttl).flat();
  if (cacheTTLs.some(ttl => typeof ttl === 'number' && ttl < 0)) {
    issues.push('Cache TTL values must be positive');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Get configuration summary for debugging
 */
export function getConfigurationSummary() {
  const validation = validateConfiguration();

  return {
    environment: config.app.environment,
    version: config.app.version,
    features: Object.entries(config.app.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature),
    externalServices: Object.keys(config.api.external),
    validation,
    timestamp: new Date().toISOString(),
  };
}
