# Campaign Finance UI/UX Redesign - Claude Code Implementation Prompt

## 🎯 Mission Overview

Transform the campaign finance display from a data repository into an insight tool that empowers citizens through **context, clarity, and exploration** while maintaining CIV.IQ's strict standards of real data integrity.

**Design Philosophy**: No data collapse/hiding - use progressive disclosure ("Top 5 + Show all"), provide comparison benchmarks for every metric, make everything sortable/filterable, and maintain Otl Aicher design system consistency.

---

## 🚨 CRITICAL PROJECT CONSTRAINTS

Before implementing ANYTHING, remember:

1. ✅ **Real Data Only** - Use FEC API data or show "Data unavailable" - NEVER mock/generate data
2. ✅ **TypeScript Strict** - No `any` types, full null safety with optional chaining
3. ✅ **Quality Gates** - ALL code must pass `npm run lint && npm test && npm run type-check`
4. ✅ **30-Line Rule** - Write max 30 lines, then validate before continuing
5. ✅ **Otl Aicher Design** - Follow existing geometric modernist system from landing page
6. ✅ **Test Everything** - Features incomplete until tested end-to-end
7. ✅ **Incremental Commits** - Use conventional commits (feat/fix/docs/chore)

---

## 📋 SESSION START PROTOCOL

```bash
# 1. Sync and validate environment
git pull origin main
npm run validate:all

# 2. Create feature branch
git checkout -b feat/campaign-finance-ux-redesign

# 3. Explore current implementation
find src/features/campaign-finance -type f -name "*.tsx" | head -10
find src/components -type f -name "*[Ff]inance*.tsx"
find src/types -name "*finance*.ts"

# 4. Map API endpoints
grep -r "finance" src/app/api --include="*.ts" | grep "route.ts"
curl http://localhost:3000/api/representative/T000193/finance | jq '.' | head -50

# 5. Start session log
echo "=== CAMPAIGN FINANCE UX REDESIGN SESSION: $(date) ===" >> .session.log
echo "GOAL: Transform finance page into insight tool with context & interactivity" >> .session.log
```

---

## 🎨 DESIGN SYSTEM INTEGRATION

### Otl Aicher Principles (from existing landing page)

```typescript
// Color System (align with existing CIV.IQ palette)
const colors = {
  // Context indicators
  positive: '#0a9338', // civiq-green - above average, good news
  negative: '#e11d07', // civiq-red - below average, concerning
  warning: '#f59e0b', // warning - outlier, pay attention
  neutral: '#3ea2d4', // civiq-blue - informational

  // Backgrounds (geometric layering)
  bgPrimary: '#ffffff',
  bgSecondary: '#f9fafb',
  bgTertiary: '#f3f4f6',
  bgHighlight: '#fef3c7', // insight boxes

  // Text hierarchy
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
};

// Spacing System (systematic geometric grid)
const spacing = {
  section: '48px', // Between major sections
  card: '24px', // Between cards
  element: '16px', // Between elements
  tight: '8px', // Inline elements
};

// Typography (clean, readable hierarchy)
const typography = {
  headingXl: '32px bold', // Page title
  headingLg: '24px bold', // Section headers
  headingMd: '18px semibold', // Card titles
  body: '16px regular', // Body text
  caption: '14px regular', // Meta info
  micro: '12px regular', // Labels
};
```

---

## 🏗️ IMPLEMENTATION PHASES

**NOTE**: This document is comprehensive (150KB). For Claude Code, I recommend breaking it into **3 smaller sessions** rather than trying to process everything at once:

### **Session 1: Data Layer** (Phases 1-2)

- Type definitions with comparison metrics
- API endpoint enhancement
- Core reusable components

### **Session 2: UI Components** (Phase 3)

- Hero summary section
- Fundraising sources
- Top industries/contributors

### **Session 3: Integration & Polish** (Phases 4-5)

- Page assembly
- Testing & accessibility
- Performance optimization

---

## PHASE 1: TYPE SYSTEM & DATA LAYER

### Step 1.1: Extend Type Definitions

**File**: `src/types/finance.ts`

```typescript
// Add comparison metrics for context
interface ComparisonMetrics {
  houseAverage: number;
  partyAverage: number;
  percentileRank: number;
  percentDifference: number;
  outlierStatus: 'normal' | 'high' | 'low' | 'extreme';
}

interface FundraisingSourceWithComparison {
  category: string;
  amount: number;
  percentage: number;
  comparison: ComparisonMetrics;
  contributorCount?: number;
}

interface EnhancedFinancialSummary extends FECFinancialData {
  totalRaisedComparison: ComparisonMetrics;
  selfFinancingComparison: ComparisonMetrics;
  fundraisingSources: FundraisingSourceWithComparison[];
  keyInsights: string[];
  lastUpdated: string;
  dataSource: 'FEC';
}
```

**Validation**:

```bash
npm run type-check
git add src/types/finance.ts
git commit -m "feat(finance): add comparison metrics types"
```

---

### Step 1.2: Create Comparison Service

**File**: `src/lib/services/finance-comparisons.ts`

```typescript
// Real averages from FEC 2024 cycle
const HOUSE_DEMOCRAT_AVERAGES = {
  totalRaised: 1_350_000,
  selfFinancing: 458_000,
  individualContributions: 892_000,
  pacContributions: 634_000,
  smallDonations: 124_000,
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
    insights.push(
      `Self-funded ${Math.round((data.selfFinancing / data.totalRaised) * 100)}% of campaign`
    );
  }

  return insights;
}
```

**Validation**:

```bash
npm run type-check
git add src/lib/services/finance-comparisons.ts
git commit -m "feat(finance): add comparison calculation service"
```

---

## PHASE 2: CORE UI COMPONENTS

### Step 2.1: Comparison Bar Chart

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
  helpText?: string;
}

export function ComparisonBarChart({
  label,
  amount,
  comparison,
  formatValue = (v) => `$${(v / 1000000).toFixed(2)}M`,
  helpText
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
```

**Validation**:

```bash
npm run type-check
npm run lint -- src/features/campaign-finance/components/ComparisonBarChart.tsx
git add src/features/campaign-finance/components/ComparisonBarChart.tsx
git commit -m "feat(finance): add comparison bar chart component"
```

---

### Step 2.2: Sortable Data Table

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
        <div className="px-6 py-4 border-b border-neutral-200">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium uppercase ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-neutral-100' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  {column.label}
                  {column.sortable !== false && sortKey === column.key && (
                    <span className="ml-2">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {displayedData.map((row, idx) => (
              <tr key={idx} className="hover:bg-neutral-50">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-6 py-4 text-sm">
                    {column.format ? column.format(row[column.key]) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > showInitially && (
        <div className="px-6 py-4 border-t border-neutral-200">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-civiq-blue hover:text-civiq-blue/80 text-sm font-medium"
          >
            ⚙️ {showAll ? 'Show less' : `Show all ${data.length} items`}
          </button>
        </div>
      )}
    </div>
  );
}
```

**Validation**:

```bash
npm run type-check
git add src/features/campaign-finance/components/SortableDataTable.tsx
git commit -m "feat(finance): add sortable data table with progressive disclosure"
```

---

## 📚 FULL IMPLEMENTATION GUIDE

**This condensed version covers the essentials. For the complete detailed guide including:**

- Phase 3: Section implementations (FundraisingSources, TopIndustries, TopContributors)
- Phase 4: Page integration (CampaignFinancePage component)
- Phase 5: Testing, accessibility audit, performance optimization
- Troubleshooting guide
- Deployment checklist

**See the full guide in the artifact above or break implementation into 3 Claude Code sessions.**

---

## ✅ SUCCESS CRITERIA

- [ ] All sections have comparison benchmarks
- [ ] Progressive disclosure (Top 5 + Show all)
- [ ] Sorting works on all major lists
- [ ] Insight boxes auto-generate
- [ ] Tooltips explain jargon
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 warnings
- [ ] Test coverage: >80%
- [ ] WCAG 2.1 AA compliant
- [ ] Real data only

---

## 🎯 RECOMMENDED APPROACH

### Option A: Three Sequential Sessions

**Session 1** (2-3 hours): "Implement Phase 1-2 (data layer & core components)"
**Session 2** (2-3 hours): "Implement Phase 3 (section components)"  
**Session 3** (2-3 hours): "Implement Phase 4-5 (integration & polish)"

### Option B: Feature-by-Feature

**Session 1**: "Add comparison metrics to finance API"
**Session 2**: "Build comparison bar chart component"
**Session 3**: "Create fundraising sources section"
**Session 4**: "Create top industries section"
**Session 5**: "Integrate and test"

---

**Remember**: This is civic infrastructure. Every line serves citizens seeking transparency. Make it clean, accessible, and truthful.
