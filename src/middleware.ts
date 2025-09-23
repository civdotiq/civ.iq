/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple logging for edge runtime (console is allowed in edge runtime)
const logger = {
  // eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
  http: (message: string, data?: any) => console.log(`[HTTP] ${message}`, data),
  // eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data),
  // eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
  error: (message: string, error?: Error, data?: any) =>
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, error, data),
};

// Rate limiting store (in-memory for Edge Runtime)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security headers configuration
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), microphone=(), camera=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; worker-src 'self' blob:; frame-ancestors 'none';",
} as const;

// Rate limiting configuration
interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/': { requests: 100, windowMs: 60000 }, // 100 requests per minute for API
  '/api/representatives': { requests: 60, windowMs: 60000 }, // 60 requests per minute for representatives
  '/api/district-map': { requests: 30, windowMs: 60000 }, // 30 requests per minute for maps
  default: { requests: 200, windowMs: 60000 }, // 200 requests per minute for other routes
};

export function middleware(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Extract client information
    const clientInfo = extractClientInfo(request);

    // Log request start (only for API routes in production to avoid spam)
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment && request.nextUrl.pathname.startsWith('/api/')) {
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

    // Apply rate limiting
    const rateLimitResult = checkRateLimit(request, clientInfo.ip);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', {
        url: request.url,
        ip: clientInfo.ip,
        limit: rateLimitResult.limit,
        current: rateLimitResult.current,
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
    if (!isDevelopment && request.nextUrl.pathname.startsWith('/api/')) {
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

function checkRateLimit(
  request: NextRequest,
  clientIp: string
): {
  allowed: boolean;
  limit: number;
  current: number;
  resetTime: number;
} {
  const url = new URL(request.url);
  const now = Date.now();

  // Determine rate limit configuration
  const defaultConfig: RateLimitConfig = { requests: 200, windowMs: 60000 };
  let config: RateLimitConfig = RATE_LIMITS.default || defaultConfig;

  for (const [path, limit] of Object.entries(RATE_LIMITS)) {
    if (path !== 'default' && url.pathname.startsWith(path)) {
      config = limit;
      break;
    }
  }

  // Ensure config is not undefined (defensive programming)
  if (!config) {
    config = defaultConfig;
  }

  const key = `${clientIp}:${url.pathname}`;
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
  const resetTime = windowStart + config.windowMs;

  let entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to cleanup
    cleanupRateLimitStore();
  }

  if (!entry || entry.resetTime <= now) {
    entry = { count: 0, resetTime };
    rateLimitStore.set(key, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= config.requests,
    limit: config.requests,
    current: entry.count,
    resetTime: entry.resetTime,
  };
}

function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key);
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
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Skip internal Next.js paths and static files, but include API routes
    '/((?!_next/static|_next/image|favicon.ico|icon-|manifest.json).*)',
  ],
};
