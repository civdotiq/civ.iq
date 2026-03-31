'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Building,
  BarChart3,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { HemicycleChart } from '@/components/visualizations/HemicycleChart';

interface CongressStatistics {
  total: {
    members: number;
    house: number;
    senate: number;
  };
  byParty: {
    democrat: {
      total: number;
      house: number;
      senate: number;
    };
    republican: {
      total: number;
      house: number;
      senate: number;
    };
    independent: {
      total: number;
      house: number;
      senate: number;
    };
  };
  byState: {
    totalStates: number;
    representationCounts: Record<string, number>;
  };
  session: {
    congress: string;
    period: string;
    startDate: string;
    endDate: string;
  };
}

interface CongressHeaderProps {
  chamber?: 'all' | 'house' | 'senate';
  className?: string;
  onChamberChange?: (chamber: 'all' | 'house' | 'senate') => void;
}

export default function CongressHeader({
  chamber = 'all',
  className = '',
  onChamberChange,
}: CongressHeaderProps) {
  const [statistics, setStatistics] = useState<CongressStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const url =
          chamber === 'all'
            ? '/api/congress/119th/stats'
            : `/api/congress/119th/stats?chamber=${chamber}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch statistics: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'Failed to load statistics');
        }

        setStatistics(data.statistics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, [chamber]);

  const getChamberTitle = () => {
    switch (chamber) {
      case 'house':
        return 'U.S. House of Representatives';
      case 'senate':
        return 'U.S. Senate';
      default:
        return '119th United States Congress';
    }
  };

  const getChamberDescription = () => {
    switch (chamber) {
      case 'house':
        return '435 Representatives serving 2-year terms from districts across all 50 states';
      case 'senate':
        return '100 Senators serving 6-year terms, with 2 senators from each state';
      default:
        return 'The bicameral legislature of the federal government of the United States';
    }
  };

  const getRelevantStats = () => {
    if (!statistics) return null;

    switch (chamber) {
      case 'house':
        return {
          totalMembers: statistics.total.house,
          democrats: statistics.byParty.democrat.house,
          republicans: statistics.byParty.republican.house,
          independents: statistics.byParty.independent.house,
        };
      case 'senate':
        return {
          totalMembers: statistics.total.senate,
          democrats: statistics.byParty.democrat.senate,
          republicans: statistics.byParty.republican.senate,
          independents: statistics.byParty.independent.senate,
        };
      default:
        return {
          totalMembers: statistics.total.members,
          democrats: statistics.byParty.democrat.total,
          republicans: statistics.byParty.republican.total,
          independents: statistics.byParty.independent.total,
        };
    }
  };

  if (isLoading) {
    return (
      <div
        className={`bg-gradient-to-r from-civiq-blue/10 to-indigo-50 border border-civiq-blue p-6 mb-6 ${className}`}
      >
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 bg-civiq-blue/10"></div>
            <div className="w-64 h-6 bg-civiq-blue/10"></div>
          </div>
          <div className="w-full h-4 bg-civiq-blue/10 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-full h-16 bg-civiq-blue/10"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-amber-50 border border-amber-600 p-6 mb-6 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-amber-700">
            Unable to load Congress statistics
          </h3>
        </div>
        <p className="text-sm text-amber-600">{error}</p>
      </div>
    );
  }

  const stats = getRelevantStats();
  if (!stats || !statistics) return null;

  return (
    <div
      className={`bg-gradient-to-r from-civiq-blue/10 to-indigo-50 border border-civiq-blue mb-6 ${className}`}
    >
      {/* Collapsible Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 md:p-6 flex items-center justify-between text-left md:cursor-default"
        aria-expanded={isExpanded}
        aria-controls="congress-stats-content"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-5 h-5 text-civiq-blue flex-shrink-0" />
          <h3 className="text-base md:text-xl font-semibold text-civiq-blue">
            {getChamberTitle()}
          </h3>
          <span className="px-2 py-0.5 bg-civiq-green/10 text-civiq-green text-xs font-medium">
            {statistics.session.period}
          </span>
          {/* Compact stats shown on mobile when collapsed */}
          {!isExpanded && (
            <span className="md:hidden text-xs text-civiq-blue ml-2">
              {stats.totalMembers} members
            </span>
          )}
        </div>
        {/* Expand/Collapse icon - mobile only */}
        <div className="md:hidden flex-shrink-0 ml-2">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-civiq-blue" />
          ) : (
            <ChevronDown className="w-5 h-5 text-civiq-blue" />
          )}
        </div>
      </button>

      {/* Expandable Content */}
      <div
        id="congress-stats-content"
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'max-h-[1000px] opacity-100'
            : 'max-h-0 opacity-0 md:max-h-none md:opacity-100'
        }`}
      >
        <div className="px-4 pb-4 md:px-6 md:pb-6">
          <p className="text-sm text-civiq-blue mb-4">{getChamberDescription()}</p>

          {/* Chamber Navigation */}
          {onChamberChange && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => onChamberChange('all')}
                className={`px-3 md:px-4 py-1.5 md:py-2 transition-colors text-xs md:text-sm font-medium ${
                  chamber === 'all'
                    ? 'bg-civiq-blue text-white'
                    : 'bg-white text-civiq-blue border border-civiq-blue hover:bg-civiq-blue/10'
                }`}
              >
                All Congress
              </button>
              <button
                onClick={() => onChamberChange('house')}
                className={`px-3 md:px-4 py-1.5 md:py-2 transition-colors text-xs md:text-sm font-medium ${
                  chamber === 'house'
                    ? 'bg-civiq-blue text-white'
                    : 'bg-white text-civiq-blue border border-civiq-blue hover:bg-civiq-blue/10'
                }`}
              >
                House
              </button>
              <button
                onClick={() => onChamberChange('senate')}
                className={`px-3 md:px-4 py-1.5 md:py-2 transition-colors text-xs md:text-sm font-medium ${
                  chamber === 'senate'
                    ? 'bg-civiq-blue text-white'
                    : 'bg-white text-civiq-blue border border-civiq-blue hover:bg-civiq-blue/10'
                }`}
              >
                Senate
              </button>
            </div>
          )}

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {/* Total Members */}
            <div className="bg-white p-3 md:p-4 border border-civiq-blue">
              <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                <Building className="w-3 h-3 md:w-4 md:h-4 text-civiq-blue" />
                <span className="text-xs md:text-sm font-medium text-civiq-blue">Total</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-civiq-blue">{stats.totalMembers}</p>
            </div>

            {/* Democrats */}
            <div className="bg-civiq-blue/10 p-3 md:p-4 border border-civiq-blue">
              <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                <BarChart3 className="w-3 h-3 md:w-4 md:h-4 text-civiq-blue" />
                <span className="text-xs md:text-sm font-medium text-civiq-blue">Dems</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-civiq-blue">{stats.democrats}</p>
              <p className="text-[10px] md:text-xs text-civiq-blue">
                {stats.totalMembers > 0
                  ? `${Math.round((stats.democrats / stats.totalMembers) * 100)}%`
                  : '0%'}
              </p>
            </div>

            {/* Republicans */}
            <div className="bg-civiq-red/10 p-3 md:p-4 border border-civiq-red">
              <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                <BarChart3 className="w-3 h-3 md:w-4 md:h-4 text-civiq-red" />
                <span className="text-xs md:text-sm font-medium text-civiq-red">GOP</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-civiq-red">{stats.republicans}</p>
              <p className="text-[10px] md:text-xs text-civiq-red">
                {stats.totalMembers > 0
                  ? `${Math.round((stats.republicans / stats.totalMembers) * 100)}%`
                  : '0%'}
              </p>
            </div>

            {/* Session Info */}
            <div className="bg-white p-3 md:p-4 border border-gray-200">
              <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                <Calendar className="w-3 h-3 md:w-4 md:h-4 text-gray-600" />
                <span className="text-xs md:text-sm font-medium text-gray-900">Session</span>
              </div>
              <p className="text-base md:text-lg font-bold text-gray-800">
                {statistics.session.congress}
              </p>
              <p className="text-[10px] md:text-xs text-gray-600">{statistics.session.period}</p>
            </div>
          </div>

          {/* Additional info for all congress view */}
          {chamber === 'all' && (
            <div className="mt-3 md:mt-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-civiq-blue" />
                <span className="text-civiq-blue">
                  House: {statistics.total.house} • Senate: {statistics.total.senate}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-civiq-blue" />
                <a
                  href="https://www.wikidata.org/wiki/Q113893555"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-civiq-blue hover:text-civiq-blue hover:underline"
                >
                  Wikidata Source
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hemicycle Visualization - only on desktop or when expanded */}
      {(chamber === 'house' || chamber === 'senate') &&
        (isExpanded || typeof window === 'undefined') && (
          <div className={`px-4 pb-4 md:px-6 md:pb-6 ${!isExpanded ? 'hidden md:block' : ''}`}>
            <HemicycleChart
              data={{
                chamber: chamber,
                democrats: stats.democrats,
                republicans: stats.republicans,
                independents: stats.independents,
                totalSeats: stats.totalMembers,
              }}
            />
          </div>
        )}
    </div>
  );
}
