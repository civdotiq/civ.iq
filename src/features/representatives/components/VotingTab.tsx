/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import {
  Filter,
  X,
  Calendar,
  CheckCircle,
  Clock,
  MinusCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Vote {
  voteId: string;
  bill: {
    number: string;
    title: string;
    congress: string;
    type: string;
    url?: string;
  };
  question: string;
  result: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  chamber: 'House' | 'Senate';
  rollNumber: number;
  description: string;
  category?: string;
  isKeyVote?: boolean;
}

interface VoteResponse {
  votes: Vote[];
  totalResults: number;
  member: {
    bioguideId: string;
    name: string;
    chamber: string;
  };
  dataSource: string;
  success: boolean;
  error?: string;
}

interface BatchApiResponse {
  success: boolean;
  data: {
    votes?: VoteResponse;
  };
}

interface VotingTabProps {
  bioguideId: string;
  sharedData?: VoteResponse;
  sharedLoading?: boolean;
  sharedError?: Error | null;
}

// Extract utility functions outside component for better performance
const extractVoteId = (vote: Vote): string | null => {
  if (!vote.voteId) return null;

  // House votes: use the full voteId (e.g., "house-119-116")
  if (vote.chamber === 'House') {
    return vote.voteId;
  }

  // Senate votes: extract numeric part from voteId or use rollNumber
  if (vote.chamber === 'Senate') {
    if (vote.voteId) {
      // Extract from format like "119-senate-00123" or use as-is if numeric
      const match = vote.voteId.match(/(\d+)$/);
      return match?.[1] || null;
    }
    if (vote.rollNumber) return vote.rollNumber.toString();
  }

  return null;
};

// Memoized vote calculation utilities
const calculateVoteStats = (votes: Vote[]) => {
  const yesVotes = votes.filter(vote => vote.position === 'Yea').length;
  const nayVotes = votes.filter(vote => vote.position === 'Nay').length;
  const presentVotes = votes.filter(vote => vote.position === 'Present').length;
  const notVotingVotes = votes.filter(vote => vote.position === 'Not Voting').length;
  const keyVotes = votes.filter(vote => vote.category === 'key').length;

  return {
    yesVotes,
    nayVotes,
    presentVotes,
    notVotingVotes,
    keyVotes,
    totalVotes: votes.length,
  };
};

function VotingTabComponent({
  bioguideId,
  sharedData,
  sharedLoading,
  sharedError,
}: VotingTabProps) {
  const router = useRouter();

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [chamberFilter, setChamberFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [votesPerPage, setVotesPerPage] = useState(25);

  // Use shared data if available, otherwise fetch individually
  const {
    data: batchData,
    error: fetchError,
    isLoading: fetchLoading,
  } = useSWR<BatchApiResponse>(
    sharedData ? null : `/api/representative/${bioguideId}/batch`,
    sharedData
      ? null
      : () =>
          fetch(`/api/representative/${bioguideId}/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoints: ['votes'] }),
          }).then(res => res.json()),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  const data: VoteResponse | undefined = sharedData || batchData?.data?.votes;
  const error = sharedError || fetchError;
  const isLoading = sharedLoading || fetchLoading;

  // Apply filters before early returns to ensure hooks are called consistently
  const filteredVotes = useMemo(() => {
    if (!data?.votes) return [];

    let filtered = data.votes;

    // Position filter
    if (positionFilter !== 'all') {
      filtered = filtered.filter(vote => vote.position === positionFilter);
    }

    // Chamber filter
    if (chamberFilter !== 'all') {
      filtered = filtered.filter(vote => vote.chamber === chamberFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'key') {
        filtered = filtered.filter(vote => vote.isKeyVote || vote.category === 'key');
      } else {
        filtered = filtered.filter(vote => vote.category === categoryFilter);
      }
    }

    // Date filter
    if (dateFilter.start || dateFilter.end) {
      filtered = filtered.filter(vote => {
        if (!vote.date) return false;
        const voteDate = new Date(vote.date);
        const startDate = dateFilter.start ? new Date(dateFilter.start) : null;
        const endDate = dateFilter.end ? new Date(dateFilter.end) : null;

        if (startDate && voteDate < startDate) return false;
        if (endDate && voteDate > endDate) return false;
        return true;
      });
    }

    return filtered;
  }, [data?.votes, positionFilter, chamberFilter, categoryFilter, dateFilter]);

  // Reset to first page when filters change - must be before early returns
  React.useEffect(() => {
    setCurrentPage(1);
  }, [positionFilter, chamberFilter, categoryFilter, dateFilter]);

  // Use filtered votes for calculations - moved before early returns
  const votes = filteredVotes;

  // Memoized vote statistics calculations - only recalculate when votes change
  const voteStats = useMemo(() => {
    return calculateVoteStats(votes);
  }, [votes]);

  const { yesVotes, nayVotes, presentVotes, notVotingVotes, keyVotes, totalVotes } = voteStats;

  // Memoized pagination calculations
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(totalVotes / votesPerPage);
    const startIndex = (currentPage - 1) * votesPerPage;
    const endIndex = startIndex + votesPerPage;
    const paginatedVotes = votes.slice(startIndex, endIndex);

    return {
      totalPages,
      startIndex,
      endIndex,
      paginatedVotes,
    };
  }, [votes, totalVotes, votesPerPage, currentPage]);

  // Handle vote row click (unified for both chambers) - memoized to prevent recreating
  const handleVoteClick = useCallback(
    (vote: Vote) => {
      const voteId = extractVoteId(vote);
      if (voteId) {
        router.push(`/vote/${voteId}`);
      }
    },
    [router]
  );

  // Memoized filter handlers to prevent unnecessary re-renders
  const handlePositionFilterChange = useCallback((value: string) => {
    setPositionFilter(value);
  }, []);

  const handleChamberFilterChange = useCallback((value: string) => {
    setChamberFilter(value);
  }, []);

  const handleCategoryFilterChange = useCallback((value: string) => {
    setCategoryFilter(value);
  }, []);

  const handleDateFilterChange = useCallback((field: 'start' | 'end', value: string) => {
    setDateFilter(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setPositionFilter('all');
    setChamberFilter('all');
    setCategoryFilter('all');
    setDateFilter({ start: '', end: '' });
  }, []);

  const handleVotesPerPageChange = useCallback((value: number) => {
    setVotesPerPage(value);
    setCurrentPage(1);
  }, []);

  // Memoized pagination handlers
  const handlePageClick = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, paginationData.totalPages));
  }, [paginationData.totalPages]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-5 gap-4">
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-6 bg-gray-100 rounded"></div>
          <div className="h-6 bg-gray-100 rounded"></div>
          <div className="h-6 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    // Enhanced error handling for Phase 3: Differentiate API vs parsing failures
    const isApiError = error.message?.includes('API') || error.message?.includes('fetch');
    const isParsingError = error.message?.includes('parsing') || error.message?.includes('XML');

    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">
          {isParsingError
            ? 'Voting data processing issue'
            : isApiError
              ? 'Failed to load voting records'
              : 'Voting records temporarily unavailable'}
        </div>
        <div className="text-sm text-gray-500 mb-4">
          {isParsingError
            ? 'XML parsing improvements were recently deployed. Some older votes may be temporarily affected.'
            : isApiError
              ? 'Please check your connection and try refreshing the page'
              : 'Please try refreshing the page'}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Retry Loading
          </button>
          <button
            onClick={() => {
              // Force cache bypass by adding timestamp
              const url = new URL(window.location.href);
              url.searchParams.set('refresh', Date.now().toString());
              window.location.href = url.toString();
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Force Refresh
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.votes) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 mb-2">No voting records available</div>
        <div className="text-sm text-gray-400 mb-4">
          Voting data is sourced from Congress.gov and Senate XML feeds
        </div>
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 max-w-md mx-auto">
          <div className="font-medium mb-1">Phase 3 Update:</div>
          <div>
            House voting XML parsing was recently improved. If you expect to see voting data, please
            try refreshing the page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="voting-record">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Interactive Voting Analysis</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {(positionFilter !== 'all' ||
            chamberFilter !== 'all' ||
            categoryFilter !== 'all' ||
            dateFilter.start ||
            dateFilter.end) && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full">
              {
                [
                  positionFilter !== 'all',
                  chamberFilter !== 'all',
                  categoryFilter !== 'all',
                  dateFilter.start || dateFilter.end,
                ].filter(Boolean).length
              }
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Position Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CheckCircle className="inline h-4 w-4 mr-1" />
                Position
              </label>
              <select
                value={positionFilter}
                onChange={e => handlePositionFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Positions</option>
                <option value="Yea">Yea</option>
                <option value="Nay">Nay</option>
                <option value="Present">Present</option>
                <option value="Not Voting">Not Voting</option>
              </select>
            </div>

            {/* Chamber Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MinusCircle className="inline h-4 w-4 mr-1" />
                Chamber
              </label>
              <select
                value={chamberFilter}
                onChange={e => handleChamberFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Chambers</option>
                <option value="House">House</option>
                <option value="Senate">Senate</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={e => handleCategoryFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="key">Key Votes</option>
                <option value="Other">Regular Votes</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date Range
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={dateFilter.start}
                  onChange={e => handleDateFilterChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={dateFilter.end}
                  onChange={e => handleDateFilterChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="End date"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(positionFilter !== 'all' ||
            chamberFilter !== 'all' ||
            categoryFilter !== 'all' ||
            dateFilter.start ||
            dateFilter.end) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phase 4 Defensive UI: Data Quality Indicator */}
      {data?.success === false || data?.error ? (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="font-medium">Partial data available</div>
              <div className="text-xs text-yellow-700 mt-1">
                Some voting records may not display due to recent XML parsing improvements.
                {data?.error && ` Error: ${data.error}`}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="text-center">
          <div className="text-3xl font-bold">{totalVotes}</div>
          <div className="text-sm text-gray-500">Total Votes</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">{yesVotes}</div>
          <div className="text-sm text-gray-500">Yes</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-red-600">{nayVotes}</div>
          <div className="text-sm text-gray-500">Nay</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{presentVotes}</div>
          <div className="text-sm text-gray-500">Present</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{keyVotes}</div>
          <div className="text-sm text-gray-500">Key Votes</div>
        </div>
      </div>

      {/* Position Bars */}
      <h3 className="font-medium mb-3">Position Distribution</h3>
      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-3">
          <span className="w-20 text-sm">Yes</span>
          <div className="flex-1 bg-gray-200 rounded h-6">
            <div
              className="bg-green-500 h-6 rounded"
              style={{
                width: totalVotes > 0 ? `${(yesVotes / totalVotes) * 100}%` : '0%',
              }}
            ></div>
          </div>
          <span className="text-sm">
            {totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-20 text-sm">Nay</span>
          <div className="flex-1 bg-gray-200 rounded h-6">
            <div
              className="bg-red-500 h-6 rounded"
              style={{
                width: totalVotes > 0 ? `${(nayVotes / totalVotes) * 100}%` : '0%',
              }}
            ></div>
          </div>
          <span className="text-sm">
            {totalVotes > 0 ? Math.round((nayVotes / totalVotes) * 100) : 0}%
          </span>
        </div>
        {presentVotes > 0 && (
          <div className="flex items-center gap-3">
            <span className="w-20 text-sm">Present</span>
            <div className="flex-1 bg-gray-200 rounded h-6">
              <div
                className="bg-yellow-500 h-6 rounded"
                style={{
                  width: totalVotes > 0 ? `${(presentVotes / totalVotes) * 100}%` : '0%',
                }}
              ></div>
            </div>
            <span className="text-sm">
              {totalVotes > 0 ? Math.round((presentVotes / totalVotes) * 100) : 0}%
            </span>
          </div>
        )}
        {notVotingVotes > 0 && (
          <div className="flex items-center gap-3">
            <span className="w-20 text-sm">Not Voting</span>
            <div className="flex-1 bg-gray-200 rounded h-6">
              <div
                className="bg-gray-500 h-6 rounded"
                style={{
                  width: totalVotes > 0 ? `${(notVotingVotes / totalVotes) * 100}%` : '0%',
                }}
              ></div>
            </div>
            <span className="text-sm">
              {totalVotes > 0 ? Math.round((notVotingVotes / totalVotes) * 100) : 0}%
            </span>
          </div>
        )}
      </div>

      {/* Phase 4 Debug: Cache Status Indicator (dev only) */}
      {process.env.NODE_ENV === 'development' && data && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <div className="font-mono">
            Cache: {data.dataSource || 'unknown'} | Success: {data.success ? '✓' : '✗'} | Votes:{' '}
            {data.votes?.length || 0} | Total: {data.totalResults || 'unknown'}
          </div>
        </div>
      )}

      {/* Recent Votes */}
      <h3 className="font-medium mb-3">Recent Voting Record</h3>
      {votes.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No voting data available</p>
      ) : (
        <div className="overflow-x-auto">
          {filteredVotes.length !== (data?.votes?.length || 0) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Showing {filteredVotes.length} of {data?.votes?.length || 0} votes
                {filteredVotes.length === 0 && ' (try adjusting filters)'}
              </p>
            </div>
          )}
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Bill</th>
                <th className="text-left py-2">Description</th>
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">Position</th>
              </tr>
            </thead>
            <tbody>
              {paginationData.paginatedVotes.map((vote: Vote) => {
                const voteId = extractVoteId(vote);
                const isClickable = !!voteId; // Both chambers now supported

                return (
                  <tr
                    key={vote.voteId}
                    className={`border-b ${isClickable ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
                    onClick={() => isClickable && handleVoteClick(vote)}
                    title={isClickable ? 'Click to view detailed vote breakdown' : ''}
                  >
                    <td className="py-3">
                      {(() => {
                        // Priority order for vote display text:
                        // 1. vote.bill.title (if it's a bill vote)
                        // 2. vote.question (the vote question)
                        // 3. vote.description (additional context)
                        // 4. "Vote" as fallback (not "Voice Vote")
                        const displayText =
                          vote.bill?.title || vote.question || vote.description || 'Vote';

                        // Truncate long text for table display
                        const truncatedText =
                          displayText.length > 60
                            ? `${displayText.substring(0, 57)}...`
                            : displayText;

                        return (
                          <div className="flex flex-col">
                            {vote.bill?.number && (
                              <div className="text-xs text-gray-500 mb-1">
                                {vote.bill.url ? (
                                  <a
                                    href={vote.bill.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    {vote.bill.number}
                                  </a>
                                ) : (
                                  <span>{vote.bill.number}</span>
                                )}
                              </div>
                            )}
                            <span
                              className={`${isClickable ? 'text-blue-600' : ''} line-clamp-2`}
                              title={displayText}
                            >
                              {truncatedText}
                            </span>
                          </div>
                        );
                      })()}
                      {isClickable && <span className="ml-1 text-xs text-gray-400">📊</span>}
                    </td>
                    <td className="py-3 text-sm text-gray-600">
                      {vote.bill?.title || vote.question || vote.description}
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(vote.date).toLocaleDateString()}
                    </td>
                    <td className="text-right py-3">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          vote.position === 'Yea'
                            ? 'bg-green-100 text-green-700'
                            : vote.position === 'Nay'
                              ? 'bg-red-100 text-red-700'
                              : vote.position === 'Present'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {vote.position}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalVotes > votesPerPage && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={votesPerPage}
                onChange={e => handleVotesPerPageChange(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>votes per page</span>
            </div>
            <div className="text-sm text-gray-600">
              Showing {paginationData.startIndex + 1}-
              {Math.min(paginationData.endIndex, totalVotes)} of {totalVotes} votes
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {paginationData.totalPages <= 7 ? (
                // Show all pages if 7 or fewer
                Array.from({ length: paginationData.totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageClick(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))
              ) : (
                // Show truncated pagination for many pages
                <>
                  {currentPage > 3 && (
                    <>
                      <button
                        onClick={() => handlePageClick(1)}
                        className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        1
                      </button>
                      <span className="px-2 text-gray-500">...</span>
                    </>
                  )}

                  {Array.from({ length: Math.min(5, paginationData.totalPages) }, (_, i) => {
                    const page = Math.max(1, currentPage - 2) + i;
                    if (page > paginationData.totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageClick(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          page === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  {currentPage < paginationData.totalPages - 2 && (
                    <>
                      <span className="px-2 text-gray-500">...</span>
                      <button
                        onClick={() => handlePageClick(paginationData.totalPages)}
                        className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {paginationData.totalPages}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === paginationData.totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Memoized component with custom comparison
export const VotingTab = React.memo(VotingTabComponent, (prevProps, nextProps) => {
  // Only re-render if essential props change
  return (
    prevProps.bioguideId === nextProps.bioguideId &&
    prevProps.sharedLoading === nextProps.sharedLoading &&
    prevProps.sharedError === nextProps.sharedError &&
    // Deep comparison for shared data to prevent unnecessary re-renders
    JSON.stringify(prevProps.sharedData?.votes) === JSON.stringify(nextProps.sharedData?.votes)
  );
});
