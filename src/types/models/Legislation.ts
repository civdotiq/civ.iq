/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill/Legislation model with comprehensive type definitions
 */
export interface Bill {
  readonly id: string;
  readonly congress?: number;
  readonly billType: BillType;
  readonly number: string;
  readonly title: string;
  readonly shortTitle?: string;
  readonly officialTitle?: string;
  readonly summary?: string;
  readonly introducedDate?: string;
  readonly lastActionDate?: string;
  readonly status: BillStatus;
  readonly chamber: 'house' | 'senate' | 'joint';
  readonly sponsor?: {
    readonly bioguideId: string;
    readonly name: string;
    readonly state: string;
    readonly party: string;
  };
  readonly cosponsors?: ReadonlyArray<{
    readonly bioguideId: string;
    readonly name: string;
    readonly state: string;
    readonly party: string;
    readonly dateAdded?: string;
  }>;
  readonly committees?: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly chamber: string;
  }>;
  readonly subjects?: ReadonlyArray<string>;
  readonly policyArea?: string;
  readonly url?: string;
  readonly textUrl?: string;
  readonly voteResults?: ReadonlyArray<VoteResult>;
}

/**
 * Bill types in Congress
 */
export type BillType =
  | 'hr' // House Bill
  | 's' // Senate Bill
  | 'hjres' // House Joint Resolution
  | 'sjres' // Senate Joint Resolution
  | 'hconres' // House Concurrent Resolution
  | 'sconres' // Senate Concurrent Resolution
  | 'hres' // House Simple Resolution
  | 'sres'; // Senate Simple Resolution

/**
 * Bill status throughout the legislative process
 */
export type BillStatus =
  | 'introduced'
  | 'referred'
  | 'reported'
  | 'passed_house'
  | 'passed_senate'
  | 'failed_house'
  | 'failed_senate'
  | 'enacted'
  | 'vetoed'
  | 'pocket_vetoed'
  | 'override_attempt_failed'
  | 'withdrawn';

/**
 * Vote result for a specific bill
 */
export interface VoteResult {
  readonly voteId: string;
  readonly chamber: 'house' | 'senate';
  readonly date: string;
  readonly question: string;
  readonly result: 'passed' | 'failed' | 'agreed_to' | 'rejected';
  readonly voteType: 'recorded_vote' | 'voice_vote' | 'unanimous_consent';
  readonly totalVotes?: {
    readonly yea: number;
    readonly nay: number;
    readonly present: number;
    readonly notVoting: number;
  };
  readonly requiredMajority?: 'simple' | 'two_thirds' | 'three_fifths';
}

/**
 * Legislative action taken on a bill
 */
export interface LegislativeAction {
  readonly date: string;
  readonly chamber?: 'house' | 'senate';
  readonly actionType: string;
  readonly description: string;
  readonly committee?: string;
  readonly text?: string;
}

/**
 * Bill search parameters
 */
export interface BillSearchParams {
  readonly query?: string;
  readonly congress?: number;
  readonly billType?: BillType;
  readonly status?: BillStatus;
  readonly sponsor?: string;
  readonly subject?: string;
  readonly policyArea?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Bill summary with AI analysis
 */
export interface BillSummary {
  readonly billId: string;
  readonly title: string;
  readonly shortSummary: string;
  readonly detailedSummary?: string;
  readonly keyProvisions?: ReadonlyArray<string>;
  readonly impact?: {
    readonly scope: 'national' | 'state' | 'local';
    readonly sectors: ReadonlyArray<string>;
    readonly estimatedCost?: string;
  };
  readonly timeline?: {
    readonly introduced: string;
    readonly lastAction: string;
    readonly nextSteps?: ReadonlyArray<string>;
  };
  readonly analysisMetadata?: {
    readonly generatedAt: string;
    readonly source: 'ai' | 'manual' | 'congress';
    readonly confidence?: number;
  };
}

/**
 * Committee information
 */
export interface Committee {
  readonly id: string;
  readonly name: string;
  readonly fullName?: string;
  readonly chamber: 'house' | 'senate' | 'joint';
  readonly jurisdiction?: ReadonlyArray<string>;
  readonly chair?: {
    readonly bioguideId: string;
    readonly name: string;
    readonly party: string;
    readonly state: string;
  };
  readonly rankingMember?: {
    readonly bioguideId: string;
    readonly name: string;
    readonly party: string;
    readonly state: string;
  };
  readonly members?: ReadonlyArray<{
    readonly bioguideId: string;
    readonly name: string;
    readonly party: string;
    readonly state: string;
    readonly rank?: number;
    readonly title?: string;
  }>;
  readonly subcommittees?: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly chair?: string;
  }>;
}

/**
 * Congressional session information
 */
export interface CongressionalSession {
  readonly congress: number;
  readonly session: number;
  readonly startDate: string;
  readonly endDate?: string;
  readonly chamber: 'house' | 'senate' | 'joint';
  readonly type: 'regular' | 'special' | 'lame_duck';
}

/**
 * Roll call vote details
 */
export interface RollCallVote {
  readonly voteId: string;
  readonly congress: number;
  readonly session: number;
  readonly chamber: 'house' | 'senate';
  readonly rollNumber: number;
  readonly date: string;
  readonly question: string;
  readonly description?: string;
  readonly billId?: string;
  readonly amendmentId?: string;
  readonly result: string;
  readonly totalVotes: {
    readonly yea: number;
    readonly nay: number;
    readonly present: number;
    readonly notVoting: number;
  };
  readonly votes?: ReadonlyArray<{
    readonly bioguideId: string;
    readonly name: string;
    readonly party: string;
    readonly state: string;
    readonly vote: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  }>;
}
