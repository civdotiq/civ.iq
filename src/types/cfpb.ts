/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CFPB Consumer Complaint Database Types
 *
 * Types for the Consumer Financial Protection Bureau complaint data.
 *
 * API: https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/
 * No API key required.
 */

/** Consumer complaint record */
export interface CfpbComplaint {
  complaintId: string;
  dateReceived: string;
  product: string;
  subProduct: string | null;
  issue: string;
  subIssue: string | null;
  company: string;
  state: string | null;
  zipCode: string | null;
  submittedVia: string;
  companyResponse: string;
  timely: boolean;
  consumerDisputed: string | null;
  dateSentToCompany: string | null;
  hasNarrative: boolean;
}

/** Aggregated complaint statistics for a state or query */
export interface CfpbComplaintAggregates {
  total: number;
  byProduct: Array<{ product: string; count: number }>;
  byCompany: Array<{ company: string; count: number }>;
  byIssue: Array<{ issue: string; count: number }>;
  byTimely: { yes: number; no: number };
  bySubmittedVia: Array<{ channel: string; count: number }>;
}

/** Search parameters for CFPB complaint queries */
export interface CfpbSearchParams {
  company?: string;
  product?: string;
  state?: string;
  dateReceivedMin?: string; // YYYY-MM-DD
  dateReceivedMax?: string; // YYYY-MM-DD
  issue?: string;
  size?: number;
  from?: number;
  sort?: 'created_date_desc' | 'created_date_asc' | 'relevance_desc' | 'relevance_asc';
}

// ── Raw API response types ──────────────────────────────────────

/** Raw complaint from CFPB API _source field */
export interface CfpbRawComplaint {
  complaint_id: string;
  date_received: string;
  product: string;
  sub_product: string | null;
  issue: string;
  sub_issue: string | null;
  company: string;
  state: string | null;
  zip_code: string | null;
  submitted_via: string;
  company_response: string;
  timely: string;
  consumer_disputed: string | null;
  date_sent_to_company: string | null;
  has_narrative: boolean;
}

/** Aggregation bucket from CFPB API */
export interface CfpbAggBucket {
  key: string;
  doc_count: number;
}

/** Raw CFPB API search response envelope */
export interface CfpbSearchResponse {
  hits: {
    total: { value: number; relation: string };
    hits: Array<{
      _source: CfpbRawComplaint;
    }>;
  };
  aggregations?: Record<
    string,
    {
      doc_count_error_upper_bound?: number;
      buckets: CfpbAggBucket[];
    }
  >;
}
