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

export function CampaignFinanceVisualizer({
  financeData,
  representative: _representative,
  bioguideId: _bioguideId,
}: CampaignFinanceVisualizerProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'charts' | 'lobbying' | 'expenditures' | 'contributions'
  >('overview');
  const [lobbyingData, setLobbyingData] = useState<LobbyingData | null>(null);
  const [isLoadingLobbying, setIsLoadingLobbying] = useState(false);

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
    .map(contributor => ({
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

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const formatPercent = (numerator: number, denominator: number): string => {
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
      <div className="bg-white rounded-lg shadow-md p-6">
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
      {/* Tab Navigation - Only 4 Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Basic Overview' },
              { id: 'charts', name: 'Visual Charts' },
              { id: 'lobbying', name: 'Corporate Lobbying' },
              { id: 'expenditures', name: 'Expenditures' },
              { id: 'contributions', name: 'Contributions' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id as 'overview' | 'charts' | 'lobbying' | 'expenditures' | 'contributions'
                  )
                }
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Basic Overview Tab - Simple Text Display */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
              <hr className="border-gray-300" />

              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between">
                  <span>Total Raised:</span>
                  <span className="font-semibold">{formatCurrency(totalRaised)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Spent:</span>
                  <span className="font-semibold">{formatCurrency(totalSpent)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash on Hand:</span>
                  <span className="font-semibold">{formatCurrency(cashOnHand)}</span>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Contribution Breakdown</h4>
                <hr className="border-gray-300 mb-4" />

                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span>Individual:</span>
                    <span>
                      {formatCurrency(individualContributions)} (
                      {formatPercent(individualContributions, totalRaised)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>PAC:</span>
                    <span>
                      {formatCurrency(pacContributions)} (
                      {formatPercent(pacContributions, totalRaised)})
                    </span>
                  </div>
                  {partyContributions > 0 && (
                    <div className="flex justify-between">
                      <span>Party:</span>
                      <span>
                        {formatCurrency(partyContributions)} (
                        {formatPercent(partyContributions, totalRaised)})
                      </span>
                    </div>
                  )}
                  {candidateContributions > 0 && (
                    <div className="flex justify-between">
                      <span>Self-Funded:</span>
                      <span>
                        {formatCurrency(candidateContributions)} (
                        {formatPercent(candidateContributions, totalRaised)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Visual Charts Tab */}
          {activeTab === 'charts' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Campaign Finance Visualizations
              </h3>

              {/* Donation Sources Pie Chart */}
              {donationBreakdown.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Contribution Sources</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
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
                <div className="bg-gray-50 rounded-lg p-6">
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

              {/* Industry Breakdown Horizontal Bar Chart */}
              {industryData.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
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
                  <div className="bg-gray-50 rounded-lg p-4">
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
                          <thead className="bg-gray-50">
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
                                className="hover:bg-gray-50"
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

          {/* Expenditures Tab - Simple Table */}
          {activeTab === 'expenditures' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Expenditures</h3>

              {financeData.recent_expenditures && financeData.recent_expenditures.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Payee
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Purpose
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {financeData.recent_expenditures.slice(0, 10).map(expenditure => (
                        <tr
                          key={`exp-${expenditure.disbursement_date}-${expenditure.recipient_name}-${expenditure.disbursement_amount}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(expenditure.disbursement_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {expenditure.recipient_name}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {formatCurrency(expenditure.disbursement_amount)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 max-w-xs truncate">
                            {expenditure.disbursement_description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No expenditure data available</p>
                </div>
              )}
            </div>
          )}

          {/* Contributions Tab - Simple Table */}
          {activeTab === 'contributions' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Contributions</h3>

              {financeData.recent_contributions && financeData.recent_contributions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
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
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(contribution.contribution_receipt_date).toLocaleDateString()}
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
