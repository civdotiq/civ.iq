'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export default function LocalPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Local Government', url: 'https://civdotiq.org/local' },
        ]}
      />
      {/* Main Content */}
      <main className="min-h-screen px-4 pt-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb Navigation */}
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-civiq-blue">
              Home
            </Link>
            <span className="mx-2">›</span>
            <span className="font-medium text-gray-900">Local Government</span>
          </nav>

          <h1 className="text-4xl font-bold text-center mb-8">Local Government</h1>

          <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-12">
            Local government officials are your closest representatives, handling daily community
            services and decisions that directly impact your neighborhood.
          </p>

          {/* Roadmap Notice */}
          <div className="max-w-2xl mx-auto border-2 border-black p-8 mb-12">
            <h2 className="text-2xl font-semibold mb-4">Roadmap</h2>
            <p className="text-gray-700 mb-4">
              There is no single API for local government data in the United States. Over 90,000
              local jurisdictions each publish records in different formats, or not at all. This is
              the hardest data integration problem in civic technology.
            </p>
            <p className="text-gray-700 mb-4">
              CIV.IQ is building local coverage incrementally, starting with the largest
              municipalities and expanding through open data portals, state-level aggregators, and
              community contributions.
            </p>
            <p className="text-gray-700">
              Today, use our address search to find your federal and state representatives.
            </p>
            <Link
              href="/"
              className="inline-block mt-6 border-2 border-black px-6 py-3 font-medium hover:bg-black hover:text-white transition-colors"
            >
              Search Representatives
            </Link>
          </div>

          {/* Educational Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-xl font-semibold mb-3 text-civiq-red">City Government</h3>
              <p className="text-gray-600 mb-4">
                City governments manage local services like police, fire departments, parks, and
                local roads. Key officials include mayors and city council members.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Mayor/City Manager</li>
                <li>• City Council</li>
                <li>• City Attorney</li>
                <li>• City Clerk</li>
              </ul>
            </div>

            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-xl font-semibold mb-3 text-civiq-green">County Government</h3>
              <p className="text-gray-600 mb-4">
                County governments provide services across multiple cities and unincorporated areas,
                including courts, jails, and health services.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• County Commissioners</li>
                <li>• County Executive</li>
                <li>• Sheriff</li>
                <li>• District Attorney</li>
              </ul>
            </div>

            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-xl font-semibold mb-3 text-civiq-blue">Special Districts</h3>
              <p className="text-gray-600 mb-4">
                Special districts handle specific services like education, water, or transportation
                across jurisdictional boundaries.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• School Boards</li>
                <li>• Water Districts</li>
                <li>• Transit Authorities</li>
                <li>• Port Authorities</li>
              </ul>
            </div>
          </div>

          {/* Why Local Matters */}
          <div className="mt-16 bg-white p-8 text-center">
            <h2 className="text-3xl font-semibold mb-6">Why Local Government Matters</h2>
            <div className="max-w-3xl mx-auto space-y-6 text-left">
              <p className="text-gray-700">
                <span className="font-semibold">Direct Impact:</span> Local officials make decisions
                about your neighborhood&apos;s zoning, public safety, schools, and infrastructure.
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Accessibility:</span> Local representatives are
                often more accessible than state or federal officials, with regular town halls and
                public meetings.
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Your Voice Matters More:</span> With smaller
                constituencies, your participation has a greater impact on local decisions.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
