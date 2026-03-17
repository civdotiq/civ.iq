/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useGraphStore } from './useGraphStore';
import type { GraphEdgeType } from '@/types/graph';

const EDGE_TYPE_LABELS: Record<GraphEdgeType, string> = {
  donated_to: 'Donations',
  lobbied: 'Lobbying',
  serves_on: 'Committees',
  voted_on: 'Votes',
  sponsored: 'Sponsorship',
  oversees: 'Oversight',
  awarded_contract: 'Contracts',
  affects_sector: 'Industry impact',
  in_sector: 'Industry links',
  traded_stock: 'Stock trades',
  regulates: 'Regulations',
  lobbying_matches: 'Related lobbying',
  referred_to: 'Referrals',
  employs_donor: 'Donor employers',
};

const EDGE_TYPE_GROUPS: Array<{ label: string; types: GraphEdgeType[] }> = [
  { label: 'Money', types: ['donated_to', 'lobbied', 'awarded_contract', 'traded_stock'] },
  { label: 'Legislative', types: ['voted_on', 'sponsored', 'referred_to'] },
  { label: 'Structural', types: ['serves_on', 'oversees', 'regulates'] },
  {
    label: 'Deeper analysis',
    types: ['affects_sector', 'in_sector', 'lobbying_matches', 'employs_donor'],
  },
];

export function GraphControls() {
  const { visibleEdgeTypes, minConfidence, toggleEdgeType, setMinConfidence, reset } =
    useGraphStore();

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4 p-4 border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      {/* Edge type toggles */}
      {EDGE_TYPE_GROUPS.map(group => (
        <div key={group.label} className="flex flex-wrap items-center gap-1">
          <span className="type-xs font-bold text-gray-500 mr-1">{group.label}:</span>
          {group.types.map(type => (
            <button
              key={type}
              onClick={() => toggleEdgeType(type)}
              className={`px-2 py-1 type-xs border-2 transition-colors ${
                visibleEdgeTypes.has(type)
                  ? 'border-[#3ea2d4] text-[#3ea2d4] bg-white dark:bg-gray-800'
                  : 'border-gray-300 text-gray-400 bg-gray-100 dark:bg-gray-900'
              }`}
            >
              {EDGE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      ))}

      {/* Confidence slider */}
      <div
        className="flex items-center gap-2 ml-auto"
        title="Higher = only show connections with stronger evidence. Lower = include weaker matches."
      >
        <label className="type-xs text-gray-500">Show only high-confidence data:</label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={minConfidence * 100}
          onChange={e => setMinConfidence(parseInt(e.target.value) / 100)}
          className="w-24"
        />
        <span className="type-xs w-8 text-right">{(minConfidence * 100).toFixed(0)}%</span>
      </div>

      {/* Reset */}
      <button
        onClick={reset}
        className="px-3 py-1 type-xs border-2 border-gray-300 text-gray-500 hover:border-[#e11d07] hover:text-[#e11d07] transition-colors"
      >
        Reset
      </button>
    </div>
  );
}
