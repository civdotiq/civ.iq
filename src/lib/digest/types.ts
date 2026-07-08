/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Weekly digest types.
 *
 * A digest issue is a factual, week-scoped compilation: roll-call votes
 * with the Michigan delegation's positions, bills that moved, and new
 * FEC filings from delegation committees. Facts and citations only — no
 * narrative, no scoring (infrastructure, not investigation).
 */

export interface DigestMemberPosition {
  bioguideId: string;
  name: string;
  party: string;
  /** House district number, absent for senators */
  district?: string;
  position: string;
}

export interface DigestVote {
  voteId: string;
  chamber: 'House' | 'Senate';
  date: string;
  question: string;
  result: string;
  yeas: number;
  nays: number;
  bill?: {
    billId: string;
    title?: string;
  };
  sourceUrl?: string;
  /** Michigan delegation positions for this roll call */
  miPositions: DigestMemberPosition[];
  /**
   * AI plain-language meaning (vote-meaning.ts): what was decided and
   * what each position supported. Absent when generation is
   * unavailable — the page falls back to the deterministic glossary.
   */
  meaning?: {
    decided: string;
    yeaMeant: string;
    nayMeant: string;
    readingLevel: number;
    confidence: number;
    source: 'ai-generated';
    generatedAt: string;
  };
}

export interface DigestBill {
  billId: string;
  congress: number;
  type: string;
  number: string;
  title: string;
  latestActionDate: string;
  latestActionText: string;
  introducedDate?: string;
  congressDotGovUrl?: string;
  /**
   * Plain-language summary reused from the bill-summarizer cache (never
   * generated here). Carries the intelligence-layer provenance fields.
   */
  aiSummary?: {
    whatItDoes: string;
    confidence: number;
    source: string;
    lastUpdated: string;
  };
}

export interface DigestFiling {
  fileNumber: number;
  committeeId: string;
  committeeName?: string;
  /** Delegation member the filing belongs to */
  bioguideId: string;
  memberName: string;
  party: string;
  chamber: 'House' | 'Senate';
  formType?: string;
  reportType?: string;
  receiptDate: string;
  coverageStart?: string;
  coverageEnd?: string;
  totalReceipts?: number;
  totalDisbursements?: number;
  fecUrl: string;
}

export interface DigestDelegationMember {
  bioguideId: string;
  name: string;
  party: string;
  chamber: 'House' | 'Senate';
  district?: string;
}

export interface DigestIssue {
  weekId: string;
  /** ISO dates for the Monday–Sunday window */
  weekStart: string;
  weekEnd: string;
  /** Featured state (MI while the digest is Michigan-flavored) */
  state: string;
  stateName: string;
  delegation: DigestDelegationMember[];
  votes: DigestVote[];
  bills: DigestBill[];
  filings: DigestFiling[];
  /** Sections that failed upstream; shown as "data unavailable", never faked */
  unavailable: Array<'votes' | 'bills' | 'filings'>;
  generatedAt: string;
}
