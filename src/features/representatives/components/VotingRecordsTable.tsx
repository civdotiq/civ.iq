'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useMemo, useTransition, useCallback, CSSProperties, memo } from 'react';
import { VariableSizeList as List } from 'react-window';
import Link from 'next/link';
import useSWR from 'swr';
import { TouchPagination } from '@/shared/components/ui/ResponsiveTable';
import { LoadingState } from '@/components/shared/ui/LoadingState';
import { LoadingStateWrapper } from '@/shared/components/ui/LoadingStates';
import { ApiErrorHandlers } from '@/lib/errors/ErrorHandlers';
import logger from '@/lib/logging/simple-logger';
import GlossaryLink from '@/components/shared/ui/GlossaryLink';
import { buildBillUrl } from '@/lib/helpers/url-builders';

// Using simple Unicode arrows instead of heroicons (unused but available for future use)
const _ChevronDownIcon = () => <span>▼</span>;
const _ChevronUpIcon = () => <span>▲</span>;

interface Vote {
  voteId: string;
  bill: {
    number: string;
    title: string;
    congress: string;
    type?: string;
  };
  question: string;
  result: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
  chamber: 'House' | 'Senate';
  rollNumber?: number;
  isKeyVote?: boolean;
  description?: string;
  congressUrl?: string; // Direct link to Congress.gov vote page
  // Enhanced context fields for meaningful political insight
  total?: {
    yes: number;
    no: number;
    not_voting: number;
    present: number;
  };
  party_breakdown?: {
    democratic: { yes: number; no: number; not_voting: number; present: number };
    republican: { yes: number; no: number; not_voting: number; present: number };
    independent?: { yes: number; no: number; not_voting: number; present: number };
  };
}

interface VotingRecordsTableProps {
  bioguideId: string;
  chamber: 'House' | 'Senate';
  representativeName?: string; // For breadcrumb navigation context
}

interface VotesListProps {
  votes: Vote[];
  expandedRows: Set<string>;
  toggleRowExpansion: (voteId: string) => void;
  getPositionColor: (position: string) => string;
  getResultColor: (result: string) => string;
  bioguideId?: string;
  representativeName?: string;
}

// Virtual scrolling component for votes - memoized for performance
const VotesList = memo(
  ({
    votes,
    expandedRows,
    toggleRowExpansion,
    getPositionColor,
    getResultColor,
    bioguideId,
    representativeName,
  }: VotesListProps) => {
    const VoteRow = useCallback(
      ({ index, style }: { index: number; style: CSSProperties }) => {
        const vote = votes[index];
        if (!vote) return null;
        const isExpanded = expandedRows.has(vote.voteId);

        return (
          <div style={style} className="px-3 py-2">
            <div
              className={`aicher-card aicher-hover transition-all duration-200 cursor-pointer ${
                isExpanded
                  ? 'border-civiq-blue border-2 border-black'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => toggleRowExpansion(vote.voteId)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <Link
                        href={`${buildBillUrl(vote.bill.congress, vote.bill.type ?? 'hr', vote.bill.number)}${representativeName ? `?from=${bioguideId}&name=${encodeURIComponent(representativeName)}` : ''}`}
                        className="text-sm font-medium text-civiq-blue hover:text-civiq-blue hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {vote.bill.number}
                      </Link>
                      {vote.congressUrl && (
                        <a
                          href={vote.congressUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-civiq-green hover:text-civiq-green hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          <span>View on Congress.gov</span>
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                      {vote.isKeyVote && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                          Key Vote
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/bill/${vote.bill.number.replace(/\s+/g, '')}${representativeName ? `?from=${bioguideId}&name=${encodeURIComponent(representativeName)}` : ''}`}
                      className="block text-gray-900 font-medium mb-3 line-clamp-2 hover:text-civiq-blue transition-colors leading-relaxed"
                      onClick={e => e.stopPropagation()}
                    >
                      {vote.bill.title}
                    </Link>
                    <div className="text-sm text-gray-600 mb-1">
                      {new Date(vote.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 ml-6">
                    <span
                      className={`aicher-button px-3 py-1.5 aicher-heading text-sm aicher-no-radius ${getPositionColor(vote.position)}`}
                    >
                      {vote.position}
                    </span>
                    <div className="text-right">
                      <span
                        className={`aicher-heading text-sm font-medium ${getResultColor(vote.result)} block`}
                      >
                        {vote.result}
                      </span>
                      {vote.total && (
                        <div className="text-xs text-gray-500 mt-1">
                          {vote.total.yes} Yea • {vote.total.no} Nay
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 aicher-border-t border-gray-200">
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="space-y-3">
                        <div className="bg-gray-50 p-3">
                          <p className="leading-relaxed text-sm">
                            <span className="font-medium text-gray-900">Question:</span>{' '}
                            {vote.question}
                          </p>
                        </div>

                        {vote.rollNumber && vote.rollNumber > 0 && (
                          <p className="leading-relaxed">
                            <span className="font-medium text-gray-900">
                              <GlossaryLink term="Roll Call Vote">Roll Call</GlossaryLink>:
                            </span>{' '}
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1">
                              {vote.chamber} Roll #{vote.rollNumber}
                            </span>
                          </p>
                        )}

                        {vote.description && vote.description !== vote.question && (
                          <p className="leading-relaxed">
                            <span className="font-medium text-gray-900">Description:</span>{' '}
                            {vote.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-sm">
                          <p>
                            <span className="font-medium text-gray-900">Congress:</span>{' '}
                            <span className="font-mono bg-gray-100 px-2 py-1">
                              {vote.bill.congress}th Congress
                            </span>
                          </p>

                          {vote.congressUrl && (
                            <a
                              href={vote.congressUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-civiq-blue hover:bg-civiq-blue transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              <span>Official Vote Record</span>
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                          )}
                        </div>

                        {vote.total && (
                          <div className="bg-civiq-blue/10 p-3">
                            <h4 className="font-medium text-gray-900 mb-2">Final Tally</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="text-civiq-green">
                                <span className="font-medium">{vote.total.yes}</span> Yea
                              </div>
                              <div className="text-civiq-red">
                                <span className="font-medium">{vote.total.no}</span> Nay
                              </div>
                              {vote.total.present > 0 && (
                                <div className="text-civiq-blue">
                                  <span className="font-medium">{vote.total.present}</span> Present
                                </div>
                              )}
                              {vote.total.not_voting > 0 && (
                                <div className="text-gray-600">
                                  <span className="font-medium">{vote.total.not_voting}</span> Not
                                  Voting
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {vote.party_breakdown && (
                          <div className="bg-gray-50 p-3">
                            <h4 className="font-medium text-gray-900 mb-2">Party Breakdown</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-civiq-blue font-medium">Democratic:</span>
                                <span>
                                  {vote.party_breakdown.democratic.yes} Yea,{' '}
                                  {vote.party_breakdown.democratic.no} Nay
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-civiq-red font-medium">Republican:</span>
                                <span>
                                  {vote.party_breakdown.republican.yes} Yea,{' '}
                                  {vote.party_breakdown.republican.no} Nay
                                </span>
                              </div>
                              {vote.party_breakdown.independent && (
                                <div className="flex justify-between">
                                  <span className="text-civiq-green font-medium">Independent:</span>
                                  <span>
                                    {vote.party_breakdown.independent.yes} Yea,{' '}
                                    {vote.party_breakdown.independent.no} Nay
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="border-t border-gray-200 pt-3 mt-2 flex items-center justify-between">
                          <p className="text-xs text-gray-500 flex-1">
                            <strong>What this means:</strong> This vote determines the official
                            position of Congress members on the proposed legislation.
                            {vote.result.toLowerCase().includes('passed') ||
                            vote.result.toLowerCase().includes('agreed')
                              ? ' The measure was approved and moves forward in the legislative process.'
                              : ' The measure did not receive sufficient support to advance.'}
                          </p>
                          <Link
                            href={`/vote/${vote.voteId}${representativeName ? `?from=${bioguideId}&name=${encodeURIComponent(representativeName)}` : ''}`}
                            className="ml-4 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border-2 border-black text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0"
                            onClick={e => e.stopPropagation()}
                          >
                            Full vote details →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      },
      [
        votes,
        expandedRows,
        toggleRowExpansion,
        getPositionColor,
        getResultColor,
        bioguideId,
        representativeName,
      ]
    );

    // Don't render anything if no votes
    if (!votes || votes.length === 0) {
      return <div className="text-center py-4 text-gray-500">No voting records to display</div>;
    }

    // Calculate item height based on whether it's expanded
    const getItemSize = (index: number) => {
      const vote = votes[index];
      if (!vote) return 140;
      const isExpanded = expandedRows.has(vote.voteId);
      return isExpanded ? 240 : 140; // Increased heights for better spacing
    };

    return (
      <div className="bg-white p-4">
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
  representativeName: _representativeName, // Optional: for breadcrumb context (not yet wired through all components)
}: VotingRecordsTableProps) {
  const [sortField, setSortField] = useState<'date' | 'bill' | 'result'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<'all' | 'key' | 'passed' | 'failed'>('all');
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const votesPerPage = 25;

  // SWR for voting records with caching
  const {
    data: votesData,
    error,
    isLoading,
  } = useSWR(
    `/api/representative/${bioguideId}/votes?limit=50`,
    async (url: string) => {
      try {
        logger.debug('VotingRecordsTable fetching votes', { bioguideId, url });
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
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

  const handleSort = (field: 'date' | 'bill' | 'result') => {
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
        return 'text-civiq-green bg-civiq-green/10 border-civiq-green';
      case 'Nay':
        return 'text-civiq-red bg-civiq-red/10 border-civiq-red';
      case 'Not Voting':
        return 'text-gray-700 bg-white border-2 border-gray-300 border-gray-300';
      case 'Present':
        return 'text-civiq-blue bg-civiq-blue/10 border-civiq-blue';
      default:
        return 'text-gray-700 bg-white border-2 border-gray-300 border-gray-300';
    }
  }, []);

  const getResultColor = useCallback((result: string) => {
    const lowerResult = result.toLowerCase();
    if (lowerResult.includes('passed') || lowerResult.includes('agreed')) {
      return 'text-civiq-green';
    } else if (lowerResult.includes('failed') || lowerResult.includes('rejected')) {
      return 'text-civiq-red';
    }
    return 'text-gray-700';
  }, []);

  // Early return if no bioguideId - after hooks to follow rules of hooks
  if (!bioguideId) {
    return (
      <div className="aicher-card text-center p-8">
        <p className="text-gray-600">Invalid representative ID</p>
      </div>
    );
  }

  return (
    <LoadingStateWrapper
      loading={isLoading}
      error={error}
      retry={() => window.location.reload()}
      loadingComponent={<LoadingState message="Loading voting records..." />}
      loadingMessage="Loading voting records..."
      timeoutMessage="Voting records are taking longer than usual to load"
    >
      {(() => {
        return votes.length === 0 ? (
          <div className="aicher-card text-center p-8">
            <p className="text-gray-600">No voting records available at this time.</p>
          </div>
        ) : (
          <div className="aicher-card aicher-no-radius overflow-hidden">
            {/* Header with filters */}
            <div className="p-4 border-b border-gray-200 bg-white space-y-3">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Votes</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600">Filter by Category:</span>
                  <button
                    onClick={() => handleFilterChange('all')}
                    className={`px-3 py-1 text-sm transition-colors ${
                      filterCategory === 'all'
                        ? 'bg-civiq-blue text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All Categories
                  </button>
                  <button
                    onClick={() => handleFilterChange('key')}
                    className={`px-3 py-1 text-sm transition-colors ${
                      filterCategory === 'key'
                        ? 'bg-civiq-blue text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Key Votes
                  </button>
                  <button
                    onClick={() => handleFilterChange('passed')}
                    className={`px-3 py-1 text-sm transition-colors ${
                      filterCategory === 'passed'
                        ? 'bg-civiq-blue text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Passed
                  </button>
                  <button
                    onClick={() => handleFilterChange('failed')}
                    className={`px-3 py-1 text-sm transition-colors ${
                      filterCategory === 'failed'
                        ? 'bg-civiq-blue text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Failed
                  </button>
                </div>
              </div>

              {/* Sort Controls */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-600">Sort by:</span>
                <button
                  onClick={() => handleSort('date')}
                  className={`inline-flex items-center gap-1 px-3 py-1 transition-colors ${
                    sortField === 'date'
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  aria-label={`Sort by date ${sortField === 'date' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : ''}`}
                >
                  Date
                  {sortField === 'date' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => handleSort('bill')}
                  className={`inline-flex items-center gap-1 px-3 py-1 transition-colors ${
                    sortField === 'bill'
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  aria-label={`Sort by bill ${sortField === 'bill' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : ''}`}
                >
                  Bill
                  {sortField === 'bill' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
                <button
                  onClick={() => handleSort('result')}
                  className={`inline-flex items-center gap-1 px-3 py-1 transition-colors ${
                    sortField === 'result'
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  aria-label={`Sort by result ${sortField === 'result' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : ''}`}
                >
                  Result
                  {sortField === 'result' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </div>
            </div>

            {/* Show pending indicator during transitions */}
            {isPending && (
              <div className="absolute top-0 left-0 right-0 bg-civiq-blue/10 border-b border-civiq-blue py-2 px-4 z-10">
                <div className="flex items-center gap-2 text-sm text-civiq-blue">
                  <div
                    className="animate-spin w-4 h-4 border-2 border-civiq-blue border-t-transparent"
                    style={{ borderRadius: '50%' }}
                  ></div>
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
        );
      })()}
    </LoadingStateWrapper>
  );
});

// Default export for dynamic imports
export default VotingRecordsTable;
