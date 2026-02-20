/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FollowTheMoney API Service
 *
 * Client for FollowTheMoney.org state campaign finance data.
 * Covers all 50 states back to 1986. Matches FEC service pattern with lazy singleton Proxy.
 *
 * API docs: http://api.followthemoney.org
 * Note: FTM is in maintenance mode during OpenSecrets merger.
 * The provider pattern allows swapping data sources if needed.
 */

import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import type { FTMEntityRecord, FTMIndustrySummary, FTMSearchResult } from './types';

const FTM_API_BASE = 'http://api.followthemoney.org';

function getFTMApiKey(): string {
  const apiKey = process.env.FOLLOWTHEMONEY_API_KEY;
  if (!apiKey) {
    throw new Error('FOLLOWTHEMONEY_API_KEY environment variable is not configured');
  }
  return apiKey;
}

/**
 * Core FollowTheMoney API Service
 */
export class FTMApiService {
  private readonly apiKey: string;

  constructor() {
    this.apiKey = getFTMApiKey();
  }

  /**
   * Search for candidates by state, name, and/or year.
   */
  async searchCandidates(state: string, name?: string, year?: number): Promise<FTMEntityRecord[]> {
    const cacheKey = `ftm:search:${state}:${name ?? ''}:${year ?? ''}`;

    try {
      const cached = await govCache.get<FTMEntityRecord[]>(cacheKey);
      if (cached) return cached;

      const params: Record<string, string> = {
        s: state.toUpperCase(),
        'c-t-eid': 'A', // Candidates only
      };

      if (name) params['c-t-n'] = name;
      if (year) params.y = year.toString();

      const data = await this.makeRequest<FTMSearchResult>(
        '/BreakdownAPI/api/SearchAA.php',
        params
      );

      const results = data?.results ?? [];

      await govCache.set(cacheKey, results, {
        ttl: 86400000, // 24 hours
        source: 'followthemoney',
        dataType: 'finance',
      });

      return results;
    } catch (error) {
      logger.error('FTM candidate search failed', error as Error, { state, name, year });
      return [];
    }
  }

  /**
   * Get entity details and finance summary by entity ID.
   */
  async getEntityDetails(entityId: string): Promise<FTMEntityRecord | null> {
    const cacheKey = `ftm:entity:${entityId}`;

    try {
      const cached = await govCache.get<FTMEntityRecord>(cacheKey);
      if (cached) return cached;

      const results = await this.makeRequest<FTMSearchResult>('/BreakdownAPI/api/SearchAA.php', {
        'c-t-eid': entityId,
      });

      const entity = results?.results?.[0] ?? null;

      if (entity) {
        await govCache.set(cacheKey, entity, {
          ttl: 86400000, // 24 hours
          source: 'followthemoney',
          dataType: 'finance',
        });
      }

      return entity;
    } catch (error) {
      logger.error('FTM entity lookup failed', error as Error, { entityId });
      return null;
    }
  }

  /**
   * Get industry/sector breakdown for an entity.
   */
  async getIndustryBreakdown(entityId: string): Promise<FTMIndustrySummary[]> {
    const cacheKey = `ftm:industries:${entityId}`;

    try {
      const cached = await govCache.get<FTMIndustrySummary[]>(cacheKey);
      if (cached) return cached;

      const data = await this.makeRequest<{ records?: FTMIndustrySummary[] }>(
        '/BreakdownAPI/api/SearchAA.php',
        { 'c-t-eid': entityId, gro: 'c-t-s' }
      );

      const industries = data?.records ?? [];

      await govCache.set(cacheKey, industries, {
        ttl: 86400000,
        source: 'followthemoney',
        dataType: 'finance',
      });

      return industries;
    } catch (error) {
      logger.error('FTM industry breakdown failed', error as Error, { entityId });
      return [];
    }
  }

  /**
   * Make authenticated request to FTM API.
   */
  private async makeRequest<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${FTM_API_BASE}${endpoint}`);
    url.searchParams.set('APIKey', this.apiKey);
    url.searchParams.set('mode', 'json');

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    logger.info('FTM API request', {
      endpoint,
      params: Object.keys(params),
    });

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FTM API error: HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}

// Lazy singleton instance — only created when first accessed
let _ftmApiService: FTMApiService | null = null;

function getFTMApiServiceInstance(): FTMApiService {
  if (!_ftmApiService) {
    _ftmApiService = new FTMApiService();
  }
  return _ftmApiService;
}

// Proxy for lazy instantiation — matches FEC service pattern
export const ftmApiService = new Proxy({} as FTMApiService, {
  get(_target, prop) {
    const instance = getFTMApiServiceInstance();
    const value = instance[prop as keyof FTMApiService];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});
