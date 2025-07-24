'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useMemo, useEffect } from 'react';
import { IndustryBreakdown } from './campaign-finance/IndustryBreakdown';
import { DonorAnalysis } from './campaign-finance/DonorAnalysis';
import { FundraisingTrends } from './campaign-finance/FundraisingTrends';
import { EnhancedFECData } from '@/types/fec';
import { structuredLogger } from '@/lib/logging/universal-logger';

interface CampaignFinanceData {
  candidate_info: unknown;
  financial_summary: Array<{
    cycle: number;
    total_receipts: number;
    total_disbursements: number;
    cash_on_hand_end_period: number;
    individual_contributions: number;
    pac_contributions: number;
    party_contributions: number;
    candidate_contributions: number;
  }>;
  recent_contributions: Array<{
    contributor_name: string;
    contributor_employer?: string;
    contributor_occupation?: string;
    contribution_receipt_amount: number;
    contribution_receipt_date: string;
    committee_name: string;
  }>;
  recent_expenditures: Array<{
    committee_name: string;
    disbursement_description: string;
    disbursement_amount: number;
    disbursement_date: string;
    recipient_name: string;
  }>;
  top_contributors: Array<{
    name: string;
    total_amount: number;
    count: number;
  }>;
  top_expenditure_categories: Array<{
    category: string;
    total_amount: number;
    count: number;
  }>;
  metadata?: {
    dataSource: 'fec.gov' | 'mock';
    retrievalMethod?: 'direct-mapping' | 'name-search' | 'fallback';
    mappingUsed?: boolean;
    candidateInfo?: {
      fecId: string;
      name: string;
      office: string;
      state: string;
      district?: string;
    };
    dataQuality?: {
      financialSummary: number;
      recentContributions: number;
      recentExpenditures: number;
      topContributors: number;
      topCategories: number;
    };
    lastUpdated?: string;
    cacheInfo?: string;
  };
}

interface CampaignFinanceVisualizerProps {
  financeData: CampaignFinanceData;
  representative: {
    name: string;
    party: string;
  };
  bioguideId?: string;
}

export function CampaignFinanceVisualizer({
  financeData,
  representative: _representative,
  bioguideId,
}: CampaignFinanceVisualizerProps) {
  const [selectedCycle, setSelectedCycle] = useState<number | 'all'>('all');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'industry' | 'donors' | 'trends' | 'contributions' | 'expenditures'
  >('overview');
  const [_contributorFilter, _setContributorFilter] = useState<
    'all' | 'individual' | 'pac' | 'party'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [enhancedData, setEnhancedData] = useState<EnhancedFECData | null>(null);
  const [isLoadingEnhanced, setIsLoadingEnhanced] = useState(false);

  // Fetch enhanced data from the new endpoint
  useEffect(() => {
    if (
      bioguideId &&
      (activeTab === 'industry' || activeTab === 'donors' || activeTab === 'trends')
    ) {
      setIsLoadingEnhanced(true);

      fetch(`/api/representative/${bioguideId}/finance/enhanced`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data: EnhancedFECData) => {
          structuredLogger.info('Enhanced FEC data fetched successfully', {
            component: 'CampaignFinanceVisualizer',
            metadata: {
              hasData: !!data,
              dataKeys: Object.keys(data || {}),
            },
          });
          setEnhancedData(data);
        })
        .catch(error => {
          structuredLogger.error('Error fetching enhanced FEC data', {
            component: 'CampaignFinanceVisualizer',
            error: error as Error,
            metadata: { bioguideId },
          });
          // Fall back to transformed data if fetch fails
          setEnhancedData(null);
        })
        .finally(() => {
          setIsLoadingEnhanced(false);
        });
    }
  }, [bioguideId, activeTab]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatShortCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return formatCurrency(amount);
  };

  const currentCycleData = useMemo(() => {
    if (selectedCycle === 'all') {
      return financeData.financial_summary[0] || null;
    }
    return financeData.financial_summary.find(cycle => cycle.cycle === selectedCycle) || null;
  }, [financeData.financial_summary, selectedCycle]);

  const contributionBreakdown = useMemo(() => {
    if (!currentCycleData) return [];

    return [
      {
        label: 'Individual Contributions',
        amount: currentCycleData.individual_contributions,
        color: 'bg-civiq-blue',
        percentage:
          (currentCycleData.individual_contributions / currentCycleData.total_receipts) * 100,
      },
      {
        label: 'PAC Contributions',
        amount: currentCycleData.pac_contributions,
        color: 'bg-civiq-green',
        percentage: (currentCycleData.pac_contributions / currentCycleData.total_receipts) * 100,
      },
      {
        label: 'Party Contributions',
        amount: currentCycleData.party_contributions,
        color: 'bg-purple-500',
        percentage: (currentCycleData.party_contributions / currentCycleData.total_receipts) * 100,
      },
      {
        label: 'Candidate Contributions',
        amount: currentCycleData.candidate_contributions,
        color: 'bg-orange-500',
        percentage:
          (currentCycleData.candidate_contributions / currentCycleData.total_receipts) * 100,
      },
    ].filter(item => item.amount > 0);
  }, [currentCycleData]);

  const cycles = financeData.financial_summary.map(cycle => cycle.cycle).sort((a, b) => b - a);

  // Note: Enhanced data is now fetched from the API endpoint instead of being transformed here

  const filteredContributions = useMemo(() => {
    let filtered = financeData.recent_contributions;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        contribution =>
          contribution.contributor_name.toLowerCase().includes(query) ||
          (contribution.contributor_employer &&
            contribution.contributor_employer.toLowerCase().includes(query)) ||
          (contribution.contributor_occupation &&
            contribution.contributor_occupation.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [financeData.recent_contributions, searchQuery]);

  const filteredExpenditures = useMemo(() => {
    let filtered = financeData.recent_expenditures;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        expenditure =>
          expenditure.disbursement_description.toLowerCase().includes(query) ||
          expenditure.recipient_name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [financeData.recent_expenditures, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header with Enhanced Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Campaign Finance Analysis</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search contributions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-2 w-48"
            />
            <select
              value={selectedCycle}
              onChange={e =>
                setSelectedCycle(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
              }
              className="text-sm border border-gray-300 rounded px-3 py-2"
            >
              <option value="all">Latest Cycle</option>
              {cycles.map(cycle => (
                <option key={cycle} value={cycle}>
                  {cycle} Election Cycle
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Enhanced Financial Summary Section */}
        {currentCycleData && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
                <div className="text-4xl font-bold text-civiq-green mb-2">
                  {formatCurrency(currentCycleData.total_receipts)}
                </div>
                <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Total Raised
                </div>
                <div className="mt-2 text-xs text-gray-500">This election cycle</div>
              </div>
              <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
                <div className="text-4xl font-bold text-civiq-red mb-2">
                  {formatCurrency(currentCycleData.total_disbursements)}
                </div>
                <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Total Spent
                </div>
                <div className="mt-2 text-xs text-gray-500">Campaign expenditures</div>
              </div>
              <div className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200">
                <div className="text-4xl font-bold text-civiq-blue mb-2">
                  {formatCurrency(currentCycleData.cash_on_hand_end_period)}
                </div>
                <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Cash On Hand
                </div>
                <div className="mt-2 text-xs text-gray-500">Available funds</div>
              </div>
            </div>

            {/* Additional metrics row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {Math.round(
                    (currentCycleData.total_disbursements / currentCycleData.total_receipts) * 100
                  )}
                  %
                </div>
                <div className="text-xs text-gray-600">Burn Rate</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {formatShortCurrency(currentCycleData.individual_contributions)}
                </div>
                <div className="text-xs text-gray-600">Individual</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {formatShortCurrency(currentCycleData.pac_contributions)}
                </div>
                <div className="text-xs text-gray-600">PAC Funds</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {(
                    (currentCycleData.individual_contributions / currentCycleData.total_receipts) *
                    100
                  ).toFixed(0)}
                  %
                </div>
                <div className="text-xs text-gray-600">Grassroots</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'industry', name: 'Industry Analysis' },
              { id: 'donors', name: 'Donor Analysis' },
              { id: 'trends', name: 'Fundraising Trends' },
              { id: 'contributions', name: 'Contributions' },
              { id: 'expenditures', name: 'Expenditures' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id as
                      | 'overview'
                      | 'industry'
                      | 'donors'
                      | 'trends'
                      | 'contributions'
                      | 'expenditures'
                  )
                }
                className={`${
                  activeTab === tab.id
                    ? 'border-civiq-blue text-civiq-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && currentCycleData && (
            <div className="space-y-8">
              {/* Sources of Campaign Funding Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-6">
                  Sources of Campaign Funding
                </h4>
                <div className="relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-xs text-gray-500">
                    <span>$2M</span>
                    <span>$1.5M</span>
                    <span>$1M</span>
                    <span>$500K</span>
                    <span>$0</span>
                  </div>

                  {/* Chart area */}
                  <div className="ml-12 h-64 bg-gray-50 rounded relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0">
                      {[0, 25, 50, 75, 100].map(percent => (
                        <div
                          key={percent}
                          className="absolute w-full border-t border-gray-200"
                          style={{ bottom: `${percent}%` }}
                        />
                      ))}
                    </div>

                    {/* Bars */}
                    <div className="absolute inset-0 flex items-end justify-around px-4 pb-2">
                      {contributionBreakdown.map((item, index) => {
                        const maxAmount = Math.max(...contributionBreakdown.map(i => i.amount));
                        const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                        return (
                          <div key={index} className="flex flex-col items-center w-16">
                            <div className="text-xs font-medium text-gray-900 mb-1">
                              {formatShortCurrency(item.amount)}
                            </div>
                            <div
                              className={`w-12 rounded-t transition-all duration-700 ${item.color}`}
                              style={{ height: `${height}%`, minHeight: '8px' }}
                              title={`${item.label}: ${formatCurrency(item.amount)}`}
                            />
                            <div className="text-xs text-gray-600 mt-2 text-center leading-tight">
                              {item.label.replace(' Contributions', '')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Contributors Horizontal Bar Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-6">Top Contributors</h4>
                <div className="space-y-4">
                  {financeData.top_contributors.slice(0, 6).map((contributor, index) => {
                    const maxAmount = financeData.top_contributors[0]?.total_amount || 1;
                    const percentage = (contributor.total_amount / maxAmount) * 100;

                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="font-medium text-gray-900 text-sm">
                            {contributor.name}
                          </div>
                          <div className="text-sm font-semibold text-civiq-green">
                            {formatCurrency(contributor.total_amount)}
                          </div>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                              className="bg-civiq-green h-4 rounded-full transition-all duration-700 relative"
                              style={{ width: `${percentage}%` }}
                            >
                              <div className="absolute right-2 top-0 h-full flex items-center">
                                <span className="text-xs font-medium text-white">
                                  {contributor.count} contributions
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Scale reference */}
                <div className="flex justify-between text-xs text-gray-500 mt-4 px-1">
                  <span>$0</span>
                  <span>
                    {formatShortCurrency(financeData.top_contributors[0]?.total_amount || 0)}
                  </span>
                </div>
              </div>

              {/* Spending Categories Vertical Bar Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-6">Spending by Category</h4>
                <div className="relative">
                  {/* Y-axis for spending */}
                  <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-xs text-gray-500">
                    <span>$500K</span>
                    <span>$400K</span>
                    <span>$300K</span>
                    <span>$200K</span>
                    <span>$100K</span>
                    <span>$0</span>
                  </div>

                  {/* Chart area */}
                  <div className="ml-16 h-64 bg-gray-50 rounded relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0">
                      {[0, 20, 40, 60, 80, 100].map(percent => (
                        <div
                          key={percent}
                          className="absolute w-full border-t border-gray-200"
                          style={{ bottom: `${percent}%` }}
                        />
                      ))}
                    </div>

                    {/* Bars */}
                    <div className="absolute inset-0 flex items-end justify-around px-4 pb-2">
                      {financeData.top_expenditure_categories.slice(0, 5).map((category, index) => {
                        const maxAmount =
                          financeData.top_expenditure_categories[0]?.total_amount || 1;
                        const height = (category.total_amount / maxAmount) * 100;

                        return (
                          <div key={index} className="flex flex-col items-center w-20">
                            <div className="text-xs font-medium text-gray-900 mb-1">
                              {formatShortCurrency(category.total_amount)}
                            </div>
                            <div
                              className="w-16 bg-civiq-red rounded-t transition-all duration-700"
                              style={{ height: `${height}%`, minHeight: '8px' }}
                              title={`${category.category}: ${formatCurrency(category.total_amount)}`}
                            />
                            <div className="text-xs text-gray-600 mt-2 text-center leading-tight max-w-20">
                              {category.category.length > 12
                                ? category.category.substring(0, 12) + '...'
                                : category.category}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Funding Trends */}
              {financeData.financial_summary.length > 1 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-6">
                    Historical Funding Trends
                  </h4>
                  <div className="relative h-64">
                    {/* Y-axis */}
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
                      <span>$3M</span>
                      <span>$2M</span>
                      <span>$1M</span>
                      <span>$0</span>
                    </div>

                    {/* Chart area */}
                    <div className="ml-12 h-full bg-gray-50 rounded relative">
                      {/* Grid lines */}
                      <div className="absolute inset-0">
                        {[0, 33, 66, 100].map(percent => (
                          <div
                            key={percent}
                            className="absolute w-full border-t border-gray-200"
                            style={{ bottom: `${percent}%` }}
                          />
                        ))}
                      </div>

                      {/* Line chart */}
                      <div className="absolute inset-0 p-4">
                        <svg className="w-full h-full">
                          {/* Total Receipts Line */}
                          {financeData.financial_summary.map((cycle, index) => {
                            if (index === 0) return null;
                            const prevCycle = financeData.financial_summary[index - 1];
                            const maxAmount = Math.max(
                              ...financeData.financial_summary.map(c => c.total_receipts)
                            );

                            const x1 =
                              ((index - 1) / (financeData.financial_summary.length - 1)) * 100;
                            const x2 = (index / (financeData.financial_summary.length - 1)) * 100;
                            const y1 = 100 - (prevCycle.total_receipts / maxAmount) * 90;
                            const y2 = 100 - (cycle.total_receipts / maxAmount) * 90;

                            return (
                              <line
                                key={`receipts-${index}`}
                                x1={`${x1}%`}
                                y1={`${y1}%`}
                                x2={`${x2}%`}
                                y2={`${y2}%`}
                                stroke="#0a9338"
                                strokeWidth="3"
                                className="transition-all duration-500"
                              />
                            );
                          })}

                          {/* Data points */}
                          {financeData.financial_summary.map((cycle, index) => {
                            const maxAmount = Math.max(
                              ...financeData.financial_summary.map(c => c.total_receipts)
                            );
                            const x = (index / (financeData.financial_summary.length - 1)) * 100;
                            const y = 100 - (cycle.total_receipts / maxAmount) * 90;

                            return (
                              <circle
                                key={`point-${index}`}
                                cx={`${x}%`}
                                cy={`${y}%`}
                                r="4"
                                fill="#0a9338"
                                className="transition-all duration-500"
                              />
                            );
                          })}
                        </svg>

                        {/* X-axis labels */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-600">
                          {financeData.financial_summary.map(cycle => (
                            <span key={cycle.cycle}>{cycle.cycle}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Industry Analysis Tab */}
          {activeTab === 'industry' && (
            <div className="space-y-6">
              {isLoadingEnhanced ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading industry analysis...</span>
                </div>
              ) : enhancedData ? (
                <IndustryBreakdown data={enhancedData} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Enhanced industry data not available</p>
                  <p className="text-sm mt-2">Please ensure bioguideId is provided</p>
                </div>
              )}
            </div>
          )}

          {/* Donor Analysis Tab */}
          {activeTab === 'donors' && (
            <div className="space-y-6">
              {isLoadingEnhanced ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading donor analysis...</span>
                </div>
              ) : enhancedData ? (
                <DonorAnalysis data={enhancedData} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Enhanced donor data not available</p>
                  <p className="text-sm mt-2">Please ensure bioguideId is provided</p>
                </div>
              )}
            </div>
          )}

          {/* Fundraising Trends Tab */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              {isLoadingEnhanced ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading fundraising trends...</span>
                </div>
              ) : enhancedData ? (
                <FundraisingTrends data={enhancedData} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Enhanced fundraising data not available</p>
                  <p className="text-sm mt-2">Please ensure bioguideId is provided</p>
                </div>
              )}
            </div>
          )}

          {/* Contributions Tab */}
          {activeTab === 'contributions' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  Recent Contributions
                  {searchQuery && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({filteredContributions.length} found)
                    </span>
                  )}
                </h4>
                <div className="space-y-2">
                  {filteredContributions.slice(0, 10).map((contribution, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {contribution.contributor_name}
                        </div>
                        {contribution.contributor_employer && (
                          <div className="text-sm text-gray-600">
                            {contribution.contributor_employer}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          {formatCurrency(contribution.contribution_receipt_amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(contribution.contribution_receipt_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Expenditures Tab */}
          {activeTab === 'expenditures' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  Recent Expenditures
                  {searchQuery && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({filteredExpenditures.length} found)
                    </span>
                  )}
                </h4>
                <div className="space-y-2">
                  {filteredExpenditures.slice(0, 10).map((expenditure, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {expenditure.disbursement_description}
                        </div>
                        <div className="text-sm text-gray-600">
                          To: {expenditure.recipient_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          {formatCurrency(expenditure.disbursement_amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(expenditure.disbursement_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Source Information */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  financeData.metadata?.dataSource === 'fec.gov' ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              ></span>
              <span className="font-medium">
                Data Source:{' '}
                {financeData.metadata?.dataSource === 'fec.gov'
                  ? 'Live FEC Data'
                  : 'Sample/Demo Data'}
              </span>
              {financeData.metadata?.dataSource === 'mock' && (
                <div className="mt-1 text-xs text-gray-500">
                  Real campaign finance data not available for this representative
                </div>
              )}
            </div>
            {financeData.metadata?.retrievalMethod &&
              financeData.metadata.dataSource === 'fec.gov' && (
                <div className="text-xs text-gray-500 mt-1">
                  Retrieved via:{' '}
                  {financeData.metadata.retrievalMethod === 'direct-mapping'
                    ? 'Direct FEC ID mapping'
                    : financeData.metadata.retrievalMethod === 'name-search'
                      ? 'FEC candidate name search'
                      : 'FEC database lookup'}
                </div>
              )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {financeData.metadata?.lastUpdated && (
              <div>
                Last updated: {new Date(financeData.metadata.lastUpdated).toLocaleDateString()}
              </div>
            )}
            {financeData.metadata?.dataSource === 'fec.gov' && (
              <div className="mt-1">
                📊 <span className="font-medium">About this data:</span> Official campaign finance
                reports filed with the FEC. Includes contributions over $200, all expenditures, and
                quarterly financial summaries.
              </div>
            )}
            {financeData.metadata?.dataSource === 'mock' && (
              <div className="mt-1">
                🎯 <span className="font-medium">Sample data:</span> Representative examples to
                demonstrate platform capabilities. Real FEC data integration available for mapped
                representatives.
              </div>
            )}
          </div>
        </div>

        {financeData.metadata?.candidateInfo && (
          <div className="mt-3 p-3 bg-white rounded border border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-2">FEC Candidate Information</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
              <div>
                <span className="font-medium">FEC ID:</span>{' '}
                {financeData.metadata.candidateInfo.fecId}
              </div>
              <div>
                <span className="font-medium">Name:</span> {financeData.metadata.candidateInfo.name}
              </div>
              <div>
                <span className="font-medium">Office:</span>{' '}
                {financeData.metadata.candidateInfo.office === 'H' ? 'House' : 'Senate'}
              </div>
              <div>
                <span className="font-medium">State:</span>{' '}
                {financeData.metadata.candidateInfo.state}
                {financeData.metadata.candidateInfo.district &&
                  ` (District ${financeData.metadata.candidateInfo.district})`}
              </div>
            </div>
          </div>
        )}

        {financeData.metadata?.dataQuality && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-gray-600">
            <div className="text-center">
              <div className="font-medium text-gray-800">
                {financeData.metadata.dataQuality.financialSummary}
              </div>
              <div>Financial Cycles</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-800">
                {financeData.metadata.dataQuality.recentContributions}
              </div>
              <div>Contributions</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-800">
                {financeData.metadata.dataQuality.recentExpenditures}
              </div>
              <div>Expenditures</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-800">
                {financeData.metadata.dataQuality.topContributors}
              </div>
              <div>Top Contributors</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-800">
                {financeData.metadata.dataQuality.topCategories}
              </div>
              <div>Spending Categories</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
