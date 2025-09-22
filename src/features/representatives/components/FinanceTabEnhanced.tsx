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
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">All Individual Contributors</h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing {contributors?.length || 0} of {metadata?.totalIndividualContributors || 0}{' '}
              individual contributors
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close modal"
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

export function FinanceTabEnhanced({
  bioguideId,
  sharedData,
  sharedLoading,
  sharedError,
}: FinanceTabEnhancedProps) {
  const [showAllContributors, setShowAllContributors] = useState(false);

  // Fetch contributor data with enhanced information
  const { data: contributorData } = useSWR<ContributorData>(
    `/api/representative/${bioguideId}/finance/contributors`,
    (url: string) => fetch(url).then(res => res.json()),
    { revalidateOnFocus: false }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const data = sharedData;
  const error = sharedError;
  const isLoading = sharedLoading;

  if (isLoading) {
    return <div className="animate-pulse space-y-6">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">Failed to load financial data</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-600">No campaign finance data available</div>;
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

      {/* Top Individual Contributors */}
      <div className="bg-white p-6 border border-gray-200">
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
