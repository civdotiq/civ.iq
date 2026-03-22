/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * HUD Service
 *
 * Queries the HUD User API for Fair Market Rents and Income Limits.
 * Requires HUD_API_TOKEN — returns empty data gracefully when not configured.
 *
 * API: https://www.huduser.gov/hudapi/public/
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  HudFairMarketRent,
  HudIncomeLimit,
  HudIncomeLimitBySize,
  HudRawFmrResponse,
  HudRawIlResponse,
} from '@/types/hud';

const BASE_URL = 'https://www.huduser.gov/hudapi/public';

const MIN_REQUEST_INTERVAL_MS = 300;
let lastRequestTime = 0;
const CACHE_TTL = 86400; // 24 hours — FMR/IL data updates annually

function getApiToken(): string | null {
  return process.env.HUD_API_TOKEN ?? null;
}

async function rateLimitedFetch(url: string, token: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();

  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'CIV.IQ (civdotiq.org)',
    },
    signal: AbortSignal.timeout(30_000),
  });
}

function parseIncomeLimits(raw: Record<string, number> | undefined): HudIncomeLimitBySize {
  return {
    person1: raw?.['p1'] ?? raw?.['il50_p1'] ?? raw?.['il30_p1'] ?? raw?.['il80_p1'] ?? 0,
    person2: raw?.['p2'] ?? raw?.['il50_p2'] ?? raw?.['il30_p2'] ?? raw?.['il80_p2'] ?? 0,
    person3: raw?.['p3'] ?? raw?.['il50_p3'] ?? raw?.['il30_p3'] ?? raw?.['il80_p3'] ?? 0,
    person4: raw?.['p4'] ?? raw?.['il50_p4'] ?? raw?.['il30_p4'] ?? raw?.['il80_p4'] ?? 0,
    person5: raw?.['p5'] ?? raw?.['il50_p5'] ?? raw?.['il30_p5'] ?? raw?.['il80_p5'] ?? 0,
    person6: raw?.['p6'] ?? raw?.['il50_p6'] ?? raw?.['il30_p6'] ?? raw?.['il80_p6'] ?? 0,
    person7: raw?.['p7'] ?? raw?.['il50_p7'] ?? raw?.['il30_p7'] ?? raw?.['il80_p7'] ?? 0,
    person8: raw?.['p8'] ?? raw?.['il50_p8'] ?? raw?.['il30_p8'] ?? raw?.['il80_p8'] ?? 0,
  };
}

export class HudService {
  /**
   * Get Fair Market Rents for a county by FIPS code.
   * Returns null if HUD_API_TOKEN is not configured.
   */
  async getFairMarketRents(countyFips: string): Promise<HudFairMarketRent | null> {
    const token = getApiToken();
    if (!token) {
      logger.warn('HUD_API_TOKEN not configured');
      return null;
    }

    const cacheKey = `hud-fmr:${countyFips}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          // HUD uses entityId format: METRO{code} or county FIPS
          const url = `${BASE_URL}/fmr/data/${encodeURIComponent(countyFips)}`;
          logger.info('HUD FMR fetch', { countyFips });

          const response = await rateLimitedFetch(url, token);
          if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`HUD FMR API returned ${response.status}`);
          }

          const raw: HudRawFmrResponse = await response.json();
          const d = raw.data;
          if (!d) return null;

          return {
            countyName: d.county_name ?? d.town_name ?? '',
            metroName: d.metro_name ?? null,
            metroStatus: d.metro_status ?? 'Unknown',
            year: d.year ?? new Date().getFullYear(),
            efficiency: d.basicdata?.Efficiency ?? 0,
            oneBedroom: d.basicdata?.['One-Bedroom'] ?? 0,
            twoBedroom: d.basicdata?.['Two-Bedroom'] ?? 0,
            threeBedroom: d.basicdata?.['Three-Bedroom'] ?? 0,
            fourBedroom: d.basicdata?.['Four-Bedroom'] ?? 0,
          };
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('HudService.getFairMarketRents failed', error as Error);
      return null;
    }
  }

  /**
   * Get income limits for a county by FIPS code.
   * Returns null if HUD_API_TOKEN is not configured.
   */
  async getIncomeLimits(countyFips: string): Promise<HudIncomeLimit | null> {
    const token = getApiToken();
    if (!token) {
      logger.warn('HUD_API_TOKEN not configured');
      return null;
    }

    const cacheKey = `hud-il:${countyFips}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${BASE_URL}/il/data/${encodeURIComponent(countyFips)}`;
          logger.info('HUD income limits fetch', { countyFips });

          const response = await rateLimitedFetch(url, token);
          if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`HUD IL API returned ${response.status}`);
          }

          const raw: HudRawIlResponse = await response.json();
          const d = raw.data;
          if (!d) return null;

          return {
            countyName: d.county_name ?? '',
            metroName: d.metro_name ?? null,
            year: d.year ?? new Date().getFullYear(),
            medianIncome: d.median_income ?? 0,
            veryLow: parseIncomeLimits(d.very_low),
            extremelyLow: parseIncomeLimits(d.extremely_low),
            low: parseIncomeLimits(d.low),
          };
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('HudService.getIncomeLimits failed', error as Error);
      return null;
    }
  }
}

export const hudService = new HudService();
