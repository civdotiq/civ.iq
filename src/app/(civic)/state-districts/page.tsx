'use client';

/**
 * State Legislative Districts Index Page
 *
 * Displays all 50 states + DC for browsing state legislative district maps.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { useState } from 'react';
import { Header } from '@/shared/components/navigation/Header';
import { getAllStateLegislatures, getTotalSeats } from '@/lib/data/static-state-legislatures';

// State names for display
const stateNames: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'Washington, D.C.',
};

export default function StateDistrictsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Get all state legislature data
  const legislatures = getAllStateLegislatures();
  const stateCodes = Object.keys(legislatures).filter(code => code !== 'DC');

  // Filter states based on search
  const filteredStates = stateCodes.filter(code => {
    const name = stateNames[code] ?? code;
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <>
      <Header />

      <main className="min-h-screen pt-20 px-4 pb-16 bg-white">
        <div className="max-w-7xl mx-auto">
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
              const stateName = stateNames[code] ?? code;
              const lowerCode = code.toLowerCase();

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
                      <Link
                        href={`/state-districts/${lowerCode}/lower/1`}
                        className="block w-full text-center bg-civiq-green text-white py-2 hover:bg-green-700 transition-colors font-medium"
                      >
                        View Districts
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={`/state-districts/${lowerCode}/upper/1`}
                          className="block w-full text-center bg-civiq-green text-white py-2 hover:bg-green-700 transition-colors font-medium"
                        >
                          View {legislature.chambers.upper.name} Districts
                        </Link>
                        <Link
                          href={`/state-districts/${lowerCode}/lower/1`}
                          className="block w-full text-center bg-white text-civiq-green py-2 border-2 border-civiq-green hover:bg-civiq-green hover:text-white transition-colors font-medium"
                        >
                          View {legislature.chambers.lower.name} Districts
                        </Link>
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
      </main>
    </>
  );
}
