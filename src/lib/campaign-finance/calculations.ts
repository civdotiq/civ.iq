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

/**
 * Generate mock sparkline data for Phase 1 (real trends in Phase 6)
 */
export function generateMockSparklineData(
  baseAmount: number,
  type: 'fundraising' | 'spending' | 'cash'
): {
  values: number[];
  trend: 'up' | 'down' | 'neutral';
} {
  const months = 6;
  const values: number[] = [];

  // Generate realistic trend based on type
  let trendDirection: 'up' | 'down' | 'neutral';

  switch (type) {
    case 'fundraising':
      // Fundraising usually increases over time with some volatility
      trendDirection = baseAmount > 10000 ? 'up' : 'neutral';
      for (let i = 0; i < months; i++) {
        const baseValue = baseAmount * (0.3 + (i / months) * 0.7); // Start at 30%, end at 100%
        const volatility = baseValue * (Math.random() * 0.3 - 0.15); // ±15% volatility
        values.push(Math.max(0, baseValue + volatility));
      }
      break;

    case 'spending':
      // Spending usually increases as campaign progresses
      trendDirection = baseAmount > 5000 ? 'up' : 'neutral';
      for (let i = 0; i < months; i++) {
        const progressFactor = Math.pow(i / (months - 1), 1.5); // Accelerating spending
        const baseValue = baseAmount * progressFactor;
        const volatility = baseValue * (Math.random() * 0.2 - 0.1); // ±10% volatility
        values.push(Math.max(0, baseValue + volatility));
      }
      break;

    case 'cash':
      // Cash on hand can vary but usually builds then depletes
      trendDirection = 'neutral';
      const peak = Math.floor(months * 0.6); // Peak around month 4
      for (let i = 0; i < months; i++) {
        let factor;
        if (i <= peak) {
          factor = i / peak; // Build up to peak
        } else {
          factor = 1 - ((i - peak) / (months - peak)) * 0.3; // Slight decline after peak
        }
        const baseValue = baseAmount * factor;
        const volatility = baseValue * (Math.random() * 0.15 - 0.075); // ±7.5% volatility
        values.push(Math.max(0, baseValue + volatility));
      }

      // Determine overall trend
      const firstValue = values[0];
      const lastValue = values[months - 1];
      if (firstValue && lastValue && lastValue > firstValue * 1.1) {
        trendDirection = 'up';
      } else if (firstValue && lastValue && lastValue < firstValue * 0.9) {
        trendDirection = 'down';
      }
      break;
  }

  return { values, trend: trendDirection };
}
