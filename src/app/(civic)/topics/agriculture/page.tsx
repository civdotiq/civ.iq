/**
 * Agriculture Topic Hub Page
 *
 * SEO Strategy: Comprehensive topic page targeting agriculture-related queries.
 * Links to relevant committees, types of legislation, and related topics.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { TableOfContents, FAQSection } from '@/components/seo/WikipediaStyleSEO';
import { ExploreFooter } from '@/components/seo/ExploreFooter';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { PolicyAreaCrossDomain } from '@/features/legislation/components/PolicyAreaCrossDomain';

export const metadata: Metadata = {
  title: 'Agriculture Legislation & Policy | CIV.IQ',
  description:
    'Track agriculture legislation in Congress. Farm policy, food safety, rural development, nutrition programs, conservation, and forestry bills and the committees that shape agricultural policy.',
  keywords: [
    'agriculture legislation',
    'Farm Bill',
    'SNAP program',
    'food safety',
    'rural development',
    'crop insurance',
    'conservation programs',
    'agriculture committee',
  ],
  openGraph: {
    title: 'Agriculture Legislation & Policy | CIV.IQ',
    description:
      'Track agriculture legislation in Congress. Farm policy, food safety, rural development, and nutrition programs.',
    type: 'website',
  },
};

// Agriculture-related committees
const AGRICULTURE_COMMITTEES = [
  {
    id: 'HSAG',
    name: 'House Agriculture Committee',
    jurisdiction: 'Farm policy, nutrition, forestry, rural development, crop insurance',
    subcommittees: [
      'General Farm Commodities, Risk Management, and Credit',
      'Nutrition, Foreign Agriculture, and Horticulture',
    ],
  },
  {
    id: 'SSAF',
    name: 'Senate Agriculture, Nutrition, and Forestry Committee',
    jurisdiction: 'Agriculture, nutrition programs, forestry, rural development',
    subcommittees: [
      'Commodities, Risk Management, and Trade',
      'Conservation, Climate, Forestry, and Natural Resources',
    ],
  },
];

// Key agriculture policy areas
const POLICY_AREAS = [
  {
    name: 'Farm Policy',
    description: 'Commodity programs, crop insurance, price supports, and farm credit',
    keywords: ['Farm Bill', 'commodity programs', 'crop insurance', 'farm credit'],
  },
  {
    name: 'Food Safety',
    description: 'FDA and USDA food inspection, labeling, and contamination prevention',
    keywords: ['FDA', 'USDA inspection', 'food labeling', 'food recalls'],
  },
  {
    name: 'Rural Development',
    description: 'Rural infrastructure, broadband, economic development, and housing',
    keywords: [
      'rural broadband',
      'USDA Rural Development',
      'rural housing',
      'economic development',
    ],
  },
  {
    name: 'Nutrition Programs',
    description: 'SNAP, school meals, WIC, and other federal food assistance',
    keywords: ['SNAP', 'school lunch', 'WIC', 'food assistance'],
  },
  {
    name: 'Conservation',
    description: 'Soil conservation, water quality, habitat protection, and land stewardship',
    keywords: ['CRP', 'EQIP', 'conservation reserve', 'soil health'],
  },
  {
    name: 'Forestry',
    description: 'National forests, wildfire management, timber policy, and reforestation',
    keywords: ['Forest Service', 'wildfire prevention', 'timber management', 'reforestation'],
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
    question: 'What is the Farm Bill?',
    answer:
      'The Farm Bill is a comprehensive piece of legislation reauthorized approximately every five years. It covers farm commodity programs, crop insurance, conservation, nutrition assistance (including SNAP), rural development, forestry, and trade. It is one of the largest pieces of legislation Congress regularly considers, with significant impact on both agricultural producers and consumers.',
  },
  {
    question: 'Which committees handle agriculture legislation?',
    answer:
      'Agriculture legislation is primarily handled by the House Agriculture Committee and the Senate Agriculture, Nutrition, and Forestry Committee. These committees have jurisdiction over farm policy, nutrition programs like SNAP, conservation, forestry, and rural development. They lead the Farm Bill reauthorization process.',
  },
  {
    question: 'How does SNAP work?',
    answer:
      'The Supplemental Nutrition Assistance Program (SNAP) is a federal nutrition assistance program administered by the USDA. It provides monthly benefits on an electronic card that can be used to purchase food. Eligibility is based on household income and size. SNAP is authorized through the Farm Bill and is the largest nutrition assistance program in the country.',
  },
  {
    question: 'How can I track agriculture legislation?',
    answer:
      'Track agriculture legislation on CIV.IQ by following the House Agriculture Committee and the Senate Agriculture, Nutrition, and Forestry Committee. You can also search for specific topics like the Farm Bill or SNAP on our bills page.',
  },
];

export default function AgricultureTopicPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: 'Agriculture', url: 'https://civdotiq.org/topics/agriculture' },
        ]}
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">›</span>
          <Link href="/topics" className="hover:text-blue-600">
            Topics
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">Agriculture</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">&#x1F33E;</span>
          <h1 className="text-3xl font-bold text-gray-900">Agriculture</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Farm policy, food safety, rural development, nutrition programs, and conservation
          legislation in Congress
        </p>

        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            <strong>Agriculture policy</strong> encompasses a wide range of legislation affecting
            farmers, consumers, and rural communities. The centerpiece is the{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              Farm Bill
            </Link>
            , a massive omnibus law reauthorized approximately every five years that covers
            everything from{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              crop insurance
            </Link>{' '}
            to{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              nutrition assistance
            </Link>
            .
          </p>
          <p className="text-gray-700 mb-4">
            The{' '}
            <Link href="/committee/HSAG" className="text-blue-600 hover:underline">
              House Agriculture Committee
            </Link>{' '}
            and{' '}
            <Link href="/committee/SSAF" className="text-blue-600 hover:underline">
              Senate Agriculture Committee
            </Link>{' '}
            have jurisdiction over agricultural policy, including nutrition programs that account
            for the majority of Farm Bill spending. Understanding committee jurisdiction helps you
            follow legislation and engage with your representatives effectively.
          </p>
        </section>

        {/* Key Committees Section */}
        <section id="committees" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Key Committees
          </h2>
          <p className="text-gray-700 mb-4">
            These committees have primary jurisdiction over agriculture legislation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AGRICULTURE_COMMITTEES.map(committee => (
              <Link
                key={committee.id}
                href={`/committee/${committee.id}`}
                className="block p-4 bg-white border-2 border-gray-200 hover:border-blue-500 transition-colors"
              >
                <h3 className="font-bold text-gray-900 mb-1">{committee.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{committee.jurisdiction}</p>
                <p className="text-xs text-blue-600">
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
                      className="px-2 py-1 text-xs bg-lime-50 text-lime-700 border border-lime-200"
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
            Major agriculture legislation in recent Congresses includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Farm Bill Reauthorization</strong> - Comprehensive agriculture and nutrition
              legislation renewed approximately every five years, covering commodity programs, SNAP,
              conservation, and rural development
            </li>
            <li>
              <strong>SNAP Program Extensions</strong> - Emergency and permanent expansions of
              nutrition assistance benefits and eligibility
            </li>
            <li>
              <strong>Crop Insurance Reforms</strong> - Updates to the federal crop insurance
              program to improve coverage and reduce costs
            </li>
            <li>
              <strong>Rural Broadband Provisions (IIJA)</strong> - Broadband infrastructure
              investment for underserved rural areas included in the Infrastructure Investment and
              Jobs Act
            </li>
          </ul>
          <Link
            href="/legislation"
            className="inline-block mt-4 text-blue-600 hover:underline font-medium"
          >
            Browse all current legislation →
          </Link>
        </section>

        {/* Cross-Domain Data */}
        <PolicyAreaCrossDomain policyArea="Agriculture and Food" />

        {/* FAQ Section */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="Agriculture"
          relatedLinks={[
            { href: '/topics/environment', label: 'Environment & Climate' },
            { href: '/topics/economy', label: 'Economy & Jobs' },
            { href: '/topics', label: 'All Topics' },
            { href: '/glossary/roll-call-vote', label: 'Roll Call Votes' },
            { href: '/legislation', label: 'Recent Legislation' },
          ]}
          lastUpdated={new Date()}
          dataSource="Congress.gov"
        />
      </main>
    </div>
  );
}
