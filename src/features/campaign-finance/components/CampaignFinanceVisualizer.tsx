/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect } from 'react';
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

// Chart colors
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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
  }>;
  opposingExpenditures?: Array<{
    amount: number;
    date: string;
    pacName: string;
    pacType: 'superPac' | 'traditional' | 'leadership' | 'hybrid' | 'unknown';
    description: string;
  }>;

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

interface LobbyingData {
  lobbyingData: {
    totalRelevantSpending: number;
    affectedCommittees: number;
    topCompanies: Array<{
      name: string;
      totalSpending: number;
    }>;
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
    superPac: { label: 'Super PAC', color: 'bg-purple-100 text-purple-800' },
    traditional: { label: 'PAC', color: 'bg-blue-100 text-blue-800' },
    leadership: { label: 'Leadership PAC', color: 'bg-green-100 text-green-800' },
    hybrid: { label: 'Hybrid PAC', color: 'bg-orange-100 text-orange-800' },
    unknown: { label: 'Unknown', color: 'bg-gray-100 text-gray-800' },
  };

  const { label, color } = config[type as keyof typeof config] || config.unknown;

  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${color}`}>{label}</span>
  );
};

export function CampaignFinanceVisualizer({
  financeData: initialFinanceData,
  representative: _representative,
  bioguideId: _bioguideId,
}: CampaignFinanceVisualizerProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'charts' | 'interest-groups' | 'lobbying' | 'expenditures' | 'contributions'
  >('overview');
  const [lobbyingData, setLobbyingData] = useState<LobbyingData | null>(null);
  const [isLoadingLobbying, setIsLoadingLobbying] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [comprehensiveData, setComprehensiveData] = useState<CampaignFinanceData | null>(null);

  // Fetch comprehensive finance data
  useEffect(() => {
    if (_bioguideId) {
      fetch(`/api/representative/${_bioguideId}/finance/comprehensive`)
        .then(response => {
          if (!response.ok) throw new Error('Failed to fetch comprehensive data');
          return response.json();
        })
        .then(data => {
          // Extract finance data from comprehensive response
          setComprehensiveData(data?.finance || data);
        })
        .catch(() => {
          // Fall back to initial data if comprehensive fetch fails
          setComprehensiveData(initialFinanceData || null);
        });
    }
  }, [_bioguideId, initialFinanceData]);

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

  // Prepare chart data
  const donationBreakdown = [
    { name: 'Individual', value: individualContributions, color: COLORS[0] },
    { name: 'PAC', value: pacContributions, color: COLORS[1] },
    { name: 'Party', value: partyContributions, color: COLORS[2] },
    { name: 'Self-Funded', value: candidateContributions, color: COLORS[3] },
  ].filter(item => item.value > 0); // Only show non-zero categories

  // Top contributors data for charts
  const topContributorsData = (financeData?.top_contributors || [])
    .slice(0, 10)
    .map((contributor: { name: string; total_amount: number }) => ({
      name:
        contributor.name.length > 15 ? contributor.name.substring(0, 15) + '...' : contributor.name,
      amount: contributor.total_amount,
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

  // Fetch lobbying data when lobbying tab is active
  useEffect(() => {
    if (activeTab === 'lobbying' && _bioguideId) {
      setIsLoadingLobbying(true);
      fetch(`/api/representative/${_bioguideId}/lobbying`)
        .then(response => response.json())
        .then((data: LobbyingData) => {
          setLobbyingData(data);
        })
        .catch(() => {
          setLobbyingData(null);
        })
        .finally(() => {
          setIsLoadingLobbying(false);
        });
    }
  }, [activeTab, _bioguideId]);

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
      lobbying: 'Lobbying',
      expenditures: 'Expenditures',
      contributions: 'Contributions',
    };
    setAnnouncement(`${tabNames[activeTab]} tab selected`);
  }, [activeTab]);

  // Keyboard navigation handler for tabs
  const handleTabKeyDown = (
    e: React.KeyboardEvent,
    tabId: 'overview' | 'charts' | 'interest-groups' | 'lobbying' | 'expenditures' | 'contributions'
  ) => {
    const tabs: Array<
      'overview' | 'charts' | 'interest-groups' | 'lobbying' | 'expenditures' | 'contributions'
    > = ['overview', 'charts', 'interest-groups', 'lobbying', 'expenditures', 'contributions'];
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
              { id: 'lobbying', name: 'Lobbying' },
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
                      | 'lobbying'
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
                      | 'lobbying'
                      | 'expenditures'
                      | 'contributions'
                  )
                }
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex-shrink-0 whitespace-nowrap py-4 px-4 sm:px-6 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
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
                <TopContributors contributors={financeData.top_contributors} />
              )}

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
                          <span className="text-green-600">
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
                          <span className="text-red-600">
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

              {/* FEC Transparency Links */}
              {financeData?.fecTransparencyLinks && (
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
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
                      className="text-blue-600 hover:underline block"
                    >
                      View Complete FEC Profile →
                    </a>
                    <a
                      href={financeData.fecTransparencyLinks.contributions}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline block"
                    >
                      View All Contributions →
                    </a>
                    <a
                      href={financeData.fecTransparencyLinks.financialSummary}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline block"
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
                      <ResponsiveContainer width="100%" height={300}>
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
                                className="w-4 h-4 rounded mr-3"
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
                  <ResponsiveContainer width="100%" height={400}>
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
                      <Bar dataKey="amount" fill={COLORS[0]} />
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
                        <ResponsiveContainer width="100%" height={300}>
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
                                    className="w-4 h-4 rounded mr-3"
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
                    <ResponsiveContainer width="100%" height={300}>
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
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Top Interest Group</div>
                          <div className="text-xl font-bold text-gray-900">
                            {financeData.interestGroupMetrics.topInfluencer || 'N/A'}
                          </div>
                        </div>

                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Grassroots Funding</div>
                          <div className="text-xl font-bold text-green-700">
                            {financeData.interestGroupMetrics.grassrootsPercentage.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">Small donors ≤ $200</div>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Funding Diversity</div>
                          <div className="text-xl font-bold text-blue-700">
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
                        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="text-sm text-orange-800">
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
                        <ResponsiveContainer width="100%" height={300}>
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
                                  `${formatCurrency(Number(value))} (${((Number(value) / financeData.interestGroupBaskets!.reduce((sum, b) => sum + b.totalAmount, 0)) * 100).toFixed(1)}%)`,
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
                              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                            >
                              <div className="flex items-center flex-1">
                                <div
                                  className="w-4 h-4 rounded mr-3 flex-shrink-0"
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
                                    className="w-3 h-3 rounded mr-2"
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
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                  <div
                                    className="h-1.5 rounded-full"
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
                                          {cat.category} ({formatCurrency(cat.amount)})
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

          {/* Corporate Lobbying Tab */}
          {activeTab === 'lobbying' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Corporate Lobbying</h3>

              {isLoadingLobbying ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Loading lobbying data...</p>
                </div>
              ) : lobbyingData && lobbyingData.lobbyingData.totalRelevantSpending > 0 ? (
                <div className="space-y-6">
                  {/* Simple Lobbying Summary */}
                  <div className="bg-white p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Lobbying Summary</h4>
                    <hr className="border-gray-300 mb-4" />

                    <div className="space-y-2 font-mono text-sm">
                      <div className="flex justify-between">
                        <span>Total Spending:</span>
                        <span className="font-semibold">
                          {formatCurrency(lobbyingData.lobbyingData.totalRelevantSpending)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Committees Affected:</span>
                        <span className="font-semibold">
                          {lobbyingData.lobbyingData.affectedCommittees}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Companies:</span>
                        <span className="font-semibold">
                          {lobbyingData.lobbyingData.topCompanies.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Companies - Simple Table */}
                  {lobbyingData.lobbyingData.topCompanies.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-3">
                        Top Lobbying Companies
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white">
                          <thead className="bg-white">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Company
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Spending
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {lobbyingData.lobbyingData.topCompanies.slice(0, 10).map(company => (
                              <tr
                                key={`company-${company.name}-${company.totalSpending}`}
                                className="hover:bg-white"
                              >
                                <td className="px-4 py-2 text-sm text-gray-900">{company.name}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {formatCurrency(company.totalSpending)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No significant lobbying activity found</p>
                  <p className="text-sm mt-2">
                    No companies are actively lobbying this representative&apos;s committees
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Expenditures Tab - Split into Supporting/Opposing */}
          {activeTab === 'expenditures' && (
            <div className="space-y-6">
              {/* Supporting Expenditures */}
              <div className="bg-white p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4 text-green-700">
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
                              <td className="py-2">{exp.pacName}</td>
                              <td className="py-2">
                                <PACTypeBadge type={exp.pacType} />
                              </td>
                              <td className="text-right py-2 font-semibold text-green-600">
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
                <h3 className="text-lg font-semibold mb-4 text-red-700">
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
                              <td className="py-2">{exp.pacName}</td>
                              <td className="py-2">
                                <PACTypeBadge type={exp.pacType} />
                              </td>
                              <td className="text-right py-2 font-semibold text-red-600">
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
                              {contribution.contributor_name}
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
