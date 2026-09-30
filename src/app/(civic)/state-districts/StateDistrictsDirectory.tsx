'use client';

/**
 * State Legislative Districts directory (client: the state search box).
 *
 * Displays all 50 states for browsing state legislative district maps. Each
 * link goes to a district the roster actually has; "1" does not exist in
 * every chamber ("1st Suffolk", "1A", "A").
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { useState } from 'react';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { getAllStateLegislatures, getTotalSeats } from '@/lib/data/static-state-legislatures';
import { getStateName } from '@/lib/data/us-states';
import { ExploreFooter } from '@/components/seo/ExploreFooter';

export type FirstDistricts = Record<string, Partial<Record<'upper' | 'lower', string>>>;

function districtHref(state: string, chamber: 'upper' | 'lower', district: string): string {
  return `/state-districts/${state}/${chamber}/${encodeURIComponent(district)}`;
}

export function StateDistrictsDirectory({ firstDistricts }: { firstDistricts: FirstDistricts }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Get all state legislature data
  const legislatures = getAllStateLegislatures();
  const stateCodes = Object.keys(legislatures).filter(code => code !== 'DC');

  // Filter states based on search
  const filteredStates = stateCodes.filter(code => {
    const name = getStateName(code) ?? code;
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'State Districts', url: 'https://civdotiq.org/state-districts' },
        ]}
      />
      <main className="min-h-screen px-4 pt-8 pb-16 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb Navigation */}
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-civiq-blue">
              Home
            </Link>
            <span className="mx-2">›</span>
            <Link href="/states" className="hover:text-civiq-blue">
              States
            </Link>
            <span className="mx-2">›</span>
            <span className="font-medium text-gray-900">State Districts</span>
          </nav>

          {/* Page header */}
          <h1 className="accent-section-header-green text-4xl text-center mb-8">
            State Legislative Districts
          </h1>

          <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-12">
            Explore interactive maps of state legislative districts across all 50 states. View
            senate and house district boundaries with detailed information.
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-12">
            <input
              type="text"
              placeholder="Search states..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-civiq-green focus:border-transparent"
            />
          </div>

          {/* States Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStates.map(code => {
              const legislature = legislatures[code];
              if (!legislature) return null;

              const totalDistricts = getTotalSeats(code) ?? 0;
              const stateName = getStateName(code) ?? code;
              const lowerCode = code.toLowerCase();
              const first = firstDistricts[code] ?? {};
              // Nebraska's one chamber files as `upper` in the roster.
              const unicameralChamber = first.upper ? 'upper' : first.lower ? 'lower' : null;
              const unicameral = unicameralChamber
                ? ([unicameralChamber, first[unicameralChamber] as string] as const)
                : null;

              return (
                <div
                  key={code}
                  className="bg-white border-2 border-black hover:border-civiq-green transition-colors p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{stateName}</h3>
                      <p className="text-gray-500">{code}</p>
                    </div>
                    <span className="text-3xl font-bold text-civiq-green">{totalDistricts}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {legislature.unicameral ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{legislature.chambers.lower.name}:</span>
                        <span className="font-medium">
                          {legislature.chambers.lower.seats} districts
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{legislature.chambers.upper.name}:</span>
                          <span className="font-medium">
                            {legislature.chambers.upper.seats} districts
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{legislature.chambers.lower.name}:</span>
                          <span className="font-medium">
                            {legislature.chambers.lower.seats} districts
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    {legislature.unicameral ? (
                      unicameral && (
                        <Link
                          href={districtHref(lowerCode, unicameral[0], unicameral[1])}
                          className="block w-full text-center bg-civiq-green text-white py-2 hover:bg-civiq-green transition-colors font-medium"
                        >
                          View Districts
                        </Link>
                      )
                    ) : (
                      <>
                        {first.upper && (
                          <Link
                            href={districtHref(lowerCode, 'upper', first.upper)}
                            className="block w-full text-center bg-civiq-green text-white py-2 hover:bg-civiq-green transition-colors font-medium"
                          >
                            View {legislature.chambers.upper.name} Districts
                          </Link>
                        )}
                        {first.lower && (
                          <Link
                            href={districtHref(lowerCode, 'lower', first.lower)}
                            className="block w-full text-center bg-white text-civiq-green py-2 border-2 border-civiq-green hover:bg-civiq-green hover:text-white transition-colors font-medium"
                          >
                            View {legislature.chambers.lower.name} Districts
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Stats */}
          <div className="mt-16 accent-card-stripe-green p-8">
            <h2 className="accent-heading text-2xl mb-6 text-center">
              State Legislative Districts Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-4xl font-bold text-civiq-green">7,383</p>
                <p className="text-gray-600">Total Districts</p>
                <p className="text-sm text-gray-500 mt-2">Across all 50 states</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-civiq-green">1,972</p>
                <p className="text-gray-600">State Senate Districts</p>
                <p className="text-sm text-gray-500 mt-2">Upper chambers</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-civiq-green">5,411</p>
                <p className="text-gray-600">State House Districts</p>
                <p className="text-sm text-gray-500 mt-2">Lower chambers</p>
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="mt-8 p-4 bg-gray-50 border border-gray-200 text-sm text-gray-600 text-center">
            District boundary data from U.S. Census Bureau TIGER/Line files. Maps optimized with
            PMTiles for fast loading.
          </div>
        </div>

        <ExploreFooter
          variant="state"
          currentSection="State Districts"
          relatedLinks={[
            { href: '/states', label: 'All 50 States' },
            { href: '/state-bills', label: 'State Bill Search' },
            { href: '/glossary', label: 'Glossary' },
          ]}
        />
      </main>
    </>
  );
}
