'use client';


/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';

interface VotingTrendData {
  year: number;
  month: number;
  period: string;
  totalVotes: number;
  partyLoyaltyScore: number;
  votesWithParty: number;
  votesAgainstParty: number;
  abstentions: number;
  keyLegislation: {
    billsSupported: number;
    billsOpposed: number;
    significantVotes: Array<{
      bill: string;
      title: string;
      position: 'For' | 'Against' | 'Not Voting';
      date: string;
      significance: 'high' | 'medium' | 'low';
    }>;
  };
}

interface VotingTrendsResponse {
  bioguideId: string;
  period: string;
  trends: VotingTrendData[];
  summary: {
    totalPeriods: number;
    averageVotesPerPeriod: number;
    averagePartyLoyalty: number;
    trendDirection: string;
  };
}

interface VotingTrendsChartProps {
  bioguideId: string;
  years?: number;
  className?: string;
}

export function VotingTrendsChart({ bioguideId, years = 5, className = '' }: VotingTrendsChartProps) {
  const [data, setData] = useState<VotingTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [metric, setMetric] = useState<'loyalty' | 'activity' | 'positions'>('loyalty');

  useEffect(() => {
    const fetchVotingTrends = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/voting-trends?bioguideId=${bioguideId}&years=${years}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch voting trends data');
        }
        
        const trendsData = await response.json();
        setData(trendsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load voting trends');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVotingTrends();
  }, [bioguideId, years]);

  const renderChart = () => {
    if (!data) return null;

    const chartData = data.trends.map(trend => ({
      period: trend.period,
      year: trend.year,
      partyLoyalty: trend.partyLoyaltyScore,
      totalVotes: trend.totalVotes,
      votesWithParty: trend.votesWithParty,
      votesAgainstParty: trend.votesAgainstParty,
      abstentions: trend.abstentions,
      billsSupported: trend.keyLegislation.billsSupported,
      billsOpposed: trend.keyLegislation.billsOpposed
    }));

    const chartProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    if (metric === 'loyalty') {
      if (chartType === 'line') {
        return (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="period" 
              stroke="#666"
              fontSize={12}
              tick={{ fill: '#666' }}
            />
            <YAxis 
              domain={[0, 100]}
              stroke="#666"
              fontSize={12}
              tick={{ fill: '#666' }}
              label={{ value: 'Party Loyalty %', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
              formatter={(value: number) => [`${value}%`, 'Party Loyalty']}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="partyLoyalty" 
              stroke="#3ea2d4" 
              strokeWidth={3}
              dot={{ fill: '#3ea2d4', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3ea2d4', strokeWidth: 2 }}
              name="Party Loyalty Score"
            />
          </LineChart>
        );
      } else if (chartType === 'area') {
        return (
          <AreaChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" stroke="#666" fontSize={12} />
            <YAxis domain={[0, 100]} stroke="#666" fontSize={12} />
            <Tooltip formatter={(value: number) => [`${value}%`, 'Party Loyalty']} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="partyLoyalty" 
              stroke="#3ea2d4" 
              fill="#3ea2d4" 
              fillOpacity={0.3}
              name="Party Loyalty Score"
            />
          </AreaChart>
        );
      }
    } else if (metric === 'activity') {
      return (
        <BarChart {...chartProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" stroke="#666" fontSize={12} />
          <YAxis stroke="#666" fontSize={12} label={{ value: 'Votes', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="totalVotes" fill="#0b983c" name="Total Votes" />
        </BarChart>
      );
    } else if (metric === 'positions') {
      return (
        <AreaChart {...chartProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" stroke="#666" fontSize={12} />
          <YAxis stroke="#666" fontSize={12} />
          <Tooltip />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="votesWithParty" 
            stackId="1" 
            stroke="#0b983c" 
            fill="#0b983c" 
            name="With Party"
          />
          <Area 
            type="monotone" 
            dataKey="votesAgainstParty" 
            stackId="1" 
            stroke="#e11d07" 
            fill="#e11d07" 
            name="Against Party"
          />
          <Area 
            type="monotone" 
            dataKey="abstentions" 
            stackId="1" 
            stroke="#gray" 
            fill="#gray" 
            name="Abstentions"
          />
        </AreaChart>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Voting Trends</h3>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">{error || 'Unable to load voting trends'}</div>
          <p className="text-sm text-gray-400">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Voting Trends</h3>
          <div className="flex items-center gap-4">
            {/* Metric Selector */}
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as 'loyalty' | 'activity' | 'positions')}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="loyalty">Party Loyalty</option>
              <option value="activity">Voting Activity</option>
              <option value="positions">Vote Positions</option>
            </select>
            
            {/* Chart Type Selector */}
            <div className="flex border border-gray-300 rounded overflow-hidden">
              {(['line', 'area', 'bar'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1 text-sm capitalize ${
                    chartType === type
                      ? 'bg-civiq-blue text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-civiq-blue">{data.summary.averagePartyLoyalty}%</div>
            <div className="text-sm text-gray-600">Avg Party Loyalty</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-civiq-green">{data.summary.averageVotesPerPeriod}</div>
            <div className="text-sm text-gray-600">Avg Votes/Quarter</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">{data.summary.totalPeriods}</div>
            <div className="text-sm text-gray-600">Quarters Tracked</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              data.summary.trendDirection === 'increasing' ? 'text-civiq-green' : 
              data.summary.trendDirection === 'decreasing' ? 'text-civiq-red' : 'text-gray-600'
            }`}>
              {data.summary.trendDirection === 'increasing' ? '↗' : 
               data.summary.trendDirection === 'decreasing' ? '↘' : '→'}
            </div>
            <div className="text-sm text-gray-600">Trend Direction</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart() || <div />}
          </ResponsiveContainer>
        </div>

        {/* Data Insights */}
        {data.trends.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="font-medium text-gray-900 mb-3">Recent Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Latest Quarter:</span>
                <span className="ml-2 font-medium">
                  {data.trends[data.trends.length - 1].period} - 
                  {data.trends[data.trends.length - 1].partyLoyaltyScore}% loyalty
                </span>
              </div>
              <div>
                <span className="text-gray-600">Most Active Period:</span>
                <span className="ml-2 font-medium">
                  {data.trends.reduce((max, current) => 
                    current.totalVotes > max.totalVotes ? current : max
                  ).period}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}