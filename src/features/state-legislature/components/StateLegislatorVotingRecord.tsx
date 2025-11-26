/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Filter, X, Calendar, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { encodeBase64Url } from '@/lib/url-encoding';

interface PersonVote {
  vote_id: string;
  identifier: string;
  motion_text: string;
  start_date: string;
  result: 'pass' | 'fail' | 'passed' | 'failed';
  option: 'yes' | 'no' | 'abstain' | 'not voting' | 'absent' | 'excused';
  bill_identifier: string | null;
  bill_title: string | null;
  bill_id: string | null;
  organization_name: string;
  chamber: 'upper' | 'lower';
}

interface VotesApiResponse {
  success: boolean;
  votes: PersonVote[];
  total: number;
  page: number;
  per_page: number;
  legislator: {
    id: string;
    name: string;
  };
  statistics: {
    total: number;
    yes: number;
    no: number;
    abstain: number;
    absent: number;
    partyAlignment?: number;
  };
}

interface StateLegislatorVotingRecordProps {
  state: string;
  legislatorId: string;
  legislatorName: string;
}

export const StateLegislatorVotingRecord: React.FC<StateLegislatorVotingRecordProps> = ({
  state,
  legislatorId,
  legislatorName,
}) => {
  // Filter states (matching federal VotingTab pattern)
  const [showFilters, setShowFilters] = useState(false);
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [votesPerPage, setVotesPerPage] = useState(25);

  const base64Id = encodeBase64Url(legislatorId);

  // Fetch votes from API
  const { data, error, isLoading } = useSWR<VotesApiResponse>(
    `/api/state-legislature/${state}/legislator/${base64Id}/votes?page=1&per_page=100`,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000,
    }
  );

  // Apply filters before early returns to ensure hooks are called consistently
  const filteredVotes = useMemo(() => {
    if (!data?.votes) return [];

    let filtered = data.votes;

    // Position filter
    if (positionFilter !== 'all') {
      if (positionFilter === 'yes') {
        filtered = filtered.filter(vote => vote.option === 'yes');
      } else if (positionFilter === 'no') {
        filtered = filtered.filter(vote => vote.option === 'no');
      } else if (positionFilter === 'abstain') {
        filtered = filtered.filter(vote =>
          ['abstain', 'not voting', 'absent', 'excused'].includes(vote.option)
        );
      }
    }

    // Date filter
    if (dateFilter.start || dateFilter.end) {
      filtered = filtered.filter(vote => {
        if (!vote.start_date) return false;
        const voteDate = new Date(vote.start_date);
        const startDate = dateFilter.start ? new Date(dateFilter.start) : null;
        const endDate = dateFilter.end ? new Date(dateFilter.end) : null;

        if (startDate && voteDate < startDate) return false;
        if (endDate && voteDate > endDate) return false;
        return true;
      });
    }

    return filtered;
  }, [data?.votes, positionFilter, dateFilter]);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [positionFilter, dateFilter]);

  // Memoized vote statistics
  const voteStats = useMemo(() => {
    const votes = filteredVotes;
    const yesVotes = votes.filter(v => v.option === 'yes').length;
    const noVotes = votes.filter(v => v.option === 'no').length;
    const abstainVotes = votes.filter(v =>
      ['abstain', 'not voting', 'absent', 'excused'].includes(v.option)
    ).length;

    return {
      yesVotes,
      noVotes,
      abstainVotes,
      totalVotes: votes.length,
    };
  }, [filteredVotes]);

  // Memoized pagination calculations
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(voteStats.totalVotes / votesPerPage);
    const startIndex = (currentPage - 1) * votesPerPage;
    const endIndex = startIndex + votesPerPage;
    const paginatedVotes = filteredVotes.slice(startIndex, endIndex);

    return {
      totalPages,
      startIndex,
      endIndex,
      paginatedVotes,
    };
  }, [filteredVotes, voteStats.totalVotes, votesPerPage, currentPage]);

  // Memoized handlers
  const handlePositionFilterChange = useCallback((value: string) => {
    setPositionFilter(value);
  }, []);

  const handleDateFilterChange = useCallback((field: 'start' | 'end', value: string) => {
    setDateFilter(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setPositionFilter('all');
    setDateFilter({ start: '', end: '' });
  }, []);

  const handleVotesPerPageChange = useCallback((value: number) => {
    setVotesPerPage(value);
    setCurrentPage(1);
  }, []);

  const handlePageClick = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, paginationData.totalPages));
  }, [paginationData.totalPages]);

  // Loading state (matching federal pattern)
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-5 gap-4">
          <div className="h-16 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-16 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-16 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-16 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-16 bg-white border-2 border-gray-300 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-6 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-6 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-6 bg-white border-2 border-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">Failed to load voting records</div>
        <div className="text-sm text-gray-500 mb-4">
          Voting data may not be available for all state legislators.
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  // No data state
  if (!data || !data.votes || data.votes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 mb-2">No voting records available</div>
        <div className="text-sm text-gray-400">
          {legislatorName}&apos;s voting records are not yet available from OpenStates.
        </div>
      </div>
    );
  }

  const stats = data.statistics;
  const { yesVotes, noVotes, abstainVotes, totalVotes } = voteStats;

  // Calculate percentages
  const yesPercent = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;
  const noPercent = totalVotes > 0 ? Math.round((noVotes / totalVotes) * 100) : 0;
  const abstainPercent = totalVotes > 0 ? Math.round((abstainVotes / totalVotes) * 100) : 0;

  return (
    <div data-testid="voting-record">
      {/* Header with Filter Toggle (matching federal pattern) */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Interactive Voting Analysis</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {(positionFilter !== 'all' || dateFilter.start || dateFilter.end) && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full">
              {
                [positionFilter !== 'all', dateFilter.start || dateFilter.end].filter(Boolean)
                  .length
              }
            </span>
          )}
        </button>
      </div>

      {/* Collapsible Filter Panel (matching federal pattern) */}
      {showFilters && (
        <div className="mb-6 p-4 bg-white border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Position Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CheckCircle className="inline h-4 w-4 mr-1" />
                Position
              </label>
              <select
                value={positionFilter}
                onChange={e => handlePositionFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Positions</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="abstain">Abstain/Absent</option>
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
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={dateFilter.end}
                  onChange={e => handleDateFilterChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="End date"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(positionFilter !== 'all' || dateFilter.start || dateFilter.end) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5-Column Metrics Grid (matching federal pattern) */}
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
          <div className="text-3xl font-bold text-red-600">{noVotes}</div>
          <div className="text-sm text-gray-500">No</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{abstainVotes}</div>
          <div className="text-sm text-gray-500">Abstain</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-500">Total (All)</div>
        </div>
      </div>

      {/* Position Distribution Bars (matching federal pattern) */}
      <h3 className="font-medium mb-3">Position Distribution</h3>
      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-3">
          <span className="w-20 text-sm">Yes</span>
          <div className="flex-1 bg-gray-200 rounded h-6">
            <div className="bg-green-500 h-6 rounded" style={{ width: `${yesPercent}%` }}></div>
          </div>
          <span className="text-sm w-12 text-right">{yesPercent}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-20 text-sm">No</span>
          <div className="flex-1 bg-gray-200 rounded h-6">
            <div className="bg-red-500 h-6 rounded" style={{ width: `${noPercent}%` }}></div>
          </div>
          <span className="text-sm w-12 text-right">{noPercent}%</span>
        </div>
        {abstainVotes > 0 && (
          <div className="flex items-center gap-3">
            <span className="w-20 text-sm">Abstain</span>
            <div className="flex-1 bg-gray-200 rounded h-6">
              <div
                className="bg-yellow-500 h-6 rounded"
                style={{ width: `${abstainPercent}%` }}
              ></div>
            </div>
            <span className="text-sm w-12 text-right">{abstainPercent}%</span>
          </div>
        )}
      </div>

      {/* Recent Votes Table (matching federal pattern) */}
      <h3 className="font-medium mb-3">Recent Voting Record</h3>
      {filteredVotes.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No votes match the selected filter.</p>
      ) : (
        <div className="relative">
          {filteredVotes.length !== (data?.votes?.length || 0) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800">
                Showing {filteredVotes.length} of {data?.votes?.length || 0} votes
                {filteredVotes.length === 0 && ' (try adjusting filters)'}
              </p>
            </div>
          )}
          <div className="overflow-x-auto border-2 border-black">
            <table className="w-full border-collapse bg-white" style={{ minWidth: '800px' }}>
              <thead>
                <tr className="bg-white border-b-2 border-gray-200">
                  <th className="text-left py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">
                    Date
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                    Bill
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                    Motion
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">
                    Result
                  </th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700 text-xs uppercase tracking-wider whitespace-nowrap">
                    Vote
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginationData.paginatedVotes.map((vote, index) => (
                  <tr
                    key={`${vote.vote_id}-${index}`}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    {/* Date */}
                    <td className="py-3 px-3 text-sm text-gray-600 align-top whitespace-nowrap">
                      {vote.start_date
                        ? new Date(vote.start_date).toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </td>

                    {/* Bill */}
                    <td className="py-3 px-3 align-top">
                      {vote.bill_identifier ? (
                        vote.bill_id ? (
                          <Link
                            href={`/state-bills/${state}/${encodeBase64Url(vote.bill_id)}`}
                            className="text-blue-600 hover:underline font-medium text-sm"
                          >
                            {vote.bill_identifier}
                          </Link>
                        ) : (
                          <span className="font-medium text-sm">{vote.bill_identifier}</span>
                        )
                      ) : (
                        <span className="text-gray-400 text-sm">Floor Vote</span>
                      )}
                    </td>

                    {/* Motion */}
                    <td className="py-3 px-3 align-top">
                      <span className="text-sm text-gray-900 line-clamp-2" title={vote.motion_text}>
                        {vote.motion_text}
                      </span>
                    </td>

                    {/* Result */}
                    <td className="py-3 px-3 align-top">
                      <span
                        className={`text-sm font-medium whitespace-nowrap ${
                          vote.result === 'pass' || vote.result === 'passed'
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`}
                      >
                        {vote.result === 'pass' || vote.result === 'passed' ? 'Passed' : 'Failed'}
                      </span>
                    </td>

                    {/* Vote Position */}
                    <td className="text-center py-3 px-3 align-top">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          vote.option === 'yes'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : vote.option === 'no'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {vote.option.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls (matching federal pattern) */}
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
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {paginationData.totalPages <= 7 ? (
                Array.from({ length: paginationData.totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageClick(page)}
                    className={`px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))
              ) : (
                <>
                  {currentPage > 3 && (
                    <>
                      <button
                        onClick={() => handlePageClick(1)}
                        className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                        className={`px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
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
                        className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Data Source Note */}
      <p className="text-xs text-gray-500 mt-6 pt-4 border-t border-gray-200">
        Voting data sourced from OpenStates. Some votes may not be available for all states.
      </p>
    </div>
  );
};
