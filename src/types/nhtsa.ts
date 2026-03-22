/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * NHTSA Vehicle Safety Types
 *
 * Types for vehicle recalls and consumer complaints from NHTSA.
 *
 * API: https://api.nhtsa.gov/
 * No API key required.
 */

/** NHTSA vehicle recall */
export interface NhtsaRecall {
  campaignNumber: string;
  actionNumber: string;
  reportReceivedDate: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  notes: string;
  manufacturer: string;
  make: string;
  model: string;
  modelYear: string;
  parkIt: boolean;
  parkOutSide: boolean;
}

/** NHTSA vehicle complaint */
export interface NhtsaComplaint {
  odiNumber: number;
  manufacturer: string;
  make: string;
  model: string;
  modelYear: string;
  dateOfIncident: string | null;
  dateComplaintFiled: string | null;
  numberOfInjuries: number;
  numberOfDeaths: number;
  crash: boolean;
  fire: boolean;
  component: string;
  summary: string;
}

// ── Raw API response types ──────────────────────────────────────

/** NHTSA API response envelope */
export interface NhtsaApiResponse<T> {
  Count: number;
  Message: string;
  results: T[];
}

/** Raw recall result from NHTSA API */
export interface RawNhtsaRecall {
  NHTSACampaignNumber: string;
  NHTSAActionNumber: string;
  ReportReceivedDate: string;
  Component: string;
  Summary: string;
  Consequence: string;
  Remedy: string;
  Notes: string;
  Manufacturer: string;
  Make: string;
  Model: string;
  ModelYear: string;
  parkIt: boolean;
  parkOutSide: boolean;
}

/** Raw complaint result from NHTSA API */
export interface RawNhtsaComplaint {
  odiNumber: number;
  manufacturer: string;
  crash: string;
  fire: string;
  numberOfInjuries: number;
  numberOfDeaths: number;
  dateOfIncident: string;
  dateComplaintFiled: string;
  vin: string;
  components: string;
  summary: string;
  products: Array<{
    type: string;
    make: string;
    model: string;
    year: string;
  }>;
}
