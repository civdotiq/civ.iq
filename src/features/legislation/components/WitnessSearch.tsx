/**
 * Witness Search Component - Search congressional hearing witnesses
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Users, Building2, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

interface Witness {
  name: string;
  organization?: string;
  position?: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  chamber: 'House' | 'Senate';
  committees: string[];
  congressGovUrl: string;
}

interface WitnessSearchResponse {
  success: boolean;
  witnesses: Witness[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  metadata: {
    generatedAt: string;
    dataSource: string;
    congress: number;
    searchQuery?: string;
  };
  error?: string;
}

export function WitnessSearch() {
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<'all' | 'house' | 'senate'>('all');
  const [pagination, setPagination] = useState({ total: 0, hasMore: false });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchWitnesses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (chamberFilter !== 'all') params.set('chamber', chamberFilter);
      params.set('limit', '20');

      const response = await fetch(`/api/witnesses?${params}`);
      if (!response.ok) throw new Error('Failed to fetch witnesses');

      const data: WitnessSearchResponse = await response.json();
      setWitnesses(data.witnesses);
      setPagination({ total: data.pagination.total, hasMore: data.pagination.hasMore });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, chamberFilter]);

  useEffect(() => {
    fetchWitnesses();
  }, [fetchWitnesses]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="border-2 border-black">
      {/* Header */}
      <div className="bg-black text-white p-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <h2 className="font-bold text-lg">CONGRESSIONAL WITNESSES</h2>
        </div>
        <p className="text-xs text-gray-300 mt-1">
          Search witnesses who have testified before Congress
        </p>
      </div>

      {/* Search and Filters */}
      <div className="p-4 border-b-2 border-black bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, organization, or hearing topic..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] border-2 border-gray-300 focus:border-civiq-blue focus:outline-none"
            />
          </div>
          <select
            value={chamberFilter}
            onChange={e => setChamberFilter(e.target.value as 'all' | 'house' | 'senate')}
            className="px-4 py-2.5 min-h-[44px] border-2 border-gray-300 focus:border-civiq-blue focus:outline-none bg-white"
          >
            <option value="all">All Chambers</option>
            <option value="house">House</option>
            <option value="senate">Senate</option>
          </select>
        </div>
        {!loading && (
          <p className="text-xs text-gray-500 mt-2">
            {pagination.total} witnesses found
            {debouncedQuery && ` for "${debouncedQuery}"`}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading witnesses...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-8 text-red-600 justify-center">
            <AlertCircle className="w-5 h-5" />
            <span>Unable to load witnesses</span>
          </div>
        ) : witnesses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No witnesses found</p>
            {debouncedQuery && <p className="text-sm mt-1">Try adjusting your search terms</p>}
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {witnesses.map((witness, idx) => (
              <div
                key={`${witness.eventId}-${witness.name}-${idx}`}
                className="border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900">{witness.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 font-bold ${
                          witness.chamber === 'House'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {witness.chamber}
                      </span>
                    </div>
                    {(witness.organization || witness.position) && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {witness.position && witness.organization
                            ? `${witness.position}, ${witness.organization}`
                            : witness.position || witness.organization}
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-gray-700 line-clamp-2 mb-2">{witness.eventTitle}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatDate(witness.eventDate)}</span>
                      {witness.committees.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="truncate">{witness.committees[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <a
                    href={witness.congressGovUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-2 hover:bg-gray-100 rounded"
                    title="View on Congress.gov"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-600" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && witnesses.length > 0 && (
        <div className="border-t-2 border-black p-3 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Data from{' '}
            <a
              href="https://api.congress.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-civiq-blue hover:underline"
            >
              Congress.gov API
            </a>{' '}
            • 119th Congress
          </p>
        </div>
      )}
    </div>
  );
}

export default WitnessSearch;
