/**
 * Economy & Jobs Topic Hub Page
 *
 * SEO Strategy: Comprehensive topic page targeting economy-related queries.
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

export const metadata: Metadata = {
  title: 'Economy & Jobs Legislation | CIV.IQ',
  description:
    'Track economic legislation in Congress. Tax policy, employment, trade, small business, and financial regulation bills and the committees that shape economic policy.',
  keywords: [
    'economic legislation',
    'tax policy Congress',
    'jobs bills',
    'trade legislation',
    'small business policy',
    'minimum wage',
    'financial regulation',
    'unemployment',
  ],
  openGraph: {
    title: 'Economy & Jobs Legislation | CIV.IQ',
    description:
      'Track economic legislation in Congress. Tax policy, employment, trade, and financial regulation.',
    type: 'website',
  },
};

// Economy-related committees
const ECONOMY_COMMITTEES = [
  {
    id: 'HSWM',
    name: 'House Ways and Means Committee',
    jurisdiction: 'Tax policy, trade, Social Security',
    subcommittees: ['Trade', 'Tax', 'Social Security'],
  },
  {
    id: 'HSBA',
    name: 'House Financial Services Committee',
    jurisdiction: 'Banking, housing, securities, insurance',
    subcommittees: ['Capital Markets', 'Housing', 'Consumer Protection'],
  },
  {
    id: 'HSSM',
    name: 'House Small Business Committee',
    jurisdiction: 'Small business assistance, SBA oversight',
    subcommittees: ['Economic Growth', 'Contracting', 'Rural Development'],
  },
  {
    id: 'SSFI',
    name: 'Senate Finance Committee',
    jurisdiction: 'Taxation, trade, Social Security, Medicare',
    subcommittees: ['International Trade', 'Taxation and IRS Oversight'],
  },
  {
    id: 'SSBK',
    name: 'Senate Banking Committee',
    jurisdiction: 'Banking, financial institutions, housing',
    subcommittees: ['Economic Policy', 'Securities', 'Housing'],
  },
];

// Key economic policy areas
const POLICY_AREAS = [
  {
    name: 'Tax Policy',
    description: 'Individual and corporate taxes, tax credits, IRS oversight',
    keywords: ['Tax Cuts and Jobs Act', 'estate tax', 'capital gains', 'child tax credit'],
  },
  {
    name: 'Employment & Labor',
    description: 'Minimum wage, workplace safety, unemployment insurance',
    keywords: ['minimum wage', 'OSHA', 'labor unions', 'workforce development'],
  },
  {
    name: 'Trade',
    description: 'International trade agreements, tariffs, export policy',
    keywords: ['USMCA', 'China tariffs', 'trade deficit', 'export promotion'],
  },
  {
    name: 'Small Business',
    description: 'SBA loans, small business tax relief, contracting',
    keywords: ['PPP loans', 'SBA', 'small business grants', 'entrepreneurship'],
  },
  {
    name: 'Financial Regulation',
    description: 'Banking rules, consumer protection, market oversight',
    keywords: ['Dodd-Frank', 'CFPB', 'SEC', 'crypto regulation'],
  },
  {
    name: 'Housing',
    description: 'Affordable housing, mortgage policy, homelessness',
    keywords: ['FHA', 'affordable housing', 'rent assistance', 'first-time homebuyers'],
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
    question: 'Which congressional committee handles tax legislation?',
    answer:
      'Tax legislation originates in the House Ways and Means Committee, as required by the Constitution. The Senate Finance Committee then considers tax bills after House passage. Both committees have broad jurisdiction over tax policy, including individual and corporate taxes.',
  },
  {
    question: 'How does Congress affect the economy?',
    answer:
      'Congress affects the economy through fiscal policy (taxes and spending), trade agreements, financial regulation, and labor laws. Major economic legislation like tax reform, stimulus packages, and trade deals can significantly impact employment, inflation, and economic growth.',
  },
  {
    question: 'What is the role of the Financial Services Committee?',
    answer:
      'The House Financial Services Committee oversees banking, securities, housing, and insurance. It has jurisdiction over the Federal Reserve, SEC, and consumer financial protection. The Senate equivalent is the Banking, Housing, and Urban Affairs Committee.',
  },
  {
    question: 'How can I track economic legislation in Congress?',
    answer:
      'Track economic legislation on CIV.IQ by following the Ways and Means, Financial Services, and Finance committees. You can also search for specific topics like tax policy or trade on our bills page.',
  },
];

export default function EconomyTopicPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: 'Economy', url: 'https://civdotiq.org/topics/economy' },
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
          <span className="font-medium text-gray-900">Economy & Jobs</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">💼</span>
          <h1 className="text-3xl font-bold text-gray-900">Economy & Jobs</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Tax policy, employment, trade, small business, and financial regulation in Congress
        </p>

        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            <strong>Economic policy</strong> encompasses some of the most impactful legislation
            Congress considers. From{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              tax policy
            </Link>{' '}
            affecting every American to{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              trade agreements
            </Link>{' '}
            shaping global commerce, economic legislation has far-reaching consequences.
          </p>
          <p className="text-gray-700 mb-4">
            The Constitution requires that tax and revenue bills originate in the House of
            Representatives, giving the{' '}
            <Link href="/committee/HSWM" className="text-blue-600 hover:underline">
              Ways and Means Committee
            </Link>{' '}
            particular importance in economic policy. Understanding committee jurisdiction helps you
            follow legislation and engage with your representatives effectively.
          </p>
        </section>

        {/* Key Committees Section */}
        <section id="committees" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Key Committees
          </h2>
          <p className="text-gray-700 mb-4">
            These committees have primary jurisdiction over economic legislation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ECONOMY_COMMITTEES.map(committee => (
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
                      className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200"
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
            Major economic legislation in recent Congresses includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Inflation Reduction Act (2022)</strong> - Clean energy tax credits, corporate
              minimum tax
            </li>
            <li>
              <strong>CHIPS and Science Act (2022)</strong> - Semiconductor manufacturing
              incentives, R&D funding
            </li>
            <li>
              <strong>Infrastructure Investment and Jobs Act (2021)</strong> - Roads, bridges,
              broadband investment
            </li>
            <li>
              <strong>American Rescue Plan (2021)</strong> - COVID-19 economic relief, stimulus
              payments
            </li>
            <li>
              <strong>Tax Cuts and Jobs Act (2017)</strong> - Individual and corporate tax reform
            </li>
          </ul>
          <Link
            href="/legislation"
            className="inline-block mt-4 text-blue-600 hover:underline font-medium"
          >
            Browse all current legislation →
          </Link>
        </section>

        {/* FAQ Section */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="Economy & Jobs"
          relatedLinks={[
            { href: '/topics/healthcare', label: 'Healthcare' },
            { href: '/committees', label: 'Committees' },
            { href: '/topics', label: 'All Topics' },
          ]}
          lastUpdated={new Date()}
          dataSource="Congress.gov"
        />
      </main>
    </div>
  );
}
