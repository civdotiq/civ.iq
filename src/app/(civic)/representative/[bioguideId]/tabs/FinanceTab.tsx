/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { CampaignFinanceVisualizer } from '@/features/campaign-finance/components/CampaignFinanceVisualizer';

// API response structure from FEC
interface FinanceAPIResponse {
  candidate_info?: {
    candidate_id: string;
    name: string;
    party: string;
  };
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
  top_contributors?: Array<{
    name: string;
    total_amount: number;
    count: number;
    employer?: string;
    occupation?: string;
  }>;
  industry_breakdown?: Array<{
    sector: string;
    amount: number;
    percentage: number;
  }>;
  top_expenditure_categories?: Array<{
    category: string;
    total_amount: number;
    count: number;
  }>;
}

// Normalized interface for the component
interface FinanceData {
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  donations: {
    individual: number;
    pac: number;
    party: number;
    candidate: number;
  };
  topContributors: Array<{
    name: string;
    amount: number;
    type: 'Individual' | 'PAC' | 'Party Committee';
  }>;
  industryBreakdown: Array<{
    industry: string;
    amount: number;
    percentage: number;
  }>;
  spendingCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

interface FECDataSource {
  candidateId: string;
  committeeId: string | null;
  cycle: number;
  urls: {
    candidateSummary: string;
    contributions: string;
    disbursements: string;
    filings: string;
    candidateProfile: string;
  };
  lastUpdated: string;
  disclaimer: string;
}

interface FinanceTabProps {
  financeData: FinanceData | (FinanceAPIResponse & { dataSources?: { fec?: FECDataSource } });
  metadata?: unknown;
  loading?: boolean;
}

export function FinanceTab({ financeData }: FinanceTabProps) {
  // Transform API response to normalized format
  const normalizeFinanceData = (
    data: FinanceData | FinanceAPIResponse | null | undefined
  ): FinanceData => {
    if (!data) {
      return {
        totalRaised: 0,
        totalSpent: 0,
        cashOnHand: 0,
        donations: { individual: 0, pac: 0, party: 0, candidate: 0 },
        topContributors: [],
        industryBreakdown: [],
        spendingCategories: [],
      };
    }

    // If already normalized, return as-is
    if ('donations' in data && data.donations && 'individual' in data.donations) {
      return data as FinanceData;
    }

    // Check if API response has direct fields (new format)
    const apiDataWithDirectFields = data as Record<string, unknown>;
    if (
      typeof apiDataWithDirectFields.totalRaised === 'number' ||
      typeof apiDataWithDirectFields.individualContributions === 'number'
    ) {
      return {
        totalRaised: (apiDataWithDirectFields.totalRaised as number) || 0,
        totalSpent: (apiDataWithDirectFields.totalSpent as number) || 0,
        cashOnHand: (apiDataWithDirectFields.cashOnHand as number) || 0,
        donations: {
          individual: (apiDataWithDirectFields.individualContributions as number) || 0,
          pac: (apiDataWithDirectFields.pacContributions as number) || 0,
          party: (apiDataWithDirectFields.partyContributions as number) || 0,
          candidate: (apiDataWithDirectFields.candidateContributions as number) || 0,
        },
        topContributors: (
          (apiDataWithDirectFields.top_contributors as Array<{
            name: string;
            total_amount: number;
          }>) || []
        )
          .slice(0, 5)
          .map(contributor => ({
            name: contributor.name,
            amount: contributor.total_amount,
            type: 'Individual' as const,
          })),
        industryBreakdown: (
          (apiDataWithDirectFields.industry_breakdown as Array<{
            sector: string;
            amount: number;
            percentage: number;
          }>) || []
        )
          .slice(0, 5)
          .map(industry => ({
            industry: industry.sector,
            amount: industry.amount,
            percentage: industry.percentage,
          })),
        spendingCategories: (
          (apiDataWithDirectFields.top_expenditure_categories as Array<{
            category: string;
            total_amount: number;
          }>) || []
        )
          .slice(0, 5)
          .map(category => ({
            category: category.category,
            amount: category.total_amount,
            percentage: 0, // Not provided in API response
          })),
      };
    }

    // Transform legacy API response format
    const apiData = data as FinanceAPIResponse;
    const latestCycle = apiData.financial_summary?.[0] || {
      total_receipts: 0,
      total_disbursements: 0,
      cash_on_hand_end_period: 0,
      individual_contributions: 0,
      pac_contributions: 0,
      party_contributions: 0,
      candidate_contributions: 0,
    };

    return {
      totalRaised: latestCycle.total_receipts || 0,
      totalSpent: latestCycle.total_disbursements || 0,
      cashOnHand: latestCycle.cash_on_hand_end_period || 0,
      donations: {
        individual: latestCycle.individual_contributions || 0,
        pac: latestCycle.pac_contributions || 0,
        party: latestCycle.party_contributions || 0,
        candidate: latestCycle.candidate_contributions || 0,
      },
      topContributors: (apiData.top_contributors || []).slice(0, 5).map(contributor => ({
        name: contributor.name,
        amount: contributor.total_amount,
        type: 'Individual' as const,
      })),
      industryBreakdown: (apiData.industry_breakdown || []).slice(0, 5).map(industry => ({
        industry: industry.sector,
        amount: industry.amount,
        percentage: industry.percentage,
      })),
      spendingCategories: (apiData.top_expenditure_categories || []).slice(0, 5).map(category => ({
        category: category.category,
        amount: category.total_amount,
        percentage: 0, // Not provided in API response
      })),
    };
  };

  const safeFinanceData = normalizeFinanceData(financeData);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Campaign Finance</h2>
        <div className="flex items-center gap-2">
          {(financeData as FinanceAPIResponse & { dataSources?: { fec?: FECDataSource } })
            ?.dataSources?.fec && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
              Official FEC Data
            </span>
          )}
          <a
            href="https://www.fec.gov/campaign-finance-data/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            About FEC
          </a>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(safeFinanceData.totalRaised)}
          </div>
          <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
            <span>Total Raised</span>
            <button
              title="Total receipts reported to FEC for current election cycle"
              className="text-gray-400 hover:text-gray-600 cursor-help"
            >
              ℹ️
            </button>
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-red-600">
            {formatCurrency(safeFinanceData.totalSpent)}
          </div>
          <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
            <span>Total Spent</span>
            <button
              title="Total disbursements reported to FEC for current election cycle"
              className="text-gray-400 hover:text-gray-600 cursor-help"
            >
              ℹ️
            </button>
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">
            {formatCurrency(safeFinanceData.cashOnHand)}
          </div>
          <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
            <span>Cash on Hand</span>
            <button
              title="Available cash at end of most recent reporting period"
              className="text-gray-400 hover:text-gray-600 cursor-help"
            >
              ℹ️
            </button>
          </div>
        </div>
      </div>

      {/* Donation Sources */}
      <h3 className="font-medium mb-3">Donation Sources</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-xl font-bold">
            {formatCurrency(safeFinanceData.donations.individual)}
          </div>
          <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
            <span>Individual</span>
            <button
              title="Contributions from individual donors (persons)"
              className="text-gray-400 hover:text-gray-600 cursor-help"
            >
              ℹ️
            </button>
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-xl font-bold">{formatCurrency(safeFinanceData.donations.pac)}</div>
          <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
            <span>PAC</span>
            <button
              title="Political Action Committee contributions"
              className="text-gray-400 hover:text-gray-600 cursor-help"
            >
              ℹ️
            </button>
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-xl font-bold">{formatCurrency(safeFinanceData.donations.party)}</div>
          <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
            <span>Party</span>
            <button
              title="Political party committee contributions"
              className="text-gray-400 hover:text-gray-600 cursor-help"
            >
              ℹ️
            </button>
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-xl font-bold">
            {formatCurrency(safeFinanceData.donations.candidate)}
          </div>
          <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
            <span>Candidate</span>
            <button
              title="Self-funding by the candidate"
              className="text-gray-400 hover:text-gray-600 cursor-help"
            >
              ℹ️
            </button>
          </div>
        </div>
      </div>

      {/* Top Contributors */}
      {safeFinanceData.topContributors.length > 0 && (
        <div className="mb-8">
          <h3 className="font-medium mb-3">Top Contributors</h3>
          <div className="space-y-2">
            {safeFinanceData.topContributors.slice(0, 5).map((contributor, index) => (
              <div
                key={`contributor-${contributor.name}-${index}`}
                className="flex justify-between items-start p-3 bg-gray-50 rounded"
              >
                <div>
                  <div className="font-medium">{contributor.name}</div>
                  <div className="text-sm text-gray-500">{contributor.type}</div>
                  {(financeData as FinanceAPIResponse & { dataSources?: { fec?: FECDataSource } })
                    ?.dataSources?.fec && (
                    <a
                      href={`https://www.fec.gov/data/receipts/?contributor_name=${encodeURIComponent(contributor.name)}&candidate_id=${(financeData as FinanceAPIResponse & { dataSources?: { fec?: FECDataSource } }).dataSources!.fec!.candidateId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View on FEC.gov →
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(contributor.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Industry Breakdown */}
      {safeFinanceData.industryBreakdown.length > 0 && (
        <div className="mb-8">
          <h3 className="font-medium mb-3">Industry Breakdown</h3>
          <div className="space-y-2">
            {safeFinanceData.industryBreakdown.slice(0, 5).map((industry, index) => (
              <div
                key={`industry-${industry.industry}-${index}`}
                className="flex items-center gap-3"
              >
                <span className="w-32 text-sm">{industry.industry}</span>
                <div className="flex-1 bg-gray-200 rounded h-6">
                  <div
                    className="bg-blue-500 h-6 rounded"
                    style={{ width: `${industry.percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm w-16 text-right">{formatCurrency(industry.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Visualizations */}
      {safeFinanceData.totalRaised > 0 && (
        <div className="mt-8">
          <CampaignFinanceVisualizer
            financeData={
              financeData as Parameters<typeof CampaignFinanceVisualizer>[0]['financeData']
            }
            representative={{ name: 'Representative', party: 'Unknown' }}
            bioguideId="unknown"
          />
        </div>
      )}

      {/* Data Attribution Section */}
      {(financeData as FinanceAPIResponse & { dataSources?: { fec?: FECDataSource } })?.dataSources
        ?.fec && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Data Sources & Verification</h4>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">FEC Candidate ID:</span>
              <a
                href={
                  (financeData as FinanceAPIResponse & { dataSources?: { fec?: FECDataSource } })
                    .dataSources!.fec!.urls.candidateSummary
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-mono"
              >
                {
                  (financeData as FinanceAPIResponse & { dataSources?: { fec?: FECDataSource } })
                    .dataSources!.fec!.candidateId
                }
              </a>
            </div>

            <div className="space-y-1">
              <a
                href={
                  (financeData as FinanceAPIResponse & { dataSources?: { fec?: FECDataSource } })
                    .dataSources!.fec!.urls.contributions
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline block"
              >
                → View all contributions on FEC.gov
              </a>
              <a
                href={
                  (financeData as FinanceAPIResponse & { dataSources?: { fec?: FECDataSource } })
                    .dataSources!.fec!.urls.disbursements
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline block"
              >
                → View all expenditures on FEC.gov
              </a>
              <a
                href={
                  (financeData as FinanceAPIResponse & { dataSources?: { fec?: FECDataSource } })
                    .dataSources!.fec!.urls.filings
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline block"
              >
                → View official filings on FEC.gov
              </a>
            </div>

            <p className="text-gray-500 mt-2">
              {
                (financeData as FinanceAPIResponse & { dataSources?: { fec?: FECDataSource } })
                  .dataSources!.fec!.disclaimer
              }
            </p>
          </div>
        </div>
      )}

      {/* Data Notice */}
      {safeFinanceData.totalRaised === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No campaign finance data available</p>
          <p className="text-sm text-gray-400 mt-2">
            Financial data is sourced from FEC filings and may be delayed
          </p>
        </div>
      )}
    </>
  );
}
