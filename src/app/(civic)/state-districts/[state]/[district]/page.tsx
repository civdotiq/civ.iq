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
import Image from 'next/image';
import type { EnhancedStateLegislator } from '@/types/state-legislature';
import { normalizeStateIdentifier, getStateName } from '@/lib/data/us-states';

interface PageProps {
  params: Promise<{ state: string; district: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, district } = await params;
  const stateCode = normalizeStateIdentifier(state);
  const stateName = stateCode ? getStateName(stateCode) || state : state;
  return {
    title: `${stateName} State District ${district} - CIV.IQ`,
    description: `View information about ${stateName} State District ${district}, including representatives and demographics.`,
  };
}

export default async function StateDistrictPage({ params }: PageProps) {
  const { state, district } = await params;

  // Normalize state parameter (handles both full names like "South Carolina" and codes like "SC")
  const stateCode = normalizeStateIdentifier(state);
  if (!stateCode) {
    notFound();
  }

  // Fetch all legislators for the state
  const allLegislators = await StateLegislatureCoreService.getAllStateLegislators(stateCode);

  // Filter legislators by district
  const districtLegislators = allLegislators.filter(leg => leg.district === district);

  if (districtLegislators.length === 0) {
    notFound();
  }

  // Get chamber from first legislator
  const chamber = districtLegislators[0]?.chamber || 'lower';

  // Fetch demographics
  const demographics = await getStateDistrictDemographics(stateCode, district, chamber);

  // Get chamber info
  const chamberName = getChamberName(stateCode, chamber);

  // Get full state name for display
  const stateName = getStateName(stateCode) || stateCode;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6">
          <Link
            href={`/state-legislature/${stateCode}`}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Back to {stateName} Legislature</span>
          </Link>
        </nav>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {stateName} State District {district}
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
            {/* Representatives */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                {districtLegislators.length === 1 ? 'Representative' : 'Representatives'}
              </h2>
              <div className="space-y-4">
                {districtLegislators.map(legislator => (
                  <LegislatorCard key={legislator.id} legislator={legislator} />
                ))}
              </div>
            </div>

            {/* Demographics */}
            {demographics && (
              <div className="bg-white border-2 border-black p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Demographics</h2>
                <DemographicsDisplay demographics={demographics} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* District Info */}
            <div className="bg-white border-2 border-black p-6">
              <h3 className="aicher-section-label mb-3 flex items-center gap-2 text-civiq-blue">
                <MapPin className="w-4 h-4" />
                DISTRICT INFO
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">State: </span>
                  <span className="text-sm text-gray-600">{stateName}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">District: </span>
                  <span className="text-sm text-gray-600">{district}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Chamber: </span>
                  <span className="text-sm text-gray-600">{chamberName}</span>
                </div>
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="bg-white border-2 border-black p-6">
              <h3 className="aicher-section-label mb-3 text-civiq-blue">QUICK LINKS</h3>
              <div className="space-y-2">
                <Link
                  href={`/state-legislature/${stateCode}`}
                  className="block text-sm text-civiq-blue hover:underline"
                >
                  ← Back to {stateName} Legislature
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function LegislatorCard({ legislator }: { legislator: EnhancedStateLegislator }) {
  return (
    <div className="bg-gray-50 border-2 border-gray-300 p-6">
      <div className="flex items-start gap-6">
        {legislator.photo_url && (
          <Image
            src={legislator.photo_url}
            alt={legislator.name}
            width={100}
            height={100}
            className="rounded-full border-2 border-gray-300"
          />
        )}
        <div className="flex-1">
          <h3 className="font-bold text-2xl mb-2">{legislator.name}</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                Representative for {legislator.state} District {legislator.district}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                  legislator.party === 'Democratic'
                    ? 'bg-blue-100 text-blue-800'
                    : legislator.party === 'Republican'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {legislator.party}
              </span>
            </div>
            {legislator.email && (
              <div className="text-civiq-blue hover:underline">
                <a href={`mailto:${legislator.email}`}>{legislator.email}</a>
              </div>
            )}
          </div>
          <Link
            href={`/state-legislature/${legislator.state}/legislator/${legislator.id}`}
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            View Full Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

function DemographicsDisplay({ demographics }: { demographics: StateDistrictDemographics }) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Colored Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-600 p-4 rounded">
          <div className="text-2xl font-bold text-white">
            {demographics.population.toLocaleString()}
          </div>
          <p className="text-sm text-white mt-1 uppercase tracking-wide">Total Population</p>
        </div>

        <div className="bg-green-600 p-4 rounded">
          <div className="text-2xl font-bold text-white">
            {formatCurrency(demographics.medianIncome)}
          </div>
          <p className="text-sm text-white mt-1 uppercase tracking-wide">Median Income</p>
        </div>

        <div className="bg-purple-100 border-2 border-black p-4 rounded">
          <div className="text-2xl font-bold text-purple-900">
            {demographics.medianAge.toFixed(1)}
          </div>
          <p className="text-sm text-purple-700 mt-1 uppercase tracking-wide">Median Age</p>
        </div>

        <div className="bg-red-600 p-4 rounded">
          <div className="text-2xl font-bold text-white">
            {demographics.urbanPercentage.toFixed(0)}%
          </div>
          <p className="text-sm text-white mt-1 uppercase tracking-wide">Urban Population</p>
        </div>
      </div>

      {/* Racial & Ethnic Composition */}
      <div className="bg-gray-50 border-2 border-gray-300 p-6 rounded">
        <h3 className="text-md font-bold text-gray-900 mb-4 uppercase tracking-wide">
          Racial & Ethnic Composition
        </h3>
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

      {/* Education & Economy */}
      <div className="bg-gray-50 border-2 border-gray-300 p-6 rounded">
        <h3 className="text-md font-bold text-gray-900 mb-4 uppercase tracking-wide">
          Education & Economy
        </h3>
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
