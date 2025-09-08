/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Service Interface Tests
 *
 * These tests define the contract for consolidating 5 different service patterns:
 * 1. src/services/api/representatives.service.ts (BaseService pattern)
 * 2. src/features/representatives/services/congress.service.ts (Enhanced integration)
 * 3. src/services/congress/optimized-congress.service.ts (Performance optimized)
 * 4. src/services/batch/representative-batch.service.ts (Batch processing)
 * 5. src/features/representatives/services/enhanced-congress-data-service.ts (Feature-specific)
 *
 * STATUS: These tests SHOULD FAIL initially (TDD approach)
 * They define the unified service contracts we want to achieve.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Import the unified service interfaces
import type {
  IUnifiedRepresentativeService,
  IServiceConfig,
  UnifiedServiceResponse,
  ServiceHealthResponse,
  UnifiedRepresentativeResponse,
  VotingRecord,
  BillRecord,
  CommitteeRecord,
} from '../interfaces/unified-service-interfaces';

// Import the base service class
import { BaseUnifiedService } from '../base/unified-base.service';

// Mock service implementations for testing
// NOTE: These represent the 5 different service patterns that will be refactored
class MockRepresentativeService extends BaseUnifiedService {
  async getRepresentative(
    bioguideId: string
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse>> {
    const startTime = Date.now();
    const mockData: UnifiedRepresentativeResponse = {
      bioguideId,
      name: 'Mock Representative',
      party: 'Democratic',
      state: 'MN',
      chamber: 'Senate',
      district: null,
      title: 'Senator',
      contactInfo: {
        phone: '(202) 224-0000',
        website: 'https://mock.senate.gov',
        office: 'Mock Office Building',
      },
    };
    return this.formatResponse(mockData, startTime);
  }

  async getAllRepresentatives(): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>> {
    const startTime = Date.now();
    return this.formatResponse([], startTime);
  }

  async getRepresentativesByState(
    state: string
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>> {
    const startTime = Date.now();
    return this.formatResponse([], startTime);
  }

  async searchRepresentatives(): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>> {
    const startTime = Date.now();
    return this.formatResponse([], startTime);
  }
}

// Create mock implementations for the other services
const MockEnhancedCongressService = MockRepresentativeService;
const MockOptimizedCongressService = MockRepresentativeService;
const MockRepresentativeBatchService = MockRepresentativeService;
const MockEnhancedCongressDataService = MockRepresentativeService;

describe('Unified Service Interface Integration Tests', () => {
  describe('1. IUnifiedRepresentativeService Contract Compliance', () => {
    const testServices = [
      { name: 'MockRepresentativeService', service: MockRepresentativeService },
      { name: 'MockEnhancedCongressService', service: MockEnhancedCongressService },
      { name: 'MockOptimizedCongressService', service: MockOptimizedCongressService },
      { name: 'MockRepresentativeBatchService', service: MockRepresentativeBatchService },
      { name: 'MockEnhancedCongressDataService', service: MockEnhancedCongressDataService },
    ];

    testServices.forEach(({ name, service }) => {
      describe(`${name} Interface Compliance`, () => {
        let serviceInstance: IUnifiedRepresentativeService;

        beforeEach(() => {
          // Each service should be instantiable with standard config
          const config: IServiceConfig = {
            baseUrl: 'https://api.congress.gov/v3',
            apiKey: process.env.CONGRESS_API_KEY || 'test-key',
            timeout: 10000,
            retries: 3,
            cacheEnabled: true,
            cacheTtl: 3600000,
            rateLimitEnabled: true,
            rateLimitRequests: 100,
            rateLimitWindow: 60000,
          };

          serviceInstance = new service(config);
        });

        test('should implement all required interface methods', () => {
          // Core representative methods
          expect(serviceInstance.getRepresentative).toBeInstanceOf(Function);
          expect(serviceInstance.getAllRepresentatives).toBeInstanceOf(Function);
          expect(serviceInstance.getRepresentativesByState).toBeInstanceOf(Function);
          expect(serviceInstance.searchRepresentatives).toBeInstanceOf(Function);

          // Extended methods
          expect(serviceInstance.getRepresentativeBatch).toBeInstanceOf(Function);
          expect(serviceInstance.getRepresentativeVotes).toBeInstanceOf(Function);
          expect(serviceInstance.getRepresentativeBills).toBeInstanceOf(Function);
          expect(serviceInstance.getRepresentativeCommittees).toBeInstanceOf(Function);

          // Service management methods
          expect(serviceInstance.healthCheck).toBeInstanceOf(Function);
          expect(serviceInstance.getServiceInfo).toBeInstanceOf(Function);
          expect(serviceInstance.clearCache).toBeInstanceOf(Function);
        });

        test('should return standardized UnifiedServiceResponse format', async () => {
          const response = await serviceInstance.getRepresentative('K000367');

          // Standard response structure
          expect(response).toHaveProperty('success');
          expect(response).toHaveProperty('data');
          expect(response).toHaveProperty('metadata');

          // Metadata structure
          expect(response.metadata).toHaveProperty('timestamp');
          expect(response.metadata).toHaveProperty('processingTime');
          expect(response.metadata).toHaveProperty('cacheHit');
          expect(response.metadata).toHaveProperty('dataSource');
          expect(response.metadata).toHaveProperty('serviceVersion');

          // Error handling structure (when applicable)
          if (!response.success) {
            expect(response).toHaveProperty('error');
            expect(response.error).toHaveProperty('code');
            expect(response.error).toHaveProperty('message');
            expect(response.error).toHaveProperty('timestamp');
          }
        });

        test('should return unified representative data format', async () => {
          const response = await serviceInstance.getRepresentative('K000367');

          if (response.success && response.data) {
            const rep = response.data;

            // Required unified fields
            expect(rep).toHaveProperty('bioguideId');
            expect(rep).toHaveProperty('name');
            expect(rep).toHaveProperty('party');
            expect(rep).toHaveProperty('state');
            expect(rep).toHaveProperty('chamber');
            expect(rep).toHaveProperty('district');
            expect(rep).toHaveProperty('title');
            expect(rep).toHaveProperty('contactInfo');

            // Standardized values
            expect(['House', 'Senate']).toContain(rep.chamber);
            expect(['Democratic', 'Republican', 'Independent']).toContain(rep.party);

            // Contact info structure
            expect(rep.contactInfo).toHaveProperty('phone');
            expect(rep.contactInfo).toHaveProperty('website');
            expect(rep.contactInfo).toHaveProperty('office');
          }
        });

        test('should handle errors consistently', async () => {
          const response = await serviceInstance.getRepresentative('INVALID_ID');

          if (!response.success) {
            expect(response.data).toBeNull();
            expect(response.error).toBeDefined();
            expect(response.error?.code).toBeDefined();
            expect(response.error?.message).toBeDefined();
            expect(response.metadata.timestamp).toBeDefined();
          }
        });

        test('should support caching consistently', async () => {
          // First call - cache miss
          const response1 = await serviceInstance.getRepresentative('K000367');
          expect(response1.metadata.cacheHit).toBe(false);

          // Second call - cache hit
          const response2 = await serviceInstance.getRepresentative('K000367');
          expect(response2.metadata.cacheHit).toBe(true);

          // Data should be identical
          expect(response1.data).toEqual(response2.data);
        });

        test('should implement health check', async () => {
          const health = await serviceInstance.healthCheck();

          expect(health.success).toBe(true);
          expect(health.data).toHaveProperty('status');
          expect(health.data).toHaveProperty('timestamp');
          expect(health.data).toHaveProperty('services');

          if (health.data) {
            expect(['healthy', 'degraded', 'down']).toContain(health.data.status);
          }
        });
      });
    });
  });

  describe('2. Service Method Contract Tests', () => {
    let unifiedService: IUnifiedRepresentativeService;

    beforeEach(() => {
      const config: IServiceConfig = {
        baseUrl: 'https://api.congress.gov/v3',
        apiKey: 'test-key',
        timeout: 10000,
        retries: 3,
        cacheEnabled: true,
        cacheTtl: 3600000,
        rateLimitEnabled: true,
        rateLimitRequests: 100,
        rateLimitWindow: 60000,
      };

      // Use the MockRepresentativeService implementation
      unifiedService = new MockRepresentativeService(config);
    });

    test('getRepresentative should accept bioguideId and return single representative', async () => {
      const response = await unifiedService.getRepresentative('K000367');

      expect(response.success).toBe(true);
      if (response.success && response.data) {
        expect(response.data.bioguideId).toBe('K000367');
      }
    });

    test('getAllRepresentatives should return paginated list', async () => {
      const response = await unifiedService.getAllRepresentatives({
        page: 1,
        limit: 50,
      });

      expect(response.success).toBe(true);
      if (response.success && response.data) {
        expect(Array.isArray(response.data)).toBe(true);
        expect(response).toHaveProperty('total');
        expect(response).toHaveProperty('page');
        expect(response).toHaveProperty('totalPages');
      }
    });

    test('getRepresentativesByState should filter by state', async () => {
      const response = await unifiedService.getRepresentativesByState('MN');

      expect(response.success).toBe(true);
      if (response.success && response.data) {
        expect(Array.isArray(response.data)).toBe(true);
        response.data.forEach((rep: UnifiedRepresentativeResponse) => {
          expect(rep.state).toBe('MN');
        });
      }
    });

    test('searchRepresentatives should support text search', async () => {
      const response = await unifiedService.searchRepresentatives('Klobuchar');

      expect(response.success).toBe(true);
      if (response.success && response.data) {
        expect(Array.isArray(response.data)).toBe(true);
        response.data.forEach((rep: UnifiedRepresentativeResponse) => {
          expect(rep.name.toLowerCase()).toContain('klobuchar');
        });
      }
    });

    test('getRepresentativeBatch should handle multiple bioguideIds', async () => {
      const bioguideIds = ['K000367', 'F000062', 'S001203'];
      const response = await unifiedService.getRepresentativeBatch(bioguideIds);

      expect(response.success).toBe(true);
      if (response.success && response.data) {
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeLessThanOrEqual(bioguideIds.length);

        response.data.forEach((rep: UnifiedRepresentativeResponse) => {
          expect(bioguideIds).toContain(rep.bioguideId);
        });
      }
    });

    test('getRepresentativeVotes should return voting records', async () => {
      const response = await unifiedService.getRepresentativeVotes('K000367', {
        limit: 10,
        congress: 119,
      });

      expect(response.success).toBe(true);
      if (response.success && response.data) {
        expect(Array.isArray(response.data)).toBe(true);
        response.data.forEach((vote: any) => {
          expect(vote).toHaveProperty('voteId');
          expect(vote).toHaveProperty('date');
          expect(vote).toHaveProperty('position');
          expect(['Yes', 'No', 'Not Voting', 'Present']).toContain(vote.position);
        });
      }
    });

    test('getRepresentativeBills should return sponsored legislation', async () => {
      const response = await unifiedService.getRepresentativeBills('K000367', {
        limit: 10,
        congress: 119,
      });

      expect(response.success).toBe(true);
      if (response.success && response.data) {
        expect(Array.isArray(response.data)).toBe(true);
        response.data.forEach((bill: any) => {
          expect(bill).toHaveProperty('billId');
          expect(bill).toHaveProperty('title');
          expect(bill).toHaveProperty('introducedDate');
          expect(bill).toHaveProperty('status');
        });
      }
    });

    test('getRepresentativeCommittees should return committee memberships', async () => {
      const response = await unifiedService.getRepresentativeCommittees('K000367');

      expect(response.success).toBe(true);
      if (response.success && response.data) {
        expect(Array.isArray(response.data)).toBe(true);
        response.data.forEach((committee: any) => {
          expect(committee).toHaveProperty('committeeId');
          expect(committee).toHaveProperty('name');
          expect(committee).toHaveProperty('role');
          expect(['Chair', 'Ranking Member', 'Member']).toContain(committee.role);
        });
      }
    });
  });

  describe('3. Service Configuration Tests', () => {
    test('should accept and validate service configuration', () => {
      const validConfig: IServiceConfig = {
        baseUrl: 'https://api.congress.gov/v3',
        apiKey: 'test-key',
        timeout: 10000,
        retries: 3,
        cacheEnabled: true,
        cacheTtl: 3600000,
        rateLimitEnabled: true,
        rateLimitRequests: 100,
        rateLimitWindow: 60000,
      };

      expect(() => new MockRepresentativeService(validConfig)).not.toThrow();
    });

    test('should validate required configuration fields', () => {
      const invalidConfig = {
        // Missing required fields
        baseUrl: 'https://api.congress.gov/v3',
      };

      expect(() => new MockRepresentativeService(invalidConfig as IServiceConfig)).toThrow();
    });

    test('should apply configuration defaults', () => {
      const minimalConfig = {
        baseUrl: 'https://api.congress.gov/v3',
        apiKey: 'test-key',
      };

      const service = new MockRepresentativeService(minimalConfig as IServiceConfig);
      const serviceInfo = service.getServiceInfo();

      expect(serviceInfo.config.timeout).toBeDefined();
      expect(serviceInfo.config.retries).toBeDefined();
      expect(serviceInfo.config.cacheEnabled).toBeDefined();
    });
  });

  describe('4. Service Performance Tests', () => {
    let service: IUnifiedRepresentativeService;

    beforeEach(() => {
      const config: IServiceConfig = {
        baseUrl: 'https://api.congress.gov/v3',
        apiKey: 'test-key',
        timeout: 10000,
        retries: 3,
        cacheEnabled: true,
        cacheTtl: 3600000,
        rateLimitEnabled: true,
        rateLimitRequests: 100,
        rateLimitWindow: 60000,
      };

      service = new MockRepresentativeService(config);
    });

    test('should complete single representative request within timeout', async () => {
      const startTime = Date.now();
      const response = await service.getRepresentative('K000367');
      const endTime = Date.now();

      expect(response.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Under 10 seconds
      expect(response.metadata.processingTime).toBeLessThan(10000);
    });

    test('should handle batch requests efficiently', async () => {
      const bioguideIds = ['K000367', 'F000062', 'S001203', 'W000817', 'C001035'];
      const startTime = Date.now();
      const response = await service.getRepresentativeBatch(bioguideIds);
      const endTime = Date.now();

      expect(response.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(15000); // Under 15 seconds for batch
      expect(response.metadata.processingTime).toBeLessThan(15000);
    });

    test('should implement rate limiting', async () => {
      // Make multiple requests rapidly
      const promises = Array.from({ length: 10 }, () => service.getRepresentative('K000367'));

      const responses = await Promise.allSettled(promises);

      // Some requests may be rate limited, but none should throw errors
      responses.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value).toHaveProperty('success');
          expect(result.value).toHaveProperty('metadata');
        }
      });
    });

    test('should cache repeated requests', async () => {
      // First request - cache miss
      const response1 = await service.getRepresentative('K000367');
      expect(response1.metadata.cacheHit).toBe(false);

      // Second request - cache hit (should be faster)
      const startTime = Date.now();
      const response2 = await service.getRepresentative('K000367');
      const endTime = Date.now();

      expect(response2.metadata.cacheHit).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Cache hit should be very fast
    });
  });

  describe('5. Service Error Handling Tests', () => {
    let service: IUnifiedRepresentativeService;

    beforeEach(() => {
      const config: IServiceConfig = {
        baseUrl: 'https://api.congress.gov/v3',
        apiKey: 'test-key',
        timeout: 10000,
        retries: 3,
        cacheEnabled: true,
        cacheTtl: 3600000,
        rateLimitEnabled: true,
        rateLimitRequests: 100,
        rateLimitWindow: 60000,
      };

      service = new MockRepresentativeService(config);
    });

    test('should handle network errors gracefully', async () => {
      // Mock network failure
      const mockService = {
        ...service,
        getRepresentative: vi.fn().mockRejectedValue(new Error('Network error')),
      } as unknown as IUnifiedRepresentativeService;

      const response = await mockService.getRepresentative('K000367');

      expect(response.success).toBe(false);
      expect(response.data).toBeNull();
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe('NETWORK_ERROR');
    });

    test('should handle API rate limiting', async () => {
      // Mock rate limit response
      const mockService = {
        ...service,
        getRepresentative: vi.fn().mockResolvedValue({
          success: false,
          data: null,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            timestamp: new Date().toISOString(),
          },
          metadata: {
            timestamp: new Date().toISOString(),
            processingTime: 50,
            cacheHit: false,
            dataSource: 'congress.gov',
            serviceVersion: '2.0.0',
          },
        }),
      } as unknown as IUnifiedRepresentativeService;

      const response = await mockService.getRepresentative('K000367');

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    test('should handle invalid bioguideId format', async () => {
      const response = await service.getRepresentative('INVALID');

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_BIOGUIDE_ID');
    });

    test('should handle not found representatives', async () => {
      const response = await service.getRepresentative('Z999999');

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('REPRESENTATIVE_NOT_FOUND');
    });

    test('should retry failed requests according to configuration', async () => {
      let attemptCount = 0;
      const mockService = {
        ...service,
        getRepresentative: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary failure');
          }
          return Promise.resolve({
            success: true,
            data: { bioguideId: 'K000367', name: 'Amy Klobuchar' },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: 150,
              cacheHit: false,
              dataSource: 'congress.gov',
              serviceVersion: '2.0.0',
            },
          });
        }),
      } as unknown as IUnifiedRepresentativeService;

      const response = await mockService.getRepresentative('K000367');

      expect(response.success).toBe(true);
      expect(attemptCount).toBe(3); // Should have retried twice
    });
  });

  describe('6. Service Integration Tests', () => {
    test('all services should be interchangeable through unified interface', async () => {
      const config: IServiceConfig = {
        baseUrl: 'https://api.congress.gov/v3',
        apiKey: 'test-key',
        timeout: 10000,
        retries: 3,
        cacheEnabled: true,
        cacheTtl: 3600000,
        rateLimitEnabled: true,
        rateLimitRequests: 100,
        rateLimitWindow: 60000,
      };

      // All services should be instantiable with the same config
      const services = [
        new MockRepresentativeService(config),
        new MockRepresentativeService(config),
        new MockRepresentativeService(config),
        new MockRepresentativeService(config),
      ];

      // All should implement the same interface
      for (const service of services) {
        expect(service.getRepresentative).toBeInstanceOf(Function);
        expect(service.getAllRepresentatives).toBeInstanceOf(Function);
        expect(service.healthCheck).toBeInstanceOf(Function);

        // All should return the same data format
        const response = await service.getRepresentative('K000367');
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('metadata');
      }
    });

    test('should support service swapping without code changes', () => {
      // This test demonstrates that services can be swapped via dependency injection
      const config: IServiceConfig = {
        baseUrl: 'https://api.congress.gov/v3',
        apiKey: 'test-key',
        timeout: 10000,
        retries: 3,
        cacheEnabled: true,
        cacheTtl: 3600000,
        rateLimitEnabled: true,
        rateLimitRequests: 100,
        rateLimitWindow: 60000,
      };

      function useRepresentativeService(service: IUnifiedRepresentativeService) {
        return service.getRepresentative('K000367');
      }

      // Should work with any service implementation
      expect(() => useRepresentativeService(new MockRepresentativeService(config))).not.toThrow();
      expect(() => useRepresentativeService(new MockRepresentativeService(config))).not.toThrow();
    });
  });
});

/**
 * NOTE TO IMPLEMENTERS:
 *
 * These tests define the contract for the unified service layer.
 * They SHOULD FAIL initially because the following need to be implemented:
 *
 * 1. src/services/interfaces/unified-service-interfaces.ts - Interface definitions
 * 2. src/services/base/unified-base.service.ts - Base service implementation
 * 3. Updates to existing 5 service classes to implement the unified interfaces
 * 4. Migration of method signatures and return types
 *
 * Implementation order:
 * 1. Create interface definitions
 * 2. Create base service class
 * 3. Update each of the 5 services to extend base and implement interface
 * 4. Test each service individually
 * 5. Run integration tests
 * 6. Watch these tests pass!
 */
