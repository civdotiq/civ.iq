/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';

interface FinanceData {
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  partyContributions: number;
  candidateContributions: number;
  candidateId?: string;
  fecTransparencyLinks?: {
    candidatePage: string;
    contributions: string;
    disbursements: string;
    financialSummary: string;
  };
}

interface ContributorData {
  topContributors?: Array<{
    name: string;
    totalAmount: number;
    contributionCount: number;
    city: string;
    state: string;
    employer: string;
    occupation: string;
    fecTransparencyLink?: string;
    isCommittee?: boolean;
  }>;
  conduitAggregates?: {
    actblue?: {
      totalAmount: number;
      contributionCount: number;
      individualDonors: number;
    };
    winred?: {
      totalAmount: number;
      contributionCount: number;
      individualDonors: number;
    };
  };
  contributionTrends?: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
  metadata?: {
    fecCandidateLink?: string;
    fecCommitteeId?: string;
    fecReceiptsLink?: string;
    totalIndividualContributors?: number;
    totalCommitteeContributors?: number;
  };
}

interface IndustryData {
  topIndustries?: Array<{
    sector: string; // e.g., "Health", "Finance/Insurance/Real Estate"
    category: string; // e.g., "Health Professionals", "Commercial Banks"
    industry: string; // Display name: "Health: Health Professionals"
    amount: number;
    percentage: number;
    contributionCount: number;
    fecVerifyLink: string; // Link to verify on FEC.gov
  }>;
  metadata?: {
    totalAnalyzed: number;
    lastUpdated: string;
  };
}

interface InterestGroupData {
  baskets?: Array<{
    basket: string;
    totalAmount: number;
    percentage: number;
    contributionCount: number;
    description: string;
    icon: string;
    color: string;
    topCategories: Array<{
      category: string;
      amount: number;
    }>;
  }>;
  pacContributions?: {
    byType: {
      superPac: number;
      traditional: number;
      leadership: number;
      hybrid: number;
    };
    supportingExpenditures: Array<{
      amount: number;
      date: string;
      pacName: string;
      pacType: string;
      description: string;
    }>;
    opposingExpenditures: Array<{
      amount: number;
      date: string;
      pacName: string;
      pacType: string;
      description: string;
    }>;
  };
  metrics?: {
    topInfluencer: string | null;
    grassrootsPercentage: number;
    corporatePercentage: number;
    diversityScore: number;
  };
}

interface GeographicData {
  topStates: Array<{
    state: string;
    amount: number;
    percentage: number;
    contributionCount: number;
  }>;
  inDistrict?: {
    amount: number;
    percentage: number;
    contributionCount: number;
  };
  outOfDistrict?: {
    amount: number;
    percentage: number;
    contributionCount: number;
  };
}

interface RecentContribution {
  name: string;
  amount: number;
  date: string;
  city: string;
  state: string;
  employer?: string;
}

interface DonorMetrics {
  totalDonors: number;
  smallDonors: number;
  smallDonorPercentage: number;
  averageSmallDonation: number;
  medianDonation: number;
  averageDonation: number;
  largestDonation: number;
}

interface FinanceTabEnhancedProps {
  bioguideId: string;
  sharedData?: FinanceData;
  sharedLoading?: boolean;
  sharedError?: Error | null;
}

// Tooltip component for explaining FEC data
function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-gray-400 hover:text-gray-600"
        aria-label="More information"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {show && (
        <div className="absolute z-10 w-64 p-2 text-xs text-white bg-gray-800 border-2 border-black -top-2 left-6">
          {text}
          <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45 -left-1 top-3"></div>
        </div>
      )}
    </div>
  );
}

// Modal component for viewing all contributors
function ContributorsModal({
  isOpen,
  onClose,
  contributors,
  metadata,
}: {
  isOpen: boolean;
  onClose: () => void;
  contributors: ContributorData['topContributors'];
  metadata?: ContributorData['metadata'];
}) {
  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-start justify-center p-4 sm:pt-12"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-4xl w-full max-h-[90vh] flex flex-col border-2 border-black my-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b-2 border-black flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">All Individual Contributors</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Showing {contributors?.length || 0} of {metadata?.totalIndividualContributors || 0}{' '}
              individual contributors
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 text-gray-700 hover:text-black hover:bg-gray-100 p-2 rounded-full transition-colors border-2 border-black"
            aria-label="Close modal"
            title="Close (or click outside)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-3">
            {contributors?.map((contributor, index) => (
              <div key={index} className="border p-4 hover:bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {index + 1}. {contributor.name}
                      </span>
                      {contributor.fecTransparencyLink && (
                        <a
                          href={contributor.fecTransparencyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View on FEC.gov →
                        </a>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {contributor.city}, {contributor.state}
                      {contributor.employer && ` • ${contributor.employer}`}
                      {contributor.occupation && ` • ${contributor.occupation}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {contributor.contributionCount} contribution
                      {contributor.contributionCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(contributor.totalAmount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t bg-white">
          {metadata?.fecReceiptsLink && (
            <a
              href={metadata.fecReceiptsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              View all contributions on FEC.gov →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Contribution trends chart component
function ContributionTrendsChart({
  trends,
}: {
  trends?: Array<{ month: string; amount: number; count: number }>;
}) {
  if (!trends || trends.length === 0) return null;

  const maxAmount = Math.max(...trends.map(t => t.amount));
  const formatMonth = (month: string) => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toFixed(0)}`;
  };

  return (
    <div className="bg-white p-6 border border-gray-200">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold">Contribution Trends</h3>
        <InfoTooltip text="Monthly contribution totals over the past 12 months from FEC filings" />
      </div>
      <div className="relative h-48">
        <div className="flex items-end justify-between h-full gap-2">
          {trends.map((trend, index) => {
            const height = (trend.amount / maxAmount) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center justify-end">
                <div className="text-xs text-gray-600 mb-1">{formatCurrency(trend.amount)}</div>
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t hover:from-blue-600 hover:to-blue-500 transition-colors cursor-pointer"
                  style={{ height: `${height}%`, minHeight: '4px' }}
                  title={`${trend.count} contributions totaling ${formatCurrency(trend.amount)}`}
                />
                <div className="text-xs text-gray-500 mt-1">{formatMonth(trend.month)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const FinanceTabEnhanced = React.memo(
  ({ bioguideId, sharedData, sharedLoading, sharedError }: FinanceTabEnhancedProps) => {
    const [showAllContributors, setShowAllContributors] = useState(false);

    // OPTIMIZATION: Use comprehensive endpoint to fetch all finance data in single request
    // This replaces 3 separate API calls with 1 unified call
    const {
      data: comprehensiveData,
      error: fetchError,
      isLoading: fetchLoading,
    } = useSWR(
      `/api/representative/${bioguideId}/finance/comprehensive`,
      async (url: string) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      },
      {
        revalidateOnFocus: false,
        dedupingInterval: 60000, // Cache for 1 minute
        keepPreviousData: true, // Show stale data while revalidating
      }
    );

    // Map comprehensive data to existing component interfaces for backward compatibility
    const individualData: FinanceData | undefined = comprehensiveData
      ? {
          ...comprehensiveData.finance,
          totalRaised: comprehensiveData.finance.totalRaised,
          totalSpent: comprehensiveData.finance.totalSpent,
          cashOnHand: comprehensiveData.finance.cashOnHand,
          individualContributions: comprehensiveData.finance.individualContributions,
          pacContributions: comprehensiveData.finance.pacContributions,
          partyContributions: comprehensiveData.finance.partyContributions,
          candidateContributions: comprehensiveData.finance.candidateContributions,
          candidateId: comprehensiveData.finance.candidateId,
          fecTransparencyLinks: comprehensiveData.finance.fecTransparencyLinks,
        }
      : undefined;

    const contributorData: ContributorData | undefined = comprehensiveData
      ? {
          topContributors: comprehensiveData.contributors.topContributors,
          conduitAggregates: comprehensiveData.contributors.conduitAggregates,
          contributionTrends: comprehensiveData.contributors.contributionTrends,
          metadata: {
            fecCandidateLink: comprehensiveData.contributors.metadata.fecCandidateLink,
            fecCommitteeId: comprehensiveData.contributors.metadata.fecCommitteeId,
            fecReceiptsLink: comprehensiveData.contributors.metadata.fecReceiptsLink,
            totalIndividualContributors:
              comprehensiveData.contributors.metadata.totalIndividualContributors,
            totalCommitteeContributors:
              comprehensiveData.contributors.metadata.totalCommitteeContributors,
          },
        }
      : undefined;

    const industryData: IndustryData | undefined = comprehensiveData
      ? {
          topIndustries: comprehensiveData.industries.topIndustries,
          metadata: {
            totalAnalyzed: comprehensiveData.industries.metadata.totalAnalyzed,
            lastUpdated: comprehensiveData.metadata.lastUpdated,
          },
        }
      : undefined;

    const interestGroupData: InterestGroupData | undefined = comprehensiveData?.interestGroups;

    const geographicData: GeographicData | undefined = comprehensiveData?.geographic;

    const recentContributions: RecentContribution[] | undefined =
      comprehensiveData?.recentContributions;

    const donorMetrics: DonorMetrics | undefined = comprehensiveData?.donorMetrics;

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount || 0);
    };

    const data = sharedData || individualData;
    const error = sharedError || fetchError;
    const isLoading = (sharedLoading && !sharedError) || fetchLoading;

    if (isLoading) {
      return <div className="animate-pulse space-y-6">Loading...</div>;
    }

    if (error) {
      return <div className="text-center py-8 text-red-600">Failed to load financial data</div>;
    }

    if (!data) {
      return (
        <div className="text-center py-8 text-gray-600">No campaign finance data available</div>
      );
    }

    return (
      <div>
        <h2 className="text-xl font-bold mb-6">Campaign Finance</h2>

        {/* Financial Overview with Enhanced FEC Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 border border-green-200">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-green-700">Total Raised</h3>
              <InfoTooltip text="Total contributions received during the current election cycle as reported to the FEC" />
            </div>
            <div className="text-3xl font-bold text-green-900 mb-2">
              {formatCurrency(data.totalRaised)}
            </div>
            <a
              href={
                contributorData?.metadata?.fecReceiptsLink ||
                data.fecTransparencyLinks?.contributions ||
                'https://www.fec.gov/data/receipts/'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full hover:bg-green-300 transition-colors"
            >
              View Receipts on FEC.gov →
            </a>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 border border-red-200">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-red-700">Total Spent</h3>
              <InfoTooltip text="Total disbursements made by the campaign as reported to the FEC" />
            </div>
            <div className="text-3xl font-bold text-red-900 mb-2">
              {formatCurrency(data.totalSpent)}
            </div>
            <a
              href={
                data.fecTransparencyLinks?.disbursements ||
                (contributorData?.metadata?.fecCommitteeId
                  ? `https://www.fec.gov/data/disbursements/?committee_id=${contributorData.metadata.fecCommitteeId}`
                  : 'https://www.fec.gov/data/disbursements/')
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full hover:bg-red-300 transition-colors"
            >
              View Spending on FEC.gov →
            </a>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 border border-blue-200">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-blue-700">Cash on Hand</h3>
              <InfoTooltip text="Available campaign funds at the end of the last reporting period" />
            </div>
            <div className="text-3xl font-bold text-blue-900 mb-2">
              {formatCurrency(data.cashOnHand)}
            </div>
            <a
              href={
                contributorData?.metadata?.fecCommitteeId
                  ? `https://www.fec.gov/data/committee/${contributorData.metadata.fecCommitteeId}/`
                  : data.fecTransparencyLinks?.financialSummary ||
                    'https://www.fec.gov/data/candidate/'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-300 transition-colors"
            >
              View Committee Page →
            </a>
          </div>
        </div>

        {/* Conduit Aggregates (ActBlue/WinRed) */}
        {contributorData?.conduitAggregates && (
          <div className="bg-yellow-50 p-6 border border-yellow-200 mb-8">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-semibold">Online Fundraising Platforms</h3>
              <InfoTooltip text="ActBlue (Democrats) and WinRed (Republicans) are conduit organizations that process small-dollar online donations" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contributorData.conduitAggregates.actblue && (
                <div>
                  <h4 className="font-medium text-blue-700 mb-2">ActBlue</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Raised:</span>
                      <span className="font-medium">
                        {formatCurrency(contributorData.conduitAggregates.actblue.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Individual Donations:</span>
                      <span className="font-medium">
                        {contributorData.conduitAggregates.actblue.contributionCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unique Locations:</span>
                      <span className="font-medium">
                        {contributorData.conduitAggregates.actblue.individualDonors.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {contributorData.conduitAggregates.winred && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2">WinRed</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Raised:</span>
                      <span className="font-medium">
                        {formatCurrency(contributorData.conduitAggregates.winred.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Individual Donations:</span>
                      <span className="font-medium">
                        {contributorData.conduitAggregates.winred.contributionCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unique Locations:</span>
                      <span className="font-medium">
                        {contributorData.conduitAggregates.winred.individualDonors.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contribution Trends */}
        {contributorData?.contributionTrends && contributorData.contributionTrends.length > 0 && (
          <div className="mb-8">
            <ContributionTrendsChart trends={contributorData.contributionTrends} />
          </div>
        )}

        {/* Industry Breakdown */}
        {industryData?.topIndustries && industryData.topIndustries.length > 0 && (
          <div className="bg-white p-6 border border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">Top Contributing Industries</h3>
                <InfoTooltip text="Industries are categorized using OpenSecrets.org-inspired taxonomy by analyzing employer and occupation data from FEC contribution records. Based on a representative sample for performance." />
              </div>
              {industryData.metadata?.totalAnalyzed && (
                <span className="text-xs text-gray-500">
                  {industryData.metadata.totalAnalyzed.toLocaleString()} contributions analyzed
                </span>
              )}
            </div>
            {comprehensiveData?.metadata?.sampleSize && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
                <strong>Representative sample:</strong> Industry breakdown based on{' '}
                {comprehensiveData.metadata.sampleSize.toLocaleString()} recent contributions.
                Percentages reflect contribution patterns within this sample.{' '}
                <span className="text-gray-600">
                  Total raised: ${(comprehensiveData.finance.totalRaised / 1000000).toFixed(2)}M
                  from all sources.
                </span>
              </div>
            )}
            <div className="space-y-3">
              {industryData.topIndustries.slice(0, 10).map((industry, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {industry.industry}
                        </span>
                        {industry.fecVerifyLink && (
                          <a
                            href={industry.fecVerifyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                            title="Verify on FEC.gov"
                          >
                            FEC↗
                          </a>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-900 ml-4">
                        {formatCurrency(industry.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(industry.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">
                        {industry.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {industry.contributionCount.toLocaleString()} contributions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interest Groups & PACs */}
        {interestGroupData?.baskets && interestGroupData.baskets.length > 0 && (
          <div className="bg-white p-6 border border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">Top Interest Groups</h3>
                <InfoTooltip text="Campaign contributions categorized by interest group sectors. Inspired by OpenSecrets.org methodology with FEC data." />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {interestGroupData.baskets.slice(0, 8).map((basket, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded">
                  <span className="text-2xl mr-3">{basket.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{basket.basket}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(basket.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(basket.percentage, 100)}%`,
                            backgroundColor: basket.color,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">
                        {basket.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Grassroots vs Corporate */}
            {interestGroupData.metrics && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Funding Breakdown</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-700">
                      {interestGroupData.metrics.grassrootsPercentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Grassroots (≤$200)</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-700">
                      {interestGroupData.metrics.corporatePercentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Corporate/PAC</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top Individual Contributors */}
        <div className="bg-white p-6 border border-gray-200 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold">Top Individual Contributors</h3>
              <InfoTooltip text="Largest individual contributors excluding committees and PACs. Committee transfers are filtered out to show actual donors." />
            </div>
            <div className="flex gap-2">
              {contributorData?.topContributors && contributorData.topContributors.length > 10 && (
                <button
                  onClick={() => setShowAllContributors(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All {contributorData.topContributors.length} →
                </button>
              )}
            </div>
          </div>
          {comprehensiveData?.metadata?.sampleSize && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
              <strong>Sample-based analysis:</strong> Top contributors shown are based on analysis
              of {comprehensiveData.metadata.sampleSize.toLocaleString()} recent contributions (not
              exhaustive). This represents the largest donors in our sample.{' '}
              {contributorData?.metadata?.fecReceiptsLink && (
                <a
                  href={contributorData.metadata.fecReceiptsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  View all contributions on FEC.gov↗
                </a>
              )}
            </div>
          )}
          <div className="space-y-3">
            {contributorData?.topContributors?.slice(0, 10).map((contributor, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 hover:bg-white rounded"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{contributor.name}</span>
                    {contributor.fecTransparencyLink && (
                      <a
                        href={contributor.fecTransparencyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800"
                        title="View on FEC.gov"
                      >
                        FEC↗
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {contributor.city}, {contributor.state} • {contributor.contributionCount}{' '}
                    contributions
                  </div>
                  {contributor.employer && (
                    <div className="text-xs text-gray-400">
                      {contributor.employer}
                      {contributor.occupation && ` • ${contributor.occupation}`}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium ml-2">
                  {formatCurrency(contributor.totalAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Independent Expenditures (PACs Supporting/Opposing) */}
        {interestGroupData?.pacContributions &&
          (interestGroupData.pacContributions.supportingExpenditures.length > 0 ||
            interestGroupData.pacContributions.opposingExpenditures.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Supporting PACs */}
              {interestGroupData.pacContributions.supportingExpenditures.length > 0 && (
                <div className="bg-green-50 p-6 border border-green-200">
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-semibold text-green-800">
                      PACs Supporting (
                      {interestGroupData.pacContributions.supportingExpenditures.length})
                    </h3>
                    <InfoTooltip text="Independent expenditures made by PACs in support of this candidate" />
                  </div>
                  <div className="space-y-3">
                    {interestGroupData.pacContributions.supportingExpenditures
                      .slice(0, 5)
                      .map((expenditure, index) => (
                        <div key={index} className="bg-white p-3 rounded border border-green-100">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">{expenditure.pacName}</span>
                            <span className="text-green-700 font-semibold">
                              {formatCurrency(expenditure.amount)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {expenditure.pacType} •{' '}
                            {new Date(expenditure.date).toLocaleDateString()}
                          </div>
                          {expenditure.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {expenditure.description}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Opposing PACs */}
              {interestGroupData.pacContributions.opposingExpenditures.length > 0 && (
                <div className="bg-red-50 p-6 border border-red-200">
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-semibold text-red-800">
                      PACs Opposing (
                      {interestGroupData.pacContributions.opposingExpenditures.length})
                    </h3>
                    <InfoTooltip text="Independent expenditures made by PACs in opposition to this candidate" />
                  </div>
                  <div className="space-y-3">
                    {interestGroupData.pacContributions.opposingExpenditures
                      .slice(0, 5)
                      .map((expenditure, index) => (
                        <div key={index} className="bg-white p-3 rounded border border-red-100">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">{expenditure.pacName}</span>
                            <span className="text-red-700 font-semibold">
                              {formatCurrency(expenditure.amount)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {expenditure.pacType} •{' '}
                            {new Date(expenditure.date).toLocaleDateString()}
                          </div>
                          {expenditure.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {expenditure.description}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* PAC Type Breakdown */}
        {interestGroupData?.pacContributions?.byType && (
          <div className="bg-white p-6 border border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">PAC Contributions by Type</h3>
                <InfoTooltip text="Breakdown of Political Action Committee contributions by PAC type" />
              </div>
              {contributorData?.metadata?.fecCommitteeId && (
                <a
                  href={`https://www.fec.gov/data/receipts/?committee_id=${contributorData.metadata.fecCommitteeId}&two_year_transaction_period=2024&is_individual=false`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Verify PACs on FEC.gov →
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded">
                <div className="text-2xl font-bold text-purple-700">
                  {formatCurrency(interestGroupData.pacContributions.byType.superPac)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Super PAC</div>
              </div>
              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(interestGroupData.pacContributions.byType.traditional)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Traditional PAC</div>
              </div>
              <div className="text-center p-4 bg-indigo-50 border border-indigo-200 rounded">
                <div className="text-2xl font-bold text-indigo-700">
                  {formatCurrency(interestGroupData.pacContributions.byType.leadership)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Leadership PAC</div>
              </div>
              <div className="text-center p-4 bg-teal-50 border border-teal-200 rounded">
                <div className="text-2xl font-bold text-teal-700">
                  {formatCurrency(interestGroupData.pacContributions.byType.hybrid)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Hybrid PAC</div>
              </div>
            </div>
          </div>
        )}

        {/* Geographic Breakdown */}
        {geographicData?.topStates && geographicData.topStates.length > 0 && (
          <div className="bg-white p-6 border border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">Top Contributing States</h3>
                <InfoTooltip text="States with the most campaign contributions by total dollar amount" />
              </div>
              {contributorData?.metadata?.fecCommitteeId && (
                <a
                  href={`https://www.fec.gov/data/receipts/?committee_id=${contributorData.metadata.fecCommitteeId}&two_year_transaction_period=2024`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  View by State on FEC.gov →
                </a>
              )}
            </div>
            <div className="space-y-3">
              {geographicData.topStates.slice(0, 10).map((state, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{state.state}</span>
                      <span className="text-sm font-semibold text-gray-900 ml-4">
                        {formatCurrency(state.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(state.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">
                        {state.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {state.contributionCount.toLocaleString()} contributions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Contributions Timeline */}
        {recentContributions && recentContributions.length > 0 && (
          <div className="bg-white p-6 border border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">Recent Contributions</h3>
                <InfoTooltip text="Most recent campaign contributions from FEC filings" />
              </div>
              {contributorData?.metadata?.fecReceiptsLink && (
                <a
                  href={contributorData.metadata.fecReceiptsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All Receipts on FEC.gov →
                </a>
              )}
            </div>
            <div className="space-y-2">
              {recentContributions.slice(0, 20).map((contribution, index) => (
                <div
                  key={index}
                  className="flex justify-between items-start p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{contribution.name}</div>
                    <div className="text-xs text-gray-600">
                      {contribution.city}, {contribution.state}
                      {contribution.employer && ` • ${contribution.employer}`}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(contribution.date).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-green-600 ml-4">
                    {formatCurrency(contribution.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Donor Metrics */}
        {donorMetrics && (
          <div className="bg-white p-6 border border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">Donor Statistics</h3>
                <InfoTooltip text="Statistical analysis of donation patterns and donor behavior" />
              </div>
              {contributorData?.metadata?.fecReceiptsLink && (
                <a
                  href={contributorData.metadata.fecReceiptsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Verify Data on FEC.gov →
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-700">
                  {donorMetrics.totalDonors.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 mt-1">Total Donors</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-700">
                  {donorMetrics.smallDonorPercentage.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600 mt-1">Small Donors (≤$200)</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-700">
                  {formatCurrency(donorMetrics.medianDonation)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Median Donation</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded">
                <div className="text-2xl font-bold text-orange-700">
                  {formatCurrency(donorMetrics.averageDonation)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Average Donation</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-teal-50 rounded">
                <div className="text-xl font-bold text-teal-700">
                  {formatCurrency(donorMetrics.averageSmallDonation)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Avg Small Donation</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded">
                <div className="text-xl font-bold text-red-700">
                  {formatCurrency(donorMetrics.largestDonation)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Largest Single Donation</div>
              </div>
            </div>
          </div>
        )}

        {/* Contributors Modal */}
        <ContributorsModal
          isOpen={showAllContributors}
          onClose={() => setShowAllContributors(false)}
          contributors={contributorData?.topContributors}
          metadata={contributorData?.metadata}
        />
      </div>
    );
  }
);

FinanceTabEnhanced.displayName = 'FinanceTabEnhanced';
