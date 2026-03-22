/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FBI Crime Data Explorer (CDE) Service
 *
 * Queries the FBI Uniform Crime Reporting (UCR) API for state-level crime
 * statistics and trends. Uses the shared Data.gov rate limiter since it
 * shares DATA_GOV_API_KEY with Regulations.gov.
 *
 * API: https://api.usa.gov/crime/fbi/cde/
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { getDataGovApiKey, dataGovRateLimitedFetch } from './data-gov-rate-limiter';
import type {
  FbiCrimeStats,
  FbiCrimeTrend,
  FbiOffenseCode,
  FbiSummarizedResponse,
  MonthlyData,
} from '@/types/fbi-ucr';

const BASE_URL = 'https://api.usa.gov/crime/fbi/cde';
const CACHE_TTL = 86400; // 24 hours — crime data updates infrequently

/** All standard SRS offense codes to query for a full state profile */
const STANDARD_OFFENSES: FbiOffenseCode[] = [
  'violent-crime',
  'property-crime',
  'HOM',
  'RPE',
  'ROB',
  'ASS',
  'BUR',
  'LAR',
  'MVT',
  'ARS',
];

/**
 * Sum monthly values for a given year from a MonthlyData map.
 * Keys are "MM-YYYY" format.
 */
function sumYear(data: MonthlyData, year: number): number {
  let total = 0;
  for (const [key, value] of Object.entries(data)) {
    const parts = key.split('-');
    if (parts.length === 2 && parseInt(parts[1]!, 10) === year) {
      total += value;
    }
  }
  return total;
}

/**
 * Get the last available value for a year from monthly data.
 * Used for population and coverage which are cumulative.
 */
function lastValueForYear(data: MonthlyData, year: number): number {
  let last = 0;
  for (const [key, value] of Object.entries(data)) {
    const parts = key.split('-');
    if (parts.length === 2 && parseInt(parts[1]!, 10) === year) {
      last = value;
    }
  }
  return last;
}

/**
 * Find the data series key that contains a given label (case-insensitive).
 */
function findSeriesKey(data: Record<string, MonthlyData>, label: string): string | undefined {
  return Object.keys(data).find(k => k.toLowerCase().includes(label.toLowerCase()));
}

export class FbiUcrService {
  /**
   * Get crime statistics for a state in a given year.
   * Queries multiple offense types and aggregates annual totals.
   */
  async getCrimeStatsByState(
    stateAbbrev: string,
    year?: number
  ): Promise<FbiCrimeStats | null> {
    const apiKey = getDataGovApiKey();
    if (!apiKey) {
      logger.warn('DATA_GOV_API_KEY not configured');
      return null;
    }

    const state = stateAbbrev.toUpperCase();
    const targetYear = year ?? new Date().getFullYear() - 1;
    const cacheKey = `fbi-crime-stats:${state}:${targetYear}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          // Query violent-crime and property-crime for the overview
          const offensesToQuery: FbiOffenseCode[] = ['violent-crime', 'property-crime'];
          const results = await Promise.all(
            offensesToQuery.map(offense => this.fetchSummarized(state, offense, targetYear, apiKey))
          );

          const offenses: FbiCrimeStats['offenses'] = {};
          const nationalComparison: FbiCrimeStats['nationalComparison'] = {};
          let population = 0;
          let coveragePercent = 0;

          for (let i = 0; i < offensesToQuery.length; i++) {
            const offense = offensesToQuery[i]!;
            const data = results[i];
            if (!data) continue;

            const stateOffenseKey = findSeriesKey(data.offenses.actuals, `${state} Offenses`)
              ?? findSeriesKey(data.offenses.actuals, state);
            const stateClearanceKey = findSeriesKey(data.offenses.actuals, `${state} Clearances`)
              ?? findSeriesKey(data.offenses.actuals, 'Clearances');
            const stateRateKey = findSeriesKey(data.offenses.rates, `${state} Offenses`)
              ?? findSeriesKey(data.offenses.rates, state);
            const nationalRateKey = findSeriesKey(data.offenses.rates, 'United States');

            const actual = stateOffenseKey
              ? sumYear(data.offenses.actuals[stateOffenseKey]!, targetYear)
              : 0;
            const clearances = stateClearanceKey
              ? sumYear(data.offenses.actuals[stateClearanceKey]!, targetYear)
              : 0;
            const rate = stateRateKey
              ? sumYear(data.offenses.rates[stateRateKey]!, targetYear)
              : 0;

            offenses[offense] = { actual, rate, clearances };

            if (nationalRateKey) {
              nationalComparison[offense] = {
                rate: sumYear(data.offenses.rates[nationalRateKey]!, targetYear),
              };
            }

            // Extract population from the first successful response
            if (population === 0) {
              const popKey = findSeriesKey(data.populations.population, state);
              if (popKey) {
                population = lastValueForYear(data.populations.population[popKey]!, targetYear);
              }
              const coverageKey = findSeriesKey(
                data.tooltips['Percent of Population Coverage'],
                state
              );
              if (coverageKey) {
                coveragePercent = lastValueForYear(
                  data.tooltips['Percent of Population Coverage'][coverageKey]!,
                  targetYear
                );
              }
            }
          }

          return {
            state,
            year: targetYear,
            population,
            offenses,
            nationalComparison,
            coveragePercent,
          };
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('FbiUcrService.getCrimeStatsByState failed', error as Error);
      return null;
    }
  }

  /**
   * Get crime trend data for a state over a year range.
   * Returns monthly data points for the specified offense.
   */
  async getCrimeTrend(
    stateAbbrev: string,
    startYear: number,
    endYear: number,
    offense: FbiOffenseCode = 'violent-crime'
  ): Promise<FbiCrimeTrend[]> {
    const apiKey = getDataGovApiKey();
    if (!apiKey) {
      logger.warn('DATA_GOV_API_KEY not configured');
      return [];
    }

    const state = stateAbbrev.toUpperCase();
    const cacheKey = `fbi-crime-trend:${state}:${offense}:${startYear}-${endYear}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const data = await this.fetchSummarized(state, offense, endYear, apiKey, startYear);
          if (!data) return [];

          const stateRateKey = findSeriesKey(data.offenses.rates, `${state} Offenses`)
            ?? findSeriesKey(data.offenses.rates, state);
          const stateActualKey = findSeriesKey(data.offenses.actuals, `${state} Offenses`)
            ?? findSeriesKey(data.offenses.actuals, state);
          const nationalRateKey = findSeriesKey(data.offenses.rates, 'United States');
          const popKey = findSeriesKey(data.populations.population, state);

          if (!stateRateKey) return [];

          const stateRates = data.offenses.rates[stateRateKey]!;
          const stateActuals = stateActualKey ? data.offenses.actuals[stateActualKey]! : {};
          const nationalRates = nationalRateKey ? data.offenses.rates[nationalRateKey]! : {};
          const populations = popKey ? data.populations.population[popKey]! : {};

          const trend: FbiCrimeTrend[] = [];
          for (const [key, rate] of Object.entries(stateRates)) {
            const parts = key.split('-');
            if (parts.length !== 2) continue;
            const month = parseInt(parts[0]!, 10);
            const year = parseInt(parts[1]!, 10);
            if (year < startYear || year > endYear) continue;

            trend.push({
              year,
              month,
              stateRate: rate,
              stateActual: stateActuals[key] ?? 0,
              nationalRate: nationalRates[key] ?? 0,
              statePopulation: populations[key] ?? 0,
            });
          }

          // Sort chronologically
          trend.sort((a, b) => a.year - b.year || a.month - b.month);
          return trend;
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('FbiUcrService.getCrimeTrend failed', error as Error);
      return [];
    }
  }

  /**
   * Fetch summarized crime data from the FBI CDE API.
   */
  private async fetchSummarized(
    state: string,
    offense: FbiOffenseCode,
    endYear: number,
    apiKey: string,
    startYear?: number
  ): Promise<FbiSummarizedResponse | null> {
    const from = `01-${startYear ?? endYear}`;
    const to = `12-${endYear}`;
    const url =
      `${BASE_URL}/summarized/state/${state}/${offense}` +
      `?from=${from}&to=${to}&API_KEY=${encodeURIComponent(apiKey)}`;

    logger.info('FBI CDE summarized query', { state, offense, from, to });

    const response = await dataGovRateLimitedFetch(url);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`FBI CDE API returned ${response.status}`);
    }

    return (await response.json()) as FbiSummarizedResponse;
  }
}

export const fbiUcrService = new FbiUcrService();
