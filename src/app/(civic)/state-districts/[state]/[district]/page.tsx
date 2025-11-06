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
import { SimpleBreadcrumb } from '@/components/shared/ui/Breadcrumb';
import { MapPin, Users } from 'lucide-react';
import Image from 'next/image';
import type { EnhancedStateLegislator } from '@/types/state-legislature';

interface PageProps {
  params: Promise<{ state: string; district: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, district } = await params;
  return {
    title: `${state} State District ${district} - CIV.IQ`,
    description: `View information about ${state} State District ${district}, including representatives and demographics.`,
  };
}

export default async function StateDistrictPage({ params }: PageProps) {
  const { state, district } = await params;

  // Fetch all legislators for the state
  const allLegislators = await StateLegislatureCoreService.getAllStateLegislators(state);

  // Filter legislators by district
  const districtLegislators = allLegislators.filter(leg => leg.district === district);

  if (districtLegislators.length === 0) {
    notFound();
  }

  // Get chamber from first legislator
  const chamber = districtLegislators[0]?.chamber || 'lower';

  // Fetch demographics
  const demographics = await getStateDistrictDemographics(state, district, chamber);

  // Get chamber info
  const chamberName = getChamberName(state, chamber);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <SimpleBreadcrumb />

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {state} State District {district}
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
                  <span className="text-sm text-gray-600">{state}</span>
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
                  href={`/state-legislature/${state}`}
                  className="block text-sm text-civiq-blue hover:underline"
                >
                  ← Back to {state} Legislature
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
    <Link
      href={`/state-legislature/${legislator.state}/legislator/${legislator.id}`}
      className="block bg-gray-50 border-2 border-gray-300 p-4 hover:bg-gray-100 hover:border-civiq-blue transition-colors"
    >
      <div className="flex items-start gap-4">
        {legislator.photo_url && (
          <Image
            src={legislator.photo_url}
            alt={legislator.name}
            width={80}
            height={80}
            className="rounded-full border-2 border-gray-300"
          />
        )}
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">{legislator.name}</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div>{legislator.party}</div>
            <div>
              {legislator.state} - District {legislator.district}
            </div>
            {legislator.email && <div className="text-civiq-blue">{legislator.email}</div>}
          </div>
        </div>
      </div>
    </Link>
  );
}

function DemographicsDisplay({ demographics }: { demographics: StateDistrictDemographics }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {demographics.population && (
          <div>
            <div className="text-sm text-gray-600">Population</div>
            <div className="font-semibold">{demographics.population.toLocaleString()}</div>
          </div>
        )}
        {demographics.medianIncome && (
          <div>
            <div className="text-sm text-gray-600">Median Income</div>
            <div className="font-semibold">${demographics.medianIncome.toLocaleString()}</div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Racial Composition</h3>
        <div className="space-y-2">
          {[
            { label: 'White', value: demographics.white_percent },
            { label: 'Black', value: demographics.black_percent },
            { label: 'Hispanic', value: demographics.hispanic_percent },
            { label: 'Asian', value: demographics.asian_percent },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="text-sm text-gray-600 w-24">{label}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div className="bg-civiq-blue h-2 rounded-full" style={{ width: `${value}%` }} />
              </div>
              <div className="text-sm text-gray-600 w-12 text-right">{value.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
