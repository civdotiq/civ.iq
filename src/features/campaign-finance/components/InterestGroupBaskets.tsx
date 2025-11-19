/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useMemo } from 'react';
import {
  categorizeIntoBaskets,
  getInterestGroupMetrics,
  formatCurrency,
} from '@/lib/fec/interest-groups';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useResponsiveChartHeight } from '@/hooks/useResponsiveChartHeight';

interface InterestGroupBasketsProps {
  contributions: Array<{
    contributor_employer?: string;
    contributor_occupation?: string;
    contribution_receipt_amount: number;
    contributor_name?: string;
  }>;
  candidateContributions?: number;
  showMetrics?: boolean;
  showChart?: boolean;
  showTable?: boolean;
}

/**
 * Interest Group Baskets Component
 *
 * Displays campaign contributions categorized into citizen-friendly interest groups.
 * Provides clear visualization of "who's funding this representative?"
 */
export function InterestGroupBaskets({
  contributions,
  candidateContributions = 0,
  showMetrics = true,
  showChart = true,
  showTable = true,
}: InterestGroupBasketsProps) {
  // Responsive chart heights for mobile optimization
  const chartHeight300 = useResponsiveChartHeight(300, 250);

  // Categorize contributions into interest group baskets
  const baskets = useMemo(
    () => categorizeIntoBaskets(contributions, candidateContributions),
    [contributions, candidateContributions]
  );

  // Calculate metrics
  const metrics = useMemo(() => getInterestGroupMetrics(baskets), [baskets]);

  // Prepare chart data
  const chartData = baskets.map(basket => ({
    name: basket.basket,
    value: basket.totalAmount,
    color: basket.color,
    icon: basket.icon,
  }));

  if (baskets.length === 0) {
    return (
      <div className="aicher-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Interest Group Analysis</h3>
        <div className="text-center py-8 text-gray-500">
          <p>No contribution data available for analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      {showMetrics && (
        <div className="aicher-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Funding Diversity Metrics</h3>
          <div className="aicher-grid aicher-grid-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Top Interest Group</div>
              <div className="text-xl font-bold text-gray-900">
                {metrics.topInfluencer ? (
                  <>
                    {baskets.find(b => b.basket === metrics.topInfluencer)?.icon}{' '}
                    {metrics.topInfluencer}
                  </>
                ) : (
                  'N/A'
                )}
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Grassroots Funding</div>
              <div className="text-xl font-bold text-green-700">
                {metrics.grassrootsPercentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Small donors ≤ $200</div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Funding Diversity</div>
              <div className="text-xl font-bold text-blue-700">{metrics.diversityScore}/100</div>
              <div className="text-xs text-gray-500">
                {metrics.diversityScore >= 70
                  ? 'Very diverse'
                  : metrics.diversityScore >= 50
                    ? 'Moderate'
                    : 'Concentrated'}
              </div>
            </div>
          </div>

          {metrics.corporatePercentage > 0 && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-sm text-orange-800">
                <strong>{metrics.corporatePercentage.toFixed(1)}%</strong> from corporate interests
                (Big Tech, Wall Street, Healthcare, Energy, Defense, etc.)
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Chart */}
      {showChart && (
        <div className="aicher-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Interest Group Contributions</h3>

          <div className="aicher-grid aicher-grid-2 gap-6">
            {/* Pie Chart */}
            <div>
              <ResponsiveContainer width="100%" height={chartHeight300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={props => {
                      const { percent, icon } = props as {
                        name?: string;
                        percent?: number;
                        icon?: string;
                      };
                      return percent && percent > 0.05
                        ? `${icon || ''} ${(percent * 100).toFixed(0)}%`
                        : '';
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => {
                      const entry = props.payload;
                      return [
                        `${formatCurrency(Number(value))} (${((Number(value) / baskets.reduce((sum, b) => sum + b.totalAmount, 0)) * 100).toFixed(1)}%)`,
                        `${entry.icon || ''} ${name}`,
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
                {baskets.slice(0, 8).map(basket => (
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
                      <div className="text-xs text-gray-500">{basket.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Table */}
      {showTable && (
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
                {baskets.map(basket => (
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
                          <div className="text-xs text-gray-500">{basket.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(basket.totalAmount)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{basket.percentage.toFixed(1)}%</div>
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
      )}
    </div>
  );
}
