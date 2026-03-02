/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * STOCK Act Financial Disclosure Types
 *
 * The STOCK Act (Stop Trading on Congressional Knowledge Act) of 2012
 * requires members of Congress to disclose securities transactions
 * over $1,000 within 45 days via Periodic Transaction Reports (PTRs).
 *
 * Data source: U.S. House Office of the Clerk
 * @see {@link https://disclosures-clerk.house.gov}
 */

/** A single stock trade from a Periodic Transaction Report (PTR) */
export interface StockTrade {
  filingId: string;
  bioguideId: string;
  memberName: string;
  stateDistrict: string;
  owner: 'Self' | 'Spouse' | 'Joint' | 'Dependent Child' | string;
  assetDescription: string;
  ticker: string | null;
  assetType: string;
  transactionType: 'Purchase' | 'Sale' | 'Sale (Full)' | 'Sale (Partial)' | 'Exchange' | string;
  transactionDate: string;
  filingDate: string;
  amount: string;
  capitalGainsOver200: boolean;
  sourceUrl: string;
}

/** API response shape for /api/representative/[bioguideId]/stock-trades */
export interface StockTradeResponse {
  trades: StockTrade[];
  member: {
    bioguideId: string;
    name: string;
    stateDistrict: string;
  };
  metadata: {
    dataSource: string;
    lastUpdated: string;
    totalFilings: number;
    coveragePeriod: string;
    note: string;
  };
}

/** XML index entry from House Clerk annual Financial Disclosure ZIP */
export interface HouseClerkFiling {
  first: string;
  last: string;
  filingType: string;
  stateDst: string;
  year: string;
  filingDate: string;
  docId: string;
}
