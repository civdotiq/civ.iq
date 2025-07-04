import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequest: number
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator?: (request: NextRequest) => string
  onLimitReached?: (request: NextRequest) => NextResponse
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private config: Required<RateLimitConfig>

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      onLimitReached: config.onLimitReached || this.defaultOnLimitReached,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false
    }

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000)
  }

  private defaultKeyGenerator(request: NextRequest): string {
    // Use IP address from various possible headers
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0] || realIp || 'unknown'
    return ip
  }

  private defaultOnLimitReached(request: NextRequest): NextResponse {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(this.config.windowMs / 1000)
      },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(this.config.windowMs / 1000)) } }
    )
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  async check(request: NextRequest): Promise<{
    allowed: boolean
    limit: number
    remaining: number
    resetTime: number
    response?: NextResponse
  }> {
    const key = this.config.keyGenerator(request)
    const now = Date.now()
    
    let entry = this.store.get(key)

    // Initialize or reset if window expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        firstRequest: now
      }
      this.store.set(key, entry)
    }

    // Increment count
    entry.count++

    const remaining = Math.max(0, this.config.maxRequests - entry.count)
    const allowed = entry.count <= this.config.maxRequests

    if (!allowed) {
      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        response: this.config.onLimitReached(request)
      }
    }

    return {
      allowed: true,
      limit: this.config.maxRequests,
      remaining,
      resetTime: entry.resetTime
    }
  }

  // Method to add rate limit headers to responses
  addHeaders(response: NextResponse, limit: number, remaining: number, resetTime: number): NextResponse {
    response.headers.set('X-RateLimit-Limit', String(limit))
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)))
    return response
  }
}

// Create rate limiter instances for different endpoints
export const createRateLimiter = (config: RateLimitConfig) => new RateLimiter(config)

// Predefined rate limiters
export const apiRateLimiter = createRateLimiter({
  maxRequests: 100, // 100 requests
  windowMs: 15 * 60 * 1000, // per 15 minutes
})

export const strictApiRateLimiter = createRateLimiter({
  maxRequests: 10, // 10 requests
  windowMs: 60 * 1000, // per minute
})

export const publicApiRateLimiter = createRateLimiter({
  maxRequests: 1000, // 1000 requests
  windowMs: 60 * 60 * 1000, // per hour
})

// Helper function to apply rate limiting to API routes
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  rateLimiter: RateLimiter = apiRateLimiter
): Promise<NextResponse> {
  const result = await rateLimiter.check(request)

  if (!result.allowed && result.response) {
    return result.response
  }

  try {
    const response = await handler()
    return rateLimiter.addHeaders(response, result.limit, result.remaining, result.resetTime)
  } catch (error) {
    // Even if handler fails, we still consumed a rate limit slot
    const errorResponse = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
    return rateLimiter.addHeaders(errorResponse, result.limit, result.remaining, result.resetTime)
  }
}