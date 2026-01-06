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
import { Header } from '@/shared/components/navigation/Header';
import {
  FAQSection,
  RelatedLinks,
  FreshnessTimestamp,
  CategoryTags,
} from '@/components/seo/WikipediaStyleSEO';
import type { FAQItem, RelatedLink } from '@/components/seo/WikipediaStyleSEO';

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
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pt-24">
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

        {/* Wikipedia-style SEO Section */}
        <div className="mt-12 space-y-8">
          {/* FAQ Section - Common questions about the district */}
          <FAQSection
            faqs={[
              {
                question: `Who represents ${district.name}?`,
                answer:
                  district.number === 'STATE'
                    ? `${district.representative.name} (${district.representative.party}) currently represents ${district.state} in the U.S. Senate.`
                    : `${district.representative.name} (${district.representative.party}) currently represents ${district.name} in the U.S. House of Representatives.`,
              },
              {
                question:
                  district.number === 'STATE'
                    ? `What are the major counties in ${district.state}?`
                    : `What counties are in ${district.name}?`,
                answer:
                  district.number === 'STATE'
                    ? `${district.state} has ${district.geography.counties.length} major counties including: ${district.geography.counties.slice(0, 5).join(', ')}${district.geography.counties.length > 5 ? ` and ${district.geography.counties.length - 5} more` : ''}.`
                    : `${district.name} includes ${district.geography.counties.length} counties: ${district.geography.counties.slice(0, 5).join(', ')}${district.geography.counties.length > 5 ? ` and ${district.geography.counties.length - 5} more` : ''}.`,
              },
              {
                question:
                  district.number === 'STATE'
                    ? `What are the major cities in ${district.state}?`
                    : `What are the major cities in ${district.name}?`,
                answer:
                  district.geography.majorCities.length > 0
                    ? district.number === 'STATE'
                      ? `The major cities in ${district.state} include ${district.geography.majorCities.join(', ')}.`
                      : `The major cities in this district include ${district.geography.majorCities.join(', ')}.`
                    : `This district encompasses various communities across ${district.state}.`,
              },
              district.demographics?.population
                ? {
                    question:
                      district.number === 'STATE'
                        ? `What is the population of ${district.state}?`
                        : `What is the population of ${district.name}?`,
                    answer:
                      district.number === 'STATE'
                        ? `${district.state} has a population of approximately ${district.demographics.population.toLocaleString()} residents.`
                        : `${district.name} has a population of approximately ${district.demographics.population.toLocaleString()} residents.`,
                  }
                : null,
            ].filter((faq): faq is FAQItem => faq !== null)}
            title="Frequently Asked Questions"
          />

          {/* Related Links - Internal link network */}
          <RelatedLinks
            links={
              [
                {
                  href: `/representative/${district.representative.bioguideId}`,
                  title: district.representative.name,
                  description:
                    district.number === 'STATE'
                      ? `${district.representative.party} Senator for ${district.state}`
                      : `${district.representative.party} Representative for this district`,
                  type: 'representative',
                },
                {
                  href: `/delegation/${district.state}`,
                  title: `${district.state} Congressional Delegation`,
                  description: `All representatives and senators from ${district.state}`,
                  type: 'state',
                },
                {
                  href: '/districts',
                  title: 'All Congressional Districts',
                  description: 'Browse all 435 congressional districts',
                  type: 'district',
                },
                {
                  href: '/congress',
                  title: 'U.S. Congress',
                  description: 'Overview of the 119th Congress',
                  type: 'representative',
                },
              ] as RelatedLink[]
            }
            title="Related Pages"
          />

          {/* Freshness Timestamp */}
          <FreshnessTimestamp lastUpdated={new Date()} dataSource="U.S. Census Bureau" />

          {/* Category Tags */}
          <CategoryTags
            categories={[
              { name: district.state, href: `/delegation/${district.state}` },
              { name: 'Congressional Districts', href: '/districts' },
              { name: '119th Congress', href: '/congress' },
            ]}
          />
        </div>
      </main>
    </div>
  );
}
