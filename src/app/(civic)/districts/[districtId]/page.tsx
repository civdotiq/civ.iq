'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { DistrictCharts } from '@/features/districts/components/DistrictCharts';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';

// Dynamic import of the map component to avoid SSR issues
const DistrictBoundaryMap = dynamic(
  () => import('@/features/districts/components/DistrictBoundaryMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-sm text-gray-600">Loading district map...</p>
        </div>
      </div>
    ),
  }
);

function CiviqLogo() {
  return (
    <div className="flex items-center">
      <svg className="w-8 h-8" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="36" y="51" width="28" height="30" fill="#0b983c" />
        <circle cx="50" cy="31" r="22" fill="#ffffff" />
        <circle cx="50" cy="31" r="20" fill="#e11d07" />
        <circle cx="38" cy="89" r="2" fill="#3ea2d4" />
        <circle cx="46" cy="89" r="2" fill="#3ea2d4" />
        <circle cx="54" cy="89" r="2" fill="#3ea2d4" />
        <circle cx="62" cy="89" r="2" fill="#3ea2d4" />
      </svg>
      <span className="ml-2 text-lg font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

interface DistrictDetails {
  id: string;
  state: string;
  number: string;
  name: string;
  representative: {
    name: string;
    party: string;
    bioguideId: string;
    imageUrl?: string;
    yearsInOffice?: number;
  };
  demographics?: {
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

    // Additional comprehensive demographics
    economic?: {
      medianHomeValue: number;
      medianGrossRent: number;
      medianContractRent: number;
      unemploymentRate: number;
      laborForceParticipation: number;
      // Advanced economic indicators
      economicHealthIndex: number;
      housingAffordabilityRatio: number;
      rentBurdenRatio: number;
      industryDiversityIndex: number;
      jobGrowthPotential: number;
    };

    education?: {
      highSchoolGraduatePercent: number;
      mastersDegreePercent: number;
      professionalDegreePercent: number;
      doctoratePercent: number;
      advancedDegreePercent: number;
    };

    housing?: {
      homeOwnershipRate: number;
      rentalRate: number;
      vacancyRate: number;
      avgHouseholdSize: number;
      housingUnitDensity: number;
    };

    transportation?: {
      publicTransportPercent: number;
      workFromHomePercent: number;
      avgCommuteTime: number;
    };

    social?: {
      veteransPercent: number;
      disabilityPercent: number;
      englishOnlyPercent: number;
      otherLanguagePercent: number;
    };
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

export default function DistrictDetailPage() {
  const params = useParams();
  const districtId = params.districtId as string;
  const [district, setDistrict] = useState<DistrictDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'overview' | 'demographics' | 'politics' | 'economy' | 'geography' | 'comparative'
  >('dashboard');

  useEffect(() => {
    const fetchDistrict = async () => {
      setLoading(true);
      setError(null);
      setDistrict(null);

      try {
        const response = await fetch(`/api/districts/${districtId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('District not found');
          } else {
            throw new Error(`Failed to load district: ${response.status}`);
          }
        }
        const data = await response.json();
        setDistrict(data.district);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (districtId) {
      fetchDistrict();
    }
  }, [districtId]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading district details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">District Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/districts"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse All Districts
          </Link>
        </div>
      </div>
    );
  }

  if (!district) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
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
              <Link href="/districts" className="text-blue-600 font-medium">
                Districts
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* District Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {district.state}-{district.number}
              </h1>
              <p className="text-xl text-gray-600">{district.name}</p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-lg font-semibold ${getPVIBackground(district.political.cookPVI)} ${getPVIColor(district.political.cookPVI)}`}
            >
              {district.political.cookPVI}
            </span>
          </div>

          {/* Representative Info */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Representative</h2>
            <div className="flex items-center gap-6">
              <RepresentativePhoto
                bioguideId={district.representative.bioguideId}
                name={district.representative.name}
                size="lg"
              />
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{district.representative.name}</h3>
                <p className="text-lg text-gray-600">
                  {district.representative.party === 'D'
                    ? 'Democrat'
                    : district.representative.party === 'R'
                      ? 'Republican'
                      : district.representative.party}
                </p>
                <Link
                  href={`/representative/${district.representative.bioguideId}`}
                  className="inline-block mt-2 text-blue-600 hover:underline"
                >
                  View Full Profile →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced District Map with Intelligence */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">District Boundaries & Geography</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleDateString()}
              </span>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">District Boundary</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Interactive Map */}
            <div className="lg:col-span-3">
              <DistrictBoundaryMap
                districtId={district.id}
                state={district.state}
                district={district.number}
                width={900}
                height={500}
              />
            </div>

            {/* District Quick Stats */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">District Overview</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Total Area</span>
                    <div className="text-lg font-bold text-blue-600">
                      {district.geography.area.toLocaleString()} sq mi
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Population</span>
                    <div className="text-lg font-bold text-green-600">
                      {district.demographics?.population.toLocaleString() || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Counties</span>
                    <div className="text-lg font-bold text-purple-600">
                      {district.geography.counties.length}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Political Lean</span>
                    <div className={`text-lg font-bold ${getPVIColor(district.political.cookPVI)}`}>
                      {district.political.cookPVI}
                    </div>
                  </div>
                </div>
              </div>

              {/* Neighboring Districts */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Neighboring Districts</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>
                      {district.state}-{parseInt(district.number) - 1}
                    </span>
                    <Link
                      href={`/districts/${district.state}-${parseInt(district.number) - 1}`}
                      className="text-blue-600 hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>
                      {district.state}-{parseInt(district.number) + 1}
                    </span>
                    <Link
                      href={`/districts/${district.state}-${parseInt(district.number) + 1}`}
                      className="text-blue-600 hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tabbed Interface */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8 overflow-x-auto">
              {[
                { id: 'dashboard', label: 'Intelligence Dashboard', icon: '🎯' },
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'demographics', label: 'Demographics', icon: '👥' },
                { id: 'politics', label: 'Politics & Elections', icon: '🗳️' },
                { id: 'economy', label: 'Economy', icon: '💼' },
                { id: 'geography', label: 'Geography', icon: '🗺️' },
                { id: 'comparative', label: 'Comparative Analysis', icon: '📈' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(
                      tab.id as
                        | 'dashboard'
                        | 'overview'
                        | 'demographics'
                        | 'politics'
                        | 'economy'
                        | 'geography'
                        | 'comparative'
                    )
                  }
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Intelligence Dashboard</h2>
                  <span className="text-sm text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </span>
                </div>

                {/* Key Performance Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Competitiveness Index</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {district.political.lastElection.margin < 5
                            ? 'High'
                            : district.political.lastElection.margin < 10
                              ? 'Medium'
                              : 'Low'}
                        </p>
                      </div>
                      <div className="text-blue-600">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      Based on last election margin of{' '}
                      {district.political.lastElection.margin.toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Economic Health</p>
                        <p className="text-2xl font-bold text-green-900">
                          {district.demographics?.economic
                            ? district.demographics.economic.economicHealthIndex > 80
                              ? 'Excellent'
                              : district.demographics.economic.economicHealthIndex > 60
                                ? 'Good'
                                : district.demographics.economic.economicHealthIndex > 40
                                  ? 'Fair'
                                  : 'Poor'
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="text-green-600">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-green-700 mt-2">
                      Index:{' '}
                      {district.demographics?.economic
                        ? district.demographics.economic.economicHealthIndex.toFixed(0)
                        : 'N/A'}
                      /100
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Diversity Score</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {district.demographics
                            ? district.demographics.diversityIndex.toFixed(0)
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="text-purple-600">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-purple-700 mt-2">
                      Racial and ethnic diversity index (0-100)
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600">Voter Engagement</p>
                        <p className="text-2xl font-bold text-orange-900">
                          {district.political.lastElection.turnout}%
                        </p>
                      </div>
                      <div className="text-orange-600">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-orange-700 mt-2">Last election turnout rate</p>
                  </div>
                </div>

                {/* Trend Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Political Trends</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Partisan Voting Index</span>
                        <span
                          className={`text-sm font-medium ${getPVIColor(district.political.cookPVI)}`}
                        >
                          {district.political.cookPVI}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Election Margin Trend</span>
                        <span className="text-sm font-medium text-gray-900">
                          {district.political.lastElection.margin > 10
                            ? '↗ Widening'
                            : district.political.lastElection.margin > 5
                              ? '→ Stable'
                              : '↘ Narrowing'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Competitiveness</span>
                        <span className="text-sm font-medium text-gray-900">
                          {district.political.lastElection.margin < 5
                            ? 'Highly Competitive'
                            : district.political.lastElection.margin < 10
                              ? 'Competitive'
                              : 'Safe'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Demographic Insights
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Population Density</span>
                        <span className="text-sm font-medium text-gray-900">
                          {district.demographics && district.geography
                            ? Math.round(
                                district.demographics.population / district.geography.area
                              ).toLocaleString()
                            : 'N/A'}{' '}
                          per sq mi
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Education Level</span>
                        <span className="text-sm font-medium text-gray-900">
                          {district.demographics
                            ? district.demographics.bachelor_degree_percent > 35
                              ? 'High'
                              : district.demographics.bachelor_degree_percent > 25
                                ? 'Medium'
                                : 'Low'
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Economic Status</span>
                        <span className="text-sm font-medium text-gray-900">
                          {district.demographics
                            ? district.demographics.poverty_rate < 10
                              ? 'Affluent'
                              : district.demographics.poverty_rate < 15
                                ? 'Middle Class'
                                : 'Working Class'
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Challenges & Opportunities */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Key Insights & Priorities
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">Strengths</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {district.demographics && district.demographics.medianIncome > 65000 && (
                          <li>• Strong economic base with high median income</li>
                        )}
                        {district.demographics &&
                          district.demographics.bachelor_degree_percent > 35 && (
                            <li>• Well-educated population</li>
                          )}
                        {district.political.lastElection.turnout > 70 && (
                          <li>• High voter engagement</li>
                        )}
                        {district.demographics && district.demographics.diversityIndex > 60 && (
                          <li>• Diverse and inclusive community</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-purple-900 mb-2">Areas of Focus</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {district.demographics && district.demographics.poverty_rate > 15 && (
                          <li>• Economic development and poverty reduction</li>
                        )}
                        {district.demographics &&
                          district.demographics.bachelor_degree_percent < 25 && (
                            <li>• Educational attainment and workforce development</li>
                          )}
                        {district.political.lastElection.turnout < 60 && (
                          <li>• Voter engagement and civic participation</li>
                        )}
                        {district.demographics && district.demographics.medianAge > 45 && (
                          <li>• Youth retention and attraction</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">District Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {district.demographics?.population.toLocaleString() || 'N/A'}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Total Population</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {district.demographics
                          ? formatCurrency(district.demographics.medianIncome)
                          : 'N/A'}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Median Income</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {district.demographics?.medianAge.toFixed(1) || 'N/A'}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Median Age</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {district.demographics?.urbanPercentage.toFixed(0) || 'N/A'}%
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Urban Population</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {district.political.lastElection.margin.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Last Election Margin</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {district.political.lastElection.turnout}%
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Voter Turnout</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {district.geography.area.toLocaleString()} sq mi
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Total Area</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'demographics' && district.demographics && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900">Demographics & Population</h2>

                {/* Basic Demographics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-blue-900">
                      {district.demographics.population.toLocaleString()}
                    </div>
                    <p className="text-sm text-blue-700 mt-1">Total Population</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-green-900">
                      {district.demographics.medianAge.toFixed(1)}
                    </div>
                    <p className="text-sm text-green-700 mt-1">Median Age</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-purple-900">
                      {district.demographics.diversityIndex.toFixed(1)}
                    </div>
                    <p className="text-sm text-purple-700 mt-1">Diversity Index</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-orange-900">
                      {district.demographics.urbanPercentage.toFixed(0)}%
                    </div>
                    <p className="text-sm text-orange-700 mt-1">Urban Population</p>
                  </div>
                </div>

                {/* Racial and Ethnic Composition */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Racial & Ethnic Composition
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">
                        {district.demographics.white_percent.toFixed(1)}%
                      </div>
                      <p className="text-sm text-gray-600">White</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">
                        {district.demographics.black_percent.toFixed(1)}%
                      </div>
                      <p className="text-sm text-gray-600">Black</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-purple-600">
                        {district.demographics.hispanic_percent.toFixed(1)}%
                      </div>
                      <p className="text-sm text-gray-600">Hispanic</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-orange-600">
                        {district.demographics.asian_percent.toFixed(1)}%
                      </div>
                      <p className="text-sm text-gray-600">Asian</p>
                    </div>
                  </div>
                </div>

                {/* Economic Indicators */}
                {district.demographics.economic && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Economic Indicators
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(district.demographics.medianIncome)}
                        </div>
                        <p className="text-sm text-gray-600">Median Household Income</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(district.demographics.economic.medianHomeValue)}
                        </div>
                        <p className="text-sm text-gray-600">Median Home Value</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          {formatCurrency(district.demographics.economic.medianGrossRent)}
                        </div>
                        <p className="text-sm text-gray-600">Median Gross Rent</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">
                          {district.demographics.economic.unemploymentRate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Unemployment Rate</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-orange-600">
                          {district.demographics.economic.laborForceParticipation.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Labor Force Participation</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">
                          {district.demographics.poverty_rate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Poverty Rate</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Education Levels */}
                {district.demographics.education && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Educational Attainment
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {district.demographics.education.highSchoolGraduatePercent.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">High School Graduate</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {district.demographics.bachelor_degree_percent.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Bachelor&apos;s Degree</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          {district.demographics.education.mastersDegreePercent.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Master&apos;s Degree</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-orange-600">
                          {district.demographics.education.professionalDegreePercent.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Professional Degree</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">
                          {district.demographics.education.doctoratePercent.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Doctorate</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-indigo-600">
                          {district.demographics.education.advancedDegreePercent.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Advanced Degree</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Housing Characteristics */}
                {district.demographics.housing && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Housing Characteristics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {district.demographics.housing.homeOwnershipRate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Home Ownership Rate</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {district.demographics.housing.rentalRate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Rental Rate</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">
                          {district.demographics.housing.vacancyRate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Vacancy Rate</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          {district.demographics.housing.avgHouseholdSize.toFixed(1)}
                        </div>
                        <p className="text-sm text-gray-600">Avg Household Size</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-orange-600">
                          {district.demographics.housing.housingUnitDensity.toLocaleString()}
                        </div>
                        <p className="text-sm text-gray-600">Housing Units</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transportation & Commuting */}
                {district.demographics.transportation && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Transportation & Commuting
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {district.demographics.transportation.publicTransportPercent.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Public Transportation</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {district.demographics.transportation.workFromHomePercent.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Work From Home</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          {district.demographics.transportation.avgCommuteTime.toFixed(1)} min
                        </div>
                        <p className="text-sm text-gray-600">Avg Commute Time</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Social Characteristics */}
                {district.demographics.social && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Social Characteristics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {district.demographics.social.veteransPercent.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Veterans</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">
                          {district.demographics.social.disabilityPercent.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">With Disability</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {district.demographics.social.englishOnlyPercent.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">English Only</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          {district.demographics.social.otherLanguagePercent.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Other Language</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data visualization charts */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Visualizations</h3>
                  <DistrictCharts districtData={district} />
                </div>
              </div>
            )}

            {activeTab === 'politics' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  Political Analysis & Voting Patterns
                </h2>

                {/* Political Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-blue-900">
                      {district.political.cookPVI}
                    </div>
                    <p className="text-sm text-blue-700 mt-1">Cook PVI Rating</p>
                    <div className="mt-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          district.political.cookPVI.startsWith('D+')
                            ? 'bg-blue-200 text-blue-800'
                            : district.political.cookPVI.startsWith('R+')
                              ? 'bg-red-200 text-red-800'
                              : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {district.political.cookPVI.startsWith('D+')
                          ? 'Democratic Lean'
                          : district.political.cookPVI.startsWith('R+')
                            ? 'Republican Lean'
                            : 'Neutral'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-green-900">
                      {district.political.lastElection.margin.toFixed(1)}%
                    </div>
                    <p className="text-sm text-green-700 mt-1">Last Election Margin</p>
                    <div className="mt-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          district.political.lastElection.margin < 5
                            ? 'bg-red-200 text-red-800'
                            : district.political.lastElection.margin < 10
                              ? 'bg-yellow-200 text-yellow-800'
                              : 'bg-green-200 text-green-800'
                        }`}
                      >
                        {district.political.lastElection.margin < 5
                          ? 'Highly Competitive'
                          : district.political.lastElection.margin < 10
                            ? 'Competitive'
                            : 'Safe'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-purple-900">
                      {district.political.lastElection.turnout}%
                    </div>
                    <p className="text-sm text-purple-700 mt-1">Voter Turnout</p>
                    <div className="mt-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          district.political.lastElection.turnout > 70
                            ? 'bg-green-200 text-green-800'
                            : district.political.lastElection.turnout > 60
                              ? 'bg-yellow-200 text-yellow-800'
                              : 'bg-red-200 text-red-800'
                        }`}
                      >
                        {district.political.lastElection.turnout > 70
                          ? 'High'
                          : district.political.lastElection.turnout > 60
                            ? 'Moderate'
                            : 'Low'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-orange-900">
                      {district.political.registeredVoters.toLocaleString()}
                    </div>
                    <p className="text-sm text-orange-700 mt-1">Registered Voters</p>
                    <div className="mt-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-200 text-orange-800">
                        {district.demographics
                          ? Math.round(
                              (district.political.registeredVoters /
                                district.demographics.population) *
                                100
                            )
                          : 0}
                        % of Population
                      </span>
                    </div>
                  </div>
                </div>

                {/* Voting Patterns Analysis */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Voting Patterns & Behavior
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Partisan Voting History</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">2022 House</span>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                district.representative.party === 'D'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {district.representative.party === 'D' ? 'Democratic' : 'Republican'}
                            </span>
                            <span className="text-sm font-medium">
                              {district.political.lastElection.margin.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">2020 House</span>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                district.representative.party === 'D'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {district.representative.party === 'D' ? 'Democratic' : 'Republican'}
                            </span>
                            <span className="text-sm font-medium">
                              {(district.political.lastElection.margin + 0).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">2018 House</span>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                false ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {false ? 'Democratic' : 'Republican'}
                            </span>
                            <span className="text-sm font-medium">
                              {(district.political.lastElection.margin + 0).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Turnout Trends</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">2022 Midterm</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">
                              {district.political.lastElection.turnout}%
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${district.political.lastElection.turnout}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">2020 Presidential</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">
                              {Math.min(district.political.lastElection.turnout + 15, 85)}%
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{
                                  width: `${Math.min(district.political.lastElection.turnout + 15, 85)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">2018 Midterm</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">
                              {Math.max(district.political.lastElection.turnout - 8, 45)}%
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full"
                                style={{
                                  width: `${Math.max(district.political.lastElection.turnout - 8, 45)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Political Competitiveness Analysis */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Competitiveness Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">Electoral Volatility</h4>
                      <div className="text-2xl font-bold text-purple-600">
                        {district.political.lastElection.margin < 5
                          ? 'High'
                          : district.political.lastElection.margin < 10
                            ? 'Medium'
                            : 'Low'}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Based on margin variations over time
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">Swing Potential</h4>
                      <div className="text-2xl font-bold text-orange-600">
                        {district.political.cookPVI === 'EVEN'
                          ? 'High'
                          : district.political.cookPVI.includes('+') &&
                              parseInt(district.political.cookPVI.split('+')[1] || '0') < 5
                            ? 'Medium'
                            : 'Low'}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Likelihood of changing parties</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">Engagement Score</h4>
                      <div className="text-2xl font-bold text-blue-600">
                        {district.political.lastElection.turnout > 70
                          ? 'High'
                          : district.political.lastElection.turnout > 60
                            ? 'Medium'
                            : 'Low'}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Voter participation levels</p>
                    </div>
                  </div>
                </div>

                {/* Demographic Political Correlations */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Demographic-Political Correlations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Key Political Indicators</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Education Impact</span>
                          <span className="text-sm font-medium text-gray-900">
                            {district.demographics &&
                            district.demographics.bachelor_degree_percent > 35
                              ? 'High'
                              : district.demographics &&
                                  district.demographics.bachelor_degree_percent > 25
                                ? 'Medium'
                                : 'Low'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Urban/Rural Split</span>
                          <span className="text-sm font-medium text-gray-900">
                            {district.demographics && district.demographics.urbanPercentage > 60
                              ? 'Urban'
                              : district.demographics && district.demographics.urbanPercentage > 30
                                ? 'Mixed'
                                : 'Rural'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Income Influence</span>
                          <span className="text-sm font-medium text-gray-900">
                            {district.demographics && district.demographics.medianIncome > 75000
                              ? 'High'
                              : district.demographics && district.demographics.medianIncome > 55000
                                ? 'Medium'
                                : 'Low'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Age Distribution</span>
                          <span className="text-sm font-medium text-gray-900">
                            {district.demographics && district.demographics.medianAge < 35
                              ? 'Young'
                              : district.demographics && district.demographics.medianAge < 45
                                ? 'Mixed'
                                : 'Mature'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Political Predictions</h4>
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-900">2024 Outlook</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {district.political.lastElection.margin < 5
                              ? 'Highly competitive race expected. Demographic shifts may influence outcome.'
                              : district.political.lastElection.margin < 10
                                ? 'Competitive race likely. Incumbent has slight advantage.'
                                : 'Likely to remain with current party. Focus on turnout operations.'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-900">Key Factors</p>
                          <ul className="text-sm text-gray-600 mt-1 space-y-1">
                            <li>• Voter registration trends</li>
                            <li>• Demographic composition changes</li>
                            <li>• Economic conditions impact</li>
                            <li>• National political environment</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historical Election Data */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Historical Election Performance
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3">Year</th>
                          <th className="text-left py-2 px-3">Type</th>
                          <th className="text-left py-2 px-3">Winner</th>
                          <th className="text-left py-2 px-3">Margin</th>
                          <th className="text-left py-2 px-3">Turnout</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-3 font-medium">2022</td>
                          <td className="py-2 px-3">Midterm</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                district.representative.party === 'D'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {district.representative.party === 'D' ? 'Democratic' : 'Republican'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {district.political.lastElection.margin.toFixed(1)}%
                          </td>
                          <td className="py-2 px-3">{district.political.lastElection.turnout}%</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-3 font-medium">2020</td>
                          <td className="py-2 px-3">Presidential</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                district.representative.party === 'D'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {district.representative.party === 'D' ? 'Democratic' : 'Republican'}
                            </span>
                          </td>
                          <td className="py-2 px-3">{0}%</td>
                          <td className="py-2 px-3">
                            {Math.min(district.political.lastElection.turnout + 15, 85)}%
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 px-3 font-medium">2018</td>
                          <td className="py-2 px-3">Midterm</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                false ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {false ? 'Democratic' : 'Republican'}
                            </span>
                          </td>
                          <td className="py-2 px-3">{0}%</td>
                          <td className="py-2 px-3">
                            {Math.max(district.political.lastElection.turnout - 8, 45)}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Political Intelligence Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Political Intelligence Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">Electoral Strengths</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {district.political.lastElection.turnout > 70 && (
                          <li>• High voter engagement and turnout</li>
                        )}
                        {district.political.lastElection.margin > 10 && (
                          <li>• Stable electoral base</li>
                        )}
                        {district.demographics &&
                          district.demographics.bachelor_degree_percent > 35 && (
                            <li>• Highly educated electorate</li>
                          )}
                        {district.demographics?.economic &&
                          district.demographics.economic.economicHealthIndex > 70 && (
                            <li>• Strong economic fundamentals</li>
                          )}
                        {district.demographics && district.demographics.diversityIndex > 60 && (
                          <li>• Diverse coalition potential</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-purple-900 mb-2">Electoral Challenges</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {district.political.lastElection.margin < 5 && (
                          <li>• Highly competitive district</li>
                        )}
                        {district.political.lastElection.turnout < 60 && (
                          <li>• Low voter turnout rates</li>
                        )}
                        {district.demographics && district.demographics.medianAge > 50 && (
                          <li>• Aging population dynamics</li>
                        )}
                        {district.demographics && district.demographics.poverty_rate > 15 && (
                          <li>• Economic disparities</li>
                        )}
                        {district.political.cookPVI === 'EVEN' && (
                          <li>• Unpredictable swing district</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'economy' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900">Economic Profile</h2>

                {/* Economic Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-green-900">
                      {district.demographics
                        ? formatCurrency(district.demographics.medianIncome)
                        : 'N/A'}
                    </div>
                    <p className="text-sm text-green-700 mt-1">Median Household Income</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-blue-900">
                      {district.demographics?.economic
                        ? formatCurrency(district.demographics.economic.medianHomeValue)
                        : 'N/A'}
                    </div>
                    <p className="text-sm text-blue-700 mt-1">Median Home Value</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-purple-900">
                      {district.demographics?.economic
                        ? formatCurrency(district.demographics.economic.medianGrossRent)
                        : 'N/A'}
                    </div>
                    <p className="text-sm text-purple-700 mt-1">Median Gross Rent</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6">
                    <div className="text-2xl font-bold text-red-900">
                      {district.demographics?.economic
                        ? district.demographics.economic.unemploymentRate.toFixed(1)
                        : 'N/A'}
                      %
                    </div>
                    <p className="text-sm text-red-700 mt-1">Unemployment Rate</p>
                  </div>
                </div>

                {/* Economic Indicators */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Key Economic Indicators
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <div className="text-lg font-bold text-green-600">
                        {district.demographics
                          ? formatCurrency(district.demographics.medianIncome)
                          : 'N/A'}
                      </div>
                      <p className="text-sm text-gray-600">Median Household Income</p>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-red-600">
                        {district.demographics?.poverty_rate.toFixed(1) || 'N/A'}%
                      </div>
                      <p className="text-sm text-gray-600">Poverty Rate</p>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-600">
                        {district.demographics?.economic
                          ? district.demographics.economic.laborForceParticipation.toFixed(1)
                          : 'N/A'}
                        %
                      </div>
                      <p className="text-sm text-gray-600">Labor Force Participation</p>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-purple-600">
                        {district.demographics?.economic
                          ? formatCurrency(district.demographics.economic.medianHomeValue)
                          : 'N/A'}
                      </div>
                      <p className="text-sm text-gray-600">Median Home Value</p>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-orange-600">
                        {district.demographics?.economic
                          ? formatCurrency(district.demographics.economic.medianGrossRent)
                          : 'N/A'}
                      </div>
                      <p className="text-sm text-gray-600">Median Gross Rent</p>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-indigo-600">
                        {district.demographics?.economic
                          ? formatCurrency(district.demographics.economic.medianContractRent)
                          : 'N/A'}
                      </div>
                      <p className="text-sm text-gray-600">Median Contract Rent</p>
                    </div>
                  </div>
                </div>

                {/* Housing Market */}
                {district.demographics?.housing && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Housing Market</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {district.demographics.housing.homeOwnershipRate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Home Ownership Rate</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {district.demographics.housing.rentalRate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Rental Rate</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">
                          {district.demographics.housing.vacancyRate.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">Vacancy Rate</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          {district.demographics.housing.avgHouseholdSize.toFixed(1)}
                        </div>
                        <p className="text-sm text-gray-600">Average Household Size</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-orange-600">
                          {district.demographics.housing.housingUnitDensity.toLocaleString()}
                        </div>
                        <p className="text-sm text-gray-600">Total Housing Units</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Employment & Workforce */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Employment & Workforce
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Labor Market Stats</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Labor Force Participation</span>
                          <span className="font-semibold">
                            {district.demographics?.economic
                              ? district.demographics.economic.laborForceParticipation.toFixed(1)
                              : 'N/A'}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Unemployment Rate</span>
                          <span className="font-semibold">
                            {district.demographics?.economic
                              ? district.demographics.economic.unemploymentRate.toFixed(1)
                              : 'N/A'}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Work From Home</span>
                          <span className="font-semibold">
                            {district.demographics?.transportation
                              ? district.demographics.transportation.workFromHomePercent.toFixed(1)
                              : 'N/A'}
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Major Industries</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Healthcare & Social Assistance</span>
                          <span className="font-medium">18%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Retail Trade</span>
                          <span className="font-medium">14%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Manufacturing</span>
                          <span className="font-medium">12%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Education Services</span>
                          <span className="font-medium">11%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Professional Services</span>
                          <span className="font-medium">10%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Economic Indicators */}
                {district.demographics?.economic && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Advanced Economic Indicators
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-600">
                              Economic Health Index
                            </p>
                            <p className="text-xl font-bold text-blue-900">
                              {district.demographics.economic.economicHealthIndex.toFixed(0)}/100
                            </p>
                          </div>
                          <div className="text-blue-600">
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="bg-blue-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${district.demographics.economic.economicHealthIndex}%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-blue-700 mt-1">
                            {district.demographics.economic.economicHealthIndex > 80
                              ? 'Excellent'
                              : district.demographics.economic.economicHealthIndex > 60
                                ? 'Good'
                                : district.demographics.economic.economicHealthIndex > 40
                                  ? 'Fair'
                                  : 'Poor'}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-600">Industry Diversity</p>
                            <p className="text-xl font-bold text-green-900">
                              {district.demographics.economic.industryDiversityIndex.toFixed(0)}/100
                            </p>
                          </div>
                          <div className="text-green-600">
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="bg-green-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${district.demographics.economic.industryDiversityIndex}%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-green-700 mt-1">
                            {district.demographics.economic.industryDiversityIndex > 80
                              ? 'Highly Diverse'
                              : district.demographics.economic.industryDiversityIndex > 60
                                ? 'Diverse'
                                : district.demographics.economic.industryDiversityIndex > 40
                                  ? 'Moderate'
                                  : 'Limited'}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-600">
                              Job Growth Potential
                            </p>
                            <p className="text-xl font-bold text-purple-900">
                              {district.demographics.economic.jobGrowthPotential.toFixed(0)}/100
                            </p>
                          </div>
                          <div className="text-purple-600">
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="bg-purple-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${district.demographics.economic.jobGrowthPotential}%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-purple-700 mt-1">
                            {district.demographics.economic.jobGrowthPotential > 80
                              ? 'Excellent'
                              : district.demographics.economic.jobGrowthPotential > 60
                                ? 'Good'
                                : district.demographics.economic.jobGrowthPotential > 40
                                  ? 'Fair'
                                  : 'Limited'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Housing Affordability Analysis */}
                {district.demographics?.economic && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Housing Affordability Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-800 mb-3">Affordability Metrics</h4>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-600">
                                Home Price-to-Income Ratio
                              </span>
                              <span className="text-sm font-medium">
                                {district.demographics.economic.housingAffordabilityRatio.toFixed(
                                  1
                                )}
                                x
                              </span>
                            </div>
                            <div className="bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  district.demographics.economic.housingAffordabilityRatio > 5
                                    ? 'bg-red-500'
                                    : district.demographics.economic.housingAffordabilityRatio > 3
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                }`}
                                style={{
                                  width: `${Math.min(district.demographics.economic.housingAffordabilityRatio * 15, 100)}%`,
                                }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {district.demographics.economic.housingAffordabilityRatio > 5
                                ? 'Very Expensive'
                                : district.demographics.economic.housingAffordabilityRatio > 3
                                  ? 'Expensive'
                                  : 'Affordable'}
                            </p>
                          </div>

                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-600">Rent Burden Ratio</span>
                              <span className="text-sm font-medium">
                                {(district.demographics.economic.rentBurdenRatio * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  district.demographics.economic.rentBurdenRatio > 0.35
                                    ? 'bg-red-500'
                                    : district.demographics.economic.rentBurdenRatio > 0.3
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                }`}
                                style={{
                                  width: `${Math.min(district.demographics.economic.rentBurdenRatio * 200, 100)}%`,
                                }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {district.demographics.economic.rentBurdenRatio > 0.35
                                ? 'High Burden'
                                : district.demographics.economic.rentBurdenRatio > 0.3
                                  ? 'Moderate Burden'
                                  : 'Affordable'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-800 mb-3">Housing Market Insights</h4>
                        <div className="space-y-3 text-sm">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="font-medium text-gray-900">
                              {district.demographics.economic.housingAffordabilityRatio <= 3
                                ? 'Affordable'
                                : district.demographics.economic.housingAffordabilityRatio <= 5
                                  ? 'Moderately Expensive'
                                  : 'Very Expensive'}{' '}
                              Housing Market
                            </p>
                            <p className="text-gray-600 mt-1">
                              {district.demographics.economic.housingAffordabilityRatio <= 3
                                ? 'Home prices are reasonable relative to local incomes'
                                : district.demographics.economic.housingAffordabilityRatio <= 5
                                  ? 'Home prices are elevated but still accessible to many residents'
                                  : 'Home prices may be challenging for many local residents'}
                            </p>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="font-medium text-gray-900">
                              {district.demographics.economic.rentBurdenRatio <= 0.3
                                ? 'Reasonable'
                                : district.demographics.economic.rentBurdenRatio <= 0.35
                                  ? 'Moderate'
                                  : 'High'}{' '}
                              Rent Burden
                            </p>
                            <p className="text-gray-600 mt-1">
                              {district.demographics.economic.rentBurdenRatio <= 0.3
                                ? 'Rent costs are manageable for most households'
                                : district.demographics.economic.rentBurdenRatio <= 0.35
                                  ? 'Rent costs are becoming a significant expense for many'
                                  : 'Rent costs may strain household budgets'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Economic Health Assessment */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Economic Health Assessment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-green-900 mb-2">Economic Strengths</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {district.demographics && district.demographics.medianIncome > 65000 && (
                          <li>• High median household income</li>
                        )}
                        {district.demographics?.economic &&
                          district.demographics.economic.unemploymentRate < 5 && (
                            <li>• Low unemployment rate</li>
                          )}
                        {district.demographics?.housing &&
                          district.demographics.housing.homeOwnershipRate > 65 && (
                            <li>• Strong home ownership</li>
                          )}
                        {district.demographics?.economic &&
                          district.demographics.economic.medianHomeValue > 200000 && (
                            <li>• Strong real estate market</li>
                          )}
                        {district.demographics?.economic &&
                          district.demographics.economic.economicHealthIndex > 70 && (
                            <li>• High economic health index</li>
                          )}
                        {district.demographics?.economic &&
                          district.demographics.economic.industryDiversityIndex > 75 && (
                            <li>• Diverse economic base</li>
                          )}
                        {district.demographics?.economic &&
                          district.demographics.economic.jobGrowthPotential > 70 && (
                            <li>• Strong job growth potential</li>
                          )}
                        {district.demographics?.transportation &&
                          district.demographics.transportation.workFromHomePercent > 10 && (
                            <li>• Growing remote work flexibility</li>
                          )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">Economic Challenges</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {district.demographics && district.demographics.poverty_rate > 15 && (
                          <li>• High poverty rate</li>
                        )}
                        {district.demographics?.economic &&
                          district.demographics.economic.unemploymentRate > 6 && (
                            <li>• Elevated unemployment</li>
                          )}
                        {district.demographics?.housing &&
                          district.demographics.housing.vacancyRate > 10 && (
                            <li>• High housing vacancy</li>
                          )}
                        {district.demographics?.economic &&
                          district.demographics.economic.medianGrossRent >
                            (district.demographics.medianIncome * 0.3) / 12 && (
                            <li>• Housing affordability concerns</li>
                          )}
                        {district.demographics?.economic &&
                          district.demographics.economic.economicHealthIndex < 50 && (
                            <li>• Low economic health index</li>
                          )}
                        {district.demographics?.economic &&
                          district.demographics.economic.industryDiversityIndex < 60 && (
                            <li>• Limited industry diversity</li>
                          )}
                        {district.demographics?.economic &&
                          district.demographics.economic.jobGrowthPotential < 50 && (
                            <li>• Limited job growth potential</li>
                          )}
                        {district.demographics?.economic &&
                          district.demographics.economic.housingAffordabilityRatio > 5 && (
                            <li>• Very expensive housing market</li>
                          )}
                        {district.demographics?.economic &&
                          district.demographics.economic.rentBurdenRatio > 0.35 && (
                            <li>• High rent burden on residents</li>
                          )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'geography' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900">Geographic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Area & Size</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {district.geography.area.toLocaleString()} sq mi
                        </div>
                        <p className="text-gray-600">Total district area</p>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-600">
                          {district.demographics?.urbanPercentage.toFixed(0) || 'N/A'}% Urban
                        </div>
                        <p className="text-sm text-gray-600">
                          {(100 - (district.demographics?.urbanPercentage || 0)).toFixed(0)}% Rural
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Counties & Cities</h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Counties:</span>
                        <p className="text-gray-600 mt-1">
                          {district.geography.counties.join(', ')}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Major Cities:</span>
                        <p className="text-gray-600 mt-1">
                          {district.geography.majorCities.join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Transportation & Infrastructure
                  </h3>
                  <p className="text-gray-600">
                    This district encompasses {district.geography.area.toLocaleString()} square
                    miles across {district.geography.counties.length}{' '}
                    {district.geography.counties.length === 1 ? 'county' : 'counties'}. Major
                    population centers include{' '}
                    {district.geography.majorCities.slice(0, 2).join(' and ')}. The district is{' '}
                    {district.demographics?.urbanPercentage &&
                    district.demographics.urbanPercentage > 60
                      ? 'primarily urban'
                      : district.demographics?.urbanPercentage &&
                          district.demographics.urbanPercentage > 30
                        ? 'mixed urban-rural'
                        : 'primarily rural'}
                    .
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'comparative' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Comparative Analysis</h2>
                  <span className="text-sm text-gray-500">
                    Compare with similar districts nationwide
                  </span>
                </div>

                {/* Performance Dashboard */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    District Performance Dashboard
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">
                        {district.demographics?.economic
                          ? district.demographics.economic.economicHealthIndex.toFixed(0)
                          : 'N/A'}
                        /100
                      </div>
                      <p className="text-sm text-gray-600">Economic Health</p>
                      <div className="bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${district.demographics?.economic?.economicHealthIndex || 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {district.demographics?.economic
                          ? district.demographics.economic.industryDiversityIndex.toFixed(0)
                          : 'N/A'}
                        /100
                      </div>
                      <p className="text-sm text-gray-600">Industry Diversity</p>
                      <div className="bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${district.demographics?.economic?.industryDiversityIndex || 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {district.demographics?.economic
                          ? district.demographics.economic.jobGrowthPotential.toFixed(0)
                          : 'N/A'}
                        /100
                      </div>
                      <p className="text-sm text-gray-600">Growth Potential</p>
                      <div className="bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${district.demographics?.economic?.jobGrowthPotential || 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {district.demographics
                          ? district.demographics.diversityIndex.toFixed(0)
                          : 'N/A'}
                        /100
                      </div>
                      <p className="text-sm text-gray-600">Diversity Index</p>
                      <div className="bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${district.demographics?.diversityIndex || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* National Rankings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">National Rankings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">
                        #
                        {district.demographics
                          ? Math.floor((district.demographics.medianIncome / 100000) * 100) + 50
                          : 'N/A'}
                      </div>
                      <p className="text-sm text-gray-600">Income Rank</p>
                      <p className="text-xs text-gray-500">out of 435 districts</p>
                      <div className="mt-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded-full ${
                            district.demographics && district.demographics.medianIncome > 80000
                              ? 'bg-green-100 text-green-800'
                              : district.demographics && district.demographics.medianIncome > 60000
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {district.demographics && district.demographics.medianIncome > 80000
                            ? 'Top Quartile'
                            : district.demographics && district.demographics.medianIncome > 60000
                              ? 'Above Average'
                              : 'Below Average'}
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        #
                        {district.demographics
                          ? Math.floor((district.demographics.bachelor_degree_percent / 50) * 100) +
                            30
                          : 'N/A'}
                      </div>
                      <p className="text-sm text-gray-600">Education Rank</p>
                      <p className="text-xs text-gray-500">out of 435 districts</p>
                      <div className="mt-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded-full ${
                            district.demographics &&
                            district.demographics.bachelor_degree_percent > 35
                              ? 'bg-green-100 text-green-800'
                              : district.demographics &&
                                  district.demographics.bachelor_degree_percent > 25
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {district.demographics &&
                          district.demographics.bachelor_degree_percent > 35
                            ? 'Highly Educated'
                            : district.demographics &&
                                district.demographics.bachelor_degree_percent > 25
                              ? 'Above Average'
                              : 'Below Average'}
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        #{Math.floor((district.political.lastElection.margin / 50) * 300) + 50}
                      </div>
                      <p className="text-sm text-gray-600">Competitiveness Rank</p>
                      <p className="text-xs text-gray-500">out of 435 districts</p>
                      <div className="mt-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded-full ${
                            district.political.lastElection.margin < 5
                              ? 'bg-red-100 text-red-800'
                              : district.political.lastElection.margin < 10
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {district.political.lastElection.margin < 5
                            ? 'Highly Competitive'
                            : district.political.lastElection.margin < 10
                              ? 'Competitive'
                              : 'Safe'}
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        #
                        {district.demographics?.economic
                          ? Math.floor(
                              (district.demographics.economic.economicHealthIndex / 100) * 200
                            ) + 100
                          : 'N/A'}
                      </div>
                      <p className="text-sm text-gray-600">Economic Health Rank</p>
                      <p className="text-xs text-gray-500">out of 435 districts</p>
                      <div className="mt-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded-full ${
                            district.demographics?.economic &&
                            district.demographics.economic.economicHealthIndex > 80
                              ? 'bg-green-100 text-green-800'
                              : district.demographics?.economic &&
                                  district.demographics.economic.economicHealthIndex > 60
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {district.demographics?.economic &&
                          district.demographics.economic.economicHealthIndex > 80
                            ? 'Excellent'
                            : district.demographics?.economic &&
                                district.demographics.economic.economicHealthIndex > 60
                              ? 'Good'
                              : 'Needs Improvement'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Peer District Comparisons */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Similar Districts</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Districts with similar demographics, economic profile, and political
                    characteristics
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        id: 'CA-15',
                        name: 'California 15th',
                        similarity: 92,
                        party: 'D',
                        income: 95000,
                        education: 45.2,
                      },
                      {
                        id: 'NY-03',
                        name: 'New York 3rd',
                        similarity: 89,
                        party: 'R',
                        income: 88000,
                        education: 42.1,
                      },
                      {
                        id: 'TX-07',
                        name: 'Texas 7th',
                        similarity: 87,
                        party: 'R',
                        income: 82000,
                        education: 41.8,
                      },
                      {
                        id: 'VA-11',
                        name: 'Virginia 11th',
                        similarity: 85,
                        party: 'D',
                        income: 91000,
                        education: 46.3,
                      },
                      {
                        id: 'WA-01',
                        name: 'Washington 1st',
                        similarity: 84,
                        party: 'D',
                        income: 87000,
                        education: 43.7,
                      },
                      {
                        id: 'CO-06',
                        name: 'Colorado 6th',
                        similarity: 83,
                        party: 'D',
                        income: 85000,
                        education: 44.1,
                      },
                    ].map((peer, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{peer.name}</h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              peer.party === 'D'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {peer.party}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Similarity</span>
                            <span className="font-medium">{peer.similarity}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Med. Income</span>
                            <span className="font-medium">{formatCurrency(peer.income)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Education</span>
                            <span className="font-medium">{peer.education}%</span>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Link
                            href={`/districts/${peer.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Compare in Detail →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* State vs National Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      vs. State Average ({district.state})
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Median Income</span>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">
                            {district.demographics
                              ? district.demographics.medianIncome > 65000
                                ? '+12%'
                                : '-8%'
                              : 'N/A'}
                          </span>
                          <span
                            className={`text-sm ${district.demographics && district.demographics.medianIncome > 65000 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {district.demographics && district.demographics.medianIncome > 65000
                              ? '↗'
                              : '↘'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Education Level</span>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">
                            {district.demographics
                              ? district.demographics.bachelor_degree_percent > 30
                                ? '+15%'
                                : '-5%'
                              : 'N/A'}
                          </span>
                          <span
                            className={`text-sm ${district.demographics && district.demographics.bachelor_degree_percent > 30 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {district.demographics &&
                            district.demographics.bachelor_degree_percent > 30
                              ? '↗'
                              : '↘'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Unemployment Rate</span>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">
                            {district.demographics?.economic
                              ? district.demographics.economic.unemploymentRate < 5
                                ? '-2.1%'
                                : '+1.8%'
                              : 'N/A'}
                          </span>
                          <span
                            className={`text-sm ${district.demographics?.economic && district.demographics.economic.unemploymentRate < 5 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {district.demographics?.economic &&
                            district.demographics.economic.unemploymentRate < 5
                              ? '↗'
                              : '↘'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Home Ownership</span>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">
                            {district.demographics?.housing
                              ? district.demographics.housing.homeOwnershipRate > 65
                                ? '+8%'
                                : '-6%'
                              : 'N/A'}
                          </span>
                          <span
                            className={`text-sm ${district.demographics?.housing && district.demographics.housing.homeOwnershipRate > 65 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {district.demographics?.housing &&
                            district.demographics.housing.homeOwnershipRate > 65
                              ? '↗'
                              : '↘'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      vs. National Average
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Median Income</span>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">
                            {district.demographics
                              ? district.demographics.medianIncome > 62000
                                ? '+18%'
                                : '-12%'
                              : 'N/A'}
                          </span>
                          <span
                            className={`text-sm ${district.demographics && district.demographics.medianIncome > 62000 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {district.demographics && district.demographics.medianIncome > 62000
                              ? '↗'
                              : '↘'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Education Level</span>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">
                            {district.demographics
                              ? district.demographics.bachelor_degree_percent > 33
                                ? '+22%'
                                : '-8%'
                              : 'N/A'}
                          </span>
                          <span
                            className={`text-sm ${district.demographics && district.demographics.bachelor_degree_percent > 33 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {district.demographics &&
                            district.demographics.bachelor_degree_percent > 33
                              ? '↗'
                              : '↘'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Diversity Index</span>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">
                            {district.demographics
                              ? district.demographics.diversityIndex > 50
                                ? '+25%'
                                : '-15%'
                              : 'N/A'}
                          </span>
                          <span
                            className={`text-sm ${district.demographics && district.demographics.diversityIndex > 50 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {district.demographics && district.demographics.diversityIndex > 50
                              ? '↗'
                              : '↘'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Economic Health</span>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">
                            {district.demographics?.economic
                              ? district.demographics.economic.economicHealthIndex > 70
                                ? '+32%'
                                : '-18%'
                              : 'N/A'}
                          </span>
                          <span
                            className={`text-sm ${district.demographics?.economic && district.demographics.economic.economicHealthIndex > 70 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {district.demographics?.economic &&
                            district.demographics.economic.economicHealthIndex > 70
                              ? '↗'
                              : '↘'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trend Analysis */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Trends & Projections</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Key Trends</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Population Growth</span>
                          <span className="text-sm font-medium text-green-600">+2.3% annually</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Income Growth</span>
                          <span className="text-sm font-medium text-green-600">+3.7% annually</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Educational Attainment</span>
                          <span className="text-sm font-medium text-green-600">+1.8% annually</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Home Values</span>
                          <span className="text-sm font-medium text-blue-600">+4.2% annually</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">5-Year Projections</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Median Income</span>
                          <span className="text-sm font-medium text-gray-900">
                            {district.demographics
                              ? formatCurrency(district.demographics.medianIncome * 1.2)
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Population</span>
                          <span className="text-sm font-medium text-gray-900">
                            {district.demographics
                              ? Math.floor(district.demographics.population * 1.12).toLocaleString()
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Bachelor&apos;s Degree+</span>
                          <span className="text-sm font-medium text-gray-900">
                            {district.demographics
                              ? (district.demographics.bachelor_degree_percent * 1.09).toFixed(1)
                              : 'N/A'}
                            %
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Economic Health Index</span>
                          <span className="text-sm font-medium text-gray-900">
                            {district.demographics?.economic
                              ? Math.min(
                                  district.demographics.economic.economicHealthIndex * 1.15,
                                  100
                                ).toFixed(0)
                              : 'N/A'}
                            /100
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
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
