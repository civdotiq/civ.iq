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
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-100 rounded"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
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
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-green-600 mb-2">Total Raised</h3>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(data.totalRaised)}</div>
          <div className="text-sm text-gray-500 mt-1">Total receipts reported to FEC</div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Total Spent</h3>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(data.totalSpent)}</div>
          <div className="text-sm text-gray-500 mt-1">Total disbursements reported to FEC</div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-blue-600 mb-2">Cash on Hand</h3>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(data.cashOnHand)}</div>
          <div className="text-sm text-gray-500 mt-1">
            Available cash at end of reporting period
          </div>
        </div>
      </div>

      {/* Contribution Sources */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Contribution Sources</h3>
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
    </div>
  );
}
