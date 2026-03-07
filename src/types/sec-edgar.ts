/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * SEC EDGAR Types
 *
 * Types for SEC EDGAR API data including company profiles,
 * Form 4 insider trading filings, and financial facts.
 *
 * API Documentation: https://www.sec.gov/edgar/sec-api-documentation
 */

/** SEC company profile from EDGAR */
export interface SecCompanyProfile {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  category: string;
  stateOfIncorporation: string;
  fiscalYearEnd: string;
  filings?: {
    recent: SecRecentFilings;
  };
}

/** Recent filings metadata from company profile */
export interface SecRecentFilings {
  accessionNumber: string[];
  filingDate: string[];
  reportDate: string[];
  form: string[];
  primaryDocument: string[];
  primaryDocDescription: string[];
}

/** A single SEC filing record */
export interface SecFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
  primaryDocument: string;
  description: string;
}

/** Form 4 insider transaction (ownership change) */
export interface SecForm4Transaction {
  ownerName: string;
  ownerCik: string;
  isDirector: boolean;
  isOfficer: boolean;
  officerTitle: string;
  issuerName: string;
  issuerCik: string;
  issuerTicker: string;
  transactionDate: string;
  transactionCode: string;
  sharesAmount: number;
  pricePerShare: number | null;
  sharesOwnedFollowing: number;
  directOrIndirect: 'D' | 'I';
  filingDate: string;
  accessionNumber: string;
}

/** EDGAR full-text search result */
export interface SecSearchResult {
  query: string;
  hits: Array<{
    id: string;
    accessionNumber: string;
    fileDate: string;
    formType: string;
    entityName: string;
    fileNumber: string;
    periodOfReport: string;
  }>;
  total: number;
}

/** Company financial facts (XBRL data) */
export interface SecCompanyFacts {
  cik: number;
  entityName: string;
  facts: Record<
    string,
    Record<
      string,
      {
        label: string;
        description: string;
        units: Record<
          string,
          Array<{
            val: number;
            accn: string;
            fy: number;
            fp: string;
            form: string;
            filed: string;
            end: string;
            start?: string;
          }>
        >;
      }
    >
  >;
}

/** API response for SEC filings endpoint */
export interface SecFilingsResponse {
  success: boolean;
  filings: SecFiling[];
  form4Transactions: SecForm4Transaction[];
  company: {
    cik: string;
    name: string;
    tickers: string[];
  } | null;
  metadata: {
    dataSource: string;
    generatedAt: string;
    totalFilings: number;
  };
  error?: string;
}
