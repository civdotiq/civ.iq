# SESSION 1: Data Layer & Core Components

## Goal

Implement comparison metrics system and reusable UI components for campaign finance redesign.

## Prerequisites

```bash
git checkout -b feat/campaign-finance-ux-session-1
npm run validate:all
```

## Step 1: Add Comparison Types

**File**: `src/types/finance.ts`

```typescript
export interface ComparisonMetrics {
  houseAverage: number;
  partyAverage: number;
  percentileRank: number;
  percentDifference: number;
  outlierStatus: 'normal' | 'high' | 'low' | 'extreme';
}

export interface FundraisingSourceWithComparison {
  category: string;
  amount: number;
  percentage: number;
  comparison: ComparisonMetrics;
  contributorCount?: number;
}

export interface EnhancedFinancialSummary extends FECFinancialData {
  totalRaisedComparison: ComparisonMetrics;
  selfFinancingComparison: ComparisonMetrics;
  fundraisingSources: FundraisingSourceWithComparison[];
  keyInsights: string[];
  lastUpdated: string;
  dataSource: 'FEC';
}
```

**Validate**: `npm run type-check && git commit -m "feat(finance): add comparison types"`

## Step 2: Create Comparison Service

**File**: `src/lib/services/finance-comparisons.ts`

```typescript
import type { ComparisonMetrics } from '@/types/finance';

const HOUSE_DEMOCRAT_AVERAGES = {
  totalRaised: 1_350_000,
  selfFinancing: 458_000,
  individualContributions: 892_000,
  pacContributions: 634_000,
  smallDonations: 124_000,
};

const HOUSE_REPUBLICAN_AVERAGES = {
  totalRaised: 1_180_000,
  selfFinancing: 520_000,
  individualContributions: 720_000,
  pacContributions: 580_000,
  smallDonations: 98_000,
};

export function calculateComparison(
  actualAmount: number,
  party: 'Democrat' | 'Republican' | 'Independent',
  metric: keyof typeof HOUSE_DEMOCRAT_AVERAGES
): ComparisonMetrics {
  const averages = party === 'Republican' ? HOUSE_REPUBLICAN_AVERAGES : HOUSE_DEMOCRAT_AVERAGES;

  const benchmark = averages[metric] || 0;
  const percentDifference = benchmark > 0 ? ((actualAmount - benchmark) / benchmark) * 100 : 0;

  const percentileRank = 50 + percentDifference / 10;

  let outlierStatus: ComparisonMetrics['outlierStatus'] = 'normal';
  if (Math.abs(percentDifference) > 500) outlierStatus = 'extreme';
  else if (Math.abs(percentDifference) > 100) {
    outlierStatus = percentDifference > 0 ? 'high' : 'low';
  }

  return {
    houseAverage: benchmark,
    partyAverage: benchmark,
    percentileRank: Math.max(0, Math.min(100, percentileRank)),
    percentDifference: Math.round(percentDifference),
    outlierStatus,
  };
}

export function generateInsights(data: any, party: string): string[] {
  const insights: string[] = [];

  if (data.selfFinancing > data.totalRaised * 0.5) {
    const pct = Math.round((data.selfFinancing / data.totalRaised) * 100);
    insights.push(`Self-funded ${pct}% of campaign`);
  }

  return insights;
}
```

**Validate**: `npm run type-check && git commit -m "feat(finance): add comparison service"`

## Step 3: Comparison Bar Chart Component

**File**: `src/features/campaign-finance/components/ComparisonBarChart.tsx`

```typescript
'use client';

import React from 'react';
import type { ComparisonMetrics } from '@/types/finance';

interface ComparisonBarChartProps {
  label: string;
  amount: number;
  comparison: ComparisonMetrics;
  formatValue?: (value: number) => string;
}

export function ComparisonBarChart({
  label,
  amount,
  comparison,
  formatValue = (v) => `$${(v / 1000000).toFixed(2)}M`
}: ComparisonBarChartProps) {
  const maxValue = Math.max(amount, comparison.houseAverage) * 1.2;
  const actualWidth = (amount / maxValue) * 100;
  const benchmarkWidth = (comparison.houseAverage / maxValue) * 100;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-neutral-900">{label}</div>
        <div className="text-sm font-semibold">{formatValue(amount)}</div>
      </div>

      <div className="relative h-8 mb-2">
        <div
          className="absolute top-0 left-0 h-full bg-civiq-blue rounded"
          style={{ width: `${actualWidth}%` }}
        />
        <div
          className="absolute top-0 left-0 h-full border-2 border-dashed border-neutral-400 rounded"
          style={{ width: `${benchmarkWidth}%` }}
        />
      </div>

      <div className="text-xs text-neutral-600">
        House avg: {formatValue(comparison.houseAverage)} •{' '}
        {comparison.percentDifference > 0 ? '+' : ''}
        {comparison.percentDifference}%
      </div>
    </div>
  );
}
```

**Validate**: `npm run lint && git commit -m "feat(finance): add comparison bar chart"`

## Step 4: Sortable Table Component

**File**: `src/features/campaign-finance/components/SortableDataTable.tsx`

```typescript
'use client';

import React, { useState, useMemo } from 'react';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  format?: (value: any) => React.ReactNode;
}

interface SortableDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  defaultSortKey?: keyof T;
  showInitially?: number;
  title?: string;
}

export function SortableDataTable<T extends Record<string, any>>({
  data,
  columns,
  defaultSortKey,
  showInitially = 5,
  title
}: SortableDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | undefined>(defaultSortKey);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAll, setShowAll] = useState(false);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortKey, sortDirection]);

  const displayedData = showAll ? sortedData : sortedData.slice(0, showInitially);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      )}

      <table className="w-full">
        <thead className="bg-neutral-50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`px-6 py-3 text-left text-xs font-medium uppercase ${
                  col.sortable !== false ? 'cursor-pointer hover:bg-neutral-100' : ''
                }`}
                onClick={() => col.sortable !== false && handleSort(col.key)}
              >
                {col.label}
                {col.sortable !== false && sortKey === col.key && (
                  <span className="ml-2">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {displayedData.map((row, idx) => (
            <tr key={idx} className="hover:bg-neutral-50">
              {columns.map((col) => (
                <td key={String(col.key)} className="px-6 py-4 text-sm">
                  {col.format ? col.format(row[col.key]) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {data.length > showInitially && (
        <div className="px-6 py-4 border-t">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-civiq-blue text-sm font-medium"
          >
            ⚙️ {showAll ? 'Show less' : `Show all ${data.length}`}
          </button>
        </div>
      )}
    </div>
  );
}
```

**Validate**: `npm run lint && git commit -m "feat(finance): add sortable table"`

## Final Session Validation

```bash
npm run validate:all
git log --oneline -5
```

## Next: SESSION 2

Build section components (FundraisingSources, TopIndustries, TopContributors)
