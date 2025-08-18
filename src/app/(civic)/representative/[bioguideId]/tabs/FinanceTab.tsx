/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';

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

interface FinanceTabProps {
  financeData: FinanceData;
  metadata?: unknown;
  loading?: boolean;
}

export function FinanceTab({ financeData }: FinanceTabProps) {
  // Provide default values if financeData is null/undefined
  const safeFinanceData = financeData || {
    totalRaised: 0,
    totalSpent: 0,
    cashOnHand: 0,
    donations: { individual: 0, pac: 0, party: 0, candidate: 0 },
    topContributors: [],
    industryBreakdown: [],
    spendingCategories: [],
  };

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
      <h2 className="text-lg font-semibold mb-4">Campaign Finance</h2>

      {/* Financial Overview */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(safeFinanceData.totalRaised)}
          </div>
          <div className="text-sm text-gray-500">Total Raised</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-red-600">
            {formatCurrency(safeFinanceData.totalSpent)}
          </div>
          <div className="text-sm text-gray-500">Total Spent</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">
            {formatCurrency(safeFinanceData.cashOnHand)}
          </div>
          <div className="text-sm text-gray-500">Cash on Hand</div>
        </div>
      </div>

      {/* Donation Sources */}
      <h3 className="font-medium mb-3">Donation Sources</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-xl font-bold">
            {formatCurrency(safeFinanceData.donations.individual)}
          </div>
          <div className="text-sm text-gray-500">Individual</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-xl font-bold">{formatCurrency(safeFinanceData.donations.pac)}</div>
          <div className="text-sm text-gray-500">PAC</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-xl font-bold">{formatCurrency(safeFinanceData.donations.party)}</div>
          <div className="text-sm text-gray-500">Party</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <div className="text-xl font-bold">
            {formatCurrency(safeFinanceData.donations.candidate)}
          </div>
          <div className="text-sm text-gray-500">Candidate</div>
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
                className="flex justify-between items-center p-3 bg-gray-50 rounded"
              >
                <div>
                  <div className="font-medium">{contributor.name}</div>
                  <div className="text-sm text-gray-500">{contributor.type}</div>
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
