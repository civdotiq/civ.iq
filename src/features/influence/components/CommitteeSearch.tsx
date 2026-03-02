/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { CommitteeTypeBadge } from './CommitteeTypeBadge';
import type { FECCommitteeSearchResult, CommitteeSearchResponse } from '@/types/influence';

function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

interface CommitteeSearchProps {
  initialQuery?: string;
}

export function CommitteeSearch({ initialQuery = '' }: CommitteeSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<FECCommitteeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setTotalResults(0);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await fetch(
        `/api/influence/search?q=${encodeURIComponent(searchQuery)}&limit=20`
      );
      if (response.ok) {
        const data: CommitteeSearchResponse = await response.json();
        setResults(data.results);
        setTotalResults(data.pagination.totalResults);
      }
    } catch {
      setResults([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetch = useCallback(debounce(fetchResults, 300), [fetchResults]);

  useEffect(() => {
    debouncedFetch(query);
  }, [query, debouncedFetch]);

  // If initial query, fetch immediately
  useEffect(() => {
    if (initialQuery && initialQuery.length >= 2) {
      fetchResults(initialQuery);
    }
  }, [initialQuery, fetchResults]);

  const handleCommitteeClick = (committeeId: string) => {
    // Update URL with search state
    window.history.replaceState(null, '', `/influence?q=${encodeURIComponent(query)}`);
    router.push(`/influence/${committeeId}`);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setTotalResults(0);
    setHasSearched(false);
    window.history.replaceState(null, '', '/influence');
    inputRef.current?.focus();
  };

  return (
    <div>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search PACs and committees (e.g. AIPAC, NRA, Planned Parenthood)"
          className="w-full pl-12 pr-10 py-3 text-base border-2 border-black dark:border-[#333333] bg-white dark:bg-[#1a1a1e] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#3ea2d4] transition-colors"
          aria-label="Search PACs and political committees"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="mt-4 text-center py-4">
          <div className="aicher-loading w-6 h-6 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Searching FEC records...</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && results.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {totalResults.toLocaleString()} committee{totalResults !== 1 ? 's' : ''} found
          </p>
          <div className="space-y-2">
            {results.map(committee => (
              <button
                key={committee.committee_id}
                onClick={() => handleCommitteeClick(committee.committee_id)}
                className="w-full text-left border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-4 hover:bg-gray-50 dark:hover:bg-[#2a2a2e] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 dark:text-gray-100 truncate">
                        {committee.name}
                      </span>
                      <CommitteeTypeBadge
                        committeeType={committee.committee_type}
                        designation={committee.designation}
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span className="font-mono">{committee.committee_id}</span>
                      {committee.state && <span>{committee.state}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {committee.total_disbursements > 0 && (
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(committee.total_disbursements)}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400">disbursements</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {!isLoading && hasSearched && results.length === 0 && query.length >= 2 && (
        <div className="mt-4 text-center py-6 border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226]">
          <p className="text-gray-500 dark:text-gray-400">
            No committees found for &ldquo;{query}&rdquo;
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Try searching by PAC name, committee name, or FEC ID
          </p>
        </div>
      )}
    </div>
  );
}
