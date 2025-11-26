/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import {
  getStateDistrictDemographics,
  type StateDistrictDemographics,
} from '@/lib/services/state-census-api.service';
import { getChamberName } from '@/types/state-legislature';
import { MapPin, Users, Home } from 'lucide-react';
import type { EnhancedStateLegislator } from '@/types/state-legislature';
import { normalizeStateIdentifier, getStateName } from '@/lib/data/us-states';
import StateDistrictBoundaryMap from '@/features/districts/components/StateDistrictBoundaryMapClient';
import logger from '@/lib/logging/simple-logger';
import UnifiedRepresentativeCard from '@/components/districts/shared/UnifiedRepresentativeCard';
import UnifiedDemographicsDisplay from '@/components/districts/shared/UnifiedDemographicsDisplay';
import UnifiedDistrictSidebar from '@/components/districts/shared/UnifiedDistrictSidebar';
import { fetchDistrictBiography } from '@/lib/api/wikipedia';
import type { WikipediaBiography } from '@/lib/api/wikipedia';

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

interface PageProps {
  params: Promise<{ state: string; chamber: string; district: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, chamber, district } = await params;
  const stateCode = normalizeStateIdentifier(state);
  const stateName = stateCode ? getStateName(stateCode) || state : state;

  // Validate chamber
  const validChamber = chamber === 'lower' || chamber === 'upper' ? chamber : 'lower';
  const chamberName = stateCode ? getChamberName(stateCode, validChamber) : 'Legislature';

  return {
    title: `${stateName} ${chamberName} District ${district} - CIV.IQ`,
    description: `View information about ${stateName} ${chamberName} District ${district}, including representatives and demographics.`,
  };
}

export default async function StateDistrictPage({
  params,
  searchParams,
}: PageProps & { searchParams?: Promise<{ address?: string; from?: string }> }) {
  const { state, chamber: rawChamber, district } = await params;
  const search = searchParams ? await searchParams : {};

  // Normalize state parameter (handles both full names like "South Carolina" and codes like "SC")
  const stateCode = normalizeStateIdentifier(state);
  if (!stateCode) {
    notFound();
  }

  // Validate chamber parameter
  const chamber = rawChamber === 'lower' || rawChamber === 'upper' ? rawChamber : null;
  if (!chamber) {
    notFound();
  }

  // Get address from query params for breadcrumb
  const fromAddress = search?.address || search?.from;

  // Try to fetch legislators for this district
  // Note: This may fail due to API rate limits, but we still want to show the map
  let districtLegislators: EnhancedStateLegislator[] = [];

  try {
    // Fetch all legislators for the state
    const allLegislators = await StateLegislatureCoreService.getAllStateLegislators(stateCode);

    // Filter legislators by BOTH district AND chamber
    districtLegislators = allLegislators.filter(
      leg => leg.district === district && leg.chamber === chamber
    );
  } catch (error) {
    // API rate limit or other error - continue rendering without legislator data
    logger.warn('Failed to fetch legislators (continuing without data)', {
      stateCode,
      district,
      chamber,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Fetch demographics (also handle errors gracefully)
  let demographics: StateDistrictDemographics | null = null;
  try {
    demographics = await getStateDistrictDemographics(stateCode, district, chamber);
  } catch (error) {
    logger.warn('Failed to fetch demographics', {
      stateCode,
      district,
      chamber,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Get chamber info
  const chamberName = getChamberName(stateCode, chamber);

  // Get full state name for display
  const stateName = getStateName(stateCode) || stateCode;

  // Fetch Wikipedia biography for the district (graceful fallback - shows nothing if not available)
  let wikipediaBio: WikipediaBiography | null = null;
  try {
    wikipediaBio = await fetchDistrictBiography(stateName, parseInt(district, 10), chamber);
  } catch {
    // Silently fail - Wikipedia data is optional enhancement
    logger.debug('Wikipedia data not available for this district', {
      stateName,
      district,
      chamber,
    });
  }

  return (
    <div className="min-h-screen bg-white">
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
              <Link href="/state-legislature" className="text-blue-600 font-medium">
                State Legislatures
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6">
          <Link
            href={
              fromAddress
                ? `/representatives?address=${encodeURIComponent(fromAddress)}`
                : `/state-legislature/${stateCode}`
            }
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>
              {fromAddress ? `Back to All Representatives` : `Back to ${stateName} Legislature`}
            </span>
          </Link>
        </nav>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {stateName} {chamberName} District {district}
          </h1>
          <p className="text-gray-600">
            {chamberName} • {districtLegislators.length}{' '}
            {districtLegislators.length === 1 ? 'Representative' : 'Representatives'}
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* District Map */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                District Boundaries
              </h2>
              <StateDistrictBoundaryMap
                stateCode={stateCode}
                chamber={chamber}
                district={district}
                height={500}
              />
            </div>

            {/* Wikipedia Info - Only show if available */}
            {wikipediaBio && wikipediaBio.wikipediaSummary && (
              <div className="bg-white border-2 border-black p-6">
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed">{wikipediaBio.wikipediaSummary}</p>
                  {wikipediaBio.wikipediaPageUrl && (
                    <p className="mt-4">
                      <a
                        href={wikipediaBio.wikipediaPageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        Read more on Wikipedia →
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Representatives */}
            {districtLegislators.length > 0 ? (
              <div className="space-y-4">
                {districtLegislators.map(legislator => (
                  <UnifiedRepresentativeCard
                    key={legislator.id}
                    representative={legislator}
                    districtName={`${stateName} ${chamberName} District ${district}`}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-black p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Representatives
                </h2>
                <div className="text-gray-600 text-center py-8">
                  No legislators found for this district.
                </div>
              </div>
            )}

            {/* Demographics */}
            {demographics && <UnifiedDemographicsDisplay demographics={demographics} />}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <UnifiedDistrictSidebar
              districtInfo={{
                state: stateName,
                district: district,
                chamber: chamberName,
              }}
              quickLinks={[
                {
                  href: `/state-legislature/${stateCode}`,
                  label: `← Back to ${stateName} Legislature`,
                },
              ]}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
