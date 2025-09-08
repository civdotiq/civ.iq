/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Service Interface Definitions
 *
 * These interfaces define the contracts for consolidating 5 different service patterns
 * into a standardized, interchangeable service layer.
 */

// Base representative data structure
export interface UnifiedRepresentativeResponse {
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

// Voting record structure
export interface VotingRecord {
  voteId: string;
  billId?: string;
  date: string;
  position: 'Yes' | 'No' | 'Not Voting' | 'Present';
  description?: string;
  chamber: 'House' | 'Senate';
  result?: string;
}

// Bill structure
export interface BillRecord {
  billId: string;
  title: string;
  introducedDate: string;
  status: string;
  congress: number;
  type: string;
  summary?: string;
}

// Committee structure
export interface CommitteeRecord {
  committeeId: string;
  name: string;
  role: 'Chair' | 'Ranking Member' | 'Member';
  chamber: 'House' | 'Senate' | 'Joint';
}

// Generic service response wrapper
export interface UnifiedServiceResponse<T> {
  success: boolean;
  data: T | null;
  total?: number;
  page?: number;
  totalPages?: number;
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
    serviceVersion: string;
  };
}

// Service health response
export interface ServiceHealthResponse {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  services: Record<string, 'up' | 'down'>;
}

// Service configuration interface
export interface IServiceConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retries: number;
  cacheEnabled: boolean;
  cacheTtl: number;
  rateLimitEnabled: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
}

// Query options for list endpoints
export interface QueryOptions {
  page?: number;
  limit?: number;
  congress?: number;
  chamber?: 'House' | 'Senate' | 'all';
  party?: 'Democratic' | 'Republican' | 'Independent';
}

// Base service interface
export interface IApiService {
  healthCheck(): Promise<UnifiedServiceResponse<ServiceHealthResponse>>;
  getServiceInfo(): {
    name: string;
    version: string;
    description: string;
    config: Partial<IServiceConfig>;
  };
  clearCache?(): Promise<void>;
}

// Main representative service interface
export interface IUnifiedRepresentativeService extends IApiService {
  // Core methods
  getRepresentative(
    bioguideId: string
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse>>;
  getAllRepresentatives(
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>>;
  getRepresentativesByState(
    state: string,
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>>;
  searchRepresentatives(
    query: string,
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>>;

  // Extended methods
  getRepresentativeBatch(
    bioguideIds: string[]
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>>;
  getRepresentativeVotes(
    bioguideId: string,
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<VotingRecord[]>>;
  getRepresentativeBills(
    bioguideId: string,
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<BillRecord[]>>;
  getRepresentativeCommittees(
    bioguideId: string
  ): Promise<UnifiedServiceResponse<CommitteeRecord[]>>;
}
