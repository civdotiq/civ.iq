/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Service Architecture Tests
 *
 * Test-driven development for service layer redesign:
 * - Dependency injection container
 * - Service interface compliance
 * - Service isolation and error handling
 * - Cross-cutting concerns
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ServiceContainer } from '../../services/container';
import type {
  IRepresentativeService,
  ICacheService,
  Representative,
  ServiceResult,
} from '../../services/interfaces';

// Test interfaces
interface TestService {
  testMethod: jest.Mock;
}

interface CounterService {
  data: { count: number };
  increment(): void;
}

interface FaultyService {
  getById: jest.Mock;
}

interface HealthyService {
  get: jest.Mock;
}

describe('Service Architecture', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = ServiceContainer.getInstance();
    container.clear();
  });

  afterEach(() => {
    container.clear();
  });

  describe('Dependency Injection Container', () => {
    it('should register and resolve services', async () => {
      // Mock service for testing
      const mockService: IRepresentativeService = {
        getById: jest.fn(),
        getByIds: jest.fn(),
        getByZip: jest.fn(),
        search: jest.fn(),
        getAll: jest.fn(),
        getByState: jest.fn(),
      };

      container.register('representativeService', () => mockService);

      const resolved = await container.resolve<IRepresentativeService>('representativeService');

      expect(resolved).toBe(mockService);
      expect(typeof resolved.getById).toBe('function');
      expect(typeof resolved.search).toBe('function');
    });

    it('should maintain singleton instances', async () => {
      const mockService: TestService = { testMethod: jest.fn() };
      container.register('testService', () => mockService, true);

      const instance1 = await container.resolve<TestService>('testService');
      const instance2 = await container.resolve<TestService>('testService');

      expect(instance1).toBe(instance2);
    });

    it('should create new instances for non-singletons', async () => {
      let callCount = 0;
      container.register(
        'testService',
        () => ({ id: ++callCount }),
        false // Not singleton
      );

      const instance1 = await container.resolve<{ id: number }>('testService');
      const instance2 = await container.resolve<{ id: number }>('testService');

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).toBe(1);
      expect(instance2.id).toBe(2);
    });

    it('should detect circular dependencies', async () => {
      container.register('serviceA', async () => {
        await container.resolve('serviceB');
        return { name: 'A' };
      });

      container.register('serviceB', async () => {
        await container.resolve('serviceA');
        return { name: 'B' };
      });

      await expect(container.resolve('serviceA')).rejects.toThrow(/circular dependency/i);
    });

    it('should throw error for unregistered services', async () => {
      await expect(container.resolve('nonExistentService')).rejects.toThrow(/not registered/i);
    });

    it('should provide service registration status', () => {
      const mockService: TestService = { testMethod: jest.fn() };
      container.register('testService', () => mockService);

      expect(container.isRegistered('testService')).toBe(true);
      expect(container.isRegistered('nonExistent')).toBe(false);
    });

    it('should list all registered services', () => {
      container.register('serviceA', () => ({ name: 'A' }));
      container.register('serviceB', () => ({ name: 'B' }));

      const services = container.getRegisteredServices();
      expect(services).toContain('serviceA');
      expect(services).toContain('serviceB');
      expect(services).toHaveLength(2);
    });
  });

  describe('Service Interface Compliance', () => {
    it('should enforce IRepresentativeService interface', async () => {
      const mockResult: ServiceResult<Representative> = {
        data: null,
        success: false,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTimeMs: 0,
          cacheHit: false,
          dataSource: 'test',
          requestId: 'test-123',
        },
      };

      const compliantService: IRepresentativeService = {
        getById: jest.fn().mockResolvedValue(mockResult),
        getByIds: jest.fn(),
        getByZip: jest.fn(),
        search: jest.fn(),
        getAll: jest.fn(),
        getByState: jest.fn(),
      };

      container.register('representativeService', () => compliantService);
      const service = await container.resolve<IRepresentativeService>('representativeService');

      // Test that all interface methods are present
      expect(typeof service.getById).toBe('function');
      expect(typeof service.getByIds).toBe('function');
      expect(typeof service.getByZip).toBe('function');
      expect(typeof service.search).toBe('function');
      expect(typeof service.getAll).toBe('function');
      expect(typeof service.getByState).toBe('function');

      // Test response format compliance
      const result = await service.getById('test-id');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('timestamp');
      expect(result.metadata).toHaveProperty('processingTimeMs');
      expect(result.metadata).toHaveProperty('cacheHit');
      expect(result.metadata).toHaveProperty('dataSource');
      expect(result.metadata).toHaveProperty('requestId');
    });

    it('should enforce ICacheService interface', async () => {
      const compliantCacheService: ICacheService = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        deleteByPattern: jest.fn(),
        deleteByTags: jest.fn(),
        clear: jest.fn(),
        exists: jest.fn(),
        getMetrics: jest.fn().mockResolvedValue({
          hits: 0,
          misses: 0,
          sets: 0,
          deletes: 0,
          hitRate: 0,
        }),
        getOrSet: jest.fn(),
      };

      container.register('cacheService', () => compliantCacheService);
      const service = await container.resolve<ICacheService>('cacheService');

      expect(typeof service.get).toBe('function');
      expect(typeof service.set).toBe('function');
      expect(typeof service.delete).toBe('function');
      expect(typeof service.deleteByPattern).toBe('function');
      expect(typeof service.deleteByTags).toBe('function');
      expect(typeof service.clear).toBe('function');
      expect(typeof service.exists).toBe('function');
      expect(typeof service.getMetrics).toBe('function');
      expect(typeof service.getOrSet).toBe('function');

      const metrics = await service.getMetrics();
      expect(metrics).toHaveProperty('hits');
      expect(metrics).toHaveProperty('misses');
      expect(metrics).toHaveProperty('sets');
      expect(metrics).toHaveProperty('deletes');
      expect(metrics).toHaveProperty('hitRate');
    });
  });

  describe('Service Isolation', () => {
    it('should isolate service failures', async () => {
      const faultyService: FaultyService = {
        getById: jest.fn().mockRejectedValue(new Error('Service failure')),
      };

      const healthyService: HealthyService = {
        get: jest.fn().mockResolvedValue('cached-value'),
      };

      container.register('faultyService', () => faultyService);
      container.register('healthyService', () => healthyService);

      // Faulty service should fail
      const faulty = await container.resolve<FaultyService>('faultyService');
      await expect(faulty.getById('test')).rejects.toThrow('Service failure');

      // Healthy service should still work
      const healthy = await container.resolve<HealthyService>('healthyService');
      const result = await healthy.get('test-key');
      expect(result).toBe('cached-value');
    });

    it('should prevent service cross-contamination', async () => {
      const serviceA: CounterService = {
        data: { count: 0 },
        increment: function () {
          this.data.count++;
        },
      };

      const serviceB: CounterService = {
        data: { count: 100 },
        increment: function () {
          this.data.count++;
        },
      };

      container.register('serviceA', () => serviceA);
      container.register('serviceB', () => serviceB);

      const instanceA = await container.resolve<CounterService>('serviceA');
      const instanceB = await container.resolve<CounterService>('serviceB');

      instanceA.increment();
      instanceA.increment();

      expect(instanceA.data.count).toBe(2);
      expect(instanceB.data.count).toBe(100); // Should be unaffected
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors gracefully', async () => {
      container.register('errorService', () => {
        throw new Error('Initialization failed');
      });

      await expect(container.resolve('errorService')).rejects.toThrow('Initialization failed');
    });

    it('should handle async initialization errors', async () => {
      container.register('asyncErrorService', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async initialization failed');
      });

      await expect(container.resolve('asyncErrorService')).rejects.toThrow(
        'Async initialization failed'
      );
    });

    it('should provide meaningful error messages', async () => {
      const serviceName = 'nonExistentService';
      await expect(container.resolve(serviceName)).rejects.toThrow(
        `Service ${serviceName} not registered`
      );
    });
  });

  describe('Service Lifecycle Management', () => {
    it('should support service cleanup', () => {
      const mockService = {
        cleanup: jest.fn(),
        data: 'test-data',
      };

      container.register('cleanupService', () => mockService);

      expect(container.isRegistered('cleanupService')).toBe(true);

      container.clear();

      expect(container.getRegisteredServices()).toHaveLength(0);
      expect(container.isRegistered('cleanupService')).toBe(false);
    });

    it('should handle multiple service registrations', () => {
      const services = ['serviceA', 'serviceB', 'serviceC'];

      services.forEach(name => {
        container.register(name, () => ({ name }));
      });

      expect(container.getRegisteredServices()).toHaveLength(3);
      services.forEach(name => {
        expect(container.isRegistered(name)).toBe(true);
      });
    });
  });

  describe('Performance Characteristics', () => {
    it('should resolve services quickly', async () => {
      const mockService = { fast: true };
      container.register('fastService', () => mockService);

      const start = Date.now();
      const service = await container.resolve<{ fast: boolean }>('fastService');
      const duration = Date.now() - start;

      expect(service).toBe(mockService);
      expect(duration).toBeLessThan(10); // Should be very fast
    });

    it('should handle concurrent service resolution', async () => {
      let initCount = 0;
      const mockService = {
        id: ++initCount,
        timestamp: Date.now(),
      };

      container.register('concurrentService', () => mockService);

      // Resolve same service concurrently
      const promises = Array.from({ length: 10 }, () =>
        container.resolve<{ id: number; timestamp: number }>('concurrentService')
      );

      const results = await Promise.all(promises);

      // All should be the same instance (singleton)
      results.forEach(result => {
        expect(result).toBe(mockService);
        expect(result.id).toBe(1); // Should only initialize once
      });
    });
  });
});
