/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * PHASE 4: Interest Group Baskets
 *
 * Citizen-friendly aggregation of campaign contributions into meaningful
 * interest group categories. Maps complex industry taxonomies into simple,
 * understandable baskets that answer: "Who's funding this representative?"
 *
 * Design Philosophy:
 * - Transparency: Clear, simple language citizens understand
 * - Comprehensiveness: Cover all major interest group categories
 * - Real Data: Maps to actual FEC industry taxonomy (Phase 3)
 * - Visual: Designed for easy visualization and comparison
 */

import logger from '@/lib/logging/simple-logger';
import { IndustrySector, categorizeContribution } from './industry-taxonomy';

/**
 * Interest Group Basket - Citizen-friendly categorization
 */
export enum InterestGroupBasket {
  BIG_TECH = 'Big Tech & Internet',
  WALL_STREET = 'Wall Street & Finance',
  HEALTHCARE_PHARMA = 'Healthcare & Pharma',
  BIG_OIL = 'Big Oil & Energy',
  DEFENSE_CONTRACTORS = 'Defense & Military',
  LABOR_UNIONS = 'Labor Unions',
  TRIAL_LAWYERS = 'Trial Lawyers & Legal',
  AGRIBUSINESS = 'Agriculture & Food',
  REAL_ESTATE = 'Real Estate & Construction',
  SMALL_BUSINESS = 'Small Business & Retail',
  EDUCATION = 'Education & Teachers',
  IDEOLOGICAL = 'Ideological & Advocacy',
  GRASSROOTS = 'Small Individual Donors',
  SELF_FUNDED = 'Self-Funded',
  OTHER = 'Other',
}

/**
 * Interest Group Basket with aggregated data
 */
export interface InterestGroupData {
  basket: InterestGroupBasket;
  totalAmount: number;
  percentage: number;
  contributionCount: number;
  description: string;
  icon: string; // emoji for visual display
  color: string; // hex color for charts
  topCategories: Array<{
    category: string;
    amount: number;
  }>;
}

/**
 * Small donor classification threshold (FEC individual contribution limit)
 */
const SMALL_DONOR_THRESHOLD = 200; // $200 or less = grassroots

/**
 * Industry Sector to Interest Group Basket Mapping
 */
const SECTOR_TO_BASKET: Record<IndustrySector, InterestGroupBasket> = {
  [IndustrySector.COMMUNICATIONS_ELECTRONICS]: InterestGroupBasket.BIG_TECH,
  [IndustrySector.FINANCE_INSURANCE_REAL_ESTATE]: InterestGroupBasket.WALL_STREET,
  [IndustrySector.HEALTH]: InterestGroupBasket.HEALTHCARE_PHARMA,
  [IndustrySector.ENERGY_NATURAL_RESOURCES]: InterestGroupBasket.BIG_OIL,
  [IndustrySector.DEFENSE]: InterestGroupBasket.DEFENSE_CONTRACTORS,
  [IndustrySector.LABOR]: InterestGroupBasket.LABOR_UNIONS,
  [IndustrySector.LAWYERS_LOBBYISTS]: InterestGroupBasket.TRIAL_LAWYERS,
  [IndustrySector.AGRIBUSINESS]: InterestGroupBasket.AGRIBUSINESS,
  [IndustrySector.CONSTRUCTION]: InterestGroupBasket.REAL_ESTATE,
  [IndustrySector.TRANSPORTATION]: InterestGroupBasket.SMALL_BUSINESS,
  [IndustrySector.MISC_BUSINESS]: InterestGroupBasket.SMALL_BUSINESS,
  [IndustrySector.IDEOLOGY_SINGLE_ISSUE]: InterestGroupBasket.IDEOLOGICAL,
  [IndustrySector.OTHER]: InterestGroupBasket.OTHER,
};

/**
 * Interest Group Metadata
 */
const BASKET_METADATA: Record<
  InterestGroupBasket,
  { description: string; icon: string; color: string }
> = {
  [InterestGroupBasket.BIG_TECH]: {
    description: 'Technology companies, internet platforms, and software firms',
    icon: '💻',
    color: '#3B82F6', // Blue
  },
  [InterestGroupBasket.WALL_STREET]: {
    description: 'Banks, investment firms, insurance companies, and financial services',
    icon: '💰',
    color: '#10B981', // Green
  },
  [InterestGroupBasket.HEALTHCARE_PHARMA]: {
    description: 'Pharmaceutical companies, hospitals, doctors, and health insurance',
    icon: '🏥',
    color: '#EF4444', // Red
  },
  [InterestGroupBasket.BIG_OIL]: {
    description: 'Oil and gas companies, utilities, and energy producers',
    icon: '⚡',
    color: '#F59E0B', // Orange
  },
  [InterestGroupBasket.DEFENSE_CONTRACTORS]: {
    description: 'Defense contractors, aerospace, and military suppliers',
    icon: '🛡️',
    color: '#6B7280', // Gray
  },
  [InterestGroupBasket.LABOR_UNIONS]: {
    description: 'Labor unions and worker organizations',
    icon: '👷',
    color: '#8B5CF6', // Purple
  },
  [InterestGroupBasket.TRIAL_LAWYERS]: {
    description: 'Law firms, attorneys, and legal services',
    icon: '⚖️',
    color: '#14B8A6', // Teal
  },
  [InterestGroupBasket.AGRIBUSINESS]: {
    description: 'Farms, food processors, and agricultural companies',
    icon: '🌾',
    color: '#84CC16', // Lime
  },
  [InterestGroupBasket.REAL_ESTATE]: {
    description: 'Real estate developers, construction firms, and contractors',
    icon: '🏗️',
    color: '#F97316', // Orange
  },
  [InterestGroupBasket.SMALL_BUSINESS]: {
    description: 'Small businesses, retailers, and service providers',
    icon: '🏪',
    color: '#06B6D4', // Cyan
  },
  [InterestGroupBasket.EDUCATION]: {
    description: 'Schools, universities, and education organizations',
    icon: '📚',
    color: '#A855F7', // Purple
  },
  [InterestGroupBasket.IDEOLOGICAL]: {
    description: 'Advocacy groups, non-profits, and ideological organizations',
    icon: '📢',
    color: '#EC4899', // Pink
  },
  [InterestGroupBasket.GRASSROOTS]: {
    description: 'Small individual donors ($200 or less per person)',
    icon: '🌱',
    color: '#22C55E', // Green
  },
  [InterestGroupBasket.SELF_FUNDED]: {
    description: "Candidate's own money",
    icon: '💵',
    color: '#64748B', // Slate
  },
  [InterestGroupBasket.OTHER]: {
    description: 'Other contributors not categorized above',
    icon: '📊',
    color: '#9CA3AF', // Gray
  },
};

/**
 * Categorize contributions into Interest Group Baskets
 */
export function categorizeIntoBaskets(
  contributions: Array<{
    contributor_employer?: string;
    contributor_occupation?: string;
    contribution_receipt_amount: number;
    contributor_name?: string;
  }>,
  candidateContributions: number = 0
): InterestGroupData[] {
  const basketMap = new Map<
    InterestGroupBasket,
    {
      totalAmount: number;
      contributionCount: number;
      categories: Map<string, number>;
    }
  >();

  // Initialize all baskets
  Object.values(InterestGroupBasket).forEach(basket => {
    basketMap.set(basket, {
      totalAmount: 0,
      contributionCount: 0,
      categories: new Map(),
    });
  });

  let totalAmount = 0;
  let smallDonorAmount = 0;
  let smallDonorCount = 0;

  // Process each contribution
  for (const contrib of contributions) {
    const amount = contrib.contribution_receipt_amount || 0;
    totalAmount += amount;

    // Check if small donor (grassroots)
    if (amount <= SMALL_DONOR_THRESHOLD && amount > 0) {
      smallDonorAmount += amount;
      smallDonorCount++;
      continue; // Don't double-count as both grassroots and sector
    }

    // Categorize by industry sector
    const categorization = categorizeContribution(
      contrib.contributor_employer,
      contrib.contributor_occupation
    );

    // Map sector to interest group basket
    let basket = SECTOR_TO_BASKET[categorization.sector] || InterestGroupBasket.OTHER;

    // Special handling for Education sector
    if (
      categorization.sector === IndustrySector.IDEOLOGY_SINGLE_ISSUE &&
      categorization.category === 'Education'
    ) {
      basket = InterestGroupBasket.EDUCATION;
    }

    const basketData = basketMap.get(basket)!;
    basketData.totalAmount += amount;
    basketData.contributionCount++;

    // Track categories within basket
    const categoryAmount = basketData.categories.get(categorization.category) || 0;
    basketData.categories.set(categorization.category, categoryAmount + amount);
  }

  // Add grassroots basket
  const grassrootsData = basketMap.get(InterestGroupBasket.GRASSROOTS)!;
  grassrootsData.totalAmount = smallDonorAmount;
  grassrootsData.contributionCount = smallDonorCount;

  // Add self-funded basket
  if (candidateContributions > 0) {
    const selfFundedData = basketMap.get(InterestGroupBasket.SELF_FUNDED)!;
    selfFundedData.totalAmount = candidateContributions;
    selfFundedData.contributionCount = 1;
    totalAmount += candidateContributions;
  }

  // Convert to InterestGroupData array
  const result: InterestGroupData[] = Array.from(basketMap.entries())
    .filter(([_, data]) => data.totalAmount > 0) // Only include baskets with contributions
    .map(([basket, data]) => {
      const metadata = BASKET_METADATA[basket];
      const topCategories = Array.from(data.categories.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      return {
        basket,
        totalAmount: data.totalAmount,
        percentage: totalAmount > 0 ? (data.totalAmount / totalAmount) * 100 : 0,
        contributionCount: data.contributionCount,
        description: metadata.description,
        icon: metadata.icon,
        color: metadata.color,
        topCategories,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  logger.info('[Interest Groups] Categorized contributions into baskets', {
    totalContributions: contributions.length,
    totalAmount,
    basketsWithData: result.length,
    grassrootsAmount: smallDonorAmount,
    grassrootsPercentage: totalAmount > 0 ? (smallDonorAmount / totalAmount) * 100 : 0,
  });

  return result;
}

/**
 * Get comparison metrics for interest group influence
 */
export function getInterestGroupMetrics(baskets: InterestGroupData[]): {
  topInfluencer: InterestGroupBasket | null;
  grassrootsPercentage: number;
  corporatePercentage: number;
  diversityScore: number; // 0-100, higher = more diverse funding
} {
  if (baskets.length === 0) {
    return {
      topInfluencer: null,
      grassrootsPercentage: 0,
      corporatePercentage: 0,
      diversityScore: 0,
    };
  }

  const totalAmount = baskets.reduce((sum, b) => sum + b.totalAmount, 0);

  // Find grassroots percentage
  const grassrootsBasket = baskets.find(b => b.basket === InterestGroupBasket.GRASSROOTS);
  const grassrootsPercentage = grassrootsBasket?.percentage || 0;

  // Corporate baskets (excluding grassroots, self-funded, ideological, education)
  const corporateBaskets = [
    InterestGroupBasket.BIG_TECH,
    InterestGroupBasket.WALL_STREET,
    InterestGroupBasket.HEALTHCARE_PHARMA,
    InterestGroupBasket.BIG_OIL,
    InterestGroupBasket.DEFENSE_CONTRACTORS,
    InterestGroupBasket.TRIAL_LAWYERS,
    InterestGroupBasket.AGRIBUSINESS,
    InterestGroupBasket.REAL_ESTATE,
    InterestGroupBasket.SMALL_BUSINESS,
  ];

  const corporateAmount = baskets
    .filter(b => corporateBaskets.includes(b.basket))
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const corporatePercentage = totalAmount > 0 ? (corporateAmount / totalAmount) * 100 : 0;

  // Calculate diversity score (Shannon entropy normalized to 0-100)
  let entropy = 0;
  for (const basket of baskets) {
    if (basket.percentage > 0) {
      const p = basket.percentage / 100;
      entropy -= p * Math.log2(p);
    }
  }

  // Normalize to 0-100 scale (max entropy is log2(15) for 15 baskets)
  const maxEntropy = Math.log2(Object.keys(InterestGroupBasket).length);
  const diversityScore = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;

  return {
    topInfluencer: baskets[0]?.basket || null,
    grassrootsPercentage,
    corporatePercentage,
    diversityScore: Math.round(diversityScore),
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${Math.round(amount).toLocaleString()}`;
}
