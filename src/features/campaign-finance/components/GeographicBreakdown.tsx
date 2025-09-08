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

interface GeographicData {
  state: string;
  stateName: string;
  amount: number;
  percentage: number;
  count?: number;
  isHomeState?: boolean;
}

interface GeographicBreakdownProps {
  data: GeographicData[];
  dataQuality: DataQualityMetric;
  totalRaised: number;
  representativeState?: string;
  loading?: boolean;
}

// State colors for consistent theming
const STATE_COLORS = [
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

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: GeographicData & { color?: string };
  }>;
  label?: string;
}

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: GeographicData & { color?: string };
  }>;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length && payload[0]) {
    const data = payload[0].payload;

    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
        <p className="font-semibold text-gray-900 mb-1">{data.stateName}</p>
        {data.isHomeState && (
          <p className="text-xs text-blue-600 font-medium mb-2">🏠 Home State</p>
        )}
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

    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
        <p className="font-semibold text-gray-900 mb-1">{data.stateName}</p>
        {data.isHomeState && (
          <p className="text-xs text-blue-600 font-medium mb-2">🏠 Home State</p>
        )}
        <p className="text-lg font-bold" style={{ color: data.color }}>
          ${data.amount.toLocaleString()}
        </p>
        <p className="text-sm text-gray-500">{data.percentage.toFixed(1)}% of total</p>
      </div>
    );
  }
  return null;
};

export const GeographicBreakdown: React.FC<GeographicBreakdownProps> = ({
  data,
  dataQuality,
  representativeState,
  loading = false,
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'pie'>('chart');

  // Determine data quality level for adaptive rendering
  const completenessPercentage = dataQuality.completenessPercentage;

  // Filter and prepare data - show top 10 states
  const chartData = data
    .filter(item => item.amount > 0)
    .slice(0, 10)
    .map((item, index) => ({
      ...item,
      color: STATE_COLORS[index % STATE_COLORS.length],
      // Truncate long state names for chart display (though state names are typically short)
      displayName:
        item.stateName.length > 15 ? `${item.stateName.substring(0, 15)}...` : item.stateName,
    }));

  // Calculate summary statistics
  const homeStateData = chartData.find(item => item.isHomeState);
  const outOfStatePercentage = chartData
    .filter(item => !item.isHomeState)
    .reduce((sum, item) => sum + item.percentage, 0);
  const stateCount = chartData.length;

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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Funding Sources</h3>
        <DataQualityIndicator metric={dataQuality} dataType="geography" className="mb-4" />
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
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              Geographic data is too incomplete to generate a meaningful analysis
            </h4>
            <p className="text-sm text-gray-500">
              More detailed location information needed for geographic breakdown
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Funding Sources</h3>
        <DataQualityIndicator metric={dataQuality} dataType="geography" className="mb-4" />
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
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">No geographic data available</h4>
            <p className="text-sm text-gray-500">
              Geographic breakdown will appear when data is available
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Data Quality Indicator */}
      <DataQualityIndicator metric={dataQuality} dataType="geography" className="mb-6" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Geographic Funding Sources</h3>
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
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="displayName"
                angle={-45}
                textAnchor="end"
                height={100}
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
          <h4 className="font-medium text-blue-900 mb-1">Home State</h4>
          <p className="text-sm text-blue-700 mb-2">{representativeState || 'N/A'}</p>
          <p className="text-lg font-bold text-blue-800">
            {homeStateData ? `${homeStateData.percentage.toFixed(1)}%` : '0%'}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-900 mb-1">Out-of-State</h4>
          <p className="text-sm text-green-700 mb-2">Non-home state funding</p>
          <p className="text-lg font-bold text-green-800">{outOfStatePercentage.toFixed(1)}%</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-1">Geographic Reach</h4>
          <p className="text-sm text-purple-700 mb-2">States contributing</p>
          <p className="text-lg font-bold text-purple-800">{stateCount} states</p>
        </div>
      </div>

      {/* Detailed List */}
      <div>
        <h4 className="font-medium text-gray-800 mb-3">State-by-State Breakdown</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {chartData.map(state => (
            <div
              key={state.state}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-4 h-4 rounded flex-shrink-0"
                  style={{ backgroundColor: state.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate flex items-center gap-2">
                    {state.stateName}
                    {state.isHomeState && <span className="text-blue-600 text-sm">🏠</span>}
                  </p>
                  <p className="text-xs text-gray-500">{state.state}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-medium text-gray-900">${state.amount.toLocaleString()}</p>
                <p className="text-sm text-gray-500">{state.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Insights */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="font-medium text-gray-800 mb-3">Key Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {homeStateData && homeStateData.percentage > 60 && (
            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded">
              <span className="text-blue-500 text-xs mt-1">🏠</span>
              <span className="text-sm text-blue-800">
                Strong home state support: {homeStateData.percentage.toFixed(0)}% of funding from{' '}
                {representativeState}
              </span>
            </div>
          )}
          {outOfStatePercentage > 50 && (
            <div className="flex items-start gap-2 p-2 bg-green-50 rounded">
              <span className="text-green-500 text-xs mt-1">🌎</span>
              <span className="text-sm text-green-800">
                National appeal: {outOfStatePercentage.toFixed(0)}% of funding from out-of-state
              </span>
            </div>
          )}
          {stateCount > 15 && (
            <div className="flex items-start gap-2 p-2 bg-purple-50 rounded">
              <span className="text-purple-500 text-xs mt-1">📊</span>
              <span className="text-sm text-purple-800">
                Broad geographic base: Contributions from {stateCount} states
              </span>
            </div>
          )}
          {homeStateData && homeStateData.percentage < 30 && outOfStatePercentage > 70 && (
            <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
              <span className="text-yellow-500 text-xs mt-1">⚠️</span>
              <span className="text-sm text-yellow-800">
                Limited home state support: Only {homeStateData.percentage.toFixed(0)}% from{' '}
                {representativeState}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeographicBreakdown;
