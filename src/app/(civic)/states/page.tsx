/**
 * States Hub Page - Wikipedia-style category page for all 50 U.S. state legislatures
 *
 * SEO Strategy: Creates 50 internal links to state legislature pages
 * This is a key topical authority page for state-level civic information.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { TableOfContents, FAQSection } from '@/components/seo/WikipediaStyleSEO';
import { ExploreFooter } from '@/components/seo/ExploreFooter';
import { BreadcrumbSchema, ItemListSchema, CollectionPageSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'U.S. States - All 50 State Legislatures',
  description:
    'Complete guide to all 50 U.S. state legislatures. Find your state senators, state representatives, bills, committees, and voting records. Real government data from OpenStates.',
  keywords: [
    'state legislatures',
    'state senators',
    'state representatives',
    'state government',
    'state assembly',
    'state laws',
    'state bills',
  ],
  openGraph: {
    title: 'U.S. States - All 50 State Legislatures',
    description:
      'Complete guide to all 50 U.S. state legislatures. Find your state senators, state representatives, bills, committees, and voting records.',
    type: 'website',
  },
};

// All 50 states with metadata
const STATES = [
  { code: 'AL', name: 'Alabama', region: 'South' },
  { code: 'AK', name: 'Alaska', region: 'West' },
  { code: 'AZ', name: 'Arizona', region: 'West' },
  { code: 'AR', name: 'Arkansas', region: 'South' },
  { code: 'CA', name: 'California', region: 'West' },
  { code: 'CO', name: 'Colorado', region: 'West' },
  { code: 'CT', name: 'Connecticut', region: 'Northeast' },
  { code: 'DE', name: 'Delaware', region: 'Northeast' },
  { code: 'FL', name: 'Florida', region: 'South' },
  { code: 'GA', name: 'Georgia', region: 'South' },
  { code: 'HI', name: 'Hawaii', region: 'West' },
  { code: 'ID', name: 'Idaho', region: 'West' },
  { code: 'IL', name: 'Illinois', region: 'Midwest' },
  { code: 'IN', name: 'Indiana', region: 'Midwest' },
  { code: 'IA', name: 'Iowa', region: 'Midwest' },
  { code: 'KS', name: 'Kansas', region: 'Midwest' },
  { code: 'KY', name: 'Kentucky', region: 'South' },
  { code: 'LA', name: 'Louisiana', region: 'South' },
  { code: 'ME', name: 'Maine', region: 'Northeast' },
  { code: 'MD', name: 'Maryland', region: 'Northeast' },
  { code: 'MA', name: 'Massachusetts', region: 'Northeast' },
  { code: 'MI', name: 'Michigan', region: 'Midwest' },
  { code: 'MN', name: 'Minnesota', region: 'Midwest' },
  { code: 'MS', name: 'Mississippi', region: 'South' },
  { code: 'MO', name: 'Missouri', region: 'Midwest' },
  { code: 'MT', name: 'Montana', region: 'West' },
  { code: 'NE', name: 'Nebraska', region: 'Midwest' },
  { code: 'NV', name: 'Nevada', region: 'West' },
  { code: 'NH', name: 'New Hampshire', region: 'Northeast' },
  { code: 'NJ', name: 'New Jersey', region: 'Northeast' },
  { code: 'NM', name: 'New Mexico', region: 'West' },
  { code: 'NY', name: 'New York', region: 'Northeast' },
  { code: 'NC', name: 'North Carolina', region: 'South' },
  { code: 'ND', name: 'North Dakota', region: 'Midwest' },
  { code: 'OH', name: 'Ohio', region: 'Midwest' },
  { code: 'OK', name: 'Oklahoma', region: 'South' },
  { code: 'OR', name: 'Oregon', region: 'West' },
  { code: 'PA', name: 'Pennsylvania', region: 'Northeast' },
  { code: 'RI', name: 'Rhode Island', region: 'Northeast' },
  { code: 'SC', name: 'South Carolina', region: 'South' },
  { code: 'SD', name: 'South Dakota', region: 'Midwest' },
  { code: 'TN', name: 'Tennessee', region: 'South' },
  { code: 'TX', name: 'Texas', region: 'South' },
  { code: 'UT', name: 'Utah', region: 'West' },
  { code: 'VT', name: 'Vermont', region: 'Northeast' },
  { code: 'VA', name: 'Virginia', region: 'South' },
  { code: 'WA', name: 'Washington', region: 'West' },
  { code: 'WV', name: 'West Virginia', region: 'South' },
  { code: 'WI', name: 'Wisconsin', region: 'Midwest' },
  { code: 'WY', name: 'Wyoming', region: 'West' },
];

// Table of Contents
const tocItems = [
  { id: 'overview', title: 'Overview', level: 1 as const },
  { id: 'state-legislatures', title: 'State Legislatures', level: 1 as const },
  { id: 'by-region', title: 'States by Region', level: 1 as const },
  { id: 'faq', title: 'Frequently Asked Questions', level: 1 as const },
];

// FAQ items for rich snippets
const faqItems = [
  {
    question: 'What does a state legislature do?',
    answer:
      'State legislatures create laws that apply within their state, approve state budgets, confirm gubernatorial appointments, and can propose amendments to the state constitution. They handle issues like education, transportation, criminal law, and healthcare policy at the state level.',
  },
  {
    question: 'How are state legislatures structured?',
    answer:
      '49 of the 50 states have a bicameral legislature with two chambers—typically a Senate (upper chamber) and a House of Representatives or Assembly (lower chamber). Nebraska is the only state with a unicameral (single-chamber) legislature.',
  },
  {
    question: 'How many state legislators are there in the U.S.?',
    answer:
      'There are approximately 7,383 state legislators across all 50 states. The size of each legislature varies widely—New Hampshire has 424 legislators (the largest), while Alaska has just 60 (one of the smallest).',
  },
  {
    question: 'How do I find my state legislators?',
    answer:
      'Select your state from the grid above to see its full legislature, including state senators and state representatives. You can also use your home address to find the specific legislators who represent your district.',
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
      <CollectionPageSchema
        name="U.S. State Legislatures"
        description="Complete guide to all 50 U.S. state legislatures — find state senators, state representatives, bills, and committees."
        url="https://civdotiq.org/states"
        hasPart={STATES.map(s => ({
          name: s.name,
          url: `https://civdotiq.org/state-legislature/${s.code.toLowerCase()}`,
        }))}
      />
      <ItemListSchema
        name="U.S. States"
        url="https://civdotiq.org/states"
        items={STATES.map(s => ({
          name: s.name,
          url: `https://civdotiq.org/state-legislature/${s.code.toLowerCase()}`,
        }))}
        itemType="AdministrativeArea"
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          U.S. State Legislatures - All 50 States
        </h1>
        <p className="text-gray-600 mb-4">
          Find your state senators, state representatives, bills, committees, and voting records
        </p>

        {/* Table of Contents */}
        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            Every U.S. state has its own <strong>legislature</strong> — the elected body that
            creates state laws, approves budgets, and oversees state government. Most states have a
            bicameral legislature (Senate and House/Assembly), except Nebraska which has a
            unicameral system.
          </p>

          {/* Quick Stats */}
          <div className="bg-white border-2 border-gray-200 p-4 my-6">
            <h3 className="font-bold text-gray-800 mb-3">State Legislatures at a Glance</h3>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">States</dt>
                <dd className="text-2xl font-bold text-gray-900">50</dd>
              </div>
              <div>
                <dt className="text-gray-500">Total State Legislators</dt>
                <dd className="text-2xl font-bold text-gray-900">7,383</dd>
              </div>
              <div>
                <dt className="text-gray-500">Bicameral / Unicameral</dt>
                <dd className="text-2xl font-bold text-gray-900">49 / 1</dd>
              </div>
            </dl>
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

          {/* State Legislature Grid - Creates 50 internal links */}
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
                      href={`/state-legislature/${state.code.toLowerCase()}`}
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

        <ExploreFooter
          variant="state"
          currentSection="State Legislatures"
          relatedLinks={[
            { href: '/state-bills', label: 'State Bill Search' },
            { href: '/state-districts', label: 'State Districts' },
            { href: '/glossary', label: 'Glossary' },
          ]}
        />
      </main>
    </div>
  );
}
