'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect, useMemo, useTransition } from 'react';
import { representativeApi } from '@/lib/api/representatives';

// Using simple Unicode arrows instead of heroicons
const ChevronDownIcon = () => <span>▼</span>;
const ChevronUpIcon = () => <span>▲</span>;

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

export function VotingRecordsTable({ bioguideId, chamber }: VotingRecordsTableProps) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'date' | 'bill' | 'result'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<'all' | 'key' | 'passed' | 'failed'>('all');
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const votesPerPage = 10;

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        console.log(`[CIV.IQ-DEBUG] VotingRecordsTable fetching votes for ${bioguideId}`);
        
        // Use the optimized API client with caching
        const data = await representativeApi.getVotes(bioguideId);
        setVotes(data.votes || []);
      } catch (error) {
        console.error('Error fetching votes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVotes();
  }, [bioguideId]);

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

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'Yea': return 'text-green-700 bg-green-100 border-green-300';
      case 'Nay': return 'text-red-700 bg-red-100 border-red-300';
      case 'Not Voting': return 'text-gray-700 bg-gray-100 border-gray-300';
      case 'Present': return 'text-blue-700 bg-blue-100 border-blue-300';
      default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getResultColor = (result: string) => {
    const lowerResult = result.toLowerCase();
    if (lowerResult.includes('passed') || lowerResult.includes('agreed')) {
      return 'text-green-700';
    } else if (lowerResult.includes('failed') || lowerResult.includes('rejected')) {
      return 'text-red-700';
    }
    return 'text-gray-700';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (votes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-600">No voting records available at this time.</p>
      </div>
    );
  }

  return (
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

      {/* Table */}
      <div className="overflow-x-auto">
        {/* Show pending indicator during transitions */}
        {isPending && (
          <div className="absolute top-0 left-0 right-0 bg-blue-50 border-b border-blue-200 py-2 px-4 z-10">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <div className="animate-spin w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full"></div>
              Updating results...
            </div>
          </div>
        )}
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <button 
                  onClick={() => handleSort('date')}
                  className="font-medium text-xs uppercase tracking-wider text-gray-700 hover:text-gray-900 flex items-center gap-1"
                >
                  Date
                  {sortField === 'date' && (
                    sortDirection === 'desc' ? <span className="text-xs">▼</span> : <span className="text-xs">▲</span>
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button 
                  onClick={() => handleSort('bill')}
                  className="font-medium text-xs uppercase tracking-wider text-gray-700 hover:text-gray-900 flex items-center gap-1"
                >
                  Bill
                  {sortField === 'bill' && (
                    sortDirection === 'desc' ? <span className="text-xs">▼</span> : <span className="text-xs">▲</span>
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="font-medium text-xs uppercase tracking-wider text-gray-700">
                  Description
                </span>
              </th>
              <th className="px-4 py-3 text-center">
                <span className="font-medium text-xs uppercase tracking-wider text-gray-700">
                  Vote
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <button 
                  onClick={() => handleSort('result')}
                  className="font-medium text-xs uppercase tracking-wider text-gray-700 hover:text-gray-900 flex items-center gap-1"
                >
                  Result
                  {sortField === 'result' && (
                    sortDirection === 'desc' ? <span className="text-xs">▼</span> : <span className="text-xs">▲</span>
                  )}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedVotes.map((vote) => (
              <tr 
                key={vote.voteId} 
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => toggleRowExpansion(vote.voteId)}
              >
                <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">
                  {new Date(vote.date).toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      {vote.bill.number}
                    </span>
                    {vote.isKeyVote && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                        Key Vote
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {vote.bill.title}
                    </p>
                    {expandedRows.has(vote.voteId) && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Question:</span> {vote.question}
                        </p>
                        {vote.rollNumber && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Roll Call:</span> {vote.chamber} Roll #{vote.rollNumber}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${getPositionColor(vote.position)}`}>
                    {vote.position}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`text-sm font-medium ${getResultColor(vote.result)}`}>
                    {vote.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-700">
              Showing {((page - 1) * votesPerPage) + 1} to {Math.min(page * votesPerPage, filteredAndSortedVotes.length)} of {filteredAndSortedVotes.length} votes
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className={`px-3 py-1 text-sm rounded ${
                  page === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 text-sm rounded ${
                        page === pageNum 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && <span className="px-2 text-gray-500">...</span>}
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className={`px-3 py-1 text-sm rounded ${
                  page === totalPages 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}