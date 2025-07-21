/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRateLimitMiddleware } from '@/lib/rate-limiting/rate-limiter';
import { structuredLogger } from '@/lib/logging/logger';

// Define rate limit types for different endpoints
const RATE_LIMIT_RULES = {
  // Search endpoints
  '/api/search': 'search',
  '/api/representatives': 'search',
  
  // Batch endpoints
  '/api/representative/.*/batch': 'batch',
  '/api/batch': 'batch',
  
  // Heavy computation endpoints
  '/api/representative/.*/party-alignment': 'heavy',
  '/api/representative/.*/news': 'heavy',
  '/api/district-map': 'heavy',
  '/api/representative/.*/votes': 'heavy',
  
  // General endpoints (default)
  '/api/.*': 'general'
} as const;

function getRateLimitType(pathname: string): 'general' | 'search' | 'batch' | 'heavy' {
  for (const [pattern, type] of Object.entries(RATE_LIMIT_RULES)) {
    const regex = new RegExp(pattern);
    if (regex.test(pathname)) {
      return type as 'general' | 'search' | 'batch' | 'heavy';
    }
  }
  return 'general';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only apply rate limiting to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Skip rate limiting for health check
  if (pathname === '/api/health') {
    return NextResponse.next();
  }
  
  try {
    const rateLimitType = getRateLimitType(pathname);
    const rateLimitMiddleware = createRateLimitMiddleware(rateLimitType);
    
    const rateLimitResult = rateLimitMiddleware(request, pathname);
    
    // Create response with rate limit headers
    const response = rateLimitResult.allowed 
      ? NextResponse.next()
      : NextResponse.json(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: rateLimitResult.message || 'Too Many Requests'
            },
            success: false
          },
          { status: rateLimitResult.status || 429 }
        );
    
    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Log rate limit application
    if (rateLimitResult.allowed) {
      structuredLogger.debug('Rate limit check passed', {
        pathname,
        rateLimitType,
        remaining: rateLimitResult.headers['X-RateLimit-Remaining']
      });
    }
    
    return response;
    
  } catch (error) {
    // Log error but don't block request
    structuredLogger.error('Rate limiting error', error as Error, {
      pathname,
      operation: 'rateLimitMiddleware'
    });
    
    return NextResponse.next();
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Exclude static files and images
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};