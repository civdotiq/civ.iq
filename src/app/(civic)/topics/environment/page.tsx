/**
 * Environment & Climate Topic Hub Page
 *
 * SEO Strategy: Comprehensive topic page targeting environment-related queries.
 * Links to relevant committees, types of legislation, and related topics.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { TableOfContents, FAQSection } from '@/components/seo/WikipediaStyleSEO';
import { ExploreFooter } from '@/components/seo/ExploreFooter';
import { BreadcrumbSchema, CollectionPageSchema } from '@/components/seo/JsonLd';
import { PolicyAreaCrossDomain } from '@/features/legislation/components/PolicyAreaCrossDomain';

export const metadata: Metadata = {
  title: 'Environment & Climate Legislation',
  description:
    'Track environmental legislation in Congress. Climate change, clean energy, conservation, water quality, air quality bills and the committees that shape environmental policy.',
  keywords: [
    'environmental legislation',
    'climate change Congress',
    'clean energy bills',
    'EPA regulation',
    'conservation policy',
    'water quality',
    'air quality',
    'endangered species',
  ],
  openGraph: {
    title: 'Environment & Climate Legislation',
    description:
      'Track environmental legislation in Congress. Climate change, clean energy, conservation, and water quality policy.',
    type: 'website',
  },
};

// Environment-related committees
const ENVIRONMENT_COMMITTEES = [
  {
    id: 'HSIF',
    name: 'House Energy and Commerce Committee',
    jurisdiction: 'Energy policy, air quality, hazardous waste, EPA oversight',
    subcommittees: [
      'Energy, Climate, and Grid Security',
      'Environment, Manufacturing, and Critical Minerals',
    ],
  },
  {
    id: 'HSII',
    name: 'House Natural Resources Committee',
    jurisdiction: 'Public lands, wildlife, oceans, water resources',
    subcommittees: [
      'Water, Wildlife, and Fisheries',
      'Federal Lands',
      'Energy and Mineral Resources',
    ],
  },
  {
    id: 'SSEV',
    name: 'Senate Environment and Public Works Committee',
    jurisdiction: 'Environmental policy, infrastructure, nuclear regulation',
    subcommittees: ['Clean Air, Climate, and Nuclear Safety', 'Fisheries, Water, and Wildlife'],
  },
  {
    id: 'SSEN',
    name: 'Senate Energy and Natural Resources Committee',
    jurisdiction: 'Energy production, public lands, national parks',
    subcommittees: ['Energy', 'Public Lands, Forests, and Mining', 'Water and Power'],
  },
];

// Key environmental policy areas
const POLICY_AREAS = [
  {
    name: 'Climate Change',
    description: 'Greenhouse gas reduction, emissions standards, and climate adaptation',
    keywords: ['Paris Agreement', 'carbon emissions', 'net zero', 'climate adaptation'],
  },
  {
    name: 'Clean Energy',
    description: 'Renewable energy incentives, grid modernization, and energy efficiency',
    keywords: ['solar', 'wind', 'EV tax credits', 'energy storage'],
  },
  {
    name: 'Conservation',
    description: 'Public lands, national parks, wildlife habitat, and land preservation',
    keywords: [
      'Land and Water Conservation Fund',
      'national parks',
      'wilderness',
      'habitat restoration',
    ],
  },
  {
    name: 'Water Quality',
    description: 'Clean Water Act, drinking water standards, and water infrastructure',
    keywords: ['Clean Water Act', 'PFAS', 'lead pipes', 'water treatment'],
  },
  {
    name: 'Air Quality',
    description: 'Clean Air Act, emissions standards, and pollution control',
    keywords: ['Clean Air Act', 'ozone', 'particulate matter', 'vehicle emissions'],
  },
  {
    name: 'Endangered Species',
    description: 'Species protection, habitat conservation, and biodiversity',
    keywords: ['Endangered Species Act', 'critical habitat', 'wildlife corridors', 'biodiversity'],
  },
];

// Table of Contents
const tocItems = [
  { id: 'overview', title: 'Overview', level: 1 as const },
  { id: 'committees', title: 'Key Committees', level: 1 as const },
  { id: 'policy-areas', title: 'Policy Areas', level: 1 as const },
  { id: 'recent-legislation', title: 'Recent Legislation', level: 1 as const },
  { id: 'faq', title: 'Frequently Asked Questions', level: 1 as const },
];

// FAQ items for rich snippets
const faqItems = [
  {
    question: 'Which congressional committees handle environmental legislation?',
    answer:
      'Environmental legislation is split across several committees. The House Energy and Commerce Committee handles air quality and EPA oversight. The House Natural Resources Committee covers public lands and wildlife. In the Senate, the Environment and Public Works Committee and the Energy and Natural Resources Committee share jurisdiction over environmental and energy policy.',
  },
  {
    question: "What is the EPA's role in environmental regulation?",
    answer:
      'The Environmental Protection Agency (EPA) implements and enforces federal environmental laws passed by Congress, including the Clean Air Act, Clean Water Act, and Superfund. Congress exercises oversight of the EPA primarily through the House Energy and Commerce Committee and the Senate Environment and Public Works Committee.',
  },
  {
    question: 'How does Congress address climate change?',
    answer:
      'Congress addresses climate change through legislation on energy policy, emissions standards, tax incentives for clean energy, and funding for research and adaptation. The Inflation Reduction Act of 2022 represented the largest federal investment in climate action, including clean energy tax credits and emissions reduction programs.',
  },
  {
    question: 'How can I track environmental bills in Congress?',
    answer:
      'Track environmental bills on CIV.IQ by following the Energy and Commerce, Natural Resources, Environment and Public Works, and Energy and Natural Resources committees. You can also search for specific environmental topics on our bills page.',
  },
];

export default function EnvironmentTopicPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: 'Environment & Climate', url: 'https://civdotiq.org/topics/environment' },
        ]}
      />
      <CollectionPageSchema
        name="Environment & Climate Legislation"
        description="Track environmental legislation including climate change, EPA, clean energy, and conservation."
        url="https://civdotiq.org/topics/environment"
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">›</span>
          <Link href="/topics" className="hover:text-civiq-blue">
            Topics
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">Environment & Climate</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl"></span>
          <h1 className="text-3xl font-bold text-gray-900">Environment & Climate</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Climate change, clean energy, conservation, water quality, and air quality legislation in
          Congress
        </p>

        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            <strong>Environmental policy</strong> is among the most consequential areas of
            congressional action. Legislation governing{' '}
            <Link href="#policy-areas" className="text-civiq-blue hover:underline">
              clean energy
            </Link>{' '}
            and{' '}
            <Link href="#policy-areas" className="text-civiq-blue hover:underline">
              climate change
            </Link>{' '}
            shapes the future of American industry, public health, and natural resources. Landmark
            laws like the Clean Air Act and Clean Water Act form the foundation of federal
            environmental protection.
          </p>
          <p className="text-gray-700 mb-4">
            Environmental jurisdiction is distributed across multiple{' '}
            <Link href="#committees" className="text-civiq-blue hover:underline">
              committees
            </Link>{' '}
            in both chambers. The{' '}
            <Link href="/committee/SSEV" className="text-civiq-blue hover:underline">
              Senate Environment and Public Works Committee
            </Link>{' '}
            and the{' '}
            <Link href="/committee/HSIF" className="text-civiq-blue hover:underline">
              House Energy and Commerce Committee
            </Link>{' '}
            are key venues for environmental legislation.
          </p>
        </section>

        {/* Key Committees Section */}
        <section id="committees" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Key Committees
          </h2>
          <p className="text-gray-700 mb-4">
            These committees have primary jurisdiction over environmental legislation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ENVIRONMENT_COMMITTEES.map(committee => (
              <Link
                key={committee.id}
                href={`/committee/${committee.id}`}
                className="block p-4 bg-white border-2 border-gray-200 hover:border-civiq-blue transition-colors"
              >
                <h3 className="font-bold text-gray-900 mb-1">{committee.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{committee.jurisdiction}</p>
                <p className="text-xs text-civiq-blue">
                  Key subcommittees: {committee.subcommittees.slice(0, 2).join(', ')}
                  {committee.subcommittees.length > 2 && '...'}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Policy Areas Section */}
        <section id="policy-areas" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Policy Areas
          </h2>

          <div className="space-y-4">
            {POLICY_AREAS.map(area => (
              <div key={area.name} className="bg-white border-2 border-gray-200 p-4">
                <h3 className="font-bold text-gray-900 mb-1">{area.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{area.description}</p>
                <div className="flex flex-wrap gap-2">
                  {area.keywords.map(keyword => (
                    <span
                      key={keyword}
                      className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Legislation Section */}
        <section id="recent-legislation" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Recent Legislation
          </h2>
          <p className="text-gray-700 mb-4">
            Major environmental legislation in recent Congresses includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Inflation Reduction Act (2022)</strong> - Largest federal investment in clean
              energy, $369 billion in climate and energy provisions
            </li>
            <li>
              <strong>Infrastructure Investment and Jobs Act (2021)</strong> - Water infrastructure,
              grid modernization, environmental remediation
            </li>
            <li>
              <strong>Great American Outdoors Act (2020)</strong> - Permanent funding for the Land
              and Water Conservation Fund, national parks maintenance
            </li>
            <li>
              <strong>Kigali Amendment Ratification</strong> - Phasing down hydrofluorocarbons
              (HFCs) to combat climate change
            </li>
          </ul>
          <Link
            href="/legislation"
            className="inline-block mt-4 text-civiq-blue hover:underline font-medium"
          >
            Browse all current legislation →
          </Link>
        </section>

        {/* Cross-Domain Data */}
        <PolicyAreaCrossDomain policyArea="Environmental Protection" />

        {/* FAQ Section */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="Environment & Climate"
          relatedLinks={[
            { href: '/topics/infrastructure', label: 'Infrastructure' },
            { href: '/topics/agriculture', label: 'Agriculture' },
            { href: '/topics', label: 'All Topics' },
            { href: '/glossary/roll-call-vote', label: 'Roll Call Votes' },
            { href: '/legislation', label: 'Recent Legislation' },
          ]}
          dataSource="Congress.gov"
        />
      </main>
    </div>
  );
}
