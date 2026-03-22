/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * EIA (Energy Information Administration) Service
 *
 * Queries EIA for state energy profiles and production data.
 *
 * API: https://api.eia.gov/v2/
 * Requires EIA_API_KEY.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  EiaStateEnergyProfile,
  EiaEnergyProduction,
  EiaApiResponse,
} from '@/types/eia';

const EIA_BASE = 'https://api.eia.gov/v2';

const MIN_REQUEST_INTERVAL_MS = 300;
let lastRequestTime = 0;
const CACHE_TTL = 86400; // 24 hours

function getApiKey(): string | null {
  return process.env.EIA_API_KEY ?? null;
}

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

export class EiaService {
  /**
   * Get state energy profile: consumption, production, generation, top sources.
   */
  async getStateEnergyProfile(stateAbbrev: string): Promise<EiaStateEnergyProfile | null> {
    const apiKey = getApiKey();
    if (!apiKey) {
      logger.warn('EIA_API_KEY not configured');
      return null;
    }

    const state = stateAbbrev.toUpperCase();
    const cacheKey = `eia-profile:${state}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          // Fetch SEDS (State Energy Data System) for total consumption and production
          const sedsUrl = `${EIA_BASE}/seds/data/?api_key=${apiKey}&frequency=annual&data[0]=value&facets[stateId][]=${state}&facets[seriesId][]=TETCB&facets[seriesId][]=TEPRB&facets[seriesId][]=ELETPUS&sort[0][column]=period&sort[0][direction]=desc&length=10`;

          logger.info('EIA state energy profile', { state });
          const response = await rateLimitedFetch(sedsUrl);
          if (!response.ok) {
            throw new Error(`EIA API returned ${response.status}`);
          }

          const data: EiaApiResponse = await response.json();
          const points = data.response?.data ?? [];

          // Extract latest values
          let totalConsumption: number | null = null;
          let totalProduction: number | null = null;
          let electricityGeneration: number | null = null;
          let period = '';

          for (const point of points) {
            if (!period && point.period) period = point.period;
            const seriesId = point.seriesDescription?.toLowerCase() ?? '';
            if (seriesId.includes('total energy consumption') && totalConsumption === null) {
              totalConsumption = point.value;
            }
            if (seriesId.includes('total energy production') && totalProduction === null) {
              totalProduction = point.value;
            }
            if (seriesId.includes('electricity') && electricityGeneration === null) {
              electricityGeneration = point.value;
            }
          }

          // Fetch energy production by source
          const prodUrl = `${EIA_BASE}/electricity/state-electricity-profiles/source-disposition/?api_key=${apiKey}&facets[stateid][]=${state}&sort[0][column]=period&sort[0][direction]=desc&length=20`;

          let topSources: EiaStateEnergyProfile['topSources'] = [];
          let renewablePercentage: number | null = null;

          try {
            const prodResponse = await rateLimitedFetch(prodUrl);
            if (prodResponse.ok) {
              const prodData: EiaApiResponse = await prodResponse.json();
              const prodPoints = prodData.response?.data ?? [];

              // Get latest period sources
              const latestPeriod = prodPoints[0]?.period ?? '';
              const latestSources = prodPoints.filter(p => p.period === latestPeriod);

              let totalGen = 0;
              let renewableGen = 0;

              topSources = latestSources
                .filter(s => s.value !== null && s.value > 0)
                .map(s => {
                  const amount = s.value ?? 0;
                  totalGen += amount;
                  const desc = (s.fuelTypeDescription ?? s.fueltypeid ?? '').toLowerCase();
                  if (
                    desc.includes('wind') ||
                    desc.includes('solar') ||
                    desc.includes('hydro') ||
                    desc.includes('geothermal') ||
                    desc.includes('biomass')
                  ) {
                    renewableGen += amount;
                  }
                  return {
                    source: s.fuelTypeDescription ?? s.fueltypeid ?? 'Unknown',
                    amount,
                    unit: s.unit ?? s['value-units'] ?? 'thousand MWh',
                  };
                })
                .sort((a, b) => b.amount - a.amount);

              if (totalGen > 0) {
                renewablePercentage = Math.round((renewableGen / totalGen) * 1000) / 10;
              }
            }
          } catch (e) {
            logger.warn('EIA electricity source breakdown failed', {
              error: (e as Error).message,
            });
          }

          return {
            state,
            stateDescription: points[0]?.stateDescription ?? state,
            totalConsumption,
            totalProduction,
            electricityGeneration,
            renewablePercentage,
            topSources: topSources.slice(0, 10),
            period,
          };
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('EiaService.getStateEnergyProfile failed', error as Error);
      return null;
    }
  }

  /**
   * Get energy production data for a state, optionally filtered by source.
   */
  async getEnergyProduction(
    stateAbbrev: string,
    source?: string
  ): Promise<EiaEnergyProduction[]> {
    const apiKey = getApiKey();
    if (!apiKey) {
      logger.warn('EIA_API_KEY not configured');
      return [];
    }

    const state = stateAbbrev.toUpperCase();
    const cacheKey = `eia-production:${state}:${source ?? ''}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          let url = `${EIA_BASE}/electricity/state-electricity-profiles/source-disposition/?api_key=${apiKey}&facets[stateid][]=${state}&sort[0][column]=period&sort[0][direction]=desc&length=50`;

          if (source) {
            url += `&facets[fueltypeid][]=${encodeURIComponent(source)}`;
          }

          logger.info('EIA energy production', { state, source });
          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`EIA API returned ${response.status}`);
          }

          const data: EiaApiResponse = await response.json();
          return (data.response?.data ?? [])
            .filter(p => p.value !== null && p.value > 0)
            .map(p => ({
              state: p.stateid,
              source: p.fueltypeid ?? '',
              sourceDescription: p.fuelTypeDescription ?? '',
              amount: p.value ?? 0,
              unit: p.unit ?? p['value-units'] ?? 'thousand MWh',
              period: p.period,
            }));
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('EiaService.getEnergyProduction failed', error as Error);
      return [];
    }
  }
}

export const eiaService = new EiaService();
