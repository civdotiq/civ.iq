/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * EIA (Energy Information Administration) Types
 *
 * Types for state energy profiles and production data.
 *
 * API: https://api.eia.gov/v2/
 * Requires EIA_API_KEY.
 */

/** State energy profile summary */
export interface EiaStateEnergyProfile {
  state: string;
  stateDescription: string;
  totalConsumption: number | null;
  totalProduction: number | null;
  electricityGeneration: number | null;
  renewablePercentage: number | null;
  topSources: Array<{ source: string; amount: number; unit: string }>;
  period: string;
}

/** Energy production data point */
export interface EiaEnergyProduction {
  state: string;
  source: string;
  sourceDescription: string;
  amount: number;
  unit: string;
  period: string;
}

// ── Raw API response types ──────────────────────────────────────

/** EIA API v2 response envelope */
export interface EiaApiResponse {
  response: {
    total: number;
    dateFormat: string;
    frequency: string;
    data: RawEiaDataPoint[];
    description?: string;
  };
}

/** Raw EIA data point */
export interface RawEiaDataPoint {
  period: string;
  stateid: string;
  stateDescription: string;
  sectorid?: string;
  sectorDescription?: string;
  fueltypeid?: string;
  fuelTypeDescription?: string;
  seriesDescription?: string;
  value: number | null;
  unit?: string;
  'value-units'?: string;
}
