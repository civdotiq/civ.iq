/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
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

interface BatchApiResponse {
  success: boolean;
  data: {
    finance?: FinanceData;
  };
}

interface FinanceTabProps {
  bioguideId: string;
  sharedData?: FinanceData;
  sharedLoading?: boolean;
  sharedError?: Error | null;
}

interface IndustryData {
  topIndustries?: Array<{
    industry: string;
    amount: number;
    percentage: number;
    contributionCount: number;
  }>;
}

interface GeographyData {
  inStateTotal?: number;
  outOfStateTotal?: number;
  inStatePercentage?: number;
  outOfStatePercentage?: number;
  topStates?: Array<{
    state: string;
    stateName: string;
    amount: number;
    percentage: number;
    contributionCount: number;
    isHomeState: boolean;
  }>;
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
  }>;
  metadata?: {
    fecCandidateLink?: string;
  };
}

interface FinanceDetailCardProps {
  title: string;
  description: string;
  endpoint: string;
  renderContent: (data: unknown) => React.ReactNode;
}

function FinanceDetailCard({
  title,
  description,
  endpoint,
  renderContent,
}: FinanceDetailCardProps) {
  const { data, error, isLoading } = useSWR(endpoint, (url: string) =>
    fetch(url).then(res => res.json())
  );

  return (
    <div className="bg-white p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>

      {isLoading && (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      )}

      {error && <div className="text-red-600 text-sm">Failed to load data</div>}

      {data && !isLoading && !error && renderContent(data)}
    </div>
  );
}

export function FinanceTab({
  bioguideId,
  sharedData,
  sharedLoading,
  sharedError,
}: FinanceTabProps) {
  // SYSTEMS FIX: Use batch API consistently (no more dual paths)
  const {
    data: batchData,
    error: fetchError,
    isLoading: fetchLoading,
  } = useSWR<BatchApiResponse>(
    sharedData ? null : `/api/representative/${bioguideId}/batch`,
    sharedData
      ? null
      : () =>
          fetch(`/api/representative/${bioguideId}/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoints: ['finance'] }),
          }).then(res => res.json()),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  const data: FinanceData | undefined = sharedData || batchData?.data?.finance;
  const error = sharedError || fetchError;
  const isLoading = sharedLoading || fetchLoading;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>

        {/* Enhanced loading skeleton for finance cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 border border-green-200">
            <div className="h-6 bg-green-200 rounded w-2/3 mb-4"></div>
            <div className="h-10 bg-green-300 rounded w-full mb-2"></div>
            <div className="h-4 bg-green-200 rounded w-3/4 mb-3"></div>
            <div className="h-6 bg-green-200 rounded-full w-20"></div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 border border-red-200">
            <div className="h-6 bg-red-200 rounded w-2/3 mb-4"></div>
            <div className="h-10 bg-red-300 rounded w-full mb-2"></div>
            <div className="h-4 bg-red-200 rounded w-3/4 mb-3"></div>
            <div className="h-6 bg-red-200 rounded-full w-20"></div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 border border-blue-200">
            <div className="h-6 bg-blue-200 rounded w-2/3 mb-4"></div>
            <div className="h-10 bg-blue-300 rounded w-full mb-2"></div>
            <div className="h-4 bg-blue-200 rounded w-3/4 mb-3"></div>
            <div className="h-6 bg-blue-200 rounded-full w-20"></div>
          </div>
        </div>

        {/* Loading skeleton for contribution sources */}
        <div className="bg-white p-6 border border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">Failed to load financial data</div>
        <div className="text-sm text-gray-500">Please try refreshing the page</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 mb-2">No campaign finance data available</div>
        <div className="text-sm text-gray-400">Financial data is sourced from FEC filings</div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Campaign Finance</h2>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 border border-green-200 hover:border-2 border-black transition-all duration-200">
          <h3 className="text-lg font-semibold text-green-700 mb-2">Total Raised</h3>
          <div className="text-3xl font-bold text-green-900 mb-2">
            {formatCurrency(data.totalRaised)}
          </div>
          <div className="text-sm text-green-600 mb-2">Total receipts reported to FEC</div>
          <a
            href={
              data.fecTransparencyLinks?.contributions ||
              (data.candidateId
                ? `https://www.fec.gov/data/receipts/?committee_id=${data.candidateId}`
                : 'https://www.fec.gov/data/receipts/')
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full hover:bg-green-300 transition-colors"
          >
            View on FEC.gov →
          </a>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 border border-red-200 hover:border-2 border-black transition-all duration-200">
          <h3 className="text-lg font-semibold text-red-700 mb-2">Total Spent</h3>
          <div className="text-3xl font-bold text-red-900 mb-2">
            {formatCurrency(data.totalSpent)}
          </div>
          <div className="text-sm text-red-600 mb-2">Total disbursements reported to FEC</div>
          <a
            href={
              data.fecTransparencyLinks?.disbursements ||
              (data.candidateId
                ? `https://www.fec.gov/data/disbursements/?committee_id=${data.candidateId}`
                : 'https://www.fec.gov/data/disbursements/')
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full hover:bg-red-300 transition-colors"
          >
            View on FEC.gov →
          </a>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 border border-blue-200 hover:border-2 border-black transition-all duration-200">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Cash on Hand</h3>
          <div className="text-3xl font-bold text-blue-900 mb-2">
            {formatCurrency(data.cashOnHand)}
          </div>
          <div className="text-sm text-blue-600 mb-2">
            Available cash at end of reporting period
          </div>
          <a
            href={
              data.fecTransparencyLinks?.financialSummary ||
              (data.candidateId
                ? `https://www.fec.gov/data/candidate/${data.candidateId}`
                : 'https://www.fec.gov/data/candidate/')
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-300 transition-colors"
          >
            View on FEC.gov →
          </a>
        </div>
      </div>

      {/* Contribution Sources */}
      <div className="bg-white p-6 border border-gray-200 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Contribution Sources</h3>
          <a
            href={
              data.fecTransparencyLinks?.contributions ||
              'https://www.fec.gov/data/receipts/individual-contributions/'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            View on FEC.gov →
          </a>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Individual Contributions</span>
            <span className="font-medium">{formatCurrency(data.individualContributions)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">PAC Contributions</span>
            <span className="font-medium">{formatCurrency(data.pacContributions)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Party Contributions</span>
            <span className="font-medium">{formatCurrency(data.partyContributions)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Candidate Contributions</span>
            <span className="font-medium">{formatCurrency(data.candidateContributions)}</span>
          </div>
        </div>
      </div>

      {/* Enhanced Finance Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <FinanceDetailCard
          title="Top Industries"
          description="Campaign contributions by industry (Source: FEC)"
          endpoint={`/api/representative/${bioguideId}/finance/industries`}
          renderContent={(data: unknown) => {
            const industryData = data as IndustryData;
            return (
              <div className="space-y-3">
                {industryData?.topIndustries?.slice(0, 5).map((industry, index: number) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{industry.industry}</span>
                    <span className="text-sm font-medium">{formatCurrency(industry.amount)}</span>
                  </div>
                ))}
              </div>
            );
          }}
        />

        <FinanceDetailCard
          title="Geographic Distribution"
          description="In-state vs out-of-state contributions (Source: FEC)"
          endpoint={`/api/representative/${bioguideId}/finance/geography`}
          renderContent={(data: unknown) => {
            const geographyData = data as GeographyData;
            return (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">In-State</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(geographyData?.inStateTotal || 0)} (
                    {(geographyData?.inStatePercentage || 0).toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Out-of-State</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(geographyData?.outOfStateTotal || 0)} (
                    {(geographyData?.outOfStatePercentage || 0).toFixed(1)}%)
                  </span>
                </div>
                {geographyData?.topStates?.slice(0, 3).map((state, index: number) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">{state.stateName}</span>
                    <span className="text-gray-600">{formatCurrency(state.amount)}</span>
                  </div>
                ))}
              </div>
            );
          }}
        />
      </div>

      {/* Top Contributors */}
      <FinanceDetailCard
        title="Top Individual Contributors (20+)"
        description="Largest individual contributors to campaign with direct FEC.gov links"
        endpoint={`/api/representative/${bioguideId}/finance/contributors`}
        renderContent={(data: unknown) => {
          const contributorData = data as ContributorData;
          return (
            <div className="space-y-3">
              {contributorData?.topContributors?.slice(0, 20).map((contributor, index: number) => (
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
              {contributorData?.topContributors && contributorData.topContributors.length > 20 && (
                <div className="pt-2 border-t">
                  <a
                    href={contributorData?.metadata?.fecCandidateLink || 'https://www.fec.gov'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    View all {contributorData.topContributors.length} contributors on FEC.gov →
                  </a>
                </div>
              )}
            </div>
          );
        }}
      />

      {/* FEC Transparency Links */}
      {data.fecTransparencyLinks && (
        <div className="bg-blue-50 p-6 border border-blue-200 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">FEC Transparency Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href={data.fecTransparencyLinks.candidatePage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              View Full FEC Candidate Profile →
            </a>
            <a
              href={data.fecTransparencyLinks.contributions}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Browse All Individual Contributions →
            </a>
            <a
              href={data.fecTransparencyLinks.disbursements}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              View Campaign Expenditures →
            </a>
            <a
              href={data.fecTransparencyLinks.financialSummary}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              See Financial Summary →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
