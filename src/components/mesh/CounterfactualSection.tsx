/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Counterfactual Section — "What If" Analysis for a Representative
 *
 * Lets citizens ask: "What would this representative vote
 * if we removed donations from a specific industry?"
 *
 * Fetches the rep's top donor sectors, lets the user pick one,
 * then calls the counterfactual API and shows results.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import CounterfactualCard from './CounterfactualCard';
import { displaySector } from '@/lib/mesh/sector-display';
import type { CounterfactualResult } from '@/lib/mesh/propagation/counterfactual';
import type { VoteFinanceInsight } from '@/lib/intelligence/types';

interface CounterfactualSectionProps {
  bioguideId: string;
}

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  });

export function CounterfactualSection({ bioguideId }: CounterfactualSectionProps) {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [result, setResult] = useState<CounterfactualResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the rep's donor sectors from vote-finance insight
  const { data: vfData } = useSWR<VoteFinanceInsight>(
    `/api/intelligence/representative/${bioguideId}/vote-finance`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const topSectors =
    vfData?.correlations
      ?.filter(c => c.donationAmount > 0)
      ?.sort((a, b) => b.donationAmount - a.donationAmount)
      ?.slice(0, 6) ?? [];

  // Auto-select the top sector
  useEffect(() => {
    if (topSectors.length > 0 && !selectedSector) {
      setSelectedSector(topSectors[0]!.sector);
    }
  }, [topSectors, selectedSector]);

  const runAnalysis = useCallback(async () => {
    if (!selectedSector) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/mesh/influence/counterfactual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bioguideId,
          maskSectors: [selectedSector],
        }),
      });

      if (!res.ok) {
        setError('Analysis not available for this representative.');
        return;
      }

      const data: CounterfactualResult = await res.json();
      setResult(data);
    } catch {
      setError('Could not run analysis. Try again later.');
    } finally {
      setLoading(false);
    }
  }, [bioguideId, selectedSector]);

  if (topSectors.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-4 sm:p-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-1">
          What If: Remove an Industry&apos;s Donations
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Pick an industry below to see how this representative&apos;s predicted votes would change
          if that industry&apos;s campaign donations were removed. This is a statistical model — not
          a claim about motives.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {topSectors.map(s => (
            <button
              key={s.sector}
              onClick={() => {
                setSelectedSector(s.sector);
                setResult(null);
              }}
              className={`px-3 py-1 text-xs border-2 transition-colors ${
                selectedSector === s.sector
                  ? 'border-[#3ea2d4] bg-[#3ea2d4]/10 text-[#3ea2d4] font-medium'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
              }`}
            >
              {displaySector(s.sector)}
            </button>
          ))}
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading || !selectedSector}
          className="px-4 py-2 text-sm font-medium text-white bg-[#3ea2d4] hover:bg-[#3ea2d4]/80 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#3ea2d4]"
        >
          {loading ? 'Analyzing...' : 'Run What-If Analysis'}
        </button>

        {error && <p className="text-xs text-[#e11d07] mt-3">{error}</p>}
      </div>

      {result && <CounterfactualCard result={result} />}
    </div>
  );
}
