/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import type { ComparisonMetrics } from '@/types/campaign-finance';

interface ComparisonBarChartProps {
  label: string;
  amount: number;
  comparison: ComparisonMetrics;
  formatValue?: (value: number) => string;
  helpText?: string;
}

/**
 * Comparison bar chart showing actual vs. benchmark
 * Follows Otl Aicher design system with clean geometric visualization
 */
export function ComparisonBarChart({
  label,
  amount,
  comparison,
  formatValue = v => `$${(v / 1000000).toFixed(2)}M`,
  helpText,
}: ComparisonBarChartProps) {
  const maxValue = Math.max(amount, comparison.houseAverage) * 1.2;
  const actualWidth = maxValue > 0 ? (amount / maxValue) * 100 : 0;
  const benchmarkWidth = maxValue > 0 ? (comparison.houseAverage / maxValue) * 100 : 0;

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-medium text-neutral-900">
          {label}
          {helpText && (
            <span className="ml-2 text-xs text-neutral-500" title={helpText}>
              ⓘ
            </span>
          )}
        </div>
        <div className="text-sm font-semibold">{formatValue(amount)}</div>
      </div>

      <div className="relative mb-2 h-8">
        {/* Actual amount bar */}
        <div
          className="absolute left-0 top-0 h-full rounded bg-civiq-blue"
          style={{ width: `${actualWidth}%` }}
        />
        {/* Benchmark reference (dashed border) */}
        <div
          className="absolute left-0 top-0 h-full rounded border-2 border-dashed border-neutral-400"
          style={{ width: `${benchmarkWidth}%` }}
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-600">
        <span>House avg: {formatValue(comparison.houseAverage)}</span>
        <span className="font-medium">
          ({comparison.percentDifference > 0 ? '+' : ''}
          {comparison.percentDifference}%)
        </span>
      </div>
    </div>
  );
}
