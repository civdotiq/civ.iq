/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useResponsiveChartHeight } from '@/hooks/useResponsiveChartHeight';

interface DonationSource {
  name: string;
  value: number;
  color: string;
  description?: string;
  [key: string]: string | number | undefined; // Index signature for Recharts compatibility
}

interface DonationSourcesChartProps {
  data: {
    individual: number;
    pac: number;
    party: number;
    candidate: number;
  };
  totalRaised: number;
  loading?: boolean;
}

const COLORS = {
  individual: '#10b981', // green-500
  pac: '#f59e0b', // amber-500
  party: '#3b82f6', // blue-500
  candidate: '#8b5cf6', // violet-500
};

const DESCRIPTIONS = {
  individual: 'Contributions from individual donors (persons)',
  pac: 'Political Action Committee contributions',
  party: 'Political party committee contributions',
  candidate: 'Self-funding by the candidate',
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: DonationSource & { total: number };
  }>;
}

interface LegendProps {
  payload?: Array<{
    color: string;
    value: string;
  }>;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length && payload[0]) {
    const data = payload[0].payload;
    const percentage = ((data.value / data.total) * 100).toFixed(1);

    return (
      <div className="bg-white p-3 border border-gray-200 border-2 border-black">
        <p className="font-semibold text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600 mb-1">{data.description}</p>
        <p className="text-lg font-bold" style={{ color: data.color }}>
          ${data.value.toLocaleString()}
        </p>
        <p className="text-sm text-gray-500">{percentage}% of total raised</p>
      </div>
    );
  }
  return null;
};

const CustomLegend: React.FC<LegendProps> = ({ payload }) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload?.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: entry.color }} />
          <span className="text-sm text-gray-700">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export const DonationSourcesChart: React.FC<DonationSourcesChartProps> = ({
  data,
  totalRaised,
  loading = false,
}) => {
  // Responsive chart heights for mobile optimization
  const chartHeight300 = useResponsiveChartHeight(300, 250);

  // Loading state
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-64 bg-gray-100 rounded-full w-48 mx-auto mb-4"></div>
          <div className="flex justify-center gap-4">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for the chart, filtering out zero values
  const chartData: DonationSource[] = [
    {
      name: 'Individual',
      value: data.individual,
      color: COLORS.individual,
      description: DESCRIPTIONS.individual,
    },
    {
      name: 'PAC',
      value: data.pac,
      color: COLORS.pac,
      description: DESCRIPTIONS.pac,
    },
    {
      name: 'Party',
      value: data.party,
      color: COLORS.party,
      description: DESCRIPTIONS.party,
    },
    {
      name: 'Self-Funded',
      value: data.candidate,
      color: COLORS.candidate,
      description: DESCRIPTIONS.candidate,
    },
  ]
    .filter(item => item.value > 0)
    .map(item => ({ ...item, total: totalRaised }));

  // Handle case where there's no data
  if (chartData.length === 0 || totalRaised === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-white border-2 border-dashed border-gray-300">
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
          <h3 className="text-sm font-medium text-gray-900 mb-1">No funding data available</h3>
          <p className="text-sm text-gray-500">
            Donation source breakdown will appear when financial data is available
          </p>
        </div>
      </div>
    );
  }

  // If there's only one data source, show a full circle
  const innerRadius = chartData.length > 1 ? 60 : 0;
  const outerRadius = 120;

  return (
    <div className="bg-white border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Donation Sources</h3>

      <ResponsiveContainer width="100%" height={chartHeight300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={chartData.length > 1 ? 2 : 0}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Sources:</span>
            <span className="ml-2 font-semibold">{chartData.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Largest Source:</span>
            <span className="ml-2 font-semibold">
              {chartData.length > 0
                ? `${chartData.reduce((max, item) => (item.value > max.value ? item : max)).name}`
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
