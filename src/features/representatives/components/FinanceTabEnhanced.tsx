/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { ContributorsModal } from '@/features/campaign-finance/components/ContributorsModal';
import { SectorLink, PACLink } from '@/components/shared/links/EntityLinks';

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

interface OrganizationData {
  topOrganizations: Array<{
    name: string;
    totalAmount: number;
    contributionCount: number;
    percentage: number;
    employees: number;
    fecVerifyLink: string;
  }>;
  metadata: {
    totalOrganizations: number;
    totalFromOrganizations: number;
    excludedCategories: string[];
  };
}

interface PacDirectData {
  contributions: Array<{
    pacName: string;
    pacId: string;
    amount: number;
    date: string;
    pacType: 'superPac' | 'traditional' | 'leadership' | 'hybrid' | 'unknown';
    fecLink: string;
  }>;
  totalAmount: number;
  totalCount: number;
  byType: {
    superPac: number;
    traditional: number;
    leadership: number;
    hybrid: number;
  };
  leadershipPACSponsors?: Array<{
    sponsorName: string;
    sponsorBioguideId: string;
    sponsorState: string;
    pacName: string;
    pacId: string;
    amount: number;
    date: string;
    fecLink: string;
  }>;
}

interface SectorSummaryData {
  business: {
    amount: number;
    percentage: number;
    contributionCount: number;
    topIndustries: Array<{ name: string; amount: number }>;
  };
  labor: {
    amount: number;
    percentage: number;
    contributionCount: number;
    topUnions: Array<{ name: string; amount: number }>;
  };
  ideological: {
    amount: number;
    percentage: number;
    contributionCount: number;
    topCauses: Array<{ name: string; amount: number }>;
  };
  other: {
    amount: number;
    percentage: number;
    contributionCount: number;
  };
}

interface DistrictAnalysisData {
  inDistrict: {
    amount: number;
    percentage: number;
    contributionCount: number;
  };
  outOfDistrict: {
    amount: number;
    percentage: number;
    contributionCount: number;
  };
  representativeDistrict?: string;
  unknownLocation: {
    amount: number;
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
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
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
                  className="w-full bg-civiq-blue transition-colors cursor-pointer"
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

    const organizationData: OrganizationData | undefined = comprehensiveData?.organizations;

    const recentContributions: RecentContribution[] | undefined =
      comprehensiveData?.recentContributions;

    const donorMetrics: DonorMetrics | undefined = comprehensiveData?.donorMetrics;

    // NEW: Three new data sources
    const pacDirectData: PacDirectData | undefined = comprehensiveData?.pacDirect;
    const sectorSummaryData: SectorSummaryData | undefined = comprehensiveData?.sectorSummary;
    const districtAnalysisData: DistrictAnalysisData | undefined =
      comprehensiveData?.districtAnalysis;

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
      return <div className="text-center py-8 text-amber-600">Failed to load financial data</div>;
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
          <div className="bg-civiq-blue/10 p-6 border border-civiq-blue">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-civiq-blue">Total Raised</h3>
              <InfoTooltip text="Total contributions received during the current election cycle as reported to the FEC" />
            </div>
            <div className="text-3xl font-bold text-civiq-blue mb-2">
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
              className="inline-flex items-center text-xs bg-civiq-blue/10 text-civiq-blue px-2 py-1 hover:bg-civiq-blue transition-colors"
            >
              View Receipts on FEC.gov →
            </a>
          </div>

          <div className="bg-civiq-blue/10 p-6 border border-civiq-blue">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-civiq-blue">Total Spent</h3>
              <InfoTooltip text="Total disbursements made by the campaign as reported to the FEC" />
            </div>
            <div className="text-3xl font-bold text-civiq-blue mb-2">
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
              className="inline-flex items-center text-xs bg-civiq-blue/10 text-civiq-blue px-2 py-1 hover:bg-civiq-blue transition-colors"
            >
              View Spending on FEC.gov →
            </a>
          </div>

          <div className="bg-civiq-blue/10 p-6 border border-civiq-blue">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-civiq-blue">Cash on Hand</h3>
              <InfoTooltip text="Available campaign funds at the end of the last reporting period" />
            </div>
            <div className="text-3xl font-bold text-civiq-blue mb-2">
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
              className="inline-flex items-center text-xs bg-civiq-blue/10 text-civiq-blue px-2 py-1 hover:bg-civiq-blue transition-colors"
            >
              View Committee Page →
            </a>
          </div>
        </div>

        {/* NEW: Sector Summary Cards (Business vs Labor vs Ideological) */}
        {sectorSummaryData && (
          <div className="bg-white p-6 border border-gray-200 mb-8">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-semibold">Funding by Sector</h3>
              <InfoTooltip text="High-level breakdown: Business (corporations, professionals), Labor (unions), Ideological (advocacy groups, single-issue), Other (retired, self-employed, etc.)" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Business */}
              <div className="text-center p-4 bg-civiq-blue/10 border-2 border-civiq-blue">
                <div className="text-2xl font-bold text-civiq-blue">
                  {sectorSummaryData.business.percentage.toFixed(0)}%
                </div>
                <div className="text-xs font-semibold text-civiq-blue uppercase mt-1">Business</div>
                <div className="text-lg font-semibold text-gray-900 mt-2">
                  {formatCurrency(sectorSummaryData.business.amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {sectorSummaryData.business.contributionCount.toLocaleString()} contributions
                </div>
              </div>
              {/* Labor */}
              <div className="text-center p-4 bg-civiq-blue/10 border-2 border-civiq-blue">
                <div className="text-2xl font-bold text-civiq-blue">
                  {sectorSummaryData.labor.percentage.toFixed(0)}%
                </div>
                <div className="text-xs font-semibold text-civiq-blue uppercase mt-1">Labor</div>
                <div className="text-lg font-semibold text-gray-900 mt-2">
                  {formatCurrency(sectorSummaryData.labor.amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {sectorSummaryData.labor.contributionCount.toLocaleString()} contributions
                </div>
              </div>
              {/* Ideological */}
              <div className="text-center p-4 bg-civiq-blue/10 border-2 border-civiq-blue">
                <div className="text-2xl font-bold text-civiq-blue">
                  {sectorSummaryData.ideological.percentage.toFixed(0)}%
                </div>
                <div className="text-xs font-semibold text-civiq-blue uppercase mt-1">
                  Ideological
                </div>
                <div className="text-lg font-semibold text-gray-900 mt-2">
                  {formatCurrency(sectorSummaryData.ideological.amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {sectorSummaryData.ideological.contributionCount.toLocaleString()} contributions
                </div>
              </div>
              {/* Other */}
              <div className="text-center p-4 bg-gray-50 border-2 border-gray-200">
                <div className="text-2xl font-bold text-gray-600">
                  {sectorSummaryData.other.percentage.toFixed(0)}%
                </div>
                <div className="text-xs font-semibold text-gray-500 uppercase mt-1">Other</div>
                <div className="text-lg font-semibold text-gray-900 mt-2">
                  {formatCurrency(sectorSummaryData.other.amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {sectorSummaryData.other.contributionCount.toLocaleString()} contributions
                </div>
              </div>
            </div>
            {/* Top items in each sector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {sectorSummaryData.business.topIndustries.length > 0 && (
                <div>
                  <h4 className="font-semibold text-civiq-blue mb-2">Top Business Industries</h4>
                  <ul className="space-y-1">
                    {sectorSummaryData.business.topIndustries.slice(0, 3).map((item, i) => (
                      <li key={i} className="flex justify-between text-xs">
                        <span className="text-gray-600 truncate mr-2">{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {sectorSummaryData.labor.topUnions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-civiq-blue mb-2">Top Labor Sources</h4>
                  <ul className="space-y-1">
                    {sectorSummaryData.labor.topUnions.slice(0, 3).map((item, i) => (
                      <li key={i} className="flex justify-between text-xs">
                        <span className="text-gray-600 truncate mr-2">{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {sectorSummaryData.ideological.topCauses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-civiq-blue mb-2">Top Ideological Causes</h4>
                  <ul className="space-y-1">
                    {sectorSummaryData.ideological.topCauses.slice(0, 3).map((item, i) => (
                      <li key={i} className="flex justify-between text-xs">
                        <span className="text-gray-600 truncate mr-2">{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NEW: In-District vs Out-of-District Analysis */}
        {districtAnalysisData && (
          <div className="bg-white p-6 border border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">Constituent vs Outside Funding</h3>
                <InfoTooltip text="Shows what percentage of contributions come from within the representative's district/state versus outside. Based on contributor ZIP codes." />
              </div>
              {districtAnalysisData.representativeDistrict && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1">
                  {districtAnalysisData.representativeDistrict}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-6">
              {/* In-District */}
              <div className="text-center">
                <div
                  className={`text-4xl font-bold ${
                    districtAnalysisData.inDistrict.percentage >= 50
                      ? 'text-gray-700'
                      : 'text-amber-600'
                  }`}
                >
                  {districtAnalysisData.inDistrict.percentage.toFixed(0)}%
                </div>
                <div className="text-sm font-semibold text-gray-700 mt-1">
                  In-District / In-State
                </div>
                <div className="text-lg font-semibold text-gray-900 mt-2">
                  {formatCurrency(districtAnalysisData.inDistrict.amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {districtAnalysisData.inDistrict.contributionCount.toLocaleString()} contributions
                </div>
              </div>
              {/* Out-of-District */}
              <div className="text-center">
                <div
                  className={`text-4xl font-bold ${
                    districtAnalysisData.outOfDistrict.percentage > 50
                      ? 'text-amber-600'
                      : 'text-gray-600'
                  }`}
                >
                  {districtAnalysisData.outOfDistrict.percentage.toFixed(0)}%
                </div>
                <div className="text-sm font-semibold text-gray-700 mt-1">
                  Out-of-District / Out-of-State
                </div>
                <div className="text-lg font-semibold text-gray-900 mt-2">
                  {formatCurrency(districtAnalysisData.outOfDistrict.amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {districtAnalysisData.outOfDistrict.contributionCount.toLocaleString()}{' '}
                  contributions
                </div>
              </div>
            </div>
            {/* Visual bar */}
            <div className="mt-4">
              <div className="flex h-4 overflow-hidden bg-gray-200">
                <div
                  className="bg-civiq-blue transition-all"
                  style={{ width: `${districtAnalysisData.inDistrict.percentage}%` }}
                  title={`In-District: ${districtAnalysisData.inDistrict.percentage.toFixed(1)}%`}
                />
                <div
                  className="bg-amber-600 transition-all"
                  style={{ width: `${districtAnalysisData.outOfDistrict.percentage}%` }}
                  title={`Out-of-District: ${districtAnalysisData.outOfDistrict.percentage.toFixed(1)}%`}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Constituent funding</span>
                <span>Outside funding</span>
              </div>
            </div>
            {districtAnalysisData.unknownLocation.contributionCount > 0 && (
              <div className="mt-3 text-xs text-gray-400">
                Note: {districtAnalysisData.unknownLocation.contributionCount.toLocaleString()}{' '}
                contributions ({formatCurrency(districtAnalysisData.unknownLocation.amount)}) had
                unknown locations
              </div>
            )}
          </div>
        )}

        {/* Conduit Aggregates (ActBlue/WinRed) */}
        {contributorData?.conduitAggregates && (
          <div className="bg-gray-100 p-6 border border-gray-300 mb-8">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-semibold">Online Fundraising Platforms</h3>
              <InfoTooltip text="ActBlue (Democrats) and WinRed (Republicans) are conduit organizations that process small-dollar online donations" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contributorData.conduitAggregates.actblue && (
                <div>
                  <h4 className="font-medium text-civiq-blue mb-2">ActBlue</h4>
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
                  <h4 className="font-medium text-civiq-red mb-2">WinRed</h4>
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
              <div className="mb-4 p-3 bg-civiq-blue/10 border border-civiq-blue text-sm text-gray-700">
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
                          <SectorLink sector={industry.sector} className="font-medium" />
                          {industry.category ? `: ${industry.category}` : ''}
                        </span>
                        {industry.fecVerifyLink && (
                          <a
                            href={industry.fecVerifyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-civiq-blue hover:text-civiq-blue underline"
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
                      <div className="flex-1 bg-gray-200 h-2">
                        <div
                          className="bg-civiq-blue h-2 transition-all"
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

        {/* Top Contributing Organizations (OpenSecrets-style) */}
        {organizationData?.topOrganizations && organizationData.topOrganizations.length > 0 && (
          <div className="bg-white p-6 border border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">Top Contributing Organizations</h3>
                <InfoTooltip text="Contributions aggregated by employer. Shows total from all employees of each organization. Excludes self-employed, retired, and unemployed. Inspired by OpenSecrets.org methodology." />
              </div>
              {organizationData.metadata && (
                <span className="text-xs text-gray-500">
                  {organizationData.metadata.totalOrganizations.toLocaleString()} organizations
                </span>
              )}
            </div>
            {comprehensiveData?.metadata?.sampleSize && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-sm text-gray-700">
                <strong>Employer aggregation:</strong> Shows total contributions from employees of
                each organization. Based on {comprehensiveData.metadata.sampleSize.toLocaleString()}{' '}
                recent contributions.
              </div>
            )}
            <div className="space-y-3">
              {organizationData.topOrganizations.slice(0, 15).map((org, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{org.name}</span>
                        {org.fecVerifyLink && (
                          <a
                            href={org.fecVerifyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-civiq-blue hover:text-civiq-blue underline"
                            title="Verify on FEC.gov"
                          >
                            FEC
                          </a>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-900 ml-4">
                        {formatCurrency(org.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 h-2">
                        <div
                          className="bg-amber-500 h-2 transition-all"
                          style={{ width: `${Math.min(org.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">
                        {org.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {org.employees.toLocaleString()} employee{org.employees !== 1 ? 's' : ''} •{' '}
                      {org.contributionCount.toLocaleString()} contribution
                      {org.contributionCount !== 1 ? 's' : ''}
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
                <div key={index} className="flex items-center p-3 bg-gray-50">
                  <span className="text-2xl mr-3">{basket.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{basket.basket}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(basket.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 h-2">
                        <div
                          className="h-2 transition-all"
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
                  <div className="text-center p-4 bg-civiq-blue/10">
                    <div className="text-2xl font-bold text-civiq-blue">
                      {interestGroupData.metrics.grassrootsPercentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Grassroots (≤$200)</div>
                  </div>
                  <div className="text-center p-4 bg-civiq-blue/10">
                    <div className="text-2xl font-bold text-civiq-blue">
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
                  className="text-sm text-civiq-blue hover:text-civiq-blue font-medium"
                >
                  View All {contributorData.topContributors.length} →
                </button>
              )}
            </div>
          </div>
          {comprehensiveData?.metadata?.sampleSize && (
            <div className="mb-4 p-3 bg-civiq-blue/10 border border-civiq-blue text-sm text-gray-700">
              <strong>Sample-based analysis:</strong> Top contributors shown are based on analysis
              of {comprehensiveData.metadata.sampleSize.toLocaleString()} recent contributions (not
              exhaustive). This represents the largest donors in our sample.{' '}
              {contributorData?.metadata?.fecReceiptsLink && (
                <a
                  href={contributorData.metadata.fecReceiptsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-civiq-blue hover:text-civiq-blue underline"
                >
                  View all contributions on FEC.gov↗
                </a>
              )}
            </div>
          )}
          <div className="space-y-3">
            {contributorData?.topContributors?.slice(0, 10).map((contributor, index) => (
              <div key={index} className="flex justify-between items-center p-2 hover:bg-white">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{contributor.name}</span>
                    {contributor.fecTransparencyLink && (
                      <a
                        href={contributor.fecTransparencyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-civiq-blue hover:text-civiq-blue"
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

        {/* NEW: PAC Direct Contributions */}
        {pacDirectData && pacDirectData.contributions.length > 0 && (
          <div className="bg-white p-6 border border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold">PAC Direct Contributions</h3>
                <InfoTooltip text="Political Action Committees that contributed directly to this candidate's campaign (not independent expenditures). These are coordinated contributions subject to FEC limits." />
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-semibold">{formatCurrency(pacDirectData.totalAmount)}</span>
                <span className="text-gray-400"> from </span>
                <span className="font-semibold">{pacDirectData.totalCount} PACs</span>
              </div>
            </div>
            {/* PAC Type Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="text-center p-3 bg-civiq-blue/10 border border-civiq-blue">
                <div className="text-lg font-bold text-civiq-blue">
                  {formatCurrency(pacDirectData.byType.traditional)}
                </div>
                <div className="text-xs text-gray-600">Traditional PAC</div>
              </div>
              <div className="text-center p-3 bg-civiq-blue/10 border border-civiq-blue">
                <div className="text-lg font-bold text-civiq-blue">
                  {formatCurrency(pacDirectData.byType.leadership)}
                </div>
                <div className="text-xs text-gray-600">Leadership PAC</div>
              </div>
              <div className="text-center p-3 bg-civiq-blue/10 border border-civiq-blue">
                <div className="text-lg font-bold text-civiq-blue">
                  {formatCurrency(pacDirectData.byType.superPac)}
                </div>
                <div className="text-xs text-gray-600">Super PAC</div>
              </div>
              <div className="text-center p-3 bg-teal-50 border border-teal-200">
                <div className="text-lg font-bold text-teal-700">
                  {formatCurrency(pacDirectData.byType.hybrid)}
                </div>
                <div className="text-xs text-gray-600">Hybrid PAC</div>
              </div>
            </div>
            {/* PAC List */}
            <div className="space-y-2">
              {pacDirectData.contributions.slice(0, 15).map((pac, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <PACLink
                        committeeId={pac.pacId}
                        name={pac.pacName}
                        className="font-medium text-sm"
                      />
                      <a
                        href={pac.fecLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-civiq-blue hover:text-civiq-blue"
                        title="View PAC on FEC.gov"
                      >
                        FEC
                      </a>
                    </div>
                    <div className="text-xs text-gray-500">
                      {pac.pacType !== 'unknown' && (
                        <span className="capitalize">
                          {pac.pacType.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      )}
                      {pac.date && (
                        <>
                          {pac.pacType !== 'unknown' && ' • '}
                          {new Date(pac.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 ml-4">
                    {formatCurrency(pac.amount)}
                  </span>
                </div>
              ))}
            </div>
            {pacDirectData.contributions.length > 15 && (
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-500">
                  Showing top 15 of {pacDirectData.totalCount} PAC contributions
                </span>
              </div>
            )}
          </div>
        )}

        {/* NEW: Leadership PAC Sponsors - Contributions from Other Politicians */}
        {pacDirectData?.leadershipPACSponsors && pacDirectData.leadershipPACSponsors.length > 0 && (
          <div className="bg-indigo-50 p-6 border border-indigo-200 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-indigo-800">
                  Contributions from Other Politicians
                </h3>
                <InfoTooltip text="Leadership PACs are political action committees controlled by members of Congress. When another politician's Leadership PAC contributes to this candidate, it indicates political support and alliance." />
              </div>
              <span className="text-sm text-indigo-600 font-medium">
                {pacDirectData.leadershipPACSponsors.length} politician
                {pacDirectData.leadershipPACSponsors.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {pacDirectData.leadershipPACSponsors.slice(0, 10).map((sponsor, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-white border border-indigo-100"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/representative/${sponsor.sponsorBioguideId}`}
                        className="font-medium text-sm text-indigo-700 hover:text-indigo-900 hover:underline"
                      >
                        {sponsor.sponsorName}
                      </a>
                      <span className="text-xs text-gray-500">({sponsor.sponsorState})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span>
                        via{' '}
                        <PACLink
                          committeeId={sponsor.pacId}
                          name={sponsor.pacName}
                          className="text-xs"
                        />
                      </span>
                      <a
                        href={sponsor.fecLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-civiq-blue hover:text-civiq-blue"
                      >
                        FEC
                      </a>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-indigo-700 ml-4">
                    {formatCurrency(sponsor.amount)}
                  </span>
                </div>
              ))}
            </div>
            {pacDirectData.leadershipPACSponsors.length > 10 && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Showing top 10 of {pacDirectData.leadershipPACSponsors.length} politician
                contributions
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-indigo-200">
              <div className="text-xs text-indigo-600">
                <strong>Total from Leadership PACs:</strong>{' '}
                {formatCurrency(
                  pacDirectData.leadershipPACSponsors.reduce((sum, s) => sum + s.amount, 0)
                )}
              </div>
            </div>
          </div>
        )}

        {/* Independent Expenditures (PACs Supporting/Opposing) */}
        {interestGroupData?.pacContributions &&
          (interestGroupData.pacContributions.supportingExpenditures.length > 0 ||
            interestGroupData.pacContributions.opposingExpenditures.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Supporting PACs — amber for expenditure direction in either direction;
                  green/red are reserved for party identification, not metric direction. */}
              {interestGroupData.pacContributions.supportingExpenditures.length > 0 && (
                <div className="bg-amber-600/10 p-6 border border-amber-600">
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-semibold text-amber-600">
                      PACs Supporting (
                      {interestGroupData.pacContributions.supportingExpenditures.length})
                    </h3>
                    <InfoTooltip text="Independent expenditures made by PACs in support of this candidate" />
                  </div>
                  <div className="space-y-3">
                    {interestGroupData.pacContributions.supportingExpenditures
                      .slice(0, 5)
                      .map((expenditure, index) => (
                        <div key={index} className="bg-white p-3 border border-amber-600">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">{expenditure.pacName}</span>
                            <span className="text-amber-600 font-semibold">
                              {formatCurrency(expenditure.amount)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {expenditure.pacType} •{' '}
                            {new Date(expenditure.date).toLocaleDateString('en-US', {
                              timeZone: 'UTC',
                            })}
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
                <div className="bg-amber-600/10 p-6 border border-amber-600">
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-semibold text-amber-600">
                      PACs Opposing (
                      {interestGroupData.pacContributions.opposingExpenditures.length})
                    </h3>
                    <InfoTooltip text="Independent expenditures made by PACs in opposition to this candidate" />
                  </div>
                  <div className="space-y-3">
                    {interestGroupData.pacContributions.opposingExpenditures
                      .slice(0, 5)
                      .map((expenditure, index) => (
                        <div key={index} className="bg-white p-3 border border-amber-600">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">{expenditure.pacName}</span>
                            <span className="text-amber-600 font-semibold">
                              {formatCurrency(expenditure.amount)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {expenditure.pacType} •{' '}
                            {new Date(expenditure.date).toLocaleDateString('en-US', {
                              timeZone: 'UTC',
                            })}
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
                  className="text-xs text-civiq-blue hover:text-civiq-blue font-medium"
                >
                  Verify PACs on FEC.gov →
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-civiq-blue/10 border border-civiq-blue">
                <div className="text-2xl font-bold text-civiq-blue">
                  {formatCurrency(interestGroupData.pacContributions.byType.superPac)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Super PAC</div>
              </div>
              <div className="text-center p-4 bg-civiq-blue/10 border border-civiq-blue">
                <div className="text-2xl font-bold text-civiq-blue">
                  {formatCurrency(interestGroupData.pacContributions.byType.traditional)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Traditional PAC</div>
              </div>
              <div className="text-center p-4 bg-indigo-50 border border-indigo-200">
                <div className="text-2xl font-bold text-indigo-700">
                  {formatCurrency(interestGroupData.pacContributions.byType.leadership)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Leadership PAC</div>
              </div>
              <div className="text-center p-4 bg-teal-50 border border-teal-200">
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
                  className="text-xs text-civiq-blue hover:text-civiq-blue font-medium"
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
                      <div className="flex-1 bg-gray-200 h-2">
                        <div
                          className="bg-indigo-600 h-2 transition-all"
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
                  className="text-xs text-civiq-blue hover:text-civiq-blue font-medium"
                >
                  View All Receipts on FEC.gov →
                </a>
              )}
            </div>
            <div className="space-y-2">
              {recentContributions.slice(0, 20).map((contribution, index) => (
                <div
                  key={index}
                  className="flex justify-between items-start p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{contribution.name}</div>
                    <div className="text-xs text-gray-600">
                      {contribution.city}, {contribution.state}
                      {contribution.employer && ` • ${contribution.employer}`}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(contribution.date).toLocaleDateString('en-US', {
                        timeZone: 'UTC',
                      })}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 ml-4">
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
                  className="text-xs text-civiq-blue hover:text-civiq-blue font-medium"
                >
                  Verify Data on FEC.gov →
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-civiq-blue/10">
                <div className="text-2xl font-bold text-civiq-blue">
                  {donorMetrics.totalDonors.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 mt-1">Total Donors</div>
              </div>
              <div className="text-center p-4 bg-civiq-blue/10">
                <div className="text-2xl font-bold text-civiq-blue">
                  {donorMetrics.smallDonorPercentage.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600 mt-1">Small Donors (≤$200)</div>
              </div>
              <div className="text-center p-4 bg-civiq-blue/10">
                <div className="text-2xl font-bold text-civiq-blue">
                  {formatCurrency(donorMetrics.medianDonation)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Median Donation</div>
              </div>
              <div className="text-center p-4 bg-civiq-blue/10">
                <div className="text-2xl font-bold text-civiq-blue">
                  {formatCurrency(donorMetrics.averageDonation)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Average Donation</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-teal-50">
                <div className="text-xl font-bold text-teal-700">
                  {formatCurrency(donorMetrics.averageSmallDonation)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Avg Small Donation</div>
              </div>
              <div className="text-center p-4 bg-civiq-blue/10">
                <div className="text-xl font-bold text-civiq-blue">
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
