'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useMemo, useTransition, useCallback, CSSProperties, memo } from 'react';
import { VariableSizeList as List } from 'react-window';
import Link from 'next/link';
import useSWR from 'swr';
import { representativeApi } from '@/lib/api/representatives';
import { TouchPagination } from '@/shared/components/ui/ResponsiveTable';
import { VotingRecordsSkeleton } from '@/shared/components/ui/SkeletonComponents';
import { LoadingStateWrapper } from '@/shared/components/ui/LoadingStates';
import { ApiErrorHandlers } from '@/lib/errors/ErrorHandlers';
import logger from '@/lib/logging/simple-logger';

// Using simple Unicode arrows instead of heroicons (unused but available for future use)
const _ChevronDownIcon = () => <span>▼</span>;
const _ChevronUpIcon = () => <span>▲</span>;

interface Vote {
  voteId: string;
  bill: {
    number: string;
    title: string;
    congress: string;
  };
  question: string;
  result: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
  chamber: 'House' | 'Senate';
  rollNumber?: number;
  isKeyVote?: boolean;
  description?: string;
}

interface VotingRecordsTableProps {
  bioguideId: string;
  chamber: 'House' | 'Senate';
}

interface VotesListProps {
  votes: Vote[];
  expandedRows: Set<string>;
  toggleRowExpansion: (voteId: string) => void;
  getPositionColor: (position: string) => string;
  getResultColor: (result: string) => string;
}

// Virtual scrolling component for votes - memoized for performance
const VotesList = memo(
  ({
    votes,
    expandedRows,
    toggleRowExpansion,
    getPositionColor,
    getResultColor,
  }: VotesListProps) => {
    const VoteRow = useCallback(
      ({ index, style }: { index: number; style: CSSProperties }) => {
        const vote = votes[index];
        if (!vote) return null;
        const isExpanded = expandedRows.has(vote.voteId);

        return (
          <div style={style} className="px-1 py-1">
            <div
              className={`bg-white rounded-lg border transition-all duration-200 cursor-pointer ${
                isExpanded ? 'border-civiq-blue shadow-md' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => toggleRowExpansion(vote.voteId)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Link
                        href={`/bill/${vote.bill.number}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {vote.bill.number}
                      </Link>
                      {vote.isKeyVote && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                          Key Vote
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/bill/${vote.bill.number}`}
                      className="block text-gray-900 font-medium mb-2 line-clamp-2 hover:text-blue-600 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      {vote.bill.title}
                    </Link>
                    <div className="text-sm text-gray-600">
                      {new Date(vote.date).toLocaleDateString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${getPositionColor(vote.position)}`}
                    >
                      {vote.position}
                    </span>
                    <span className={`text-sm font-medium ${getResultColor(vote.result)}`}>
                      {vote.result}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Question:</span> {vote.question}
                      </p>
                      {vote.rollNumber && (
                        <p>
                          <span className="font-medium">Roll Call:</span> {vote.chamber} Roll #
                          {vote.rollNumber}
                        </p>
                      )}
                      {vote.description && (
                        <p>
                          <span className="font-medium">Description:</span> {vote.description}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Congress:</span> {vote.bill.congress}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      },
      [votes, expandedRows, toggleRowExpansion, getPositionColor, getResultColor]
    );

    // Don't render anything if no votes
    if (!votes || votes.length === 0) {
      return <div className="text-center py-4 text-gray-500">No voting records to display</div>;
    }

    // Calculate item height based on whether it's expanded
    const getItemSize = (index: number) => {
      const vote = votes[index];
      if (!vote) return 120;
      const isExpanded = expandedRows.has(vote.voteId);
      return isExpanded ? 200 : 120; // Approximate heights
    };

    return (
      <div className="bg-gray-50 rounded-lg p-2">
        <List
          height={600} // Max height of the list container
          itemCount={votes.length}
          itemSize={getItemSize}
          width="100%"
        >
          {VoteRow}
        </List>
      </div>
    );
  }
);

VotesList.displayName = 'VotesList';

export const VotingRecordsTable = memo(function VotingRecordsTable({
  bioguideId,
  chamber: _chamber,
}: VotingRecordsTableProps) {
  const [sortField, setSortField] = useState<'date' | 'bill' | 'result'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<'all' | 'key' | 'passed' | 'failed'>('all');
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const votesPerPage = 10;

  // SWR for voting records with caching
  const {
    data: votesData,
    error,
    isLoading,
  } = useSWR(
    `/api/representative/${bioguideId}/votes`,
    async () => {
      try {
        logger.debug('VotingRecordsTable fetching votes', { bioguideId });
        const data = await representativeApi.getVotes(bioguideId);
        // Handle different response formats
        if (Array.isArray(data)) {
          return data;
        } else if (data && typeof data === 'object' && 'votes' in data) {
          return data.votes || [];
        } else {
          logger.warn('Unexpected votes data format', { data, bioguideId });
          return [];
        }
      } catch (error) {
        logger.error('Error fetching votes', {
          error: error as Error,
          bioguideId,
        });
        // Use our error handler for specific voting records errors
        throw ApiErrorHandlers.handleVotingRecordsError(error, bioguideId);
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 2000,
    }
  );

  // Ensure votes is always an array
  const votes = useMemo(() => {
    if (!votesData) return [];
    if (Array.isArray(votesData)) return votesData;
    return [];
  }, [votesData]);

  const filteredAndSortedVotes = useMemo(() => {
    let filtered = [...votes];

    // Apply category filter
    if (filterCategory === 'key') {
      filtered = filtered.filter(v => v.isKeyVote);
    } else if (filterCategory === 'passed') {
      filtered = filtered.filter(v => v.result.toLowerCase().includes('passed'));
    } else if (filterCategory === 'failed') {
      filtered = filtered.filter(v => v.result.toLowerCase().includes('failed'));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'bill':
          comparison = a.bill.number.localeCompare(b.bill.number);
          break;
        case 'result':
          comparison = a.result.localeCompare(b.result);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [votes, filterCategory, sortField, sortDirection]);

  const paginatedVotes = useMemo(() => {
    const startIndex = (page - 1) * votesPerPage;
    return filteredAndSortedVotes.slice(startIndex, startIndex + votesPerPage);
  }, [filteredAndSortedVotes, page]);

  const totalPages = Math.ceil(filteredAndSortedVotes.length / votesPerPage);

  const _handleSort = (field: 'date' | 'bill' | 'result') => {
    // Use transition for non-urgent sorting updates
    startTransition(() => {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('desc');
      }
    });
  };

  const handleFilterChange = (category: 'all' | 'key' | 'passed' | 'failed') => {
    // Use transition for non-urgent filter updates
    startTransition(() => {
      setFilterCategory(category);
      setPage(1); // Reset to first page when filtering
    });
  };

  const toggleRowExpansion = (voteId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(voteId)) {
      newExpanded.delete(voteId);
    } else {
      newExpanded.add(voteId);
    }
    setExpandedRows(newExpanded);
  };

  const getPositionColor = useCallback((position: string) => {
    switch (position) {
      case 'Yea':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'Nay':
        return 'text-red-700 bg-red-100 border-red-300';
      case 'Not Voting':
        return 'text-gray-700 bg-gray-100 border-gray-300';
      case 'Present':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  }, []);

  const getResultColor = useCallback((result: string) => {
    const lowerResult = result.toLowerCase();
    if (lowerResult.includes('passed') || lowerResult.includes('agreed')) {
      return 'text-green-700';
    } else if (lowerResult.includes('failed') || lowerResult.includes('rejected')) {
      return 'text-red-700';
    }
    return 'text-gray-700';
  }, []);

  return (
    <LoadingStateWrapper
      loading={isLoading}
      error={error}
      retry={() => window.location.reload()}
      loadingComponent={<VotingRecordsSkeleton rows={votesPerPage} />}
      loadingMessage="Loading voting records..."
      timeoutMessage="Voting records are taking longer than usual to load"
    >
      {votes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">No voting records available at this time.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Header with filters */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Votes</h3>
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Filter by Category:</span>
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filterCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All Categories
                </button>
                <button
                  onClick={() => handleFilterChange('key')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filterCategory === 'key'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Key Votes
                </button>
                <button
                  onClick={() => handleFilterChange('passed')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filterCategory === 'passed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Passed
                </button>
                <button
                  onClick={() => handleFilterChange('failed')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filterCategory === 'failed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Failed
                </button>
              </div>
            </div>
          </div>

          {/* Show pending indicator during transitions */}
          {isPending && (
            <div className="absolute top-0 left-0 right-0 bg-blue-50 border-b border-blue-200 py-2 px-4 z-10">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <div className="animate-spin w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full"></div>
                Updating results...
              </div>
            </div>
          )}

          {/* Virtual Scrolling Votes List */}
          {paginatedVotes.length > 0 && (
            <VotesList
              votes={paginatedVotes}
              expandedRows={expandedRows}
              toggleRowExpansion={toggleRowExpansion}
              getPositionColor={getPositionColor}
              getResultColor={getResultColor}
            />
          )}

          {/* Touch-Friendly Pagination */}
          {totalPages > 1 && (
            <TouchPagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              itemsShown={`Showing ${(page - 1) * votesPerPage + 1} to ${Math.min(page * votesPerPage, filteredAndSortedVotes.length)} of ${filteredAndSortedVotes.length} votes`}
              totalItems={filteredAndSortedVotes.length}
            />
          )}
        </div>
      )}
    </LoadingStateWrapper>
  );
  // Early return if no bioguideId - moved after hooks to avoid hook order issues
  if (!bioguideId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-600">Invalid representative ID</p>
      </div>
    );
  }

  return (
    <LoadingStateWrapper
      loading={isLoading}
      error={error}
      retry={() => window.location.reload()}
      loadingComponent={<VotingRecordsSkeleton rows={votesPerPage} />}
      loadingMessage="Loading voting records..."
      timeoutMessage="Voting records are taking longer than usual to load"
    >
      {votes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">No voting records available at this time.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Header with filters */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Votes</h3>
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Filter by Category:</span>
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filterCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All Categories
                </button>
                <button
                  onClick={() => handleFilterChange('key')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filterCategory === 'key'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Key Votes
                </button>
                <button
                  onClick={() => handleFilterChange('passed')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filterCategory === 'passed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Passed
                </button>
                <button
                  onClick={() => handleFilterChange('failed')}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    filterCategory === 'failed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Failed
                </button>
              </div>
            </div>
          </div>

          {/* Show pending indicator during transitions */}
          {isPending && (
            <div className="absolute top-0 left-0 right-0 bg-blue-50 border-b border-blue-200 py-2 px-4 z-10">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <div className="animate-spin w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full"></div>
                Updating results...
              </div>
            </div>
          )}

          {/* Virtual Scrolling Votes List */}
          {paginatedVotes.length > 0 && (
            <VotesList
              votes={paginatedVotes}
              expandedRows={expandedRows}
              toggleRowExpansion={toggleRowExpansion}
              getPositionColor={getPositionColor}
              getResultColor={getResultColor}
            />
          )}

          {/* Touch-Friendly Pagination */}
          {totalPages > 1 && (
            <TouchPagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              itemsShown={`Showing ${(page - 1) * votesPerPage + 1} to ${Math.min(page * votesPerPage, filteredAndSortedVotes.length)} of ${filteredAndSortedVotes.length} votes`}
              totalItems={filteredAndSortedVotes.length}
            />
          )}
        </div>
      )}
    </LoadingStateWrapper>
  );
});

// Default export for dynamic imports
export default VotingRecordsTable;
