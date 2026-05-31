/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Influence Feature Types - "Follow the Money"
 *
 * TypeScript interfaces for committee/PAC search, profiles,
 * and recipient resolution against CIV.IQ representative data.
 */

/** Committee search result from FEC /committees/?q={name} */
export interface FECCommitteeSearchResult {
  committee_id: string;
  name: string;
  committee_type: string;
  committee_type_full: string;
  designation: string;
  designation_full: string;
  party: string;
  state: string;
  treasurer_name: string;
  cycles: number[];
  candidate_ids: string[];
}

/** Financial totals from FEC /committee/{id}/totals/ */
export interface FECCommitteeTotals {
  cycle: number;
  receipts: number;
  disbursements: number;
  last_cash_on_hand_end_period: number;
  individual_contributions: number;
  other_political_committee_contributions: number;
  independent_expenditures: number;
  contributions: number;
  coverage_start_date: string;
  coverage_end_date: string;
}

/** Aggregated Schedule B record from /schedules/schedule_b/by_recipient_id/ */
export interface FECDisbursementByRecipient {
  recipient_id: string;
  recipient_name: string;
  total: number;
  count: number;
  committee_id: string;
  cycle: number;
  memo_total: number;
  memo_count: number;
}

/** Individual Schedule B record from /schedules/schedule_b/ */
export interface FECDisbursementRecord {
  recipient_name: string;
  disbursement_amount: number;
  disbursement_date: string;
  candidate_office: string;
  candidate_office_state: string;
  candidate_office_district: string;
  recipient_committee_id: string;
  recipient_state: string;
  disbursement_description: string;
  memo_text: string;
  line_number: string;
}

/** A recipient resolved and linked to a CIV.IQ representative profile */
export interface ResolvedRecipient {
  recipientName: string;
  recipientCommitteeId: string;
  candidateId: string | null;
  bioguideId: string | null;
  totalAmount: number;
  transactionCount: number;
  party: string | null;
  state: string | null;
  chamber: 'House' | 'Senate' | null;
  district: string | null;
  isEarmarked: boolean;
  civiqProfileLink: string | null;
}

/** Full committee profile for detail page */
export interface CommitteeProfile {
  committee: {
    committeeId: string;
    name: string;
    type: string;
    typeFull: string;
    designation: string;
    designationFull: string;
    party: string;
    state: string;
    treasurerName: string;
    cycles: number[];
    fecUrl: string;
  };
  totals: {
    cycle: number;
    receipts: number;
    disbursements: number;
    cashOnHand: number;
    individualContributions: number;
    otherCommitteeContributions: number;
    independentExpenditures: number;
  } | null;
  recipients: ResolvedRecipient[];
  metadata: {
    cycle: number;
    lastUpdated: string;
    totalRecipients: number;
    resolvedRecipients: number;
    fecTransparencyLink: string;
  };
}

/** Search endpoint response */
export interface CommitteeSearchResponse {
  results: FECCommitteeSearchResult[];
  query: string;
  pagination: {
    page: number;
    perPage: number;
    totalPages: number;
    totalResults: number;
  };
}
