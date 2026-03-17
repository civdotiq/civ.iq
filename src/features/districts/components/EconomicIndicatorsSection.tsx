/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import { TrendingUp, TrendingDown, Minus, BarChart3, AlertCircle, RefreshCw } from 'lucide-react';
import type { EconomicIndicatorsResponse, StateEconomicIndicator } from '@/types/fred';

interface EconomicIndicatorsSectionProps {
  districtId: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.json();
};

/**
 * Economic Indicators Section
 *
 * Displays state-level economic data from FRED (Federal Reserve Economic Data)
 * on the district page. Shows unemployment, GDP, personal income, and labor force.
 */
export function EconomicIndicatorsSection({ districtId }: EconomicIndicatorsSectionProps) {
  const { data, error, isLoading, mutate } = useSWR<EconomicIndicatorsResponse>(
    `/api/district/${districtId}/economic-indicators`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-4 sm:p-8 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 bg-gray-300"></div>
          <div className="h-5 w-48 bg-gray-300"></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-gray-200"></div>
          <div className="h-24 bg-gray-200"></div>
          <div className="h-24 bg-gray-200"></div>
          <div className="h-24 bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-black p-4 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-civiq-blue" />
          <h2 className="text-xl font-bold text-gray-900">Economic Indicators</h2>
        </div>
        <div className="text-center py-4">
          <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-3">Unable to load economic data</p>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-civiq-blue border border-blue-200 hover:bg-blue-50"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data available (no API key or no indicators returned)
  if (!data?.success || data.indicators.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-black p-4 sm:p-8">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-5 w-5 text-civiq-blue" />
        <h2 className="text-xl font-bold text-gray-900">Economic Indicators</h2>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        State-level economic data for {data.state} from the Federal Reserve (FRED)
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.indicators.map(indicator => (
          <IndicatorCard key={indicator.seriesId} indicator={indicator} />
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 mt-6 pt-3 border-t border-gray-100">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        <span>
          Source:{' '}
          <a
            href="https://fred.stlouisfed.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3ea2d4] hover:underline"
          >
            Federal Reserve Bank of St. Louis (FRED)
          </a>{' '}
          &middot; Updated{' '}
          {data.indicators[0]?.latestDate
            ? new Date(data.indicators[0].latestDate + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })
            : 'periodically'}
        </span>
      </div>
    </div>
  );
}

function IndicatorCard({ indicator }: { indicator: StateEconomicIndicator }) {
  const trend = indicator.changePercent;
  const isPositive = trend !== null && trend > 0;
  const isNegative = trend !== null && trend < 0;
  // For unemployment, down is good. For everything else, up is good.
  const isUnemployment =
    indicator.category === 'employment' && indicator.name.includes('Unemployment');
  const trendIsGood = isUnemployment ? isNegative : isPositive;
  const trendIsBad = isUnemployment ? isPositive : isNegative;

  return (
    <div className="border-2 border-gray-200 p-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {indicator.name}
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold text-gray-900">
          {indicator.latestValue !== null
            ? formatValue(indicator.latestValue, indicator.units)
            : 'N/A'}
        </span>
        <span className="text-xs text-gray-500">{indicator.units}</span>
      </div>

      {trend !== null && (
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp
              className={`w-3.5 h-3.5 ${trendIsGood ? 'text-[#0a9338]' : 'text-[#e11d07]'}`}
            />
          ) : isNegative ? (
            <TrendingDown
              className={`w-3.5 h-3.5 ${trendIsBad ? 'text-[#e11d07]' : 'text-[#0a9338]'}`}
            />
          ) : (
            <Minus className="w-3.5 h-3.5 text-gray-400" />
          )}
          <span
            className={`text-xs font-medium ${
              trendIsGood ? 'text-[#0a9338]' : trendIsBad ? 'text-[#e11d07]' : 'text-gray-500'
            }`}
          >
            {trend > 0 ? '+' : ''}
            {trend.toFixed(2)}%
          </span>
          <span className="text-xs text-gray-400">vs prior period</span>
        </div>
      )}

      {/* Sparkline */}
      {indicator.observations.length > 2 && (
        <div className="mt-3">
          <Sparkline observations={indicator.observations} units={indicator.units} />
        </div>
      )}
    </div>
  );
}

function Sparkline({
  observations,
  units,
}: {
  observations: StateEconomicIndicator['observations'];
  units: string;
}) {
  const values = observations.filter(o => o.value !== null).map(o => o.value as number);
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 200;
  const height = 32;
  const padding = 2;

  const points = values
    .map((val, i) => {
      const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-8"
      role="img"
      aria-label={`Trend chart showing ${units} over time`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="#3ea2d4"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatValue(value: number, units: string): string {
  if (units.toLowerCase().includes('percent') || units === '%') {
    return value.toFixed(1) + '%';
  }
  if (value >= 1_000_000_000) {
    return '$' + (value / 1_000_000_000).toFixed(1) + 'B';
  }
  if (value >= 1_000_000) {
    return '$' + (value / 1_000_000).toFixed(1) + 'M';
  }
  if (value >= 1_000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return value.toFixed(1);
}
