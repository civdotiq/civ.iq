/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { incrementRequestCounter } from '@/lib/analytics/request-counter';
import { recordSdkRequest } from '@/lib/analytics/adoption-telemetry';
import { incrementCrawlerHit } from '@/lib/analytics/crawler-counter';
import { canonicalizeDistrictId } from '@/lib/helpers/url-builders';
import { LOCAL_PHOTO_IDS } from '@/generated/local-photo-ids';

// Simple logging for edge runtime (console is allowed in edge runtime)
const logger = {
  // eslint-disable-next-line no-console
  http: (message: string, data?: Record<string, unknown>) => console.log(`[HTTP] ${message}`, data),

  warn: (message: string, data?: Record<string, unknown>) =>
    console.warn(`[WARN] ${message}`, data),
  error: (message: string, error?: Error, data?: Record<string, unknown>) =>
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
    // NOTE: `analytics` is deliberately left off every limiter below.
    //
    // Setting `analytics: true` makes @upstash/ratelimit fire an extra
    // ZINCRBY alongside the sliding-window EVAL on *every* check, doubling
    // the Redis command count — and commands are what Upstash bills for.
    //
    // Worse, the sets it writes are never cleaned up. @upstash/ratelimit
    // v2.0.7 passes `retention: '90d'` to @upstash/core-analytics, but
    // v0.0.10 of that package has no EXPIRE call anywhere: `ingest()` is a
    // bare zincrby. Analytics inherits each limiter's own prefix, so the
    // keys are `ratelimit:<name>:events:<hour>` — e.g.
    // `ratelimit:api:events:1773615600000`. Each bucket persists forever,
    // holding one sorted-set member per distinct identifier seen. Before
    // the identifier was narrowed to (IP, route class), that was one member
    // per (IP, URL) pair. Measured 2026-07-27 before cleanup: 9,364 such
    // keys, ~1.7M members, 23% of the entire keyspace, all with TTL -1,
    // accumulated since 2026-03-15.
    //
    // Nothing in this codebase reads the ratelimit analytics dashboard, so
    // this was pure cost. Re-enable only alongside a retention story.
    ratelimiters = new Map([
      // Public API v1: 60 requests per minute (open endpoints, stricter limit)
      [
        '/api/v1/',
        new Ratelimit({
          redis: redisInstance,
          limiter: Ratelimit.slidingWindow(60, '1 m'),
          prefix: 'ratelimit:v1',
        }),
      ],
      // Public feeds: 60 requests per minute
      [
        '/api/feed/',
        new Ratelimit({
          redis: redisInstance,
          limiter: Ratelimit.slidingWindow(60, '1 m'),
          prefix: 'ratelimit:feed',
        }),
      ],
      // Internal API surface: 600 requests per minute.
      //
      // These next three are first-party UI traffic, and the quota is now
      // aggregated per IP rather than per URL (see the identifier note in
      // checkRateLimit). The previous numbers were sized when each URL had
      // its own budget, which made them effectively unlimited — applying
      // them as aggregates would false-positive on any shared or NAT'd IP.
      // A single profile view fires roughly ten API calls, and CIV.IQ is
      // explicitly aimed at libraries, newsrooms, and civic offices where
      // many people sit behind one address. 600/min sustains ~10 req/s for
      // such a site while still stopping a scraper running thousands/min.
      [
        '/api/',
        new Ratelimit({
          redis: redisInstance,
          limiter: Ratelimit.slidingWindow(600, '1 m'),
          prefix: 'ratelimit:api',
        }),
      ],
      // Representatives endpoints: 240 requests per minute
      [
        '/api/representatives',
        new Ratelimit({
          redis: redisInstance,
          limiter: Ratelimit.slidingWindow(240, '1 m'),
          prefix: 'ratelimit:representatives',
        }),
      ],
      // District map: 120 requests per minute (map panning is bursty)
      [
        '/api/district-map',
        new Ratelimit({
          redis: redisInstance,
          limiter: Ratelimit.slidingWindow(120, '1 m'),
          prefix: 'ratelimit:district-map',
        }),
      ],
      // Default: 200 requests per minute
      [
        'default',
        new Ratelimit({
          redis: redisInstance,
          limiter: Ratelimit.slidingWindow(200, '1 m'),
          prefix: 'ratelimit:default',
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
  "script-src 'self' 'unsafe-inline' blob: https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-scripts.com; " + // unsafe-inline required for Next.js App Router hydration, Google Analytics; va.vercel-scripts.com for Vercel Web Analytics
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
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-scripts.com; " + // Google Analytics, Vercel Web Analytics
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

// Must stay in sync with the Ratelimit instances in getRatelimiters() —
// this table drives the in-memory fallback used when Upstash is unavailable.
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  '/api/v1/': { requests: 60, windowMs: 60000 }, // published public contract
  '/api/feed/': { requests: 60, windowMs: 60000 }, // published public contract
  '/api/': { requests: 600, windowMs: 60000 },
  '/api/representatives': { requests: 240, windowMs: 60000 },
  '/api/district-map': { requests: 120, windowMs: 60000 },
  default: { requests: 600, windowMs: 60000 },
};

const PHOTO_ROUTE_PREFIX = '/api/representative-photo/';

/**
 * Is this a portrait request we can serve without metering it?
 *
 * The limiter runs in middleware, which on Vercel executes *before* the CDN
 * is consulted. A route whose responses the CDN already serves still burns
 * one Upstash command per request — measured against production 2026-07-27,
 * four consecutive requests to a single portrait returned
 * `x-vercel-cache: HIT` while `x-ratelimit-remaining` fell 597 -> 594. The
 * origin function never ran; the Redis command was pure cost.
 *
 * /api/representative-photo was 65% of all API traffic (4,569 of 6,994
 * sampled requests), making it the largest remaining consumer of Upstash
 * commands after page views came off the limiter.
 *
 * The exemption is deliberately keyed on the specific ID rather than the
 * route prefix. The route accepts any /^[A-Z]\d{6}$/ string — 26 million of
 * them — and only the ~437 with a pre-downloaded portrait are cheap. The
 * rest fall through to Wikidata, the House Clerk, and two GitHub fetches
 * with 8s timeouts, and their 404 is CDN-cached for only five minutes, so an
 * exemption by prefix would leave an uncapped path that generates outbound
 * traffic against third parties. Known ID: disk hit, cached a week, safe to
 * exempt. Unknown ID: metered exactly as before.
 *
 * LOCAL_PHOTO_IDS is generated from public/photos/webp/ — see
 * scripts/gen-local-photo-ids.mjs. If it goes stale, a new portrait is rate
 * limited rather than exempt, which is the pre-exemption behaviour.
 */
function isUnmeteredPhotoRequest(pathname: string): boolean {
  if (!pathname.startsWith(PHOTO_ROUTE_PREFIX)) return false;

  const id = pathname.slice(PHOTO_ROUTE_PREFIX.length);
  // Reject anything with a trailing path segment before the Set lookup.
  if (id.includes('/')) return false;

  return LOCAL_PHOTO_IDS.has(id.toUpperCase());
}

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

    // Canonical-slug redirect for /districts/[id] (Phase 7d).
    // Redirect variants (NY-8, ny-08, NY8) to canonical NY-08 before any rendering
    // starts, so we always emit a proper HTTP 308 with Location header.
    const districtMatch = request.nextUrl.pathname.match(/^\/districts\/([^/]+)(\/.*)?$/);
    if (districtMatch?.[1]) {
      const parsed = canonicalizeDistrictId(districtMatch[1]);
      if (parsed && parsed.canonical !== districtMatch[1]) {
        const suffix = districtMatch[2] ?? '';
        const redirectUrl = new URL(`/districts/${parsed.canonical}${suffix}`, request.nextUrl);
        redirectUrl.search = request.nextUrl.search;
        return NextResponse.redirect(redirectUrl, 308);
      }
    }

    // Legacy digest redirect: the digest is now per-state at
    // /digest/{state}/{week}. Old single-segment /digest/{week} URLs
    // (week-shaped, e.g. /digest/2026-W26) are indexed and canonical, so
    // 308 them to the Michigan default rather than 404. State/archive
    // paths (/digest/mi, /digest/mi/2026-W26) have >1 segment and are
    // untouched by this single-segment match.
    const legacyDigest = request.nextUrl.pathname.match(/^\/digest\/(\d{4}-W\d{2})\/?$/i);
    if (legacyDigest?.[1]) {
      const redirectUrl = new URL(`/digest/mi/${legacyDigest[1].toUpperCase()}`, request.nextUrl);
      redirectUrl.search = request.nextUrl.search;
      return NextResponse.redirect(redirectUrl, 308);
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

    // Handle CORS preflight for public endpoints (/api/v1/ and /api/feed/)
    const isPublicEndpoint =
      request.nextUrl.pathname.startsWith('/api/v1/') ||
      request.nextUrl.pathname.startsWith('/api/feed/') ||
      request.nextUrl.pathname.startsWith('/api/activitypub/') ||
      request.nextUrl.pathname.startsWith('/.well-known/');

    if (isPublicEndpoint && request.method === 'OPTIONS') {
      const isActivityPubInbox = request.nextUrl.pathname === '/api/activitypub/inbox';
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': isActivityPubInbox
            ? 'GET, POST, OPTIONS'
            : 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept, Signature, Date, Digest',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Apply rate limiting — API routes only.
    //
    // The matcher below deliberately covers page navigations too (for the
    // district/digest canonical redirects above and the security headers
    // below), but rate limiting them cost an Upstash round-trip on the
    // critical path of every HTML request, including ones the CDN would
    // otherwise serve without waking a function. Rate limiting exists to
    // protect the API surface; page routes are static or ISR and are already
    // covered by Vercel's platform-level DDoS mitigation.
    //
    // Portrait requests for known-local IDs are exempt for the same reason.
    // See isUnmeteredPhotoRequest above.
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
    const rateLimitResult =
      isApiRoute && !isUnmeteredPhotoRequest(request.nextUrl.pathname)
        ? await checkRateLimit(request, clientInfo.ip)
        : null;
    if (rateLimitResult && !rateLimitResult.allowed) {
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

    // Detect lite mode
    const isLiteMode =
      request.nextUrl.searchParams.get('lite') === '1' ||
      request.nextUrl.pathname.startsWith('/lite/');

    // Detect embed routes (allow iframing)
    const isEmbedRoute = request.nextUrl.pathname.startsWith('/embed/');

    // Share-card OG rewrite: /representative/{id}?card=... is served by the
    // dynamic /share route (card-specific social metadata) so the canonical
    // profile URL can stay ISR-cached. Rewrite, not redirect — shared links
    // keep their URL and crawlers see the card-specific OG tags.
    const isProfileShareCard =
      request.nextUrl.searchParams.has('card') &&
      /^\/representative\/[A-Za-z]\d{6}$/.test(request.nextUrl.pathname);

    // Create response with security headers
    const response = isProfileShareCard
      ? NextResponse.rewrite(
          new URL(`${request.nextUrl.pathname}/share${request.nextUrl.search}`, request.nextUrl)
        )
      : NextResponse.next();

    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Override frame restrictions for embed routes
    if (isEmbedRoute) {
      response.headers.set('X-Frame-Options', 'ALLOWALL');
      // Replace CSP with embed-safe version (frame-ancestors *)
      const currentCsp = response.headers.get('Content-Security-Policy') || '';
      const embedCsp = currentCsp.replace(/frame-ancestors\s+'none'/, 'frame-ancestors *');
      response.headers.set('Content-Security-Policy', embedCsp);
    }

    // Add lite mode header when active
    if (isLiteMode) {
      response.headers.set('X-Lite-Mode', '1');
    }

    // Add CORS headers for public endpoints
    if (isPublicEndpoint) {
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    }

    // Add rate limit headers (API routes only — meaningless on page routes,
    // which are no longer rate limited)
    if (rateLimitResult) {
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set(
        'X-RateLimit-Remaining',
        Math.max(0, rateLimitResult.limit - rateLimitResult.current).toString()
      );
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    }

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

    // Fire-and-forget request analytics (never blocks response)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      incrementRequestCounter(request.nextUrl.pathname, request.method, response.status);
    }

    // Fire-and-forget adoption telemetry — only for public REST API and MCP
    // endpoints, since those are the surfaces external consumers use.
    if (
      request.nextUrl.pathname.startsWith('/api/v1/') ||
      request.nextUrl.pathname.startsWith('/api/mcp')
    ) {
      recordSdkRequest(clientInfo.userAgent, request.nextUrl.pathname, request.method);
    }

    // Fire-and-forget crawler attribution for page paths. API paths already log
    // their User-Agent; pages did not, which made search/AI indexing invisible.
    // Only known bots increment, so humans never cost a Redis command.
    if (!request.nextUrl.pathname.startsWith('/api/')) {
      incrementCrawlerHit(clientInfo.userAgent);
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
  // Use the last IP in x-forwarded-for chain (closest trusted proxy entry)
  // to mitigate header spoofing. On Vercel, the rightmost IP before Vercel's
  // own entry is the actual client IP.
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const forwardedParts = forwarded?.split(',').map(s => s.trim()) || [];
  const ip =
    (forwardedParts.length > 1 ? forwardedParts[forwardedParts.length - 1] : forwardedParts[0]) ||
    realIp ||
    'unknown';

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

  const fullPath = url.pathname + url.search;

  // Reject excessively long URLs before any regex evaluation (ReDoS protection)
  if (fullPath.length > 2048) {
    return { isValid: false, reason: 'Request URI too long', statusCode: 414 };
  }

  // Check for malicious patterns
  const maliciousPatterns = [
    /\.\./, // Path traversal
    /<script/i, // XSS attempts
    /eval\(/i, // Code injection
    /\bunion\b.*\bselect\b/i, // SQL injection (word boundaries prevent ReDoS)
    /%00/, // Null byte injection
    /\${/, // Template injection
  ];

  for (const pattern of maliciousPatterns) {
    if (pattern.test(fullPath)) {
      return { isValid: false, reason: 'Malicious request pattern detected', statusCode: 400 };
    }
  }

  // Validate content length for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
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

  for (const path of [
    '/api/v1/',
    '/api/feed/',
    '/api/district-map',
    '/api/representatives',
    '/api/',
  ]) {
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
      // Bucket per (IP, route class) — NOT per (IP, exact URL).
      //
      // The old `${clientIp}:${url.pathname}` key meant the quota applied to
      // each distinct URL separately, so an IP's total request rate was
      // unbounded: a crawler walking 10,000 representative pages got 10,000
      // independent budgets and created 10,000 sliding-window keys in Redis.
      // The limiter cost money and enforced nothing. Keying on the route
      // class makes the published "60 requests/minute per IP" contract real
      // and collapses key cardinality to one per IP per class.
      const identifier = `${clientIp}:${ratelimiterKey}`;
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
  // Same bucketing as the Upstash path — per (IP, route class), not per URL.
  return checkFallbackRateLimit(clientIp, ratelimiterKey, config);
}

/**
 * Fallback in-memory rate limiting (same as original implementation)
 * Used when Upstash Redis is unavailable
 */
function checkFallbackRateLimit(
  clientIp: string,
  bucket: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  limit: number;
  current: number;
  resetTime: number;
  source: 'fallback';
} {
  const now = Date.now();
  const key = `${clientIp}:${bucket}`;
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const resetTime = windowStart + config.windowMs;

  let entry = fallbackRateLimitStore.get(key);

  // Clean up expired entries periodically (1% chance)
  if (crypto.getRandomValues(new Uint32Array(1))[0]! / 0xffffffff < 0.01) {
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
