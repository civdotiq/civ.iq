/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Campaign Finance Calculation Utilities
 * Used for enhanced metric calculations in Phase 1 of finance dashboard
 */

export interface FinanceCalculations {
  burnRate: number; // Percentage of funds spent
  burnRateText: string;
  smallDonorPercentage: number; // Percentage from donors giving <$200
  smallDonorText: string;
  averageDonation: number;
  averageDonationText: string;
  daysRemaining: number; // Days until funds depleted at current burn rate
  daysRemainingText: string;
}

/**
 * Calculate enhanced financial metrics for display in MetricCard components
 */
export function calculateEnhancedMetrics(financeData: {
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  individualContributions?: number;
  top_contributors?: Array<{ total_amount: number; count?: number }>;
  recent_contributions?: Array<{ contribution_receipt_amount: number }>;
}): FinanceCalculations {
  const { totalRaised, totalSpent, cashOnHand } = financeData;

  // Calculate burn rate (percentage of funds spent)
  const burnRate = totalRaised > 0 ? (totalSpent / totalRaised) * 100 : 0;
  const burnRateText = `${burnRate.toFixed(1)}%`;

  // Calculate small donor percentage (contributions under $200)
  // This is a simplified calculation - in real implementation would need individual contribution data
  let smallDonorPercentage = 0;
  let smallDonorText = 'N/A';

  if (financeData.recent_contributions && financeData.recent_contributions.length > 0) {
    const smallContributions = financeData.recent_contributions.filter(
      contrib => contrib.contribution_receipt_amount < 200
    );
    const smallDonorAmount = smallContributions.reduce(
      (sum, contrib) => sum + contrib.contribution_receipt_amount,
      0
    );
    const totalSampleAmount = financeData.recent_contributions.reduce(
      (sum, contrib) => sum + contrib.contribution_receipt_amount,
      0
    );

    if (totalSampleAmount > 0) {
      smallDonorPercentage = (smallDonorAmount / totalSampleAmount) * 100;
      smallDonorText = `${smallDonorPercentage.toFixed(1)}%`;
    }
  } else {
    // Fallback estimation based on typical patterns
    if (totalRaised > 0) {
      // Estimate based on contribution count vs amount (more donors = higher small donor %)
      const avgContribution = financeData.top_contributors?.length
        ? totalRaised / Math.max(financeData.top_contributors.length, 10)
        : totalRaised / 50;

      if (avgContribution < 500) {
        smallDonorPercentage = 65; // High small donor percentage
      } else if (avgContribution < 1500) {
        smallDonorPercentage = 35; // Medium small donor percentage
      } else {
        smallDonorPercentage = 15; // Low small donor percentage
      }
      smallDonorText = `~${smallDonorPercentage.toFixed(0)}%`;
    }
  }

  // Calculate average donation
  const contributorCount =
    financeData.top_contributors?.reduce((sum, contrib) => sum + (contrib.count || 1), 0) ||
    Math.max(Math.floor(totalRaised / 250), 1);
  const averageDonation = totalRaised / contributorCount;
  const averageDonationText =
    averageDonation > 0
      ? `$${averageDonation.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      : '$0';

  // Calculate days remaining at current burn rate
  let daysRemaining = 0;
  let daysRemainingText = 'N/A';

  if (cashOnHand > 0 && totalSpent > 0) {
    // Assume spending occurred over last 6 months (182 days)
    const dailyBurnRate = totalSpent / 182;
    if (dailyBurnRate > 0) {
      daysRemaining = Math.floor(cashOnHand / dailyBurnRate);
      if (daysRemaining > 365) {
        daysRemainingText = `${Math.floor(daysRemaining / 365)} years`;
      } else if (daysRemaining > 30) {
        daysRemainingText = `${Math.floor(daysRemaining / 30)} months`;
      } else {
        daysRemainingText = `${daysRemaining} days`;
      }
    } else {
      daysRemainingText = 'No spending';
    }
  }

  return {
    burnRate,
    burnRateText,
    smallDonorPercentage,
    smallDonorText,
    averageDonation,
    averageDonationText,
    daysRemaining,
    daysRemainingText,
  };
}
