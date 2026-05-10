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
  dataQuality: import('./backbone-response').DataQuality;
  sourceStatus: import('./backbone-response').SourceStatus[];
  metadata: {
    generatedAt: string;
    dataSource: string;
    fiscalYear: number;
    cacheHit?: boolean;
    dataNote?: string;
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

/**
 * USASpending /awards/{id}/ response shape — only the fields the
 * SpendingContract page consumes. Many other fields exist on the live
 * payload (psc/naics hierarchies, executive_details, etc.) and can be
 * added when a new panel needs them.
 */
export interface USASpendingAwardLocation {
  state_code: string | null;
  state_name: string | null;
  city_name: string | null;
  county_name: string | null;
  country_name: string | null;
  congressional_code: string | null;
  zip5: string | null;
  address_line1: string | null;
}

export interface USASpendingAwardAgencyTier {
  name: string;
  code: string | null;
  abbreviation: string | null;
  slug?: string | null;
}

export interface USASpendingAwardAgency {
  id: number;
  has_agency_page: boolean;
  toptier_agency: USASpendingAwardAgencyTier;
  subtier_agency: USASpendingAwardAgencyTier | null;
  office_agency_name: string | null;
}

export interface USASpendingAwardRecipient {
  recipient_hash: string | null;
  recipient_name: string | null;
  recipient_uei: string | null;
  parent_recipient_name: string | null;
  parent_recipient_uei: string | null;
  business_categories: string[];
  location: USASpendingAwardLocation | null;
}

export interface USASpendingAwardPeriodOfPerformance {
  start_date: string | null;
  end_date: string | null;
  last_modified_date: string | null;
  potential_end_date: string | null;
}

export interface USASpendingAwardContractData {
  type_of_contract_pricing: string | null;
  type_of_contract_pricing_description: string | null;
  product_or_service_description: string | null;
  naics: string | null;
  naics_description: string | null;
  extent_competed_description: string | null;
}

export interface USASpendingAwardDetailResponse {
  id: number;
  generated_unique_award_id: string;
  piid: string | null;
  fain: string | null;
  uri: string | null;
  category: string | null;
  type: string | null;
  type_description: string | null;
  description: string | null;
  total_obligation: number | null;
  total_outlay: number | null;
  total_account_outlay: number | null;
  total_account_obligation: number | null;
  base_and_all_options: number | null;
  base_exercised_options: number | null;
  date_signed: string | null;
  subaward_count: number | null;
  total_subaward_amount: number | null;
  parent_award: { piid?: string | null; agency_id?: string | null } | null;
  awarding_agency: USASpendingAwardAgency;
  funding_agency: USASpendingAwardAgency | null;
  recipient: USASpendingAwardRecipient;
  place_of_performance: USASpendingAwardLocation | null;
  period_of_performance: USASpendingAwardPeriodOfPerformance;
  latest_transaction_contract_data?: USASpendingAwardContractData;
}

/** Single row from POST /search/spending_by_transaction/ */
export interface USASpendingTransactionRow {
  'Action Date': string;
  Mod: string | null;
  'Award ID': string;
  'Recipient Name': string;
  'Action Type': string | null;
  'Award Type': string | null;
  'Awarding Agency': string;
  'Transaction Amount': number;
  'Transaction Description': string | null;
  generated_internal_id: string;
  internal_id: number;
}

export interface USASpendingTransactionResponse {
  limit: number;
  results: USASpendingTransactionRow[];
  page_metadata: {
    page: number;
    next: number | null;
    previous: number | null;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  messages?: string[];
}
