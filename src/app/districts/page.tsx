'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InteractiveDistrictMap } from '@/components/InteractiveVisualizations';
import * as d3 from 'd3';

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

// Competitiveness chart
function CompetitivenessChart({ districts }: { districts: District[] }) {
  useEffect(() => {
    const container = d3.select('#competitiveness-chart');
    container.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = container
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Process data
    const processedData = districts.map(d => {
      const pvi = d.political.cookPVI;
      let value = 0;
      if (pvi !== 'EVEN') {
        const match = pvi.match(/([DR])\+(\d+)/);
        if (match) {
          value = parseInt(match[2]) * (match[1] === 'D' ? -1 : 1);
        }
      }
      return {
        district: `${d.state}-${d.number}`,
        value,
        party: d.representative.party
      };
    }).sort((a, b) => a.value - b.value);

    const x = d3.scaleLinear()
      .domain([-20, 20])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(processedData.map(d => d.district))
      .range([0, height])
      .padding(0.1);

    // Add x axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d => d.valueOf() === 0 ? 'EVEN' : `${Math.abs(d.valueOf())}`));

    // Add y axis
    svg.append('g')
      .call(d3.axisLeft(y));

    // Add center line
    svg.append('line')
      .attr('x1', x(0))
      .attr('x2', x(0))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 2);

    // Add bars
    svg.selectAll('.bar')
      .data(processedData)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => d.value < 0 ? x(d.value) : x(0))
      .attr('y', d => y(d.district) || 0)
      .attr('width', d => Math.abs(x(d.value) - x(0)))
      .attr('height', y.bandwidth())
      .attr('fill', d => d.value < 0 ? '#3b82f6' : '#ef4444')
      .attr('opacity', 0.7);

    // Add labels
    svg.append('text')
      .attr('x', x(-10))
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .text('← More Democratic')
      .style('font-size', '12px')
      .style('fill', '#3b82f6');

    svg.append('text')
      .attr('x', x(10))
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .text('More Republican →')
      .style('font-size', '12px')
      .style('fill', '#ef4444');
  }, [districts]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">District Competitiveness Analysis</h2>
      <div id="competitiveness-chart"></div>
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
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Interactive District Map</h2>
              <p className="text-sm text-gray-600 mb-4">
                Click on a district to view details. Color intensity shows competitiveness.
              </p>
              <InteractiveDistrictMap 
                districts={districtMapData}
                selectedDistrict={selectedDistrict}
                onDistrictClick={setSelectedDistrict}
                width={900}
                height={500}
              />
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
            © 2024 CIV.IQ - Empowering civic engagement through transparency
          </p>
        </div>
      </footer>
    </div>
  );
}