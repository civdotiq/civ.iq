/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useGraphStore } from './useGraphStore';
import type { GraphEdgeType } from '@/types/graph';

/** Citizen-friendly filter presets that map to underlying edge types */
const VIEW_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  types: GraphEdgeType[];
}> = [
  {
    id: 'money',
    label: 'Follow the money',
    description: 'Campaign donations, lobbying, contracts, stock trades',
    types: ['donated_to', 'lobbied', 'awarded_contract', 'traded_stock', 'employs_donor'],
  },
  {
    id: 'legislation',
    label: 'Votes & bills',
    description: 'How they vote, what they sponsor',
    types: ['voted_on', 'sponsored', 'referred_to', 'lobbying_matches'],
  },
  {
    id: 'structure',
    label: 'Committees & power',
    description: 'Committee seats, oversight, industry ties',
    types: ['serves_on', 'oversees', 'regulates', 'affects_sector', 'in_sector'],
  },
];

const ADVANCED_LABELS: Record<GraphEdgeType, string> = {
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
  located_in_district: 'Located In District',
  violates_regulation: 'Violates Regulation',
  receives_grant: 'Receives Grant',
  complained_against: 'Complained Against',
  declared_in: 'Declared In',
};

function isPresetActive(presetTypes: GraphEdgeType[], visible: Set<GraphEdgeType>): boolean {
  return presetTypes.some(t => visible.has(t));
}

export function GraphControls() {
  const { visibleEdgeTypes, minConfidence, toggleEdgeType, setMinConfidence, reset } =
    useGraphStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePresetToggle = (preset: (typeof VIEW_PRESETS)[number]) => {
    const allActive = preset.types.every(t => visibleEdgeTypes.has(t));
    for (const t of preset.types) {
      const isVisible = visibleEdgeTypes.has(t);
      if (allActive && isVisible) {
        toggleEdgeType(t);
      } else if (!allActive && !isVisible) {
        toggleEdgeType(t);
      }
    }
  };

  return (
    <div className="mb-4 border-2 border-gray-200 dark:border-gray-700">
      {/* Simple preset buttons */}
      <div className="flex flex-wrap items-center gap-2 p-3">
        <span className="type-xs font-bold text-gray-500">Show:</span>
        {VIEW_PRESETS.map(preset => {
          const active = isPresetActive(preset.types, visibleEdgeTypes);
          return (
            <button
              key={preset.id}
              onClick={() => handlePresetToggle(preset)}
              className={`px-3 py-1.5 type-xs border-2 transition-colors ${
                active
                  ? 'border-[#3ea2d4] text-[#3ea2d4] bg-white dark:bg-gray-800 font-bold'
                  : 'border-gray-300 text-gray-400 bg-gray-50 dark:bg-gray-900'
              }`}
              title={preset.description}
            >
              {preset.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 px-2 py-1 type-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Fine-tune
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={reset}
            className="px-2 py-1 type-xs border-2 border-gray-300 text-gray-500 hover:border-[#e11d07] hover:text-[#e11d07] transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Advanced controls — hidden by default */}
      {showAdvanced && (
        <div className="px-3 pb-3 pt-2 border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex flex-wrap items-center gap-1 mb-3">
            {(Object.keys(ADVANCED_LABELS) as GraphEdgeType[]).map(type => (
              <button
                key={type}
                onClick={() => toggleEdgeType(type)}
                className={`px-2 py-0.5 type-xs border transition-colors ${
                  visibleEdgeTypes.has(type)
                    ? 'border-[#3ea2d4] text-[#3ea2d4] bg-white dark:bg-gray-800'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                {ADVANCED_LABELS[type]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="type-xs text-gray-500">Data quality filter:</label>
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
        </div>
      )}
    </div>
  );
}
