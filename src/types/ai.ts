/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// ── Feature 1: Legislative Process Explainer ────────────────────────

export interface BillStatus {
  latestAction: { actionDate: string; text: string };
  committees: Array<{ name: string; chamber: string }>;
  currentStage: 'introduced' | 'committee' | 'floor' | 'passed' | 'enacted';
}

export interface ProcessExplanation {
  currentStatus: string;
  whatHappened: string;
  nextSteps: string[];
  estimatedTimeline: string;
  confidence: number;
  lastUpdated: string;
  source: 'ai-generated' | 'fallback';
}

// ── Feature 2: Federal Spending Narrative ────────────────────────────

export interface DistrictSpending {
  totalAmount: number;
  categories: Array<{ name: string; amount: number; percentage: number }>;
  topContracts: Array<{ recipient: string; amount: number; description: string }>;
}

export interface SpendingNarrative {
  summary: string;
  topCategories: string;
  localImpact: string;
  notableContracts: string[];
  confidence: number;
  lastUpdated: string;
  source: 'ai-generated' | 'fallback';
}

// ── Feature 3: Vote Pattern Analysis ─────────────────────────────────

export interface VoteRecord {
  legislatorId: string;
  votes: Array<{
    billNumber: string;
    title: string;
    vote: 'Yea' | 'Nay' | 'Not Voting';
    date: string;
    subjects: string[];
  }>;
}

export interface VotePatternSummary {
  totalVotes: number;
  categoryCounts: { [category: string]: { count: number; percentage: number } };
  summary: string;
  topIssueAreas: string[];
  confidence: number;
  lastUpdated: string;
  source: 'ai-generated' | 'fallback';
}

// ── Feature 4: Civic Alignment Analysis ──────────────────────────────

export interface CivicAlignmentInput {
  legislator: {
    bioguideId: string;
    name: string;
    party: string;
    state: string;
    district: string;
    chamber: 'House' | 'Senate';
    committees: Array<{ name: string; role: string }>;
  };
  votes: Array<{
    billNumber: string;
    title: string;
    vote: 'Yea' | 'Nay' | 'Not Voting';
    date: string;
    subjects: string[];
  }>;
  finance: {
    totalRaised: number;
    topSectors: Array<{ sector: string; amount: number; percentage: number }>;
    topContributors: Array<{ name: string; amount: number; employer: string }>;
    smallDonorPercentage: number;
    inDistrictPercentage: number;
  };
  district: {
    population: number;
    medianIncome: number;
    unemploymentRate: number;
    povertyRate: number;
    uninsuredRate: number;
    broadbandAvailability: number;
    topFederalSpendingAgencies: string[];
    topIndustries: string[];
  };
}

export interface CivicAlignmentReport {
  districtNeeds: Array<{
    category: string;
    metric: string;
    severity: 'high' | 'moderate' | 'low';
  }>;
  votingActivity: Array<{
    category: string;
    totalVotes: number;
    yeaVotes: number;
    nayVotes: number;
  }>;
  donorProfile: Array<{
    sector: string;
    amount: number;
    percentage: number;
    relatedCategories: string[];
  }>;
  gaps: Array<{
    observation: string;
  }>;
  confidence: number;
  lastUpdated: string;
  source: 'ai-generated' | 'fallback';
}
