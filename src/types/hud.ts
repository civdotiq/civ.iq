/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * HUD (Department of Housing and Urban Development) Types
 *
 * Types for HUD Fair Market Rents and Income Limits data.
 *
 * API: https://www.huduser.gov/hudapi/public/
 * Requires HUD_API_TOKEN (Bearer token).
 */

/** Fair Market Rent data for a county or metro area */
export interface HudFairMarketRent {
  countyName: string;
  metroName: string | null;
  metroStatus: string;
  year: number;
  efficiency: number;
  oneBedroom: number;
  twoBedroom: number;
  threeBedroom: number;
  fourBedroom: number;
}

/** Income limits for a county or metro area */
export interface HudIncomeLimit {
  countyName: string;
  metroName: string | null;
  year: number;
  medianIncome: number;
  veryLow: HudIncomeLimitBySize; // 50% AMI
  extremelyLow: HudIncomeLimitBySize; // 30% AMI
  low: HudIncomeLimitBySize; // 80% AMI
}

/** Income limit thresholds by household size (1-8 persons) */
export interface HudIncomeLimitBySize {
  person1: number;
  person2: number;
  person3: number;
  person4: number;
  person5: number;
  person6: number;
  person7: number;
  person8: number;
}

// ── Raw API response types ──────────────────────────────────────

/** Raw FMR data from HUD API */
export interface HudRawFmrResponse {
  data: {
    county_name?: string;
    town_name?: string;
    metro_name?: string;
    metro_status?: string;
    year?: number;
    basicdata: {
      Efficiency?: number;
      'One-Bedroom'?: number;
      'Two-Bedroom'?: number;
      'Three-Bedroom'?: number;
      'Four-Bedroom'?: number;
    };
  };
}

/** Raw income limits data from HUD API */
export interface HudRawIlResponse {
  data: {
    county_name?: string;
    metro_name?: string;
    year?: number;
    median_income?: number;
    very_low?: Record<string, number>;
    extremely_low?: Record<string, number>;
    low?: Record<string, number>;
  };
}
