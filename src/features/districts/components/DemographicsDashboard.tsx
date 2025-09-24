/**
 * Demographics Dashboard Component - Displays comprehensive district demographics
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Users, Building2, MapPin } from 'lucide-react';

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

export function DemographicsDashboard({
  districts,
  selectedState,
}: {
  districts: District[];
  selectedState?: string;
}) {
  // Handle empty districts array
  if (!districts || districts.length === 0) {
    return (
      <div className="bg-white border-2 border-black p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {selectedState ? `${selectedState} Demographics` : 'National Demographics Overview'}
        </h2>
        <p className="text-gray-600">Loading district data...</p>
      </div>
    );
  }

  // Filter districts by state if selected
  const filteredDistricts =
    selectedState && selectedState !== 'all'
      ? districts.filter(d => d.state === selectedState)
      : districts;

  // Calculate comprehensive statistics
  const stats = {
    // Basic counts
    totalDistricts: filteredDistricts.length,
    democraticDistricts: filteredDistricts.filter(d => d.representative.party === 'D').length,
    republicanDistricts: filteredDistricts.filter(d => d.representative.party === 'R').length,

    // Population stats
    totalPopulation: filteredDistricts.reduce((sum, d) => sum + d.demographics.population, 0),
    avgPopulation:
      filteredDistricts.reduce((sum, d) => sum + d.demographics.population, 0) /
      filteredDistricts.length,

    // Economic stats
    avgMedianIncome:
      filteredDistricts.reduce((sum, d) => sum + d.demographics.medianIncome, 0) /
      filteredDistricts.length,
    highestIncome: Math.max(...filteredDistricts.map(d => d.demographics.medianIncome)),
    lowestIncome: Math.min(...filteredDistricts.map(d => d.demographics.medianIncome)),

    // Demographics
    avgMedianAge:
      filteredDistricts.reduce((sum, d) => sum + d.demographics.medianAge, 0) /
      filteredDistricts.length,
    avgUrbanPercentage:
      filteredDistricts.reduce((sum, d) => sum + d.demographics.urbanPercentage, 0) /
      filteredDistricts.length,
    avgDiversityIndex:
      filteredDistricts.reduce((sum, d) => sum + d.demographics.diversityIndex, 0) /
      filteredDistricts.length,

    // Political stats
    avgElectionMargin:
      filteredDistricts.reduce((sum, d) => sum + d.political.lastElection.margin, 0) /
      filteredDistricts.length,
    avgTurnout:
      filteredDistricts.reduce((sum, d) => sum + d.political.lastElection.turnout, 0) /
      filteredDistricts.length,
    competitiveDistricts: filteredDistricts.filter(d => {
      const pvi = d.political.cookPVI;
      if (pvi === 'EVEN') return true;
      const match = pvi.match(/[DR]\+(\d+)/);
      return match && parseInt(match[1] || '0') <= 5;
    }).length,
  };

  // Get top districts by various metrics
  const topByPopulation = [...filteredDistricts]
    .sort((a, b) => b.demographics.population - a.demographics.population)
    .slice(0, 5);

  const topByIncome = [...filteredDistricts]
    .sort((a, b) => b.demographics.medianIncome - a.demographics.medianIncome)
    .slice(0, 5);

  const mostUrban = [...filteredDistricts]
    .sort((a, b) => b.demographics.urbanPercentage - a.demographics.urbanPercentage)
    .slice(0, 5);

  return (
    <div className="bg-white border-2 border-black p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {selectedState && selectedState !== 'all'
            ? `${selectedState} Demographics`
            : 'National Demographics Overview'}
        </h2>
        <p className="text-gray-600">
          Comprehensive demographic and political analysis of {stats.totalDistricts} congressional
          districts
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="text-center p-4 bg-white">
          <div className="text-3xl font-bold text-blue-600">{stats.totalDistricts}</div>
          <p className="text-sm text-gray-600 mt-1">Total Districts</p>
          <p className="text-xs text-gray-500 mt-1">
            D: {stats.democraticDistricts} | R: {stats.republicanDistricts}
          </p>
        </div>

        <div className="text-center p-4 bg-white">
          <div className="text-3xl font-bold text-green-600">
            {(stats.totalPopulation / 1000000).toFixed(1)}M
          </div>
          <p className="text-sm text-gray-600 mt-1">Total Population</p>
          <p className="text-xs text-gray-500 mt-1">
            Avg: {Math.round(stats.avgPopulation).toLocaleString()}
          </p>
        </div>

        <div className="text-center p-4 bg-white">
          <div className="text-3xl font-bold text-purple-600">
            ${Math.round(stats.avgMedianIncome / 1000)}k
          </div>
          <p className="text-sm text-gray-600 mt-1">Avg. Median Income</p>
          <p className="text-xs text-gray-500 mt-1">
            Range: ${Math.round(stats.lowestIncome / 1000)}k - $
            {Math.round(stats.highestIncome / 1000)}k
          </p>
        </div>

        <div className="text-center p-4 bg-white">
          <div className="text-3xl font-bold text-orange-600">
            {stats.avgUrbanPercentage.toFixed(0)}%
          </div>
          <p className="text-sm text-gray-600 mt-1">Urban Population</p>
          <p className="text-xs text-gray-500 mt-1">
            Diversity Index: {stats.avgDiversityIndex.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 p-4 bg-blue-50">
        <div className="text-center">
          <div className="text-xl font-semibold text-blue-900">{stats.avgMedianAge.toFixed(1)}</div>
          <p className="text-xs text-blue-700">Median Age</p>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-blue-900">{stats.competitiveDistricts}</div>
          <p className="text-xs text-blue-700">Competitive Districts</p>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-blue-900">{stats.avgTurnout.toFixed(0)}%</div>
          <p className="text-xs text-blue-700">Avg. Voter Turnout</p>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-blue-900">
            {stats.avgElectionMargin.toFixed(1)}%
          </div>
          <p className="text-xs text-blue-700">Avg. Victory Margin</p>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-blue-900">
            {Math.round(
              filteredDistricts.reduce((sum, d) => sum + d.political.registeredVoters, 0) / 1000000
            )}
            M
          </div>
          <p className="text-xs text-blue-700">Registered Voters</p>
        </div>
      </div>

      {/* Rankings Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Most Populous Districts */}
        <div className="bg-white p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <Users className="w-4 h-4 mr-2 text-blue-600" />
            Most Populous Districts
          </h3>
          <div className="space-y-2">
            {topByPopulation.map((district, index) => (
              <div key={district.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {index + 1}. {district.state}-{district.number}
                </span>
                <span className="font-medium text-gray-900">
                  {district.demographics.population.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Highest Income Districts */}
        <div className="bg-white p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-green-600" />
            Highest Income Districts
          </h3>
          <div className="space-y-2">
            {topByIncome.map((district, index) => (
              <div key={district.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {index + 1}. {district.state}-{district.number}
                </span>
                <span className="font-medium text-gray-900">
                  ${district.demographics.medianIncome.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Urban Districts */}
        <div className="bg-white p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-purple-600" />
            Most Urban Districts
          </h3>
          <div className="space-y-2">
            {mostUrban.map((district, index) => (
              <div key={district.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {index + 1}. {district.state}-{district.number}
                </span>
                <span className="font-medium text-gray-900">
                  {district.demographics.urbanPercentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Political Balance Visualization */}
      <div className="mt-6 p-4 bg-white">
        <h3 className="font-semibold text-gray-800 mb-3">Political Balance</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Party Control</span>
          <span className="text-sm text-gray-600">
            D: {((stats.democraticDistricts / stats.totalDistricts) * 100).toFixed(1)}% | R:{' '}
            {((stats.republicanDistricts / stats.totalDistricts) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-blue-600 h-full transition-all duration-500"
              style={{ width: `${(stats.democraticDistricts / stats.totalDistricts) * 100}%` }}
            />
            <div
              className="bg-red-600 h-full transition-all duration-500"
              style={{ width: `${(stats.republicanDistricts / stats.totalDistricts) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
