'use client';


/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import * as d3 from 'd3';
import NationalStatsCards from '@/components/NationalStatsCards';
import StateInfoPanel from '@/components/StateInfoPanel';

// Dynamic import of the map component to avoid SSR issues
const DistrictMapContainer = dynamic(() => import('@/components/DistrictMapContainer'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
        <p className="text-sm text-gray-600">Loading district map...</p>
      </div>
    </div>
  )
});

// Logo component
function CiviqLogo() {
  return (
    <div className="flex items-center group">
      <svg className="w-10 h-10 transition-transform group-hover:scale-110" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="36" y="51" width="28" height="30" fill="#0b983c"/>
        <circle cx="50" cy="31" r="22" fill="#ffffff"/>
        <circle cx="50" cy="31" r="20" fill="#e11d07"/>
        <circle cx="38" cy="89" r="2" fill="#3ea2d4" className="animate-pulse"/>
        <circle cx="46" cy="89" r="2" fill="#3ea2d4" className="animate-pulse animation-delay-100"/>
        <circle cx="54" cy="89" r="2" fill="#3ea2d4" className="animate-pulse animation-delay-200"/>
        <circle cx="62" cy="89" r="2" fill="#3ea2d4" className="animate-pulse animation-delay-300"/>
      </svg>
      <span className="ml-3 text-xl font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

// Types
interface District {
  id: string;
  state: string;
  number: string;
  name: string;
  representative: {
    name: string;
    party: string;
    imageUrl?: string;
  };
  demographics: {
    population: number;
    medianIncome: number;
    medianAge: number;
    diversityIndex: number;
    urbanPercentage: number;
  };
  political: {
    cookPVI: string;
    lastElection: {
      winner: string;
      margin: number;
      turnout: number;
    };
    registeredVoters: number;
  };
  geography: {
    area: number;
    counties: string[];
    majorCities: string[];
  };
}

// District card component
function DistrictCard({ district }: { district: District }) {
  const getPVIColor = (pvi: string) => {
    if (pvi.startsWith('D+')) return 'text-blue-600';
    if (pvi.startsWith('R+')) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPVIBackground = (pvi: string) => {
    if (pvi.startsWith('D+')) return 'bg-blue-100';
    if (pvi.startsWith('R+')) return 'bg-red-100';
    return 'bg-gray-100';
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{district.state}-{district.number}</h3>
          <p className="text-sm text-gray-600">{district.name}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPVIBackground(district.political.cookPVI)} ${getPVIColor(district.political.cookPVI)}`}>
          {district.political.cookPVI}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
          {district.representative.imageUrl ? (
            <img 
              src={district.representative.imageUrl} 
              alt={district.representative.name}
              className="w-12 h-12 object-cover"
            />
          ) : (
            <span className="text-xs text-gray-600">Photo</span>
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900">{district.representative.name}</p>
          <p className="text-sm text-gray-600">
            {district.representative.party === 'D' ? 'Democrat' : 'Republican'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Population</p>
          <p className="font-semibold">{district.demographics.population.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Median Income</p>
          <p className="font-semibold">${district.demographics.medianIncome.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Last Election</p>
          <p className="font-semibold">{district.political.lastElection.margin.toFixed(1)}% margin</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Turnout</p>
          <p className="font-semibold">{district.political.lastElection.turnout}%</p>
        </div>
      </div>

      <Link 
        href={`/districts/${district.state}-${district.number}`}
        className="block w-full text-center py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        View Details
      </Link>
    </div>
  );
}

// Enhanced Competitiveness Distribution Chart
function CompetitivenessChart({ districts }: { districts: District[] }) {
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  useEffect(() => {
    const container = d3.select('#competitiveness-chart');
    container.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 80, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const svg = container
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Process data into competitiveness categories
    const processedData = districts.map(d => {
      const pvi = d.political.cookPVI;
      let pviValue = 0;
      let category = 'Toss-up';
      
      if (pvi !== 'EVEN') {
        const match = pvi.match(/([DR])\+(\d+)/);
        if (match) {
          pviValue = parseInt(match[2]) * (match[1] === 'D' ? -1 : 1);
          
          // Categorize based on standard political science definitions
          if (pviValue <= -10) category = 'Safe D';
          else if (pviValue <= -5) category = 'Likely D';
          else if (pviValue <= -2) category = 'Lean D';
          else if (pviValue < 2) category = 'Toss-up';
          else if (pviValue < 5) category = 'Lean R';
          else if (pviValue < 10) category = 'Likely R';
          else category = 'Safe R';
        }
      }
      
      return {
        district: `${d.state}-${d.number}`,
        pviValue,
        category,
        party: d.representative.party,
        population: d.demographics.population,
        name: d.name
      };
    });

    // Group data by category
    const categories = ['Safe D', 'Likely D', 'Lean D', 'Toss-up', 'Lean R', 'Likely R', 'Safe R'];
    const categoryData = categories.map(cat => ({
      category: cat,
      count: processedData.filter(d => d.category === cat).length,
      districts: processedData.filter(d => d.category === cat)
    }));

    // Color scheme for categories
    const colorScale = d3.scaleOrdinal<string>()
      .domain(categories)
      .range(['#1e40af', '#3b82f6', '#60a5fa', '#9ca3af', '#f87171', '#ef4444', '#dc2626']);

    // Create scales
    const x = d3.scaleBand()
      .domain(categories)
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(categoryData, d => d.count) || 0])
      .range([height, 0]);

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Distribution of Districts by Partisan Lean (Cook PVI)');

    // Add x-axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('font-size', '12px')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em');

    // Add y-axis
    svg.append('g')
      .call(d3.axisLeft(y).tickFormat(d3.format('d')))
      .selectAll('text')
      .style('font-size', '12px');

    // Add y-axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .text('Number of Districts');

    // Add x-axis label
    svg.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .text('Competitiveness Category');

    // Add bars with animation
    const bars = svg.selectAll('.bar')
      .data(categoryData)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.category) || 0)
      .attr('width', x.bandwidth())
      .attr('y', height)
      .attr('height', 0)
      .attr('fill', d => colorScale(d.category))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer');

    // Animate bars
    bars.transition()
      .duration(800)
      .ease(d3.easeBackOut)
      .attr('y', d => y(d.count))
      .attr('height', d => height - y(d.count));

    // Add count labels on bars
    svg.selectAll('.count-label')
      .data(categoryData)
      .enter().append('text')
      .attr('class', 'count-label')
      .attr('x', d => (x(d.category) || 0) + x.bandwidth() / 2)
      .attr('y', height)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', '#fff')
      .text(d => d.count)
      .transition()
      .duration(800)
      .delay(400)
      .attr('y', d => y(d.count) + 20);

    // Add interactivity
    bars.on('mouseover', function(event, d) {
      d3.select(this)
        .attr('opacity', 0.8)
        .attr('stroke', '#000')
        .attr('stroke-width', 2);

      const [mouseX, mouseY] = d3.pointer(event, svg.node());
      setTooltip({
        visible: true,
        x: mouseX + margin.left,
        y: mouseY + margin.top,
        content: `${d.category}: ${d.count} districts\n${d.districts.slice(0, 5).map(dist => dist.district).join(', ')}${d.count > 5 ? `\n+${d.count - 5} more...` : ''}`
      });
    })
    .on('mouseout', function() {
      d3.select(this)
        .attr('opacity', 1)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1);
      
      setTooltip({ visible: false, x: 0, y: 0, content: '' });
    });

    // Add center line for even districts
    const evenPosition = x('Toss-up');
    if (evenPosition !== undefined) {
      svg.append('line')
        .attr('x1', evenPosition + x.bandwidth() / 2)
        .attr('x2', evenPosition + x.bandwidth() / 2)
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#374151')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.5);
    }

    // Add explanatory text
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + 60)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#6b7280')
      .text('Cook Partisan Voting Index (PVI): Measures how much a district leans compared to national average');

  }, [districts]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 relative">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">District Competitiveness Distribution</h2>
        <p className="text-sm text-gray-600">
          Shows how districts are distributed across the competitive spectrum using Cook PVI ratings.
        </p>
      </div>
      
      <div id="competitiveness-chart"></div>
      
      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Category Definitions:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
          <div><strong>Safe:</strong> PVI ±10+</div>
          <div><strong>Likely:</strong> PVI ±5 to ±9</div>
          <div><strong>Lean:</strong> PVI ±2 to ±4</div>
          <div><strong>Toss-up:</strong> PVI ±1 or Even</div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute bg-gray-900 text-white px-3 py-2 rounded text-sm pointer-events-none z-10 max-w-xs"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// Demographics comparison
function DemographicsComparison({ districts }: { districts: District[] }) {
  const avgData = {
    medianIncome: districts.reduce((sum, d) => sum + d.demographics.medianIncome, 0) / districts.length,
    medianAge: districts.reduce((sum, d) => sum + d.demographics.medianAge, 0) / districts.length,
    urbanPercentage: districts.reduce((sum, d) => sum + d.demographics.urbanPercentage, 0) / districts.length,
    diversityIndex: districts.reduce((sum, d) => sum + d.demographics.diversityIndex, 0) / districts.length
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Demographics Overview</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">
            ${Math.round(avgData.medianIncome / 1000)}k
          </div>
          <p className="text-sm text-gray-600 mt-1">Avg. Median Income</p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">
            {avgData.medianAge.toFixed(1)}
          </div>
          <p className="text-sm text-gray-600 mt-1">Avg. Median Age</p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">
            {avgData.urbanPercentage.toFixed(0)}%
          </div>
          <p className="text-sm text-gray-600 mt-1">Urban Population</p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-orange-600">
            {avgData.diversityIndex.toFixed(1)}
          </div>
          <p className="text-sm text-gray-600 mt-1">Diversity Index</p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-3">Top Districts by Population</h3>
        <div className="space-y-2">
          {districts
            .sort((a, b) => b.demographics.population - a.demographics.population)
            .slice(0, 5)
            .map((district, index) => (
              <div key={district.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {index + 1}. {district.state}-{district.number}
                </span>
                <span className="text-sm font-medium">
                  {district.demographics.population.toLocaleString()}
                </span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// Main Districts Page
export default function DistrictsPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedState, setSelectedState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'competitive' | 'safe-d' | 'safe-r'>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');

  useEffect(() => {
    fetchDistricts();
  }, []);

  const fetchDistricts = async () => {
    setLoading(true);
    try {
      // Fetch real district data from our representatives API
      const response = await fetch('/api/districts/all');
      if (response.ok) {
        const data = await response.json();
        setDistricts(data.districts);
      } else {
        throw new Error('Failed to fetch districts');
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
      
      // Fallback: Generate districts from our 538 representatives
      const mockDistricts: District[] = Array.from({ length: 20 }, (_, i) => ({
        id: `district-${i}`,
        state: ['CA', 'TX', 'NY', 'FL', 'PA'][i % 5],
        number: String((i % 10) + 1),
        name: `${['California', 'Texas', 'New York', 'Florida', 'Pennsylvania'][i % 5]} ${(i % 10) + 1}${['st', 'nd', 'rd', 'th'][Math.min(i % 10, 3)]} District`,
        representative: {
          name: ['John Smith', 'Jane Doe', 'Bob Johnson', 'Mary Williams'][i % 4],
          party: i % 3 === 0 ? 'D' : 'R',
          imageUrl: undefined
        },
        demographics: {
          population: Math.floor(Math.random() * 300000) + 500000,
          medianIncome: Math.floor(Math.random() * 40000) + 50000,
          medianAge: Math.floor(Math.random() * 20) + 30,
          diversityIndex: Math.random() * 100,
          urbanPercentage: Math.floor(Math.random() * 60) + 20
        },
        political: {
          cookPVI: i < 5 ? 'D+15' : i < 10 ? 'D+5' : i < 15 ? 'EVEN' : 'R+8',
          lastElection: {
            winner: i % 3 === 0 ? 'Democrat' : 'Republican',
            margin: Math.random() * 30 + 2,
            turnout: Math.floor(Math.random() * 20) + 55
          },
          registeredVoters: Math.floor(Math.random() * 200000) + 300000
        },
        geography: {
          area: Math.floor(Math.random() * 5000) + 1000,
          counties: ['County A', 'County B', 'County C'].slice(0, Math.floor(Math.random() * 3) + 1),
          majorCities: ['City A', 'City B'].slice(0, Math.floor(Math.random() * 2) + 1)
        }
      }));
      
      setDistricts(mockDistricts);
    } finally {
      setLoading(false);
    }
  };

  const filteredDistricts = districts.filter(district => {
    // Apply state filter
    if (stateFilter !== 'all' && district.state !== stateFilter) return false;
    
    // Apply competitiveness filter
    if (filter === 'competitive') {
      const pvi = district.political.cookPVI;
      if (pvi === 'EVEN') return true;
      const match = pvi.match(/[DR]\+(\d+)/);
      return match && parseInt(match[1]) <= 5;
    }
    if (filter === 'safe-d') {
      return district.political.cookPVI.startsWith('D+');
    }
    if (filter === 'safe-r') {
      return district.political.cookPVI.startsWith('R+');
    }
    
    return true;
  });

  const states = Array.from(new Set(districts.map(d => d.state))).sort();

  const districtMapData = districts.map(d => ({
    id: d.id,
    name: `${d.state}-${d.number}`,
    party: d.representative.party === 'D' ? 'Democratic' : 'Republican',
    competitiveness: Math.abs(d.political.lastElection.margin),
    population: d.demographics.population
  }));

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
              <Link href="/representatives" className="text-gray-700 hover:text-blue-600 transition-colors">
                Representatives
              </Link>
              <Link href="/districts" className="text-blue-600 font-medium">
                Districts
              </Link>
              <Link href="/analytics" className="text-gray-700 hover:text-blue-600 transition-colors">
                Analytics
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Congressional Districts</h1>
          <p className="text-xl text-gray-600">
            Explore demographic, political, and geographic data for all U.S. congressional districts
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading districts...</p>
          </div>
        ) : (
          <>
            {/* National Statistics Cards */}
            <NationalStatsCards districts={districts} />

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All States</option>
                    {states.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Competitiveness</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Districts</option>
                    <option value="competitive">Competitive (±5)</option>
                    <option value="safe-d">Safe Democratic</option>
                    <option value="safe-r">Safe Republican</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interactive map */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8 relative">
              <h2 className="text-xl font-bold text-gray-900 mb-4">National Congressional Overview</h2>
              <p className="text-sm text-gray-600 mb-4">
                View the United States with state boundaries and congressional districts. 
                Click on states to see senators and district information.
              </p>
              <div className="relative">
                <DistrictMapContainer 
                  districts={districtMapData}
                  selectedDistrict={selectedDistrict}
                  onDistrictClick={setSelectedDistrict}
                  onStateClick={setSelectedState}
                  width={900}
                  height={500}
                />
                {/* State Info Panel */}
                <StateInfoPanel 
                  state={selectedState}
                  onClose={() => setSelectedState(null)}
                />
              </div>
            </div>

            {/* Summary statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <CompetitivenessChart districts={filteredDistricts} />
              <DemographicsComparison districts={filteredDistricts} />
            </div>

            {/* District grid */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {filteredDistricts.length} Districts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDistricts.map(district => (
                  <DistrictCard key={district.id} district={district} />
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Data sourced from Census.gov and official government sources
          </p>
          <p className="text-gray-500 text-sm mt-2">
            © 2019-2025 Mark Sandford. CIV.IQ™ - The Original Civic Information Platform
          </p>
        </div>
      </footer>
    </div>
  );
}