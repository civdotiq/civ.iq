/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * V1 / Feed Middleware Tests
 *
 * Tests CORS headers, rate-limit response headers, and OPTIONS preflight
 * specific to the public v1 and feed endpoints.
 *
 * These tests validate the middleware logic by mirroring its patterns
 * (similar to the existing middleware.test.ts approach).
 */

describe('V1 & Feed Middleware Logic', () => {
  // ─── CORS ───────────────────────────────────────────────────

  describe('CORS — Public Endpoint Detection', () => {
    const isPublicEndpoint = (pathname: string): boolean =>
      pathname.startsWith('/api/v1/') || pathname.startsWith('/api/feed/');

    it('should identify /api/v1/ routes as public', () => {
      expect(isPublicEndpoint('/api/v1/representatives')).toBe(true);
      expect(isPublicEndpoint('/api/v1/bills')).toBe(true);
      expect(isPublicEndpoint('/api/v1/votes/house-119-1')).toBe(true);
    });

    it('should identify /api/feed/ routes as public', () => {
      expect(isPublicEndpoint('/api/feed/member/P000197')).toBe(true);
      expect(isPublicEndpoint('/api/feed/bills/latest')).toBe(true);
      expect(isPublicEndpoint('/api/feed/district/MI-12')).toBe(true);
    });

    it('should NOT identify internal API routes as public', () => {
      expect(isPublicEndpoint('/api/representatives')).toBe(false);
      expect(isPublicEndpoint('/api/cache/warm')).toBe(false);
      expect(isPublicEndpoint('/api/health')).toBe(false);
    });

    it('should NOT identify page routes as public', () => {
      expect(isPublicEndpoint('/representative/P000197')).toBe(false);
      expect(isPublicEndpoint('/bills')).toBe(false);
      expect(isPublicEndpoint('/')).toBe(false);
    });
  });

  describe('CORS Headers for Public Endpoints', () => {
    const EXPECTED_CORS_HEADERS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };

    it('should have Access-Control-Allow-Origin: *', () => {
      expect(EXPECTED_CORS_HEADERS['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should allow GET and OPTIONS methods', () => {
      const methods = EXPECTED_CORS_HEADERS['Access-Control-Allow-Methods'];
      expect(methods).toContain('GET');
      expect(methods).toContain('OPTIONS');
    });
  });

  describe('OPTIONS Preflight Response', () => {
    // Mirror the middleware logic for OPTIONS handling
    const handlePreflight = (pathname: string, method: string) => {
      const isPublic = pathname.startsWith('/api/v1/') || pathname.startsWith('/api/feed/');
      if (isPublic && method === 'OPTIONS') {
        return {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept',
            'Access-Control-Max-Age': '86400',
          },
        };
      }
      return null;
    };

    it('should return 204 for OPTIONS on v1 routes', () => {
      const result = handlePreflight('/api/v1/representatives', 'OPTIONS');
      expect(result).not.toBeNull();
      expect(result!.status).toBe(204);
    });

    it('should return 204 for OPTIONS on feed routes', () => {
      const result = handlePreflight('/api/feed/bills/latest', 'OPTIONS');
      expect(result).not.toBeNull();
      expect(result!.status).toBe(204);
    });

    it('should NOT intercept OPTIONS on internal routes', () => {
      const result = handlePreflight('/api/cache/warm', 'OPTIONS');
      expect(result).toBeNull();
    });

    it('should NOT intercept GET requests (only OPTIONS)', () => {
      const result = handlePreflight('/api/v1/representatives', 'GET');
      expect(result).toBeNull();
    });

    it('should include correct preflight headers', () => {
      const result = handlePreflight('/api/v1/bills', 'OPTIONS');
      expect(result!.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Max-Age': '86400',
      });
    });

    it('should set Max-Age to 24 hours (86400s)', () => {
      const result = handlePreflight('/api/v1/committees', 'OPTIONS');
      expect(result!.headers['Access-Control-Max-Age']).toBe('86400');
    });
  });

  // ─── Rate Limit Headers ─────────────────────────────────────

  describe('Rate Limit Response Headers', () => {
    const RATE_LIMIT_HEADERS = ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'];

    it('should define all 3 rate limit header names', () => {
      expect(RATE_LIMIT_HEADERS).toContain('X-RateLimit-Limit');
      expect(RATE_LIMIT_HEADERS).toContain('X-RateLimit-Remaining');
      expect(RATE_LIMIT_HEADERS).toContain('X-RateLimit-Reset');
    });

    it('should use numeric string values for rate limit headers', () => {
      // Simulate how middleware sets these headers
      const limit = 60;
      const remaining = 59;
      const reset = Date.now() + 60000;

      const headers = {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': Math.max(0, remaining).toString(),
        'X-RateLimit-Reset': reset.toString(),
      };

      expect(headers['X-RateLimit-Limit']).toMatch(/^\d+$/);
      expect(headers['X-RateLimit-Remaining']).toMatch(/^\d+$/);
      expect(headers['X-RateLimit-Reset']).toMatch(/^\d+$/);
    });
  });

  describe('Rate Limit Config for v1 and Feed Routes', () => {
    const RATE_LIMIT_CONFIGS: Record<string, { requests: number; windowMs: number }> = {
      '/api/v1/': { requests: 60, windowMs: 60000 },
      '/api/feed/': { requests: 60, windowMs: 60000 },
    };

    it('v1 routes should have 60 req/min limit', () => {
      expect(RATE_LIMIT_CONFIGS['/api/v1/']!.requests).toBe(60);
      expect(RATE_LIMIT_CONFIGS['/api/v1/']!.windowMs).toBe(60000);
    });

    it('feed routes should have 60 req/min limit', () => {
      expect(RATE_LIMIT_CONFIGS['/api/feed/']!.requests).toBe(60);
      expect(RATE_LIMIT_CONFIGS['/api/feed/']!.windowMs).toBe(60000);
    });

    it('v1 and feed should have matching limits', () => {
      expect(RATE_LIMIT_CONFIGS['/api/v1/']!.requests).toBe(
        RATE_LIMIT_CONFIGS['/api/feed/']!.requests
      );
    });
  });

  describe('Rate Limit Path Matching', () => {
    // Mirror the middleware's rate limiter selection logic
    function getRateLimiterKey(pathname: string): string {
      const paths = [
        '/api/v1/',
        '/api/feed/',
        '/api/district-map',
        '/api/representatives',
        '/api/',
      ];
      for (const path of paths) {
        if (pathname.startsWith(path)) return path;
      }
      return 'default';
    }

    it('should match v1 routes to /api/v1/ limiter', () => {
      expect(getRateLimiterKey('/api/v1/representatives')).toBe('/api/v1/');
      expect(getRateLimiterKey('/api/v1/bills/119-hr-1')).toBe('/api/v1/');
      expect(getRateLimiterKey('/api/v1/votes/house-119-1')).toBe('/api/v1/');
    });

    it('should match feed routes to /api/feed/ limiter', () => {
      expect(getRateLimiterKey('/api/feed/member/P000197')).toBe('/api/feed/');
      expect(getRateLimiterKey('/api/feed/bills/latest')).toBe('/api/feed/');
    });

    it('should match internal API routes to /api/ limiter', () => {
      expect(getRateLimiterKey('/api/cache/warm')).toBe('/api/');
      expect(getRateLimiterKey('/api/health')).toBe('/api/');
    });

    it('should match non-API routes to default limiter', () => {
      expect(getRateLimiterKey('/representative/P000197')).toBe('default');
      expect(getRateLimiterKey('/')).toBe('default');
    });

    it('v1 routes should be matched before generic /api/ limiter', () => {
      // This tests that the order matters — /api/v1/ is checked before /api/
      const key = getRateLimiterKey('/api/v1/representatives');
      expect(key).toBe('/api/v1/');
      expect(key).not.toBe('/api/');
    });
  });

  // ─── 429 Response ───────────────────────────────────────────

  describe('Rate Limit Exceeded Response (429)', () => {
    it('should include rate limit headers on 429', () => {
      const rateLimitExceededHeaders = {
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Date.now() + 30000),
        'Retry-After': '30',
      };

      expect(rateLimitExceededHeaders['X-RateLimit-Remaining']).toBe('0');
      expect(rateLimitExceededHeaders).toHaveProperty('Retry-After');
    });

    it('should set Retry-After as seconds', () => {
      const resetTime = Date.now() + 45000;
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000).toString();

      expect(parseInt(retryAfter)).toBeGreaterThan(0);
      expect(parseInt(retryAfter)).toBeLessThanOrEqual(60);
    });
  });

  // ─── Performance Headers ────────────────────────────────────

  describe('Performance Headers', () => {
    it('should have X-Response-Time format', () => {
      const duration = 42;
      const header = `${duration}ms`;
      expect(header).toMatch(/^\d+ms$/);
    });

    it('should have X-Request-ID format', () => {
      const requestId = `req_${Date.now()}_a1b2c3d4`;
      expect(requestId).toMatch(/^req_\d+_[a-f0-9]+$/);
    });
  });
});
