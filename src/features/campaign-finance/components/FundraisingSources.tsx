/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useMemo } from 'react';
import { ComparisonBarChart } from './ComparisonBarChart';
import { calculateComparison } from '@/lib/services/finance-comparisons';
import type { FundraisingSourceWithComparison } from '@/types/campaign-finance';

interface FundraisingSourcesProps {
  totalRaised: number;
  individualContributions: number;
  pacContributions: number;
  partyContributions: number;
  candidateContributions: number;
  party: 'Democrat' | 'Republican' | 'Independent';
}

/**
 * Fundraising sources breakdown with comparison metrics
 * Shows where campaign money comes from with contextual benchmarking
 */
export function FundraisingSources({
  totalRaised,
  individualContributions,
  pacContributions,
  partyContributions,
  candidateContributions,
  party,
}: FundraisingSourcesProps) {
  const sources: FundraisingSourceWithComparison[] = useMemo(() => {
    if (totalRaised === 0) return [];

    return [
      {
        category: 'Individual Contributions',
        amount: individualContributions,
        percentage: (individualContributions / totalRaised) * 100,
        comparison: calculateComparison(individualContributions, party, 'individualContributions'),
      },
      {
        category: 'PAC Contributions',
        amount: pacContributions,
        percentage: (pacContributions / totalRaised) * 100,
        comparison: calculateComparison(pacContributions, party, 'pacContributions'),
      },
      {
        category: 'Party Contributions',
        amount: partyContributions,
        percentage: (partyContributions / totalRaised) * 100,
        comparison: calculateComparison(partyContributions, party, 'totalRaised'),
      },
      {
        category: 'Self-Financing',
        amount: candidateContributions,
        percentage: (candidateContributions / totalRaised) * 100,
        comparison: calculateComparison(candidateContributions, party, 'selfFinancing'),
      },
    ].sort((a, b) => b.amount - a.amount);
  }, [
    totalRaised,
    individualContributions,
    pacContributions,
    partyContributions,
    candidateContributions,
    party,
  ]);

  if (totalRaised === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Fundraising Sources</h3>
        <p className="text-neutral-600">No fundraising data available for this cycle.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold">Fundraising Sources</h3>
        <p className="text-sm text-neutral-600">
          Breakdown of campaign funding by source, compared to House {party} average
        </p>
      </div>

      <div className="space-y-4">
        {sources.map(source => (
          <ComparisonBarChart
            key={source.category}
            label={source.category}
            amount={source.amount}
            comparison={source.comparison}
            formatValue={v => `$${(v / 1000000).toFixed(2)}M`}
            helpText={`${source.percentage.toFixed(1)}% of total raised`}
          />
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-neutral-50 p-4">
        <div className="text-sm text-neutral-700">
          <strong>Total Raised:</strong> ${(totalRaised / 1000000).toFixed(2)}M
        </div>
        <div className="mt-2 text-xs text-neutral-600">
          Dashed lines represent House {party} average for comparison
        </div>
      </div>
    </div>
  );
}
