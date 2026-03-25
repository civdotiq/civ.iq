/**
 * Demographics Dashboard Component - Ulm School redesign
 * Shows only reliable, meaningful data without jargon
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { Users, Building2, DollarSign } from 'lucide-react';

interface District {
  id: string;
  state: string;
  number: string;
  name: string;
  representative: {
    name: string;
    party: string;
    bioguideId: string;
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
  votingMember?: boolean;
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
  const votingDistricts = filteredDistricts.filter(d => d.votingMember !== false);
  const nonVotingDistricts = filteredDistricts.filter(d => d.votingMember === false);
  const stats = {
    totalDistricts: filteredDistricts.length,
    votingDistricts: votingDistricts.length,
    nonVotingDistricts: nonVotingDistricts.length,
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

  const partyTotal = stats.democraticDistricts + stats.republicanDistricts;
  const demPercent =
    partyTotal > 0 ? ((stats.democraticDistricts / partyTotal) * 100).toFixed(0) : '0';
  const repPercent =
    partyTotal > 0 ? ((stats.republicanDistricts / partyTotal) * 100).toFixed(0) : '0';

  const isStateView = selectedState && selectedState !== 'all';

  return (
    <div className="bg-white border-2 border-black p-6 sm:p-8">
      {/* Header - clear and simple */}
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
        {isStateView ? `${selectedState} Districts` : 'All Congressional Districts'}
      </h2>

      {/* Primary stats - the essential numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Total Districts with voting/non-voting breakdown */}
        <div className="col-span-2 sm:col-span-1 bg-gray-50 p-4 sm:p-5">
          <div className="text-3xl sm:text-4xl font-bold text-gray-900">
            {stats.votingDistricts}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {isStateView ? 'Districts' : 'Voting Districts'}
          </div>
          {!isStateView && stats.nonVotingDistricts > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              + {stats.nonVotingDistricts} non-voting
            </div>
          )}
        </div>

        {/* Population */}
        <div className="bg-gray-50 p-4 sm:p-5">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            {(stats.totalPopulation / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600 mt-1">Population</div>
        </div>

        {/* Democratic seats */}
        <div className="bg-civiq-blue/10 p-4 sm:p-5">
          <div className="text-2xl sm:text-3xl font-bold text-civiq-blue">
            {stats.democraticDistricts}
          </div>
          <div className="text-sm text-civiq-blue mt-1">Democratic</div>
        </div>

        {/* Republican seats */}
        <div className="bg-civiq-red/10 p-4 sm:p-5">
          <div className="text-2xl sm:text-3xl font-bold text-civiq-red">
            {stats.republicanDistricts}
          </div>
          <div className="text-sm text-civiq-red mt-1">Republican</div>
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
            className="bg-civiq-blue h-full transition-all duration-500"
            style={{ width: `${demPercent}%` }}
          />
          <div
            className="bg-civiq-red h-full transition-all duration-500"
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
                  <Link
                    key={district.id}
                    href={`/districts/${district.id}`}
                    className="flex items-center justify-between text-sm hover:text-civiq-blue transition-colors"
                  >
                    <span className="text-gray-700">
                      <span className="text-gray-400 mr-2">{index + 1}.</span>
                      {district.id}
                    </span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      {district.demographics.population.toLocaleString()}
                    </span>
                  </Link>
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
                  <Link
                    key={district.id}
                    href={`/districts/${district.id}`}
                    className="flex items-center justify-between text-sm hover:text-civiq-blue transition-colors"
                  >
                    <span className="text-gray-700">
                      <span className="text-gray-400 mr-2">{index + 1}.</span>
                      {district.id}
                    </span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      {district.demographics.population.toLocaleString()}
                    </span>
                  </Link>
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
                  <Link
                    key={district.id}
                    href={`/districts/${district.id}`}
                    className="flex items-center justify-between text-sm hover:text-civiq-blue transition-colors"
                  >
                    <span className="text-gray-700">
                      <span className="text-gray-400 mr-2">{index + 1}.</span>
                      {district.id}
                    </span>
                    <span className="font-medium text-gray-900 tabular-nums">
                      ${(district.demographics.medianIncome / 1000).toFixed(0)}k
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
