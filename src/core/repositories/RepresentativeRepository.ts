/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Representative Repository
 *
 * Pure data access layer for representative information.
 * - No business logic
 * - Raw data access only
 * - Handles multiple data sources
 * - Implements query optimization
 */

import type { Representative, SearchFilters } from '../services/interfaces/IRepresentativeService';
import type { IHttpClient } from '../services/interfaces/IHttpClient';
import type { ICacheService } from '../services/interfaces/ICacheService';

interface CongressApiMember {
  bioguideId: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  party?: string;
  state: string;
  phone?: string;
  website?: string;
  office?: string;
  address?: string;
  email?: string;
  socialMedia?: {
    twitter?: string;
    facebook?: string;
  };
  terms?: Array<{
    type: 'rep' | 'sen';
    district?: number;
  }>;
  committees?: Array<{
    systemCode: string;
    name: string;
    rank?: number;
  }>;
}

interface CongressApiResponse {
  member?: CongressApiMember;
  members?: CongressApiMember[];
}

interface DistrictInfo {
  state: string;
  number: number;
}

interface DistrictResponse {
  districts?: DistrictInfo[];
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface DataSourceOptions {
  timeout?: number;
  retries?: number;
  source?: 'congress' | 'fec' | 'census';
}

export class RepresentativeRepository {
  constructor(
    private httpClient: IHttpClient,
    private cache: ICacheService,
    private config: {
      congressApiKey?: string;
      fecApiKey?: string;
      baseUrls: {
        congress: string;
        fec: string;
        census: string;
      };
    }
  ) {}

  /**
   * Find representative by bioguide ID
   */
  async findById(
    bioguideId: string,
    options: DataSourceOptions = {}
  ): Promise<Representative | null> {
    const cacheKey = `representative:${bioguideId}`;

    // Try cache first
    const cached = await this.cache.get<Representative>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch from Congress.gov API
      const url = `${this.config.baseUrls.congress}/member/${bioguideId}`;
      const response = await this.httpClient.get(url, {
        headers: this.config.congressApiKey ? { 'X-API-Key': this.config.congressApiKey } : {},
        timeout: options.timeout || 5000,
      });

      const apiResponse = response.data as CongressApiResponse;
      if (apiResponse?.member) {
        const representative = this.transformCongressApiResponse(apiResponse.member);

        // Cache the result
        await this.cache.set(cacheKey, representative, { ttlMs: 300000 }); // 5 minutes

        return representative;
      }

      return null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to fetch representative ${bioguideId}:`, error);
      }
      return null;
    }
  }

  /**
   * Find multiple representatives by bioguide IDs (batch operation)
   */
  async findByIds(
    bioguideIds: string[],
    options: DataSourceOptions = {}
  ): Promise<Representative[]> {
    const results: Representative[] = [];

    // For simplicity, fetch individually (could be optimized with actual batch API)
    for (const id of bioguideIds) {
      const representative = await this.findById(id, options);
      if (representative) {
        results.push(representative);
      }
    }

    return results;
  }

  /**
   * Find representatives by ZIP code
   */
  async findByZipCode(zipCode: string, options: DataSourceOptions = {}): Promise<Representative[]> {
    const cacheKey = `representatives:zip:${zipCode}`;

    // Try cache first
    const cached = await this.cache.get<Representative[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // First get district info from ZIP
      const districtUrl = `${this.config.baseUrls.census}/district-lookup/${zipCode}`;
      const districtResponse = await this.httpClient.get(districtUrl, {
        timeout: options.timeout || 5000,
      });

      const districtData = districtResponse.data as DistrictResponse;
      if (!districtData?.districts) {
        return [];
      }

      const representatives: Representative[] = [];

      // Fetch representatives for each district
      for (const district of districtData.districts) {
        const districtReps = await this.findByDistrict(district.state, district.number, options);
        representatives.push(...districtReps);
      }

      // Cache the result
      await this.cache.set(cacheKey, representatives, {
        ttlMs: 3600000, // 1 hour
        tags: ['zip-lookup'],
      });

      return representatives;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to fetch representatives for ZIP ${zipCode}:`, error);
      }
      return [];
    }
  }

  /**
   * Find representatives by state
   */
  async findByState(state: string, options: DataSourceOptions = {}): Promise<Representative[]> {
    const cacheKey = `representatives:state:${state}`;

    // Try cache first
    const cached = await this.cache.get<Representative[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryParams = new URLSearchParams({ state, limit: '250' }).toString();
      const url = `${this.config.baseUrls.congress}/member?${queryParams}`;
      const response = await this.httpClient.get(url, {
        headers: this.config.congressApiKey ? { 'X-API-Key': this.config.congressApiKey } : {},
        timeout: options.timeout || 10000,
      });

      const apiResponse = response.data as CongressApiResponse;
      const representatives =
        apiResponse?.members?.map(member => this.transformCongressApiResponse(member)) || [];

      // Cache the result
      await this.cache.set(cacheKey, representatives, {
        ttlMs: 1800000, // 30 minutes
        tags: ['state-lookup'],
      });

      return representatives;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to fetch representatives for state ${state}:`, error);
      }
      return [];
    }
  }

  /**
   * Search representatives with filters
   */
  async search(
    query: string,
    filters: SearchFilters = {},
    options: QueryOptions = {}
  ): Promise<Representative[]> {
    const { limit = 50, offset = 0 } = options;
    const cacheKey = `representatives:search:${query}:${JSON.stringify(filters)}:${limit}:${offset}`;

    // Try cache first
    const cached = await this.cache.get<Representative[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryParams: Record<string, string> = {
        query,
        limit: limit.toString(),
        offset: offset.toString(),
      };

      // Apply filters
      if (filters.state) queryParams.state = filters.state;
      if (filters.party) queryParams.party = filters.party;
      if (filters.chamber) queryParams.chamber = filters.chamber.toLowerCase();
      if (filters.committee) queryParams.committee = filters.committee;

      const urlParams = new URLSearchParams(queryParams).toString();
      const url = `${this.config.baseUrls.congress}/member/search?${urlParams}`;
      const response = await this.httpClient.get(url, {
        headers: this.config.congressApiKey ? { 'X-API-Key': this.config.congressApiKey } : {},
        timeout: 8000,
      });

      const apiResponse = response.data as CongressApiResponse;
      const representatives =
        apiResponse?.members?.map(member => this.transformCongressApiResponse(member)) || [];

      // Cache the result for shorter time due to search nature
      await this.cache.set(cacheKey, representatives, {
        ttlMs: 600000, // 10 minutes
        tags: ['search-results'],
      });

      return representatives;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to search representatives with query "${query}":`, error);
      }
      return [];
    }
  }

  /**
   * Get all representatives with optional filters
   */
  async findAll(
    filters: SearchFilters = {},
    options: QueryOptions = {}
  ): Promise<Representative[]> {
    const { limit = 100, offset = 0, sortBy = 'name' } = options;
    const cacheKey = `representatives:all:${JSON.stringify(filters)}:${limit}:${offset}:${sortBy}`;

    // Try cache first
    const cached = await this.cache.get<Representative[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const queryParams: Record<string, string> = {
        limit: limit.toString(),
        offset: offset.toString(),
        sortBy,
      };

      // Apply filters
      if (filters.state) queryParams.state = filters.state;
      if (filters.party) queryParams.party = filters.party;
      if (filters.chamber) queryParams.chamber = filters.chamber.toLowerCase();

      const urlParams = new URLSearchParams(queryParams).toString();
      const url = `${this.config.baseUrls.congress}/member?${urlParams}`;
      const response = await this.httpClient.get(url, {
        headers: this.config.congressApiKey ? { 'X-API-Key': this.config.congressApiKey } : {},
        timeout: 15000, // Longer timeout for large queries
      });

      const apiResponse = response.data as CongressApiResponse;
      const representatives =
        apiResponse?.members?.map(member => this.transformCongressApiResponse(member)) || [];

      // Cache the result
      await this.cache.set(cacheKey, representatives, {
        ttlMs: 1800000, // 30 minutes
        tags: ['all-representatives'],
      });

      return representatives;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch all representatives:', error);
      }
      return [];
    }
  }

  /**
   * Find representatives by district
   */
  private async findByDistrict(
    state: string,
    district: number | null,
    options: DataSourceOptions = {}
  ): Promise<Representative[]> {
    try {
      const queryParams: Record<string, string> = { state };
      if (district !== null) {
        queryParams.district = district.toString();
      }

      const urlParams = new URLSearchParams(queryParams).toString();
      const url = `${this.config.baseUrls.congress}/member?${urlParams}`;
      const response = await this.httpClient.get(url, {
        headers: this.config.congressApiKey ? { 'X-API-Key': this.config.congressApiKey } : {},
        timeout: options.timeout || 5000,
      });

      const apiResponse = response.data as CongressApiResponse;
      return apiResponse?.members?.map(member => this.transformCongressApiResponse(member)) || [];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to fetch representatives for ${state}-${district}:`, error);
      }
      return [];
    }
  }

  /**
   * Transform Congress API response to internal Representative format
   */
  private transformCongressApiResponse(member: CongressApiMember): Representative {
    return {
      bioguideId: member.bioguideId,
      name: member.name || `${member.firstName} ${member.lastName}`,
      firstName: member.firstName,
      lastName: member.lastName,
      party: this.normalizeParty(member.party),
      state: member.state,
      chamber: member.terms?.[0]?.type === 'rep' ? 'House' : 'Senate',
      district: member.terms?.[0]?.district || null,
      title: member.terms?.[0]?.type === 'rep' ? 'Representative' : 'Senator',
      contactInfo: {
        phone: member.phone,
        website: member.website,
        office: member.office,
        address: member.address,
        email: member.email,
        socialMedia: {
          twitter: member.socialMedia?.twitter,
          facebook: member.socialMedia?.facebook,
        },
      },
      committees:
        member.committees?.map(committee => ({
          committeeId: committee.systemCode,
          name: committee.name,
          role: committee.rank === 1 ? 'Chair' : committee.rank === 2 ? 'Ranking Member' : 'Member',
        })) || [],
      lastUpdated: new Date().toISOString(),
      dataSource: 'congress-gov',
    };
  }

  /**
   * Normalize party names to standard format
   */
  private normalizeParty(party?: string): 'Democratic' | 'Republican' | 'Independent' {
    const normalized = party?.toLowerCase() || '';
    if (normalized.includes('democrat')) return 'Democratic';
    if (normalized.includes('republican')) return 'Republican';
    return 'Independent';
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateCache(tags: string[]): Promise<void> {
    await this.cache.deleteByTags(tags);
  }

  /**
   * Get repository metrics
   */
  async getMetrics(): Promise<{
    cacheMetrics: unknown;
    queryStats: {
      totalQueries: number;
      avgResponseTime: number;
      errorRate: number;
    };
  }> {
    const cacheMetrics = await this.cache.getMetrics();

    return {
      cacheMetrics,
      queryStats: {
        totalQueries: 0, // Would be tracked in real implementation
        avgResponseTime: 0,
        errorRate: 0,
      },
    };
  }
}
