/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Congress Service - Refactored Congress Legislators Service
 *
 * This service consolidates the original congress.service.ts functions to use:
 * - BaseUnifiedService as the foundation
 * - IUnifiedRepresentativeService interface compliance
 * - UnifiedRepresentativeResponse types
 * - Enhanced data from congress-legislators repository
 * - Consistent error handling and response formatting
 *
 * Data sources:
 * - https://github.com/unitedstates/congress-legislators
 * - legislators-current.yaml: Current members of Congress
 * - legislators-social-media.yaml: Social media accounts
 */

import { BaseUnifiedService } from '../../../services/base/unified-base.service';
import type {
  IUnifiedRepresentativeService,
  UnifiedRepresentativeResponse,
  UnifiedServiceResponse,
  VotingRecord,
  BillRecord,
  CommitteeRecord,
  QueryOptions,
} from '../../../services/interfaces/unified-service-interfaces';

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import yaml from 'js-yaml';
// Note: Using manual filtering instead of filterCurrent119thCongress to avoid type conflicts

// Base URLs for congress-legislators data
const CONGRESS_LEGISLATORS_BASE_URL =
  'https://raw.githubusercontent.com/unitedstates/congress-legislators/main';

// Rate limiter for GitHub API calls
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequestsPerSecond = 10; // GitHub's rate limit

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Remove requests older than 1 second
    this.requests = this.requests.filter(time => time > oneSecondAgo);

    if (this.requests.length >= this.maxRequestsPerSecond) {
      const firstRequest = this.requests[0];
      if (firstRequest !== undefined) {
        const waitTime = 1000 - (now - firstRequest);
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter();

// Types from congress-legislators repository
interface CongressLegislator {
  id: {
    bioguide: string;
    govtrack?: number;
    opensecrets?: string;
    fec?: string[];
  };
  name: {
    first: string;
    last: string;
    middle?: string;
    suffix?: string;
  };
  terms: Array<{
    type: 'sen' | 'rep';
    start: string;
    end: string;
    state: string;
    district?: number;
    party: string;
  }>;
  bio?: {
    birthday?: string;
    gender?: 'M' | 'F';
  };
}

interface SocialMediaData {
  id: {
    bioguide: string;
  };
  social?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
    instagram?: string;
  };
}

/**
 * Unified Congress Service Implementation
 *
 * Refactored from the original function-based congress service to implement
 * the unified service pattern while maintaining congress-legislators integration.
 */
export class UnifiedCongressService
  extends BaseUnifiedService
  implements IUnifiedRepresentativeService
{
  private static instance: UnifiedCongressService;

  private constructor() {
    super({
      baseUrl: CONGRESS_LEGISLATORS_BASE_URL,
      timeout: 15000,
      retries: 3,
      cacheEnabled: true,
      cacheTtl: 300000, // 5 minutes
    });
  }

  public static getInstance(): UnifiedCongressService {
    if (!UnifiedCongressService.instance) {
      UnifiedCongressService.instance = new UnifiedCongressService();
    }
    return UnifiedCongressService.instance;
  }

  getServiceInfo() {
    return {
      name: 'UnifiedCongressService',
      version: '2.0.0',
      description: 'Unified service for congress-legislators data',
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
      if (!bioguideId || bioguideId.length < 2) {
        throw new Error(`Invalid bioguide ID: ${bioguideId}`);
      }

      const legislators = await this.loadCongressLegislators();
      const legislator = legislators.find(l => l.id.bioguide === bioguideId);

      if (!legislator) {
        throw new Error(`Representative not found: ${bioguideId}`);
      }

      const socialData = await this.loadSocialMediaData();
      const social = socialData.find(s => s.id.bioguide === bioguideId);

      const unifiedData: UnifiedRepresentativeResponse = this.transformCongressLegislatorToUnified(
        legislator,
        social
      );

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
      const legislators = await this.loadCongressLegislators();
      const socialData = await this.loadSocialMediaData();

      let filteredLegislators = legislators;

      // Apply chamber filter
      if (options?.chamber && options.chamber !== 'all') {
        const chamberType = options.chamber.toLowerCase() === 'house' ? 'rep' : 'sen';
        filteredLegislators = filteredLegislators.filter(l =>
          l.terms.some(term => term.type === chamberType)
        );
      }

      // Apply party filter
      if (options?.party) {
        filteredLegislators = filteredLegislators.filter(l =>
          l.terms.some(
            term => this.normalizeParty(term.party) === this.normalizeParty(options.party as string)
          )
        );
      }

      // Apply pagination
      const limit = options?.limit || 100;
      const page = options?.page || 1;
      const offset = (page - 1) * limit;
      const paginatedLegislators = filteredLegislators.slice(offset, offset + limit);

      const unifiedData: UnifiedRepresentativeResponse[] = paginatedLegislators.map(legislator => {
        const social = socialData.find(s => s.id.bioguide === legislator.id.bioguide);
        return this.transformCongressLegislatorToUnified(legislator, social);
      });

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
      if (!state || state.length !== 2) {
        throw new Error(`Invalid state code: ${state}`);
      }

      const legislators = await this.loadCongressLegislators();
      const socialData = await this.loadSocialMediaData();

      let filteredLegislators = legislators.filter(l =>
        l.terms.some(term => term.state === state.toUpperCase())
      );

      // Apply chamber filter
      if (options?.chamber && options.chamber !== 'all') {
        const chamberType = options.chamber.toLowerCase() === 'house' ? 'rep' : 'sen';
        filteredLegislators = filteredLegislators.filter(l =>
          l.terms.some(term => term.type === chamberType && term.state === state.toUpperCase())
        );
      }

      const unifiedData: UnifiedRepresentativeResponse[] = filteredLegislators.map(legislator => {
        const social = socialData.find(s => s.id.bioguide === legislator.id.bioguide);
        return this.transformCongressLegislatorToUnified(legislator, social);
      });

      return this.formatResponse(unifiedData, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async searchRepresentatives(
    query: string,
    _options?: QueryOptions
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>> {
    const startTime = Date.now();

    try {
      const legislators = await this.loadCongressLegislators();
      const socialData = await this.loadSocialMediaData();

      const searchTerm = query.toLowerCase();
      const filteredLegislators = legislators.filter(l => {
        const fullName = `${l.name.first} ${l.name.middle || ''} ${l.name.last}`.toLowerCase();
        const bioguideMatch = l.id.bioguide.toLowerCase().includes(searchTerm);
        const nameMatch = fullName.includes(searchTerm);
        const stateMatch = l.terms.some(term => term.state.toLowerCase().includes(searchTerm));

        return bioguideMatch || nameMatch || stateMatch;
      });

      const unifiedData: UnifiedRepresentativeResponse[] = filteredLegislators.map(legislator => {
        const social = socialData.find(s => s.id.bioguide === legislator.id.bioguide);
        return this.transformCongressLegislatorToUnified(legislator, social);
      });

      return this.formatResponse(unifiedData, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  // Enhanced methods - Limited implementations for congress-legislators data
  async getRepresentativeVotes(
    _bioguideId: string,
    _options?: QueryOptions
  ): Promise<UnifiedServiceResponse<VotingRecord[]>> {
    const startTime = Date.now();

    try {
      // Congress-legislators repository doesn't contain voting data
      // Return empty array with appropriate message
      logger.info('Voting records not available in congress-legislators data source');
      return this.formatResponse([], startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async getRepresentativeBills(
    _bioguideId: string,
    _options?: QueryOptions
  ): Promise<UnifiedServiceResponse<BillRecord[]>> {
    const startTime = Date.now();

    try {
      // Congress-legislators repository doesn't contain bill data
      // Return empty array with appropriate message
      logger.info('Bill records not available in congress-legislators data source');
      return this.formatResponse([], startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async getRepresentativeCommittees(
    _bioguideId: string
  ): Promise<UnifiedServiceResponse<CommitteeRecord[]>> {
    const startTime = Date.now();

    try {
      // Congress-legislators repository doesn't contain committee data
      // Return empty array with appropriate message
      logger.info('Committee records not available in congress-legislators data source');
      return this.formatResponse([], startTime);
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
    // ZIP code filtering would need additional data source
    return response.data;
  }

  // Private helper methods
  private async loadCongressLegislators(): Promise<CongressLegislator[]> {
    await rateLimiter.waitIfNeeded();

    const fetchLegislators = async () => {
      const response = await fetch(`${CONGRESS_LEGISLATORS_BASE_URL}/legislators-current.yaml`);
      if (!response.ok) {
        throw new Error(`Failed to fetch legislators: ${response.status}`);
      }
      const yamlText = await response.text();
      return yaml.load(yamlText) as CongressLegislator[];
    };

    const legislators = (await cachedFetch(
      'congress-legislators-current',
      fetchLegislators,
      300000 // 5 minutes
    )) as CongressLegislator[];

    // Filter current legislators manually to avoid type conflicts
    const currentLegislators = legislators.filter(legislator => {
      return legislator.terms.some(term => {
        const endDate = new Date(term.end);
        const now = new Date();
        return endDate >= now;
      });
    });

    return currentLegislators;
  }

  private async loadSocialMediaData(): Promise<SocialMediaData[]> {
    await rateLimiter.waitIfNeeded();

    const fetchSocialMedia = async () => {
      const response = await fetch(
        `${CONGRESS_LEGISLATORS_BASE_URL}/legislators-social-media.yaml`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch social media data: ${response.status}`);
      }
      const yamlText = await response.text();
      return yaml.load(yamlText) as SocialMediaData[];
    };

    return (await cachedFetch(
      'congress-legislators-social-media',
      fetchSocialMedia,
      300000 // 5 minutes
    )) as SocialMediaData[];
  }

  private transformCongressLegislatorToUnified(
    legislator: CongressLegislator,
    social?: SocialMediaData
  ): UnifiedRepresentativeResponse {
    const currentTerm = legislator.terms[legislator.terms.length - 1];
    const chamber = currentTerm?.type === 'sen' ? 'Senate' : 'House';
    const title =
      chamber === 'Senate'
        ? `Senator from ${currentTerm?.state}`
        : `Representative from ${currentTerm?.state}${currentTerm?.district ? ` District ${currentTerm.district}` : ''}`;

    return {
      bioguideId: legislator.id.bioguide,
      name: `${legislator.name.first} ${legislator.name.last}`,
      firstName: legislator.name.first,
      lastName: legislator.name.last,
      party: this.normalizeParty(currentTerm?.party || ''),
      state: currentTerm?.state || '',
      chamber,
      district: currentTerm?.district || null,
      title,
      contactInfo: {
        socialMedia: social?.social
          ? {
              twitter: social.social.twitter,
              facebook: social.social.facebook,
            }
          : undefined,
      },
      lastUpdated: new Date().toISOString(),
      dataSource: 'congress-legislators.service',
    };
  }

  private normalizeParty(party: string): 'Democratic' | 'Republican' | 'Independent' {
    const normalized = party?.toLowerCase();
    if (normalized?.includes('democrat') || normalized === 'd') return 'Democratic';
    if (normalized?.includes('republican') || normalized === 'r') return 'Republican';
    return 'Independent';
  }

  protected validateBioguideId(bioguideId: string): boolean {
    return /^[A-Z]\d{6}$/.test(bioguideId);
  }

  protected validateState(state: string): boolean {
    return /^[A-Z]{2}$/.test(state);
  }
}

// Export singleton instance
export const unifiedCongressService = UnifiedCongressService.getInstance();
