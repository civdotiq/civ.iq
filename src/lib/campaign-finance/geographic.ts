/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { US_STATES } from '@/lib/data/us-states';

export interface GeographicContribution {
  state: string;
  stateName: string;
  amount: number;
  count: number;
  percentage: number;
  isHomeState: boolean;
}

export interface GeographicBreakdown {
  homeState: {
    state: string;
    amount: number;
    percentage: number;
    count: number;
  };
  outOfState: {
    amount: number;
    percentage: number;
    count: number;
    topStates: GeographicContribution[];
  };
  totalAnalyzed: number;
  dataQuality: 'high' | 'medium' | 'low';
  insights: string[];
}

/**
 * Analyze geographic distribution of campaign contributions
 */
export function analyzeGeographicBreakdown(
  financeData: {
    totalRaised: number;
    contributions?: Array<{
      contributor_state?: string;
      contribution_receipt_amount: number;
      contributor_name?: string;
    }>;
    representative_state: string;
  },
  fallbackContributorData?: Array<{
    name: string;
    amount: number;
    state?: string;
  }>
): GeographicBreakdown {
  const homeStateCode = financeData.representative_state?.toUpperCase() || '';
  const homeStateName = US_STATES[homeStateCode as keyof typeof US_STATES] || homeStateCode;

  // Process contributions with geographic data
  const contributions = financeData.contributions || [];
  const fallbackContributions = fallbackContributorData || [];

  // Combine and normalize contribution data
  const allContributions = [
    ...contributions.map(contrib => ({
      state: contrib.contributor_state?.toUpperCase() || 'UNKNOWN',
      amount: contrib.contribution_receipt_amount || 0,
      name: contrib.contributor_name || 'Unknown',
    })),
    ...fallbackContributions.map(contrib => ({
      state: contrib.state?.toUpperCase() || 'UNKNOWN',
      amount: contrib.amount || 0,
      name: contrib.name || 'Unknown',
    })),
  ];

  // If no geographic data available, create estimated breakdown
  if (allContributions.length === 0 || allContributions.every(c => c.state === 'UNKNOWN')) {
    return createEstimatedGeographicBreakdown(
      financeData.totalRaised,
      homeStateCode,
      homeStateName
    );
  }

  // Group contributions by state
  const stateGroups: Record<string, { amount: number; count: number }> = {};
  let totalAnalyzed = 0;

  allContributions.forEach(contrib => {
    if (contrib.state !== 'UNKNOWN' && contrib.amount > 0) {
      if (!stateGroups[contrib.state]) {
        stateGroups[contrib.state] = { amount: 0, count: 0 };
      }
      const stateGroup = stateGroups[contrib.state];
      if (stateGroup) {
        stateGroup.amount += contrib.amount;
        stateGroup.count += 1;
      }
      totalAnalyzed += contrib.amount;
    }
  });

  // Calculate home state vs out-of-state
  const homeStateData = stateGroups[homeStateCode] || { amount: 0, count: 0 };
  const homeStatePercentage = totalAnalyzed > 0 ? (homeStateData.amount / totalAnalyzed) * 100 : 0;

  // Calculate out-of-state breakdown
  const outOfStateStates = Object.entries(stateGroups)
    .filter(([state]) => state !== homeStateCode)
    .map(([state, data]) => {
      if (!data) {
        return {
          state,
          stateName: state,
          amount: 0,
          count: 0,
          percentage: 0,
          isHomeState: false,
        };
      }
      return {
        state,
        stateName: US_STATES[state as keyof typeof US_STATES] || state,
        amount: data.amount,
        count: data.count,
        percentage: totalAnalyzed > 0 ? (data.amount / totalAnalyzed) * 100 : 0,
        isHomeState: false,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const outOfStateTotal = outOfStateStates.reduce((sum, state) => sum + state.amount, 0);
  const outOfStatePercentage = totalAnalyzed > 0 ? (outOfStateTotal / totalAnalyzed) * 100 : 0;
  const outOfStateCount = outOfStateStates.reduce((sum, state) => sum + state.count, 0);

  // Generate insights
  const insights: string[] = [];

  if (homeStatePercentage > 70) {
    insights.push('Strong local funding base');
  } else if (homeStatePercentage < 30) {
    insights.push('Heavily dependent on out-of-state funding');
  }

  if (outOfStateStates.length > 20) {
    insights.push('Broad national fundraising network');
  }

  if (outOfStateStates.length > 0) {
    const topOutOfStateState = outOfStateStates[0];
    if (topOutOfStateState && topOutOfStateState.percentage > 15) {
      insights.push(`Significant support from ${topOutOfStateState.stateName}`);
    }
  }

  // Determine data quality
  let dataQuality: GeographicBreakdown['dataQuality'];
  const coveragePercentage = totalAnalyzed / financeData.totalRaised;
  if (coveragePercentage > 0.7) {
    dataQuality = 'high';
  } else if (coveragePercentage > 0.3) {
    dataQuality = 'medium';
  } else {
    dataQuality = 'low';
  }

  return {
    homeState: {
      state: homeStateCode,
      amount: homeStateData.amount,
      percentage: homeStatePercentage,
      count: homeStateData.count,
    },
    outOfState: {
      amount: outOfStateTotal,
      percentage: outOfStatePercentage,
      count: outOfStateCount,
      topStates: outOfStateStates.slice(0, 10),
    },
    totalAnalyzed,
    dataQuality,
    insights,
  };
}

/**
 * Create estimated geographic breakdown when actual data is not available
 */
function createEstimatedGeographicBreakdown(
  totalRaised: number,
  homeStateCode: string,
  _homeStateName: string
): GeographicBreakdown {
  // Typical patterns: House members get 60-80% from home state, Senators 40-70%
  const estimatedHomeStatePercentage = Math.random() * 30 + 50; // 50-80%
  const estimatedHomeStateAmount = totalRaised * (estimatedHomeStatePercentage / 100);
  const estimatedOutOfStateAmount = totalRaised - estimatedHomeStateAmount;

  return {
    homeState: {
      state: homeStateCode,
      amount: estimatedHomeStateAmount,
      percentage: estimatedHomeStatePercentage,
      count: Math.floor(estimatedHomeStateAmount / 250), // Estimate ~$250 avg donation
    },
    outOfState: {
      amount: estimatedOutOfStateAmount,
      percentage: 100 - estimatedHomeStatePercentage,
      count: Math.floor(estimatedOutOfStateAmount / 350), // Slightly higher avg for out-of-state
      topStates: [], // No detailed breakdown available
    },
    totalAnalyzed: totalRaised,
    dataQuality: 'low',
    insights: ['Analysis based on typical funding patterns - actual data not available'],
  };
}

/**
 * Get state abbreviation from full state name
 */
export function getStateAbbreviation(stateName: string): string {
  const stateEntry = Object.entries(US_STATES).find(
    ([, name]) => (name as string).toLowerCase() === stateName.toLowerCase()
  );
  return stateEntry ? stateEntry[0] : stateName.toUpperCase().substring(0, 2);
}
