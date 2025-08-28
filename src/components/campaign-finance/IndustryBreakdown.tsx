/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
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
  Legend,
} from 'recharts';
import { DataQualityIndicator, type DataQualityMetric } from './DataQualityIndicator';

interface IndustryData {
  industry: string;
  amount: number;
  percentage: number;
  count?: number;
  description?: string;
}

interface IndustryBreakdownProps {
  data: IndustryData[];
  dataQuality: DataQualityMetric;
  totalRaised: number;
  loading?: boolean;
}

// Industry sector colors for consistent theming
const INDUSTRY_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
  '#6b7280', // gray-500
];

// Industry descriptions for better understanding
const INDUSTRY_DESCRIPTIONS: Record<string, string> = {
  'Finance/Insurance/Real Estate': 'Banking, insurance companies, real estate developers',
  Health: 'Healthcare providers, pharmaceutical companies, medical device manufacturers',
  'Communications/Electronics':
    'Telecommunications, technology companies, electronics manufacturers',
  'Energy/Natural Resources': 'Oil & gas, renewable energy, mining, utilities',
  Transportation: 'Airlines, shipping, automotive, logistics companies',
  Agribusiness: 'Agriculture, food processing, farming organizations',
  Construction: 'Construction companies, building materials, infrastructure',
  Defense: 'Defense contractors, aerospace, military suppliers',
  Education: 'Educational institutions, training organizations',
  Labor: 'Labor unions, worker organizations',
  'Lawyers/Lobbyists': 'Law firms, lobbying organizations, legal services',
  'Miscellaneous Business': 'Various business sectors not otherwise categorized',
  'Ideology/Single Issue': 'Advocacy groups, political organizations, single-issue groups',
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: IndustryData & { color?: string };
  }>;
  label?: string;
}

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: IndustryData & { color?: string };
  }>;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length && payload[0]) {
    const data = payload[0].payload;
    const description = INDUSTRY_DESCRIPTIONS[data.industry] || 'Industry sector';

    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
        <p className="font-semibold text-gray-900 mb-1">{data.industry}</p>
        <p className="text-xs text-gray-600 mb-2">{description}</p>
        <p className="text-lg font-bold text-blue-600">${data.amount.toLocaleString()}</p>
        <p className="text-sm text-gray-500">{data.percentage.toFixed(1)}% of total</p>
        {data.count && <p className="text-xs text-gray-400 mt-1">{data.count} contributions</p>}
      </div>
    );
  }
  return null;
};

const PieTooltip: React.FC<PieTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length && payload[0]) {
    const data = payload[0].payload;
    const description = INDUSTRY_DESCRIPTIONS[data.industry] || 'Industry sector';

    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
        <p className="font-semibold text-gray-900 mb-1">{data.industry}</p>
        <p className="text-xs text-gray-600 mb-2">{description}</p>
        <p className="text-lg font-bold" style={{ color: data.color }}>
          ${data.amount.toLocaleString()}
        </p>
        <p className="text-sm text-gray-500">{data.percentage.toFixed(1)}% of total</p>
      </div>
    );
  }
  return null;
};

export const IndustryBreakdown: React.FC<IndustryBreakdownProps> = ({
  data,
  dataQuality,
  loading = false,
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'pie'>('chart');

  // Determine data quality level for adaptive rendering
  const completenessPercentage = dataQuality.completenessPercentage;

  // Filter and prepare data - show top 10 industries
  const chartData = data
    .filter(item => item.amount > 0)
    .slice(0, 10)
    .map((item, index) => ({
      ...item,
      color: INDUSTRY_COLORS[index % INDUSTRY_COLORS.length],
      // Truncate long industry names for chart display
      displayName:
        item.industry.length > 25 ? `${item.industry.substring(0, 25)}...` : item.industry,
    }));

  // Calculate summary statistics
  const topIndustry = chartData[0];
  const industrialConcentration = chartData
    .slice(0, 3)
    .reduce((sum, item) => sum + item.percentage, 0);
  const diversificationScore = chartData.length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  // Adaptive rendering based on data quality
  if (completenessPercentage < 30) {
    // Very low quality: Show only data quality indicator and message
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Industry Funding Breakdown</h3>
        <DataQualityIndicator metric={dataQuality} dataType="industry" className="mb-4" />
        <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <svg
                className="mx-auto h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              Industry data is too incomplete to generate a meaningful analysis
            </h4>
            <p className="text-sm text-gray-500">
              More detailed employer information needed for industry breakdown
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Industry Funding Breakdown</h3>
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">No industry data available</h4>
            <p className="text-sm text-gray-500">
              Industry breakdown will appear when data is available
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Data Quality Indicator */}
      <DataQualityIndicator metric={dataQuality} dataType="industry" className="mb-6" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Industry Funding Breakdown</h3>
        {completenessPercentage > 70 ? (
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'chart'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Bar Chart
            </button>
            <button
              onClick={() => setViewMode('pie')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'pie'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pie Chart
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Bar Chart Only (Limited Data Quality)</div>
        )}
      </div>

      {/* Chart Display */}
      <div className="mb-6">
        {viewMode === 'chart' || completenessPercentage <= 70 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="displayName"
                angle={-45}
                textAnchor="end"
                height={120}
                fontSize={11}
                interval={0}
              />
              <YAxis tickFormatter={value => `$${(value / 1000).toFixed(0)}k`} fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={140}
                paddingAngle={2}
                dataKey="amount"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value: string) =>
                  value.length > 20 ? `${value.substring(0, 20)}...` : value
                }
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-1">Top Industry</h4>
          <p className="text-sm text-blue-700 mb-2">{topIndustry ? topIndustry.industry : 'N/A'}</p>
          <p className="text-lg font-bold text-blue-800">
            {topIndustry ? `${topIndustry.percentage.toFixed(1)}%` : '0%'}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 mb-1">Top 3 Concentration</h4>
          <p className="text-sm text-green-700 mb-2">Combined share of funding</p>
          <p className="text-lg font-bold text-green-800">{industrialConcentration.toFixed(1)}%</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-1">Diversification</h4>
          <p className="text-sm text-purple-700 mb-2">Number of funding sectors</p>
          <p className="text-lg font-bold text-purple-800">{diversificationScore} sectors</p>
        </div>
      </div>

      {/* Detailed List */}
      <div>
        <h4 className="font-medium text-gray-800 mb-3">Detailed Breakdown</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {chartData.map(industry => (
            <div
              key={industry.industry}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-4 h-4 rounded flex-shrink-0"
                  style={{ backgroundColor: industry.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{industry.industry}</p>
                  <p className="text-xs text-gray-500">
                    {INDUSTRY_DESCRIPTIONS[industry.industry] || 'Industry sector'}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-medium text-gray-900">${industry.amount.toLocaleString()}</p>
                <p className="text-sm text-gray-500">{industry.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Insights */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="font-medium text-gray-800 mb-3">Key Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {industrialConcentration > 60 && (
            <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
              <span className="text-yellow-500 text-xs mt-1">⚠️</span>
              <span className="text-sm text-yellow-800">
                High concentration: Top 3 industries provide {industrialConcentration.toFixed(0)}%
                of funding
              </span>
            </div>
          )}
          {diversificationScore > 8 && (
            <div className="flex items-start gap-2 p-2 bg-green-50 rounded">
              <span className="text-green-500 text-xs mt-1">✅</span>
              <span className="text-sm text-green-800">
                Well-diversified funding across {diversificationScore} different sectors
              </span>
            </div>
          )}
          {topIndustry && topIndustry.percentage > 30 && (
            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded">
              <span className="text-blue-500 text-xs mt-1">📊</span>
              <span className="text-sm text-blue-800">
                {topIndustry.industry} is the dominant funding source at{' '}
                {topIndustry.percentage.toFixed(0)}%
              </span>
            </div>
          )}
          {industrialConcentration < 40 && diversificationScore > 6 && (
            <div className="flex items-start gap-2 p-2 bg-purple-50 rounded">
              <span className="text-purple-500 text-xs mt-1">🎯</span>
              <span className="text-sm text-purple-800">
                Balanced funding distribution across multiple industries
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
