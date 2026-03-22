/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Treasury Fiscal Data Types
 *
 * Types for federal debt, revenue, and spending data from
 * the Bureau of the Fiscal Service.
 *
 * API: https://api.fiscaldata.treasury.gov/services/api/fiscal_service/
 * No API key required.
 */

/** Federal debt summary */
export interface FederalDebt {
  totalPublicDebtOutstanding: number;
  debtHeldByPublic: number;
  intragovernmentalHoldings: number;
  recordDate: string;
}

/** Monthly revenue record */
export interface MonthlyRevenue {
  recordDate: string;
  currentMonthNetReceipts: number;
  fiscalYearToDateNetReceipts: number;
  category: string;
}

/** Spending category record */
export interface SpendingCategory {
  recordDate: string;
  category: string;
  currentMonthOutlays: number;
  fiscalYearToDateOutlays: number;
}

// ── Raw API response types ──────────────────────────────────────

/** Treasury Fiscal Data API response envelope */
export interface TreasuryFiscalApiResponse<T> {
  data: T[];
  meta: {
    count: number;
    labels: Record<string, string>;
    dataTypes: Record<string, string>;
    dataFormats: Record<string, string>;
    'total-count': number;
    'total-pages': number;
  };
  links: {
    self: string;
    first: string;
    prev: string | null;
    next: string | null;
    last: string;
  };
}

/** Raw debt record from Treasury API */
export interface RawTreasuryDebt {
  record_date: string;
  tot_pub_debt_out_amt: string;
  debt_held_public_amt: string;
  intragov_hold_amt: string;
}

/** Raw monthly Treasury statement receipt */
export interface RawTreasuryReceipt {
  record_date: string;
  current_month_net_rcpt_amt: string;
  fytd_net_rcpt_amt: string;
  classification_desc: string;
}

/** Raw monthly Treasury statement outlay */
export interface RawTreasuryOutlay {
  record_date: string;
  classification_desc: string;
  current_month_gross_outly_amt: string;
  fytd_gross_outly_amt: string;
}
