/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Service Migration Helper
 *
 * Utilities for migrating existing services to the new architecture.
 * Provides standardized patterns for service refactoring and integration.
 */

import type { ServiceContainer } from '../container';
import type { ICacheService } from '../interfaces/ICacheService';
import type { IHttpClient } from '../interfaces/IHttpClient';

/**
 * Base migration interface for service transformation
 */
export interface ServiceMigration {
  readonly serviceName: string;
  readonly version: string;
  readonly dependencies: string[];
  migrate(): Promise<void>;
  validate(): Promise<boolean>;
  rollback(): Promise<void>;
}

/**
 * Migration context for service transformation
 */
export interface MigrationContext {
  container: ServiceContainer;
  cache: ICacheService;
  httpClient: IHttpClient;
  config: Record<string, unknown>;
}

/**
 * Service migration utilities
 */
export class ServiceMigrationHelper {
  private migrations = new Map<string, ServiceMigration>();
  private completedMigrations = new Set<string>();

  constructor(private context: MigrationContext) {}

  /**
   * Register a migration strategy
   */
  register(migration: ServiceMigration): void {
    if (this.migrations.has(migration.serviceName)) {
      throw new Error(`Migration for ${migration.serviceName} already registered`);
    }
    this.migrations.set(migration.serviceName, migration);
  }

  /**
   * Execute a specific migration
   */
  async migrate(serviceName: string): Promise<void> {
    const migration = this.migrations.get(serviceName);
    if (!migration) {
      throw new Error(`No migration found for service: ${serviceName}`);
    }

    if (this.completedMigrations.has(serviceName)) {
      return; // Already migrated
    }

    try {
      // Check dependencies
      for (const dep of migration.dependencies) {
        if (!this.completedMigrations.has(dep)) {
          await this.migrate(dep); // Recursive dependency resolution
        }
      }

      // Execute migration
      await migration.migrate();

      // Validate
      const isValid = await migration.validate();
      if (!isValid) {
        throw new Error(`Migration validation failed for ${serviceName}`);
      }

      this.completedMigrations.add(serviceName);
    } catch (error) {
      // Rollback on failure
      try {
        await migration.rollback();
      } catch (rollbackError) {
        console.error(`Rollback failed for ${serviceName}:`, rollbackError);
      }
      throw error;
    }
  }

  /**
   * Execute all registered migrations
   */
  async migrateAll(): Promise<void> {
    const migrations = Array.from(this.migrations.keys());
    for (const serviceName of migrations) {
      await this.migrate(serviceName);
    }
  }

  /**
   * Get migration status
   */
  getStatus(): {
    total: number;
    completed: number;
    remaining: string[];
  } {
    const total = this.migrations.size;
    const completed = this.completedMigrations.size;
    const remaining = Array.from(this.migrations.keys()).filter(
      name => !this.completedMigrations.has(name)
    );

    return { total, completed, remaining };
  }
}

/**
 * Abstract base class for service migrations
 */
export abstract class BaseServiceMigration implements ServiceMigration {
  abstract readonly serviceName: string;
  abstract readonly version: string;
  abstract readonly dependencies: string[];

  protected constructor(protected context: MigrationContext) {}

  abstract migrate(): Promise<void>;
  abstract validate(): Promise<boolean>;
  abstract rollback(): Promise<void>;

  /**
   * Helper to register service in container
   */
  protected registerService<T>(
    name: string,
    factory: () => T | Promise<T>,
    singleton = true
  ): void {
    this.context.container.register(name, factory, singleton);
  }

  /**
   * Helper to get cache with key prefix
   */
  protected getCacheKey(key: string): string {
    return `migration:${this.serviceName}:${key}`;
  }

  /**
   * Helper to validate service registration
   */
  protected async validateService(serviceName: string): Promise<boolean> {
    try {
      const service = await this.context.container.resolve(serviceName);
      return service !== null && service !== undefined;
    } catch {
      return false;
    }
  }
}

/**
 * Specific migration for Representative Service
 */
export class RepresentativeServiceMigration extends BaseServiceMigration {
  readonly serviceName = 'representativeService';
  readonly version = '3.0.0';
  readonly dependencies: string[] = ['httpClient', 'cacheService'];

  async migrate(): Promise<void> {
    // Register the new representative service architecture
    this.registerService('representativeService', async () => {
      const httpClient = await this.context.container.resolve<IHttpClient>('httpClient');
      const cache = await this.context.container.resolve<ICacheService>('cacheService');

      // Use existing repository-based implementation from container setup
      const { RepresentativeRepository } = await import(
        '../../repositories/RepresentativeRepository'
      );
      const repository = new RepresentativeRepository(httpClient, cache, {
        baseUrls: {
          congress: 'https://api.congress.gov/v3',
          fec: 'https://api.open.fec.gov/v1',
          census: 'https://api.census.gov/data',
        },
      });

      // Return service wrapper that matches IRepresentativeService interface
      return {
        async getById(bioguideId: string) {
          return repository.findById(bioguideId);
        },
        async getByIds(bioguideIds: string[]) {
          return repository.findByIds(bioguideIds);
        },
        async getByZip(zipCode: string) {
          return repository.findByZipCode(zipCode);
        },
        async search(query: string, filters?: Record<string, unknown>) {
          return repository.search(query, filters || {});
        },
        async getAll(filters?: Record<string, unknown>) {
          return repository.findAll(filters || {});
        },
        async getByState(state: string) {
          return repository.findByState(state);
        },
      };
    });
  }

  async validate(): Promise<boolean> {
    return await this.validateService('representativeService');
  }

  async rollback(): Promise<void> {
    // Remove from container if rollback needed
    // Note: ServiceContainer would need a remove method for full rollback support
    console.warn(`Rollback for ${this.serviceName} - manual cleanup may be required`);
  }
}

/**
 * Migration for Batch Service
 */
export class BatchServiceMigration extends BaseServiceMigration {
  readonly serviceName = 'batchService';
  readonly version = '3.0.0';
  readonly dependencies: string[] = ['representativeService', 'votingService', 'financeService'];

  async migrate(): Promise<void> {
    this.registerService('batchService', async () => {
      const repService = await this.context.container.resolve<{
        getById: (id: string) => Promise<unknown>;
      }>('representativeService');

      // Create simplified batch service
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

  async validate(): Promise<boolean> {
    const isRegistered = await this.validateService('batchService');
    if (!isRegistered) return false;

    try {
      const batchService = await this.context.container.resolve<{
        processBatch: (request: {
          bioguideId: string;
          endpoints: string[];
        }) => Promise<Record<string, unknown>>;
      }>('batchService');
      return typeof batchService.processBatch === 'function';
    } catch {
      return false;
    }
  }

  async rollback(): Promise<void> {
    console.warn(`Rollback for ${this.serviceName} - manual cleanup may be required`);
  }
}

/**
 * Migration utilities
 */
export const MigrationUtils = {
  /**
   * Create a performance-wrapped service
   */
  withPerformanceMonitoring<T extends Record<string, (...args: unknown[]) => unknown>>(
    service: T,
    serviceName: string
  ): T {
    const wrapped = {} as T;

    for (const [methodName, method] of Object.entries(service)) {
      if (typeof method === 'function') {
        wrapped[methodName as keyof T] = async function (...args: unknown[]) {
          const startTime = performance.now();
          try {
            const result = await method.apply(service, args);
            const duration = performance.now() - startTime;

            // Log performance metrics
            console.info(`[PERF] ${serviceName}.${methodName}: ${duration.toFixed(2)}ms`);

            return result;
          } catch (error) {
            const duration = performance.now() - startTime;
            console.error(
              `[ERROR] ${serviceName}.${methodName}: ${duration.toFixed(2)}ms -`,
              error
            );
            throw error;
          }
        } as T[keyof T];
      }
    }

    return wrapped;
  },

  /**
   * Create a cache-wrapped service
   */
  withCaching<T extends Record<string, (...args: unknown[]) => unknown>>(
    service: T,
    cache: ICacheService,
    cacheTTL = 300000 // 5 minutes
  ): T {
    const wrapped = {} as T;

    for (const [methodName, method] of Object.entries(service)) {
      if (typeof method === 'function') {
        wrapped[methodName as keyof T] = async function (...args: unknown[]) {
          const cacheKey = `${service.constructor.name}:${methodName}:${JSON.stringify(args)}`;

          // Try cache first
          const cached = await cache.get(cacheKey);
          if (cached !== null) {
            return cached;
          }

          // Execute method
          const result = await method.apply(service, args);

          // Cache result
          await cache.set(cacheKey, result, { ttlMs: cacheTTL });

          return result;
        } as T[keyof T];
      }
    }

    return wrapped;
  },
};
