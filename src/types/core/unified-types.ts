/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * TDD Stub Implementation: Unified Type System
 *
 * STATUS: STUB IMPLEMENTATION - TESTS SHOULD FAIL
 * These are minimal stubs to allow TypeScript compilation.
 * Real implementation will be done after tests are written.
 */

// UNIFIED CORE TYPES - Target for consolidating 3 competing RepresentativeResponse types
export interface UnifiedRepresentative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  district: string | null;
  title: string;
  contactInfo: {
    phone?: string;
    website?: string;
    office?: string;
    address?: string;
    email?: string;
  };
}

export interface UnifiedRepresentativeResponse extends UnifiedRepresentative {
  // Will be expanded during implementation - placeholder to avoid empty interface
  _placeholder?: never;
}

// UNIFIED API RESPONSES - Target for consolidating 15+ scattered response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    field?: string;
    timestamp: string;
  };
  metadata: {
    timestamp: string;
    processingTime: number;
    cacheHit: boolean;
    dataSource: string;
  };
}

export interface ListApiResponse<T> extends ApiResponse<T[]> {
  total: number;
}

export interface PaginatedApiResponse<T> extends ListApiResponse<T> {
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface BatchApiResponse<T> extends ApiResponse<Record<string, T>> {
  // Will be expanded during implementation - placeholder to avoid empty interface
  _placeholder?: never;
}

// SERVICE CONTRACTS - Target for defining interfaces for 5 different service patterns
export interface IRepresentativeService {
  getRepresentative(bioguideId: string): Promise<ApiResponse<UnifiedRepresentativeResponse>>;
  getAllRepresentatives(): Promise<ListApiResponse<UnifiedRepresentativeResponse>>;
  getRepresentativesByState(state: string): Promise<ListApiResponse<UnifiedRepresentativeResponse>>;
  searchRepresentatives(query: string): Promise<ListApiResponse<UnifiedRepresentativeResponse>>;
}

export interface IApiService {
  healthCheck(): Promise<
    ApiResponse<{
      status: string;
      timestamp: string;
      services: Record<string, string>;
    }>
  >;
  getServiceInfo(): {
    name: string;
    version: string;
    description: string;
  };
}

export interface ServiceConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retries: number;
  cacheEnabled: boolean;
  cacheTtl: number;
  rateLimitEnabled: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
}

// TYPE GUARDS & MIGRATION HELPERS - TDD stubs that should be implemented
export class TypeValidator {
  isValidUnifiedRepresentative(_data: unknown): boolean {
    // TDD STUB - should throw or return false until implemented
    throw new Error('TypeValidator not implemented - TDD stub');
  }

  validateUnifiedRepresentative(_data: unknown): {
    isValid: boolean;
    errors: string[];
  } {
    // TDD STUB - should throw until implemented
    throw new Error('TypeValidator.validateUnifiedRepresentative not implemented - TDD stub');
  }
}

export class RepresentativeMigrationHelper {
  fromLegacyRepresentative(_data: unknown): UnifiedRepresentativeResponse {
    // TDD STUB - should throw until implemented
    throw new Error(
      'RepresentativeMigrationHelper.fromLegacyRepresentative not implemented - TDD stub'
    );
  }

  normalizeChamber(_chamber: string): 'House' | 'Senate' {
    // TDD STUB - should throw until implemented
    throw new Error('RepresentativeMigrationHelper.normalizeChamber not implemented - TDD stub');
  }

  normalizeParty(_party: string): string {
    // TDD STUB - should throw until implemented
    throw new Error('RepresentativeMigrationHelper.normalizeParty not implemented - TDD stub');
  }
}

// BACKWARDS COMPATIBILITY - TDD stubs for legacy type adapters
export class LegacyTypeAdapter {
  toLegacyRepresentativeResponse(_data: UnifiedRepresentativeResponse): unknown {
    // TDD STUB - should throw until implemented
    throw new Error('LegacyTypeAdapter.toLegacyRepresentativeResponse not implemented - TDD stub');
  }

  toLegacyModelRepresentative(_data: UnifiedRepresentativeResponse): unknown {
    // TDD STUB - should throw until implemented
    throw new Error('LegacyTypeAdapter.toLegacyModelRepresentative not implemented - TDD stub');
  }

  toLegacyApiResponse(_data: ApiResponse<UnifiedRepresentativeResponse>): unknown {
    // TDD STUB - should throw until implemented
    throw new Error('LegacyTypeAdapter.toLegacyApiResponse not implemented - TDD stub');
  }
}
