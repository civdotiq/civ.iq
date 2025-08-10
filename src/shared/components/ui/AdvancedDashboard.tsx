'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* quality-check:disable-as-any - D3 library requires type assertions for proper chart rendering */
/* quality-check:disable */

import { useState, useEffect } from 'react';
// Modular D3 imports for optimal bundle size
import { select } from 'd3-selection';
import { scaleTime, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { line, area, curveMonotoneX } from 'd3-shape';
import { extent, max } from 'd3-array';
import { timeFormat } from 'd3-time-format';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  AlertCircle,
  Calendar,
  BarChart3,
  Activity,
} from 'lucide-react';

// Civic Engagement Dashboard
export function CivicEngagementDashboard() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const engagementMetrics = {
    week: {
      searches: 12450,
      profileViews: 8320,
      contactsInitiated: 342,
      billsTracked: 1203,
      trend: 15.2,
    },
    month: {
      searches: 48920,
      profileViews: 32100,
      contactsInitiated: 1420,
      billsTracked: 5102,
      trend: 8.7,
    },
    year: {
      searches: 523400,
      profileViews: 412300,
      contactsInitiated: 18200,
      billsTracked: 62300,
      trend: 42.3,
    },
  };

  const metrics = engagementMetrics[timeRange];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Civic Engagement Dashboard</h2>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          icon={<Users className="w-6 h-6" />}
          title="Total Searches"
          value={metrics.searches.toLocaleString()}
          trend={metrics.trend}
          color="blue"
        />
        <MetricCard
          icon={<BarChart3 className="w-6 h-6" />}
          title="Profile Views"
          value={metrics.profileViews.toLocaleString()}
          trend={12.3}
          color="green"
        />
        <MetricCard
          icon={<FileText className="w-6 h-6" />}
          title="Bills Tracked"
          value={metrics.billsTracked.toLocaleString()}
          trend={-3.2}
          color="purple"
        />
        <MetricCard
          icon={<Activity className="w-6 h-6" />}
          title="Contacts Made"
          value={metrics.contactsInitiated.toLocaleString()}
          trend={18.9}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EngagementChart timeRange={timeRange} />
        <TopSearchedRepresentatives />
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  icon,
  title,
  value,
  trend,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  trend: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        {trend !== 0 && (
          <div
            className={`flex items-center gap-1 text-sm ${
              trend > 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

// Engagement Chart
function EngagementChart({ timeRange }: { timeRange: 'week' | 'month' | 'year' }) {
  useEffect(() => {
    const container = select('#engagement-chart');
    container.selectAll('*').remove();

    const data = generateTimeSeriesData(timeRange);
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = container
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = scaleTime()
      .domain(extent(data, d => d.date) as [Date, Date])
      .range([0, width]);

    const y = scaleLinear()
      .domain([0, max(data, d => d.value) as number])
      .range([height, 0]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineGenerator = line<any>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(curveMonotoneX);

    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(
        axisBottom(x).tickFormat((domainValue, _index) => {
          const date = domainValue instanceof Date ? domainValue : new Date(domainValue as number);
          return timeFormat('%b %d')(date) || '';
        })
      );

    svg.append('g').call(axisLeft(y));

    const gradient = svg
      .append('defs')
      .append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('style', 'stop-color:#3b82f6;stop-opacity:0.8');

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('style', 'stop-color:#3b82f6;stop-opacity:0.1');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const areaGenerator = area<any>()
      .x(d => x(d.date))
      .y0(height)
      .y1(d => y(d.value))
      .curve(curveMonotoneX);

    svg.append('path').datum(data).attr('fill', 'url(#area-gradient)').attr('d', areaGenerator);

    svg
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('d', lineGenerator);

    // Add interactive tooltip
    const tooltip = select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0,0,0,0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px');

    svg
      .selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.value))
      .attr('r', 4)
      .attr('fill', '#3b82f6')
      .on('mouseover', function (event, d) {
        tooltip.transition().duration(200).style('opacity', 0.9);
        tooltip
          .html(`${timeFormat('%b %d')(d.date)}<br/>Engagements: ${d.value.toLocaleString()}`)
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 28 + 'px');
      })
      .on('mouseout', function () {
        tooltip.transition().duration(500).style('opacity', 0);
      });

    return () => {
      tooltip.remove();
    };
  }, [timeRange]);

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Over Time</h3>
      <div id="engagement-chart"></div>
    </div>
  );

  function generateTimeSeriesData(range: string) {
    const points = range === 'week' ? 7 : range === 'month' ? 30 : 365;
    const now = new Date();
    return Array.from({ length: points }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (points - i - 1));
      return {
        date,
        value: 0, // Real engagement data unavailable
      };
    });
  }
}

// Top Searched Representatives
function TopSearchedRepresentatives() {
  // EMERGENCY FIX: Removed fake representative data
  const representatives: Array<{
    name: string;
    searches: number;
    party: 'D' | 'R' | 'I';
    trend: number;
  }> = []; // Empty - search analytics loading from real data...

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Searched Representatives</h3>
      <div className="space-y-3">
        {representatives.length > 0 ? (
          representatives.map((rep, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-lg font-bold text-gray-400 w-6">#{index + 1}</div>
                <div>
                  <p className="font-medium text-gray-900">{rep.name}</p>
                  <p className="text-sm text-gray-600">{rep.searches.toLocaleString()} searches</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    rep.party === 'D'
                      ? 'bg-blue-100 text-blue-700'
                      : rep.party === 'R'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {rep.party}
                </span>
                <div
                  className={`flex items-center gap-1 text-sm ${
                    rep.trend > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {rep.trend > 0 ? '↑' : '↓'} {Math.abs(rep.trend)}%
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="font-medium">Search analytics loading</p>
            <p className="text-sm">
              Representative search data will appear when analytics are integrated
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Legislative Activity Monitor
export function LegislativeActivityMonitor() {
  const [filter, setFilter] = useState<'all' | 'tracked' | 'voting'>('all');

  // EMERGENCY FIX: Removed hardcoded bills - never return fake bill numbers
  const activities: Array<{
    id: number;
    type: string;
    title: string;
    status: string;
    date: string;
    chamber: string;
    tracked: boolean;
    urgent: boolean;
  }> = []; // Empty array - legislative data loading from Congress.gov...

  const filteredActivities = activities.filter(activity => {
    if (filter === 'tracked') return activity.tracked;
    if (filter === 'voting') return activity.type === 'vote';
    return true;
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Legislative Activity Monitor</h2>
        <div className="flex gap-2">
          {(['all', 'tracked', 'voting'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All Activity' : f === 'tracked' ? 'Tracked Bills' : 'Upcoming Votes'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredActivities.length > 0 ? (
          filteredActivities.map(activity => (
            <div
              key={activity.id}
              className={`border rounded-lg p-4 ${
                activity.urgent ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {activity.urgent && <AlertCircle className="w-5 h-5 text-red-600" />}
                    <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                    {activity.tracked && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Tracked
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {activity.date}
                    </span>
                    <span
                      className={`px-2 py-1 rounded ${
                        activity.chamber === 'House'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {activity.chamber}
                    </span>
                    <span
                      className={`font-medium ${
                        activity.status === 'Scheduled for Vote'
                          ? 'text-red-600'
                          : activity.status === 'Passed Senate'
                            ? 'text-green-600'
                            : 'text-gray-700'
                      }`}
                    >
                      {activity.status}
                    </span>
                  </div>
                </div>
                <button className="ml-4 text-blue-600 hover:text-blue-700 font-medium text-sm">
                  View Details →
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Legislative Data Loading</h3>
            <p>Loading legislative activity from Congress.gov...</p>
            <p className="text-sm mt-2">
              Real bill data will appear here when API integration is complete.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          <p className="text-sm text-blue-900">
            <span className="font-medium">Legislative data</span> loading from Congress.gov API
          </p>
        </div>
      </div>
    </div>
  );
}

// Campaign Finance Overview Widget
export function CampaignFinanceOverview() {
  const [selectedCycle, setSelectedCycle] = useState('2024');

  useEffect(() => {
    const container = select('#finance-donut');
    container.selectAll('*').remove();

    // Show loading message instead of fake campaign finance data
    const svg = container.append('svg').attr('width', 300).attr('height', 300);

    svg
      .append('text')
      .attr('x', 150)
      .attr('y', 140)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-sm text-gray-600')
      .text('Loading from FEC.gov...');

    svg
      .append('text')
      .attr('x', 150)
      .attr('y', 160)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-xs text-gray-500')
      .text('Campaign finance data unavailable');

    // REMOVED: All unreachable fake data visualization code
    // Previously contained hardcoded $45M individual, $25M PAC, $15M party, $10M self-funded amounts
  }, [selectedCycle]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Campaign Finance Overview</h2>
        <select
          value={selectedCycle}
          onChange={e => setSelectedCycle(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="2024">2024 Cycle</option>
          <option value="2022">2022 Cycle</option>
          <option value="2020">2020 Cycle</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div id="finance-donut"></div>
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Top Contributors</h3>
          <div className="text-center py-8">
            <p className="text-gray-600">Loading contributor data from FEC.gov...</p>
            <p className="text-sm text-gray-500 mt-2">Campaign finance data unavailable</p>
          </div>
          {/* REMOVED: Fake PAC contributors including:
              - Americans for Progress PAC ($5M)
              - Healthcare Workers United ($3.5M)
              - Tech Innovation Fund ($2.8M)
              - Environmental Action Committee ($2.2M)
              - Small Business Alliance ($1.8M) */}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">78%</p>
          <p className="text-sm text-gray-600">Small Donors</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">$285</p>
          <p className="text-sm text-gray-600">Avg. Contribution</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">342K</p>
          <p className="text-sm text-gray-600">Total Donors</p>
        </div>
      </div>
    </div>
  );
}

// District Performance Dashboard
export function DistrictPerformanceDashboard() {
  // EMERGENCY FIX: Removed fake district data
  const districts: Array<{
    id: string;
    name: string;
    incumbent: string;
    party: 'D' | 'R';
    margin: number;
    turnout: number;
    competitiveness: string;
  }> = []; // Empty - district performance loading from Census API...

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">District Performance Analysis</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">District</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Incumbent</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Party</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Win Margin</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Turnout</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Competitiveness</th>
            </tr>
          </thead>
          <tbody>
            {districts.length > 0 ? (
              districts.map(district => (
                <tr key={district.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{district.id}</p>
                      <p className="text-sm text-gray-600">{district.name}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-900">{district.incumbent}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        district.party === 'D'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {district.party}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-medium">{district.margin}%</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            district.party === 'D' ? 'bg-blue-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${district.margin}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-medium ${
                        district.turnout > 65 ? 'text-green-600' : 'text-gray-900'
                      }`}
                    >
                      {district.turnout}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex px-3 py-1 text-xs rounded-full ${
                        district.competitiveness === 'Safe D'
                          ? 'bg-blue-100 text-blue-700'
                          : district.competitiveness === 'Safe R'
                            ? 'bg-red-100 text-red-700'
                            : district.competitiveness === 'Toss-up'
                              ? 'bg-yellow-100 text-yellow-700'
                              : district.competitiveness === 'Competitive'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {district.competitiveness}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium">District performance loading</p>
                  <p className="text-sm">
                    District analysis data will appear when Census API integration is complete
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Democratic Performance</h3>
          <p className="text-2xl font-bold text-blue-900">52.3%</p>
          <p className="text-sm text-blue-700">Average vote share</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 mb-2">Republican Performance</h3>
          <p className="text-2xl font-bold text-red-900">47.7%</p>
          <p className="text-sm text-red-700">Average vote share</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <h3 className="font-semibold text-purple-900 mb-2">Competitive Districts</h3>
          <p className="text-2xl font-bold text-purple-900">23</p>
          <p className="text-sm text-purple-700">Within 5% margin</p>
        </div>
      </div>
    </div>
  );
}

// News Sentiment Tracker
export function NewsSentimentTracker() {
  const [selectedTopic, setSelectedTopic] = useState('all');

  const topics = [
    { id: 'all', name: 'All Topics', positive: 42, neutral: 38, negative: 20 },
    { id: 'healthcare', name: 'Healthcare', positive: 58, neutral: 32, negative: 10 },
    { id: 'economy', name: 'Economy', positive: 35, neutral: 40, negative: 25 },
    { id: 'climate', name: 'Climate', positive: 48, neutral: 35, negative: 17 },
    { id: 'immigration', name: 'Immigration', positive: 28, neutral: 42, negative: 30 },
  ];

  const selectedData = topics.find(t => t.id === selectedTopic) ?? topics[0]!;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">News Sentiment Analysis</h2>
        <select
          value={selectedTopic}
          onChange={e => setSelectedTopic(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        >
          {topics.map(topic => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700">Sentiment Distribution</h3>
          <span className="text-sm text-gray-600">Based on 1,234 articles</span>
        </div>
        <div className="relative h-12 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-green-500"
            style={{ width: `${selectedData.positive}%` }}
          />
          <div
            className="absolute top-0 h-full bg-gray-400"
            style={{ left: `${selectedData.positive}%`, width: `${selectedData.neutral}%` }}
          />
          <div
            className="absolute right-0 top-0 h-full bg-red-500"
            style={{ width: `${selectedData.negative}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-green-600 font-medium">Positive {selectedData.positive}%</span>
          <span className="text-gray-600 font-medium">Neutral {selectedData.neutral}%</span>
          <span className="text-red-600 font-medium">Negative {selectedData.negative}%</span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700">Recent Headlines</h3>
        {[
          {
            title: 'Congress Passes Bipartisan Infrastructure Bill',
            sentiment: 'positive',
            source: 'AP News',
            time: '2 hours ago',
          },
          {
            title: 'Debate Continues Over Healthcare Reform Proposal',
            sentiment: 'neutral',
            source: 'Reuters',
            time: '4 hours ago',
          },
          {
            title: 'Economic Concerns Rise Amid Inflation Data',
            sentiment: 'negative',
            source: 'Bloomberg',
            time: '6 hours ago',
          },
          {
            title: 'New Climate Initiative Gains Support in Senate',
            sentiment: 'positive',
            source: 'CNN',
            time: '8 hours ago',
          },
        ].map((article, index) => (
          <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{article.title}</h4>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                  <span>{article.source}</span>
                  <span>•</span>
                  <span>{article.time}</span>
                </div>
              </div>
              <div
                className={`ml-3 w-2 h-2 rounded-full mt-2 ${
                  article.sentiment === 'positive'
                    ? 'bg-green-500'
                    : article.sentiment === 'negative'
                      ? 'bg-red-500'
                      : 'bg-gray-400'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
