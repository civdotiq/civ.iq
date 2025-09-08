/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Representatives Service - Refactored API Service
 *
 * This service consolidates the original RepresentativesService to use:
 * - BaseUnifiedService as the foundation
 * - IUnifiedRepresentativeService interface compliance
 * - UnifiedRepresentativeResponse types
 * - Consistent error handling and response formatting
 */

import { BaseUnifiedService } from '../base/unified-base.service';
import type {
  IUnifiedRepresentativeService,
  UnifiedRepresentativeResponse,
  UnifiedServiceResponse,
  VotingRecord,
  BillRecord,
  CommitteeRecord,
  QueryOptions,
} from '../interfaces/unified-service-interfaces';
import { apiConfig, getApiUrl } from '@/config';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Legacy interface mapping for backward compatibility
export interface RepresentativeFilters {
  state?: string;
  party?: string;
  chamber?: 'house' | 'senate' | 'all';
  committee?: string;
  searchQuery?: string;
}

/**
 * Unified Representatives Service Implementation
 *
 * Refactored from the original RepresentativesService to implement
 * the unified service pattern while maintaining existing functionality.
 */
export class UnifiedRepresentativesService
  extends BaseUnifiedService
  implements IUnifiedRepresentativeService
{
  private static instance: UnifiedRepresentativesService;

  private constructor() {
    super({
      baseUrl: getApiUrl(''),
      timeout: 10000,
      retries: 3,
      cacheEnabled: true,
      cacheTtl: 300000, // 5 minutes
    });
  }

  public static getInstance(): UnifiedRepresentativesService {
    if (!UnifiedRepresentativesService.instance) {
      UnifiedRepresentativesService.instance = new UnifiedRepresentativesService();
    }
    return UnifiedRepresentativesService.instance;
  }

  getServiceInfo() {
    return {
      name: 'UnifiedRepresentativesService',
      version: '2.0.0',
      description: 'Unified API service for representatives data',
      config: {
        baseUrl: this.config.baseUrl,
        timeout: this.config.timeout,
        retries: this.config.retries,
        cacheEnabled: this.config.cacheEnabled,
        rateLimitEnabled: this.config.rateLimitEnabled,
      },
    };
  }

  // Core unified interface implementations
  async getRepresentative(
    bioguideId: string
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse>> {
    const startTime = Date.now();

    try {
      if (!this.validateBioguideId(bioguideId)) {
        throw new Error(`Invalid bioguide ID format: ${bioguideId}`);
      }

      // Make API call to existing endpoint
      const response = await fetch(
        `${this.config.baseUrl}${apiConfig.endpoints.representative}/${bioguideId}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(this.config.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();

      // Transform to unified format
      const unifiedData: UnifiedRepresentativeResponse = {
        bioguideId: rawData.bioguideId || rawData.id,
        name: rawData.name || `${rawData.firstName || ''} ${rawData.lastName || ''}`.trim(),
        firstName: rawData.firstName,
        lastName: rawData.lastName,
        party: this.normalizeParty(rawData.party || ''),
        state: rawData.state || '',
        chamber: this.normalizeChamber(rawData.chamber || ''),
        district: rawData.district,
        title:
          rawData.title ||
          this.generateTitle(rawData.chamber || '', rawData.state || '', rawData.district),
        contactInfo: {
          phone: rawData.phone || rawData.contactInfo?.phone,
          website: rawData.website || rawData.contactInfo?.website,
          office: rawData.office || rawData.contactInfo?.office,
          address: rawData.address || rawData.contactInfo?.address,
          email: rawData.email || rawData.contactInfo?.email,
          socialMedia: {
            twitter: rawData.twitter || rawData.contactInfo?.socialMedia?.twitter,
            facebook: rawData.facebook || rawData.contactInfo?.socialMedia?.facebook,
          },
        },
        committees: rawData.committees?.map((committee: any) => ({
          committeeId: committee.committeeId || committee.id,
          name: committee.name,
          role: committee.role || 'Member',
        })),
        lastUpdated: new Date().toISOString(),
        dataSource: 'api.representatives.service',
      };

      return this.formatResponse(unifiedData, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async getAllRepresentatives(
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>> {
    const startTime = Date.now();

    try {
      const params = new URLSearchParams();
      if (options?.congress) params.set('congress', options.congress.toString());
      if (options?.chamber && options.chamber !== 'all') params.set('chamber', options.chamber);
      if (options?.party) params.set('party', options.party);
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.page) params.set('page', options.page.toString());

      const url = `${this.config.baseUrl}${apiConfig.endpoints.representatives}?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      const representatives = Array.isArray(rawData) ? rawData : rawData.data || [];

      // Transform each representative to unified format
      const unifiedData: UnifiedRepresentativeResponse[] = representatives.map((rep: any) => ({
        bioguideId: rep.bioguideId || rep.id,
        name: rep.name || `${rep.firstName || ''} ${rep.lastName || ''}`.trim(),
        firstName: rep.firstName,
        lastName: rep.lastName,
        party: this.normalizeParty(rep.party || ''),
        state: rep.state || '',
        chamber: this.normalizeChamber(rep.chamber || ''),
        district: rep.district,
        title: rep.title || this.generateTitle(rep.chamber || '', rep.state || '', rep.district),
        contactInfo: {
          phone: rep.phone || rep.contactInfo?.phone,
          website: rep.website || rep.contactInfo?.website,
          office: rep.office || rep.contactInfo?.office,
        },
        lastUpdated: new Date().toISOString(),
        dataSource: 'api.representatives.service',
      }));

      return this.formatResponse(unifiedData, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async getRepresentativesByState(
    state: string,
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>> {
    const startTime = Date.now();

    try {
      if (!this.validateState(state)) {
        throw new Error(`Invalid state code: ${state}`);
      }

      const params = new URLSearchParams({ state });
      if (options?.chamber && options.chamber !== 'all') params.set('chamber', options.chamber);
      if (options?.party) params.set('party', options.party);
      if (options?.limit) params.set('limit', options.limit.toString());

      const url = `${this.config.baseUrl}${apiConfig.endpoints.representatives}?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      const representatives = Array.isArray(rawData) ? rawData : rawData.data || [];

      const unifiedData: UnifiedRepresentativeResponse[] = representatives.map((rep: any) => ({
        bioguideId: rep.bioguideId || rep.id,
        name: rep.name || `${rep.firstName || ''} ${rep.lastName || ''}`.trim(),
        party: this.normalizeParty(rep.party || ''),
        state: rep.state || '',
        chamber: this.normalizeChamber(rep.chamber || ''),
        district: rep.district,
        title: rep.title || this.generateTitle(rep.chamber || '', rep.state || '', rep.district),
        contactInfo: {
          phone: rep.phone || rep.contactInfo?.phone,
          website: rep.website || rep.contactInfo?.website,
          office: rep.office || rep.contactInfo?.office,
        },
        lastUpdated: new Date().toISOString(),
        dataSource: 'api.representatives.service',
      }));

      return this.formatResponse(unifiedData, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async searchRepresentatives(
    query: string,
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>> {
    const startTime = Date.now();

    try {
      const params = new URLSearchParams({ q: query });
      if (options?.chamber && options.chamber !== 'all') params.set('chamber', options.chamber);
      if (options?.party) params.set('party', options.party);
      if (options?.limit) params.set('limit', options.limit.toString());

      const url = `${this.config.baseUrl}${apiConfig.endpoints.representatives}/search?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      const representatives = Array.isArray(rawData) ? rawData : rawData.data || [];

      const unifiedData: UnifiedRepresentativeResponse[] = representatives.map((rep: any) => ({
        bioguideId: rep.bioguideId || rep.id,
        name: rep.name || `${rep.firstName || ''} ${rep.lastName || ''}`.trim(),
        party: this.normalizeParty(rep.party || ''),
        state: rep.state || '',
        chamber: this.normalizeChamber(rep.chamber || ''),
        district: rep.district,
        title: rep.title || this.generateTitle(rep.chamber || '', rep.state || '', rep.district),
        contactInfo: {
          phone: rep.phone || rep.contactInfo?.phone,
          website: rep.website || rep.contactInfo?.website,
        },
        lastUpdated: new Date().toISOString(),
        dataSource: 'api.representatives.service',
      }));

      return this.formatResponse(unifiedData, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  // Enhanced methods with unified response formats
  async getRepresentativeVotes(
    bioguideId: string,
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<VotingRecord[]>> {
    const startTime = Date.now();

    try {
      if (!this.validateBioguideId(bioguideId)) {
        throw new Error(`Invalid bioguide ID: ${bioguideId}`);
      }

      const params = new URLSearchParams();
      if (options?.congress) params.set('congress', options.congress.toString());
      if (options?.limit) params.set('limit', options.limit.toString());

      const url = `${this.config.baseUrl}${apiConfig.endpoints.representative}/${bioguideId}/votes?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      const votes = Array.isArray(rawData) ? rawData : rawData.data || [];

      const votingRecords: VotingRecord[] = votes.map((vote: any) => ({
        voteId: vote.voteId || vote.id,
        billId: vote.billId,
        date: vote.date,
        position: this.normalizePosition(vote.position || ''),
        description: vote.question || vote.description,
        chamber: this.normalizeChamber(vote.chamber || ''),
        result: vote.result,
      }));

      return this.formatResponse(votingRecords, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async getRepresentativeBills(
    bioguideId: string,
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<BillRecord[]>> {
    const startTime = Date.now();

    try {
      if (!this.validateBioguideId(bioguideId)) {
        throw new Error(`Invalid bioguide ID: ${bioguideId}`);
      }

      const params = new URLSearchParams();
      if (options?.congress) params.set('congress', options.congress.toString());
      if (options?.limit) params.set('limit', options.limit.toString());

      const url = `${this.config.baseUrl}${apiConfig.endpoints.representative}/${bioguideId}/bills?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      const bills = Array.isArray(rawData) ? rawData : rawData.data || [];

      const billRecords: BillRecord[] = bills.map((bill: any) => ({
        billId: bill.id || bill.billId,
        title: bill.title,
        introducedDate: bill.introducedDate || bill.date,
        status: bill.status,
        congress: bill.congress || options?.congress || 119,
        type: bill.type,
        summary: bill.summary,
      }));

      return this.formatResponse(billRecords, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async getRepresentativeCommittees(
    bioguideId: string
  ): Promise<UnifiedServiceResponse<CommitteeRecord[]>> {
    const startTime = Date.now();

    try {
      if (!this.validateBioguideId(bioguideId)) {
        throw new Error(`Invalid bioguide ID: ${bioguideId}`);
      }

      const url = `${this.config.baseUrl}${apiConfig.endpoints.representative}/${bioguideId}/committees`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      const committees = Array.isArray(rawData) ? rawData : rawData.data || [];

      const committeeRecords: CommitteeRecord[] = committees.map((committee: any) => ({
        committeeId: committee.committeeId || committee.id,
        name: committee.name,
        role: committee.role || 'Member',
        chamber: this.normalizeChamber(committee.chamber || '') as 'House' | 'Senate' | 'Joint',
      }));

      return this.formatResponse(committeeRecords, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  // Legacy compatibility methods
  async getByZipCode(_zipCode: string): Promise<UnifiedRepresentativeResponse[]> {
    const response = await this.getAllRepresentatives();
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch representatives');
    }

    // Note: ZIP code filtering would need to be implemented based on your API structure
    // This is a simplified example
    return response.data;
  }

  // Helper methods for data normalization
  private normalizeParty(party: string): 'Democratic' | 'Republican' | 'Independent' {
    const normalized = party?.toLowerCase();
    if (normalized?.includes('democrat') || normalized === 'd') return 'Democratic';
    if (normalized?.includes('republican') || normalized === 'r') return 'Republican';
    return 'Independent';
  }

  private normalizeChamber(chamber: string): 'House' | 'Senate' {
    const normalized = chamber?.toLowerCase();
    if (normalized?.includes('house') || normalized === 'h') return 'House';
    return 'Senate';
  }

  private normalizePosition(position: string): 'Yes' | 'No' | 'Not Voting' | 'Present' {
    const normalized = position?.toLowerCase();
    if (normalized?.includes('yea') || normalized?.includes('yes') || normalized === 'aye')
      return 'Yes';
    if (normalized?.includes('nay') || normalized?.includes('no')) return 'No';
    if (normalized?.includes('present')) return 'Present';
    return 'Not Voting';
  }

  private generateTitle(chamber: string, state: string, district: number | null): string {
    const normalizedChamber = this.normalizeChamber(chamber);
    if (normalizedChamber === 'Senate') {
      return `Senator from ${state}`;
    } else {
      return `Representative from ${state}${district ? ` District ${district}` : ''}`;
    }
  }
}

// Export singleton instance for backward compatibility
export const unifiedRepresentativesService = UnifiedRepresentativesService.getInstance();
