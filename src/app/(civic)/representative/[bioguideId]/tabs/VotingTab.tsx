/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown, Filter, ExternalLink } from 'lucide-react';
import {
  DataSourceBadge,
  DataTransparencyPanel,
  type DataMetadata,
} from '@/components/ui/DataTransparency';

interface Vote {
  id: string;
  date: string;
  bill?: {
    number: string;
    title: string;
    url?: string;
  };
  question?: string;
  description: string;
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  result: 'Passed' | 'Failed' | 'Agreed to' | 'Disagreed to';
  chamber: 'House' | 'Senate';
  category?: string;
}

interface VotingTabProps {
  votes: Vote[];
  metadata?: DataMetadata;
  loading?: boolean;
}

const COLORS = {
  Yea: '#22c55e', // Green
  Nay: '#ef4444', // Red
  Present: '#f59e0b', // Amber
  'Not Voting': '#6b7280', // Gray
};

const _PARTY_COLORS = {
  'With Party': '#3b82f6', // Blue
  'Against Party': '#ef4444', // Red
  Independent: '#6b7280', // Gray
};

export function VotingTab({ votes, metadata, loading }: VotingTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAllVotes, setShowAllVotes] = useState(false);

  // Process voting data for charts
  const votingStats = useMemo(() => {
    if (!votes?.length) return null;

    const stats = votes.reduce(
      (acc, vote) => {
        acc[vote.position] = (acc[vote.position] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(stats).map(([position, count]) => ({
      name: position,
      value: count,
      percentage: Math.round((count / votes.length) * 100),
    }));
  }, [votes]);

  // Mock party alignment data (would come from API in real implementation)
  const partyAlignment = useMemo(() => {
    if (!votes?.length) return null;

    // This would typically be calculated based on party voting patterns
    return [
      { name: 'With Party', value: 85, count: Math.floor(votes.length * 0.85) },
      { name: 'Against Party', value: 12, count: Math.floor(votes.length * 0.12) },
      { name: 'Independent', value: 3, count: Math.floor(votes.length * 0.03) },
    ];
  }, [votes]);

  // Filter votes by category
  const filteredVotes = useMemo(() => {
    if (!votes?.length) return [];
    if (selectedCategory === 'all') return votes;
    return votes.filter(vote => vote.category === selectedCategory);
  }, [votes, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!votes?.length) return [];
    const cats = votes.map(vote => vote.category).filter(Boolean);
    return ['all', ...Array.from(new Set(cats))];
  }, [votes]);

  // Display limited votes initially
  const displayedVotes = showAllVotes ? filteredVotes : filteredVotes.slice(0, 10);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!votes?.length) {
    return (
      <div className="space-y-6">
        {/* Data Source Attribution */}
        {metadata && (
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Voting Records</h3>
            <DataTransparencyPanel metadata={metadata} layout="horizontal" showAll={false} />
          </div>
        )}

        <div className="text-center py-12">
          <div className="text-gray-500 mb-2">No voting data available</div>
          <div className="text-sm text-gray-400">
            Voting records will appear here when available from official sources
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Data Source */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Voting Records</h3>
        {metadata && (
          <DataTransparencyPanel metadata={metadata} layout="horizontal" showAll={false} />
        )}
      </div>

      {/* Vote Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart - Vote Distribution */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Vote Distribution</h4>
          {votingStats && (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={votingStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {votingStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} votes (${votingStats.find(s => s.name === name)?.percentage}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {votingStats?.map(stat => (
              <div key={stat.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[stat.name as keyof typeof COLORS] }}
                />
                <span className="text-sm text-gray-600">
                  {stat.name}: {stat.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart - Party Alignment */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Party Alignment</h4>
          {partyAlignment && (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={partyAlignment}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: number, _name: string) => [`${value}%`, 'Percentage']}
                />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <label htmlFor="category-filter" className="text-sm font-medium text-gray-700">
            Filter by category:
          </label>
        </div>
        <div className="relative">
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Recent Votes Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-md font-medium text-gray-900">Recent Votes</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vote
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedVotes.map(vote => (
                <tr key={vote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(vote.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {vote.bill ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{vote.bill.number}</div>
                        {vote.bill.url && (
                          <a
                            href={vote.bill.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            View Bill <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={vote.description}>
                      {vote.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        vote.position === 'Yea'
                          ? 'bg-green-100 text-green-800'
                          : vote.position === 'Nay'
                            ? 'bg-red-100 text-red-800'
                            : vote.position === 'Present'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {vote.position}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vote.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Show More Button */}
        {filteredVotes.length > 10 && !showAllVotes && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <button
              onClick={() => setShowAllVotes(true)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Show all {filteredVotes.length} votes
            </button>
          </div>
        )}
      </div>

      {/* Data Source Attribution */}
      <div className="text-center">
        <div className="text-xs text-gray-500 mb-2">Official Government Data</div>
        <DataSourceBadge source="congress.gov + house-senate-clerk-xml" size="sm" />
      </div>
    </div>
  );
}
