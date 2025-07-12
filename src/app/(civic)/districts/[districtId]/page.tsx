'use client';


/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DemographicStats, ElectionResults, PopulationPyramid } from '@/components/Charts';
import DistrictBoundaryMap from '@/components/DistrictBoundaryMap';
import { DistrictCharts } from '@/components/DistrictCharts';

function CiviqLogo() {
  return (
    <div className="flex items-center">
      <svg className="w-8 h-8" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="36" y="51" width="28" height="30" fill="#0b983c"/>
        <circle cx="50" cy="31" r="22" fill="#ffffff"/>
        <circle cx="50" cy="31" r="20" fill="#e11d07"/>
        <circle cx="38" cy="89" r="2" fill="#3ea2d4"/>
        <circle cx="46" cy="89" r="2" fill="#3ea2d4"/>
        <circle cx="54" cy="89" r="2" fill="#3ea2d4"/>
        <circle cx="62" cy="89" r="2" fill="#3ea2d4"/>
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
  const [activeTab, setActiveTab] = useState<'overview' | 'demographics' | 'politics' | 'economy' | 'geography'>('overview');

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
              <Link href="/representatives" className="text-gray-700 hover:text-blue-600 transition-colors">
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
            <span className={`px-4 py-2 rounded-full text-lg font-semibold ${getPVIBackground(district.political.cookPVI)} ${getPVIColor(district.political.cookPVI)}`}>
              {district.political.cookPVI}
            </span>
          </div>

          {/* Representative Info */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Representative</h2>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                {district.representative.imageUrl ? (
                  <img 
                    src={district.representative.imageUrl} 
                    alt={district.representative.name}
                    className="w-20 h-20 object-cover"
                  />
                ) : (
                  <span className="text-sm text-gray-600">Photo</span>
                )}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{district.representative.name}</h3>
                <p className="text-lg text-gray-600">
                  {district.representative.party === 'D' ? 'Democrat' : 
                   district.representative.party === 'R' ? 'Republican' : 
                   district.representative.party}
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

        {/* District Map */}
        <div className="mb-8">
          <DistrictBoundaryMap 
            districtId={district.id}
            state={district.state}
            district={district.number}
            width={1200}
            height={500}
          />
        </div>

        {/* Enhanced Tabbed Interface */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'demographics', label: 'Demographics', icon: '👥' },
                { id: 'politics', label: 'Politics & Elections', icon: '🗳️' },
                { id: 'economy', label: 'Economy', icon: '💼' },
                { id: 'geography', label: 'Geography', icon: '🗺️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
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
                        {district.demographics ? formatCurrency(district.demographics.medianIncome) : 'N/A'}
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
                <DistrictCharts districtData={district} />
              </div>
            )}

            {activeTab === 'politics' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900">Political Analysis</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {district.political.cookPVI}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Cook PVI Rating</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {district.political.lastElection.margin.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Last Election Margin</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {district.political.registeredVoters.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Registered Voters</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Election History</h3>
                  <p className="text-gray-600">
                    This district has a <strong>{district.political.cookPVI}</strong> partisan voting index, 
                    indicating it leans {district.political.cookPVI.startsWith('D+') ? 'Democratic' : 
                    district.political.cookPVI.startsWith('R+') ? 'Republican' : 'neutral'}.
                    In the most recent election, the winning margin was <strong>{district.political.lastElection.margin.toFixed(1)}%</strong> 
                    with a turnout of <strong>{district.political.lastElection.turnout}%</strong>.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'economy' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900">Economic Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Economic Indicators</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Median Household Income</span>
                        <span className="font-semibold">
                          {district.demographics ? formatCurrency(district.demographics.medianIncome) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Poverty Rate</span>
                        <span className="font-semibold">
                          {district.demographics?.poverty_rate.toFixed(1) || 'N/A'}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Bachelor's Degree or Higher</span>
                        <span className="font-semibold">
                          {district.demographics?.bachelor_degree_percent.toFixed(1) || 'N/A'}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Major Industries</h3>
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
                        <p className="text-gray-600 mt-1">{district.geography.counties.join(', ')}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Major Cities:</span>
                        <p className="text-gray-600 mt-1">{district.geography.majorCities.join(', ')}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Transportation & Infrastructure</h3>
                  <p className="text-gray-600">
                    This district encompasses {district.geography.area.toLocaleString()} square miles across{' '}
                    {district.geography.counties.length} {district.geography.counties.length === 1 ? 'county' : 'counties'}.
                    Major population centers include {district.geography.majorCities.slice(0, 2).join(' and ')}.
                    The district is {district.demographics?.urbanPercentage && district.demographics.urbanPercentage > 60 ? 'primarily urban' : 
                    district.demographics?.urbanPercentage && district.demographics.urbanPercentage > 30 ? 'mixed urban-rural' : 'primarily rural'}.
                  </p>
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
            © 2024 CIV.IQ - Empowering civic engagement through transparency
          </p>
        </div>
      </footer>
    </div>
  );
}