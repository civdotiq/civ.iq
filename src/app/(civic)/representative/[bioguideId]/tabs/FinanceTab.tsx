/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DollarSign, TrendingUp, Users, Building } from 'lucide-react';
import {
  DataSourceBadge,
  DataTransparencyPanel,
  type DataMetadata,
} from '@/components/ui/DataTransparency';

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
  metadata?: DataMetadata;
  loading?: boolean;
}

const DONATION_SOURCE_COLORS = {
  Individual: '#22c55e',
  PAC: '#3b82f6',
  Party: '#8b5cf6',
  Candidate: '#f59e0b',
};

const _INDUSTRY_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

export function FinanceTab({ financeData, metadata, loading }: FinanceTabProps) {
  // Process donation source data for pie chart
  const donationSourceData = useMemo(() => {
    if (!financeData?.donations) return [];
    return [
      {
        name: 'Individual',
        value: financeData.donations.individual,
        color: DONATION_SOURCE_COLORS.Individual,
      },
      { name: 'PAC', value: financeData.donations.pac, color: DONATION_SOURCE_COLORS.PAC },
      { name: 'Party', value: financeData.donations.party, color: DONATION_SOURCE_COLORS.Party },
      {
        name: 'Candidate',
        value: financeData.donations.candidate,
        color: DONATION_SOURCE_COLORS.Candidate,
      },
    ].filter(item => item.value > 0);
  }, [financeData]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  // Format currency for tooltips
  const formatCurrencyFull = (amount: number): string => {
    return `$${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!financeData) {
    return (
      <div className="space-y-6">
        {/* Data Source Attribution */}
        {metadata && (
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Campaign Finance</h3>
            <DataTransparencyPanel metadata={metadata} layout="horizontal" showAll={false} />
          </div>
        )}

        <div className="text-center py-12">
          <div className="text-gray-500 mb-2">No campaign finance data available</div>
          <div className="text-sm text-gray-400">
            Campaign finance information will appear here when available from FEC.gov
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Data Source */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Campaign Finance</h3>
        {metadata && (
          <DataTransparencyPanel metadata={metadata} layout="horizontal" showAll={false} />
        )}
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Raised</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(financeData.totalRaised)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(financeData.totalSpent)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Cash on Hand</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(financeData.cashOnHand)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donation Sources Pie Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Donation Sources</h4>
          {donationSourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={donationSourceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donationSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatCurrencyFull(value), 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No donation data available
            </div>
          )}

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {donationSourceData.map(source => (
              <div key={source.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                <span className="text-sm text-gray-600">
                  {source.name}: {formatCurrency(source.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Breakdown Bar Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Top Industries</h4>
          {financeData.industryBreakdown?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={financeData.industryBreakdown.slice(0, 8)} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="industry" type="category" width={80} />
                <Tooltip formatter={(value: number) => [formatCurrencyFull(value), 'Amount']} />
                <Bar dataKey="amount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No industry data available
            </div>
          )}
        </div>
      </div>

      {/* Top Contributors */}
      {financeData.topContributors?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Top Contributors
            </h4>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {financeData.topContributors.slice(0, 10).map((contributor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{contributor.name}</div>
                    <div className="text-sm text-gray-600">{contributor.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(contributor.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spending Categories */}
      {financeData.spendingCategories?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Spending Categories</h4>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={financeData.spendingCategories}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value: number) => [formatCurrencyFull(value), 'Amount']} />
                <Bar dataKey="amount" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Data Source Attribution */}
      <div className="text-center">
        <div className="text-xs text-gray-500 mb-2">Official Campaign Finance Data</div>
        <DataSourceBadge source="fec.gov" size="sm" />
      </div>
    </div>
  );
}
