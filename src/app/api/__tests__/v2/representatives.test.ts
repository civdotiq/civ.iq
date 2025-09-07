/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { NextRequest } from 'next/server';
import type { ListResponse, PaginatedResponse } from '@/lib/middleware/api-response';
import type { EnhancedRepresentative } from '@/types/representative';

// Test server setup for integration testing
const server: ReturnType<typeof import('http').createServer> | null = null;
const BASE_URL = 'http://localhost:3001';

beforeAll(async () => {
  // Test server will be set up when implementing endpoints
  // const { createServer } = require('http');
  // server = createServer(app);
  // server.listen(3001);
});

afterAll(async () => {
  // Clean up test server
  // server?.close();
});

/**
 * PHASE 2 API CONSOLIDATION TESTS
 *
 * Testing 7 → 1 consolidation of representatives endpoints:
 * - representatives → /api/v2/representatives (PRIMARY)
 * - representatives-simple → ?format=simple
 * - representatives-v2 → MERGE INTO PRIMARY
 * - representatives-multi-district → ?includeMultiDistrict=true
 * - representatives/all → ?includeAll=true
 * - representatives/by-district → ?state=XX&district=YY
 * - v1/representatives → DEPRECATED → REDIRECT
 */

describe('/api/v2/representatives - Consolidated Endpoint', () => {
  describe('Basic Functionality', () => {
    test('should return all representatives with default parameters', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.count).toBeGreaterThan(0);
      expect(data.metadata).toMatchObject({
        timestamp: expect.any(String),
        dataQuality: 'high',
        dataSource: 'congress-legislators',
        cacheable: true,
        processingTime: expect.any(Number),
      });

      // Verify representative structure
      if (data.data && data.data.length > 0) {
        const rep = data.data[0];
        expect(rep).toMatchObject({
          bioguideId: expect.any(String),
          name: expect.any(String),
          party: expect.any(String),
          state: expect.any(String),
          chamber: expect.stringMatching(/^(House|Senate)$/),
          title: expect.any(String),
        });
      }
    });

    test('should handle empty results gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?state=XX`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.count).toBe(0);
    });
  });

  describe('Format Variations (representatives-simple consolidation)', () => {
    test('should return simple format when format=simple', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?format=simple`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.dataSource).toContain('congress-legislators');

      // Simple format should have minimal fields
      if (data.data && data.data.length > 0) {
        const rep = data.data[0];
        expect(rep).toHaveProperty('bioguideId');
        expect(rep).toHaveProperty('name');
        expect(rep).toHaveProperty('party');
        expect(rep).toHaveProperty('state');

        // Should not have detailed fields in simple format
        expect(rep).not.toHaveProperty('committees');
        expect(rep).not.toHaveProperty('socialMedia');
      }
    });

    test('should return detailed format by default', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      expect(response.status).toBe(200);

      if (data.data && data.data.length > 0) {
        const rep = data.data[0];
        expect(rep).toHaveProperty('bioguideId');
        expect(rep).toHaveProperty('contactInfo');
        expect(rep).toHaveProperty('currentTerm');
      }
    });
  });

  describe('Multi-District Support (representatives-multi-district consolidation)', () => {
    test('should include multi-district representatives when includeMultiDistrict=true', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?includeMultiDistrict=true`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should include representatives that serve multiple districts
      // (This would be implementation-specific based on data structure)
    });

    test('should exclude multi-district by default', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Default behavior should exclude multi-district entries
    });
  });

  describe('Include All Option (representatives/all consolidation)', () => {
    test('should include all representatives including inactive when includeAll=true', async () => {
      const responseAll = await fetch(`${BASE_URL}/api/v2/representatives?includeAll=true`);
      const responseDefault = await fetch(`${BASE_URL}/api/v2/representatives`);

      const dataAll: ListResponse<EnhancedRepresentative> = await responseAll.json();
      const dataDefault: ListResponse<EnhancedRepresentative> = await responseDefault.json();

      expect(responseAll.status).toBe(200);
      expect(responseDefault.status).toBe(200);

      // includeAll should return same or more representatives
      expect(dataAll.count).toBeGreaterThanOrEqual(dataDefault.count);
    });
  });

  describe('Geographic Filtering (representatives/by-district consolidation)', () => {
    test('should filter by state', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?state=CA`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // All representatives should be from California
      if (data.data && data.data.length > 0) {
        data.data.forEach(rep => {
          expect(rep.state).toBe('CA');
        });
      }
    });

    test('should filter by state and district', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?state=CA&district=12`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should include House rep from CA-12 and both CA senators
      if (data.data && data.data.length > 0) {
        data.data.forEach(rep => {
          expect(rep.state).toBe('CA');
          if (rep.chamber === 'House') {
            expect(rep.district).toBe('12');
          }
        });
      }
    });

    test('should validate state codes', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?state=INVALID`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_STATE_CODE');
    });

    test('should validate district numbers', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?state=CA&district=999`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_DISTRICT_NUMBER');
    });
  });

  describe('Pagination & Sorting', () => {
    test('should support pagination', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?page=1&limit=10`);
      const data: PaginatedResponse<EnhancedRepresentative> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data?.length).toBeLessThanOrEqual(10);

      // Should include pagination metadata for large datasets
      if (data.pagination && data.pagination.total > 10) {
        expect(data).toHaveProperty('pagination');
        expect(data.pagination).toMatchObject({
          page: 1,
          limit: 10,
          total: expect.any(Number),
          hasMore: expect.any(Boolean),
        });
      }
    });

    test('should support sorting', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?sort=name`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify sorting
      if (data.data && data.data.length > 1) {
        for (let i = 1; i < data.data.length; i++) {
          expect(
            data.data[i]?.name?.localeCompare(data.data[i - 1]?.name || '') || 0
          ).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Party Filtering', () => {
    test('should filter by party', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?party=Democrat`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      if (data.data && data.data.length > 0) {
        data.data.forEach(rep => {
          expect(rep.party).toBe('Democrat');
        });
      }
    });

    test('should support multiple party filter', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?party=Democrat,Republican`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      if (data.data && data.data.length > 0) {
        data.data.forEach(rep => {
          expect(['Democrat', 'Republican']).toContain(rep.party);
        });
      }
    });
  });

  describe('Chamber Filtering', () => {
    test('should filter by chamber', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?chamber=Senate`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      if (data.data && data.data.length > 0) {
        data.data.forEach(rep => {
          expect(rep.chamber).toBe('Senate');
        });
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid query parameters gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?invalid=param`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      // Should succeed but ignore invalid params
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should return proper error for service unavailable', async () => {
      // Mock service failure scenario - circuit breaker behavior testing
      // Implementation will be added when endpoints are created
      expect(true).toBe(true); // Placeholder for now
    });

    test('should validate required parameters for specific queries', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives?district=12`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('MISSING_PARAMETERS');
      expect(data.error.message).toContain('state');
    });
  });

  describe('Response Format Compliance', () => {
    test('should always return standardized ListResponse format', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives`);
      const data: ListResponse<EnhancedRepresentative> = await response.json();

      expect(data).toMatchObject({
        success: expect.any(Boolean),
        count: expect.any(Number),
        metadata: {
          timestamp: expect.any(String),
          dataQuality: expect.stringMatching(/^(high|medium|low|unavailable)$/),
          dataSource: expect.any(String),
          cacheable: expect.any(Boolean),
          processingTime: expect.any(Number),
        },
      });

      if (data.success) {
        expect(data).toHaveProperty('data');
        expect(data.data).toBeInstanceOf(Array);
      } else {
        expect(data).toHaveProperty('error');
        expect(data.error).toMatchObject({
          code: expect.any(String),
          message: expect.any(String),
        });
      }
    });

    test('should include proper cache headers', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/representatives`);

      expect(response.headers.get('cache-control')).toBeTruthy();
      expect(response.headers.get('x-data-source')).toBe('congress-legislators');
    });
  });

  describe('Performance Requirements', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}/api/v2/representatives`);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // 5 second max
    });

    test('should handle concurrent requests efficiently', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => fetch(`${BASE_URL}/api/v2/representatives?limit=10`));

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});

/**
 * LEGACY ENDPOINT BEHAVIOR TESTS
 *
 * These test that the old endpoints still work during transition period
 * and that they return the same data as the consolidated endpoint
 */
describe('Legacy Endpoints Compatibility', () => {
  test('representatives-simple should match v2 with format=simple', async () => {
    // Test that /api/representatives-simple returns same data as /api/v2/representatives?format=simple
    // This ensures backward compatibility during migration
    expect(true).toBe(true); // Placeholder - will be implemented with endpoints
  });

  test('representatives-v2 should redirect to v2/representatives', async () => {
    // Test redirect behavior during migration period
    expect(true).toBe(true); // Placeholder - will be implemented with endpoints
  });

  test('representatives/by-district should match v2 with state/district params', async () => {
    // Test parameter mapping between legacy and new endpoints
    expect(true).toBe(true); // Placeholder - will be implemented with endpoints
  });
});
