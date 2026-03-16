/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useCallback } from 'react';
import { toCanonicalId } from '@/lib/graph/normalize';

interface GraphSearchProps {
  onSelect: (nodeId: string) => void;
}

const EXAMPLES = [
  { label: 'Nancy Pelosi', nodeId: 'rep:P000197' },
  { label: 'Armed Services Committee', nodeId: 'cmte:SSAS' },
  { label: 'Mitch McConnell', nodeId: 'rep:M000355' },
];

export function GraphSearch({ onSelect }: GraphSearchProps) {
  const [input, setInput] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;

      // If it already looks like a canonical ID (has colon), use directly
      if (trimmed.includes(':')) {
        onSelect(trimmed);
        setInput('');
        return;
      }

      // Otherwise, assume it's a bioguide ID for a representative
      const upper = trimmed.toUpperCase();
      if (/^[A-Z]\d{6}$/.test(upper)) {
        onSelect(toCanonicalId('representative', upper));
        setInput('');
        return;
      }

      // Committee code pattern (4 uppercase letters)
      if (/^[A-Z]{4}$/.test(upper)) {
        onSelect(toCanonicalId('committee', upper));
        setInput('');
        return;
      }

      // Fallback: treat as representative by name (would need search API in future)
      // For now, show hint
      setInput(trimmed);
    },
    [input, onSelect]
  );

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Enter a bioguide ID (e.g., P000197) or canonical ID (e.g., rep:P000197)"
        className="flex-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 type-sm focus:border-[#3ea2d4] outline-none"
      />
      <button
        type="submit"
        className="px-4 py-2 border-2 border-[#3ea2d4] text-[#3ea2d4] type-sm font-bold hover:bg-[#3ea2d4] hover:text-white transition-colors"
      >
        Investigate
      </button>

      {/* Quick examples */}
      <div className="hidden sm:flex items-center gap-1 ml-2">
        {EXAMPLES.map(ex => (
          <button
            key={ex.nodeId}
            type="button"
            onClick={() => onSelect(ex.nodeId)}
            className="px-2 py-1 type-xs border-2 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-[#3ea2d4] hover:text-[#3ea2d4] transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>
    </form>
  );
}
