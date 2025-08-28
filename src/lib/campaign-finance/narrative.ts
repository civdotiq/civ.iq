/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export interface FundingNarrative {
  mainStatement: string;
  fundingProfile: 'grassroots' | 'traditional' | 'self-funded' | 'mixed' | 'pac-heavy';
  keyInsights: string[];
  trustLevel: 'high' | 'medium' | 'low';
}

export function generateFundingNarrative(financeData: {
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  donations: {
    individual: number;
    pac: number;
    party: number;
    candidate: number;
  };
  topContributors: Array<{ name: string; amount: number; type: string }>;
  industryBreakdown: Array<{ industry: string; amount: number; percentage: number }>;
}): FundingNarrative {
  if (financeData.totalRaised === 0) {
    return {
      mainStatement: 'No campaign finance data available for this representative.',
      fundingProfile: 'mixed',
      keyInsights: ['Financial data may not be available for this election cycle.'],
      trustLevel: 'low',
    };
  }

  // Calculate key percentages
  const individualPercent = (financeData.donations.individual / financeData.totalRaised) * 100;
  const pacPercent = (financeData.donations.pac / financeData.totalRaised) * 100;
  const selfFundedPercent = (financeData.donations.candidate / financeData.totalRaised) * 100;
  const burnRate = (financeData.totalSpent / financeData.totalRaised) * 100;

  // Determine funding profile
  let fundingProfile: FundingNarrative['fundingProfile'];
  if (selfFundedPercent > 50) {
    fundingProfile = 'self-funded';
  } else if (individualPercent > 60 && pacPercent < 20) {
    fundingProfile = 'grassroots';
  } else if (pacPercent > 50) {
    fundingProfile = 'pac-heavy';
  } else if (individualPercent > 30 && pacPercent > 15 && pacPercent < 40) {
    fundingProfile = 'mixed';
  } else {
    fundingProfile = 'traditional';
  }

  // Generate main statement
  let mainStatement: string;
  const totalFormatted = `$${(financeData.totalRaised / 1000000).toFixed(1)}M`;

  switch (fundingProfile) {
    case 'grassroots':
      mainStatement = `This representative has raised ${totalFormatted} with ${individualPercent.toFixed(0)}% from individual donors, showing strong grassroots support.`;
      break;
    case 'self-funded':
      mainStatement = `This representative has self-funded ${selfFundedPercent.toFixed(0)}% of their ${totalFormatted} campaign, reducing dependence on external donors.`;
      break;
    case 'pac-heavy':
      mainStatement = `This representative has raised ${totalFormatted} with ${pacPercent.toFixed(0)}% from PACs and special interest groups.`;
      break;
    case 'mixed':
      mainStatement = `This representative has raised ${totalFormatted} through a balanced mix of individual donors (${individualPercent.toFixed(0)}%) and institutional support.`;
      break;
    default:
      mainStatement = `This representative has raised ${totalFormatted} through traditional campaign funding sources.`;
  }

  // Generate key insights
  const keyInsights: string[] = [];

  // Small donor analysis
  if (individualPercent > 70) {
    keyInsights.push('Strong grassroots funding base');
  } else if (individualPercent < 30) {
    keyInsights.push('Limited individual donor support');
  }

  // PAC analysis
  if (pacPercent > 40) {
    keyInsights.push('Heavy reliance on PAC contributions');
  } else if (pacPercent < 10) {
    keyInsights.push('Minimal PAC funding');
  }

  // Burn rate analysis
  if (burnRate > 80) {
    keyInsights.push('High spending rate - low cash reserves');
  } else if (burnRate < 40) {
    keyInsights.push('Conservative spending approach');
  }

  // Cash position
  const cashPercent = (financeData.cashOnHand / financeData.totalRaised) * 100;
  if (cashPercent > 30) {
    keyInsights.push('Strong cash position for ongoing operations');
  } else if (cashPercent < 10) {
    keyInsights.push('Limited remaining campaign funds');
  }

  // Industry concentration
  if (financeData.industryBreakdown.length > 0) {
    const topIndustry = financeData.industryBreakdown[0];
    if (topIndustry && topIndustry.percentage > 25) {
      keyInsights.push(`Significant support from ${topIndustry.industry.toLowerCase()} sector`);
    }
  }

  // Determine trust level based on data completeness
  let trustLevel: FundingNarrative['trustLevel'];
  if (financeData.totalRaised > 100000 && financeData.topContributors.length > 0) {
    trustLevel = 'high';
  } else if (financeData.totalRaised > 10000) {
    trustLevel = 'medium';
  } else {
    trustLevel = 'low';
  }

  return {
    mainStatement,
    fundingProfile,
    keyInsights: keyInsights.slice(0, 3), // Limit to top 3 insights
    trustLevel,
  };
}
