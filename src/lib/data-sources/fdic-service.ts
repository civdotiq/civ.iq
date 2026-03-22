/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FDIC BankFind Service
 *
 * Queries FDIC for bank institution data and historical bank failures.
 *
 * API: https://banks.data.fdic.gov/api/
 * No API key required.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  FdicInstitution,
  FdicBankFailure,
  FdicApiResponse,
  RawFdicInstitution,
  RawFdicFailure,
} from '@/types/fdic';

const FDIC_BASE = 'https://banks.data.fdic.gov/api';

const MIN_REQUEST_INTERVAL_MS = 300;
let lastRequestTime = 0;
const CACHE_TTL = 86400; // 24 hours

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: { 'User-Agent': 'CIV.IQ (civdotiq.org)' },
    signal: AbortSignal.timeout(30_000),
  });
}

function transformInstitution(raw: RawFdicInstitution): FdicInstitution {
  const d = raw.data;
  return {
    certNumber: d.CERT ?? 0,
    institutionName: d.INSTNAME ?? '',
    city: d.CITY ?? '',
    state: d.STALP ?? '',
    zip: d.ZIP ?? '',
    county: d.COUNTY ?? '',
    institutionClass: d.INSTCAT ?? '',
    charterClass: d.CHRTAGNT ?? '',
    totalAssets: d.ASSET ?? null,
    totalDeposits: d.DEP ?? null,
    numberOfOffices: d.OFFDOM ?? null,
    established: d.ESTYMD ?? null,
    activeFlag: d.ACTIVE === 1,
    regulatorName: d.REGAGENT ?? '',
    fdicInsured: true,
  };
}

function transformFailure(raw: RawFdicFailure): FdicBankFailure {
  const d = raw.data;
  return {
    certNumber: d.CERT ?? 0,
    institutionName: d.NAME ?? '',
    city: d.CITY ?? '',
    state: d.STATE ?? '',
    failDate: d.FAILDATE ?? '',
    cost: d.COST ?? null,
    acquiringInstitution: d.ACQUIRER ?? null,
    totalDeposits: d.QBFDEP ?? null,
    totalAssets: d.QBFASSET ?? null,
  };
}

export class FdicService {
  /**
   * Search FDIC-insured institutions by state, name, and/or city.
   */
  async searchInstitutions(params: {
    state?: string;
    name?: string;
    city?: string;
    limit?: number;
  }): Promise<FdicInstitution[]> {
    const { state, name, city, limit = 25 } = params;
    const cacheKey = `fdic-inst:${state ?? ''}:${name ?? ''}:${city ?? ''}:${limit}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const filters: string[] = [];
          if (state) filters.push(`STALP:${state.toUpperCase()}`);
          if (name) filters.push(`INSTNAME:${encodeURIComponent(name)}`);
          if (city) filters.push(`CITY:${encodeURIComponent(city.toUpperCase())}`);

          // Default: active institutions only
          filters.push('ACTIVE:1');

          const filterStr = filters.join(' AND ');
          const fields = 'CERT,INSTNAME,CITY,STALP,ZIP,COUNTY,INSTCAT,CHRTAGNT,ASSET,DEP,OFFDOM,ESTYMD,ACTIVE,REGAGENT,FDICREGN';
          const url = `${FDIC_BASE}/financials?filters=${encodeURIComponent(filterStr)}&fields=${fields}&sort_by=ASSET&sort_order=DESC&limit=${Math.min(limit, 100)}`;

          logger.info('FDIC institution search', { state, name, city });
          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`FDIC API returned ${response.status}`);
          }

          const data: FdicApiResponse<RawFdicInstitution> = await response.json();
          return (data.data ?? []).map(transformInstitution);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('FdicService.searchInstitutions failed', error as Error);
      return [];
    }
  }

  /**
   * Get historical bank failures by state and/or start year.
   */
  async getBankFailures(params: {
    state?: string;
    startYear?: number;
  }): Promise<FdicBankFailure[]> {
    const { state, startYear } = params;
    const cacheKey = `fdic-failures:${state ?? ''}:${startYear ?? ''}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const filters: string[] = [];
          if (state) filters.push(`STATE:${state.toUpperCase()}`);
          if (startYear) {
            filters.push(`FAILDATE:[${startYear}-01-01 TO *]`);
          }

          const filterStr = filters.length > 0 ? filters.join(' AND ') : '';
          const fields = 'CERT,NAME,CITY,STATE,FAILDATE,COST,PSTALP,QBFASSET,QBFDEP,ACQUIRER';
          let url = `${FDIC_BASE}/failures?fields=${fields}&sort_by=FAILDATE&sort_order=DESC&limit=100`;
          if (filterStr) {
            url += `&filters=${encodeURIComponent(filterStr)}`;
          }

          logger.info('FDIC bank failures', { state, startYear });
          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`FDIC API returned ${response.status}`);
          }

          const data: FdicApiResponse<RawFdicFailure> = await response.json();
          return (data.data ?? []).map(transformFailure);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('FdicService.getBankFailures failed', error as Error);
      return [];
    }
  }
}

export const fdicService = new FdicService();
