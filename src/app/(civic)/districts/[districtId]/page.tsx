'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import UnifiedRepresentativeCard from '@/components/districts/shared/UnifiedRepresentativeCard';
import UnifiedDistrictSidebar from '@/components/districts/shared/UnifiedDistrictSidebar';
import UnifiedDemographicsDisplay from '@/components/districts/shared/UnifiedDemographicsDisplay';
import NeighboringDistricts from '@/features/districts/components/NeighboringDistricts';
import logger from '@/lib/logging/simple-logger';
import { SimpleBreadcrumb } from '@/components/shared/ui/Breadcrumb';

// Dynamic import of the map component to avoid SSR issues
const DistrictMap = dynamic(() => import('@/features/districts/components/DistrictMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-white border-2 border-gray-300">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
        <p className="text-sm text-gray-600">Loading district map...</p>
      </div>
    </div>
  ),
});

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
  wikidata?: {
    established?: string;
    area?: number;
    previousRepresentatives?: string[];
    wikipediaUrl?: string;
  } | null;
}

interface APIResponse {
  district: DistrictDetails;
  metadata: {
    timestamp: string;
    dataSource: string;
    note: string;
    districtBoundaries: {
      congress: string;
      redistrictingYear: string;
      source: string;
      note: string;
    };
  };
}

export default function DistrictPage() {
  const params = useParams();
  const districtId = params?.districtId as string;
  const [district, setDistrict] = useState<DistrictDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDistrict() {
      try {
        setLoading(true);
        logger.info('🔄 Starting fetch for district:', districtId);

        const response = await fetch(`/api/districts/${districtId}`);
        logger.info('📡 Fetch response:', response.status, response.statusText);

        if (!response.ok) {
          throw new Error(`Failed to fetch district: ${response.status}`);
        }

        const data: APIResponse = await response.json();
        logger.info('✅ District data loaded:', data.district.name);
        setDistrict(data.district);
      } catch (err) {
        logger.error('❌ District fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load district');
      } finally {
        logger.info('🏁 District loading complete');
        setLoading(false);
      }
    }

    if (districtId) {
      fetchDistrict();
    }
  }, [districtId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading district details...</p>
        </div>
      </div>
    );
  }

  if (error || !district) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">District Not Found</h1>
          <p className="text-gray-600 mb-4">
            {error || 'The requested district could not be found.'}
          </p>
          <Link
            href="/districts"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            Browse All Districts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white density-default">
      {/* Header */}
      <header className="bg-white border-2 border-black border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <CiviqLogo />
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/representatives" className="text-gray-600 font-medium">
                Representatives
              </Link>
              <Link href="/districts" className="text-blue-600 font-medium">
                Districts
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <SimpleBreadcrumb />

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{district.name}</h1>
          <p className="text-gray-600">
            Congressional District in {district.state} • {district.geography.counties.length}{' '}
            Counties
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Representative */}
            <UnifiedRepresentativeCard
              representative={district.representative}
              districtName={district.name}
            />

            {/* Interactive Map */}
            <div className="bg-white rounded-2xl border-2 border-black border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">District Boundaries</h2>
              <DistrictMap state={district.state} district={district.number} />
            </div>

            {/* Demographics */}
            <UnifiedDemographicsDisplay demographics={district.demographics} />
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Navigation */}
            <UnifiedDistrictSidebar
              representativeName={district.representative.name}
              representativeLink={`/representative/${district.representative.bioguideId}`}
              counties={district.geography.counties}
              majorCities={district.geography.majorCities}
              quickLinks={[
                { href: '/representatives', label: 'All Representatives' },
                { href: '/districts', label: 'All Districts' },
                {
                  href: `/districts/${district.state}-Senate`,
                  label: `${district.state} Senate Seats`,
                },
              ]}
            />

            {/* Wikidata Facts */}
            {district.wikidata && (
              <div className="bg-white rounded-2xl border-2 border-black border border-gray-100 p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Historical Facts</h3>
                <div className="space-y-3">
                  {district.wikidata.established && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Established: </span>
                      <span className="text-sm text-gray-600">
                        {new Date(district.wikidata.established).getFullYear()}
                      </span>
                    </div>
                  )}
                  {district.wikidata.wikipediaUrl && (
                    <div>
                      <a
                        href={district.wikidata.wikipediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View on Wikipedia →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Neighboring Districts */}
        <div className="mt-12">
          <NeighboringDistricts currentDistrict={district.id} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">Data sourced from Congress.gov, Census.gov, and Wikidata</p>
          <p className="text-gray-500 text-sm mt-2">
            © 2019-2025 Mark Sandford. CIV.IQ™ - The Original Civic Information Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
