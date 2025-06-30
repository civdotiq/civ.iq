'use client';

import { useState, useMemo } from 'react';

interface CampaignFinanceData {
  candidate_info: any;
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
}

interface CampaignFinanceVisualizerProps {
  financeData: CampaignFinanceData;
  representative: {
    name: string;
    party: string;
  };
}

export function CampaignFinanceVisualizer({ financeData, representative }: CampaignFinanceVisualizerProps) {
  const [selectedCycle, setSelectedCycle] = useState<number | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'contributions' | 'expenditures' | 'trends' | 'analysis'>('overview');
  const [contributorFilter, setContributorFilter] = useState<'all' | 'individual' | 'pac' | 'party'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
        color: 'bg-blue-500',
        percentage: (currentCycleData.individual_contributions / currentCycleData.total_receipts) * 100
      },
      {
        label: 'PAC Contributions',
        amount: currentCycleData.pac_contributions,
        color: 'bg-green-500',
        percentage: (currentCycleData.pac_contributions / currentCycleData.total_receipts) * 100
      },
      {
        label: 'Party Contributions',
        amount: currentCycleData.party_contributions,
        color: 'bg-purple-500',
        percentage: (currentCycleData.party_contributions / currentCycleData.total_receipts) * 100
      },
      {
        label: 'Candidate Contributions',
        amount: currentCycleData.candidate_contributions,
        color: 'bg-orange-500',
        percentage: (currentCycleData.candidate_contributions / currentCycleData.total_receipts) * 100
      }
    ].filter(item => item.amount > 0);
  }, [currentCycleData]);

  const cycles = financeData.financial_summary.map(cycle => cycle.cycle).sort((a, b) => b - a);

  const filteredContributions = useMemo(() => {
    let filtered = financeData.recent_contributions;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contribution => 
        contribution.contributor_name.toLowerCase().includes(query) ||
        (contribution.contributor_employer && contribution.contributor_employer.toLowerCase().includes(query)) ||
        (contribution.contributor_occupation && contribution.contributor_occupation.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [financeData.recent_contributions, searchQuery]);

  const filteredExpenditures = useMemo(() => {
    let filtered = financeData.recent_expenditures;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(expenditure => 
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-2 w-48"
            />
            <select 
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="text-sm border border-gray-300 rounded px-3 py-2"
            >
              <option value="all">Latest Cycle</option>
              {cycles.map(cycle => (
                <option key={cycle} value={cycle}>{cycle} Election Cycle</option>
              ))}
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        {currentCycleData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatShortCurrency(currentCycleData.total_receipts)}
              </div>
              <div className="text-sm text-gray-600">Total Raised</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatShortCurrency(currentCycleData.total_disbursements)}
              </div>
              <div className="text-sm text-gray-600">Total Spent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatShortCurrency(currentCycleData.cash_on_hand_end_period)}
              </div>
              <div className="text-sm text-gray-600">Cash on Hand</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((currentCycleData.total_disbursements / currentCycleData.total_receipts) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Burn Rate</div>
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
              { id: 'contributions', name: 'Contributions' },
              { id: 'expenditures', name: 'Expenditures' },
              { id: 'trends', name: 'Trends' },
              { id: 'analysis', name: 'Analysis' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Contribution Sources</h4>
                <div className="space-y-3">
                  {contributionBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-32 text-sm text-gray-700">{item.label}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 mx-3 relative overflow-hidden">
                        <div 
                          className={`h-6 rounded-full transition-all duration-500 ${item.color}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {formatShortCurrency(item.amount)}
                        </div>
                      </div>
                      <div className="w-12 text-sm text-gray-600 text-right">
                        {item.percentage.toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Financial Health</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Fundraising Efficiency</span>
                      <span className="text-sm font-medium text-green-600">
                        {currentCycleData.total_receipts > 0 ? 'Active' : 'Low'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Spending Control</span>
                      <span className={`text-sm font-medium ${
                        currentCycleData.total_disbursements / currentCycleData.total_receipts < 0.8 
                          ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {currentCycleData.total_disbursements / currentCycleData.total_receipts < 0.8 
                          ? 'Conservative' : 'Aggressive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cash Reserve</span>
                      <span className={`text-sm font-medium ${
                        currentCycleData.cash_on_hand_end_period > 50000 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {currentCycleData.cash_on_hand_end_period > 50000 ? 'Strong' : 'Limited'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Fundraising Mix</h4>
                  <div className="w-32 h-32 mx-auto relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      {contributionBreakdown.map((item, index) => {
                        const radius = 60;
                        const strokeWidth = 12;
                        const normalizedRadius = radius - strokeWidth * 2;
                        const circumference = normalizedRadius * 2 * Math.PI;
                        const strokeDasharray = `${item.percentage / 100 * circumference} ${circumference}`;
                        const strokeDashoffset = -index * (circumference / contributionBreakdown.length);
                        
                        return (
                          <circle
                            key={index}
                            cx={radius}
                            cy={radius}
                            r={normalizedRadius}
                            fill="transparent"
                            stroke={item.color.replace('bg-', '')}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-500"
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">
                          {formatShortCurrency(currentCycleData.total_receipts)}
                        </div>
                        <div className="text-xs text-gray-600">Total</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contributions Tab */}
          {activeTab === 'contributions' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Top Contributors</h4>
                <div className="space-y-3">
                  {financeData.top_contributors.slice(0, 8).map((contributor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{contributor.name}</div>
                        <div className="text-sm text-gray-600">{contributor.count} contributions</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          {formatCurrency(contributor.total_amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(contributor.total_amount / contributor.count)} avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  Recent Contributions 
                  {searchQuery && <span className="text-sm text-gray-500 ml-2">({filteredContributions.length} found)</span>}
                </h4>
                <div className="space-y-2">
                  {filteredContributions.slice(0, 10).map((contribution, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-100 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{contribution.contributor_name}</div>
                        {contribution.contributor_employer && (
                          <div className="text-sm text-gray-600">{contribution.contributor_employer}</div>
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
                <h4 className="text-md font-medium text-gray-900 mb-4">Spending Categories</h4>
                <div className="space-y-3">
                  {financeData.top_expenditure_categories.slice(0, 8).map((category, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-40 text-sm text-gray-700">{category.category}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 mx-3 relative overflow-hidden">
                        <div 
                          className="h-6 rounded-full bg-red-500 transition-all duration-500"
                          style={{ 
                            width: `${(category.total_amount / financeData.top_expenditure_categories[0].total_amount) * 100}%` 
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {formatShortCurrency(category.total_amount)}
                        </div>
                      </div>
                      <div className="w-16 text-sm text-gray-600 text-right">
                        {category.count} items
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  Recent Expenditures
                  {searchQuery && <span className="text-sm text-gray-500 ml-2">({filteredExpenditures.length} found)</span>}
                </h4>
                <div className="space-y-2">
                  {filteredExpenditures.slice(0, 10).map((expenditure, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-100 rounded">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{expenditure.disbursement_description}</div>
                        <div className="text-sm text-gray-600">To: {expenditure.recipient_name}</div>
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

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Financial Trends Across Cycles</h4>
                {financeData.financial_summary.length > 1 ? (
                  <div className="space-y-4">
                    {['total_receipts', 'total_disbursements', 'cash_on_hand_end_period'].map((metric) => (
                      <div key={metric} className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3 capitalize">
                          {metric.replace(/_/g, ' ')}
                        </h5>
                        <div className="flex items-end space-x-2 h-32">
                          {financeData.financial_summary.map((cycle, index) => {
                            const value = cycle[metric as keyof typeof cycle] as number;
                            const maxValue = Math.max(...financeData.financial_summary.map(c => c[metric as keyof typeof c] as number));
                            const height = (value / maxValue) * 100;
                            
                            return (
                              <div key={cycle.cycle} className="flex-1 flex flex-col items-center">
                                <div 
                                  className="w-full bg-civiq-blue rounded transition-all duration-500"
                                  style={{ height: `${height}%` }}
                                  title={`${cycle.cycle}: ${formatCurrency(value)}`}
                                />
                                <div className="text-xs text-gray-600 mt-1">{cycle.cycle}</div>
                                <div className="text-xs font-medium text-gray-900">
                                  {formatShortCurrency(value)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    More data needed to show trends. Multiple election cycles required.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && currentCycleData && (
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Financial Health Assessment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">Fundraising Efficiency</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Raised</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(currentCycleData.total_receipts)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Burn Rate</span>
                        <span className={`font-medium ${
                          (currentCycleData.total_disbursements / currentCycleData.total_receipts) < 0.8 
                            ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.round((currentCycleData.total_disbursements / currentCycleData.total_receipts) * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Individual vs PAC Ratio</span>
                        <span className="font-medium text-civiq-blue">
                          {Math.round((currentCycleData.individual_contributions / currentCycleData.pac_contributions) * 100) / 100 || 'N/A'}:1
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">Contribution Analysis</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg. Contribution</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(
                            financeData.recent_contributions.length > 0 
                              ? financeData.recent_contributions.reduce((sum, c) => sum + c.contribution_receipt_amount, 0) / financeData.recent_contributions.length
                              : 0
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Contributors</span>
                        <span className="font-medium text-gray-900">
                          {financeData.top_contributors.reduce((sum, c) => sum + c.count, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Repeat Contributors</span>
                        <span className="font-medium text-gray-900">
                          {financeData.top_contributors.filter(c => c.count > 1).length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Spending Patterns</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-civiq-blue">
                        {Math.round((currentCycleData.total_disbursements / currentCycleData.total_receipts) * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Funds Spent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {financeData.top_expenditure_categories.length}
                      </div>
                      <div className="text-sm text-gray-600">Spending Categories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {formatShortCurrency(
                          financeData.top_expenditure_categories.length > 0 
                            ? financeData.top_expenditure_categories[0].total_amount
                            : 0
                        )}
                      </div>
                      <div className="text-sm text-gray-600">Largest Category</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Compliance & Transparency</h4>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600 text-xl">ℹ️</div>
                    <div>
                      <p className="text-sm text-gray-700 mb-2">
                        This analysis is based on data reported to the Federal Election Commission (FEC). 
                        All contributions and expenditures are subject to federal campaign finance laws and disclosure requirements.
                      </p>
                      <p className="text-sm text-gray-600">
                        Data is updated regularly but may have reporting delays. For the most current information, 
                        visit the official FEC database.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-sm text-gray-500">
        Campaign finance data sourced from the Federal Election Commission (FEC)
      </div>
    </div>
  );
}