/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  FredSeries,
  FredSeriesResult,
  FredObservation,
  FredAPISeriesResponse,
  FredAPIObservationsResponse,
  StateEconomicIndicator,
} from '@/types/fred';

const BASE_URL = 'https://api.stlouisfed.org/fred';

// FRED rate limit: ~2 req/s
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 550;

function getApiKey(): string | null {
  return process.env.FRED_API_KEY ?? null;
}

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  return fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
    },
  });
}

/**
 * Pre-mapped FRED series IDs for common state-level indicators.
 * These use standard FRED naming conventions with state abbreviations.
 */
const STATE_SERIES = {
  unemployment: (state: string) => `${state}UR`,
  gdp: (state: string) => `${state}NGSP`,
  personalIncome: (state: string) => `${state}OTOT`,
  laborForce: (state: string) => `${state}LF`,
} as const;

function transformSeries(raw: FredAPISeriesResponse['seriess'][0]): FredSeries {
  return {
    id: raw.id,
    title: raw.title,
    observationStart: raw.observation_start,
    observationEnd: raw.observation_end,
    frequency: raw.frequency,
    frequencyShort: raw.frequency_short,
    units: raw.units,
    unitsShort: raw.units_short,
    seasonalAdjustment: raw.seasonal_adjustment,
    seasonalAdjustmentShort: raw.seasonal_adjustment_short,
    lastUpdated: raw.last_updated,
    notes: raw.notes ?? '',
  };
}

function parseObservations(raw: FredAPIObservationsResponse): FredObservation[] {
  return raw.observations
    .map(obs => ({
      date: obs.date,
      value: obs.value === '.' ? null : parseFloat(obs.value),
    }))
    .filter(obs => obs.value !== null || obs.date !== '');
}

export class FredEconomicService {
  /**
   * Search FRED for data series by keywords
   */
  async searchSeries(keywords: string, limit: number = 10): Promise<FredSeriesResult> {
    const apiKey = getApiKey();
    if (!apiKey) {
      logger.warn('FRED_API_KEY not configured');
      return { series: [], count: 0, offset: 0, limit };
    }

    const cacheKey = `fred-search:${keywords}:${limit}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const params = new URLSearchParams({
            api_key: apiKey,
            file_type: 'json',
            search_text: keywords,
            limit: String(limit),
          });

          const url = `${BASE_URL}/series/search?${params.toString()}`;
          logger.info('Searching FRED series', { keywords });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            throw new Error(`FRED API returned ${response.status}`);
          }

          const data: FredAPISeriesResponse = await response.json();

          return {
            series: (data.seriess ?? []).map(transformSeries),
            count: data.count,
            offset: data.offset,
            limit: data.limit,
          };
        },
        3600 // 1 hour
      );
    } catch (error) {
      logger.error('FRED series search failed', error as Error, { keywords });
      return { series: [], count: 0, offset: 0, limit };
    }
  }

  /**
   * Get observations (data points) for a specific series
   */
  async getSeriesObservations(
    seriesId: string,
    opts?: { startDate?: string; endDate?: string; limit?: number }
  ): Promise<FredObservation[]> {
    const apiKey = getApiKey();
    if (!apiKey) {
      logger.warn('FRED_API_KEY not configured');
      return [];
    }

    const cacheKey = `fred-obs:${seriesId}:${opts?.startDate ?? ''}:${opts?.endDate ?? ''}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const params = new URLSearchParams({
            api_key: apiKey,
            file_type: 'json',
            series_id: seriesId,
            sort_order: 'desc',
          });
          if (opts?.startDate) params.set('observation_start', opts.startDate);
          if (opts?.endDate) params.set('observation_end', opts.endDate);
          if (opts?.limit) params.set('limit', String(opts.limit));

          const url = `${BASE_URL}/series/observations?${params.toString()}`;
          logger.info('Fetching FRED observations', { seriesId });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            throw new Error(`FRED API returned ${response.status}`);
          }

          const data: FredAPIObservationsResponse = await response.json();
          return parseObservations(data);
        },
        3600 // 1 hour
      );
    } catch (error) {
      logger.error('Failed to fetch FRED observations', error as Error, { seriesId });
      return [];
    }
  }

  /**
   * Get state unemployment rate time series
   */
  async getStateUnemployment(stateAbbrev: string): Promise<FredObservation[]> {
    const seriesId = STATE_SERIES.unemployment(stateAbbrev.toUpperCase());
    return this.getSeriesObservations(seriesId, { limit: 60 });
  }

  /**
   * Get state GDP time series
   */
  async getStateGDP(stateAbbrev: string): Promise<FredObservation[]> {
    const seriesId = STATE_SERIES.gdp(stateAbbrev.toUpperCase());
    return this.getSeriesObservations(seriesId, { limit: 20 });
  }

  /**
   * Get all pre-mapped economic indicators for a state
   */
  async getStateIndicators(stateAbbrev: string): Promise<StateEconomicIndicator[]> {
    const state = stateAbbrev.toUpperCase();
    const apiKey = getApiKey();
    if (!apiKey) {
      logger.warn('FRED_API_KEY not configured — cannot fetch state indicators');
      return [];
    }

    const cacheKey = `fred-state-indicators:${state}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const indicatorConfigs: Array<{
            seriesId: string;
            name: string;
            category: StateEconomicIndicator['category'];
          }> = [
            { seriesId: STATE_SERIES.unemployment(state), name: 'Unemployment Rate', category: 'employment' },
            { seriesId: STATE_SERIES.gdp(state), name: 'Gross State Product', category: 'gdp' },
            { seriesId: STATE_SERIES.personalIncome(state), name: 'Total Personal Income', category: 'income' },
            { seriesId: STATE_SERIES.laborForce(state), name: 'Civilian Labor Force', category: 'employment' },
          ];

          const indicators: StateEconomicIndicator[] = [];

          for (const config of indicatorConfigs) {
            try {
              // Fetch series metadata
              const metaParams = new URLSearchParams({
                api_key: apiKey,
                file_type: 'json',
                series_id: config.seriesId,
              });
              const metaResponse = await rateLimitedFetch(
                `${BASE_URL}/series?${metaParams.toString()}`
              );

              if (!metaResponse.ok) {
                logger.warn('FRED series not found', { seriesId: config.seriesId });
                continue;
              }

              const metaData: FredAPISeriesResponse = await metaResponse.json();
              const seriesMeta = metaData.seriess?.[0];
              if (!seriesMeta) continue;

              // Fetch recent observations
              const observations = await this.getSeriesObservations(config.seriesId, {
                limit: 24,
              });

              const latest = observations[0];
              const previous = observations[1];

              let changePercent: number | null = null;
              if (latest?.value != null && previous?.value != null && previous.value !== 0) {
                changePercent = ((latest.value - previous.value) / Math.abs(previous.value)) * 100;
                changePercent = Math.round(changePercent * 100) / 100;
              }

              indicators.push({
                seriesId: config.seriesId,
                name: config.name,
                category: config.category,
                latestValue: latest?.value ?? null,
                latestDate: latest?.date ?? '',
                previousValue: previous?.value ?? null,
                previousDate: previous?.date ?? '',
                changePercent,
                units: seriesMeta.units,
                frequency: seriesMeta.frequency,
                observations: observations.slice(0, 12).reverse(), // last 12, chronological
              });
            } catch (error) {
              logger.warn('Failed to fetch indicator', { seriesId: config.seriesId, error });
            }
          }

          return indicators;
        },
        3600 // 1 hour
      );
    } catch (error) {
      logger.error('Failed to fetch state indicators', error as Error, { state });
      return [];
    }
  }
}

export const fredEconomicService = new FredEconomicService();
