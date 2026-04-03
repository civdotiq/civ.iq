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
};

const categories = [
  {
    label: 'People & Institutions',
    title: 'People & institutions',
    description: 'Members of Congress, committees, and the districts they represent.',
    links: [
      { name: 'Representatives', href: '/representatives' },
      { name: 'Congress', href: '/congress' },
      { name: 'Districts', href: '/districts' },
      { name: 'Committees', href: '/committees' },
    ],
    sources: 'Congress.gov, Census Bureau',
  },
  {
    label: 'Legislation & Policy',
    title: 'Legislation & policy',
    description:
      'Bills, regulations, executive orders, and open comment periods from the Federal Register.',
    links: [
      { name: 'Legislation', href: '/legislation' },
      { name: 'Regulations', href: '/regulations' },
      { name: 'Executive Orders', href: '/executive-orders' },
      { name: 'Comment Periods', href: '/comment-periods' },
    ],
    sources: 'Congress.gov, Federal Register',
  },
  {
    label: 'Money & Influence',
    title: 'Money & influence',
    description:
      'Federal spending by district, campaign finance, lobbying, and industry influence patterns.',
    links: [
      { name: 'Spending', href: '/spending' },
      { name: 'Influence', href: '/influence' },
      { name: 'Industries', href: '/industry' },
      { name: 'Money Report', href: '/your-reps/money-report' },
    ],
    sources: 'FEC.gov, USASpending.gov, Senate LDA',
  },
  {
    label: 'Tools',
    title: 'Tools',
    description:
      'Look up your own representatives, trace connections between people and money, and see election results.',
    links: [
      { name: 'Your Reps', href: '/your-reps' },
      { name: 'Connections', href: '/investigate' },
      { name: 'Elections', href: '/elections/federal' },
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
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Data from official government sources covering the 119th Congress, federal agencies, and
          elections. Browse by category or use the Federal dropdown in the navigation above.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {categories.map(cat => (
            <div key={cat.label} className="border-2 border-black dark:border-gray-600 p-6">
              <p className="aicher-heading-wide text-xs text-gray-500 dark:text-gray-400 mb-2 tracking-wider uppercase">
                {cat.label}
              </p>
              <h2 className="text-xl font-bold mb-2">{cat.title}</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{cat.description}</p>
              <ul className="space-y-1.5">
                {cat.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-700 dark:text-gray-300 hover:text-civiq-blue transition-colors"
                    >
                      {link.name} &rarr;
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {cat.sources}
              </p>
            </div>
          ))}
        </div>

        {/* Data sources */}
        <div className="mt-8 border-t-2 border-black dark:border-gray-600 pt-4">
          <p className="text-xs aicher-heading-wide text-gray-500 dark:text-gray-400 tracking-wider mb-2 uppercase">
            Data sources
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Congress.gov API, Federal Register API, FEC.gov API, USASpending.gov API, Census Bureau,
            Senate Lobbying Disclosure Act filings, MIT Election Data and Science Lab (MEDSL).
          </p>
        </div>
      </div>
    </>
  );
}
