/**
 * Demographics Dashboard Component - Ulm School redesign
 * Shows only reliable, meaningful data without jargon
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Users, Building2, DollarSign } from 'lucide-react';

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
    isCompetitive?: boolean;
    lastElection: {
      winner: string;
      margin: number;
      turnout: number | null;
    };
    votingAgePopulation?: number;
    registeredVoters?: number;
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
  if (!districts || districts.length === 0) {
    return (
      <div className="bg-white border-2 border-black p-8">
        <p className="text-gray-600">Loading district data...</p>
      </div>
    );
  }

  // Filter districts by state if selected
  const filteredDistricts =
    selectedState && selectedState !== 'all'
      ? districts.filter(d => d.state === selectedState)
      : districts;

  // Calculate only meaningful, reliable statistics
  const stats = {
    totalDistricts: filteredDistricts.length,
    democraticDistricts: filteredDistricts.filter(d => d.representative.party === 'D').length,
    republicanDistricts: filteredDistricts.filter(d => d.representative.party === 'R').length,
    totalPopulation: filteredDistricts.reduce((sum, d) => sum + d.demographics.population, 0),
  };

  // Get top districts by population (reliable Census data)
  const topByPopulation = [...filteredDistricts]
    .filter(d => d.demographics.population > 0)
    .sort((a, b) => b.demographics.population - a.demographics.population)
    .slice(0, 5);

  // Get top districts by income (reliable Census data)
  const topByIncome = [...filteredDistricts]
    .filter(d => d.demographics.medianIncome > 0)
    .sort((a, b) => b.demographics.medianIncome - a.demographics.medianIncome)
    .slice(0, 5);

  // Get smallest districts by population
  const smallestByPopulation = [...filteredDistricts]
    .filter(d => d.demographics.population > 0)
    .sort((a, b) => a.demographics.population - b.demographics.population)
    .slice(0, 5);

  const demPercent = ((stats.democraticDistricts / stats.totalDistricts) * 100).toFixed(0);
  const repPercent = ((stats.republicanDistricts / stats.totalDistricts) * 100).toFixed(0);

  const isStateView = selectedState && selectedState !== 'all';

  return (
    <div className="bg-white border-2 border-black p-6 sm:p-8">
      {/* Header - clear and simple */}
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
        {isStateView ? `${selectedState} Districts` : 'All Congressional Districts'}
      </h2>

      {/* Primary stats - the essential numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Total Districts with party breakdown */}
        <div className="col-span-2 sm:col-span-1 bg-gray-50 p-4 sm:p-5">
          <div className="text-3xl sm:text-4xl font-bold text-gray-900">{stats.totalDistricts}</div>
          <div className="text-sm text-gray-600 mt-1">
            {isStateView ? 'Districts' : 'Total Districts'}
          </div>
        </div>

        {/* Population */}
        <div className="bg-gray-50 p-4 sm:p-5">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            {(stats.totalPopulation / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600 mt-1">Population</div>
        </div>

        {/* Democratic seats */}
        <div className="bg-blue-50 p-4 sm:p-5">
          <div className="text-2xl sm:text-3xl font-bold text-blue-700">
            {stats.democraticDistricts}
          </div>
          <div className="text-sm text-blue-600 mt-1">Democratic</div>
        </div>

        {/* Republican seats */}
        <div className="bg-red-50 p-4 sm:p-5">
          <div className="text-2xl sm:text-3xl font-bold text-red-700">
            {stats.republicanDistricts}
          </div>
          <div className="text-sm text-red-600 mt-1">Republican</div>
        </div>
      </div>

      {/* Party balance bar - visual, not numeric clutter */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>D: {demPercent}%</span>
          <span className="font-medium text-gray-900">Party Balance</span>
          <span>R: {repPercent}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 flex overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-500"
            style={{ width: `${demPercent}%` }}
          />
          <div
            className="bg-red-600 h-full transition-all duration-500"
            style={{ width: `${repPercent}%` }}
          />
        </div>
      </div>

      {/* Rankings - only show if we have valid data */}
      {(topByPopulation.length > 0 || topByIncome.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Largest Districts */}
          {topByPopulation.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center text-sm uppercase tracking-wide">
                <Users className="w-4 h-4 mr-2 text-gray-500" />
                Largest by Population
              </h3>
              <div className="space-y-2">
                {topByPopulation.map((district, index) => (
                  <div key={district.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      <span className="text-gray-400 mr-2">{index + 1}.</span>
                      {district.state}-{district.number}
                    </span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      {district.demographics.population.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smallest Districts */}
          {smallestByPopulation.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center text-sm uppercase tracking-wide">
                <Building2 className="w-4 h-4 mr-2 text-gray-500" />
                Smallest by Population
              </h3>
              <div className="space-y-2">
                {smallestByPopulation.map((district, index) => (
                  <div key={district.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      <span className="text-gray-400 mr-2">{index + 1}.</span>
                      {district.state}-{district.number}
                    </span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      {district.demographics.population.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Highest Income Districts */}
          {topByIncome.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center text-sm uppercase tracking-wide">
                <DollarSign className="w-4 h-4 mr-2 text-gray-500" />
                Highest Median Income
              </h3>
              <div className="space-y-2">
                {topByIncome.map((district, index) => (
                  <div key={district.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      <span className="text-gray-400 mr-2">{index + 1}.</span>
                      {district.state}-{district.number}
                    </span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      ${(district.demographics.medianIncome / 1000).toFixed(0)}k
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
