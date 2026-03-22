/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FBI Crime Data Explorer (CDE) Types
 *
 * Types for the FBI Uniform Crime Reporting (UCR) program data.
 *
 * API: https://api.usa.gov/crime/fbi/cde/
 * - Summarized crime: /summarized/state/{stateAbbr}/{offense}
 * - Agency lookup: /agency/byStateAbbr/{stateAbbr}
 */

/** Offense codes for the summarized crime endpoint */
export type FbiOffenseCode =
  | 'violent-crime'
  | 'property-crime'
  | 'HOM' // Homicide
  | 'RPE' // Rape
  | 'ROB' // Robbery
  | 'ASS' // Aggravated Assault
  | 'BUR' // Burglary
  | 'LAR' // Larceny-theft
  | 'MVT' // Motor Vehicle Theft
  | 'ARS'; // Arson

/** Processed state crime statistics for a single year */
export interface FbiCrimeStats {
  state: string;
  year: number;
  population: number;
  offenses: Record<
    string,
    {
      actual: number;
      rate: number; // per 100,000
      clearances: number;
    }
  >;
  nationalComparison: Record<
    string,
    {
      rate: number; // per 100,000
    }
  >;
  coveragePercent: number;
}

/** Crime trend data point */
export interface FbiCrimeTrend {
  year: number;
  month: number;
  stateRate: number; // per 100,000
  stateActual: number;
  nationalRate: number; // per 100,000
  statePopulation: number;
}

// ── Raw API response types ──────────────────────────────────────

/** Monthly keyed data: { "01-2022": number, "02-2022": number, ... } */
export type MonthlyData = Record<string, number>;

/** Raw summarized crime response from FBI CDE API */
export interface FbiSummarizedResponse {
  offenses: {
    rates: Record<string, MonthlyData>;
    actuals: Record<string, MonthlyData>;
  };
  tooltips: {
    leftYAxisHeaders: {
      yAxisHeaderRates: string;
      yAxisHeaderActual: string;
    };
    'Percent of Population Coverage': Record<string, MonthlyData>;
  };
  populations: {
    population: Record<string, MonthlyData>;
    participated_population: Record<string, MonthlyData>;
  };
  cde_properties: {
    max_data_date: Record<string, string>;
    last_refresh_date: Record<string, string>;
  };
}
