/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Enhanced FEC data types for comprehensive campaign finance analysis

export interface EnhancedFECData {
  summary: {
    totalRaised: number;
    totalSpent: number;
    cashOnHand: number;
    burnRate: number;
    quarterlyAverage: number;
    efficiency: number; // spending efficiency metric
  };
  
  breakdown: {
    individual: { amount: number; percent: number };
    pac: { amount: number; percent: number };
    party: { amount: number; percent: number };
    candidate: { amount: number; percent: number };
    smallDonors: { amount: number; percent: number; count: number };
    largeDonors: { amount: number; percent: number; count: number };
  };
  
  industries: Array<{
    name: string;
    amount: number;
    percentage: number;
    contributorCount: number;
    topEmployers: Array<{
      name: string;
      amount: number;
      count: number;
    }>;
    trend: 'up' | 'down' | 'stable';
  }>;
  
  geography: {
    inState: {
      amount: number;
      percent: number;
      count: number;
    };
    outOfState: {
      amount: number;
      percent: number;
      count: number;
    };
    topStates: Array<{
      state: string;
      amount: number;
      percent: number;
      count: number;
    }>;
    diversityScore: number; // 0-100, higher = more geographically diverse
  };
  
  timeline: Array<{
    period: string;
    quarter: string;
    raised: number;
    spent: number;
    netChange: number;
    cashOnHand: number;
    burnRate: number;
    contributorCount: number;
  }>;
  
  donors: {
    smallDonorMetrics: {
      averageAmount: number;
      count: number;
      percentage: number;
      grassrootsScore: number; // 0-100, higher = more grassroots
    };
    largeDonorMetrics: {
      averageAmount: number;
      count: number;
      percentage: number;
      dependencyScore: number; // 0-100, higher = more dependent on large donors
    };
    repeatDonors: {
      count: number;
      percentage: number;
      averageTotal: number;
    };
  };
  
  expenditures: {
    categories: Array<{
      name: string;
      amount: number;
      percentage: number;
      count: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    efficiency: {
      adminCosts: number;
      fundraisingCosts: number;
      programCosts: number;
      efficiencyRatio: number;
    };
  };
  
  metadata: {
    dataSource: string;
    lastUpdated: string;
    coverage: number; // percentage of data available
    dataQuality: 'high' | 'medium' | 'low';
    cyclesCovered: number[];
  };
}

export interface ContributionDetail {
  id: string;
  contributorName: string;
  employerName?: string;
  occupation?: string;
  amount: number;
  date: string;
  city?: string;
  state?: string;
  zipCode?: string;
  industry?: string;
  contributionType: 'individual' | 'pac' | 'party' | 'candidate';
  isSmallDonor: boolean;
}

export interface ExpenditureDetail {
  id: string;
  recipientName: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  subcategory?: string;
  purpose?: string;
  isMedia?: boolean;
  isStaff?: boolean;
  isAdmin?: boolean;
}

export interface IndustryCategory {
  id: string;
  name: string;
  keywords: string[];
  parentCategory?: string;
  color?: string;
  icon?: string;
}

export interface DonorAnalysisData {
  totalDonors: number;
  totalAmount: number;
  
  sizeAnalysis: {
    small: { count: number; amount: number; threshold: number };
    medium: { count: number; amount: number; range: [number, number] };
    large: { count: number; amount: number; threshold: number };
  };
  
  geographyAnalysis: {
    inState: { count: number; amount: number; percent: number };
    outOfState: { count: number; amount: number; percent: number };
    topStates: Array<{ state: string; count: number; amount: number; percent: number }>;
    diversityIndex: number;
  };
  
  typeAnalysis: {
    individuals: { count: number; amount: number; percent: number };
    pacs: { count: number; amount: number; percent: number };
    parties: { count: number; amount: number; percent: number };
    candidates: { count: number; amount: number; percent: number };
  };
  
  industryAnalysis: {
    topIndustries: Array<{
      name: string;
      count: number;
      amount: number;
      percent: number;
      topEmployers: string[];
    }>;
    diversityScore: number;
    concentration: number; // how concentrated donations are in top industries
  };
  
  temporalAnalysis: {
    monthlyTrends: Array<{
      month: string;
      count: number;
      amount: number;
      averageAmount: number;
    }>;
    quarterlyTrends: Array<{
      quarter: string;
      count: number;
      amount: number;
      growth: number;
    }>;
  };
}

export interface FundraisingTrendsData {
  overview: {
    totalRaised: number;
    totalSpent: number;
    netPosition: number;
    burnRate: number;
    runwayMonths: number;
  };
  
  quarterlyData: Array<{
    quarter: string;
    year: number;
    raised: number;
    spent: number;
    netChange: number;
    cashOnHand: number;
    donorCount: number;
    avgDonation: number;
    burnRate: number;
    efficiency: number;
  }>;
  
  monthlyData: Array<{
    month: string;
    year: number;
    raised: number;
    spent: number;
    netChange: number;
    events: string[]; // notable events that month
  }>;
  
  projections: {
    nextQuarter: {
      expectedRaised: number;
      expectedSpent: number;
      confidence: number;
    };
    electionCycle: {
      totalNeeded: number;
      currentPace: number;
      onTrack: boolean;
    };
  };
  
  benchmarks: {
    averageForOffice: number;
    averageForState: number;
    averageForParty: number;
    competitiveRange: [number, number];
  };
}

export interface CampaignFinanceFilter {
  dateRange: {
    start: string;
    end: string;
  };
  contributionSize: {
    min: number;
    max: number;
  };
  industries: string[];
  states: string[];
  contributionTypes: ('individual' | 'pac' | 'party' | 'candidate')[];
  minAmount?: number;
  maxAmount?: number;
}

export interface FECAPIResponse<T> {
  success: boolean;
  data: T;
  metadata: {
    totalRecords: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasMore: boolean;
    lastUpdated: string;
    dataSource: string;
  };
  errors?: string[];
}

// Raw FEC API response types for schedules
export interface FECScheduleAResponse {
  results: Array<{
    sub_id: string;
    contributor_name: string;
    contributor_employer?: string;
    contributor_occupation?: string;
    contributor_city?: string;
    contributor_state?: string;
    contributor_zip?: string;
    contribution_receipt_amount: number;
    contribution_receipt_date: string;
    two_year_transaction_period: number;
    committee_name: string;
    committee_id: string;
    candidate_id: string;
    entity_type: string;
    is_individual: boolean;
  }>;
  pagination: {
    page: number;
    per_page: number;
    count: number;
    pages: number;
  };
}

export interface FECScheduleBResponse {
  results: Array<{
    sub_id: string;
    recipient_name: string;
    disbursement_description: string;
    disbursement_amount: number;
    disbursement_date: string;
    two_year_transaction_period: number;
    committee_name: string;
    committee_id: string;
    candidate_id: string;
    category_code?: string;
    category_code_full?: string;
    purpose_code?: string;
    entity_type: string;
  }>;
  pagination: {
    page: number;
    per_page: number;
    count: number;
    pages: number;
  };
}

export interface FECCandidateTotalsResponse {
  results: Array<{
    candidate_id: string;
    cycle: number;
    receipts: number;
    disbursements: number;
    cash_on_hand_end_period: number;
    individual_contributions: number;
    other_political_committee_contributions: number;
    political_party_committee_contributions: number;
    candidate_contribution: number;
    total_contributions: number;
    coverage_start_date: string;
    coverage_end_date: string;
    last_cash_on_hand_end_period: number;
    last_debts_owed_by_committee: number;
    last_report_type_full: string;
    last_report_year: number;
  }>;
}

export type FECDataProcessingStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface FECDataProcessingJob {
  id: string;
  candidateId: string;
  bioguideId: string;
  status: FECDataProcessingStatus;
  progress: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
  result?: EnhancedFECData;
}