/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Core Representative Service Interface
 *
 * Defines the contract for all representative-related operations.
 * Implements the Interface Segregation Principle with focused responsibilities.
 */

export interface SearchFilters {
  state?: string;
  party?: 'Democratic' | 'Republican' | 'Independent';
  chamber?: 'House' | 'Senate';
  committee?: string;
}

export interface Representative {
  bioguideId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  party: 'Democratic' | 'Republican' | 'Independent';
  state: string;
  chamber: 'House' | 'Senate';
  district: number | null;
  title: string;
  contactInfo: {
    phone?: string;
    website?: string;
    office?: string;
    address?: string;
    email?: string;
    socialMedia?: {
      twitter?: string;
      facebook?: string;
    };
  };
  committees?: Array<{
    committeeId: string;
    name: string;
    role: 'Chair' | 'Ranking Member' | 'Member';
  }>;
  lastUpdated?: string;
  dataSource?: string;
}

export interface ServiceError {
  code: string;
  message: string;
  field?: string;
  timestamp: string;
  stack?: string;
}

export interface ServiceMetadata {
  timestamp: string;
  processingTimeMs: number;
  cacheHit: boolean;
  dataSource: string;
  requestId: string;
}

export interface ServiceResult<T> {
  data: T | null;
  success: boolean;
  error?: ServiceError;
  metadata: ServiceMetadata;
}

export interface IRepresentativeService {
  /**
   * Get a single representative by bioguide ID
   */
  getById(bioguideId: string): Promise<ServiceResult<Representative>>;

  /**
   * Get multiple representatives by bioguide IDs (batch operation)
   */
  getByIds(bioguideIds: string[]): Promise<ServiceResult<Representative[]>>;

  /**
   * Get representatives by ZIP code
   */
  getByZip(zipCode: string): Promise<ServiceResult<Representative[]>>;

  /**
   * Search representatives with optional filters
   */
  search(query: string, filters?: SearchFilters): Promise<ServiceResult<Representative[]>>;

  /**
   * Get all representatives with optional filters
   */
  getAll(filters?: SearchFilters): Promise<ServiceResult<Representative[]>>;

  /**
   * Get representatives by state
   */
  getByState(state: string): Promise<ServiceResult<Representative[]>>;
}
