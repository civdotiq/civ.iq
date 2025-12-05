/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useMemo } from 'react';
import { EnhancedFECData } from '@/types/fec';
import logger from '@/lib/logging/simple-logger';

interface FundraisingTrendsProps {
  data: EnhancedFECData;
  className?: string;
}

type ViewMode = 'timeline' | 'quarterly' | 'projections';

const VIEW_MODES = [
  { value: 'timeline' as const, label: 'Timeline', icon: '📈' },
  { value: 'quarterly' as const, label: 'Quarterly', icon: '📊' },
  { value: 'projections' as const, label: 'Projections', icon: '🔮' },
];

export function FundraisingTrends({ data, className = '' }: FundraisingTrendsProps) {
  const [activeView, setActiveView] = useState<ViewMode>('timeline');

  // Debug logging to check data structure
  logger.info('FundraisingTrends received data', {
    component: 'FundraisingTrends',
    metadata: {
      hasData: !!data,
      hasTimeline: !!data?.timeline,
      hasSummary: !!data?.summary,
      timelineLength: data?.timeline?.length || 0,
    },
  });

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getEfficiencyColor = (efficiency: number): string => {
    if (efficiency >= 80) return 'text-green-600';
    if (efficiency >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEfficiencyBackground = (efficiency: number): string => {
    if (efficiency >= 80) return 'bg-green-100';
    if (efficiency >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getTrendIndicator = (current: number, previous: number) => {
    if (previous === 0) return { icon: '→', color: 'text-gray-400' };
    const change = ((current - previous) / previous) * 100;
    if (change > 5) return { icon: '↗️', color: 'text-green-500' };
    if (change < -5) return { icon: '↘️', color: 'text-red-500' };
    return { icon: '→', color: 'text-gray-400' };
  };

  // RUNWAY_UNLIMITED constant for when burn rate is 0 or negative (not spending/raising more than spending)
  const RUNWAY_UNLIMITED = -1; // Use -1 to indicate unlimited, display as "∞"

  const calculateRunwayMonths = (cashOnHand: number, burnRate: number): number => {
    if (burnRate <= 0) return RUNWAY_UNLIMITED; // Campaign is not spending or raising more than spending
    return Math.floor(cashOnHand / burnRate);
  };

  // Helper to format runway display - shows "∞" for unlimited instead of a misleading number
  const formatRunway = (months: number): string => {
    if (months === RUNWAY_UNLIMITED) return '∞';
    return String(months);
  };

  // Helper for scenario runway - if base is unlimited, all scenarios are unlimited
  const formatScenarioRunway = (baseMonths: number, multiplier: number): string => {
    if (baseMonths === RUNWAY_UNLIMITED) return '∞';
    return String(Math.floor(baseMonths * multiplier));
  };

  const sortedTimeline = useMemo(() => {
    return [...data.timeline].sort((a, b) => {
      const aYear = parseInt(a.period);
      const bYear = parseInt(b.period);
      if (aYear !== bYear) return aYear - bYear;

      const aQuarter = parseInt(a.quarter.replace('Q', ''));
      const bQuarter = parseInt(b.quarter.replace('Q', ''));
      return aQuarter - bQuarter;
    });
  }, [data.timeline]);

  const maxAmount = useMemo(() => {
    return Math.max(...sortedTimeline.map(t => Math.max(t.raised, t.spent)));
  }, [sortedTimeline]);

  const renderTimelineView = () => {
    if (sortedTimeline.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No timeline data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-blue-50 p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600 text-lg">💰</span>
              <h4 className="font-semibold text-gray-900">Total Raised</h4>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.summary.totalRaised)}
            </div>
          </div>

          <div className="bg-red-50 p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-600 text-lg">💸</span>
              <h4 className="font-semibold text-gray-900">Total Spent</h4>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data.summary.totalSpent)}
            </div>
          </div>

          <div className="bg-green-50 p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600 text-lg">🏦</span>
              <h4 className="font-semibold text-gray-900">Cash on Hand</h4>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary.cashOnHand)}
            </div>
          </div>

          <div className={`p-4 border ${getEfficiencyBackground(data.summary.efficiency)}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚡</span>
              <h4 className="font-semibold text-gray-900">Efficiency</h4>
            </div>
            <div className={`text-2xl font-bold ${getEfficiencyColor(data.summary.efficiency)}`}>
              {formatPercent(data.summary.efficiency)}
            </div>
          </div>
        </div>

        {/* Timeline Chart */}
        <div className="bg-white p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Fundraising Timeline</h4>
          <div className="space-y-4">
            {sortedTimeline.map((period, index) => {
              const previous = index > 0 ? sortedTimeline[index - 1] : null;
              const raisedTrend = previous
                ? getTrendIndicator(period.raised, previous.raised)
                : null;
              const spentTrend = previous ? getTrendIndicator(period.spent, previous.spent) : null;

              return (
                <div
                  key={`${period.period}-${period.quarter}`}
                  className="border border-gray-200 p-4 bg-white"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium text-gray-900">
                        {period.period} {period.quarter}
                      </h5>
                      <span className="text-sm text-gray-500">
                        Net: {period.netChange >= 0 ? '+' : ''}
                        {formatCurrency(period.netChange)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Burn Rate: {formatCurrency(period.burnRate)}/month
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-sm">Raised:</span>
                        {raisedTrend && (
                          <span className={`text-sm ${raisedTrend.color}`}>{raisedTrend.icon}</span>
                        )}
                      </div>
                      <span className="font-medium text-green-600">
                        {formatCurrency(period.raised)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 text-sm">Spent:</span>
                        {spentTrend && (
                          <span className={`text-sm ${spentTrend.color}`}>{spentTrend.icon}</span>
                        )}
                      </div>
                      <span className="font-medium text-red-600">
                        {formatCurrency(period.spent)}
                      </span>
                    </div>
                  </div>

                  {/* Visual Bar Chart */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Raised</span>
                      <div className="flex items-center gap-2 flex-1 ml-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(period.raised / maxAmount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">
                          {formatPercent((period.raised / maxAmount) * 100)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Spent</span>
                      <div className="flex items-center gap-2 flex-1 ml-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(period.spent / maxAmount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">
                          {formatPercent((period.spent / maxAmount) * 100)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderQuarterlyView = () => {
    const quarterlyData = sortedTimeline.map((period, index) => {
      const previous = index > 0 ? sortedTimeline[index - 1] : null;
      const raisedGrowth =
        previous && previous.raised > 0
          ? ((period.raised - previous.raised) / previous.raised) * 100
          : 0;
      const spentGrowth =
        previous && previous.spent > 0
          ? ((period.spent - previous.spent) / previous.spent) * 100
          : 0;

      return {
        ...period,
        raisedGrowth,
        spentGrowth,
        efficiency: period.raised > 0 ? ((period.raised - period.spent) / period.raised) * 100 : 0,
      };
    });

    return (
      <div className="space-y-6">
        {/* Quarterly Performance Summary */}
        <div className="bg-white p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Quarterly Performance Summary</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(data.summary.quarterlyAverage)}
              </div>
              <div className="text-sm text-gray-500">Quarterly Average</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(data.summary.burnRate)}
              </div>
              <div className="text-sm text-gray-500">Average Burn Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatRunway(
                  calculateRunwayMonths(data.summary.cashOnHand, data.summary.burnRate)
                )}
              </div>
              <div className="text-sm text-gray-500">Months Runway</div>
            </div>
          </div>
        </div>

        {/* Quarterly Comparison Table */}
        <div className="bg-white border overflow-hidden">
          <div className="px-6 py-4 border-b bg-white">
            <h4 className="font-semibold text-gray-900">Quarterly Comparison</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Raised
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Growth
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Growth
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Efficiency
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quarterlyData.map((quarter, index) => (
                  <tr key={`${quarter.period}-${quarter.quarter}`} className="hover:bg-white">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {quarter.period} {quarter.quarter}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(quarter.raised)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {index > 0 && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            quarter.raisedGrowth >= 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {quarter.raisedGrowth >= 0 ? '+' : ''}
                          {quarter.raisedGrowth.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(quarter.spent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {index > 0 && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            quarter.spentGrowth >= 0
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {quarter.spentGrowth >= 0 ? '+' : ''}
                          {quarter.spentGrowth.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`font-medium ${
                          quarter.netChange >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {quarter.netChange >= 0 ? '+' : ''}
                        {formatCurrency(quarter.netChange)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${getEfficiencyColor(quarter.efficiency)}`}>
                        {formatPercent(quarter.efficiency)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectionsView = () => {
    const latestPeriod = sortedTimeline[sortedTimeline.length - 1];
    const runwayMonths = calculateRunwayMonths(data.summary.cashOnHand, data.summary.burnRate);

    // Simple projection based on current trends
    const avgQuarterlyRaised = data.summary.quarterlyAverage;
    const currentBurnRate = data.summary.burnRate;
    const projectedNextQuarter = avgQuarterlyRaised * 1.1; // 10% optimistic growth
    const projectedSpending = currentBurnRate * 3; // 3 months

    return (
      <div className="space-y-6">
        {/* Cash Flow Projections */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border">
          <h4 className="font-semibold text-gray-900 mb-4">Cash Flow Projections</h4>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-white p-4 border-2 border-black">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600 text-lg">📈</span>
                  <h5 className="font-medium text-gray-900">Next Quarter Projection</h5>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expected Raised:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(projectedNextQuarter)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expected Spent:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(projectedSpending)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm text-gray-600">Net Change:</span>
                    <span
                      className={`font-medium ${
                        projectedNextQuarter - projectedSpending >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {projectedNextQuarter - projectedSpending >= 0 ? '+' : ''}
                      {formatCurrency(projectedNextQuarter - projectedSpending)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 border-2 border-black">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-orange-600 text-lg">⏰</span>
                  <h5 className="font-medium text-gray-900">Runway Analysis</h5>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Current Runway:</span>
                    <span className="font-medium text-orange-600">
                      {formatRunway(runwayMonths)} months
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Monthly Burn:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(currentBurnRate)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span
                      className={`font-medium ${
                        runwayMonths === RUNWAY_UNLIMITED || runwayMonths > 6
                          ? 'text-green-600'
                          : runwayMonths > 3
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {runwayMonths === RUNWAY_UNLIMITED || runwayMonths > 6
                        ? 'Healthy'
                        : runwayMonths > 3
                          ? 'Caution'
                          : 'Critical'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 border-2 border-black">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-purple-600 text-lg">🎯</span>
                <h5 className="font-medium text-gray-900">Performance Targets</h5>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Fundraising Goal</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(avgQuarterlyRaised * 1.2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(((latestPeriod?.raised || 0) / (avgQuarterlyRaised * 1.2)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Current: {formatCurrency(latestPeriod?.raised || 0)}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Efficiency Target</span>
                    <span className="text-sm font-medium">75%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(data.summary.efficiency, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Current: {formatPercent(data.summary.efficiency)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scenario Analysis */}
        <div className="bg-white p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Scenario Analysis</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 border border-green-200">
              <h5 className="font-medium text-green-900 mb-2">Best Case</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Raised:</span>
                  <span className="font-medium">{formatCurrency(projectedNextQuarter * 1.3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Runway:</span>
                  <span className="font-medium">
                    {formatScenarioRunway(runwayMonths, 1.4)} months
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 border border-yellow-200">
              <h5 className="font-medium text-yellow-900 mb-2">Likely Case</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-yellow-700">Raised:</span>
                  <span className="font-medium">{formatCurrency(projectedNextQuarter)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-700">Runway:</span>
                  <span className="font-medium">{formatRunway(runwayMonths)} months</span>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 border border-red-200">
              <h5 className="font-medium text-red-900 mb-2">Worst Case</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-red-700">Raised:</span>
                  <span className="font-medium">{formatCurrency(projectedNextQuarter * 0.7)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700">Runway:</span>
                  <span className="font-medium">
                    {formatScenarioRunway(runwayMonths, 0.6)} months
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!data.timeline || data.timeline.length === 0) {
    return (
      <div className={`bg-white border-2 border-black border p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fundraising Trends</h3>
        <div className="text-center py-8 text-gray-500">
          <p>No fundraising data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border-2 border-black border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Fundraising Trends</h3>
          <p className="text-sm text-gray-600">Financial performance analysis and projections</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex space-x-1 mb-6 bg-white border-2 border-gray-300 p-1">
        {VIEW_MODES.map(mode => (
          <button
            key={mode.value}
            onClick={() => setActiveView(mode.value)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeView === mode.value
                ? 'bg-white text-gray-900 border-2 border-black'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>{mode.icon}</span>
            {mode.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeView === 'timeline' && renderTimelineView()}
      {activeView === 'quarterly' && renderQuarterlyView()}
      {activeView === 'projections' && renderProjectionsView()}
    </div>
  );
}
