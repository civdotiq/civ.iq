/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { EmptyState } from '@/shared/components/ui/EmptyState';
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
import { ExportButton } from '@/shared/components/ui/ExportButton';
import { ExportColumn } from '@/lib/utils/data-export';
import { VoteRow, extractVoteId, type Vote } from './VoteRow';
import { VotePatternSection } from './VotePatternSection';

/**
 * Bridge for ExportButton which requires Record<string, unknown>.
 * Structured types like Vote are Record<string, unknown> at runtime but
 * TypeScript doesn't infer the index signature. A single narrowing cast
 * (not double "as unknown as") bridges this safely.
 */
function widenToRecord<T extends object>(data: T[]): (T & Record<string, unknown>)[] {
  return data as (T & Record<string, unknown>)[];
}
function widenColumns<T extends object>(
  cols: ExportColumn<T>[]
): ExportColumn<T & Record<string, unknown>>[] {
  return cols as ExportColumn<T & Record<string, unknown>>[];
}

export interface VoteResponse {
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

// Export column definitions for voting data
const voteExportColumns: ExportColumn<Vote>[] = [
  { key: 'rollNumber', label: 'Roll Number' },
  { key: 'date', label: 'Date' },
  { key: 'chamber', label: 'Chamber' },
  { key: 'question', label: 'Question' },
  { key: 'result', label: 'Result' },
  { key: 'position', label: 'Position' },
  {
    key: 'bill.number',
    label: 'Bill Number',
    format: (_, row) => row.bill?.number ?? '',
  },
  {
    key: 'bill.title',
    label: 'Bill Title',
    format: (_, row) => row.bill?.title ?? '',
  },
  { key: 'description', label: 'Description' },
];

const VotingTabComponent = React.memo(
  ({ bioguideId, sharedData, sharedLoading, sharedError }: VotingTabProps) => {
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
    // Only skip individual fetch if we have sharedData OR sharedLoading is true (batch is in progress)
    // If batch failed (sharedError), we should fetch individually
    const shouldFetchIndividually = !sharedData && (!sharedLoading || sharedError);

    const {
      data: batchData,
      error: fetchError,
      isLoading: fetchLoading,
    } = useSWR<BatchApiResponse>(
      shouldFetchIndividually ? `/api/representative/${bioguideId}/batch` : null,
      shouldFetchIndividually
        ? () =>
            fetch(`/api/representative/${bioguideId}/batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoints: ['votes'] }),
            }).then(res => res.json())
        : null,
      {
        revalidateOnFocus: false,
        dedupingInterval: 60000, // Cache for 1 minute
      }
    );

    const data: VoteResponse | undefined = sharedData || batchData?.data?.votes;
    const error = sharedError || fetchError;
    const isLoading = (sharedLoading && !sharedError) || fetchLoading;

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
          // Include representative context for breadcrumb navigation
          const memberName = data?.member?.name;
          const queryParams = memberName
            ? `?from=${bioguideId}&name=${encodeURIComponent(memberName)}`
            : '';
          router.push(`/vote/${voteId}${queryParams}`);
        }
      },
      [router, bioguideId, data?.member?.name]
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
          <div className="h-8 bg-gray-200 w-1/3"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <div className="h-16 bg-white border-2 border-gray-300"></div>
            <div className="h-16 bg-white border-2 border-gray-300"></div>
            <div className="h-16 bg-white border-2 border-gray-300"></div>
            <div className="h-16 bg-white border-2 border-gray-300"></div>
            <div className="h-16 bg-white border-2 border-gray-300"></div>
          </div>
          <div className="space-y-2">
            <div className="h-6 bg-white border-2 border-gray-300"></div>
            <div className="h-6 bg-white border-2 border-gray-300"></div>
            <div className="h-6 bg-white border-2 border-gray-300"></div>
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
          <div className="text-civiq-red mb-2">
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
              className="px-4 py-2 text-sm font-medium text-white bg-civiq-blue hover:bg-civiq-blue focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
            >
              Force Refresh
            </button>
          </div>
        </div>
      );
    }

    if (!data || !data.votes) {
      return (
        <EmptyState
          title="No voting records found"
          description="No voting records found for this representative in the current session. Data is sourced from Congress.gov and Senate XML feeds."
          action={{ label: 'Refresh', onClick: () => window.location.reload() }}
        />
      );
    }

    return (
      <div data-testid="voting-record">
        <p className="text-sm text-gray-500 mb-grid-3 border-l-2 border-gray-200 pl-grid-2">
          Roll call votes only. Voice votes and committee votes are not shown here. This also skips
          the talks that shape what reaches the floor.
        </p>

        {/* AI Vote Pattern Analysis */}
        <VotePatternSection bioguideId={bioguideId} />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Interactive Voting Analysis</h2>
          <div className="flex items-center gap-2">
            <ExportButton
              data={widenToRecord(filteredVotes)}
              columns={widenColumns(voteExportColumns)}
              filename={`voting-record-${bioguideId}`}
              description={`Voting record for ${data?.member?.name ?? bioguideId}`}
              ariaLabel="Export voting records"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {(positionFilter !== 'all' ||
                chamberFilter !== 'all' ||
                categoryFilter !== 'all' ||
                dateFilter.start ||
                dateFilter.end) && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-civiq-blue">
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
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-white border">
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
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:border-transparent text-sm"
                    placeholder="Start date"
                  />
                  <input
                    type="date"
                    value={dateFilter.end}
                    onChange={e => handleDateFilterChange('end', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:border-transparent text-sm"
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
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
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
          <div className="mb-4 p-3 bg-gray-100 border border-gray-300">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-lg font-bold text-gray-600">!</span>
              <div>
                <div className="font-medium">Partial data available</div>
                <div className="text-xs text-gray-600 mt-1">
                  Some voting records may not display due to recent XML parsing improvements.
                  {data?.error && ` Error: ${data.error}`}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Vote Attendance Summary */}
        {notVotingVotes > 0 && (
          <div className="mb-6 p-4 bg-gray-50 border-2 border-black">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">Vote Attendance Record</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Voted in {totalVotes - notVotingVotes} of {totalVotes} recorded votes
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${
                      ((totalVotes - notVotingVotes) / totalVotes) * 100 >= 95
                        ? 'text-civiq-green'
                        : ((totalVotes - notVotingVotes) / totalVotes) * 100 >= 80
                          ? 'text-gray-600'
                          : 'text-civiq-red'
                    }`}
                  >
                    {totalVotes > 0
                      ? Math.round(((totalVotes - notVotingVotes) / totalVotes) * 100)
                      : 0}
                    %
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Attendance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400">{notVotingVotes}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Missed</div>
                </div>
              </div>
            </div>
            {/* Attendance bar */}
            <div className="mt-3 h-2 bg-gray-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  ((totalVotes - notVotingVotes) / totalVotes) * 100 >= 95
                    ? 'bg-civiq-green'
                    : ((totalVotes - notVotingVotes) / totalVotes) * 100 >= 80
                      ? 'bg-gray-500'
                      : 'bg-civiq-red'
                }`}
                style={{
                  width:
                    totalVotes > 0
                      ? `${((totalVotes - notVotingVotes) / totalVotes) * 100}%`
                      : '0%',
                }}
              />
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold">{totalVotes}</div>
            <div className="text-sm text-gray-500">Total Votes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-civiq-green">{yesVotes}</div>
            <div className="text-sm text-gray-500">Yea</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-civiq-red">{nayVotes}</div>
            <div className="text-sm text-gray-500">Nay</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-600">{presentVotes}</div>
            <div className="text-sm text-gray-500">Present</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-civiq-blue">{keyVotes}</div>
            <div className="text-sm text-gray-500">Key Votes</div>
          </div>
        </div>

        {/* Position Bars */}
        <h3 className="font-medium mb-3">Position Distribution</h3>
        <div className="space-y-2 mb-8">
          <div className="flex items-center gap-3">
            <span className="w-20 text-sm">Yes</span>
            <div className="flex-1 bg-gray-200 h-6">
              <div
                className="bg-civiq-green h-6"
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
            <div className="flex-1 bg-gray-200 h-6">
              <div
                className="bg-civiq-red h-6"
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
              <div className="flex-1 bg-gray-200 h-6">
                <div
                  className="bg-gray-500 h-6"
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
              <div className="flex-1 bg-gray-200 h-6">
                <div
                  className="bg-white0 h-6"
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
          <div className="mb-4 p-2 bg-civiq-blue/10 border border-civiq-blue text-xs text-civiq-blue">
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
          <div className="relative">
            {filteredVotes.length !== (data?.votes?.length || 0) && (
              <div className="mb-4 p-3 bg-civiq-blue/10 border border-civiq-blue">
                <p className="text-sm text-civiq-blue">
                  Showing {filteredVotes.length} of {data?.votes?.length || 0} votes
                  {filteredVotes.length === 0 && ' (try adjusting filters)'}
                </p>
              </div>
            )}
            <div className="overflow-x-auto border border-gray-200 border-2 border-black">
              <table className="w-full border-collapse bg-white" style={{ minWidth: '900px' }}>
                <thead>
                  <tr className="bg-white border-b-2 border-gray-200">
                    <th
                      className="text-left py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap"
                      style={{ width: '80px', minWidth: '80px' }}
                    >
                      Roll
                    </th>
                    <th
                      className="text-left py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap"
                      style={{ width: '100px', minWidth: '100px' }}
                    >
                      Date
                    </th>
                    <th
                      className="text-left py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider"
                      style={{ width: '25%', minWidth: '200px' }}
                    >
                      Question
                    </th>
                    <th
                      className="text-left py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap"
                      style={{ width: '120px', minWidth: '120px' }}
                    >
                      Result
                    </th>
                    <th
                      className="text-left py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider"
                      style={{ width: '35%', minWidth: '250px' }}
                    >
                      Title/Description
                    </th>
                    <th
                      className="text-center py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap"
                      style={{ width: '100px', minWidth: '100px' }}
                    >
                      Vote
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginationData.paginatedVotes.map((vote: Vote, index: number) => (
                    <VoteRow
                      key={vote.voteId}
                      vote={vote}
                      index={index}
                      isClickable={!!extractVoteId(vote)}
                      onVoteClick={handleVoteClick}
                    />
                  ))}
                </tbody>
              </table>
            </div>
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
                  className="px-3 py-2 min-h-[44px] border border-gray-300 focus:outline-none focus:ring-2 focus:ring-civiq-blue"
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
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className={`px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2 ${
                        page === currentPage
                          ? 'bg-civiq-blue text-white'
                          : 'text-gray-600 bg-white border border-gray-300 hover:bg-white'
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
                          className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
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
                          className={`px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2 ${
                            page === currentPage
                              ? 'bg-civiq-blue text-white'
                              : 'text-gray-600 bg-white border border-gray-300 hover:bg-white'
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
                          className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
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
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
);

// Export with display name for debugging
VotingTabComponent.displayName = 'VotingTab';
export const VotingTab = VotingTabComponent;
