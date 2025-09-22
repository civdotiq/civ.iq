'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import logger from '@/lib/logging/simple-logger';

// Dynamic import of Leaflet component (SSR safe)
const LeafletDistrictMap = dynamic(
  () => import('@/features/districts/components/LeafletDistrictMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-sm text-gray-600">Loading Leaflet map...</p>
        </div>
      </div>
    ),
  }
);

export default function LeafletDemoPage() {
  const [selectedState, setSelectedState] = useState<string>('all');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/districts" className="text-blue-600 hover:text-blue-800">
                ← Back to Districts
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">Leaflet District Map Demo</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">🍃 Free Leaflet Alternative</h2>
          <p className="text-blue-700 text-sm">
            This demonstrates a simple, lightweight Leaflet-based map using only free OpenStreetMap
            tiles. Perfect for MVP deployments without complex boundary rendering requirements.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by State</label>
          <select
            value={selectedState}
            onChange={e => setSelectedState(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
          >
            <option value="all">All States</option>
            <option value="CA">California</option>
            <option value="TX">Texas</option>
            <option value="FL">Florida</option>
            <option value="NY">New York</option>
            <option value="MI">Michigan</option>
          </select>
        </div>

        {/* Map */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="h-[600px]">
            <LeafletDistrictMap
              selectedState={selectedState}
              height="600px"
              showControls={true}
              onDistrictClick={district => {
                logger.info('District clicked in Leaflet demo', { district });
                alert(`Clicked: ${district.state}-${district.number}`);
              }}
            />
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">✅ Advantages</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• 100% free - no API keys required</li>
              <li>• Lightweight and fast loading</li>
              <li>• Simple marker-based display</li>
              <li>• Perfect for MVP and basic use cases</li>
              <li>• Works well on mobile devices</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">⚠️ Limitations</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• No district boundary polygons</li>
              <li>• Markers only (not full district shapes)</li>
              <li>• Limited customization compared to MapLibre</li>
              <li>• Basic interactivity</li>
              <li>• Requires district lat/lng coordinates</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
