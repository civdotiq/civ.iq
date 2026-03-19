# SESSION 2: Section Components

## Goal

Build major page sections: FundraisingSources, TopIndustries, TopContributors with card layouts.

## Prerequisites

```bash
# Session 1 must be complete
git log --oneline | grep "comparison"
npm run validate:all
```

## Step 1: Fundraising Sources Section

**File**: `src/features/campaign-finance/components/FundraisingSources.tsx`

```typescript
'use client';

import React from 'react';
import { ComparisonBarChart } from './ComparisonBarChart';
import type { FundraisingSourceWithComparison } from '@/types/finance';

interface FundraisingSourcesProps {
  sources: FundraisingSourceWithComparison[];
}

export function FundraisingSources({ sources }: FundraisingSourcesProps) {
  const [showAll, setShowAll] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'amount' | 'name'>('amount');

  const sortedSources = React.useMemo(() => {
    return [...sources].sort((a, b) => {
      if (sortBy === 'amount') return b.amount - a.amount;
      return a.category.localeCompare(b.category);
    });
  }, [sources, sortBy]);

  const displayedSources = showAll ? sortedSources : sortedSources.slice(0, 5);

  const tooltips: Record<string, string> = {
    'PAC': 'Political Action Committee - organizations that collect campaign contributions',
    'Self-Financing': 'Money the candidate contributes from personal funds',
    'Individual Contributions': 'Donations from individual people',
    'Small Donations': 'Contributions under $200 per person'
  };

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Fundraising Sources
          </h2>
          <p className="text-neutral-600">
            Where does campaign funding come from?
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="text-neutral-600">Sort:</span>
          <button
            onClick={() => setSortBy('amount')}
            className={`px-3 py-1 rounded ${
              sortBy === 'amount'
                ? 'bg-civiq-blue text-white'
                : 'bg-neutral-100 hover:bg-neutral-200'
            }`}
          >
            Amount ▼
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-3 py-1 rounded ${
              sortBy === 'name'
                ? 'bg-civiq-blue text-white'
                : 'bg-neutral-100 hover:bg-neutral-200'
            }`}
          >
            Name
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        {displayedSources.map((source, idx) => (
          <div key={source.category} className={idx > 0 ? 'mt-6' : ''}>
            <ComparisonBarChart
              label={source.category}
              amount={source.amount}
              comparison={source.comparison}
            />
            {source.contributorCount && (
              <div className="text-xs text-neutral-500 ml-2">
                {source.contributorCount} contributors • {source.percentage.toFixed(1)}% of total
              </div>
            )}
            {tooltips[source.category] && (
              <div className="text-xs text-neutral-400 ml-2 mt-1">
                ⓘ {tooltips[source.category]}
              </div>
            )}
          </div>
        ))}

        {sources.length > 5 && (
          <div className="mt-6 pt-6 border-t">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-civiq-blue hover:text-civiq-blue/80 text-sm font-medium"
            >
              ⚙️ {showAll ? 'Show less' : `Show all ${sources.length} sources`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
```

**Validate**: `npm run lint && git commit -m "feat(finance): add fundraising sources section"`

## Step 2: Top Industries Section

**File**: `src/features/campaign-finance/components/TopIndustries.tsx`

```typescript
'use client';

import React from 'react';

interface Industry {
  name: string;
  amount: number;
  percentage: number;
  contributorCount: number;
  type: 'PAC' | 'Individual' | 'Both';
}

interface TopIndustriesProps {
  industries: Industry[];
  onViewDetails?: (industry: string) => void;
}

export function TopIndustries({ industries, onViewDetails }: TopIndustriesProps) {
  const [showAll, setShowAll] = React.useState(false);
  const displayedIndustries = showAll ? industries : industries.slice(0, 5);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <section className="mb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Top Industries
        </h2>
        <p className="text-neutral-600">
          Which industries support this candidate?
        </p>
      </div>

      <div className="space-y-4">
        {displayedIndustries.map((industry, idx) => (
          <div
            key={industry.name}
            className="bg-white border border-neutral-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-semibold text-neutral-900">
                    {idx + 1}. {industry.name}
                  </span>
                </div>
                <div className="text-sm text-neutral-600">
                  {industry.type === 'Both'
                    ? 'PACs and individual donors'
                    : industry.type === 'PAC'
                    ? 'PACs only'
                    : 'Individual donors only'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-neutral-900">
                  {formatCurrency(industry.amount)}
                </div>
                <div className="text-sm text-neutral-600">
                  {industry.percentage.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="relative h-2 bg-neutral-100 rounded-full mb-3 overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-civiq-blue rounded-full"
                style={{ width: `${industry.percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="text-neutral-600">
                👥 {industry.contributorCount} contributors
              </div>
              {onViewDetails && (
                <button
                  onClick={() => onViewDetails(industry.name)}
                  className="text-civiq-blue hover:text-civiq-blue/80 font-medium"
                >
                  📊 View breakdown
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {industries.length > 5 && (
        <div className="mt-6">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-civiq-blue hover:text-civiq-blue/80 text-sm font-medium"
          >
            ⚙️ {showAll ? 'Show less' : `Show all ${industries.length} industries`}
          </button>
        </div>
      )}

      {industries.length > 0 && industries[0].percentage > 25 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <div className="font-semibold text-neutral-900 mb-1">INSIGHT</div>
              <div className="text-neutral-700">
                {industries[0].name} donors provide {Math.round(industries[0].percentage)}%
                of all itemized contributions - significantly higher than typical House campaigns.
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
```

**Validate**: `npm run lint && git commit -m "feat(finance): add top industries section"`

## Step 3: Top Contributors Section

**File**: `src/features/campaign-finance/components/TopContributors.tsx`

```typescript
'use client';

import React from 'react';

interface Contributor {
  name: string;
  amount: number;
  type: 'Individual' | 'PAC';
  location: string;
  industry: string;
  date: string;
}

interface TopContributorsProps {
  contributors: Contributor[];
}

export function TopContributors({ contributors }: TopContributorsProps) {
  const [showAll, setShowAll] = React.useState(false);
  const [filterType, setFilterType] = React.useState<'All' | 'Individual' | 'PAC'>('All');

  const filteredContributors = React.useMemo(() => {
    if (filterType === 'All') return contributors;
    return contributors.filter(c => c.type === filterType);
  }, [contributors, filterType]);

  const displayedContributors = showAll ? filteredContributors : filteredContributors.slice(0, 5);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <section className="mb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Top Contributors
        </h2>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm text-neutral-600">View:</span>
          {(['All', 'Individual', 'PAC'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded text-sm ${
                filterType === type
                  ? 'bg-civiq-blue text-white'
                  : 'bg-neutral-100 hover:bg-neutral-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {displayedContributors.map((contributor) => (
          <div
            key={`${contributor.name}-${contributor.date}`}
            className="bg-white border border-neutral-200 rounded-lg p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-semibold text-neutral-900 mb-1">
                  {contributor.name}
                </div>
                <div className="text-sm text-neutral-600 space-y-1">
                  <div>{contributor.type} • {contributor.location}</div>
                  <div>Industry: {contributor.industry}</div>
                  <div>Date: {new Date(contributor.date).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-neutral-900">
                  {formatCurrency(contributor.amount)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredContributors.length > 5 && (
        <div className="mt-6">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-civiq-blue hover:text-civiq-blue/80 text-sm font-medium"
          >
            ⚙️ {showAll ? 'Show less' : `Show all ${filteredContributors.length} contributors`}
          </button>
        </div>
      )}
    </section>
  );
}
```

**Validate**: `npm run lint && git commit -m "feat(finance): add top contributors section"`

## Final Session Validation

```bash
npm run validate:all
git log --oneline -5
```

## Next: SESSION 3

Integrate all components into main page, add tests, optimize performance.
