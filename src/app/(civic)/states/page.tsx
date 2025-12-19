/**
 * States Hub Page - Wikipedia-style category page for all U.S. states
 *
 * SEO Strategy: Creates 100+ internal links (50 federal delegations + 50 state legislatures)
 * This is a key topical authority page for state-level civic information.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import {
  TableOfContents,
  FAQSection,
  RelatedLinks,
  FreshnessTimestamp,
  CategoryTags,
} from '@/components/seo/WikipediaStyleSEO';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'U.S. States - Congressional Delegations & State Legislatures | CIV.IQ',
  description:
    'Complete guide to all 50 U.S. states. Find federal congressional delegations, state legislators, governors, and state government information. Real government data.',
  keywords: [
    'US states',
    'state delegations',
    'state legislatures',
    'senators by state',
    'representatives by state',
    'state government',
    'governors',
  ],
  openGraph: {
    title: 'U.S. States - Congressional Delegations & State Legislatures',
    description:
      'Complete guide to all 50 U.S. states. Find federal and state representatives, governors, and government information.',
    type: 'website',
  },
};

// All 50 states with metadata
const STATES = [
  { code: 'AL', name: 'Alabama', region: 'South', reps: 7 },
  { code: 'AK', name: 'Alaska', region: 'West', reps: 1 },
  { code: 'AZ', name: 'Arizona', region: 'West', reps: 9 },
  { code: 'AR', name: 'Arkansas', region: 'South', reps: 4 },
  { code: 'CA', name: 'California', region: 'West', reps: 52 },
  { code: 'CO', name: 'Colorado', region: 'West', reps: 8 },
  { code: 'CT', name: 'Connecticut', region: 'Northeast', reps: 5 },
  { code: 'DE', name: 'Delaware', region: 'Northeast', reps: 1 },
  { code: 'FL', name: 'Florida', region: 'South', reps: 28 },
  { code: 'GA', name: 'Georgia', region: 'South', reps: 14 },
  { code: 'HI', name: 'Hawaii', region: 'West', reps: 2 },
  { code: 'ID', name: 'Idaho', region: 'West', reps: 2 },
  { code: 'IL', name: 'Illinois', region: 'Midwest', reps: 17 },
  { code: 'IN', name: 'Indiana', region: 'Midwest', reps: 9 },
  { code: 'IA', name: 'Iowa', region: 'Midwest', reps: 4 },
  { code: 'KS', name: 'Kansas', region: 'Midwest', reps: 4 },
  { code: 'KY', name: 'Kentucky', region: 'South', reps: 6 },
  { code: 'LA', name: 'Louisiana', region: 'South', reps: 6 },
  { code: 'ME', name: 'Maine', region: 'Northeast', reps: 2 },
  { code: 'MD', name: 'Maryland', region: 'Northeast', reps: 8 },
  { code: 'MA', name: 'Massachusetts', region: 'Northeast', reps: 9 },
  { code: 'MI', name: 'Michigan', region: 'Midwest', reps: 13 },
  { code: 'MN', name: 'Minnesota', region: 'Midwest', reps: 8 },
  { code: 'MS', name: 'Mississippi', region: 'South', reps: 4 },
  { code: 'MO', name: 'Missouri', region: 'Midwest', reps: 8 },
  { code: 'MT', name: 'Montana', region: 'West', reps: 2 },
  { code: 'NE', name: 'Nebraska', region: 'Midwest', reps: 3 },
  { code: 'NV', name: 'Nevada', region: 'West', reps: 4 },
  { code: 'NH', name: 'New Hampshire', region: 'Northeast', reps: 2 },
  { code: 'NJ', name: 'New Jersey', region: 'Northeast', reps: 12 },
  { code: 'NM', name: 'New Mexico', region: 'West', reps: 3 },
  { code: 'NY', name: 'New York', region: 'Northeast', reps: 26 },
  { code: 'NC', name: 'North Carolina', region: 'South', reps: 14 },
  { code: 'ND', name: 'North Dakota', region: 'Midwest', reps: 1 },
  { code: 'OH', name: 'Ohio', region: 'Midwest', reps: 15 },
  { code: 'OK', name: 'Oklahoma', region: 'South', reps: 5 },
  { code: 'OR', name: 'Oregon', region: 'West', reps: 6 },
  { code: 'PA', name: 'Pennsylvania', region: 'Northeast', reps: 17 },
  { code: 'RI', name: 'Rhode Island', region: 'Northeast', reps: 2 },
  { code: 'SC', name: 'South Carolina', region: 'South', reps: 7 },
  { code: 'SD', name: 'South Dakota', region: 'Midwest', reps: 1 },
  { code: 'TN', name: 'Tennessee', region: 'South', reps: 9 },
  { code: 'TX', name: 'Texas', region: 'South', reps: 38 },
  { code: 'UT', name: 'Utah', region: 'West', reps: 4 },
  { code: 'VT', name: 'Vermont', region: 'Northeast', reps: 1 },
  { code: 'VA', name: 'Virginia', region: 'South', reps: 11 },
  { code: 'WA', name: 'Washington', region: 'West', reps: 10 },
  { code: 'WV', name: 'West Virginia', region: 'South', reps: 2 },
  { code: 'WI', name: 'Wisconsin', region: 'Midwest', reps: 8 },
  { code: 'WY', name: 'Wyoming', region: 'West', reps: 1 },
];

// U.S. Territories
const TERRITORIES = [
  { code: 'PR', name: 'Puerto Rico', delegate: 'Resident Commissioner' },
  { code: 'VI', name: 'U.S. Virgin Islands', delegate: 'Delegate' },
  { code: 'GU', name: 'Guam', delegate: 'Delegate' },
  { code: 'AS', name: 'American Samoa', delegate: 'Delegate' },
  { code: 'MP', name: 'Northern Mariana Islands', delegate: 'Delegate' },
  { code: 'DC', name: 'Washington, D.C.', delegate: 'Delegate' },
];

// Table of Contents
const tocItems = [
  { id: 'overview', title: 'Overview', level: 1 as const },
  { id: 'federal-delegations', title: 'Federal Congressional Delegations', level: 1 as const },
  { id: 'state-legislatures', title: 'State Legislatures', level: 1 as const },
  { id: 'territories', title: 'U.S. Territories', level: 1 as const },
  { id: 'by-region', title: 'States by Region', level: 1 as const },
  { id: 'faq', title: 'Frequently Asked Questions', level: 1 as const },
];

// FAQ items for rich snippets
const faqItems = [
  {
    question: 'How many senators does each state have?',
    answer:
      'Each state has exactly 2 U.S. Senators, regardless of population. This means all 50 states have equal representation in the Senate, totaling 100 senators.',
  },
  {
    question: 'How are House representatives apportioned among states?',
    answer:
      'House representatives are apportioned based on population according to the decennial Census. States with larger populations have more representatives. California has the most (52), while 7 states have just 1 representative.',
  },
  {
    question: 'What is the difference between federal and state legislators?',
    answer:
      'Federal legislators (U.S. Senators and Representatives) serve in Congress in Washington D.C. and make national laws. State legislators serve in their state capitols and make laws that apply only within their state.',
  },
  {
    question: 'Do U.S. territories have representatives in Congress?',
    answer:
      'U.S. territories have non-voting delegates in the House of Representatives. They can participate in debates and vote in committees but cannot vote on final legislation. Puerto Rico has a Resident Commissioner who serves a 4-year term.',
  },
];

export default function StatesHubPage() {
  // Group states by region
  const statesByRegion = STATES.reduce(
    (acc, state) => {
      const region = state.region;
      if (!acc[region]) {
        acc[region] = [];
      }
      acc[region]?.push(state);
      return acc;
    },
    {} as Record<string, (typeof STATES)[number][]>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Schema.org Breadcrumb */}
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'States', url: 'https://civdotiq.org/states' },
        ]}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">States</span>
        </nav>

        {/* Page Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">United States - All 50 States</h1>
        <p className="text-gray-600 mb-4">
          Congressional delegations, state legislatures, and government information for every U.S.
          state
        </p>

        <FreshnessTimestamp lastUpdated={new Date()} dataSource="Congress.gov & OpenStates" />

        {/* Table of Contents */}
        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            The <strong>United States</strong> consists of 50 states, each with its own government
            structure. Every state is represented in the federal government by{' '}
            <Link href="/congress" className="text-blue-600 hover:underline">
              2 U.S. Senators
            </Link>{' '}
            and at least 1 U.S. Representative (proportional to population). Additionally, each
            state has its own legislature that creates state-specific laws.
          </p>

          {/* Quick Stats */}
          <div className="bg-white border-2 border-gray-200 p-4 my-6">
            <h3 className="font-bold text-gray-800 mb-3">U.S. States at a Glance</h3>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">States</dt>
                <dd className="text-2xl font-bold text-gray-900">50</dd>
              </div>
              <div>
                <dt className="text-gray-500">U.S. Senators</dt>
                <dd className="text-2xl font-bold text-gray-900">100</dd>
              </div>
              <div>
                <dt className="text-gray-500">U.S. Representatives</dt>
                <dd className="text-2xl font-bold text-gray-900">435</dd>
              </div>
              <div>
                <dt className="text-gray-500">State Legislators</dt>
                <dd className="text-2xl font-bold text-gray-900">7,383</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Federal Delegations Section */}
        <section id="federal-delegations" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Federal Congressional Delegations
          </h2>
          <p className="text-gray-700 mb-4">
            Click on any state to view its complete federal delegation—2 Senators and all House
            Representatives—with voting records, committee assignments, and contact information.
          </p>

          {/* State Grid - Creates 50 internal links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {STATES.map(state => (
              <Link
                key={state.code}
                href={`/delegation/${state.code}`}
                className="block p-3 bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-center transition-colors"
              >
                <span className="text-lg font-bold text-gray-800">{state.code}</span>
                <span className="block text-xs text-gray-500 truncate">{state.name}</span>
                <span className="block text-xs text-blue-600">{state.reps + 2} members</span>
              </Link>
            ))}
          </div>
        </section>

        {/* State Legislatures Section */}
        <section id="state-legislatures" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            State Legislatures
          </h2>
          <p className="text-gray-700 mb-4">
            Each state has its own legislature that creates laws for that state. Most states have a
            bicameral legislature (Senate and House/Assembly), except Nebraska which has a
            unicameral system.
          </p>

          {/* State Legislature Grid - Creates 50 more internal links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {STATES.map(state => (
              <Link
                key={state.code}
                href={`/state-legislature/${state.code.toLowerCase()}`}
                className="block p-3 bg-white border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 text-center transition-colors"
              >
                <span className="text-lg font-bold text-gray-800">{state.code}</span>
                <span className="block text-xs text-gray-500 truncate">{state.name}</span>
                <span className="block text-xs text-green-600">Legislature →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Territories Section */}
        <section id="territories" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            U.S. Territories
          </h2>
          <p className="text-gray-700 mb-4">
            U.S. territories are represented by non-voting delegates in Congress. While they can
            participate in committee work and floor debates, they cannot vote on final passage of
            legislation.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {TERRITORIES.map(territory => (
              <Link
                key={territory.code}
                href={`/delegation/${territory.code}`}
                className="block p-3 bg-white border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 text-center transition-colors"
              >
                <span className="text-lg font-bold text-gray-800">{territory.code}</span>
                <span className="block text-xs text-gray-500 truncate">{territory.name}</span>
                <span className="block text-xs text-purple-600">{territory.delegate}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* By Region Section */}
        <section id="by-region" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            States by Region
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(statesByRegion).map(([region, states]) => (
              <div key={region} className="bg-white border-2 border-gray-200 p-4">
                <h3 className="font-bold text-gray-800 mb-3">
                  {region} ({states.length} states)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {states.map(state => (
                    <Link
                      key={state.code}
                      href={`/delegation/${state.code}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {state.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Related Links */}
        <RelatedLinks
          links={[
            {
              href: '/congress',
              title: 'U.S. Congress',
              description: '119th Congress overview',
              type: 'representative',
            },
            {
              href: '/committees',
              title: 'Congressional Committees',
              description: 'All House and Senate committees',
              type: 'committee',
            },
            {
              href: '/districts',
              title: 'Congressional Districts',
              description: 'All 435 House districts',
              type: 'district',
            },
            {
              href: '/glossary',
              title: 'Civic Glossary',
              description: 'Definitions of civic terms',
              type: 'bill',
            },
          ]}
        />

        {/* Category Tags */}
        <CategoryTags
          categories={[
            { name: 'U.S. States', href: '/states' },
            { name: 'Congress', href: '/congress' },
            { name: 'State Legislatures', href: '/states#state-legislatures' },
          ]}
        />
      </main>
    </div>
  );
}
