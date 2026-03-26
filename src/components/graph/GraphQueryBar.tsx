/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useCallback } from 'react';
import type { GraphNode, GraphEdge } from '@/types/graph';

interface QueryResult {
  matchingNodes: GraphNode[];
  relatedEdges: GraphEdge[];
  explanation: string;
  truncated: boolean;
}

interface QueryResponse {
  result: QueryResult;
  compiledQuery: unknown;
}

interface QueryErrorResponse {
  error: string;
  suggestions: string[];
}

interface GraphQueryBarProps {
  onResults: (nodes: GraphNode[], edges: GraphEdge[]) => void;
}

const EXAMPLE_QUERIES = [
  'Which California senators serve on Finance?',
  'Representatives on Armed Services Committee',
  'Senators from Texas',
];

export function GraphQueryBar({ onResults }: GraphQueryBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);
      setSuggestions([]);
      setExplanation(null);

      try {
        const response = await fetch('/api/graph/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed }),
        });

        if (response.status === 422) {
          const errData = (await response.json()) as QueryErrorResponse;
          setError(errData.error);
          setSuggestions(errData.suggestions);
          return;
        }

        if (!response.ok) {
          setError('Query failed. Please try again.');
          return;
        }

        const data = (await response.json()) as QueryResponse;
        setExplanation(data.result.explanation);
        onResults(data.result.matchingNodes, data.result.relatedEdges);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [onResults]
  );

  return (
    <div className="space-y-2">
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSubmit(query);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask a question: e.g., Which senators received defense money?"
          className="flex-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 type-sm focus:border-[#3ea2d4] outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border-2 border-[#3ea2d4] text-[#3ea2d4] type-sm font-bold hover:bg-[#3ea2d4] hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Query'}
        </button>
      </form>

      {/* Example queries */}
      <div className="flex flex-wrap gap-1">
        {EXAMPLE_QUERIES.map(ex => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setQuery(ex);
              handleSubmit(ex);
            }}
            className="px-2 py-1 type-xs border-2 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-[#3ea2d4] hover:text-[#3ea2d4] transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Error + suggestions */}
      {error && (
        <div className="p-3 border-2 border-amber-600 bg-amber-50 dark:bg-amber-900/30">
          <p className="type-sm text-amber-700">{error}</p>
          {suggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="type-xs text-gray-500">Try one of these:</p>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s);
                    handleSubmit(s);
                  }}
                  className="block type-xs text-[#3ea2d4] hover:underline"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results explanation */}
      {explanation && <p className="type-sm text-gray-600 dark:text-gray-400">{explanation}</p>}
    </div>
  );
}
