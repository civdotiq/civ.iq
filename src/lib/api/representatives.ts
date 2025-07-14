/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

import { cache } from '@/lib/cache';
import { RepresentativeProfile, BatchApiResponse } from '@/types/representative';

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const DEFAULT_TIMEOUT = 30000; // 30 seconds for batch requests

// Error types for better error handling
export class RepresentativeApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'RepresentativeApiError';
  }
}

// Next.js 15 optimized fetch wrapper with built-in caching and deduplication
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { 
    cacheTime?: number;
    tags?: string[];
    revalidate?: number | false;
  } = {}
): Promise<T> {
  const { cacheTime = 300, tags = [], revalidate, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`[CIV.IQ-DEBUG] API Request: ${fetchOptions.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
      // Next.js 15 caching with automatic deduplication
      next: {
        revalidate: revalidate !== undefined ? revalidate : cacheTime,
        tags: [...tags, `api-${endpoint.split('/').join('-')}`]
      }
    });

    console.log(`[CIV.IQ-DEBUG] API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CIV.IQ-DEBUG] API Error Response:`, errorText);
      
      throw new RepresentativeApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        endpoint,
        new Error(errorText)
      );
    }

    const data = await response.json();
    console.log(`[CIV.IQ-DEBUG] API Success Response:`, data);
    return data;
  } catch (error) {
    console.error(`[CIV.IQ-DEBUG] API Request Error:`, error);
    
    if (error instanceof RepresentativeApiError) {
      throw error;
    }
    
    // Handle timeout and network errors
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new RepresentativeApiError(
        'Request timeout - please try again',
        408,
        endpoint,
        error
      );
    }
    
    throw new RepresentativeApiError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      endpoint,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

// Representative API client
export const representativeApi = {
  /**
   * Get representative profile using batch API for optimal performance
   */
  async getProfileBatch(
    bioguideId: string,
    options: {
      includeVotes?: boolean;
      includeBills?: boolean;
      includeFinance?: boolean;
      includeNews?: boolean;
      includePartyAlignment?: boolean;
      includeCommittees?: boolean;
      includeLeadership?: boolean;
      includeDistrict?: boolean;
    } = {}
  ): Promise<BatchApiResponse> {
    // Build endpoint list based on options
    const endpoints: string[] = ['profile']; // Always include basic profile
    
    if (options.includeVotes) endpoints.push('votes');
    if (options.includeBills) endpoints.push('bills');
    if (options.includeFinance) endpoints.push('finance');
    if (options.includeNews) endpoints.push('news');
    if (options.includePartyAlignment) endpoints.push('party-alignment');
    if (options.includeCommittees) endpoints.push('committees');
    if (options.includeLeadership) endpoints.push('leadership');
    if (options.includeDistrict) endpoints.push('district');

    console.log(`[CIV.IQ-DEBUG] Batch request for ${bioguideId} with endpoints:`, endpoints);

    const response = await apiRequest<BatchApiResponse>(
      `/api/representative/${bioguideId}/batch`,
      {
        method: 'POST',
        body: JSON.stringify({ endpoints }),
      }
    );

    console.log(`[CIV.IQ-DEBUG] Batch response processed successfully:`, {
      bioguideId,
      endpointsRequested: endpoints.length,
      successfulEndpoints: Object.keys(response.data || {}).length,
      hasErrors: response.errors && Object.keys(response.errors).length > 0,
      executionTime: response.executionTime,
    });

    return response;
  },

  /**
   * Get individual representative profile (fallback method)
   */
  async getProfile(bioguideId: string): Promise<RepresentativeProfile> {
    return apiRequest<RepresentativeProfile>(`/api/representative/${bioguideId}`, {
      cacheTime: 600, // 10 minutes - profile data changes infrequently
      tags: [`representative-${bioguideId}`, 'representative-profile']
    });
  },

  /**
   * Get representative votes - client-side with shorter cache for real-time updates
   */
  async getVotes(bioguideId: string): Promise<any> {
    return apiRequest(`/api/representative/${bioguideId}/votes`, {
      cacheTime: 300, // 5 minutes - voting data updates frequently
      tags: [`representative-${bioguideId}`, 'representative-votes']
    });
  },

  /**
   * Get representative bills
   */
  async getBills(bioguideId: string): Promise<any> {
    return apiRequest(`/api/representative/${bioguideId}/bills`, {
      cacheTime: 600, // 10 minutes - bill data changes moderately
      tags: [`representative-${bioguideId}`, 'representative-bills']
    });
  },

  /**
   * Get representative finance data
   */
  async getFinance(bioguideId: string): Promise<any> {
    return apiRequest(`/api/representative/${bioguideId}/finance`, {
      cacheTime: 1800, // 30 minutes - finance data changes less frequently
      tags: [`representative-${bioguideId}`, 'representative-finance']
    });
  },

  /**
   * Get representative news - short cache for real-time updates
   */
  async getNews(bioguideId: string): Promise<any> {
    return apiRequest(`/api/representative/${bioguideId}/news`, {
      cacheTime: 180, // 3 minutes - news updates frequently
      tags: [`representative-${bioguideId}`, 'representative-news']
    });
  },

  /**
   * Get party alignment analysis
   */
  async getPartyAlignment(bioguideId: string): Promise<any> {
    return apiRequest(`/api/representative/${bioguideId}/party-alignment`, {
      cacheTime: 1800, // 30 minutes - alignment data changes slowly
      tags: [`representative-${bioguideId}`, 'representative-party-alignment']
    });
  },

  /**
   * Get committee assignments
   */
  async getCommittees(bioguideId: string): Promise<any> {
    return apiRequest(`/api/representative/${bioguideId}/committees`, {
      cacheTime: 3600, // 1 hour - committee assignments change infrequently
      tags: [`representative-${bioguideId}`, 'representative-committees']
    });
  },

  /**
   * Get leadership positions
   */
  async getLeadership(bioguideId: string): Promise<any> {
    return apiRequest(`/api/representative/${bioguideId}/leadership`, {
      cacheTime: 3600, // 1 hour - leadership positions change infrequently
      tags: [`representative-${bioguideId}`, 'representative-leadership']
    });
  },

  /**
   * Get district information
   */
  async getDistrict(bioguideId: string): Promise<any> {
    return apiRequest(`/api/representative/${bioguideId}/district`, {
      cacheTime: 3600, // 1 hour - district info changes rarely
      tags: [`representative-${bioguideId}`, 'representative-district']
    });
  },

  /**
   * Search representatives - with deduplication for common searches
   */
  async search(params: {
    zip?: string;
    state?: string;
    district?: string;
    party?: string;
    chamber?: string;
    query?: string;
  }): Promise<RepresentativeProfile[]> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value);
    });

    const queryString = searchParams.toString();
    return apiRequest<RepresentativeProfile[]>(`/api/representatives${queryString ? `?${queryString}` : ''}`, {
      cacheTime: 300, // 5 minutes for search results
      tags: ['representatives-search', `search-${queryString}`]
    });
  },

  /**
   * Get representatives by ZIP code - highly cached due to frequent access
   */
  async getByZip(zipCode: string): Promise<RepresentativeProfile[]> {
    return apiRequest<RepresentativeProfile[]>(`/api/representatives?zip=${zipCode}`, {
      cacheTime: 600, // 10 minutes - ZIP lookups are expensive
      tags: ['representatives-zip', `zip-${zipCode}`]
    });
  },
};

// RepresentativeApiError is already exported above with the class declaration
export type { BatchApiResponse };