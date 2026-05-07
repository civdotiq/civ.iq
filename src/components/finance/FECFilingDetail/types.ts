/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export type Party = 'D' | 'R' | 'I' | 'O';

export interface FilingDisbursementCategory {
  label: string;
  amount: number;
  pct: number;
}

export interface FundingMixSlice {
  label: string;
  pct: number;
  color: string;
}

export interface FECFilingDetailData {
  fileNumber: number;
  committeeId: string;
  committeeName: string;
  committeeType: string | null;
  candidateName: string | null;
  candidateOffice: string | null;
  treasurerName: string | null;
  party: Party;
  formType: string;
  reportType: string | null;
  reportTypeFull: string | null;
  reportYear: number | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  receiptDate: string | null;
  amended: boolean;
  totalReceipts: number;
  totalDisbursements: number;
  cashOnHandBegin: number;
  cashOnHandEnd: number;
  contributionsIndividual: number;
  contributionsUnitemized: number;
  contributionsParty: number;
  contributionsPac: number;
  fundingMix: FundingMixSlice[];
  pdfUrl: string | null;
  htmlUrl: string | null;
}
