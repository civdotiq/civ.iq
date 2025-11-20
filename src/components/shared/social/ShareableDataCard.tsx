/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { ShareTextButton } from './ShareButton';
import { ShareData, ShareSection } from '@/lib/social/share-utils';

interface ShareableDataCardProps {
  representative: {
    name: string;
    party: string;
    state: string;
    bioguideId: string;
    chamber?: 'House' | 'Senate';
    district?: string;
  };
  section: ShareSection;
  title: string;
  stats?: ShareData['stats'];
  children: React.ReactNode;
  className?: string;
}

/**
 * ShareableDataCard - Geometric card with integrated share functionality
 *
 * Ulm School / Rams design:
 * - Clean geometric container
 * - Data-focused content area
 * - Minimal share action at bottom
 * - No decorative elements
 */
export function ShareableDataCard({
  representative,
  section,
  title,
  stats,
  children,
  className = '',
}: ShareableDataCardProps) {
  const shareData: ShareData = {
    representative,
    section,
    stats,
  };

  return (
    <div
      className={`border-2 border-gray-300 bg-white ${className}`}
      id={section === 'overview' ? undefined : `${section}-card`}
    >
      {/* Card Header */}
      <div className="border-b-2 border-gray-300 px-6 py-4">
        <h3 className="text-lg font-bold text-black uppercase tracking-wide">{title}</h3>
      </div>

      {/* Card Content */}
      <div className="px-6 py-6">{children}</div>

      {/* Card Footer with Share Action */}
      <div className="border-t-2 border-gray-300 px-6 py-3 flex justify-end">
        <ShareTextButton data={shareData} />
      </div>
    </div>
  );
}

/**
 * ShareableStatRow - Single statistic row with label and value
 */
interface ShareableStatRowProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

export function ShareableStatRow({ label, value, trend, className = '' }: ShareableStatRowProps) {
  const trendIcon = trend
    ? {
        up: '↑',
        down: '↓',
        stable: '→',
      }[trend]
    : null;

  const trendColor = trend
    ? {
        up: 'text-civiq-green',
        down: 'text-civiq-red',
        stable: 'text-gray-600',
      }[trend]
    : '';

  return (
    <div
      className={`flex justify-between items-center py-2 border-b border-gray-200 last:border-0 ${className}`}
    >
      <span className="text-sm text-gray-700">{label}</span>
      <span className="text-base font-semibold text-black flex items-center gap-2">
        {value}
        {trendIcon && <span className={`text-xl ${trendColor}`}>{trendIcon}</span>}
      </span>
    </div>
  );
}

/**
 * ShareableHeroStat - Large hero statistic display
 */
interface ShareableHeroStatProps {
  value: string | number;
  label: string;
  sublabel?: string;
  className?: string;
}

export function ShareableHeroStat({
  value,
  label,
  sublabel,
  className = '',
}: ShareableHeroStatProps) {
  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="text-6xl font-bold text-black mb-2">{value}</div>
      <div className="text-base text-gray-700 uppercase tracking-wide">{label}</div>
      {sublabel && <div className="text-sm text-gray-500 mt-1">{sublabel}</div>}
    </div>
  );
}

/**
 * ShareableBarChart - Minimal horizontal bar chart
 */
interface ShareableBarChartProps {
  data: Array<{
    label: string;
    value: number;
    percentage?: number;
    color?: 'red' | 'green' | 'blue' | 'gray';
  }>;
  showPercentage?: boolean;
  className?: string;
}

export function ShareableBarChart({
  data,
  showPercentage = true,
  className = '',
}: ShareableBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className={`space-y-3 ${className}`}>
      {data.map((item, index) => {
        const widthPercent = (item.value / maxValue) * 100;
        const displayPercent = item.percentage !== undefined ? item.percentage : widthPercent;

        const colorClass = {
          red: 'bg-civiq-red',
          green: 'bg-civiq-green',
          blue: 'bg-civiq-blue',
          gray: 'bg-gray-400',
        }[item.color || 'gray'];

        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-gray-700">{item.label}</span>
              {showPercentage && (
                <span className="font-semibold text-black">{displayPercent.toFixed(0)}%</span>
              )}
            </div>
            <div className="h-8 bg-gray-200 relative">
              <div
                className={`h-full ${colorClass} transition-all duration-300`}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
