/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * Finance Comparison Component
 *
 * Allows side-by-side comparison of campaign finance data
 * for 2-4 representatives
 */

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface FinanceData {
  totalRaised: number;
  totalSpent: number;
  individualContributions: number;
  pacContributions: number;
  interestGroupMetrics?: {
    grassrootsPercentage: number;
    corporatePercentage: number;
  };
}

interface Representative {
  bioguideId: string;
  name: string;
  party: 'Democrat' | 'Republican' | 'Independent';
  financeData: FinanceData;
}

interface FinanceComparisonProps {
  representatives: Representative[];
}

export function FinanceComparison({ representatives }: FinanceComparisonProps) {
  if (representatives.length < 2 || representatives.length > 4) {
    return (
      <div className="aicher-card p-6">
        <p className="text-gray-500">Please select 2-4 representatives to compare</p>
      </div>
    );
  }

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const partyColors = {
    Democrat: '#3B82F6',
    Republican: '#EF4444',
    Independent: '#8B5CF6',
  };

  // Prepare comparison data for charts
  const totalRaisedData = representatives.map(rep => ({
    name: rep.name.split(' ').slice(-1)[0], // Last name only
    fullName: rep.name,
    amount: rep.financeData.totalRaised,
    fill: partyColors[rep.party],
  }));

  const grassrootsData = representatives.map(rep => ({
    name: rep.name.split(' ').slice(-1)[0],
    fullName: rep.name,
    percentage: rep.financeData.interestGroupMetrics?.grassrootsPercentage || 0,
    fill: partyColors[rep.party],
  }));

  const sourceComparisonData = representatives.map(rep => ({
    name: rep.name.split(' ').slice(-1)[0],
    fullName: rep.name,
    individual: rep.financeData.individualContributions,
    pac: rep.financeData.pacContributions,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Campaign Finance Comparison</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {representatives.map(rep => (
          <div
            key={rep.bioguideId}
            className="aicher-card p-4"
            style={{ borderTopColor: partyColors[rep.party], borderTopWidth: '4px' }}
          >
            <h3 className="text-sm font-medium text-gray-700 mb-1">{rep.name}</h3>
            <p className="text-xs text-gray-500 mb-2">{rep.party}</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(rep.financeData.totalRaised)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total Raised</p>
          </div>
        ))}
      </div>

      {/* Total Raised Comparison */}
      <div className="aicher-card p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Raised Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={totalRaisedData}>
            <XAxis dataKey="name" />
            <YAxis tickFormatter={value => formatCurrency(Number(value))} />
            <Tooltip
              formatter={(value: number) => [`$${Number(value).toLocaleString()}`, 'Total Raised']}
              labelFormatter={(label, payload) => {
                const entry = payload?.[0]?.payload;
                return entry?.fullName || label;
              }}
            />
            <Bar dataKey="amount" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Grassroots Funding Comparison */}
      <div className="aicher-card p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Grassroots Funding Percentage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={grassrootsData}>
            <XAxis dataKey="name" />
            <YAxis tickFormatter={value => `${value}%`} />
            <Tooltip
              formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Grassroots']}
              labelFormatter={(label, payload) => {
                const entry = payload?.[0]?.payload;
                return entry?.fullName || label;
              }}
            />
            <Bar dataKey="percentage" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-2">
          Grassroots: Contributions $200 or less from individual donors
        </p>
      </div>

      {/* Source Breakdown Comparison */}
      <div className="aicher-card p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contribution Sources</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sourceComparisonData}>
            <XAxis dataKey="name" />
            <YAxis tickFormatter={value => formatCurrency(Number(value))} />
            <Tooltip formatter={(value: number) => `$${Number(value).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="individual" name="Individual" fill="#3B82F6" />
            <Bar dataKey="pac" name="PAC" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <div className="aicher-card p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Comparison</h3>
        <div className="overflow-x-auto -mx-6 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-6 sm:px-0">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Representative</th>
                  <th className="text-right py-2 px-2">Total Raised</th>
                  <th className="text-right py-2 px-2">Total Spent</th>
                  <th className="text-right py-2 px-2">Individual</th>
                  <th className="text-right py-2 px-2">PAC</th>
                  <th className="text-right py-2 pl-2">Grassroots %</th>
                </tr>
              </thead>
              <tbody>
                {representatives.map(rep => (
                  <tr key={rep.bioguideId} className="border-b">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: partyColors[rep.party] }}
                        ></div>
                        <span className="font-medium">{rep.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 px-2">
                      {formatCurrency(rep.financeData.totalRaised)}
                    </td>
                    <td className="text-right py-2 px-2">
                      {formatCurrency(rep.financeData.totalSpent)}
                    </td>
                    <td className="text-right py-2 px-2">
                      {formatCurrency(rep.financeData.individualContributions)}
                    </td>
                    <td className="text-right py-2 px-2">
                      {formatCurrency(rep.financeData.pacContributions)}
                    </td>
                    <td className="text-right py-2 pl-2">
                      {rep.financeData.interestGroupMetrics?.grassrootsPercentage?.toFixed(1) ||
                        '0.0'}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
