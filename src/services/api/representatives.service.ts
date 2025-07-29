/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { BaseService } from './base.service';
import type { Representative } from '@/features/representatives/services/congress-api';
import { useRepresentativesStore } from '@/store/representatives.store';
import { apiConfig, getApiUrl } from '@/config';

export interface RepresentativeFilters {
  state?: string;
  party?: string;
  chamber?: 'house' | 'senate' | 'all';
  committee?: string;
  searchQuery?: string;
}

export interface RepresentativesBatchRequest {
  bioguideIds: string[];
  includeVotes?: boolean;
  includeFinance?: boolean;
  includeBills?: boolean;
  includeNews?: boolean;
}

export interface VotingRecord {
  voteId: string;
  billId?: string;
  date: string;
  question: string;
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  result: string;
  chamber: 'house' | 'senate';
}

export interface CampaignFinance {
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  lastReportDate: string;
  topContributors: Array<{
    name: string;
    amount: number;
    type: 'individual' | 'pac' | 'corporate';
  }>;
}

export interface PartyAlignment {
  partyLineVoting: number;
  bipartisanBills: number;
  totalVotes: number;
  alignmentTrend: 'increasing' | 'decreasing' | 'stable';
}

class RepresentativesService extends BaseService {
  private static instance: RepresentativesService;

  private constructor() {
    super(getApiUrl(''));
  }

  public static getInstance(): RepresentativesService {
    if (!RepresentativesService.instance) {
      RepresentativesService.instance = new RepresentativesService();
    }
    return RepresentativesService.instance;
  }

  /**
   * Get all representatives with optional filters
   */
  async getAll(filters?: RepresentativeFilters): Promise<Representative[]> {
    return this.get<Representative[]>(apiConfig.endpoints.representatives, {
      params: filters as Record<string, string>,
    });
  }

  /**
   * Get representatives by ZIP code
   */
  async getByZipCode(zipCode: string): Promise<Representative[]> {
    return this.get<Representative[]>(apiConfig.endpoints.representatives, {
      params: { zip: zipCode },
    });
  }

  /**
   * Get a single representative by bioguide ID
   */
  async getById(bioguideId: string): Promise<Representative> {
    return this.get<Representative>(`${apiConfig.endpoints.representative}/${bioguideId}`);
  }

  /**
   * Get voting records for a representative
   */
  async getVotingRecords(
    bioguideId: string,
    options?: {
      congress?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<VotingRecord[]> {
    return this.get<VotingRecord[]>(`${apiConfig.endpoints.representative}/${bioguideId}/votes`, {
      params: options as Record<string, string | number>,
    });
  }

  /**
   * Get campaign finance data for a representative
   */
  async getCampaignFinance(bioguideId: string): Promise<CampaignFinance> {
    return this.get<CampaignFinance>(`${apiConfig.endpoints.representative}/${bioguideId}/finance`);
  }

  /**
   * Get bills sponsored/cosponsored by a representative
   */
  async getBills(
    bioguideId: string,
    options?: {
      type?: 'sponsored' | 'cosponsored' | 'all';
      congress?: number;
      limit?: number;
    }
  ): Promise<Array<{ id: string; title: string; status: string }>> {
    return this.get<Array<{ id: string; title: string; status: string }>>(
      `${apiConfig.endpoints.representative}/${bioguideId}/bills`,
      {
        params: options as Record<string, string | number>,
      }
    );
  }

  /**
   * Get news articles about a representative
   */
  async getNews(
    bioguideId: string,
    options?: {
      limit?: number;
      offset?: number;
      theme?: string;
    }
  ): Promise<Array<{ title: string; url: string; date: string; source: string }>> {
    return this.get<Array<{ title: string; url: string; date: string; source: string }>>(
      `${apiConfig.endpoints.representative}/${bioguideId}/news`,
      {
        params: options as Record<string, string | number>,
      }
    );
  }

  /**
   * Get party alignment analysis for a representative
   */
  async getPartyAlignment(bioguideId: string): Promise<PartyAlignment> {
    return this.get<PartyAlignment>(
      `${apiConfig.endpoints.representative}/${bioguideId}/party-alignment`
    );
  }

  /**
   * Batch fetch multiple data points for multiple representatives
   */
  async getBatch(request: RepresentativesBatchRequest): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>(
      `${apiConfig.endpoints.representative}/batch`,
      request
    );
  }

  /**
   * Search representatives by query
   */
  async search(query: string, filters?: RepresentativeFilters): Promise<Representative[]> {
    return this.get<Representative[]>(apiConfig.endpoints.search, {
      params: {
        q: query,
        ...filters,
      } as Record<string, string>,
    });
  }

  /**
   * Get committee members
   */
  async getCommitteeMembers(committeeId: string): Promise<Representative[]> {
    return this.get<Representative[]>(`/api/v1/committee/${committeeId}/members`);
  }

  /**
   * Compare multiple representatives
   */
  async compare(bioguideIds: string[]): Promise<{
    representatives: Representative[];
    comparison: {
      votingSimilarity: Record<string, number>;
      billCosponsorship: Record<string, number>;
      partyAlignment: Record<string, number>;
    };
  }> {
    return this.post(`${apiConfig.endpoints.representatives}/compare`, { bioguideIds });
  }

  /**
   * Sync with Zustand store
   */
  async syncWithStore(filters?: RepresentativeFilters): Promise<void> {
    const store = useRepresentativesStore.getState();
    store.setLoading(true);

    try {
      const representatives = await this.getAll(filters);
      store.setRepresentatives(representatives);
      store.setError(null);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'Failed to fetch representatives');
      throw error;
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * Get representative photo with fallbacks
   */
  async getPhoto(bioguideId: string): Promise<string> {
    try {
      const response = await this.get<{ url: string }>(
        `/api/v1/representative-photo/${bioguideId}`
      );
      return response.url;
    } catch {
      // Return default avatar on error
      return '/images/default-avatar.png';
    }
  }

  /**
   * Get district information
   */
  async getDistrict(
    state: string,
    district: string
  ): Promise<{
    id: string;
    state: string;
    number: string;
    population: number;
    demographics: Record<string, unknown>;
  }> {
    return this.get(`${apiConfig.endpoints.districts}/${state}-${district}`);
  }

  /**
   * Get all districts for a state
   */
  async getStateDistricts(state: string): Promise<
    Array<{
      id: string;
      number: string;
      representative?: Representative;
    }>
  > {
    return this.get(`${apiConfig.endpoints.districts}/state/${state}`);
  }
}

// Export singleton instance
export const representativesService = RepresentativesService.getInstance();
