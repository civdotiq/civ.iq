/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { RateLimiter } from 'limiter';
import { structuredLogger } from '@/lib/logging/logger';

// Rate limiter instances for different endpoint types
const rateLimiters = {
  general: new RateLimiter(100, 'minute', true), // 100 requests per minute
  search: new RateLimiter(20, 'minute', true),   // 20 requests per minute for search
  batch: new RateLimiter(5, 'minute', true),     // 5 requests per minute for batch operations
  heavy: new RateLimiter(10, 'minute', true),    // 10 requests per minute for heavy operations
};

// IP-based rate limiting using Map (in production, use Redis)
const ipRateLimiters = new Map<string, { 
  limiter: RateLimiter, 
  firstRequest: number,
  requestCount: number 
}>();

// Cleanup old IP limiters every 10 minutes
setInterval(() => {
  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000;
  
  for (const [ip, data] of ipRateLimiters.entries()) {
    if (data.firstRequest < tenMinutesAgo) {
      ipRateLimiters.delete(ip);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitOptions {
  type: 'general' | 'search' | 'batch' | 'heavy';
  ip: string;
  endpoint: string;
  userAgent?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  retryAfter?: number;
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const { type, ip, endpoint, userAgent } = options;
  
  // Get or create IP-specific rate limiter
  let ipData = ipRateLimiters.get(ip);
  if (!ipData) {
    ipData = {
      limiter: new RateLimiter(100, 'minute', true), // Default 100 per minute per IP
      firstRequest: Date.now(),
      requestCount: 0
    };
    ipRateLimiters.set(ip, ipData);
  }

  // Check global rate limiter for endpoint type
  const globalLimiter = rateLimiters[type];
  const globalAllowed = globalLimiter.tryRemoveTokens(1);
  
  // Check IP-specific rate limiter
  const ipAllowed = ipData.limiter.tryRemoveTokens(1);
  
  ipData.requestCount++;
  
  const allowed = globalAllowed && ipAllowed;
  const remainingRequests = Math.min(
    globalLimiter.getTokensRemaining(),
    ipData.limiter.getTokensRemaining()
  );
  
  const resetTime = Date.now() + (60 * 1000); // Reset in 1 minute
  
  // Log rate limit events
  if (!allowed) {
    structuredLogger.security('rate_limit', {
      ip,
      endpoint,
      userAgent,
      type,
      globalAllowed,
      ipAllowed,
      requestCount: ipData.requestCount
    });
  }
  
  const result: RateLimitResult = {
    allowed,
    remainingRequests,
    resetTime,
    retryAfter: allowed ? undefined : 60 // Retry after 60 seconds
  };
  
  return result;
}

// Rate limit middleware function
export function createRateLimitMiddleware(type: RateLimitOptions['type']) {
  return function rateLimitMiddleware(
    request: Request,
    endpoint: string
  ): { 
    allowed: boolean; 
    headers: Record<string, string>; 
    status?: number;
    message?: string;
  } {
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    
    const result = checkRateLimit({
      type,
      ip,
      endpoint,
      userAgent
    });
    
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': getRateLimitForType(type).toString(),
      'X-RateLimit-Remaining': result.remainingRequests.toString(),
      'X-RateLimit-Reset': result.resetTime.toString(),
    };
    
    if (!result.allowed) {
      headers['Retry-After'] = result.retryAfter?.toString() || '60';
      
      return {
        allowed: false,
        headers,
        status: 429,
        message: 'Too Many Requests. Please try again later.'
      };
    }
    
    return {
      allowed: true,
      headers
    };
  };
}

// Helper function to get client IP
function getClientIP(request: Request): string {
  const headers = request.headers;
  
  // Check various headers for client IP
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const clientIP = headers.get('x-client-ip');
  if (clientIP) {
    return clientIP;
  }
  
  // Fallback to a default IP if none found
  return '127.0.0.1';
}

// Helper function to get rate limit for type
function getRateLimitForType(type: RateLimitOptions['type']): number {
  const limits = {
    general: 100,
    search: 20,
    batch: 5,
    heavy: 10
  };
  
  return limits[type];
}

// Export rate limiter instances for direct use
export { rateLimiters };