/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Influence Path Section — Trace Money Between Entities
 *
 * Lets citizens trace connections between organizations and representatives.
 * Example: "Show me the path from Lockheed Martin to Senator X."
 *
 * Uses canonical mesh IDs (org:lockheed-martin, rep:A000360, etc.)
 */

'use client';

import { useState, useCallback } from 'react';
import InfluencePathView from './InfluencePathView';
import type { InfluenceScore } from '@/lib/mesh/propagation/path-scorer';

const EXAMPLE_QUERIES = [
  {
    from: 'org:lockheed-martin',
    to: 'cmte:SSAS',
    label: 'Lockheed Martin to Senate Armed Services',
  },
  { from: 'org:american-medical-assn', to: 'cmte:SSHR', label: 'AMA to Senate Health Committee' },
  { from: 'org:national-assn-of-realtors', to: 'cmte:SSBK', label: 'Realtors to Senate Banking' },
];

export function InfluencePathSection() {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [result, setResult] = useState<InfluenceScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (from?: string, to?: string) => {
      const effectiveFrom = from ?? fromId;
      const effectiveTo = to ?? toId;
      if (!effectiveFrom || !effectiveTo) return;

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const params = new URLSearchParams({
          from: effectiveFrom,
          to: effectiveTo,
          maxDepth: '3',
        });
        const res = await fetch(`/api/mesh/influence/path?${params}`);

        if (!res.ok) {
          setError('No path data found for these entities.');
          return;
        }

        const data: InfluenceScore = await res.json();
        setResult(data);
      } catch {
        setError('Could not trace paths. Try again later.');
      } finally {
        setLoading(false);
      }
    },
    [fromId, toId]
  );

  return (
    <div className="space-y-4">
      <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-4 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
          Trace the Influence Path
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Enter two entities to see how money and influence flow between them. Use IDs like{' '}
          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1">org:company-name</code>,{' '}
          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1">rep:BIOGUIDE_ID</code>, or{' '}
          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1">cmte:CODE</code>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label
              htmlFor="path-from"
              className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
            >
              From (source)
            </label>
            <input
              id="path-from"
              type="text"
              value={fromId}
              onChange={e => setFromId(e.target.value)}
              placeholder="org:lockheed-martin"
              className="w-full px-3 py-2 text-sm border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1a1a1e] text-gray-900 dark:text-gray-100 focus:border-[#3ea2d4] focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="path-to"
              className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
            >
              To (destination)
            </label>
            <input
              id="path-to"
              type="text"
              value={toId}
              onChange={e => setToId(e.target.value)}
              placeholder="rep:A000360"
              className="w-full px-3 py-2 text-sm border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1a1a1e] text-gray-900 dark:text-gray-100 focus:border-[#3ea2d4] focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={() => runSearch()}
          disabled={loading || !fromId || !toId}
          className="px-4 py-2 text-sm font-medium text-white bg-[#3ea2d4] hover:bg-[#3ea2d4]/80 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-[#3ea2d4]"
        >
          {loading ? 'Tracing...' : 'Trace Path'}
        </button>

        {/* Example queries */}
        <div className="mt-4 pt-3 border-t-2 border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map(ex => (
              <button
                key={ex.label}
                onClick={() => {
                  setFromId(ex.from);
                  setToId(ex.to);
                  runSearch(ex.from, ex.to);
                }}
                className="text-xs text-[#3ea2d4] hover:underline"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-[#e11d07] mt-3">{error}</p>}
      </div>

      {result && <InfluencePathView result={result} />}
    </div>
  );
}
