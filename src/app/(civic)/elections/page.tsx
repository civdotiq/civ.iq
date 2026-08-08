/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  alternates: { canonical: 'https://civdotiq.org/elections' },
  title: 'Elections',
  description:
    'Browse 2024 election results for federal and state races. President, Senate, House, Governor, and State Legislature results from MEDSL/Harvard Dataverse.',
  keywords: [
    'election results',
    '2024 elections',
    'federal elections',
    'state elections',
    'presidential results',
    'senate results',
    'house results',
    'governor results',
  ],
  openGraph: {
    title: 'Elections | CIV.IQ',
    description:
      'Browse 2024 election results for federal and state races. President, Senate, House, Governor, and State Legislature results from MEDSL/Harvard Dataverse.',
    url: 'https://civdotiq.org/elections',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function ElectionsPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Elections', url: '/elections' },
        ]}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-black dark:text-white">Elections</span>
        </nav>

        <h1 className="text-3xl font-bold mb-2">Elections</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Upcoming 2026 federal races with FEC-filed candidates, and certified 2024 results from the
          MIT Election Data and Science Lab (MEDSL) via Harvard Dataverse.
        </p>

        {/* 2026 races card */}
        <Link
          href="/elections/2026"
          className="block border-2 border-black dark:border-gray-600 p-6 hover:border-civiq-blue transition-colors group mb-6"
        >
          <p className="aicher-heading-wide text-xs text-gray-500 dark:text-gray-400 mb-2 tracking-wider">
            UPCOMING
          </p>
          <h2 className="text-xl font-bold mb-3 group-hover:text-civiq-blue transition-colors">
            2026 federal elections
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Every U.S. House and Senate race on the November 3, 2026 ballot — who has filed with the
            FEC, what they have raised, and each state&rsquo;s primary date.
          </p>
          <p className="text-civiq-blue text-sm font-medium">Browse 2026 races &rarr;</p>
        </Link>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Federal Elections Card */}
          <Link
            href="/elections/federal"
            className="block border-2 border-black dark:border-gray-600 p-6 hover:border-civiq-blue transition-colors group"
          >
            <p className="aicher-heading-wide text-xs text-gray-500 dark:text-gray-400 mb-2 tracking-wider">
              FEDERAL
            </p>
            <h2 className="text-xl font-bold mb-3 group-hover:text-civiq-blue transition-colors">
              Federal elections
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              President, US Senate, and US House race results across all states and districts.
            </p>
            <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <li>Presidential results by state</li>
              <li>Senate races (34 seats contested)</li>
              <li>All 435 House districts</li>
            </ul>
            <p className="mt-4 text-civiq-blue text-sm font-medium">View federal results &rarr;</p>
          </Link>

          {/* State Elections Card */}
          <Link
            href="/elections/state"
            className="block border-2 border-black dark:border-gray-600 p-6 hover:border-civiq-blue transition-colors group"
          >
            <p className="aicher-heading-wide text-xs text-gray-500 dark:text-gray-400 mb-2 tracking-wider">
              STATE
            </p>
            <h2 className="text-xl font-bold mb-3 group-hover:text-civiq-blue transition-colors">
              State elections
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Governor and state legislature results. Includes 2025 NJ and VA governor races.
            </p>
            <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <li>Governor races (11 states in 2024)</li>
              <li>State senate and state house districts</li>
              <li>2025 odd-year results (NJ, VA)</li>
            </ul>
            <p className="mt-4 text-civiq-blue text-sm font-medium">View state results &rarr;</p>
          </Link>
        </div>

        {/* Citation */}
        <div className="mt-8 border-t-2 border-black dark:border-gray-600 pt-4">
          <p className="text-xs aicher-heading-wide text-gray-500 dark:text-gray-400 tracking-wider mb-2">
            DATA SOURCE
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            MIT Election Data and Science Lab (MEDSL). &ldquo;2024 General Election Results.&rdquo;
            Harvard Dataverse, 2024. DOI: 10.7910/DVN/2024.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            2025 governor results (NJ, VA): Ballotpedia, citing official state certified results.
          </p>
        </div>
      </div>
    </>
  );
}
