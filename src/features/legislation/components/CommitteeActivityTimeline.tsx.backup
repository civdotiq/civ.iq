/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logging/logger-client';

interface TimelineItem {
  id: string;
  type: 'bill' | 'report' | 'hearing' | 'markup' | 'vote' | 'amendment';
  date: string;
  title: string;
  description: string;
  metadata: {
    billNumber?: string;
    reportNumber?: string;
    sponsor?: string;
    voteResult?: {
      yeas: number;
      nays: number;
    };
    status?: string;
    url?: string;
    committeeId?: string;
  };
  relatedItems?: string[];
  importance: 'high' | 'medium' | 'low';
}

interface TimelineStats {
  totalItems: number;
  billsCount: number;
  reportsCount: number;
  hearingsCount: number;
  markupsCount: number;
  votesCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  activityByMonth: Record<string, number>;
  mostActiveMonth: string;
}

interface CommitteeActivityTimelineProps {
  committeeId: string;
  initialTimeline: TimelineItem[];
  initialStats: TimelineStats;
}

export default function CommitteeActivityTimeline({
  committeeId,
  initialTimeline,
  initialStats,
}: CommitteeActivityTimelineProps) {
  const [filter, setFilter] = useState<'all' | 'bills' | 'reports'>('all');
  const [timeline, setTimeline] = useState(initialTimeline);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const getTimelineIcon = (type: TimelineItem['type']) => {
    switch (type) {
      case 'bill':
        return '📋';
      case 'report':
        return '📊';
      case 'hearing':
        return '👥';
      case 'markup':
        return '✏️';
      case 'vote':
        return '🗳️';
      case 'amendment':
        return '📝';
      default:
        return '•';
    }
  };

  const getImportanceColor = (importance: TimelineItem['importance']) => {
    switch (importance) {
      case 'high':
        return 'border-red-500 bg-red-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-gray-400 bg-gray-50';
      default:
        return 'border-gray-400 bg-gray-50';
    }
  };

  const formatMonthYear = (dateStr: string) => {
    const date = new Date(dateStr + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    const fetchFilteredTimeline = async () => {
      if (filter === 'all' && timeline === initialTimeline) return;

      setLoading(true);
      try {
        const response = await fetch(
          `/api/committee/${committeeId}/timeline?filter=${filter}&limit=${expanded ? 50 : 20}`
        );
        if (response.ok) {
          const data = await response.json();
          setTimeline(data.timeline || []);
          setStats(data.stats || initialStats);
        }
      } catch (error) {
        logger.error('Error fetching filtered timeline:', error as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, expanded, committeeId]);

  const displayedItems = expanded ? timeline : timeline.slice(0, 10);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Activity Timeline</h2>
        <div className="flex items-center space-x-4">
          {/* Filter Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({stats.totalItems})
            </button>
            <button
              onClick={() => setFilter('bills')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === 'bills'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bills ({stats.billsCount})
            </button>
            <button
              onClick={() => setFilter('reports')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === 'reports'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Reports ({stats.reportsCount})
            </button>
          </div>
        </div>
      </div>

      {/* Activity Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.billsCount}</div>
          <div className="text-xs text-gray-600">Bills</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.reportsCount}</div>
          <div className="text-xs text-gray-600">Reports</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.hearingsCount}</div>
          <div className="text-xs text-gray-600">Hearings</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.markupsCount}</div>
          <div className="text-xs text-gray-600">Markups</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.votesCount}</div>
          <div className="text-xs text-gray-600">Votes</div>
        </div>
      </div>

      {/* Most Active Month */}
      {stats.mostActiveMonth && (
        <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
          <span className="font-semibold">Most Active Month:</span>{' '}
          {formatMonthYear(stats.mostActiveMonth)}({stats.activityByMonth[stats.mostActiveMonth]}{' '}
          activities)
        </div>
      )}

      {/* Timeline Items */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading timeline...</div>
      ) : (
        <div className="space-y-3">
          {displayedItems.map(item => (
            <div
              key={item.id}
              className={`border-l-4 p-3 rounded ${getImportanceColor(item.importance)}`}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg flex-shrink-0">{getTimelineIcon(item.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    <span className="text-sm text-gray-500">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                  {item.metadata.voteResult && (
                    <div className="text-xs text-gray-600 mt-1">
                      Vote: {item.metadata.voteResult.yeas}-{item.metadata.voteResult.nays}
                    </div>
                  )}
                  {item.metadata.url && (
                    <a
                      href={item.metadata.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                    >
                      View Details →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Show More/Less Button */}
          {timeline.length > 10 && (
            <div className="text-center pt-4">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {expanded ? 'Show Less' : `Show All ${timeline.length} Activities`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
