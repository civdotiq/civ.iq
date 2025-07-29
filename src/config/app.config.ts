/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Application Configuration
 * Centralized configuration for app settings, features, and environment variables
 */

export const appConfig = {
  // Basic app information
  name: 'Civic Intel Hub',
  version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  description: 'Advanced Civic Information Platform',
  author: 'Mark Sandford',

  // Environment configuration
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // URLs and domains
  urls: {
    base: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    api: process.env.NEXT_PUBLIC_API_URL || '',
    cdn: process.env.NEXT_PUBLIC_CDN_URL || '',
    docs: process.env.NEXT_PUBLIC_DOCS_URL || 'https://docs.civic-intel-hub.com',
  },

  // Feature flags
  features: {
    // AI and machine learning features
    aiSummaries: process.env.ENABLE_AI_SUMMARIES === 'true',
    aiChat: process.env.ENABLE_AI_CHAT === 'true',
    readingLevelValidation: process.env.ENABLE_READING_LEVEL_VALIDATION === 'true',

    // Caching features
    caching: process.env.ENABLE_REDIS === 'true',
    compressionCache: process.env.ENABLE_CACHE_COMPRESSION === 'true',

    // Data sources
    realTimeNews: process.env.ENABLE_REAL_TIME_NEWS === 'true',
    gdeltIntegration: process.env.ENABLE_GDELT === 'true',
    censusIntegration: process.env.ENABLE_CENSUS === 'true',
    fecIntegration: process.env.ENABLE_FEC === 'true',

    // UI/UX features
    darkMode: process.env.ENABLE_DARK_MODE === 'true',
    analytics: process.env.ENABLE_ANALYTICS === 'true',
    pwa: process.env.ENABLE_PWA === 'true',
    serviceWorker: process.env.ENABLE_SERVICE_WORKER === 'true',

    // Performance features
    lazyLoading: process.env.ENABLE_LAZY_LOADING !== 'false', // Default enabled
    imageOptimization: process.env.ENABLE_IMAGE_OPTIMIZATION !== 'false',
    codesplitting: process.env.ENABLE_CODE_SPLITTING !== 'false',

    // Debug and development
    debug: process.env.ENABLE_DEBUG === 'true',
    telemetry: process.env.ENABLE_TELEMETRY === 'true',
    performanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
    errorReporting: process.env.ENABLE_ERROR_REPORTING === 'true',
  },

  // Performance settings
  performance: {
    // Bundle optimization
    bundleAnalyzer: process.env.ANALYZE === 'true',
    treeShaking: true,
    minification: true,

    // Runtime optimization
    prefetch: true,
    preload: true,
    lazy: true,

    // Image optimization
    images: {
      quality: parseInt(process.env.IMAGE_QUALITY || '80'),
      formats: ['webp', 'jpg'],
      sizes: [320, 480, 640, 960, 1280, 1920],
    },

    // Caching strategies
    staticCache: '31536000', // 1 year
    dynamicCache: '86400', // 1 day
    apiCache: '300', // 5 minutes
  },

  // UI/UX configuration
  ui: {
    // Theme settings
    theme: {
      default: 'light',
      allowToggle: true,
      systemPreference: true,
    },

    // Layout settings
    layout: {
      maxWidth: '1200px',
      sidebarWidth: '280px',
      headerHeight: '64px',
      footerHeight: '120px',
    },

    // Animation settings
    animations: {
      enabled: process.env.REDUCE_MOTION !== 'true',
      duration: 200,
      easing: 'ease-in-out',
    },

    // Accessibility settings
    accessibility: {
      focusVisible: true,
      highContrast: process.env.HIGH_CONTRAST === 'true',
      screenReader: true,
      keyboardNavigation: true,
    },
  },

  // Data and content settings
  content: {
    // Pagination
    pagination: {
      defaultPageSize: 20,
      maxPageSize: 100,
      allowCustomSize: true,
    },

    // Search
    search: {
      minQueryLength: 2,
      maxResults: 50,
      highlightMatches: true,
      fuzzySearch: true,
    },

    // Data freshness
    freshness: {
      representatives: 3600, // 1 hour
      news: 300, // 5 minutes
      legislation: 1800, // 30 minutes
      realtime: 60, // 1 minute
    },
  },

  // Security settings
  security: {
    // CORS settings
    cors: {
      origins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    },

    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP',
    },

    // Headers
    headers: {
      contentSecurityPolicy: true,
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin',
    },
  },

  // Logging and monitoring
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    destination: process.env.LOG_DESTINATION || 'console',

    // Log categories
    categories: {
      api: true,
      cache: true,
      auth: true,
      performance: true,
      errors: true,
      debug: process.env.NODE_ENV === 'development',
    },

    // External services
    external: {
      sentry: process.env.SENTRY_DSN ? true : false,
      datadog: process.env.DATADOG_API_KEY ? true : false,
      newrelic: process.env.NEW_RELIC_LICENSE_KEY ? true : false,
    },
  },

  // Third-party integrations
  integrations: {
    // Analytics
    googleAnalytics: process.env.GA_TRACKING_ID,
    plausible: process.env.PLAUSIBLE_DOMAIN,

    // Error tracking
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    },

    // Performance monitoring
    webVitals: {
      enabled: process.env.ENABLE_WEB_VITALS === 'true',
      endpoint: process.env.WEB_VITALS_ENDPOINT || '/api/vitals',
    },
  },

  // Build and deployment settings
  build: {
    // Output settings
    outputDir: 'dist',
    staticDir: 'public',

    // Optimization
    minimize: process.env.NODE_ENV === 'production',
    sourceMaps: process.env.NODE_ENV !== 'production',

    // Experimental features
    experimental: {
      serverComponents: true,
      appDir: true,
      turbo: process.env.ENABLE_TURBO === 'true',
    },
  },
} as const;

/**
 * Get feature flag value with fallback
 */
export function getFeatureFlag(flag: keyof typeof appConfig.features, fallback = false): boolean {
  return appConfig.features[flag] ?? fallback;
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  return {
    isDevelopment: appConfig.isDevelopment,
    isProduction: appConfig.isProduction,
    isTest: appConfig.isTest,
    environment: appConfig.environment,
  };
}

/**
 * Get URL configuration with environment fallbacks
 */
export function getUrlConfig() {
  const base = appConfig.urls.base;
  return {
    ...appConfig.urls,
    api: appConfig.urls.api || `${base}/api`,
    cdn: appConfig.urls.cdn || `${base}/static`,
  };
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof appConfig.features): boolean {
  return appConfig.features[feature] === true;
}

/**
 * Get performance configuration
 */
export function getPerformanceConfig() {
  return {
    ...appConfig.performance,
    enableOptimizations: appConfig.isProduction,
    enableProfiling: appConfig.isDevelopment && appConfig.features.debug,
  };
}

/**
 * Get security configuration
 */
export function getSecurityConfig() {
  return {
    ...appConfig.security,
    strictMode: appConfig.isProduction,
    allowedOrigins: appConfig.security.cors.origins,
  };
}

/**
 * Type definitions for app configuration
 */
export type AppFeature = keyof typeof appConfig.features;
export type AppEnvironment = typeof appConfig.environment;
export type AppConfig = typeof appConfig;
