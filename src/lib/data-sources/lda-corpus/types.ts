/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Types for the LDA corpus mirror — a complete (not sampled) aggregation of
 * Senate lobbying disclosures, built by scripts/sync-lda-corpus.ts and read by
 * the app at request time (Phase 2). See PLAN-lobbying-corpus-2026-07.md.
 */

/** A raw LD-2 filing row from the Senate LDA REST API list endpoint. */
export interface RawApiFiling {
  filing_uuid: string;
  filing_year: number;
  filing_period: string;
  filing_type: string;
  filing_type_display?: string;
  dt_posted: string;
  income: string | null;
  expenses: string | null;
  registrant: { id: number | string; name: string } | null;
  client: { id: number | string; name: string } | null;
  lobbying_activities?: Array<{
    general_issue_code?: string | null;
    government_entities?: Array<{ id?: number | string; name: string }> | null;
  }> | null;
}

/**
 * A normalized, amount-bearing quarterly report. Registrations (income and
 * expenses both null) are dropped during parsing — they carry no spending.
 */
export interface CompactFiling {
  filingUuid: string;
  registrantId: string;
  registrantName: string;
  clientId: string;
  clientName: string;
  filingYear: number;
  /** API filing_period, e.g. "first_quarter". */
  filingPeriod: string;
  /** Quarter key, e.g. "2025-Q1". */
  quarter: string;
  filingType: string;
  dtPosted: string;
  /** Gated amount (reportedFilingAmount); a crank filing over the caps is 0. */
  amount: number;
  /** True when the raw amount was over the plausibility cap and zeroed. */
  gated: boolean;
  issueCodes: string[];
  governmentEntities: string[];
}

/** An organization's rolled-up activity within one committee×quarter or issue×quarter. */
export interface OrgAgg {
  name: string;
  registrantId: string | null;
  amount: number;
  filings: number;
}

export interface IssueTally {
  code: string;
  label: string;
  count: number;
}

export interface CommitteeQuarterAgg {
  committeeCode: string;
  committeeName: string;
  quarter: string;
  total: number;
  filingCount: number;
  orgCount: number;
  topOrgs: OrgAgg[];
  topIssues: IssueTally[];
}

export interface IssueQuarterAgg {
  code: string;
  label: string;
  quarter: string;
  total: number;
  filingCount: number;
  orgCount: number;
  topOrgs: OrgAgg[];
}

export interface NationalQuarterAgg {
  quarter: string;
  total: number;
  filingCount: number;
  orgCount: number;
}

export interface LdaAggregates {
  generatedAt: string;
  /** Ordered quarter keys covered, oldest first, e.g. ["2024-Q2", ...]. */
  quarters: string[];
  methodology: string;
  /** dt_posted of the most recent filing in the corpus (freshness canary). */
  latestFilingPosted: string | null;
  committees: CommitteeQuarterAgg[];
  issues: IssueQuarterAgg[];
  national: NationalQuarterAgg[];
  meta: {
    totalFilingsFetched: number;
    reportFilingsUsed: number;
    gatedFilingCount: number;
    committeeMatch: 'entity-resolution+issue-jurisdiction';
  };
}
