/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FRED (Federal Reserve Economic Data) Types
 *
 * Types for the FRED API from the Federal Reserve Bank of St. Louis.
 * Provides economic indicators at state and metro-area level.
 *
 * API Documentation: https://fred.stlouisfed.org/docs/api/fred/
 */

/** A single FRED data series */
export interface FredSeries {
  id: string;
  title: string;
  observationStart: string;
  observationEnd: string;
  frequency: string;
  frequencyShort: string;
  units: string;
  unitsShort: string;
  seasonalAdjustment: string;
  seasonalAdjustmentShort: string;
  lastUpdated: string;
  notes: string;
}

/** Search results from FRED series search */
export interface FredSeriesResult {
  series: FredSeries[];
  count: number;
  offset: number;
  limit: number;
}

/** A single observation (data point) in a series */
export interface FredObservation {
  date: string;
  value: number | null;
}

/** Raw FRED API response for series search */
export interface FredAPISeriesResponse {
  realtime_start: string;
  realtime_end: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  seriess: Array<{
    id: string;
    realtime_start: string;
    realtime_end: string;
    title: string;
    observation_start: string;
    observation_end: string;
    frequency: string;
    frequency_short: string;
    units: string;
    units_short: string;
    seasonal_adjustment: string;
    seasonal_adjustment_short: string;
    last_updated: string;
    notes: string;
  }>;
}

/** Raw FRED API response for observations */
export interface FredAPIObservationsResponse {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: Array<{
    realtime_start: string;
    realtime_end: string;
    date: string;
    value: string;
  }>;
}

/** Pre-mapped economic indicator for a state */
export interface StateEconomicIndicator {
  seriesId: string;
  name: string;
  category: 'employment' | 'income' | 'gdp' | 'housing';
  latestValue: number | null;
  latestDate: string;
  previousValue: number | null;
  previousDate: string;
  changePercent: number | null;
  units: string;
  frequency: string;
  observations: FredObservation[];
}

/** API response for economic indicators endpoint */
export interface EconomicIndicatorsResponse {
  success: boolean;
  state: string;
  indicators: StateEconomicIndicator[];
  metadata: {
    dataSource: string;
    generatedAt: string;
    fredApiAvailable: boolean;
  };
  error?: string;
}
