/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export type PACType = 'superPac' | 'traditional' | 'leadership' | 'hybrid';

export interface CommitteeInfoPayload {
  committeeId: string;
  name: string;
  committeeType: string;
  committeeTypeFull: string;
  designation: string;
  party: string;
  state: string;
  cycles: number[];
  candidateIds: string[];
  sponsorCandidateIds: string[];
  treasurerName: string | null;
  pacType: PACType | null;
  dataAsOf: string;
}

export interface CommitteeTotalsPayload {
  cycle: number;
  receipts: number;
  disbursements: number;
  cashOnHand: number;
  individualContributions: number;
  otherCommitteeContributions: number;
  independentExpenditures: number;
  coverageStartDate: string | null;
  coverageEndDate: string | null;
  dataAsOf: string;
}

export interface RecipientRow {
  recipientId: string;
  recipientName: string;
  total: number;
  count: number;
}

export interface RecipientsPayload {
  committeeId: string;
  cycle: number;
  recipients: RecipientRow[];
  dataAsOf: string;
}

export interface CycleRow {
  cycle: number;
  raised: number;
  disbursed: number;
  hasData: boolean;
}

export interface CyclesPayload {
  committeeId: string;
  cycles: CycleRow[];
  dataAsOf: string;
}

export interface DonorSizeBucket {
  size: number;
  total: number;
  count: number;
}

export interface DonorsBySizePayload {
  committeeId: string;
  cycle: number;
  buckets: DonorSizeBucket[];
  dataAsOf: string;
}

export interface PACRecipientVoteRow {
  bioguideId: string;
  legislatorName: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  amountReceived: number;
  relevantVoteCount: number;
  yeaRate: number;
  /** Null when no party baseline could be computed for this recipient. */
  partyBaselineYeaRate: number | null;
  /** Null when baseline unavailable. */
  differenceFromBaseline: number | null;
}

export interface PACVoteInsightPayload {
  committeeId: string;
  committeeName: string;
  totalDisbursed: number;
  recipientCount: number;
  relevantBillCount: number;
  recipientVotes: PACRecipientVoteRow[];
  aggregateYeaRate: number;
  /** Null when no recipient had a computable party baseline. */
  aggregateBaselineYeaRate: number | null;
  confidence: number;
  dataAsOf: string;
  methodology: string;
  status?: 'complete' | 'unavailable';
}
