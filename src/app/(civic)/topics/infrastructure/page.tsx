/**
 * Infrastructure Topic Hub Page
 *
 * SEO Strategy: Comprehensive topic page targeting infrastructure-related queries.
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
  title: 'Infrastructure Legislation & Policy',
  description:
    'Track infrastructure legislation in Congress. Transportation, broadband, water systems, energy grid, aviation, and the committees that shape infrastructure policy.',
  keywords: [
    'infrastructure legislation',
    'transportation bills Congress',
    'broadband funding',
    'water infrastructure',
    'energy grid',
    'Infrastructure Act',
    'FAA reauthorization',
    'highway funding',
  ],
  openGraph: {
    title: 'Infrastructure Legislation & Policy',
    description:
      'Track infrastructure legislation in Congress. Transportation, broadband, water systems, and energy grid policy.',
    type: 'website',
  },
};

// Infrastructure-related committees
const INFRASTRUCTURE_COMMITTEES = [
  {
    id: 'HSPW',
    name: 'House Transportation and Infrastructure Committee',
    jurisdiction: 'Highways, transit, aviation, water resources, railroads',
    subcommittees: [
      'Highways and Transit',
      'Aviation',
      'Water Resources and Environment',
      'Railroads, Pipelines, and Hazardous Materials',
    ],
  },
  {
    id: 'SSEV',
    name: 'Senate Environment and Public Works Committee',
    jurisdiction: 'Highway policy, water infrastructure, public buildings',
    subcommittees: ['Transportation and Infrastructure', 'Clean Air, Climate, and Nuclear Safety'],
  },
  {
    id: 'SSCM',
    name: 'Senate Commerce, Science, and Transportation Committee',
    jurisdiction: 'Aviation, railroads, broadband, surface transportation safety',
    subcommittees: [
      'Communications, Media, and Broadband',
      'Aviation Safety',
      'Surface Transportation',
    ],
  },
  {
    id: 'HSIF',
    name: 'House Energy and Commerce Committee',
    jurisdiction: 'Energy infrastructure, telecommunications, broadband',
    subcommittees: ['Communications and Technology', 'Energy, Climate, and Grid Security'],
  },
];

// Key infrastructure policy areas
const POLICY_AREAS = [
  {
    name: 'Transportation',
    description: 'Highways, bridges, transit, railroads, and surface transportation programs',
    keywords: ['Highway Trust Fund', 'transit funding', 'Amtrak', 'bridge repair'],
  },
  {
    name: 'Broadband',
    description: 'Internet access expansion, digital equity, and telecommunications',
    keywords: ['BEAD program', 'rural broadband', 'digital divide', 'fiber deployment'],
  },
  {
    name: 'Water Systems',
    description: 'Drinking water, wastewater treatment, and water resource management',
    keywords: ['lead pipes', 'water treatment', 'PFAS cleanup', 'dam safety'],
  },
  {
    name: 'Energy Grid',
    description: 'Electrical grid modernization, reliability, and clean energy transmission',
    keywords: ['grid modernization', 'transmission lines', 'smart grid', 'energy storage'],
  },
  {
    name: 'Airports & Aviation',
    description: 'Airport improvement, air traffic control, and aviation safety',
    keywords: ['FAA', 'airport grants', 'air traffic control', 'NextGen'],
  },
  {
    name: 'Public Buildings',
    description: 'Federal buildings, courthouses, and government facilities',
    keywords: ['GSA', 'federal buildings', 'courthouses', 'energy efficiency'],
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
    question: 'What was the Infrastructure Investment and Jobs Act?',
    answer:
      'The Infrastructure Investment and Jobs Act (IIJA), signed in November 2021, authorized approximately $1.2 trillion for infrastructure, including $550 billion in new federal spending. It funds roads, bridges, broadband, water systems, electric vehicle charging, and public transit over five years. It is one of the largest infrastructure investments in U.S. history.',
  },
  {
    question: 'Which congressional committees handle transportation legislation?',
    answer:
      'The House Transportation and Infrastructure Committee has broad jurisdiction over highways, transit, aviation, water resources, and railroads. In the Senate, jurisdiction is split: the Environment and Public Works Committee handles highways, the Commerce Committee covers aviation and railroads, and the Banking Committee addresses transit.',
  },
  {
    question: 'How is broadband infrastructure funded?',
    answer:
      'Federal broadband funding flows primarily through the BEAD (Broadband Equity, Access, and Deployment) program created by the Infrastructure Act, which allocated $42.5 billion for state-managed broadband deployment. Additional funding comes through the FCC Universal Service Fund, USDA rural broadband programs, and various grant programs.',
  },
  {
    question: 'How does Congress fund infrastructure projects?',
    answer:
      'Congress funds infrastructure through annual appropriations, multi-year authorization bills (like the IIJA), and dedicated trust funds such as the Highway Trust Fund (funded by fuel taxes). Federal funding often requires state and local matching contributions, and projects may use a combination of grants, loans, and tax-exempt bonds.',
  },
];

export default function InfrastructureTopicPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: 'Infrastructure', url: 'https://civdotiq.org/topics/infrastructure' },
        ]}
      />
      <CollectionPageSchema
        name="Infrastructure Legislation"
        description="Track infrastructure legislation including transportation, broadband, water systems, and energy grid."
        url="https://civdotiq.org/topics/infrastructure"
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
          <span className="font-medium text-gray-900">Infrastructure</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl"></span>
          <h1 className="text-3xl font-bold text-gray-900">Infrastructure</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Transportation, broadband, water systems, energy grid, and aviation policy in Congress
        </p>

        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            <strong>Infrastructure policy</strong> addresses the physical systems that underpin the
            American economy. From{' '}
            <Link href="#policy-areas" className="text-civiq-blue hover:underline">
              transportation networks
            </Link>{' '}
            to{' '}
            <Link href="#policy-areas" className="text-civiq-blue hover:underline">
              broadband connectivity
            </Link>
            , Congress authorizes and funds the construction, maintenance, and modernization of
            critical systems. The 2021 Infrastructure Investment and Jobs Act represented a
            generational investment of approximately $1.2 trillion.
          </p>
          <p className="text-gray-700 mb-4">
            Infrastructure jurisdiction is spread across several{' '}
            <Link href="#committees" className="text-civiq-blue hover:underline">
              committees
            </Link>
            . The{' '}
            <Link href="/committee/HSPW" className="text-civiq-blue hover:underline">
              House Transportation and Infrastructure Committee
            </Link>{' '}
            is the primary venue in the House, while Senate jurisdiction is shared among the{' '}
            <Link href="/committee/SSEV" className="text-civiq-blue hover:underline">
              Environment and Public Works
            </Link>{' '}
            and{' '}
            <Link href="/committee/SSCM" className="text-civiq-blue hover:underline">
              Commerce
            </Link>{' '}
            committees.
          </p>
        </section>

        {/* Key Committees Section */}
        <section id="committees" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Key Committees
          </h2>
          <p className="text-gray-700 mb-4">
            These committees have primary jurisdiction over infrastructure legislation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INFRASTRUCTURE_COMMITTEES.map(committee => (
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
                      className="px-2 py-1 text-xs bg-sky-50 text-sky-700 border border-sky-200"
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
            Major infrastructure legislation in recent Congresses includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Infrastructure Investment and Jobs Act (2021)</strong> - $1.2 trillion for
              roads, bridges, broadband, water, transit, and clean energy
            </li>
            <li>
              <strong>IIJA Broadband Provisions</strong> - $65 billion for broadband deployment,
              including the $42.5 billion BEAD program for universal access
            </li>
            <li>
              <strong>FAA Reauthorization Act (2024)</strong> - Five-year reauthorization of Federal
              Aviation Administration programs, airport grants, and safety improvements
            </li>
            <li>
              <strong>Water Resources Development Act</strong> - Authorization for Army Corps of
              Engineers projects including flood control, navigation, and ecosystem restoration
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
        <PolicyAreaCrossDomain policyArea="Transportation and Public Works" />

        {/* FAQ Section */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="Infrastructure"
          relatedLinks={[
            { href: '/topics/environment', label: 'Environment & Climate' },
            { href: '/topics/economy', label: 'Economy & Jobs' },
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
