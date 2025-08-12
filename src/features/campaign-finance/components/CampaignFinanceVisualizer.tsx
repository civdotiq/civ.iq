/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect } from 'react';

interface CampaignFinanceData {
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
    contribution_receipt_amount: number;
    contribution_receipt_date: string;
  }>;
  recent_expenditures: Array<{
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
    'overview' | 'lobbying' | 'expenditures' | 'contributions'
  >('overview');
  const [lobbyingData, setLobbyingData] = useState<LobbyingData | null>(null);
  const [isLoadingLobbying, setIsLoadingLobbying] = useState(false);

  // Get current cycle data
  const currentCycleData = financeData?.financial_summary?.[0];

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

  if (!financeData || !currentCycleData) {
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
              { id: 'lobbying', name: 'Corporate Lobbying' },
              { id: 'expenditures', name: 'Expenditures' },
              { id: 'contributions', name: 'Contributions' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(tab.id as 'overview' | 'lobbying' | 'expenditures' | 'contributions')
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
                  <span className="font-semibold">
                    {formatCurrency(currentCycleData.total_receipts)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Spent:</span>
                  <span className="font-semibold">
                    {formatCurrency(currentCycleData.total_disbursements)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cash on Hand:</span>
                  <span className="font-semibold">
                    {formatCurrency(currentCycleData.cash_on_hand_end_period)}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Contribution Breakdown</h4>
                <hr className="border-gray-300 mb-4" />

                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span>Individual:</span>
                    <span>
                      {formatCurrency(currentCycleData.individual_contributions)} (
                      {formatPercent(
                        currentCycleData.individual_contributions,
                        currentCycleData.total_receipts
                      )}
                      )
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>PAC:</span>
                    <span>
                      {formatCurrency(currentCycleData.pac_contributions)} (
                      {formatPercent(
                        currentCycleData.pac_contributions,
                        currentCycleData.total_receipts
                      )}
                      )
                    </span>
                  </div>
                  {currentCycleData.party_contributions > 0 && (
                    <div className="flex justify-between">
                      <span>Party:</span>
                      <span>
                        {formatCurrency(currentCycleData.party_contributions)} (
                        {formatPercent(
                          currentCycleData.party_contributions,
                          currentCycleData.total_receipts
                        )}
                        )
                      </span>
                    </div>
                  )}
                  {currentCycleData.candidate_contributions > 0 && (
                    <div className="flex justify-between">
                      <span>Self-Funded:</span>
                      <span>
                        {formatCurrency(currentCycleData.candidate_contributions)} (
                        {formatPercent(
                          currentCycleData.candidate_contributions,
                          currentCycleData.total_receipts
                        )}
                        )
                      </span>
                    </div>
                  )}
                </div>
              </div>
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
