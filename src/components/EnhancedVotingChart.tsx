'use client';


/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useMemo } from 'react';

interface Vote {
  bill: string;
  title: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
  result: string;
  isKeyVote?: boolean;
}

interface EnhancedVotingChartProps {
  votes: Vote[];
  party: string;
}

export function EnhancedVotingChart({ votes, party }: EnhancedVotingChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | '6months' | '1year'>('all');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'key' | 'passed' | 'failed'>('all');
  const [selectedPosition, setSelectedPosition] = useState<'all' | 'Yea' | 'Nay' | 'Present' | 'Not Voting'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredVote, setHoveredVote] = useState<number | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);

  const filteredVotes = useMemo(() => {
    let filtered = [...votes];
    
    // Time filter
    if (selectedTimeframe !== 'all') {
      const now = new Date();
      const months = selectedTimeframe === '6months' ? 6 : 12;
      const cutoffDate = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
      filtered = filtered.filter(vote => new Date(vote.date) >= cutoffDate);
    }

    // Type filter
    if (selectedFilter === 'key') {
      filtered = filtered.filter(vote => vote.isKeyVote);
    } else if (selectedFilter === 'passed') {
      filtered = filtered.filter(vote => vote.result.toLowerCase().includes('passed'));
    } else if (selectedFilter === 'failed') {
      filtered = filtered.filter(vote => vote.result.toLowerCase().includes('failed'));
    }

    // Position filter
    if (selectedPosition !== 'all') {
      filtered = filtered.filter(vote => vote.position === selectedPosition);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(vote => 
        vote.title.toLowerCase().includes(query) ||
        vote.bill.toLowerCase().includes(query) ||
        vote.result.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [votes, selectedTimeframe, selectedFilter, selectedPosition, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredVotes.length;
    const yea = filteredVotes.filter(v => v.position === 'Yea').length;
    const nay = filteredVotes.filter(v => v.position === 'Nay').length;
    const present = filteredVotes.filter(v => v.position === 'Present').length;
    const notVoting = filteredVotes.filter(v => v.position === 'Not Voting').length;
    const keyVotes = filteredVotes.filter(v => v.isKeyVote).length;
    
    return { total, yea, nay, present, notVoting, keyVotes };
  }, [filteredVotes]);

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'Yea': return 'bg-green-500';
      case 'Nay': return 'bg-red-500';
      case 'Present': return 'bg-blue-500';
      case 'Not Voting': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  const getPositionTextColor = (position: string) => {
    switch (position) {
      case 'Yea': return 'text-green-700 bg-green-50';
      case 'Nay': return 'text-red-700 bg-red-50';
      case 'Present': return 'text-blue-700 bg-blue-50';
      case 'Not Voting': return 'text-gray-700 bg-gray-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Interactive Voting Analysis</h3>
        <button
          onClick={() => setShowDetailedView(!showDetailedView)}
          className="px-3 py-1 text-sm bg-civiq-blue text-white rounded hover:bg-civiq-blue/90 transition-colors"
        >
          {showDetailedView ? 'Summary View' : 'Detailed View'}
        </button>
      </div>

      {/* Enhanced Filter Controls */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
            <select 
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2"
            >
              <option value="all">All Time</option>
              <option value="1year">Past Year</option>
              <option value="6months">Past 6 Months</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vote Type</label>
            <select 
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2"
            >
              <option value="all">All Votes</option>
              <option value="key">Key Votes</option>
              <option value="passed">Passed Bills</option>
              <option value="failed">Failed Bills</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <select 
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value as any)}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2"
            >
              <option value="all">All Positions</option>
              <option value="Yea">Yea</option>
              <option value="Nay">Nay</option>
              <option value="Present">Present</option>
              <option value="Not Voting">Not Voting</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>
        
        {/* Active Filters Display */}
        {(selectedTimeframe !== 'all' || selectedFilter !== 'all' || selectedPosition !== 'all' || searchQuery) && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {selectedTimeframe !== 'all' && (
              <span className="px-2 py-1 bg-civiq-blue text-white text-xs rounded">Time: {selectedTimeframe}</span>
            )}
            {selectedFilter !== 'all' && (
              <span className="px-2 py-1 bg-civiq-blue text-white text-xs rounded">Type: {selectedFilter}</span>
            )}
            {selectedPosition !== 'all' && (
              <span className="px-2 py-1 bg-civiq-blue text-white text-xs rounded">Position: {selectedPosition}</span>
            )}
            {searchQuery && (
              <span className="px-2 py-1 bg-civiq-blue text-white text-xs rounded">Search: "{searchQuery}"</span>
            )}
            <button
              onClick={() => {
                setSelectedTimeframe('all');
                setSelectedFilter('all');
                setSelectedPosition('all');
                setSearchQuery('');
              }}
              className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Votes</div>
          <div className="text-xs text-gray-500 mt-1">
            {filteredVotes.length !== votes.length && `${votes.length} total`}
          </div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.yea}</div>
          <div className="text-sm text-gray-600">Yea</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.total > 0 ? Math.round((stats.yea / stats.total) * 100) : 0}%
          </div>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{stats.nay}</div>
          <div className="text-sm text-gray-600">Nay</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.total > 0 ? Math.round((stats.nay / stats.total) * 100) : 0}%
          </div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.present}</div>
          <div className="text-sm text-gray-600">Present</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%
          </div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{stats.keyVotes}</div>
          <div className="text-sm text-gray-600">Key Votes</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.total > 0 ? Math.round((stats.keyVotes / stats.total) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Vote Pattern Visualization */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Voting Pattern Timeline</h4>
        <div className="flex flex-wrap gap-1">
          {filteredVotes.slice(0, 50).map((vote, index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded cursor-pointer transition-all duration-200 ${getPositionColor(vote.position)} ${
                hoveredVote === index ? 'scale-125 ring-2 ring-gray-400' : ''
              } ${vote.isKeyVote ? 'ring-2 ring-yellow-400' : ''}`}
              onMouseEnter={() => setHoveredVote(index)}
              onMouseLeave={() => setHoveredVote(null)}
              title={`${vote.bill}: ${vote.position} - ${new Date(vote.date).toLocaleDateString()}`}
            />
          ))}
          {filteredVotes.length > 50 && (
            <div className="text-sm text-gray-500 ml-2">+{filteredVotes.length - 50} more</div>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            Yea
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            Nay
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            Present
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            Not Voting
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-300 rounded ring-2 ring-yellow-400"></div>
            Key Vote
          </span>
        </div>
      </div>

      {/* Detailed Vote Tooltip */}
      {hoveredVote !== null && filteredVotes[hoveredVote] && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h5 className="font-medium text-gray-900">{filteredVotes[hoveredVote].title}</h5>
              <p className="text-sm text-gray-600 mt-1">{filteredVotes[hoveredVote].bill}</p>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPositionTextColor(filteredVotes[hoveredVote].position)}`}>
                {filteredVotes[hoveredVote].position}
              </span>
              {filteredVotes[hoveredVote].isKeyVote && (
                <div className="text-xs text-yellow-600 mt-1">⭐ Key Vote</div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
            <span>Result: {filteredVotes[hoveredVote].result}</span>
            <span>{new Date(filteredVotes[hoveredVote].date).toLocaleDateString()}</span>
          </div>
        </div>
      )}

      {/* Position Distribution Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Position Distribution</h4>
          <div className="space-y-2">
            {[
              { label: 'Yea', count: stats.yea, color: 'bg-green-500' },
              { label: 'Nay', count: stats.nay, color: 'bg-red-500' },
              { label: 'Present', count: stats.present, color: 'bg-blue-500' },
              { label: 'Not Voting', count: stats.notVoting, color: 'bg-gray-400' }
            ].filter(item => item.count > 0).map((item) => (
              <div key={item.label} className="flex items-center">
                <div className="w-20 text-sm text-gray-700">{item.label}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-4 mx-3">
                  <div 
                    className={`h-4 rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${(item.count / stats.total) * 100}%` }}
                  />
                </div>
                <div className="w-12 text-sm font-medium text-gray-900 text-right">
                  {item.count}
                </div>
                <div className="w-12 text-sm text-gray-500 text-right">
                  {((item.count / stats.total) * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Party Alignment</h4>
          <div className="text-center">
            <div className="text-3xl font-bold text-civiq-blue mb-2">
              {stats.total > 0 ? Math.round((stats.yea + stats.present) / stats.total * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Supportive Voting Pattern
            </div>
            <div className="text-xs text-gray-500">
              Based on Yea and Present votes as supportive positions
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Vote List */}
      {showDetailedView && (
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Detailed Vote Records ({filteredVotes.length} votes)</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredVotes.map((vote, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-medium text-gray-900">{vote.bill}</h5>
                      {vote.isKeyVote && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">⭐ Key Vote</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{vote.title}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Result: {vote.result}</span>
                      <span>Date: {new Date(vote.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPositionTextColor(vote.position)}`}>
                      {vote.position}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredVotes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-lg mb-2">📊</div>
          <div>No votes found matching the selected criteria.</div>
          <div className="text-sm mt-2">Try adjusting your filters or search terms.</div>
        </div>
      )}

      {filteredVotes.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Showing {filteredVotes.length} of {votes.length} total votes
        </div>
      )}
    </div>
  );
}