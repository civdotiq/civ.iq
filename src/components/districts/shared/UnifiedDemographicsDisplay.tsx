/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Demographics Display Component
 *
 * Displays demographic information for both federal and state districts.
 * Uses Aicher design system for consistent styling across the application.
 *
 * Compatible with:
 * - Federal district demographics (Census API)
 * - State district demographics (StateDistrictDemographics)
 */

interface UnifiedDemographics {
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

interface UnifiedDemographicsDisplayProps {
  demographics?: UnifiedDemographics;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function UnifiedDemographicsDisplay({
  demographics,
}: UnifiedDemographicsDisplayProps) {
  if (!demographics || demographics.population === 0) {
    return (
      <div className="aicher-card text-center p-8">
        <p className="text-gray-600">Demographic data not available for this district</p>
        <p className="text-sm text-gray-500 mt-2">Census API data is currently unavailable</p>
      </div>
    );
  }

  return (
    <div className="aicher-card p-8">
      <h3 className="aicher-heading text-lg text-gray-900 mb-4">Demographics</h3>

      {/* Key Metrics Cards */}
      <div className="aicher-grid aicher-grid-4 gap-6">
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
          <p className="aicher-heading-wide text-sm text-white mt-1">Median Income</p>
        </div>

        <div className="aicher-card aicher-border bg-purple-100 p-6">
          <div className="aicher-heading text-2xl text-purple-900">
            {demographics.medianAge.toFixed(1)}
          </div>
          <p className="aicher-heading-wide text-sm text-purple-700 mt-1">Median Age</p>
        </div>

        <div className="aicher-card aicher-status-error p-6">
          <div className="aicher-heading text-2xl text-white">
            {demographics.urbanPercentage.toFixed(0)}%
          </div>
          <p className="aicher-heading-wide text-sm text-white mt-1">Urban Population</p>
        </div>
      </div>

      {/* Racial & Ethnic Composition */}
      <div className="mt-6 aicher-card p-6">
        <h4 className="aicher-heading text-md text-gray-900 mb-4">Racial & Ethnic Composition</h4>
        <div className="aicher-grid aicher-grid-4 gap-4">
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

      {/* Education & Economy */}
      <div className="mt-6 aicher-card p-6">
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
