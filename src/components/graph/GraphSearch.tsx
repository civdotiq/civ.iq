/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, User, Users, DollarSign, X } from 'lucide-react';
import { toCanonicalId, normalizeOrgName } from '@/lib/graph/normalize';

interface GraphSearchProps {
  onSelect: (nodeId: string, label: string) => void;
}

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

interface Committee {
  id: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
}

interface FECCommitteeResult {
  committee_id: string;
  name: string;
  committee_type: string;
  designation: string;
  total_disbursements: number;
}

interface SearchResults {
  representatives: Representative[];
  bills: { number: string; title: string; type: string; congress: number }[];
  committees: Committee[];
  fecCommittees: FECCommitteeResult[];
  totalResults: number;
}

type SearchItem = Representative | Committee | FECCommitteeResult;

const EXAMPLES = [
  { label: 'Nancy Pelosi', nodeId: 'rep:P000197' },
  { label: 'Armed Services Committee', nodeId: 'cmte:SSAS' },
  { label: 'Mitch McConnell', nodeId: 'rep:M000355' },
];

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

export function GraphSearch({ onSelect }: GraphSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build flat list for keyboard navigation (reps, committees, FEC committees)
  const allResults: Array<{ type: string; item: SearchItem }> = [];
  if (results) {
    results.representatives.forEach(r => allResults.push({ type: 'rep', item: r }));
    results.committees.forEach(c => allResults.push({ type: 'committee', item: c }));
    (results.fecCommittees || []).forEach(f => allResults.push({ type: 'fec-committee', item: f }));
  }

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search/unified?q=${encodeURIComponent(searchQuery)}&limit=8`
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

  const selectResult = (result: { type: string; item: SearchItem }) => {
    setIsOpen(false);
    setQuery('');
    setResults(null);

    if (result.type === 'rep') {
      const rep = result.item as Representative;
      const partyAbbrev = getPartyAbbrev(rep.party);
      const label = `${rep.name} (${partyAbbrev}-${rep.state})`;
      onSelect(toCanonicalId('representative', rep.bioguideId), label);
    } else if (result.type === 'committee') {
      const committee = result.item as Committee;
      onSelect(toCanonicalId('committee', committee.id), committee.name);
    } else if (result.type === 'fec-committee') {
      const fec = result.item as FECCommitteeResult;
      onSelect(toCanonicalId('organization', normalizeOrgName(fec.name)), fec.name);
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
          const selected = allResults[selectedIndex];
          if (selected) {
            selectResult(selected);
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

  // Offsets for keyboard navigation
  const committeesOffset = results?.representatives.length || 0;
  const fecOffset = committeesOffset + (results?.committees.length || 0);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        {/* Search input */}
        <div className="relative flex-1 flex items-center">
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
            placeholder="Search by name: Nancy Pelosi, Armed Services Committee, Boeing..."
            className="w-full pl-9 pr-8 py-2 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 type-sm focus:border-[#3ea2d4] outline-none"
            aria-label="Search for a representative, committee, or organization to investigate"
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

        {/* Quick examples */}
        <div className="hidden sm:flex items-center gap-1">
          {EXAMPLES.map(ex => (
            <button
              key={ex.nodeId}
              type="button"
              onClick={() => onSelect(ex.nodeId, ex.label)}
              className="px-2 py-1 type-xs border-2 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-[#3ea2d4] hover:text-[#3ea2d4] transition-colors whitespace-nowrap"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && (query.length >= 2 || results) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600 z-50 max-h-96 overflow-y-auto">
          {isLoading && <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>}

          {!isLoading && results && allResults.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              No results found. Try a different name or term.
            </div>
          )}

          {!isLoading && results && allResults.length > 0 && (
            <div role="listbox">
              {/* Representatives */}
              {results.representatives.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    Representatives
                  </div>
                  {results.representatives.map((rep, index) => (
                    <button
                      key={rep.bioguideId}
                      onClick={() => selectResult({ type: 'rep', item: rep })}
                      className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 ${
                        selectedIndex === index ? 'bg-civiq-blue/10 dark:bg-civiq-blue/30' : ''
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

              {/* Committees */}
              {results.committees.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    Committees
                  </div>
                  {results.committees.map((committee, index) => {
                    const resultIndex = committeesOffset + index;
                    return (
                      <button
                        key={committee.id}
                        onClick={() => selectResult({ type: 'committee', item: committee })}
                        className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 ${
                          selectedIndex === resultIndex
                            ? 'bg-civiq-blue/10 dark:bg-civiq-blue/30'
                            : ''
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

              {/* PACs & Organizations (FEC) */}
              {results.fecCommittees && results.fecCommittees.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    Organizations
                  </div>
                  {results.fecCommittees.map((fec, index) => {
                    const resultIndex = fecOffset + index;
                    return (
                      <button
                        key={fec.committee_id}
                        onClick={() => selectResult({ type: 'fec-committee', item: fec })}
                        className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 ${
                          selectedIndex === resultIndex
                            ? 'bg-civiq-blue/10 dark:bg-civiq-blue/30'
                            : ''
                        }`}
                        role="option"
                        aria-selected={selectedIndex === resultIndex}
                      >
                        <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{fec.name}</div>
                          <div className="text-xs text-gray-500">{fec.committee_id}</div>
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
