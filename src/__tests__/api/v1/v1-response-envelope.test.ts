/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * V1 Response Envelope Unit Tests
 *
 * Tests the v1Success/v1Error helpers for contract stability.
 * These are the building blocks of every v1 API response.
 */

import { v1Success, v1Error } from '@/lib/api/v1-response';
import type { V1Response, V1ErrorResponse, V1Meta, V1Pagination } from '@/lib/api/v1-response';

describe('V1 Response Envelope', () => {
  describe('v1Success()', () => {
    it('should return correct envelope shape', () => {
      const result = v1Success({ id: 1 }, 'test-source');

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(Object.keys(result).sort()).toEqual(['data', 'meta']);
    });

    it('should include all required meta fields', () => {
      const result = v1Success([], 'congress.gov');
      const metaKeys = Object.keys(result.meta).sort();

      expect(metaKeys).toEqual(['apiVersion', 'documentation', 'license', 'source', 'timestamp']);
    });

    it('should omit meta.warnings when none are passed', () => {
      const result = v1Success([], 'congress.gov');
      expect(result.meta).not.toHaveProperty('warnings');
    });

    it('should omit meta.warnings when an empty array is passed', () => {
      const result = v1Success([], 'congress.gov', undefined, []);
      expect(result.meta).not.toHaveProperty('warnings');
    });

    it('should surface meta.warnings when warnings are passed', () => {
      const result = v1Success([], 'congress.gov', undefined, ["Unknown parameter 'query'"]);
      expect(result.meta.warnings).toEqual(["Unknown parameter 'query'"]);
    });

    it('should keep warnings alongside pagination', () => {
      const result = v1Success([], 'congress.gov', { total: 9, limit: 5, offset: 0 }, ['note']);
      expect(result.pagination?.hasMore).toBe(true);
      expect(result.meta.warnings).toEqual(['note']);
    });

    it('should set apiVersion to v1', () => {
      const result = v1Success(null, 'test');
      expect(result.meta.apiVersion).toBe('v1');
    });

    it('should set license to MIT', () => {
      const result = v1Success(null, 'test');
      expect(result.meta.license).toBe('MIT');
    });

    it('should set documentation URL', () => {
      const result = v1Success(null, 'test');
      expect(result.meta.documentation).toBe('https://civdotiq.org/docs/api');
    });

    it('should pass through the source parameter', () => {
      const result = v1Success(null, 'congress-legislators');
      expect(result.meta.source).toBe('congress-legislators');
    });

    it('should set timestamp as ISO 8601 string', () => {
      const before = new Date().toISOString();
      const result = v1Success(null, 'test');
      const after = new Date().toISOString();

      expect(result.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.meta.timestamp >= before).toBe(true);
      expect(result.meta.timestamp <= after).toBe(true);
    });

    it('should pass through data unchanged', () => {
      const data = { name: 'Test Rep', bioguideId: 'T000001' };
      const result = v1Success(data, 'test');
      expect(result.data).toEqual(data);
    });

    it('should handle array data', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = v1Success(data, 'test');
      expect(result.data).toEqual(data);
      expect(result.data).toHaveLength(2);
    });

    it('should handle empty data', () => {
      const result = v1Success([], 'test');
      expect(result.data).toEqual([]);
    });

    it('should not include pagination when not provided', () => {
      const result = v1Success([], 'test');
      expect(result.pagination).toBeUndefined();
    });

    it('should include pagination when provided', () => {
      const result = v1Success([], 'test', { total: 100, limit: 10, offset: 0 });

      expect(result.pagination).toBeDefined();
      expect(Object.keys(result.pagination!).sort()).toEqual([
        'hasMore',
        'limit',
        'offset',
        'total',
      ]);
    });

    it('should calculate hasMore=true when more results exist', () => {
      const result = v1Success([], 'test', { total: 100, limit: 10, offset: 0 });
      expect(result.pagination!.hasMore).toBe(true);
    });

    it('should calculate hasMore=false at end of results', () => {
      const result = v1Success([], 'test', { total: 100, limit: 10, offset: 90 });
      expect(result.pagination!.hasMore).toBe(false);
    });

    it('should calculate hasMore=false when offset+limit equals total', () => {
      const result = v1Success([], 'test', { total: 50, limit: 50, offset: 0 });
      expect(result.pagination!.hasMore).toBe(false);
    });

    it('should calculate hasMore=false when offset+limit exceeds total', () => {
      const result = v1Success([], 'test', { total: 5, limit: 50, offset: 0 });
      expect(result.pagination!.hasMore).toBe(false);
    });

    it('should include envelope shape with pagination', () => {
      const result = v1Success([1], 'test', { total: 1, limit: 10, offset: 0 });
      expect(Object.keys(result).sort()).toEqual(['data', 'meta', 'pagination']);
    });
  });

  describe('v1Error()', () => {
    it('should return correct envelope shape', () => {
      const result = v1Error(400, 'Bad request');

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('meta');
      expect(Object.keys(result).sort()).toEqual(['error', 'meta']);
    });

    it('should include all required error fields', () => {
      const result = v1Error(404, 'Not found');
      const errorKeys = Object.keys(result.error).sort();

      // 'details' is undefined when not passed, but the key still exists
      expect(errorKeys).toContain('code');
      expect(errorKeys).toContain('message');
    });

    it('should set the error code', () => {
      const result = v1Error(404, 'Not found');
      expect(result.error.code).toBe(404);
    });

    it('should set the error message', () => {
      const result = v1Error(400, 'Invalid bioguide ID');
      expect(result.error.message).toBe('Invalid bioguide ID');
    });

    it('should include details when provided', () => {
      const result = v1Error(400, 'Validation failed', 'bioguideId must match /^[A-Z]\\d{6}$/');
      expect(result.error.details).toBe('bioguideId must match /^[A-Z]\\d{6}$/');
    });

    it('should have undefined details when not provided', () => {
      const result = v1Error(500, 'Internal error');
      expect(result.error.details).toBeUndefined();
    });

    it('should include meta with source set to "error"', () => {
      const result = v1Error(500, 'test');
      expect(result.meta.source).toBe('error');
    });

    it('should include all standard meta fields on error', () => {
      const result = v1Error(500, 'test');

      expect(result.meta.apiVersion).toBe('v1');
      expect(result.meta.license).toBe('MIT');
      expect(result.meta.documentation).toBe('https://civdotiq.org/docs/api');
      expect(result.meta.timestamp).toBeTruthy();
    });
  });

  describe('Contract Stability — Key Snapshots', () => {
    it('should maintain v1Success key structure', () => {
      const result = v1Success({ test: true }, 'test');
      expect(Object.keys(result).sort()).toMatchInlineSnapshot(`
        [
          "data",
          "meta",
        ]
      `);
    });

    it('should maintain v1Success meta key structure', () => {
      const result = v1Success(null, 'test');
      expect(Object.keys(result.meta).sort()).toMatchInlineSnapshot(`
        [
          "apiVersion",
          "documentation",
          "license",
          "source",
          "timestamp",
        ]
      `);
    });

    it('should maintain v1Success pagination key structure', () => {
      const result = v1Success(null, 'test', { total: 10, limit: 5, offset: 0 });
      expect(Object.keys(result.pagination!).sort()).toMatchInlineSnapshot(`
        [
          "hasMore",
          "limit",
          "offset",
          "total",
        ]
      `);
    });

    it('should maintain v1Error key structure', () => {
      const result = v1Error(400, 'test');
      expect(Object.keys(result).sort()).toMatchInlineSnapshot(`
        [
          "error",
          "meta",
        ]
      `);
    });

    it('should maintain v1Error error key structure', () => {
      const result = v1Error(400, 'test', 'details');
      expect(Object.keys(result.error).sort()).toMatchInlineSnapshot(`
        [
          "code",
          "details",
          "message",
        ]
      `);
    });
  });
});
