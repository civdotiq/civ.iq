/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
} from 'recharts';
import { InterestGroupBaskets } from './InterestGroupBaskets';
import { DataQualityBadge, DataQualityIndicator } from './DataQualityBadge';
import { HeroSummary } from './HeroSummary';
import { FundraisingSources } from './FundraisingSources';
import { TopIndustries } from './TopIndustries';
import { TopContributors } from './TopContributors';
import { useResponsiveChartHeight } from '../../../hooks/useResponsiveChartHeight';
import { CHART_COLORS } from '../../../lib/constants/chart-colors';
import { StockTradesSection } from './StockTradesSection';
import { SecFilingsSection } from './SecFilingsSection';
import { TradeSectorBreakdown } from '@/components/intelligence/TradeSectorBreakdown';
import { StockTradeRankBadge } from '@/components/intelligence/StockTradeRankBadge';
import { PACLink } from '@/components/shared/links/EntityLinks';
import { FundingNarrative } from './FundingNarrative';
import { generateFundingNarrative } from '@/lib/campaign-finance/narrative';
import { GeographicBreakdown } from './GeographicBreakdown';
import { DynamicFundraisingTrends } from '@/components/dynamic';

// Chart colors - using centralized brand palette
const COLORS = CHART_COLORS;

interface CampaignFinanceData {
  // New direct fields from our API fix
  totalRaised?: number;
  totalSpent?: number;
  cashOnHand?: number;
  individualContributions?: number;
  pacContributions?: number;
  partyContributions?: number;
  candidateContributions?: number;

  // Legacy financial_summary structure (fallback)
  financial_summary?: Array<{
    cycle: number;
    total_receipts: number;
    total_disbursements: number;
    cash_on_hand_end_period: number;
    individual_contributions: number;
    pac_contributions: number;
    party_contributions: number;
    candidate_contributions: number;
  }>;

  // Top contributors with amounts
  top_contributors?: Array<{
    name: string;
    total_amount: number;
    count: number;
    employer?: string;
    occupation?: string;
  }>;

  // Industry breakdown
  industry_breakdown?: Array<{
    sector: string;
    amount: number;
    percentage: number;
  }>;

  // Recent data
  recent_contributions?: Array<{
    contributor_name: string;
    contributor_employer?: string;
    contribution_receipt_amount: number;
    contribution_receipt_date: string;
  }>;
  recent_expenditures?: Array<{
    recipient_name: string;
    disbursement_description: string;
    disbursement_amount: number;
    disbursement_date: string;
  }>;

  // Phase 1 fields
  pacContributionsByType?: {
    superPac: number;
    traditional: number;
    leadership: number;
    hybrid: number;
  };
  supportingExpenditures?: Array<{
    amount: number;
    date: string;
    pacName: string;
    pacType: 'superPac' | 'traditional' | 'leadership' | 'hybrid' | 'unknown';
    description: string;
    committeeId?: string;
  }>;
  opposingExpenditures?: Array<{
    amount: number;
    date: string;
    pacName: string;
    pacType: 'superPac' | 'traditional' | 'leadership' | 'hybrid' | 'unknown';
    description: string;
    committeeId?: string;
  }>;

  // Comprehensive endpoint fields (previously dropped)
  geographic?: {
    topStates: Array<{
      state: string;
      amount: number;
      percentage: number;
      contributionCount: number;
    }>;
    inDistrict?: { amount: number; percentage: number; contributionCount: number };
    outOfDistrict?: { amount: number; percentage: number; contributionCount: number };
  };
  donorMetrics?: {
    totalDonors: number;
    smallDonors: number;
    smallDonorPercentage: number;
    averageSmallDonation: number;
    medianDonation: number;
    averageDonation: number;
    largestDonation: number;
  };
  sectorSummary?: {
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
    other: { amount: number; percentage: number; contributionCount: number };
  };
  organizations?: {
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
  conduitAggregates?: {
    actblue?: { totalAmount: number; contributionCount: number; individualDonors: number };
    winred?: { totalAmount: number; contributionCount: number; individualDonors: number };
  };
  contributionTrends?: Array<{ month: string; amount: number; count: number }>;

  // Phase 5 fields
  dataQuality?: {
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
  fecTransparencyLinks?: {
    candidatePage: string;
    contributions: string;
    disbursements: string;
    financialSummary: string;
    independentExpenditures?: string;
  };

  // Phase 4 fields - Interest Group Baskets
  interestGroupBaskets?: Array<{
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
  interestGroupMetrics?: {
    topInfluencer: string | null;
    grassrootsPercentage: number;
    corporatePercentage: number;
    diversityScore: number;
  };
}

interface CampaignFinanceVisualizerProps {
  financeData: CampaignFinanceData;
  representative: {
    name: string;
    party: string;
  };
  bioguideId: string;
}

// PAC Type Badge Component
const PACTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const config = {
    superPac: { label: 'Super PAC', color: 'bg-civiq-blue/10 text-civiq-blue' },
    traditional: { label: 'PAC', color: 'bg-civiq-blue/10 text-civiq-blue' },
    leadership: { label: 'Leadership PAC', color: 'bg-civiq-green/10 text-civiq-green' },
    hybrid: { label: 'Hybrid PAC', color: 'bg-civiq-red/10 text-civiq-red' },
    unknown: { label: 'Unknown', color: 'bg-gray-100 text-gray-800' },
  };

  const { label, color } = config[type as keyof typeof config] || config.unknown;

  return <span className={`inline-block px-2 py-1 text-xs font-medium ${color}`}>{label}</span>;
};

export function CampaignFinanceVisualizer({
  financeData: initialFinanceData,
  representative: _representative,
  bioguideId: _bioguideId,
}: CampaignFinanceVisualizerProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'charts' | 'interest-groups' | 'stock-trades' | 'expenditures' | 'contributions'
  >('overview');
  const [announcement, setAnnouncement] = useState('');
  const [comprehensiveData, setComprehensiveData] = useState<CampaignFinanceData | null>(null);
  const [isLoadingComprehensive, setIsLoadingComprehensive] = useState(!!_bioguideId);
  const [selectedCycle, setSelectedCycle] = useState<number | null>(null);

  // Fetch election cycles
  const { data: cyclesData } = useSWR(
    _bioguideId ? `/api/representative/${_bioguideId}/election-cycles` : null,
    (url: string) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  // Set default cycle from API response
  useEffect(() => {
    if (cyclesData?.defaultCycle && selectedCycle === null) {
      setSelectedCycle(cyclesData.defaultCycle);
    }
  }, [cyclesData, selectedCycle]);

  // Fetch funding sources (cycle-aware)
  const { data: fundingSourcesData } = useSWR(
    _bioguideId && selectedCycle
      ? `/api/representative/${_bioguideId}/finance/funding-sources?cycle=${selectedCycle}`
      : null,
    (url: string) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  // Fetch expenditure categories (cycle-aware)
  const { data: expendituresData } = useSWR(
    _bioguideId && selectedCycle
      ? `/api/representative/${_bioguideId}/finance/expenditures?cycle=${selectedCycle}`
      : null,
    (url: string) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  // Responsive chart heights for mobile optimization
  const chartHeight300 = useResponsiveChartHeight(300, 250);
  const chartHeight400 = useResponsiveChartHeight(400, 280);

  // Fetch comprehensive finance data
  useEffect(() => {
    if (_bioguideId) {
      setIsLoadingComprehensive(true);
      fetch(
        `/api/representative/${_bioguideId}/finance/comprehensive${selectedCycle ? `?cycle=${selectedCycle}` : ''}`
      )
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch comprehensive data');
          return response.json();
        })
        .then(data => {
          // Map comprehensive endpoint structure to component expectations
          if (data?.finance && data?.interestGroups) {
            // Comprehensive endpoint structure - merge data
            const mappedData = {
              ...data.finance,
              // Map interest groups data
              interestGroupBaskets: data.interestGroups?.baskets || [],
              interestGroupMetrics: data.interestGroups?.metrics || null,
              pacContributionsByType: data.interestGroups?.pacContributions?.byType || {},
              supportingExpenditures:
                data.interestGroups?.pacContributions?.supportingExpenditures || [],
              opposingExpenditures:
                data.interestGroups?.pacContributions?.opposingExpenditures || [],
              // Map previously dropped comprehensive fields
              geographic: data.geographic || null,
              donorMetrics: data.donorMetrics || null,
              sectorSummary: data.sectorSummary || null,
              organizations: data.organizations || null,
              leadershipPACSponsors: data.pacDirect?.leadershipPACSponsors || null,
              conduitAggregates: data.contributors?.conduitAggregates || null,
              contributionTrends: data.contributors?.contributionTrends || null,
              // Map other comprehensive data
              industry_breakdown: data.industries?.topIndustries || [],
              top_contributors: data.contributors?.topContributors || [],
              // Transform recentContributions to match expected field names
              recent_contributions: (data.recentContributions || []).map(
                (c: {
                  name: string;
                  amount: number;
                  date: string;
                  employer?: string;
                  city?: string;
                  state?: string;
                }) => ({
                  contributor_name: c.name,
                  contribution_receipt_amount: c.amount,
                  contribution_receipt_date: c.date,
                  contributor_employer: c.employer || '',
                  contributor_city: c.city || '',
                  contributor_state: c.state || '',
                })
              ),
            };
            setComprehensiveData(mappedData);
          } else {
            // Fallback for legacy structure
            setComprehensiveData(data?.finance || data);
          }
        })
        .catch(() => {
          // Fall back to initial data if comprehensive fetch fails
          setComprehensiveData(initialFinanceData || null);
        })
        .finally(() => {
          setIsLoadingComprehensive(false);
        });
    }
  }, [_bioguideId, initialFinanceData, selectedCycle]);

  // Use comprehensive data if available, otherwise fall back to initial data
  const financeData = comprehensiveData || initialFinanceData;

  // Get financial data - prefer direct fields, fallback to financial_summary
  const currentCycleData = financeData?.financial_summary?.[0];

  // Use direct fields if available (from our API fix), otherwise fallback to legacy structure
  const totalRaised = financeData?.totalRaised || currentCycleData?.total_receipts || 0;
  const totalSpent = financeData?.totalSpent || currentCycleData?.total_disbursements || 0;
  const cashOnHand = financeData?.cashOnHand || currentCycleData?.cash_on_hand_end_period || 0;
  const individualContributions =
    financeData?.individualContributions || currentCycleData?.individual_contributions || 0;
  const pacContributions =
    financeData?.pacContributions || currentCycleData?.pac_contributions || 0;
  const partyContributions =
    financeData?.partyContributions || currentCycleData?.party_contributions || 0;
  const candidateContributions =
    financeData?.candidateContributions || currentCycleData?.candidate_contributions || 0;

  // Generate funding narrative from available data
  const fundingNarrative =
    totalRaised > 0
      ? generateFundingNarrative({
          totalRaised,
          totalSpent,
          cashOnHand,
          donations: {
            individual: individualContributions,
            pac: pacContributions,
            party: partyContributions,
            candidate: candidateContributions,
          },
          topContributors: (financeData?.top_contributors || []).map(
            (c: { name: string; total_amount?: number; totalAmount?: number }) => ({
              name: c.name,
              amount: c.totalAmount ?? c.total_amount ?? 0,
              type: 'individual',
            })
          ),
          industryBreakdown: (financeData?.industry_breakdown || []).map(
            (i: { sector: string; amount: number; percentage: number }) => ({
              industry: i.sector,
              amount: i.amount,
              percentage: i.percentage,
            })
          ),
        })
      : null;

  // Prepare chart data
  const donationBreakdown = [
    { name: 'Individual', value: individualContributions, color: COLORS[0] },
    { name: 'PAC', value: pacContributions, color: COLORS[1] },
    { name: 'Party', value: partyContributions, color: COLORS[2] },
    { name: 'Self-Funded', value: candidateContributions, color: COLORS[3] },
  ].filter(item => item.value > 0); // Only show non-zero categories

  // Top contributors data for charts - handle both API formats
  const topContributorsData = (financeData?.top_contributors || [])
    .slice(0, 10)
    .map((contributor: { name: string; total_amount?: number; totalAmount?: number }) => ({
      name:
        contributor.name.length > 15 ? contributor.name.substring(0, 15) + '...' : contributor.name,
      amount: contributor.totalAmount ?? contributor.total_amount ?? 0,
      fullName: contributor.name,
    }));

  // Industry breakdown data
  const industryData = (financeData?.industry_breakdown || []).slice(0, 8).map(industry => ({
    sector:
      industry.sector.length > 15 ? industry.sector.substring(0, 15) + '...' : industry.sector,
    amount: industry.amount,
    percentage: industry.percentage,
    fullSector: industry.sector,
  }));

  // Screen reader announcement for data load
  useEffect(() => {
    if (financeData && _representative) {
      setAnnouncement(`Campaign finance data loaded for ${_representative.name}`);
    }
  }, [financeData, _representative]);

  // Screen reader announcement for tab changes
  useEffect(() => {
    const tabNames = {
      overview: 'Overview',
      charts: 'Charts',
      'interest-groups': 'Interest Groups',
      'stock-trades': 'Stock Trades',
      expenditures: 'Expenditures',
      contributions: 'Contributions',
    };
    setAnnouncement(`${tabNames[activeTab]} tab selected`);
  }, [activeTab]);

  // Keyboard navigation handler for tabs
  const handleTabKeyDown = (
    e: React.KeyboardEvent,
    tabId:
      | 'overview'
      | 'charts'
      | 'interest-groups'
      | 'stock-trades'
      | 'expenditures'
      | 'contributions'
  ) => {
    const tabs: Array<
      'overview' | 'charts' | 'interest-groups' | 'stock-trades' | 'expenditures' | 'contributions'
    > = ['overview', 'charts', 'interest-groups', 'stock-trades', 'expenditures', 'contributions'];
    const currentIndex = tabs.indexOf(tabId);

    let newTab: typeof tabId | undefined;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      newTab = tabs[nextIndex];
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      newTab = tabs[prevIndex];
    } else if (e.key === 'Home') {
      e.preventDefault();
      newTab = tabs[0];
    } else if (e.key === 'End') {
      e.preventDefault();
      newTab = tabs[tabs.length - 1];
    }

    if (newTab) {
      setActiveTab(newTab);
    }
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const _formatPercent = (numerator: number, denominator: number): string => {
    if (!denominator || denominator === 0) return '0%';
    return `${Math.round((numerator / denominator) * 100)}%`;
  };

  // Check if we have any meaningful financial data
  const hasData =
    totalRaised > 0 ||
    individualContributions > 0 ||
    (financeData?.top_contributors && financeData.top_contributors.length > 0);

  if (isLoadingComprehensive && !comprehensiveData && !hasData) {
    return (
      <div className="aicher-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Finance</h3>
        <div className="text-center py-8 text-gray-500">
          <p>Loading campaign finance data...</p>
        </div>
      </div>
    );
  }

  if (!financeData || !hasData) {
    return (
      <div className="aicher-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Finance</h3>
        <div className="text-center py-8 text-gray-500">
          <p>Campaign finance data not available</p>
          <p className="text-sm mt-2">
            This representative may not have filed recent financial reports
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Screen Reader Announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Election Cycle Selector */}
      {cyclesData?.cycles?.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Election Cycle</label>
          <select
            value={selectedCycle || ''}
            onChange={e => setSelectedCycle(Number(e.target.value))}
            className="border-2 border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-civiq-blue"
          >
            {(cyclesData.cycles as number[]).map((cycle: number) => (
              <option key={cycle} value={cycle}>
                {cycle}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tab Navigation - Mobile Responsive with Keyboard Navigation */}
      <div className="aicher-card aicher-no-radius">
        <div className="border-b border-gray-200">
          <nav
            className="flex overflow-x-auto overflow-y-hidden scrollbar-hide -mb-px"
            aria-label="Campaign finance data tabs"
            role="tablist"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'charts', name: 'Charts' },
              { id: 'interest-groups', name: 'Interest Groups' },
              { id: 'stock-trades', name: 'Stock Trades' },
              { id: 'expenditures', name: 'Expenditures' },
              { id: 'contributions', name: 'Contributors' },
            ].map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() =>
                  setActiveTab(
                    tab.id as
                      | 'overview'
                      | 'charts'
                      | 'interest-groups'
                      | 'stock-trades'
                      | 'expenditures'
                      | 'contributions'
                  )
                }
                onKeyDown={e =>
                  handleTabKeyDown(
                    e,
                    tab.id as
                      | 'overview'
                      | 'charts'
                      | 'interest-groups'
                      | 'stock-trades'
                      | 'expenditures'
                      | 'contributions'
                  )
                }
                className={`${
                  activeTab === tab.id
                    ? 'border-civiq-blue text-civiq-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex-shrink-0 whitespace-nowrap py-4 px-4 sm:px-6 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Basic Overview Tab - Simple Text Display */}
          {activeTab === 'overview' && (
            <div
              role="tabpanel"
              id="tabpanel-overview"
              aria-labelledby="tab-overview"
              tabIndex={0}
              className="space-y-6"
            >
              {/* Funding Narrative — plain-language profile card */}
              {fundingNarrative && (
                <FundingNarrative
                  narrative={fundingNarrative}
                  representativeName={_representative?.name}
                />
              )}

              {/* Donor Metrics — key stats row */}
              {financeData?.donorMetrics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 border-2 border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Total Donors</div>
                    <div className="text-xl font-bold text-gray-900">
                      {financeData.donorMetrics.totalDonors.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 border-2 border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Small-Donor %</div>
                    <div className="text-xl font-bold text-gray-900">
                      {financeData.donorMetrics.smallDonorPercentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {financeData.donorMetrics.smallDonors.toLocaleString()} donors ≤$200
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 border-2 border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Average Donation</div>
                    <div className="text-xl font-bold text-gray-900">
                      {formatCurrency(financeData.donorMetrics.averageDonation)}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 border-2 border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Median Donation</div>
                    <div className="text-xl font-bold text-gray-900">
                      {formatCurrency(financeData.donorMetrics.medianDonation)}
                    </div>
                  </div>
                </div>
              )}

              {/* Hero Summary - Enhanced Overview */}
              <HeroSummary
                representativeName={_representative?.name || 'Representative'}
                party={
                  (_representative?.party || 'Independent') as
                    | 'Democrat'
                    | 'Republican'
                    | 'Independent'
                }
                totalRaised={totalRaised}
                totalSpent={totalSpent}
                cashOnHand={cashOnHand}
                individualContributions={individualContributions}
                pacContributions={pacContributions}
                candidateContributions={candidateContributions}
                cycle={currentCycleData?.cycle || new Date().getFullYear()}
              />

              {/* Fundraising Sources Breakdown */}
              <FundraisingSources
                totalRaised={totalRaised}
                individualContributions={individualContributions}
                pacContributions={pacContributions}
                partyContributions={partyContributions}
                candidateContributions={candidateContributions}
                party={
                  (_representative?.party || 'Independent') as
                    | 'Democrat'
                    | 'Republican'
                    | 'Independent'
                }
              />

              {/* Top Industries */}
              {financeData?.industry_breakdown && financeData.industry_breakdown.length > 0 && (
                <TopIndustries
                  industries={financeData.industry_breakdown}
                  totalRaised={totalRaised}
                />
              )}

              {/* Top Contributors */}
              {financeData?.top_contributors && financeData.top_contributors.length > 0 && (
                <TopContributors
                  contributors={financeData.top_contributors}
                  cycle={currentCycleData?.cycle}
                />
              )}

              {/* Geographic Breakdown — in-state vs out-of-state */}
              {financeData?.geographic?.topStates &&
                financeData.geographic.topStates.length > 0 && (
                  <GeographicBreakdown
                    data={financeData.geographic.topStates.map(s => ({
                      state: s.state,
                      stateName: s.state,
                      amount: s.amount,
                      percentage: s.percentage,
                      count: s.contributionCount,
                    }))}
                    dataQuality={{
                      totalContributionsAnalyzed:
                        financeData.dataQuality?.geography?.totalContributionsAnalyzed ?? 0,
                      contributionsWithState:
                        financeData.dataQuality?.geography?.contributionsWithState ?? 0,
                      completenessPercentage:
                        financeData.dataQuality?.geography?.completenessPercentage ?? 0,
                    }}
                    totalRaised={totalRaised}
                  />
                )}

              {/* Sector Summary — Business vs Labor vs Ideological */}
              {financeData?.sectorSummary && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Sector Breakdown</h4>
                  <hr className="border-gray-300 mb-4" />
                  {/* 3-segment bar */}
                  <div className="h-8 flex overflow-hidden border-2 border-gray-300 mb-4">
                    {financeData.sectorSummary.business.percentage > 0 && (
                      <div
                        className="h-full bg-[#3ea2d4]"
                        style={{ width: `${financeData.sectorSummary.business.percentage}%` }}
                        title={`Business: ${financeData.sectorSummary.business.percentage.toFixed(1)}%`}
                      />
                    )}
                    {financeData.sectorSummary.labor.percentage > 0 && (
                      <div
                        className="h-full bg-[#d97706]"
                        style={{ width: `${financeData.sectorSummary.labor.percentage}%` }}
                        title={`Labor: ${financeData.sectorSummary.labor.percentage.toFixed(1)}%`}
                      />
                    )}
                    {financeData.sectorSummary.ideological.percentage > 0 && (
                      <div
                        className="h-full bg-gray-500"
                        style={{ width: `${financeData.sectorSummary.ideological.percentage}%` }}
                        title={`Ideological: ${financeData.sectorSummary.ideological.percentage.toFixed(1)}%`}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {[
                      {
                        label: 'Business',
                        data: financeData.sectorSummary.business,
                        color: 'bg-[#3ea2d4]',
                      },
                      {
                        label: 'Labor',
                        data: financeData.sectorSummary.labor,
                        color: 'bg-[#d97706]',
                      },
                      {
                        label: 'Ideological',
                        data: financeData.sectorSummary.ideological,
                        color: 'bg-gray-500',
                      },
                      {
                        label: 'Other',
                        data: financeData.sectorSummary.other,
                        color: 'bg-gray-300',
                      },
                    ]
                      .filter(item => item.data.amount > 0)
                      .map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                          <div className={`w-3 h-3 ${item.color}`} />
                          <span className="text-gray-700">{item.label}</span>
                          <span className="font-medium ml-auto">
                            {formatCurrency(item.data.amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Leadership PAC Sponsors — "PAC money from these politicians" */}
              {financeData?.leadershipPACSponsors &&
                financeData.leadershipPACSponsors.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">
                      Leadership PAC Sponsors
                    </h4>
                    <hr className="border-gray-300 mb-4" />
                    <p className="text-xs text-gray-500 mb-3">
                      PAC contributions from other members of Congress
                    </p>
                    <div className="space-y-2">
                      {financeData.leadershipPACSponsors.slice(0, 10).map((sponsor, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                        >
                          <div>
                            <a
                              href={`/representative/${sponsor.sponsorBioguideId}`}
                              className="text-civiq-blue hover:underline font-medium text-sm"
                            >
                              {sponsor.sponsorName}
                            </a>
                            <span className="text-xs text-gray-500 ml-2">
                              ({sponsor.sponsorState})
                            </span>
                            <div className="text-xs text-gray-500">{sponsor.pacName}</div>
                          </div>
                          <div className="text-sm font-semibold">
                            {formatCurrency(sponsor.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Conduit Aggregates — ActBlue/WinRed disclosure */}
              {financeData?.conduitAggregates &&
                (() => {
                  const actblue = financeData.conduitAggregates?.actblue;
                  const winred = financeData.conduitAggregates?.winred;
                  const conduit = actblue || winred;
                  const conduitName = actblue ? 'ActBlue' : 'WinRed';
                  if (!conduit || conduit.individualDonors === 0) return null;
                  return (
                    <div className="mt-6 p-3 bg-gray-50 border border-gray-200 text-sm text-gray-600">
                      {conduit.individualDonors.toLocaleString()} individuals contributed{' '}
                      {formatCurrency(conduit.totalAmount)} through {conduitName} (
                      {conduit.contributionCount.toLocaleString()} transactions)
                    </div>
                  );
                })()}

              {/* PAC Types Breakdown */}
              {financeData?.pacContributionsByType && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">PAC Types Breakdown</h4>
                  <hr className="border-gray-300 mb-4" />

                  <div className="space-y-2 font-mono text-sm">
                    {financeData.pacContributionsByType.superPac > 0 && (
                      <div className="flex justify-between">
                        <span>Super PAC:</span>
                        <span>{formatCurrency(financeData.pacContributionsByType.superPac)}</span>
                      </div>
                    )}
                    {financeData.pacContributionsByType.traditional > 0 && (
                      <div className="flex justify-between">
                        <span>Traditional PAC:</span>
                        <span>
                          {formatCurrency(financeData.pacContributionsByType.traditional)}
                        </span>
                      </div>
                    )}
                    {financeData.pacContributionsByType.leadership > 0 && (
                      <div className="flex justify-between">
                        <span>Leadership PAC:</span>
                        <span>{formatCurrency(financeData.pacContributionsByType.leadership)}</span>
                      </div>
                    )}
                    {financeData.pacContributionsByType.hybrid > 0 && (
                      <div className="flex justify-between">
                        <span>Hybrid PAC:</span>
                        <span>{formatCurrency(financeData.pacContributionsByType.hybrid)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Independent Expenditures Summary */}
              {(financeData?.supportingExpenditures?.length ||
                financeData?.opposingExpenditures?.length) && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">
                    Independent Expenditures
                  </h4>
                  <hr className="border-gray-300 mb-4" />

                  <div className="space-y-2 font-mono text-sm">
                    {financeData.supportingExpenditures &&
                      financeData.supportingExpenditures.length > 0 && (
                        <div className="flex justify-between">
                          <span>Supporting:</span>
                          <span className="text-civiq-green">
                            {financeData.supportingExpenditures.length} expenditure
                            {financeData.supportingExpenditures.length !== 1 ? 's' : ''} (
                            {formatCurrency(
                              financeData.supportingExpenditures.reduce(
                                (sum, exp) => sum + exp.amount,
                                0
                              )
                            )}
                            )
                          </span>
                        </div>
                      )}
                    {financeData.opposingExpenditures &&
                      financeData.opposingExpenditures.length > 0 && (
                        <div className="flex justify-between">
                          <span>Opposing:</span>
                          <span className="text-civiq-red">
                            {financeData.opposingExpenditures.length} expenditure
                            {financeData.opposingExpenditures.length !== 1 ? 's' : ''} (
                            {formatCurrency(
                              financeData.opposingExpenditures.reduce(
                                (sum, exp) => sum + exp.amount,
                                0
                              )
                            )}
                            )
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Funding Sources from Dedicated API */}
              {fundingSourcesData && fundingSourcesData.totalRaised > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Funding Sources</h4>
                  <hr className="border-gray-300 mb-4" />

                  {/* Stacked Bar */}
                  <div className="h-8 flex overflow-hidden border-2 border-gray-300 mb-4">
                    {fundingSourcesData.individualContributions.percentage > 0 && (
                      <div
                        className="h-full bg-[#3ea2d4]"
                        style={{
                          width: `${fundingSourcesData.individualContributions.percentage}%`,
                        }}
                        title={`Individual: ${fundingSourcesData.individualContributions.percentage.toFixed(1)}%`}
                      />
                    )}
                    {fundingSourcesData.pacContributions.percentage > 0 && (
                      <div
                        className="h-full bg-[#e11d07]"
                        style={{ width: `${fundingSourcesData.pacContributions.percentage}%` }}
                        title={`PAC: ${fundingSourcesData.pacContributions.percentage.toFixed(1)}%`}
                      />
                    )}
                    {fundingSourcesData.partyContributions.percentage > 0 && (
                      <div
                        className="h-full bg-[#0a9338]"
                        style={{ width: `${fundingSourcesData.partyContributions.percentage}%` }}
                        title={`Party: ${fundingSourcesData.partyContributions.percentage.toFixed(1)}%`}
                      />
                    )}
                    {fundingSourcesData.candidateContributions.percentage > 0 && (
                      <div
                        className="h-full bg-gray-500"
                        style={{
                          width: `${fundingSourcesData.candidateContributions.percentage}%`,
                        }}
                        title={`Self-Funded: ${fundingSourcesData.candidateContributions.percentage.toFixed(1)}%`}
                      />
                    )}
                    {fundingSourcesData.otherContributions.percentage > 0 && (
                      <div
                        className="h-full bg-gray-400"
                        style={{ width: `${fundingSourcesData.otherContributions.percentage}%` }}
                        title={`Other: ${fundingSourcesData.otherContributions.percentage.toFixed(1)}%`}
                      />
                    )}
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    {[
                      {
                        label: 'Individual',
                        data: fundingSourcesData.individualContributions,
                        color: 'bg-[#3ea2d4]',
                      },
                      {
                        label: 'PAC',
                        data: fundingSourcesData.pacContributions,
                        color: 'bg-[#e11d07]',
                      },
                      {
                        label: 'Party',
                        data: fundingSourcesData.partyContributions,
                        color: 'bg-[#0a9338]',
                      },
                      {
                        label: 'Self-Funded',
                        data: fundingSourcesData.candidateContributions,
                        color: 'bg-gray-500',
                      },
                      {
                        label: 'Other',
                        data: fundingSourcesData.otherContributions,
                        color: 'bg-gray-400',
                      },
                    ]
                      .filter(item => item.data.amount > 0)
                      .map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                          <div className={`w-3 h-3 ${item.color}`} />
                          <span className="text-gray-700">{item.label}</span>
                          <span className="font-medium ml-auto">
                            {formatCurrency(item.data.amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* How the Money Is Spent */}
              {expendituresData && expendituresData.totalDisbursements > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">
                    How the Money Is Spent
                  </h4>
                  <hr className="border-gray-300 mb-4" />

                  <div className="mb-3 font-mono text-sm flex justify-between">
                    <span>Total Disbursements</span>
                    <span className="font-semibold">
                      {formatCurrency(expendituresData.totalDisbursements)}
                    </span>
                  </div>

                  <div className="space-y-2 font-mono text-sm">
                    {(
                      expendituresData.expenditureCategories as Array<{
                        category: string;
                        amount: number;
                        percentage: number;
                        description: string;
                      }>
                    ).map(
                      (cat: {
                        category: string;
                        amount: number;
                        percentage: number;
                        description: string;
                      }) => (
                        <div key={cat.category} className="flex justify-between">
                          <span className="text-gray-700">{cat.category}</span>
                          <span>{formatCurrency(cat.amount)}</span>
                        </div>
                      )
                    )}
                  </div>

                  {expendituresData.metadata?.fecTransparencyLink && (
                    <a
                      href={expendituresData.metadata.fecTransparencyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3ea2d4] hover:underline text-xs mt-3 block"
                    >
                      View detailed expenditures on FEC.gov →
                    </a>
                  )}
                </div>
              )}

              {/* FEC Transparency Links */}
              {financeData?.fecTransparencyLinks && (
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <abbr
                      title="Federal Election Commission - Independent agency that regulates campaign finance in federal elections"
                      className="no-underline cursor-help border-b border-dotted border-gray-500"
                    >
                      FEC
                    </abbr>{' '}
                    Data Sources
                    {financeData.dataQuality && (
                      <DataQualityIndicator
                        confidence={financeData.dataQuality.overallDataConfidence}
                      />
                    )}
                  </h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <a
                      href={financeData.fecTransparencyLinks.candidatePage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-civiq-blue hover:underline block"
                    >
                      View Complete FEC Profile →
                    </a>
                    <a
                      href={financeData.fecTransparencyLinks.contributions}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-civiq-blue hover:underline block"
                    >
                      View All Contributions →
                    </a>
                    <a
                      href={financeData.fecTransparencyLinks.financialSummary}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-civiq-blue hover:underline block"
                    >
                      View Financial Summary →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Visual Charts Tab */}
          {activeTab === 'charts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Campaign Finance Visualizations
                </h3>
                {financeData?.dataQuality && (
                  <DataQualityBadge
                    confidence={financeData.dataQuality.overallDataConfidence}
                    completeness={financeData.dataQuality.industry.completenessPercentage}
                    label="Chart Data"
                    showTooltip={true}
                    size="small"
                  />
                )}
              </div>

              {/* Donation Sources Pie Chart */}
              {donationBreakdown.length > 0 && (
                <div className="bg-white p-4 sm:p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Contribution Sources</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="min-h-[250px] sm:min-h-[300px]">
                      <ResponsiveContainer width="100%" height={chartHeight300}>
                        <PieChart>
                          <Pie
                            data={donationBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={props => {
                              const { name, percent } = props as {
                                name?: string;
                                percent?: number;
                              };
                              return percent && percent > 0.05
                                ? `${name || ''} ${(percent * 100).toFixed(0)}%`
                                : '';
                            }}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {donationBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={value => [`$${Number(value).toLocaleString()}`, 'Amount']}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="space-y-3">
                        {donationBreakdown.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div
                                className="w-4 h-4 mr-3"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              ></div>
                              <span className="text-sm font-medium">{item.name}</span>
                            </div>
                            <span className="text-sm font-semibold">
                              {formatCurrency(item.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Contributors Bar Chart */}
              {topContributorsData.length > 0 && (
                <div className="bg-white p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Top Contributors</h4>
                  <p className="text-xs text-gray-500 mb-2">Click a bar to view on FEC.gov</p>
                  <ResponsiveContainer width="100%" height={chartHeight400}>
                    <BarChart
                      data={topContributorsData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                    >
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis
                        tickFormatter={value => `$${(Number(value) / 1000).toFixed(0)}K`}
                        fontSize={12}
                      />
                      <Tooltip
                        formatter={value => [`$${Number(value).toLocaleString()}`, 'Contributed']}
                        labelFormatter={(label, payload) => {
                          const entry = payload?.[0]?.payload;
                          return entry?.fullName || label;
                        }}
                      />
                      <Bar
                        dataKey="amount"
                        fill={COLORS[0]}
                        cursor="pointer"
                        onClick={(_data, _index, e) => {
                          // Recharts Bar onClick data carries the original data entry properties
                          const name =
                            _data && 'fullName' in _data && typeof _data.fullName === 'string'
                              ? _data.fullName
                              : undefined;
                          if (name) {
                            e?.stopPropagation?.();
                            const params = new URLSearchParams({ contributor_name: name });
                            if (currentCycleData?.cycle)
                              params.set(
                                'two_year_transaction_period',
                                String(currentCycleData.cycle)
                              );
                            window.open(
                              `https://www.fec.gov/data/receipts/individual-contributions/?${params.toString()}`,
                              '_blank',
                              'noopener,noreferrer'
                            );
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* PAC Types Breakdown Pie Chart */}
              {financeData?.pacContributionsByType &&
                Object.values(financeData.pacContributionsByType).some(val => val > 0) && (
                  <div className="bg-white p-4 sm:p-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">
                      PAC Contributions by Type
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="min-h-[250px] sm:min-h-[300px]">
                        <ResponsiveContainer width="100%" height={chartHeight300}>
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: 'Super PAC',
                                  value: financeData.pacContributionsByType.superPac,
                                },
                                {
                                  name: 'Traditional PAC',
                                  value: financeData.pacContributionsByType.traditional,
                                },
                                {
                                  name: 'Leadership PAC',
                                  value: financeData.pacContributionsByType.leadership,
                                },
                                {
                                  name: 'Hybrid PAC',
                                  value: financeData.pacContributionsByType.hybrid,
                                },
                              ].filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={props => {
                                const { name, percent } = props as {
                                  name?: string;
                                  percent?: number;
                                };
                                return percent && percent > 0.05
                                  ? `${name || ''} ${(percent * 100).toFixed(0)}%`
                                  : '';
                              }}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {[
                                {
                                  name: 'Super PAC',
                                  value: financeData.pacContributionsByType.superPac,
                                },
                                {
                                  name: 'Traditional PAC',
                                  value: financeData.pacContributionsByType.traditional,
                                },
                                {
                                  name: 'Leadership PAC',
                                  value: financeData.pacContributionsByType.leadership,
                                },
                                {
                                  name: 'Hybrid PAC',
                                  value: financeData.pacContributionsByType.hybrid,
                                },
                              ]
                                .filter(item => item.value > 0)
                                .map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                ))}
                            </Pie>
                            <Tooltip
                              formatter={value => [`$${Number(value).toLocaleString()}`, 'Amount']}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col justify-center">
                        <div className="space-y-3">
                          {[
                            {
                              name: 'Super PAC',
                              value: financeData.pacContributionsByType.superPac,
                            },
                            {
                              name: 'Traditional PAC',
                              value: financeData.pacContributionsByType.traditional,
                            },
                            {
                              name: 'Leadership PAC',
                              value: financeData.pacContributionsByType.leadership,
                            },
                            {
                              name: 'Hybrid PAC',
                              value: financeData.pacContributionsByType.hybrid,
                            },
                          ]
                            .filter(item => item.value > 0)
                            .map((item, index) => (
                              <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div
                                    className="w-4 h-4 mr-3"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  ></div>
                                  <span className="text-sm font-medium">{item.name}</span>
                                </div>
                                <span className="text-sm font-semibold">
                                  {formatCurrency(item.value)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Industry Breakdown Horizontal Bar Chart */}
              {industryData.length > 0 && (
                <div className="bg-white p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Industry Breakdown</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={industryData}
                      layout="horizontal"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <XAxis
                        type="number"
                        tickFormatter={value => `$${(Number(value) / 1000).toFixed(0)}K`}
                        fontSize={12}
                      />
                      <YAxis type="category" dataKey="sector" width={100} fontSize={11} />
                      <Tooltip
                        formatter={value => [`$${Number(value).toLocaleString()}`, 'Amount']}
                        labelFormatter={(label, payload) => {
                          const entry = payload?.[0]?.payload;
                          return entry?.fullSector || label;
                        }}
                      />
                      <Bar dataKey="amount" fill={COLORS[1]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* PAC Type Pie Chart - Phase 1 */}
              {financeData?.pacContributionsByType &&
                financeData.pacContributionsByType.traditional +
                  financeData.pacContributionsByType.superPac +
                  financeData.pacContributionsByType.leadership +
                  financeData.pacContributionsByType.hybrid >
                  0 && (
                  <div className="bg-white p-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">
                      Contributions by PAC Type
                    </h4>
                    <ResponsiveContainer width="100%" height={chartHeight300}>
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: 'Traditional PAC',
                              value: financeData.pacContributionsByType.traditional,
                            },
                            {
                              name: 'Super PAC',
                              value: financeData.pacContributionsByType.superPac,
                            },
                            {
                              name: 'Leadership PAC',
                              value: financeData.pacContributionsByType.leadership,
                            },
                            {
                              name: 'Hybrid PAC',
                              value: financeData.pacContributionsByType.hybrid,
                            },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={props => {
                            const { name, percent } = props as { name?: string; percent?: number };
                            return percent && percent > 0.05
                              ? `${name || ''} ${(percent * 100).toFixed(0)}%`
                              : '';
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#3b82f6" /> {/* Traditional - Blue */}
                          <Cell fill="#a855f7" /> {/* Super PAC - Purple */}
                          <Cell fill="#10b981" /> {/* Leadership - Green */}
                          <Cell fill="#f97316" /> {/* Hybrid - Orange */}
                        </Pie>
                        <Tooltip formatter={value => `$${Number(value).toLocaleString()}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

              {/* Fundraising Trends — Timeline, Quarterly, Projections */}
              {financeData?.contributionTrends && financeData.contributionTrends.length > 0 && (
                <DynamicFundraisingTrends
                  data={{
                    summary: {
                      totalRaised,
                      totalSpent,
                      cashOnHand,
                      burnRate: totalRaised > 0 ? Math.round((totalSpent / totalRaised) * 100) : 0,
                      quarterlyAverage:
                        totalRaised /
                        Math.max(1, Math.ceil(financeData.contributionTrends.length / 3)),
                      efficiency:
                        totalRaised > 0 ? Math.round((totalSpent / totalRaised) * 100) : 0,
                    },
                    breakdown: {
                      individual: {
                        amount: individualContributions,
                        percent:
                          totalRaised > 0
                            ? Math.round((individualContributions / totalRaised) * 100)
                            : 0,
                      },
                      pac: {
                        amount: pacContributions,
                        percent:
                          totalRaised > 0 ? Math.round((pacContributions / totalRaised) * 100) : 0,
                      },
                      party: {
                        amount: partyContributions,
                        percent:
                          totalRaised > 0
                            ? Math.round((partyContributions / totalRaised) * 100)
                            : 0,
                      },
                      candidate: {
                        amount: candidateContributions,
                        percent:
                          totalRaised > 0
                            ? Math.round((candidateContributions / totalRaised) * 100)
                            : 0,
                      },
                      smallDonors: {
                        amount: 0,
                        percent: 0,
                        count: financeData.donorMetrics?.smallDonors ?? 0,
                      },
                      largeDonors: { amount: 0, percent: 0, count: 0 },
                    },
                    industries: [],
                    geography: {
                      inState: {
                        amount: financeData.geographic?.inDistrict?.amount ?? 0,
                        percent: financeData.geographic?.inDistrict?.percentage ?? 0,
                        count: financeData.geographic?.inDistrict?.contributionCount ?? 0,
                      },
                      outOfState: {
                        amount: financeData.geographic?.outOfDistrict?.amount ?? 0,
                        percent: financeData.geographic?.outOfDistrict?.percentage ?? 0,
                        count: financeData.geographic?.outOfDistrict?.contributionCount ?? 0,
                      },
                      topStates: [],
                      diversityScore: 0,
                    },
                    timeline: (() => {
                      // Aggregate monthly contribution trends into quarterly
                      const quarterMap = new Map<string, { raised: number; count: number }>();
                      for (const t of financeData.contributionTrends ?? []) {
                        const [year, month] = t.month.split('-');
                        const q = `Q${Math.ceil(Number(month) / 3)}`;
                        const key = `${year}-${q}`;
                        const existing = quarterMap.get(key) ?? { raised: 0, count: 0 };
                        quarterMap.set(key, {
                          raised: existing.raised + t.amount,
                          count: existing.count + t.count,
                        });
                      }
                      return Array.from(quarterMap.entries()).map(([key, val]) => {
                        const parts = key.split('-');
                        return {
                          period: parts[0] ?? '',
                          quarter: parts[1] ?? '',
                          raised: val.raised,
                          spent: 0,
                          netChange: val.raised,
                          cashOnHand: 0,
                          burnRate: 0,
                          contributorCount: val.count,
                        };
                      });
                    })(),
                    donors: {
                      smallDonorMetrics: {
                        averageAmount: financeData.donorMetrics?.averageSmallDonation ?? 0,
                        count: financeData.donorMetrics?.smallDonors ?? 0,
                        percentage: financeData.donorMetrics?.smallDonorPercentage ?? 0,
                        grassrootsScore: 0,
                      },
                      largeDonorMetrics: {
                        averageAmount: 0,
                        count: 0,
                        percentage: 0,
                        dependencyScore: 0,
                      },
                      repeatDonors: { count: 0, percentage: 0, averageTotal: 0 },
                    },
                    expenditures: {
                      categories: [],
                      efficiency: {
                        adminCosts: 0,
                        fundraisingCosts: 0,
                        programCosts: 0,
                        efficiencyRatio: 0,
                      },
                    },
                    metadata: {
                      dataSource: 'FEC',
                      lastUpdated: new Date().toISOString(),
                      coverage: 0,
                      dataQuality: financeData.dataQuality?.overallDataConfidence ?? 'medium',
                      cyclesCovered: [],
                    },
                  }}
                />
              )}

              {/* No charts available message */}
              {donationBreakdown.length === 0 &&
                topContributorsData.length === 0 &&
                industryData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No data available for visualization</p>
                    <p className="text-sm mt-2">
                      Charts will appear when contribution data is available
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* Interest Groups Tab */}
          {activeTab === 'interest-groups' && (
            <div
              role="tabpanel"
              id="tabpanel-interest-groups"
              aria-labelledby="tab-interest-groups"
              tabIndex={0}
              className="space-y-6"
            >
              {/* Check if we have pre-computed interest group baskets from API */}
              {financeData.interestGroupBaskets && financeData.interestGroupBaskets.length > 0 ? (
                <div className="space-y-6">
                  {/* Metrics Overview */}
                  {financeData.interestGroupMetrics && (
                    <div className="aicher-card p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Interest Group Funding Analysis
                        </h3>
                        {financeData.dataQuality && (
                          <DataQualityBadge
                            confidence={financeData.dataQuality.overallDataConfidence}
                            completeness={financeData.dataQuality.industry.completenessPercentage}
                            label="Data Quality"
                            showTooltip={true}
                            size="small"
                          />
                        )}
                      </div>
                      <div className="aicher-grid aicher-grid-3 gap-4">
                        <div className="p-4 bg-gray-50">
                          <div className="text-sm text-gray-600 mb-1">Top Interest Group</div>
                          <div className="text-xl font-bold text-gray-900">
                            {financeData.interestGroupMetrics.topInfluencer || 'N/A'}
                          </div>
                        </div>

                        <div className="p-4 bg-civiq-green/10">
                          <div className="text-sm text-gray-600 mb-1">Grassroots Funding</div>
                          <div className="text-xl font-bold text-civiq-green">
                            {financeData.interestGroupMetrics.grassrootsPercentage.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">Small donors ≤ $200</div>
                        </div>

                        <div className="p-4 bg-civiq-blue/10">
                          <div className="text-sm text-gray-600 mb-1">Funding Diversity</div>
                          <div className="text-xl font-bold text-civiq-blue">
                            {financeData.interestGroupMetrics.diversityScore}/100
                          </div>
                          <div className="text-xs text-gray-500">
                            {financeData.interestGroupMetrics.diversityScore >= 70
                              ? 'Very diverse'
                              : financeData.interestGroupMetrics.diversityScore >= 50
                                ? 'Moderate'
                                : 'Concentrated'}
                          </div>
                        </div>
                      </div>

                      {financeData.interestGroupMetrics.corporatePercentage > 0 && (
                        <div className="mt-4 p-3 bg-civiq-red/10 border border-civiq-red">
                          <div className="text-sm text-civiq-red">
                            <strong>
                              {financeData.interestGroupMetrics.corporatePercentage.toFixed(1)}%
                            </strong>{' '}
                            from corporate interests (Big Tech, Wall Street, Healthcare, Energy,
                            Defense, etc.)
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Visual Chart */}
                  <div className="aicher-card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Interest Group Contributions
                    </h3>

                    <div className="aicher-grid aicher-grid-2 gap-6">
                      {/* Pie Chart */}
                      <div>
                        <ResponsiveContainer width="100%" height={chartHeight300}>
                          <PieChart>
                            <Pie
                              data={financeData.interestGroupBaskets}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={props => {
                                const { percent, icon } = props as {
                                  percent?: number;
                                  icon?: string;
                                };
                                return percent && percent > 0.05
                                  ? `${icon || ''} ${(percent * 100).toFixed(0)}%`
                                  : '';
                              }}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="totalAmount"
                            >
                              {financeData.interestGroupBaskets.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name, props) => {
                                const entry = props.payload;
                                return [
                                  `${formatCurrency(Number(value))} (${((Number(value) / (financeData.interestGroupBaskets?.reduce((sum, b) => sum + b.totalAmount, 0) ?? 1)) * 100).toFixed(1)}%)`,
                                  `${entry.icon || ''} ${entry.basket}`,
                                ];
                              }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Legend with Details */}
                      <div className="flex flex-col justify-center">
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {financeData.interestGroupBaskets.slice(0, 8).map(basket => (
                            <div
                              key={basket.basket}
                              className="flex items-center justify-between p-2 hover:bg-gray-50"
                            >
                              <div className="flex items-center flex-1">
                                <div
                                  className="w-4 h-4 mr-3 flex-shrink-0"
                                  style={{ backgroundColor: basket.color }}
                                ></div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium truncate">
                                    {basket.icon} {basket.basket}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {basket.contributionCount} gifts
                                  </div>
                                </div>
                              </div>
                              <div className="text-right ml-3">
                                <div className="text-sm font-semibold">
                                  {formatCurrency(basket.totalAmount)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {basket.percentage.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Table */}
                  <div className="aicher-card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Interest Group Breakdown (Detailed)
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Interest Group
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Amount
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              % of Total
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Contributions
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Top Categories
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {financeData.interestGroupBaskets.map(basket => (
                            <tr key={basket.basket} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div
                                    className="w-3 h-3 mr-2"
                                    style={{ backgroundColor: basket.color }}
                                  ></div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {basket.icon} {basket.basket}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {basket.description}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(basket.totalAmount)}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {basket.percentage.toFixed(1)}%
                                </div>
                                <div className="w-full bg-gray-200 h-1.5 mt-1">
                                  <div
                                    className="h-1.5"
                                    style={{
                                      width: `${basket.percentage}%`,
                                      backgroundColor: basket.color,
                                    }}
                                  ></div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {basket.contributionCount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-xs text-gray-500">
                                  {basket.topCategories.length > 0 ? (
                                    <ul className="list-disc list-inside">
                                      {basket.topCategories.slice(0, 2).map((cat, idx) => (
                                        <li key={idx}>
                                          <a
                                            href={`https://www.fec.gov/data/receipts/individual-contributions/?contributor_employer=${encodeURIComponent(cat.category)}&two_year_transaction_period=${currentCycleData?.cycle || 2024}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#3ea2d4] hover:underline"
                                          >
                                            {cat.category}
                                          </a>{' '}
                                          ({formatCurrency(cat.amount)})
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-gray-400">&mdash;</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* Fallback to client-side calculation if API doesn't provide baskets */
                <InterestGroupBaskets
                  contributions={financeData.recent_contributions || []}
                  candidateContributions={candidateContributions}
                  showMetrics={true}
                  showChart={true}
                  showTable={true}
                />
              )}
            </div>
          )}

          {/* Stock Trades Tab - STOCK Act Disclosures */}
          {activeTab === 'stock-trades' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">STOCK Act Disclosures</h3>
                <StockTradeRankBadge bioguideId={_bioguideId} />
              </div>
              <StockTradesSection bioguideId={_bioguideId} />
              <TradeSectorBreakdown bioguideId={_bioguideId} />
              <SecFilingsSection bioguideId={_bioguideId} />
            </div>
          )}

          {/* Expenditures Tab - Split into Supporting/Opposing */}
          {activeTab === 'expenditures' && (
            <div className="space-y-6">
              {/* Supporting Expenditures */}
              <div className="bg-white p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4 text-civiq-green">
                  Independent Expenditures Supporting Representative
                </h3>
                {financeData.supportingExpenditures &&
                financeData.supportingExpenditures.length > 0 ? (
                  <div className="overflow-x-auto -mx-6 sm:mx-0">
                    <div className="inline-block min-w-full align-middle px-6 sm:px-0">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Date</th>
                            <th className="text-left py-2">PAC</th>
                            <th className="text-left py-2">Type</th>
                            <th className="text-right py-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financeData.supportingExpenditures.slice(0, 10).map((exp, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="py-2">{exp.date}</td>
                              <td className="py-2">
                                <PACLink committeeId={exp.committeeId ?? null} name={exp.pacName} />
                              </td>
                              <td className="py-2">
                                <PACTypeBadge type={exp.pacType} />
                              </td>
                              <td className="text-right py-2 font-semibold text-civiq-green">
                                ${exp.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No supporting expenditures found for this cycle.</p>
                )}
              </div>

              {/* Opposing Expenditures */}
              <div className="bg-white p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4 text-civiq-red">
                  Independent Expenditures Opposing Representative
                </h3>
                {financeData.opposingExpenditures && financeData.opposingExpenditures.length > 0 ? (
                  <div className="overflow-x-auto -mx-6 sm:mx-0">
                    <div className="inline-block min-w-full align-middle px-6 sm:px-0">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Date</th>
                            <th className="text-left py-2">PAC</th>
                            <th className="text-left py-2">Type</th>
                            <th className="text-right py-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financeData.opposingExpenditures.slice(0, 10).map((exp, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="py-2">{exp.date}</td>
                              <td className="py-2">
                                <PACLink committeeId={exp.committeeId ?? null} name={exp.pacName} />
                              </td>
                              <td className="py-2">
                                <PACTypeBadge type={exp.pacType} />
                              </td>
                              <td className="text-right py-2 font-semibold text-civiq-red">
                                ${exp.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No opposing expenditures found for this cycle.</p>
                )}
              </div>
            </div>
          )}

          {/* Contributions Tab - Simple Table */}
          {activeTab === 'contributions' && (
            <div className="space-y-6">
              {/* Top Contributing Organizations (employer-aggregated) */}
              {financeData?.organizations?.topOrganizations &&
                financeData.organizations.topOrganizations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Top Contributing Organizations
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Aggregated by employer name from individual contributions.{' '}
                      {financeData.organizations.metadata.totalOrganizations.toLocaleString()}{' '}
                      organizations identified.
                    </p>
                    <div className="overflow-x-auto -mx-6 sm:mx-0">
                      <div className="inline-block min-w-full align-middle px-6 sm:px-0">
                        <table className="min-w-full bg-white">
                          <thead className="bg-white">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Organization
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Total
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Employees
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                % of Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {financeData.organizations.topOrganizations.slice(0, 15).map(org => (
                              <tr key={org.name} className="hover:bg-white">
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  <a
                                    href={org.fecVerifyLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-civiq-blue hover:underline"
                                  >
                                    {org.name}
                                  </a>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                                  {formatCurrency(org.totalAmount)}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500 text-right">
                                  {org.employees}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500 text-right">
                                  {org.percentage.toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Contributions</h3>
                {financeData?.dataQuality && (
                  <DataQualityBadge
                    confidence={financeData.dataQuality.overallDataConfidence}
                    completeness={financeData.dataQuality.industry.completenessPercentage}
                    label={`${financeData.recent_contributions?.length || 0} Records`}
                    showTooltip={true}
                    size="small"
                  />
                )}
              </div>

              {financeData.recent_contributions && financeData.recent_contributions.length > 0 ? (
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-6 sm:px-0">
                    <table className="min-w-full bg-white">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Contributor
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Amount
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Employer
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {financeData.recent_contributions.slice(0, 10).map(contribution => (
                          <tr
                            key={`cont-${contribution.contributor_name}-${contribution.contribution_receipt_amount}`}
                            className="hover:bg-white"
                          >
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {new Date(
                                contribution.contribution_receipt_date
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              <a
                                href={`https://www.fec.gov/data/receipts/individual-contributions/?contributor_name=${encodeURIComponent(contribution.contributor_name)}&two_year_transaction_period=${currentCycleData?.cycle || 2024}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#3ea2d4] hover:underline"
                              >
                                {contribution.contributor_name}
                              </a>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatCurrency(contribution.contribution_receipt_amount)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {contribution.contributor_employer || 'Not provided'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No contribution data available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
