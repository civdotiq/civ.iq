/**
 * District Demographics Component
 * Ulm School principles: Only show reliable, meaningful data
 * Removed: Diversity Index, Urban %, comparison indicators
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

interface Demographics {
  population: number;
  medianIncome: number;
  medianAge: number;
  diversityIndex: number;
  urbanPercentage: number;
  white_percent: number;
  black_percent: number;
  hispanic_percent: number;
  asian_percent: number;
  poverty_rate: number;
  bachelor_degree_percent: number;
}

interface DistrictDemographicsProps {
  demographics?: Demographics;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DistrictDemographics({ demographics }: DistrictDemographicsProps) {
  if (!demographics || demographics.population === 0) {
    return (
      <div className="aicher-card text-center p-8">
        <p className="text-gray-600">Demographic data not available for this district</p>
        <p className="text-sm text-gray-500 mt-2">
          <a
            href="https://www.census.gov/data/developers/data-sets.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-civiq-blue hover:underline"
          >
            Census API
          </a>{' '}
          data is currently unavailable
        </p>
      </div>
    );
  }

  return (
    <div className="aicher-card p-8">
      <h3 className="aicher-heading text-lg text-gray-900 mb-4">Demographics</h3>

      {/* Primary Stats - Population and Income only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="aicher-card aicher-status-info p-6">
          <div className="aicher-heading text-2xl text-white">
            {demographics.population.toLocaleString()}
          </div>
          <p className="aicher-heading-wide text-sm text-white mt-1">Total Population</p>
        </div>

        <div className="aicher-card aicher-status-success p-6">
          <div className="aicher-heading text-2xl text-white">
            {formatCurrency(demographics.medianIncome)}
          </div>
          <p className="aicher-heading-wide text-sm text-white mt-1">Median Household Income</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4">
          <div className="text-xl font-bold text-gray-900">{demographics.medianAge.toFixed(1)}</div>
          <p className="text-sm text-gray-600">Median Age</p>
        </div>
        <div className="bg-gray-50 p-4">
          <div className="text-xl font-bold text-gray-900">
            {demographics.bachelor_degree_percent.toFixed(1)}%
          </div>
          <p className="text-sm text-gray-600">College Educated</p>
        </div>
        <div className="bg-gray-50 p-4">
          <div className="text-xl font-bold text-gray-900">
            {demographics.poverty_rate.toFixed(1)}%
          </div>
          <p className="text-sm text-gray-600">Poverty Rate</p>
        </div>
      </div>

      {/* Racial & Ethnic Composition - factual breakdown, no indices */}
      <div className="aicher-card p-6">
        <h4 className="aicher-heading text-md text-gray-900 mb-4">Racial & Ethnic Composition</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {demographics.white_percent.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">White</p>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {demographics.black_percent.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Black</p>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {demographics.hispanic_percent.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Hispanic</p>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {demographics.asian_percent.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Asian</p>
          </div>
        </div>
      </div>

      {/* Data source */}
      <div className="mt-4 text-xs text-gray-500">Data: U.S. Census Bureau</div>
    </div>
  );
}
