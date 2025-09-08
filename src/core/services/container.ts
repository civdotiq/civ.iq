/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Service Container - Dependency Injection Implementation
 *
 * Manages service registration, resolution, and lifecycle.
 * Implements singleton pattern for consistent service access.
 */

import type { IRepresentativeService } from './interfaces/IRepresentativeService';
import type { ICacheService } from './interfaces/ICacheService';
import type { IHttpClient } from './interfaces/IHttpClient';
import { HttpClient } from './implementations/HttpClient';
import { CacheService } from './implementations/CacheService';
import { MemoryCacheService } from './implementations/MemoryCacheService';
import { RepresentativeRepository } from '../repositories/RepresentativeRepository';
import { initializeCacheDecorators } from '../decorators/cache';

export type ServiceName =
  | 'representativeService'
  | 'cacheService'
  | 'votingService'
  | 'financeService'
  | 'newsService'
  | 'httpClient'
  | string; // Allow dynamic service names for testing

export type ServiceFactory<T = unknown> = () => T | Promise<T>;
export type ServiceInstance<T = unknown> = T;

interface ServiceRegistration<T = unknown> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: ServiceInstance<T>;
}

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services = new Map<ServiceName, ServiceRegistration>();
  private initializing = new Set<ServiceName>();

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Register a service with its factory function
   */
  register<T>(name: ServiceName, factory: ServiceFactory<T>, singleton = true): void {
    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered`);
    }

    this.services.set(name, {
      factory,
      singleton,
    });
  }

  /**
   * Resolve a service instance
   */
  async resolve<T>(name: ServiceName): Promise<T> {
    const registration = this.services.get(name);
    if (!registration) {
      throw new Error(`Service ${name} not registered`);
    }

    // Return existing singleton instance if available
    if (registration.singleton && registration.instance) {
      return registration.instance as T;
    }

    // Prevent circular dependency issues
    if (this.initializing.has(name)) {
      throw new Error(`Circular dependency detected for service ${name}`);
    }

    try {
      this.initializing.add(name);

      // Create new instance
      const instance = await registration.factory();

      // Store singleton instance
      if (registration.singleton) {
        registration.instance = instance;
      }

      return instance as T;
    } finally {
      this.initializing.delete(name);
    }
  }

  /**
   * Check if service is registered
   */
  isRegistered(name: ServiceName): boolean {
    return this.services.has(name);
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.initializing.clear();
  }

  /**
   * Get all registered service names
   */
  getRegisteredServices(): ServiceName[] {
    return Array.from(this.services.keys());
  }
}

// Global container instance
export const container = ServiceContainer.getInstance();

// Convenience functions for common services
export async function getRepresentativeService(): Promise<IRepresentativeService> {
  return container.resolve<IRepresentativeService>('representativeService');
}

export async function getCacheService(): Promise<ICacheService> {
  return container.resolve<ICacheService>('cacheService');
}

export async function getHttpClient(): Promise<IHttpClient> {
  return container.resolve<IHttpClient>('httpClient');
}

/**
 * Initialize service container with all dependencies
 */
export function initializeServices(config?: {
  congressApiKey?: string;
  fecApiKey?: string;
  baseUrls?: {
    congress: string;
    fec: string;
    census: string;
  };
}): void {
  // Clear existing registrations in case of re-initialization
  container.clear();

  // Core services - register both memory cache and enhanced cache service
  container.register('httpClient', () => new HttpClient());
  container.register('memoryCacheService', () => new MemoryCacheService());

  // Create cache service instance and initialize decorators
  const cacheService = new CacheService();
  container.register('cacheService', () => cacheService);
  initializeCacheDecorators(cacheService);

  // Repositories
  container.register('representativeRepository', async () => {
    const httpClient = await container.resolve<IHttpClient>('httpClient');
    const cacheService = await container.resolve<ICacheService>('cacheService');

    const defaultConfig = {
      baseUrls: {
        congress: 'https://api.congress.gov/v3',
        fec: 'https://api.open.fec.gov/v1',
        census: 'https://api.census.gov/data',
      },
    };

    return new RepresentativeRepository(httpClient, cacheService, {
      ...defaultConfig,
      ...config,
    });
  });

  // Business logic services (use-cases) - placeholder for now
  container.register('representativeService', async () => {
    const repository = await container.resolve<RepresentativeRepository>(
      'representativeRepository'
    );
    // For now, return a simple wrapper. This will be replaced with proper use-case implementation
    return {
      async getById(bioguideId: string) {
        const startTime = Date.now();
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        try {
          const data = await repository.findById(bioguideId);
          return {
            data,
            success: true,
            metadata: {
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              cacheHit: false, // Repository handles cache internally
              dataSource: 'congress-gov',
              requestId,
            },
          };
        } catch (error) {
          return {
            data: null,
            success: false,
            error: {
              code: 'SERVICE_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              cacheHit: false,
              dataSource: 'congress-gov',
              requestId,
            },
          };
        }
      },

      async getByIds(bioguideIds: string[]) {
        const startTime = Date.now();
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        try {
          const data = await repository.findByIds(bioguideIds);
          return {
            data,
            success: true,
            metadata: {
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              cacheHit: false,
              dataSource: 'congress-gov',
              requestId,
            },
          };
        } catch (error) {
          return {
            data: null,
            success: false,
            error: {
              code: 'SERVICE_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              cacheHit: false,
              dataSource: 'congress-gov',
              requestId,
            },
          };
        }
      },

      async getByZip(zipCode: string) {
        const startTime = Date.now();
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        try {
          const data = await repository.findByZipCode(zipCode);
          return {
            data,
            success: true,
            metadata: {
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              cacheHit: false,
              dataSource: 'congress-gov',
              requestId,
            },
          };
        } catch (error) {
          return {
            data: null,
            success: false,
            error: {
              code: 'SERVICE_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              cacheHit: false,
              dataSource: 'congress-gov',
              requestId,
            },
          };
        }
      },

      async search(query: string, filters) {
        const startTime = Date.now();
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        try {
          const data = await repository.search(query, filters || {});
          return {
            data,
            success: true,
            metadata: {
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              cacheHit: false,
              dataSource: 'congress-gov',
              requestId,
            },
          };
        } catch (error) {
          return {
            data: null,
            success: false,
            error: {
              code: 'SERVICE_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              cacheHit: false,
              dataSource: 'congress-gov',
              requestId,
            },
          };
        }
      },

      async getAll(filters) {
        const startTime = Date.now();
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        try {
          const data = await repository.findAll(filters || {});
          return {
            data,
            success: true,
            metadata: {
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              cacheHit: false,
              dataSource: 'congress-gov',
              requestId,
            },
          };
        } catch (error) {
          return {
            data: null,
            success: false,
            error: {
              code: 'SERVICE_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              cacheHit: false,
              dataSource: 'congress-gov',
              requestId,
            },
          };
        }
      },

      async getByState(state: string) {
        const startTime = Date.now();
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        try {
          const data = await repository.findByState(state);
          return {
            data,
            success: true,
            metadata: {
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              cacheHit: false,
              dataSource: 'congress-gov',
              requestId,
            },
          };
        } catch (error) {
          return {
            data: null,
            success: false,
            error: {
              code: 'SERVICE_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              cacheHit: false,
              dataSource: 'congress-gov',
              requestId,
            },
          };
        }
      },
    } as IRepresentativeService;
  });

  // Register batch service directly for now (migration pattern for future use)
  container.register('batchService', async () => {
    const repService = await container.resolve<IRepresentativeService>('representativeService');

    return {
      async processBatch(request: {
        bioguideId: string;
        endpoints: string[];
      }): Promise<Record<string, unknown>> {
        const results: Record<string, unknown> = {};

        // Execute requests in parallel
        const promises = request.endpoints.map(async endpoint => {
          try {
            switch (endpoint) {
              case 'representative':
                const repData = await repService.getById(request.bioguideId);
                return ['representative', repData];
              default:
                return [endpoint, null];
            }
          } catch {
            return [endpoint, null];
          }
        });

        const responses = await Promise.allSettled(promises);
        responses.forEach(response => {
          if (response.status === 'fulfilled' && response.value) {
            const [key, value] = response.value as [string, unknown];
            results[key] = value;
          }
        });

        return results;
      },
    };
  });
}
