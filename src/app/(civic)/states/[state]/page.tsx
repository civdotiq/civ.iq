'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import clientLogger from '@/lib/logging/logger-client';
import { useParams } from 'next/navigation';
// Modular D3 imports for optimal bundle size
import { select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { lineRadial, curveLinearClosed } from 'd3-shape';

// Logo component
function CiviqLogo() {
  return (
    <div className="flex items-center group">
      <svg
        className="w-10 h-10 transition-transform group-hover:scale-110"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="36" y="51" width="28" height="30" fill="#0b983c" />
        <circle cx="50" cy="31" r="22" fill="#ffffff" />
        <circle cx="50" cy="31" r="20" fill="#e11d07" />
        <circle cx="38" cy="89" r="2" fill="#3ea2d4" className="animate-pulse" />
        <circle
          cx="46"
          cy="89"
          r="2"
          fill="#3ea2d4"
          className="animate-pulse animation-delay-100"
        />
        <circle
          cx="54"
          cy="89"
          r="2"
          fill="#3ea2d4"
          className="animate-pulse animation-delay-200"
        />
        <circle
          cx="62"
          cy="89"
          r="2"
          fill="#3ea2d4"
          className="animate-pulse animation-delay-300"
        />
      </svg>
      <span className="ml-3 text-xl font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

// Types
interface StateData {
  name: string;
  abbreviation: string;
  capital: string;
  largestCity: string;
  population: number;
  area: number;
  gdp: number;
  medianIncome: number;
  unemploymentRate: number;
  educationBachelor: number;
  senators: Array<{
    name: string;
    party: string;
    nextElection: number;
  }>;
  houseMembers: number;
  governor: {
    name: string;
    party: string;
    termEnds: number;
  };
  legislature: {
    upperHouse: {
      name: string;
      seats: number;
      democratSeats: number;
      republicanSeats: number;
    };
    lowerHouse: {
      name: string;
      seats: number;
      democratSeats: number;
      republicanSeats: number;
    };
  };
  electoralVotes: number;
  presidentialHistory: Array<{
    year: number;
    winner: string;
    margin: number;
  }>;
  keyIssues: Array<{
    name: string;
    importance: number; // 0-100
  }>;
  districts: Array<{
    number: string;
    representative: string;
    party: string;
    cookPVI: string;
  }>;
}

// State map component
function StateMap({ stateAbbr }: { stateAbbr: string }) {
  useEffect(() => {
    const container = select('#state-map');
    container.selectAll('*').remove();

    const width = 600;
    const height = 400;

    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Placeholder for actual state map
    // In production, this would load actual GeoJSON data
    const g = svg.append('g');

    // Placeholder visualization
    g.append('rect')
      .attr('x', 50)
      .attr('y', 50)
      .attr('width', width - 100)
      .attr('height', height - 100)
      .attr('fill', '#e5e7eb')
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 2)
      .attr('rx', 8);

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '24px')
      .attr('fill', '#6b7280')
      .text(`${stateAbbr} Congressional Districts`);

    // Add district labels
    const districts = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      x: 100 + (i % 4) * 120,
      y: 150 + Math.floor(i / 4) * 100,
    }));

    g.selectAll('.district')
      .data(districts)
      .enter()
      .append('g')
      .attr('class', 'district')
      .each(function (d) {
        const district = select(this);

        district
          .append('circle')
          .attr('cx', d.x)
          .attr('cy', d.y)
          .attr('r', 30)
          .attr('fill', (d, i) => ((i as number) % 2 === 0 ? '#3b82f6' : '#ef4444'))
          .attr('opacity', 0.3)
          .on('mouseover', function () {
            select(this).attr('opacity', 0.6);
          })
          .on('mouseout', function () {
            select(this).attr('opacity', 0.3);
          });

        district
          .append('text')
          .attr('x', d.x)
          .attr('y', d.y)
          .attr('text-anchor', 'middle')
          .attr('dy', '.35em')
          .attr('font-size', '14px')
          .attr('font-weight', 'bold')
          .text(`CD-${d.id}`);
      });
  }, [stateAbbr]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Congressional Districts Map</h3>
      <div id="state-map"></div>
    </div>
  );
}

// Party control visualization
function PartyControl({ legislature }: { legislature: StateData['legislature'] }) {
  const { upperHouse, lowerHouse } = legislature;

  const calculateControl = (dem: number, rep: number) => {
    const total = dem + rep;
    const demPercent = (dem / total) * 100;
    return {
      control: dem > rep ? 'Democratic' : 'Republican',
      margin: Math.abs(dem - rep),
      demPercent,
    };
  };

  const upperControl = calculateControl(upperHouse.democratSeats, upperHouse.republicanSeats);
  const lowerControl = calculateControl(lowerHouse.democratSeats, lowerHouse.republicanSeats);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">State Legislature Control</h3>

      <div className="space-y-6">
        {/* Upper House */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-700">{upperHouse.name}</h4>
            <span
              className={`text-sm font-medium ${
                upperControl.control === 'Democratic' ? 'text-blue-600' : 'text-red-600'
              }`}
            >
              {upperControl.control} Control (+{upperControl.margin})
            </span>
          </div>
          <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${upperControl.demPercent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium">
              <span className="text-white">{upperHouse.democratSeats}D</span>
              <span className="text-gray-700">{upperHouse.republicanSeats}R</span>
            </div>
          </div>
        </div>

        {/* Lower House */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-700">{lowerHouse.name}</h4>
            <span
              className={`text-sm font-medium ${
                lowerControl.control === 'Democratic' ? 'text-blue-600' : 'text-red-600'
              }`}
            >
              {lowerControl.control} Control (+{lowerControl.margin})
            </span>
          </div>
          <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${lowerControl.demPercent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium">
              <span className="text-white">{lowerHouse.democratSeats}D</span>
              <span className="text-gray-700">{lowerHouse.republicanSeats}R</span>
            </div>
          </div>
        </div>

        {/* Trifecta Status */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Trifecta Status:</span>{' '}
            {upperControl.control === lowerControl.control ? (
              <span
                className={`font-medium ${
                  upperControl.control === 'Democratic' ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                {upperControl.control} Trifecta
              </span>
            ) : (
              <span className="font-medium text-purple-600">Divided Government</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// Presidential voting history
function PresidentialHistory({ history }: { history: StateData['presidentialHistory'] }) {
  useEffect(() => {
    const container = select('#presidential-chart');
    container.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = container
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = scaleBand()
      .range([0, width])
      .domain(history.map(d => d.year.toString()))
      .padding(0.1);

    const y = scaleLinear().domain([-20, 20]).range([height, 0]);

    svg.append('g').attr('transform', `translate(0,${height})`).call(axisBottom(x));

    svg.append('g').call(axisLeft(y).tickFormat(d => `${Math.abs(d.valueOf())}%`));

    // Add zero line
    svg
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', y(0))
      .attr('y2', y(0))
      .attr('stroke', '#9ca3af')
      .attr('stroke-dasharray', '3,3');

    // Add bars
    svg
      .selectAll('.bar')
      .data(history)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.year.toString()) || 0)
      .attr('width', x.bandwidth())
      .attr('y', d => (d.margin > 0 ? y(d.margin) : y(0)))
      .attr('height', d => Math.abs(y(d.margin) - y(0)))
      .attr('fill', d => (d.winner === 'Democratic' ? '#3b82f6' : '#ef4444'));

    // Add labels
    svg
      .selectAll('.label')
      .data(history)
      .enter()
      .append('text')
      .attr('x', d => (x(d.year.toString()) || 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.margin) + (d.margin > 0 ? -5 : 15))
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text(d => `${Math.abs(d.margin)}%`);

    // Add legend
    const legend = svg.append('g').attr('transform', `translate(${width - 100}, 0)`);

    legend
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 18)
      .attr('height', 18)
      .style('fill', '#3b82f6');

    legend.append('text').attr('x', 25).attr('y', 9).attr('dy', '.35em').text('Democratic');

    legend
      .append('rect')
      .attr('x', 0)
      .attr('y', 25)
      .attr('width', 18)
      .attr('height', 18)
      .style('fill', '#ef4444');

    legend.append('text').attr('x', 25).attr('y', 34).attr('dy', '.35em').text('Republican');
  }, [history]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Presidential Election History</h3>
      <div id="presidential-chart"></div>
    </div>
  );
}

// Key issues radar chart
function KeyIssuesRadar({ issues }: { issues: StateData['keyIssues'] }) {
  useEffect(() => {
    const container = select('#issues-radar');
    container.selectAll('*').remove();

    const width = 400;
    const height = 400;
    const margin = 60;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const angleSlice = (Math.PI * 2) / issues.length;

    // Scales
    const rScale = scaleLinear().range([0, radius]).domain([0, 100]);

    // Grid circles
    const gridLevels = 5;
    for (let level = 0; level < gridLevels; level++) {
      const levelRadius = (radius / gridLevels) * (level + 1);

      svg
        .append('circle')
        .attr('r', levelRadius)
        .style('fill', 'none')
        .style('stroke', '#e5e7eb')
        .style('stroke-width', '1px');

      if (level === gridLevels - 1) {
        svg
          .append('text')
          .attr('x', 5)
          .attr('y', -levelRadius)
          .attr('dy', '0.4em')
          .style('font-size', '10px')
          .style('fill', '#9ca3af')
          .text('100');
      }
    }

    // Axis lines
    issues.forEach((d, i) => {
      svg
        .append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', radius * Math.cos(angleSlice * i - Math.PI / 2))
        .attr('y2', radius * Math.sin(angleSlice * i - Math.PI / 2))
        .style('stroke', '#e5e7eb')
        .style('stroke-width', '1px');
    });

    // Axis labels
    issues.forEach((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const labelRadius = radius + 20;

      svg
        .append('text')
        .attr('x', labelRadius * Math.cos(angle))
        .attr('y', labelRadius * Math.sin(angle))
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('font-size', '12px')
        .text(d.name);
    });

    // Data area
    const radarLine = lineRadial<StateData['keyIssues'][0]>()
      .radius(d => rScale(d.importance))
      .angle((d, i) => i * angleSlice)
      .curve(curveLinearClosed);

    svg
      .append('path')
      .datum(issues)
      .attr('d', radarLine)
      .style('fill', '#3b82f6')
      .style('fill-opacity', 0.3)
      .style('stroke', '#3b82f6')
      .style('stroke-width', 2);

    // Data points
    svg
      .selectAll('.radar-point')
      .data(issues)
      .enter()
      .append('circle')
      .attr('class', 'radar-point')
      .attr('r', 4)
      .attr('cx', (d, i) => rScale(d.importance) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr('cy', (d, i) => rScale(d.importance) * Math.sin(angleSlice * i - Math.PI / 2))
      .style('fill', '#3b82f6')
      .style('stroke', '#fff')
      .style('stroke-width', 2);
  }, [issues]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Policy Issues</h3>
      <div id="issues-radar"></div>
    </div>
  );
}

// District competitiveness chart
function DistrictCompetitiveness({ districts }: { districts: StateData['districts'] }) {
  const getPVIValue = (pvi: string) => {
    if (pvi === 'EVEN') return 0;
    const match = pvi.match(/([DR])\+(\d+)/);
    if (!match) return 0;
    const [, party, value] = match;
    return party === 'D' ? -parseInt(value || '0') : parseInt(value || '0');
  };

  const sortedDistricts = [...districts].sort(
    (a, b) => getPVIValue(a.cookPVI) - getPVIValue(b.cookPVI)
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">District Competitiveness</h3>
      <div className="space-y-2">
        {sortedDistricts.map(district => {
          const pviValue = getPVIValue(district.cookPVI);
          const isCompetitive = Math.abs(pviValue) <= 5;

          return (
            <div key={district.number} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 w-16">CD-{district.number}</span>
              <div className="flex-1 relative h-6 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute h-full transition-all duration-500 ${
                    pviValue < 0 ? 'bg-blue-600 right-1/2' : 'bg-red-600 left-1/2'
                  }`}
                  style={{
                    width: `${Math.abs(pviValue) * 2}%`,
                    maxWidth: '50%',
                  }}
                />
                {isCompetitive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-700 bg-yellow-100 px-2 py-0.5 rounded">
                      Competitive
                    </span>
                  </div>
                )}
              </div>
              <span
                className={`text-sm font-medium w-20 text-right ${
                  district.party === 'Democratic' ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                {district.cookPVI}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          Democratic Lean
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
          Even
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-600 rounded-full"></div>
          Republican Lean
        </span>
      </div>
    </div>
  );
}

// State statistics card
function StatCard({
  title,
  value,
  subtitle,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      {trend && (
        <div
          className={`flex items-center gap-1 mt-2 text-sm ${
            trend.positive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          <span>{trend.positive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </div>
  );
}

// Main State Overview Page
export default function StateOverviewPage() {
  const params = useParams();
  const stateId = params.state as string;

  const [stateData, setStateData] = useState<StateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'legislature' | 'elections' | 'districts'
  >('overview');

  useEffect(() => {
    fetchStateData();
  }, [stateId]);

  const fetchStateData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock state data - in production this would come from APIs
      const mockData: StateData = {
        name: 'California',
        abbreviation: 'CA',
        capital: 'Sacramento',
        largestCity: 'Los Angeles',
        population: 39538223,
        area: 163696,
        gdp: 3800000000000,
        medianIncome: 84097,
        unemploymentRate: 4.2,
        educationBachelor: 35.3,
        senators: [
          { name: 'Alex Padilla', party: 'Democratic', nextElection: 2028 },
          { name: 'Laphonza Butler', party: 'Democratic', nextElection: 2024 },
        ],
        houseMembers: 52,
        governor: {
          name: 'Gavin Newsom',
          party: 'Democratic',
          termEnds: 2027,
        },
        legislature: {
          upperHouse: {
            name: 'State Senate',
            seats: 40,
            democratSeats: 32,
            republicanSeats: 8,
          },
          lowerHouse: {
            name: 'State Assembly',
            seats: 80,
            democratSeats: 62,
            republicanSeats: 18,
          },
        },
        electoralVotes: 54,
        presidentialHistory: [
          { year: 2020, winner: 'Democratic', margin: 29.2 },
          { year: 2016, winner: 'Democratic', margin: 30.1 },
          { year: 2012, winner: 'Democratic', margin: 23.1 },
          { year: 2008, winner: 'Democratic', margin: 24.0 },
          { year: 2004, winner: 'Democratic', margin: 9.9 },
          { year: 2000, winner: 'Democratic', margin: 11.8 },
        ],
        keyIssues: [
          { name: 'Healthcare', importance: 85 },
          { name: 'Environment', importance: 92 },
          { name: 'Economy', importance: 78 },
          { name: 'Education', importance: 88 },
          { name: 'Immigration', importance: 75 },
          { name: 'Housing', importance: 95 },
        ],
        districts: Array.from({ length: 52 }, (_, i) => ({
          number: String(i + 1),
          representative: `Rep. ${i + 1}`,
          party: Math.random() > 0.3 ? 'Democratic' : 'Republican',
          cookPVI: i < 10 ? 'D+15' : i < 20 ? 'D+8' : i < 30 ? 'EVEN' : i < 40 ? 'R+3' : 'R+10',
        })),
      };

      setStateData(mockData);
    } catch (error) {
      clientLogger.error(
        'Error fetching state data',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading state data...</p>
        </div>
      </div>
    );
  }

  if (!stateData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">State not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                href="/representatives"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Representatives
              </Link>
              <Link
                href="/districts"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Districts
              </Link>
              <Link href="/states" className="text-blue-600 font-medium">
                States
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* State header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-4xl font-bold">{stateData.abbreviation}</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{stateData.name}</h1>
              <p className="text-xl text-blue-100">
                Capital: {stateData.capital} • Largest City: {stateData.largestCity}
              </p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Population"
            value={stateData.population.toLocaleString()}
            subtitle="2023 estimate"
            trend={{ value: 1.2, positive: true }}
          />
          <StatCard
            title="GDP"
            value={`$${(stateData.gdp / 1e12).toFixed(1)}T`}
            subtitle="Gross Domestic Product"
          />
          <StatCard
            title="Median Income"
            value={`$${stateData.medianIncome.toLocaleString()}`}
            subtitle="Household median"
            trend={{ value: 3.5, positive: true }}
          />
          <StatCard
            title="Electoral Votes"
            value={stateData.electoralVotes}
            subtitle="Presidential elections"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md p-1 mb-8">
          <nav className="flex">
            {(['overview', 'legislature', 'elections', 'districts'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <StateMap stateAbbr={stateData.abbreviation} />
                <KeyIssuesRadar issues={stateData.keyIssues} />
              </div>

              {/* State leadership */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Leadership</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Governor</h4>
                    <p className="text-lg font-semibold">{stateData.governor.name}</p>
                    <p className="text-sm text-gray-600">{stateData.governor.party}</p>
                    <p className="text-sm text-gray-500">
                      Term ends: {stateData.governor.termEnds}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">U.S. Senators</h4>
                    {stateData.senators.map((senator, i) => (
                      <div key={i} className="mb-2">
                        <p className="font-semibold">{senator.name}</p>
                        <p className="text-sm text-gray-600">
                          {senator.party} • Next election: {senator.nextElection}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">U.S. House Delegation</h4>
                    <p className="text-3xl font-bold">{stateData.houseMembers}</p>
                    <p className="text-sm text-gray-600">Representatives</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'legislature' && (
            <>
              <PartyControl legislature={stateData.legislature} />

              {/* Additional legislature info */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Legislative Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Education & Employment</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bachelor&apos;s Degree or Higher</span>
                        <span className="font-medium">{stateData.educationBachelor}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unemployment Rate</span>
                        <span className="font-medium">{stateData.unemploymentRate}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Geographic Info</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Area</span>
                        <span className="font-medium">{stateData.area.toLocaleString()} sq mi</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Population Density</span>
                        <span className="font-medium">
                          {Math.round(stateData.population / stateData.area)} per sq mi
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'elections' && (
            <>
              <PresidentialHistory history={stateData.presidentialHistory} />

              {/* Electoral trends */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Electoral Trends</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-600">
                    {stateData.name} has {stateData.electoralVotes} electoral votes in presidential
                    elections. The state has voted{' '}
                    {stateData.presidentialHistory[0]?.winner || 'Unknown'} in the last{' '}
                    {
                      stateData.presidentialHistory.filter(
                        h => h.winner === stateData.presidentialHistory[0]?.winner
                      ).length
                    }{' '}
                    presidential elections.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'districts' && (
            <>
              <DistrictCompetitiveness districts={stateData.districts} />

              {/* District delegation breakdown */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  House Delegation Breakdown
                </h3>
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">
                      {stateData.districts.filter(d => d.party === 'Democratic').length}
                    </p>
                    <p className="text-sm text-gray-600">Democrats</p>
                  </div>
                  <div className="text-gray-400">vs</div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-600">
                      {stateData.districts.filter(d => d.party === 'Republican').length}
                    </p>
                    <p className="text-sm text-gray-600">Republicans</p>
                  </div>
                </div>
                <div className="mt-4 text-center text-sm text-gray-600">
                  {stateData.districts.filter(d => Math.abs(getPVIValue(d.cookPVI)) <= 5).length}{' '}
                  competitive districts
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Data sourced from Census.gov, Congress.gov, and official state sources
          </p>
          <p className="text-gray-500 text-sm mt-2">
            © 2019-2025 Mark Sandford. CIV.IQ™ - The Original Civic Information Platform
          </p>
        </div>
      </footer>
    </div>
  );

  function getPVIValue(pvi: string): number {
    if (pvi === 'EVEN') return 0;
    const match = pvi.match(/([DR])\+(\d+)/);
    if (!match) return 0;
    const [, party, value] = match;
    return party === 'D' ? -parseInt(value || '0') : parseInt(value || '0');
  }
}
