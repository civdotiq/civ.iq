/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, FileText, Users, X } from 'lucide-react';

interface Representative {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  district?: string;
}

interface Bill {
  number: string;
  title: string;
  type: string;
  congress: number;
}

interface Committee {
  id: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
}

interface SearchResults {
  representatives: Representative[];
  bills: Bill[];
  committees: Committee[];
  query: string;
  totalResults: number;
}

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

function getPartyAbbrev(party: string): string {
  if (party.toLowerCase().includes('democrat')) return 'D';
  if (party.toLowerCase().includes('republican')) return 'R';
  return 'I';
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Build flat list of all results for keyboard navigation
  const allResults: Array<{ type: string; item: Representative | Bill | Committee }> = [];
  if (results) {
    results.representatives.forEach(r => allResults.push({ type: 'rep', item: r }));
    results.bills.forEach(b => allResults.push({ type: 'bill', item: b }));
    results.committees.forEach(c => allResults.push({ type: 'committee', item: c }));
  }

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search/unified?q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch {
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetch = useCallback(debounce(fetchResults, 300), [fetchResults]);

  useEffect(() => {
    debouncedFetch(query);
  }, [query, debouncedFetch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigateToResult = (result: { type: string; item: Representative | Bill | Committee }) => {
    setIsOpen(false);
    setQuery('');
    setResults(null);

    if (result.type === 'rep') {
      const rep = result.item as Representative;
      router.push(`/representative/${rep.bioguideId}`);
    } else if (result.type === 'bill') {
      const bill = result.item as Bill;
      router.push(`/bill/${bill.number}`);
    } else if (result.type === 'committee') {
      const committee = result.item as Committee;
      router.push(`/committee/${committee.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || allResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < allResults.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : allResults.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < allResults.length) {
          const selectedResult = allResults[selectedIndex];
          if (selectedResult) {
            navigateToResult(selectedResult);
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search reps, bills, committees..."
          className="w-48 lg:w-64 pl-9 pr-8 py-2 text-sm border-2 border-black bg-white focus:outline-none focus:border-civiq-blue transition-colors"
          aria-label="Global search"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-2 p-1 hover:bg-gray-100"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (query.length >= 2 || results) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-black shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading && <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>}

          {!isLoading && results && results.totalResults === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">No results found</div>
          )}

          {!isLoading && results && results.totalResults > 0 && (
            <div role="listbox">
              {/* Representatives */}
              {results.representatives.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    Representatives
                  </div>
                  {results.representatives.map((rep, index) => (
                    <button
                      key={rep.bioguideId}
                      onClick={() => navigateToResult({ type: 'rep', item: rep })}
                      className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 border-b border-gray-100 ${
                        selectedIndex === index ? 'bg-civiq-blue/10' : ''
                      }`}
                      role="option"
                      aria-selected={selectedIndex === index}
                    >
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{rep.name}</div>
                        <div className="text-xs text-gray-500">
                          {getPartyAbbrev(rep.party)}-{rep.state}
                          {rep.district ? ` (${rep.district})` : ''} · {rep.chamber}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Bills */}
              {results.bills.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    Bills
                  </div>
                  {results.bills.map((bill, index) => {
                    const resultIndex = results.representatives.length + index;
                    return (
                      <button
                        key={bill.number}
                        onClick={() => navigateToResult({ type: 'bill', item: bill })}
                        className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 border-b border-gray-100 ${
                          selectedIndex === resultIndex ? 'bg-civiq-blue/10' : ''
                        }`}
                        role="option"
                        aria-selected={selectedIndex === resultIndex}
                      >
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm font-mono">{bill.number}</div>
                          <div className="text-xs text-gray-500 truncate">{bill.title}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Committees */}
              {results.committees.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    Committees
                  </div>
                  {results.committees.map((committee, index) => {
                    const resultIndex =
                      results.representatives.length + results.bills.length + index;
                    return (
                      <button
                        key={committee.id}
                        onClick={() => navigateToResult({ type: 'committee', item: committee })}
                        className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 border-b border-gray-100 ${
                          selectedIndex === resultIndex ? 'bg-civiq-blue/10' : ''
                        }`}
                        role="option"
                        aria-selected={selectedIndex === resultIndex}
                      >
                        <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{committee.name}</div>
                          <div className="text-xs text-gray-500">{committee.chamber}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
