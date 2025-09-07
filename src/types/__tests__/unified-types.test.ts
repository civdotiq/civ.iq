/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * TDD Test Suite: Unified Type System Consolidation
 *
 * This test suite defines the target unified type system that will consolidate:
 * - 3 competing RepresentativeResponse types
 * - 5 different service patterns
 * - 15+ scattered response interfaces
 *
 * STATUS: These tests SHOULD FAIL initially (TDD approach)
 * They define the contracts we want to achieve through refactoring.
 */

import { describe, test, expect } from '@jest/globals';

// Import the existing competing types for comparison testing
// NOTE: These imports will initially work, but the unified types below will fail
import type {
  EnhancedRepresentative,
  RepresentativeApiResponse,
  BatchApiResponse,
} from '../representative';
import type { Representative, RepresentativeResponse } from '../models/Representative';
import type {
  RepresentativeDetailResponse,
  RepresentativesListResponse,
} from '../api/representatives.types';

// Import the UNIFIED types that we want to create (these will fail initially)
// This is the TDD contract - we define what we want, then implement it
import type {
  // UNIFIED CORE TYPES - consolidates 3 competing RepresentativeResponse types
  UnifiedRepresentative,
  UnifiedRepresentativeResponse,

  // UNIFIED API RESPONSES - consolidates 15+ scattered response interfaces
  ApiResponse,
  ListApiResponse,
  BatchApiResponse as UnifiedBatchApiResponse,
  PaginatedApiResponse,

  // SERVICE CONTRACTS - defines interfaces for 5 different service patterns
  IRepresentativeService,
  IApiService,
  ServiceConfig,
} from '../core/unified-types';

// Import classes with regular imports (not type-only) so we can instantiate them
import {
  // TYPE GUARDS & MIGRATION HELPERS
  RepresentativeMigrationHelper,
  TypeValidator,

  // BACKWARDS COMPATIBILITY
  LegacyTypeAdapter,
} from '../core/unified-types';

describe('Phase 1: Unified Type System Consolidation', () => {
  describe('1.1 Unified RepresentativeResponse (consolidating 3 competing versions)', () => {
    test('should have consistent chamber field across all implementations', () => {
      // TEST CONTRACT: Chamber field should be standardized
      const unifiedRep: UnifiedRepresentativeResponse = {
        bioguideId: 'K000367',
        name: 'Amy Klobuchar',
        party: 'Democratic',
        state: 'MN',
        chamber: 'Senate', // Standardized to 'House' | 'Senate' (not 'house' | 'senate')
        district: null,
        title: 'Senator',
        contactInfo: {
          phone: '(202) 224-3244',
          website: 'https://www.klobuchar.senate.gov',
          office: 'Hart Senate Office Building',
        },
      };

      // Should be compatible with all three existing response types
      expect(unifiedRep.chamber).toBe('Senate');
      expect(['House', 'Senate']).toContain(unifiedRep.chamber);
    });

    test('should merge contact information from all 3 competing implementations', () => {
      const unifiedRep: UnifiedRepresentativeResponse = {
        bioguideId: 'K000367',
        name: 'Amy Klobuchar',
        party: 'Democratic',
        state: 'MN',
        chamber: 'Senate',
        district: null,
        title: 'Senator',
        contactInfo: {
          // Merged from representative.ts RepresentativeApiResponse
          phone: '(202) 224-3244',
          website: 'https://www.klobuchar.senate.gov',

          // Merged from models/Representative.ts RepresentativeResponse
          office: 'Hart Senate Office Building',

          // Merged from api/representatives.types.ts RepresentativeDetailResponse
          address: '425 Dirksen Senate Office Building',
          email: 'senator@klobuchar.senate.gov',
        },
      };

      // Should include all contact fields from competing implementations
      expect(unifiedRep.contactInfo.phone).toBeDefined();
      expect(unifiedRep.contactInfo.website).toBeDefined();
      expect(unifiedRep.contactInfo.office).toBeDefined();
      expect(unifiedRep.contactInfo.address).toBeDefined();
      expect(unifiedRep.contactInfo.email).toBeDefined();
    });

    test('should have consistent bioguideId field as primary key', () => {
      const unifiedRep: UnifiedRepresentativeResponse = {
        bioguideId: 'K000367',
        name: 'Amy Klobuchar',
        party: 'Democratic',
        state: 'MN',
        chamber: 'Senate',
        district: null,
        title: 'Senator',
        contactInfo: {
          phone: '(202) 224-3244',
          website: 'https://www.klobuchar.senate.gov',
          office: 'Hart Senate Office Building',
        },
      };

      // bioguideId should be the consistent primary key across all implementations
      expect(unifiedRep.bioguideId).toBe('K000367');
      expect(typeof unifiedRep.bioguideId).toBe('string');
      expect(unifiedRep.bioguideId.length).toBeGreaterThan(0);
    });
  });

  describe('1.2 Service Interface Contracts (consolidating 5 service patterns)', () => {
    test('should define IRepresentativeService interface for all 5 service implementations', () => {
      // TEST CONTRACT: All 5 competing services should implement this interface
      const mockService: IRepresentativeService = {
        getRepresentative: async (bioguideId: string) => {
          return {
            success: true,
            data: {
              bioguideId: 'K000367',
              name: 'Amy Klobuchar',
              party: 'Democratic',
              state: 'MN',
              chamber: 'Senate',
              district: null,
              title: 'Senator',
              contactInfo: {
                phone: '(202) 224-3244',
                website: 'https://www.klobuchar.senate.gov',
                office: 'Hart Senate Office Building',
              },
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: 150,
              cacheHit: false,
              dataSource: 'congress.gov',
            },
          };
        },
        getAllRepresentatives: async () => {
          return {
            success: true,
            data: [],
            total: 0,
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: 150,
              cacheHit: false,
              dataSource: 'congress.gov',
            },
          };
        },
        getRepresentativesByState: async (state: string) => {
          return {
            success: true,
            data: [],
            total: 0,
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: 150,
              cacheHit: false,
              dataSource: 'congress.gov',
            },
          };
        },
        searchRepresentatives: async (query: string) => {
          return {
            success: true,
            data: [],
            total: 0,
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: 150,
              cacheHit: false,
              dataSource: 'congress.gov',
            },
          };
        },
      };

      expect(mockService.getRepresentative).toBeDefined();
      expect(mockService.getAllRepresentatives).toBeDefined();
      expect(mockService.getRepresentativesByState).toBeDefined();
      expect(mockService.searchRepresentatives).toBeDefined();
    });

    test('should define IApiService base interface for all API services', () => {
      // TEST CONTRACT: Base interface that all API services should implement
      const mockApiService: IApiService = {
        healthCheck: async () => {
          return {
            success: true,
            data: {
              status: 'healthy',
              timestamp: new Date().toISOString(),
              services: {
                database: 'up',
                cache: 'up',
                external_apis: 'up',
              },
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: 50,
              cacheHit: false,
              dataSource: 'internal',
            },
          };
        },
        getServiceInfo: () => {
          return {
            name: 'UnifiedRepresentativeService',
            version: '2.0.0',
            description: 'Consolidated representative service',
          };
        },
      };

      expect(mockApiService.healthCheck).toBeDefined();
      expect(mockApiService.getServiceInfo).toBeDefined();
    });

    test('should define ServiceConfig for consistent service configuration', () => {
      // TEST CONTRACT: Standardized configuration across all services
      const config: ServiceConfig = {
        baseUrl: 'https://api.congress.gov/v3',
        apiKey: process.env.CONGRESS_API_KEY || '',
        timeout: 10000,
        retries: 3,
        cacheEnabled: true,
        cacheTtl: 3600000, // 1 hour
        rateLimitEnabled: true,
        rateLimitRequests: 100,
        rateLimitWindow: 60000, // 1 minute
      };

      expect(config.baseUrl).toBeDefined();
      expect(config.timeout).toBeGreaterThan(0);
      expect(config.retries).toBeGreaterThanOrEqual(0);
    });
  });

  describe('1.3 Unified API Response Wrappers (consolidating 15+ scattered interfaces)', () => {
    test('should define generic ApiResponse<T> wrapper for all endpoints', () => {
      // TEST CONTRACT: Single response wrapper replacing 15+ scattered interfaces
      const response: ApiResponse<UnifiedRepresentativeResponse> = {
        success: true,
        data: {
          bioguideId: 'K000367',
          name: 'Amy Klobuchar',
          party: 'Democratic',
          state: 'MN',
          chamber: 'Senate',
          district: null,
          title: 'Senator',
          contactInfo: {
            phone: '(202) 224-3244',
            website: 'https://www.klobuchar.senate.gov',
            office: 'Hart Senate Office Building',
          },
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: 150,
          cacheHit: false,
          dataSource: 'congress.gov',
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.metadata).toBeDefined();
      expect(response.metadata.timestamp).toBeDefined();
    });

    test('should define ListApiResponse<T> for list endpoints', () => {
      // TEST CONTRACT: Standardized list response format
      const listResponse: ListApiResponse<UnifiedRepresentativeResponse> = {
        success: true,
        data: [
          {
            bioguideId: 'K000367',
            name: 'Amy Klobuchar',
            party: 'Democratic',
            state: 'MN',
            chamber: 'Senate',
            district: null,
            title: 'Senator',
            contactInfo: {
              phone: '(202) 224-3244',
              website: 'https://www.klobuchar.senate.gov',
              office: 'Hart Senate Office Building',
            },
          },
        ],
        total: 1,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: 200,
          cacheHit: false,
          dataSource: 'congress.gov',
        },
      };

      expect(listResponse.data).toBeInstanceOf(Array);
      expect(listResponse.total).toBe(1);
      expect(listResponse.metadata).toBeDefined();
    });

    test('should define PaginatedApiResponse<T> for paginated endpoints', () => {
      // TEST CONTRACT: Standardized pagination format
      const paginatedResponse: PaginatedApiResponse<UnifiedRepresentativeResponse> = {
        success: true,
        data: [],
        total: 435,
        page: 1,
        limit: 50,
        totalPages: 9,
        hasNext: true,
        hasPrevious: false,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: 300,
          cacheHit: true,
          dataSource: 'congress.gov',
        },
      };

      expect(paginatedResponse.page).toBe(1);
      expect(paginatedResponse.totalPages).toBe(9);
      expect(paginatedResponse.hasNext).toBe(true);
      expect(paginatedResponse.hasPrevious).toBe(false);
    });

    test('should define error response format consistent across all endpoints', () => {
      // TEST CONTRACT: Standardized error handling
      const errorResponse: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'REPRESENTATIVE_NOT_FOUND',
          message: 'Representative with bioguideId K999999 not found',
          field: 'bioguideId',
          timestamp: new Date().toISOString(),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: 50,
          cacheHit: false,
          dataSource: 'congress.gov',
        },
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.data).toBeNull();
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error?.code).toBeDefined();
      expect(errorResponse.error?.message).toBeDefined();
    });
  });

  describe('1.4 Type Guards and Migration Helpers', () => {
    test('should provide type guards for safe migration from old types', () => {
      const validator = new TypeValidator();

      // Should validate unified types
      const validUnifiedRep: UnifiedRepresentativeResponse = {
        bioguideId: 'K000367',
        name: 'Amy Klobuchar',
        party: 'Democratic',
        state: 'MN',
        chamber: 'Senate',
        district: null,
        title: 'Senator',
        contactInfo: {
          phone: '(202) 224-3244',
          website: 'https://www.klobuchar.senate.gov',
          office: 'Hart Senate Office Building',
        },
      };

      expect(validator.isValidUnifiedRepresentative(validUnifiedRep)).toBe(true);

      // Should reject invalid data
      const invalidRep = { name: 'Invalid' };
      expect(validator.isValidUnifiedRepresentative(invalidRep)).toBe(false);
    });

    test('should provide migration helper for converting old types to new', () => {
      const migrationHelper = new RepresentativeMigrationHelper();

      // Should convert from old representative.ts format
      const oldFormat = {
        bioguideId: 'K000367',
        name: 'Amy Klobuchar',
        party: 'D',
        state: 'MN',
        chamber: 'senate', // lowercase - needs conversion
        title: 'Senator',
      };

      const converted = migrationHelper.fromLegacyRepresentative(oldFormat);

      expect(converted.chamber).toBe('Senate'); // Should be converted to proper case
      expect(converted.party).toBe('Democratic'); // Should be converted from 'D'
    });

    test('should handle chamber field normalization', () => {
      const migrationHelper = new RepresentativeMigrationHelper();

      // Test all chamber variants found in the codebase
      expect(migrationHelper.normalizeChamber('house')).toBe('House');
      expect(migrationHelper.normalizeChamber('House')).toBe('House');
      expect(migrationHelper.normalizeChamber('senate')).toBe('Senate');
      expect(migrationHelper.normalizeChamber('Senate')).toBe('Senate');
      expect(migrationHelper.normalizeChamber('rep')).toBe('House');
      expect(migrationHelper.normalizeChamber('sen')).toBe('Senate');
    });

    test('should handle party field normalization', () => {
      const migrationHelper = new RepresentativeMigrationHelper();

      // Test party variants found in the codebase
      expect(migrationHelper.normalizeParty('D')).toBe('Democratic');
      expect(migrationHelper.normalizeParty('R')).toBe('Republican');
      expect(migrationHelper.normalizeParty('I')).toBe('Independent');
      expect(migrationHelper.normalizeParty('Democratic')).toBe('Democratic');
      expect(migrationHelper.normalizeParty('Republican')).toBe('Republican');
    });
  });

  describe('1.5 Backwards Compatibility Adapters', () => {
    test('should provide adapter for legacy RepresentativeResponse from representative.ts', () => {
      const adapter = new LegacyTypeAdapter();

      const unifiedRep: UnifiedRepresentativeResponse = {
        bioguideId: 'K000367',
        name: 'Amy Klobuchar',
        party: 'Democratic',
        state: 'MN',
        chamber: 'Senate',
        district: null,
        title: 'Senator',
        contactInfo: {
          phone: '(202) 224-3244',
          website: 'https://www.klobuchar.senate.gov',
          office: 'Hart Senate Office Building',
        },
      };

      // Should convert to old representative.ts format for backwards compatibility
      const legacyFormat = adapter.toLegacyRepresentativeResponse(unifiedRep);

      expect(legacyFormat).toHaveProperty('bioguideId');
      expect(legacyFormat).toHaveProperty('name');
      expect(legacyFormat).toHaveProperty('party');
    });

    test('should provide adapter for legacy Representative from models/Representative.ts', () => {
      const adapter = new LegacyTypeAdapter();

      const unifiedRep: UnifiedRepresentativeResponse = {
        bioguideId: 'K000367',
        name: 'Amy Klobuchar',
        party: 'Democratic',
        state: 'MN',
        chamber: 'Senate',
        district: null,
        title: 'Senator',
        contactInfo: {
          phone: '(202) 224-3244',
          website: 'https://www.klobuchar.senate.gov',
          office: 'Hart Senate Office Building',
        },
      };

      // Should convert to old models/Representative.ts format
      const modelFormat = adapter.toLegacyModelRepresentative(unifiedRep) as Record<
        string,
        unknown
      > & {
        bioguideId: string;
        contactInfo: Record<string, unknown>;
      };

      expect(modelFormat).toHaveProperty('bioguideId');
      expect(modelFormat.contactInfo).toHaveProperty('phone');
    });

    test('should provide adapter for legacy RepresentativeDetailResponse from api types', () => {
      const adapter = new LegacyTypeAdapter();

      const unifiedResponse: ApiResponse<UnifiedRepresentativeResponse> = {
        success: true,
        data: {
          bioguideId: 'K000367',
          name: 'Amy Klobuchar',
          party: 'Democratic',
          state: 'MN',
          chamber: 'Senate',
          district: null,
          title: 'Senator',
          contactInfo: {
            phone: '(202) 224-3244',
            website: 'https://www.klobuchar.senate.gov',
            office: 'Hart Senate Office Building',
          },
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: 150,
          cacheHit: false,
          dataSource: 'congress.gov',
        },
      };

      // Should convert to old api/representatives.types.ts format
      const apiFormat = adapter.toLegacyApiResponse(unifiedResponse);

      expect(apiFormat).toHaveProperty('data');
      expect(apiFormat).toHaveProperty('metadata');
    });
  });

  describe('1.6 Integration Tests for Type Consolidation', () => {
    test('should maintain API compatibility while using unified types internally', () => {
      // This test ensures that external APIs don't break during migration

      // Mock existing API endpoint that returns old format
      const existingApiResponse = {
        bioguideId: 'K000367',
        name: 'Amy Klobuchar',
        party: 'D',
        state: 'MN',
        chamber: 'senate',
        contactInfo: {
          phone: '(202) 224-3244',
          website: 'https://www.klobuchar.senate.gov',
        },
      };

      // Should be convertible to unified format
      const migrationHelper = new RepresentativeMigrationHelper();
      const unified = migrationHelper.fromLegacyRepresentative(existingApiResponse);

      expect(unified.chamber).toBe('Senate');
      expect(unified.party).toBe('Democratic');

      // Should be convertible back for API compatibility
      const adapter = new LegacyTypeAdapter();
      const backwardsCompatible = adapter.toLegacyRepresentativeResponse(unified);

      expect(backwardsCompatible).toHaveProperty('bioguideId');
    });

    test('should handle all edge cases found in existing data', () => {
      const migrationHelper = new RepresentativeMigrationHelper();

      // Test edge cases found in the codebase analysis
      const edgeCases = [
        { party: 'D', expected: 'Democratic' },
        { party: 'R', expected: 'Republican' },
        { party: 'I', expected: 'Independent' },
        { party: 'Democratic', expected: 'Democratic' },
        { chamber: 'house', expected: 'House' },
        { chamber: 'House', expected: 'House' },
        { chamber: 'senate', expected: 'Senate' },
        { chamber: 'Senate', expected: 'Senate' },
      ];

      edgeCases.forEach(({ party, expected }) => {
        if (party) {
          expect(migrationHelper.normalizeParty(party)).toBe(expected);
        }
      });
    });

    test('should preserve data integrity during type migration', () => {
      // Test that no data is lost during type conversion
      const originalData = {
        bioguideId: 'K000367',
        name: 'Amy Klobuchar',
        firstName: 'Amy',
        lastName: 'Klobuchar',
        party: 'D',
        state: 'MN',
        chamber: 'senate',
        title: 'Senator',
        committees: [
          { name: 'Agriculture Committee', role: 'Member' },
          { name: 'Judiciary Committee', role: 'Ranking Member' },
        ],
        socialMedia: {
          twitter: '@amyklobuchar',
          facebook: 'amyklobucharMN',
        },
      };

      const migrationHelper = new RepresentativeMigrationHelper();
      const unified = migrationHelper.fromLegacyRepresentative(originalData);

      // All original data should be preserved
      expect(unified.bioguideId).toBe(originalData.bioguideId);
      expect(unified.name).toBe(originalData.name);
      expect(unified.state).toBe(originalData.state);

      // Should have normalized values
      expect(unified.party).toBe('Democratic');
      expect(unified.chamber).toBe('Senate');
    });
  });
});

describe('Phase 1: Type System Error Handling', () => {
  test('should handle malformed data gracefully', () => {
    const validator = new TypeValidator();

    // Should handle null/undefined
    expect(validator.isValidUnifiedRepresentative(null)).toBe(false);
    expect(validator.isValidUnifiedRepresentative(undefined)).toBe(false);

    // Should handle malformed objects
    expect(validator.isValidUnifiedRepresentative({})).toBe(false);
    expect(validator.isValidUnifiedRepresentative({ name: 'Only Name' })).toBe(false);
  });

  test('should provide detailed validation errors', () => {
    const validator = new TypeValidator();

    const invalidData = { name: 'Amy Klobuchar' };
    const result = validator.validateUnifiedRepresentative(invalidData);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('bioguideId is required');
    expect(result.errors).toContain('party is required');
    expect(result.errors).toContain('state is required');
    expect(result.errors).toContain('chamber is required');
  });
});

/**
 * NOTE TO IMPLEMENTERS:
 *
 * These tests define the CONTRACT for our unified type system.
 * They SHOULD FAIL initially because we haven't implemented:
 *
 * 1. /src/types/core/unified-types.ts (the unified type definitions)
 * 2. The migration helpers and adapters
 * 3. The service interfaces
 *
 * Implementation order:
 * 1. Create unified-types.ts with all the type definitions
 * 2. Create migration helpers and type validators
 * 3. Create backwards compatibility adapters
 * 4. Update existing code to use unified types
 * 5. Watch these tests pass!
 *
 * This is Test-Driven Development (TDD) in action.
 */
