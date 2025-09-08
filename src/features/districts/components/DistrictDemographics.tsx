/**
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
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">Demographic data not available for this district</p>
        <p className="text-sm text-gray-500 mt-2">Census API data is currently unavailable</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Demographics</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
          <div className="text-2xl font-bold text-blue-900">
            {demographics.population.toLocaleString()}
          </div>
          <p className="text-sm text-blue-700 mt-1">Total Population</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
          <div className="text-2xl font-bold text-green-900">
            {formatCurrency(demographics.medianIncome)}
          </div>
          <p className="text-sm text-green-700 mt-1">Median Income</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
          <div className="text-2xl font-bold text-purple-900">
            {demographics.medianAge.toFixed(1)}
          </div>
          <p className="text-sm text-purple-700 mt-1">Median Age</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6">
          <div className="text-2xl font-bold text-orange-900">
            {demographics.urbanPercentage.toFixed(0)}%
          </div>
          <p className="text-sm text-orange-700 mt-1">Urban Population</p>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Racial & Ethnic Composition</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">
              {demographics.white_percent.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">White</p>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">
              {demographics.black_percent.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Black</p>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">
              {demographics.hispanic_percent.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Hispanic</p>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-600">
              {demographics.asian_percent.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Asian</p>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Education & Economy</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-lg font-bold text-green-600">
              {demographics.bachelor_degree_percent.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Bachelor&apos;s Degree+</p>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">
              {demographics.poverty_rate.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Poverty Rate</p>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600">
              {demographics.diversityIndex.toFixed(1)}
            </div>
            <p className="text-sm text-gray-600">Diversity Index</p>
          </div>
        </div>
      </div>
    </div>
  );
}
