/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Cascade Section — Industry Funding Impact Simulation
 *
 * Lets citizens ask: "If this industry's campaign donations
 * increased or decreased, which representatives would be most affected?"
 *
 * The user picks a change amount, clicks Run, and sees
 * which reps are statistically most sensitive to that shift.
 */

'use client';

import { useState, useCallback } from 'react';
import CascadeSummary from './CascadeSummary';
import type { CascadeResult } from '@/lib/mesh/propagation/cascade';

interface CascadeSectionProps {
  /** The raw IndustrySector value (e.g. "Finance/Insurance/Real Estate") */
  sector: string;
}

const CHANGE_OPTIONS = [
  { label: '-50%', value: -50 },
  { label: '-25%', value: -25 },
  { label: '+25%', value: 25 },
  { label: '+50%', value: 50 },
  { label: '+100%', value: 100 },
];

export function CascadeSection({ sector }: CascadeSectionProps) {
  const [changePercent, setChangePercent] = useState(50);
  const [result, setResult] = useState<CascadeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/mesh/influence/cascade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector, changePercent }),
      });

      if (!res.ok) {
        setError('Simulation not available for this industry yet.');
        return;
      }

      const data: CascadeResult = await res.json();
      setResult(data);
    } catch {
      setError('Could not run simulation. Try again later.');
    } finally {
      setLoading(false);
    }
  }, [sector, changePercent]);

  return (
    <div className="space-y-4">
      <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-4 sm:p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          What If This Industry&apos;s Donations Changed?
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Simulate what happens if campaign donations from this industry increase or decrease. The
          model predicts which members of Congress would be most affected based on their voting
          patterns and donor profiles. This is a statistical estimate — not a guarantee.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Change donations by:</span>
          {CHANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setChangePercent(opt.value);
                setResult(null);
              }}
              className={`px-3 py-1 text-xs border-2 transition-colors ${
                changePercent === opt.value
                  ? 'border-[#3ea2d4] bg-[#3ea2d4]/10 text-[#3ea2d4] font-medium'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={runSimulation}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-[#3ea2d4] hover:bg-[#3ea2d4]/80 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#3ea2d4]"
        >
          {loading ? 'Simulating...' : 'Run Simulation'}
        </button>

        {error && <p className="text-xs text-[#e11d07] mt-3">{error}</p>}
      </div>

      {result && <CascadeSummary result={result} />}
    </div>
  );
}
