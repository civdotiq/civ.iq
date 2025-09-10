/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * API Configuration
 * Centralized configuration for all API endpoints and external services
 */

export const apiConfig = {
  // Base API configuration
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  version: 'v1',
  timeout: 15000, // 15 seconds - reduced for faster failure detection

  // Internal API endpoints
  endpoints: {
    representatives: '/api/v1/representatives',
    representative: '/api/v1/representative',
    news: '/api/v1/news',
    legislation: '/api/v1/legislation',
    bills: '/api/v1/bills',
    districts: '/api/v1/districts',
    search: '/api/search',
    health: '/api/health', // Keep health at root level
  },

  // External service configurations
  external: {
    // GDELT Project API
    gdelt: {
      baseURL: 'https://api.gdeltproject.org/api/v2',
      timeout: 15000,
      rateLimit: {
        requestsPerMinute: 30,
        burstLimit: 10,
      },
    },

    // Congress.gov API
    congress: {
      baseURL: 'https://api.congress.gov/v3',
      apiKey: process.env.CONGRESS_API_KEY,
      timeout: 10000, // 10 seconds - reduced from 20s for faster failure detection
      version: 'v3',
    },

    // OpenFEC API
    fec: {
      baseURL: 'https://api.open.fec.gov/v1',
      apiKey: process.env.FEC_API_KEY,
      timeout: 12000, // 12 seconds - reduced from 25s for faster failure detection
      version: 'v1',
    },

    // Census API
    census: {
      baseURL: 'https://api.census.gov/data',
      apiKey: process.env.CENSUS_API_KEY,
      timeout: 15000,
      datasets: {
        acs5: '2022/acs/acs5',
        geography: 'geo',
      },
    },

    // OpenAI API
    openai: {
      baseURL: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000,
      model: 'gpt-4',
      maxTokens: 1000,
    },
  },

  // Rate limiting configuration
  rateLimit: {
    // Per-endpoint rate limits
    endpoints: {
      representatives: {
        requestsPerMinute: 60,
        burstLimit: 20,
      },
      news: {
        requestsPerMinute: 30,
        burstLimit: 10,
      },
      search: {
        requestsPerMinute: 30,
        burstLimit: 15,
      },
    },
    // Global rate limit
    global: {
      requestsPerMinute: 100,
      burstLimit: 50,
    },
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },

  // Request/Response configuration
  headers: {
    default: {
      'Content-Type': 'application/json',
      'User-Agent': 'CivicIntelHub/1.0 (https://civic-intel-hub.vercel.app)',
    },
    cors: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
} as const;

/**
 * Get the full URL for an internal API endpoint
 */
export function getApiUrl(endpoint: string, version: string = apiConfig.version): string {
  const baseUrl =
    apiConfig.baseURL || (typeof window !== 'undefined' ? window.location.origin : '');

  // Health endpoint stays at root
  if (endpoint === 'health') {
    return `${baseUrl}/api/health`;
  }

  // Handle versioned endpoints
  if (endpoint.startsWith('/api/')) {
    return `${baseUrl}${endpoint}`;
  }

  return `${baseUrl}/api/${version}${endpoint}`;
}

/**
 * Get configuration for external API services
 */
export function getExternalApiConfig(service: keyof typeof apiConfig.external) {
  return apiConfig.external[service];
}

/**
 * Get rate limit configuration for an endpoint
 */
export function getRateLimitConfig(endpoint: string) {
  return (
    apiConfig.rateLimit.endpoints[endpoint as keyof typeof apiConfig.rateLimit.endpoints] ||
    apiConfig.rateLimit.global
  );
}

/**
 * Type definitions for API configuration
 */
export type ApiEndpoint = keyof typeof apiConfig.endpoints;
export type ExternalService = keyof typeof apiConfig.external;
export type ApiConfig = typeof apiConfig;
