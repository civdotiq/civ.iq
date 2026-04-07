/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Federal Government | CIV.IQ',
  description:
    'Explore federal government data: representatives, legislation, spending, regulations, elections, and more. All sourced from official government APIs.',
  keywords: [
    'federal government',
    'congress',
    'representatives',
    'legislation',
    'federal spending',
    'regulations',
    'elections',
    'campaign finance',
  ],
  openGraph: {
    title: 'Federal Government | CIV.IQ',
    description:
      'Explore federal government data: representatives, legislation, spending, regulations, elections, and more. All sourced from official government APIs.',
    url: 'https://civdotiq.org/federal',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

const categories = [
  {
    label: 'People & Institutions',
    title: 'People & institutions',
    description: 'Members of Congress, committees, and the districts they represent.',
    links: [
      {
        name: 'Representatives',
        href: '/representatives',
        detail: 'Browse and compare all 535 members of the House and Senate',
      },
      {
        name: 'Congress',
        href: '/congress',
        detail: 'Overview of the 119th Congress with party breakdown and demographics',
      },
      {
        name: 'Districts',
        href: '/districts',
        detail: 'Congressional district profiles with demographics and spending data',
      },
      {
        name: 'Committees',
        href: '/committees',
        detail: 'Standing, select, and joint committees with membership rosters',
      },
    ],
    sources: 'Congress.gov, Census Bureau',
  },
  {
    label: 'Legislation & Policy',
    title: 'Legislation & policy',
    description:
      'Bills, regulations, executive orders, and open comment periods from the Federal Register.',
    links: [
      {
        name: 'Legislation',
        href: '/legislation',
        detail: 'Recent bills with sponsors, cosponsors, and legislative status',
      },
      {
        name: 'Regulations',
        href: '/regulations',
        detail: 'Proposed and final rules from the Federal Register',
      },
      {
        name: 'Executive Orders',
        href: '/executive-orders',
        detail: 'Presidential executive orders with full text and context',
      },
      {
        name: 'Comment Periods',
        href: '/comment-periods',
        detail: 'Open public comment periods on proposed federal rules',
      },
    ],
    sources: 'Congress.gov, Federal Register',
  },
  {
    label: 'Money & Influence',
    title: 'Money & influence',
    description:
      'Federal spending by district, campaign finance, lobbying, and industry influence patterns.',
    links: [
      {
        name: 'Spending',
        href: '/spending',
        detail: 'Federal contracts and grants flowing to each congressional district',
      },
      {
        name: 'Influence',
        href: '/influence',
        detail: 'Lobbying networks and influence paths between organizations and Congress',
      },
      {
        name: 'Industries',
        href: '/industry',
        detail: 'Sector-level campaign contributions and lobbying expenditures',
      },
      {
        name: 'Money Report',
        href: '/your-reps/money-report',
        detail: 'See who funds your representatives and how they vote',
      },
    ],
    sources: 'FEC.gov, USASpending.gov, Senate LDA',
  },
  {
    label: 'Tools',
    title: 'Tools',
    description:
      'Look up your own representatives, trace connections between people and money, and see election results.',
    links: [
      {
        name: 'Your Reps',
        href: '/your-reps',
        detail: 'Enter your address to find your House member and senators',
      },
      {
        name: 'Connections',
        href: '/investigate',
        detail: 'Trace links between donors, lobbyists, committees, and votes',
      },
      {
        name: 'Elections',
        href: '/elections/federal',
        detail: '2024 presidential, Senate, and House results by state and district',
      },
    ],
    sources: 'Census Geocoder, MEDSL/Harvard Dataverse',
  },
];

export default function FederalPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Federal', url: '/federal' },
        ]}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-black dark:text-white">Federal</span>
        </nav>

        <h1 className="text-3xl font-bold mb-2">Federal government</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-1">
          Data from official government sources covering the 119th Congress, federal agencies, and
          elections.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
          15 sections &middot; 7 data sources
        </p>

        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 items-start">
          {categories.map(cat => (
            <div key={cat.label} className="border-l-[3px] border-black dark:border-gray-400 pl-5">
              <h2 className="text-lg font-bold mb-3">{cat.title}</h2>
              <ul className="space-y-3">
                {cat.links.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="group block transition-colors">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-civiq-blue group-hover:underline">
                        {link.name}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600 group-hover:text-civiq-blue ml-1">
                        &rarr;
                      </span>
                      <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {link.detail}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[10px] uppercase tracking-wider text-gray-300 dark:text-gray-600">
                {cat.sources}
              </p>
            </div>
          ))}
        </div>

        {/* Data sources */}
        <p className="mt-10 text-xs text-gray-400 dark:text-gray-500">
          Sources: Congress.gov, Federal Register, FEC.gov, USASpending.gov, Census Bureau, Senate
          LDA, MEDSL/Harvard Dataverse.
        </p>
      </div>
    </>
  );
}
