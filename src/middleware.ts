/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Simple logging for edge runtime (console is allowed in edge runtime)
const logger = {
  // eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
  http: (message: string, data?: any) => console.log(`[HTTP] ${message}`, data),
  // eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (message: string, error?: Error, data?: any) =>
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, error, data),
};

// Fallback in-memory rate limiting store (used when Redis is unavailable)
const fallbackRateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Lazy-initialize Upstash Redis and Ratelimit instances
// This prevents build-time errors when env vars aren't available
let redis: Redis | null = null;
let ratelimiters: Map<string, Ratelimit> | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.warn('Upstash Redis not configured, using fallback rate limiting', {
      hasUrl: !!url,
      hasToken: !!token,
    });
    return null;
  }

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch (error) {
    logger.error('Failed to initialize Upstash Redis', error as Error);
    return null;
  }
}

function getRatelimiters(): Map<string, Ratelimit> | null {
  if (ratelimiters) return ratelimiters;

  const redisInstance = getRedis();
  if (!redisInstance) return null;

  try {
    ratelimiters = new Map([
      // API routes: 100 requests per minute (sliding window)
      [
        '/api/',
        new Ratelimit({
          redis: redisInstance,
          limiter: Ratelimit.slidingWindow(100, '1 m'),
          prefix: 'ratelimit:api',
          analytics: true,
        }),
      ],
      // Representatives endpoint: 60 requests per minute
      [
        '/api/representatives',
        new Ratelimit({
          redis: redisInstance,
          limiter: Ratelimit.slidingWindow(60, '1 m'),
          prefix: 'ratelimit:representatives',
          analytics: true,
        }),
      ],
      // District map: 30 requests per minute
      [
        '/api/district-map',
        new Ratelimit({
          redis: redisInstance,
          limiter: Ratelimit.slidingWindow(30, '1 m'),
          prefix: 'ratelimit:district-map',
          analytics: true,
        }),
      ],
      // Default: 200 requests per minute
      [
        'default',
        new Ratelimit({
          redis: redisInstance,
          limiter: Ratelimit.slidingWindow(200, '1 m'),
          prefix: 'ratelimit:default',
          analytics: true,
        }),
      ],
    ]);

    logger.http('Upstash Ratelimit initialized successfully', {
      limiters: Array.from(ratelimiters.keys()),
    });

    return ratelimiters;
  } catch (error) {
    logger.error('Failed to initialize Upstash Ratelimit', error as Error);
    return null;
  }
}

// Security headers configuration
// Environment-aware CSP: Strict in production, permissive in development
const isDevelopment = process.env.NODE_ENV === 'development';

// Production CSP: Balanced security for Next.js App Router
// Note: 'unsafe-inline' required for Next.js hydration scripts
// Future: Implement nonce-based CSP for stricter security
const PRODUCTION_CSP =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' blob: https://www.googletagmanager.com https://www.google-analytics.com; " + // unsafe-inline required for Next.js App Router hydration, Google Analytics
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; " + // unsafe-inline for styled-components/CSS-in-JS, unpkg.com for MapLibre GL
  "img-src 'self' data: https:; " +
  "font-src 'self' data: https://fonts.gstatic.com; " +
  "connect-src 'self' https:; " +
  "worker-src 'self' blob:; " +
  "frame-ancestors 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  'upgrade-insecure-requests;';

// Development CSP: More permissive for hot reload and debugging
const DEVELOPMENT_CSP =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://www.google-analytics.com; " + // Google Analytics
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; " + // unpkg.com for MapLibre GL
  "img-src 'self' data: https: blob:; " +
  "font-src 'self' data: https://fonts.gstatic.com; " +
  "connect-src 'self' https: ws: wss:; " + // WebSocket for hot reload
  "worker-src 'self' blob:; " +
  "frame-ancestors 'none';";

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), microphone=(), camera=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': isDevelopment ? DEVELOPMENT_CSP : PRODUCTION_CSP,
} as const;

// Rate limiting configuration (used for fallback and response headers)
interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  '/api/': { requests: 100, windowMs: 60000 },
  '/api/representatives': { requests: 60, windowMs: 60000 },
  '/api/district-map': { requests: 30, windowMs: 60000 },
  default: { requests: 200, windowMs: 60000 },
};

export async function middleware(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Extract client information
    const clientInfo = extractClientInfo(request);

    // Log request start (only for API routes in production to avoid spam)
    const isDevMode = process.env.NODE_ENV === 'development';
    if (!isDevMode && request.nextUrl.pathname.startsWith('/api/')) {
      logger.http('Request started', {
        method: request.method,
        url: request.url,
        userAgent: clientInfo.userAgent,
        ip: clientInfo.ip,
        timestamp: new Date().toISOString(),
      });
    }

    // Validate request
    const validationResult = validateRequest(request);
    if (!validationResult.isValid) {
      logger.warn('Request validation failed', {
        url: request.url,
        reason: validationResult.reason,
        ip: clientInfo.ip,
      });

      return createErrorResponse(
        validationResult.statusCode || 400,
        validationResult.reason || 'Invalid request'
      );
    }

    // Apply rate limiting (now async with Upstash)
    const rateLimitResult = await checkRateLimit(request, clientInfo.ip);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', {
        url: request.url,
        ip: clientInfo.ip,
        limit: rateLimitResult.limit,
        current: rateLimitResult.current,
        source: rateLimitResult.source,
      });

      return createErrorResponse(429, 'Too Many Requests', {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': Math.max(
          0,
          rateLimitResult.limit - rateLimitResult.current
        ).toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
      });
    }

    // Create response with security headers
    const response = NextResponse.next();

    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set(
      'X-RateLimit-Remaining',
      Math.max(0, rateLimitResult.limit - rateLimitResult.current).toString()
    );
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    // Add performance headers
    const duration = Date.now() - startTime;
    response.headers.set('X-Response-Time', `${duration}ms`);
    response.headers.set('X-Request-ID', generateRequestId());

    // Log successful request (only for API routes in production)
    if (!isDevMode && request.nextUrl.pathname.startsWith('/api/')) {
      logger.http('Request completed', {
        method: request.method,
        url: request.url,
        statusCode: response.status,
        duration: duration,
        ip: clientInfo.ip,
      });
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Middleware error', error as Error, {
      url: request.url,
      method: request.method,
      duration: duration,
    });

    // Return generic error response
    return createErrorResponse(500, 'Internal Server Error');
  }
}

// Helper functions
function extractClientInfo(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';

  return {
    ip: ip.trim(),
    userAgent: request.headers.get('user-agent') || 'unknown',
    origin: request.headers.get('origin') || 'unknown',
  };
}

function validateRequest(request: NextRequest): {
  isValid: boolean;
  reason?: string;
  statusCode?: number;
} {
  const url = new URL(request.url);

  // Check for malicious patterns
  const maliciousPatterns = [
    /\.\./, // Path traversal
    /<script/i, // XSS attempts
    /eval\(/i, // Code injection
    /union.*select/i, // SQL injection
    /%00/, // Null byte injection
    /\${/, // Template injection
  ];

  const fullPath = url.pathname + url.search;
  for (const pattern of maliciousPatterns) {
    if (pattern.test(fullPath)) {
      return { isValid: false, reason: 'Malicious request pattern detected', statusCode: 400 };
    }
  }

  // Validate content length for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      // 10MB limit
      return { isValid: false, reason: 'Request too large', statusCode: 413 };
    }
  }

  // Validate API endpoints
  if (url.pathname.startsWith('/api/')) {
    // Check for required headers on API requests
    if (!request.headers.get('accept') && request.method !== 'GET') {
      return { isValid: false, reason: 'Missing Accept header', statusCode: 400 };
    }
  }

  return { isValid: true };
}

/**
 * Check rate limit using Upstash Ratelimit with fallback to in-memory
 */
async function checkRateLimit(
  request: NextRequest,
  clientIp: string
): Promise<{
  allowed: boolean;
  limit: number;
  current: number;
  resetTime: number;
  source: 'upstash' | 'fallback';
}> {
  const url = new URL(request.url);
  const now = Date.now();

  // Skip rate limiting for static data files (PMTiles, GeoJSON, etc.)
  if (url.pathname.startsWith('/data/') || url.pathname.startsWith('/_next/static/')) {
    return { allowed: true, limit: 999999, current: 0, resetTime: now + 60000, source: 'upstash' };
  }

  // Determine which rate limiter to use based on path
  let ratelimiterKey = 'default';
  let configKey = 'default';

  for (const path of ['/api/district-map', '/api/representatives', '/api/']) {
    if (url.pathname.startsWith(path)) {
      ratelimiterKey = path;
      configKey = path;
      break;
    }
  }

  const config: RateLimitConfig = RATE_LIMIT_CONFIGS[configKey] ??
    RATE_LIMIT_CONFIGS.default ?? { requests: 200, windowMs: 60000 };

  // Try Upstash Ratelimit first
  const limiters = getRatelimiters();
  if (limiters) {
    try {
      const limiter = limiters.get(ratelimiterKey) || limiters.get('default')!;
      const identifier = `${clientIp}:${url.pathname}`;
      const result = await limiter.limit(identifier);

      return {
        allowed: result.success,
        limit: result.limit,
        current: result.limit - result.remaining,
        resetTime: result.reset,
        source: 'upstash',
      };
    } catch (error) {
      // Upstash failed, fall through to in-memory fallback
      logger.warn('Upstash Ratelimit failed, using fallback', {
        error: (error as Error).message,
        path: url.pathname,
      });
    }
  }

  // Fallback: In-memory rate limiting (for local dev or Redis failures)
  return checkFallbackRateLimit(clientIp, url.pathname, config);
}

/**
 * Fallback in-memory rate limiting (same as original implementation)
 * Used when Upstash Redis is unavailable
 */
function checkFallbackRateLimit(
  clientIp: string,
  pathname: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  limit: number;
  current: number;
  resetTime: number;
  source: 'fallback';
} {
  const now = Date.now();
  const key = `${clientIp}:${pathname}`;
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const resetTime = windowStart + config.windowMs;

  let entry = fallbackRateLimitStore.get(key);

  // Clean up expired entries periodically (1% chance)
  if (Math.random() < 0.01) {
    cleanupFallbackRateLimitStore();
  }

  if (!entry || entry.resetTime <= now) {
    entry = { count: 0, resetTime };
    fallbackRateLimitStore.set(key, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= config.requests,
    limit: config.requests,
    current: entry.count,
    resetTime: entry.resetTime,
    source: 'fallback',
  };
}

function cleanupFallbackRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of fallbackRateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      fallbackRateLimitStore.delete(key);
    }
  }
}

function createErrorResponse(
  status: number,
  message: string,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  const response = NextResponse.json(
    {
      error: {
        code: status,
        message,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );

  // Add security headers to error responses
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add any additional headers
  Object.entries(additionalHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

function generateRequestId(): string {
  // Use crypto.randomUUID() for secure, unpredictable request IDs (available in Edge Runtime)
  return `req_${Date.now()}_${crypto.randomUUID().split('-')[0]}`;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Skip internal Next.js paths and static files, but include API routes
    '/((?!_next/static|_next/image|favicon.ico|icon-|manifest.json).*)',
  ],
};
