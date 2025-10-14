/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Campaign Finance Type Definitions
 * All types based on real FEC.gov API structures
 */

/**
 * PAC contribution breakdown by committee type
 */
export interface PACContributionsByType {
  superPac: number; // Independent Expenditure-Only (Type O)
  traditional: number; // Qualified/Non-qualified PACs (Type Q/N)
  leadership: number; // Leadership PACs (Type D)
  hybrid: number; // Hybrid PACs (Type V/W)
}

/**
 * Independent expenditure record with support/oppose classification
 */
export interface IndependentExpenditure {
  amount: number;
  date: string;
  pacName: string;
  pacType: 'superPac' | 'traditional' | 'leadership' | 'hybrid' | 'unknown';
  description: string;
}

/**
 * PHASE 2: Enhanced Entity Resolution Types
 */

/**
 * Deduplicated contributor with aggregated data
 */
export interface DeduplicatedContributor {
  displayName: string; // Human-readable canonical name
  normalizedName: string; // Normalized form used for matching
  totalAmount: number; // Total contributions across all variants
  contributionCount: number; // Number of contributions
  nameVariants: string[]; // All name variations found
  entityType: 'individual' | 'organization' | 'unknown';
  metadata: {
    employer?: string;
    occupation?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

/**
 * Deduplicated disbursement recipient with aggregated data
 */
export interface DeduplicatedRecipient {
  displayName: string; // Human-readable canonical name
  normalizedName: string; // Normalized form used for matching
  totalAmount: number; // Total disbursements across all variants
  transactionCount: number; // Number of transactions
  nameVariants: string[]; // All name variations found
  entityType: 'individual' | 'organization' | 'unknown';
  metadata: {
    city?: string;
    state?: string;
    description?: string; // Most common disbursement description
  };
}

/**
 * Enhanced industry breakdown with entity resolution
 */
export interface EnhancedIndustryBreakdown {
  sector: string; // Standardized employer/industry name
  amount: number;
  percentage: number;
  contributorCount: number; // Number of unique contributors
  nameVariants: string[]; // All employer name variations matched
}

/**
 * PHASE 3: Industry Taxonomy & Categorization Types
 */

/**
 * Industry sector breakdown with standardized categorization
 */
export interface IndustrySectorBreakdown {
  sector: string; // E.g., "Finance/Insurance/Real Estate", "Health", "Technology"
  category?: string; // Sub-category like "Commercial Banks", "Pharmaceuticals"
  totalAmount: number;
  contributionCount: number;
  percentage: number;
  confidence: 'high' | 'medium' | 'low'; // Classification confidence
  topCategories?: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
}

/**
 * Contributor with industry classification
 */
export interface CategorizedContributor {
  name: string;
  totalAmount: number;
  contributionCount: number;
  industrySector: string;
  industryCategory: string;
  employer?: string;
  occupation?: string;
}

/**
 * Finance response interface for representative campaign finance data
 */
export interface FinanceResponse {
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  partyContributions: number;
  candidateContributions: number;
  industryBreakdown: Array<{
    sector: string;
    amount: number;
    percentage: number;
  }>;
  geographicBreakdown: Array<{
    state: string;
    amount: number;
    percentage: number;
  }>;
  topContributors: Array<{
    name: string;
    total_amount: number;
    count: number;
    employer?: string;
    occupation?: string;
  }>;
  recentContributions: Array<{
    contributor_name: string;
    contributor_employer?: string;
    contribution_receipt_amount: number;
    contribution_receipt_date: string;
  }>;
  // Legacy field names for compatibility with existing component
  industry_breakdown?: Array<{
    sector: string;
    amount: number;
    percentage: number;
  }>;
  top_contributors?: Array<{
    name: string;
    total_amount: number;
    count: number;
    employer?: string;
    occupation?: string;
  }>;
  recent_contributions?: Array<{
    contributor_name: string;
    contributor_employer?: string;
    contribution_receipt_amount: number;
    contribution_receipt_date: string;
  }>;
  dataQuality: {
    industry: {
      totalContributionsAnalyzed: number;
      contributionsWithEmployer: number;
      completenessPercentage: number;
    };
    geography: {
      totalContributionsAnalyzed: number;
      contributionsWithState: number;
      completenessPercentage: number;
    };
    overallDataConfidence: 'high' | 'medium' | 'low';
  };
  candidateId: string;
  cycle: number;
  lastUpdated: string;
  fecDataSources: {
    financialSummary: string;
    contributions: string;
    independentExpenditures?: string;
  };
  fecTransparencyLinks: {
    candidatePage: string;
    contributions: string;
    disbursements: string;
    financialSummary: string;
    independentExpenditures?: string;
  };
  metadata: {
    note?: string;
    bioguideId: string;
    hasFecMapping: boolean;
    cacheHit: boolean;
    mappingLastUpdated?: string;
    suggestedAction?: string;
    fecCandidateId?: string;
    suggestedCycles?: number[];
  };

  // NEW PHASE 1 FIELDS:
  pacContributionsByType: PACContributionsByType;
  supportingExpenditures: IndependentExpenditure[];
  opposingExpenditures: IndependentExpenditure[];

  // NEW PHASE 2 FIELDS (Entity Resolution & Name Standardization):
  deduplicatedContributors?: DeduplicatedContributor[]; // Top contributors with name variants resolved
  deduplicatedRecipients?: DeduplicatedRecipient[]; // Top disbursement recipients with name variants
  enhancedIndustryBreakdown?: EnhancedIndustryBreakdown[]; // Industry breakdown with entity matching
  entityResolutionMetrics?: {
    contributorsBeforeDedup: number;
    contributorsAfterDedup: number;
    deduplicationRate: number; // Percentage reduction
    nameVariantsFound: number; // Total unique name variants identified
  };

  // NEW PHASE 3 FIELDS (Industry Taxonomy & Categorization):
  industrySectorBreakdown?: IndustrySectorBreakdown[]; // Standardized industry sector classification
  categorizedContributors?: CategorizedContributor[]; // Top contributors with industry categories
  industryTaxonomyMetrics?: {
    totalContributionsCategorized: number;
    highConfidenceCategories: number; // Categories matched via employer
    mediumConfidenceCategories: number; // Categories matched via occupation
    lowConfidenceCategories: number; // Uncategorized/inferred
    sectorsRepresented: number; // Number of unique sectors
  };

  // NEW PHASE 4 FIELDS (Curated Interest Group Baskets):
  interestGroupBaskets?: Array<{
    basket: string; // Interest group basket name (e.g., "Big Tech & Internet")
    totalAmount: number;
    percentage: number;
    contributionCount: number;
    description: string;
    icon: string; // emoji for display
    color: string; // hex color for charts
    topCategories: Array<{
      category: string;
      amount: number;
    }>;
  }>;
  interestGroupMetrics?: {
    topInfluencer: string | null; // Top interest group basket
    grassrootsPercentage: number; // % from small donors (≤$200)
    corporatePercentage: number; // % from corporate interests
    diversityScore: number; // 0-100, funding source diversity
  };
}
