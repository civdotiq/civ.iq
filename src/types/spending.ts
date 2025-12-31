/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * USAspending.gov Types
 *
 * Types for federal spending data including contracts, grants,
 * and aggregate spending by congressional district.
 *
 * API Documentation: https://api.usaspending.gov/
 */

// Award types
export type AwardTypeCode =
  | 'A' // BPA Call
  | 'B' // Purchase Order
  | 'C' // Delivery Order
  | 'D' // Definitive Contract
  | '02' // Block Grant
  | '03' // Formula Grant
  | '04' // Project Grant
  | '05' // Cooperative Agreement
  | '06' // Direct Payment for Specified Use
  | '07' // Direct Loan
  | '08' // Guaranteed/Insured Loan
  | '09' // Insurance
  | '10' // Direct Payment with Unrestricted Use
  | '11'; // Other Financial Assistance

// Simplified award for display
export interface FederalAward {
  id: string;
  internalId: number;
  recipientName: string;
  amount: number;
  type: 'contract' | 'grant' | 'loan' | 'other';
  typeDescription: string | null;
  agency: string;
  agencySlug: string;
  startDate: string;
  description: string;
  url: string;
}

// District spending summary
export interface DistrictSpendingSummary {
  districtId: string;
  displayName: string;
  state: string;
  districtNumber: string;
  fiscalYear: number;
  totalSpending: number;
  contractSpending: number;
  grantSpending: number;
  loanSpending: number;
  otherSpending: number;
  topRecipients: Array<{
    name: string;
    amount: number;
    awardCount: number;
  }>;
  topAgencies: Array<{
    name: string;
    amount: number;
    awardCount: number;
  }>;
  perCapita: number | null;
  population: number | null;
}

// District spending response
export interface DistrictSpendingResponse {
  success: boolean;
  summary: DistrictSpendingSummary | null;
  recentContracts: FederalAward[];
  recentGrants: FederalAward[];
  metadata: {
    generatedAt: string;
    dataSource: string;
    fiscalYear: number;
    cacheHit?: boolean;
  };
  error?: string;
}

// Geographic spending from USAspending
export interface GeographicSpendingResult {
  shapeCode: string;
  displayName: string;
  aggregatedAmount: number;
  population: number | null;
  perCapita: number | null;
}

// Geographic spending response
export interface GeographicSpendingResponse {
  success: boolean;
  scope: 'place_of_performance' | 'recipient_location';
  geoLayer: 'state' | 'county' | 'district';
  fiscalYear: number;
  results: GeographicSpendingResult[];
  metadata: {
    generatedAt: string;
    dataSource: string;
  };
  error?: string;
}

// Raw API response types from USAspending
export interface USASpendingAwardResult {
  internal_id: number;
  'Award ID': string;
  'Recipient Name': string;
  'Award Amount': number;
  'Award Type': string | null;
  'Awarding Agency': string;
  'Start Date': string;
  Description: string;
  awarding_agency_id: number;
  agency_slug: string;
  generated_internal_id: string;
}

export interface USASpendingAwardResponse {
  spending_level: string;
  limit: number;
  results: USASpendingAwardResult[];
  page_metadata: {
    page: number;
    hasNext: boolean;
    last_record_unique_id: number;
    last_record_sort_value: string;
  };
  messages?: string[];
}

export interface USASpendingGeographyResult {
  shape_code: string;
  display_name: string;
  aggregated_amount: number;
  population: number | null;
  per_capita: number | null;
}

export interface USASpendingGeographyResponse {
  scope: string;
  geo_layer: string;
  spending_level: string;
  results: USASpendingGeographyResult[];
}
