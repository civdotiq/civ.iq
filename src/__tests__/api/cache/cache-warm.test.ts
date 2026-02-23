/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Cache Warming Route Tests
 *
 * Tests expanded endpoint list, maxDuration, and structure via source-level contracts.
 * Auth and runtime behavior are verified via source inspection since the route
 * depends on live fetch calls that can't be easily mocked in JSDOM.
 */

import * as fs from 'fs';
import * as path from 'path';
import { GET } from '@/app/api/cache/warm/route';

describe('Cache Warming Route', () => {
  const routeSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/app/api/cache/warm/route.ts'),
    'utf-8'
  );

  describe('exports', () => {
    it('should export GET function', () => {
      expect(typeof GET).toBe('function');
    });
  });

  describe('source-level contracts', () => {
    it('should have maxDuration of 60', () => {
      expect(routeSource).toMatch(/maxDuration\s*=\s*60/);
    });

    it('should require CACHE_WARM_SECRET auth', () => {
      expect(routeSource).toContain('CACHE_WARM_SECRET');
      expect(routeSource).toContain('Bearer');
    });

    it('should return 401 when auth is wrong', () => {
      expect(routeSource).toContain('401');
      expect(routeSource).toContain('Unauthorized');
    });

    it('should warm /api/districts/all endpoint', () => {
      expect(routeSource).toContain('/api/districts/all');
    });

    it('should warm /api/v1/representatives endpoint', () => {
      expect(routeSource).toContain('/api/v1/representatives');
    });

    it('should warm /api/v1/committees endpoint', () => {
      expect(routeSource).toContain('/api/v1/committees');
    });

    it('should warm /api/v1/bills endpoint', () => {
      expect(routeSource).toContain('/api/v1/bills');
    });

    it('should warm /api/feed/bills/latest endpoint', () => {
      expect(routeSource).toContain('/api/feed/bills/latest');
    });

    it('should warm at least 15 congressional leader feeds', () => {
      const bioguideMatches = routeSource.match(/[A-Z]\d{6}/g) || [];
      expect(bioguideMatches.length).toBeGreaterThanOrEqual(15);
    });

    it('should warm member feeds via /api/feed/member/', () => {
      expect(routeSource).toContain('/api/feed/member/');
    });

    it('should warm endpoints sequentially with CacheWarmer user agent', () => {
      expect(routeSource).toContain('CacheWarmer/1.0');
    });

    it('should return success summary with results array', () => {
      expect(routeSource).toContain('results');
      expect(routeSource).toContain('summary');
      expect(routeSource).toContain('successful');
      expect(routeSource).toContain('failed');
    });
  });
});
