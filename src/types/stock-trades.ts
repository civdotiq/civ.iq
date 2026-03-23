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

/**
 * House Clerk PTR asset type codes.
 * @see https://disclosures-clerk.house.gov
 */
export const ASSET_TYPE_CODES: Record<string, string> = {
  '4K': '401K',
  '5C': '529 College Savings',
  '5F': '529 Prepaid Tuition',
  '5P': '529 Plan',
  AB: 'Asset-Backed Securities',
  BA: 'Bank Accounts',
  BK: 'Brokerage Account',
  CO: 'Collectibles',
  CS: 'Corporate Securities',
  CT: 'Cryptocurrency',
  DB: 'Defined Benefit Plan',
  DO: 'Debts Owed',
  DS: 'Delaware Statutory Trust',
  EF: 'Exchange-Traded Fund',
  EQ: 'Blind Trust',
  ET: 'Exchange-Traded Notes',
  FA: 'Farm',
  FE: 'Foreign Exchange',
  FN: 'Fixed Annuity',
  FU: 'Futures',
  GS: 'Government Securities',
  HE: 'Hedge Fund',
  HN: 'Hedge Fund (Non-Public)',
  IC: 'Investment Club',
  IH: 'IRA Cash Holdings',
  IP: 'Intellectual Property',
  IR: 'IRA',
  MA: 'Managed Account',
  MF: 'Mutual Fund',
  MO: 'Mineral/Oil Rights',
  OI: 'Ownership Interest (Private)',
  OL: 'Ownership Interest (LLC)',
  OP: 'Stock Options',
  OT: 'Other',
  PE: 'Pension',
  PM: 'Precious Metals',
  PS: 'Private Stock',
  RE: 'Real Estate Investment Trust',
  RF: 'REIT Fund',
  RN: 'REIT (Non-Traded)',
  RP: 'Real Property',
  RS: 'Restricted Stock Units',
  SA: 'Stock Appreciation Rights',
  ST: 'Stock',
  TR: 'Trust',
  VA: 'Variable Annuity',
  VI: 'Variable Insurance',
  WU: 'Whole Life Insurance',
};

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
  assetTypeLabel: string;
  transactionType: 'Purchase' | 'Sale' | 'Sale (Full)' | 'Sale (Partial)' | 'Exchange' | string;
  transactionDate: string;
  filingDate: string;
  amount: string;
  capitalGainsOver200: boolean;
  isPaperFiling: boolean;
  daysToDisclose: number;
  isLateFiling: boolean;
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
