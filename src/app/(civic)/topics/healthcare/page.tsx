/**
 * Healthcare Topic Hub Page
 *
 * SEO Strategy: Comprehensive topic page targeting healthcare-related queries.
 * Links to relevant committees, types of legislation, and related topics.
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
  title: 'Healthcare Legislation & Policy | CIV.IQ',
  description:
    'Track healthcare legislation in Congress. Medicare, Medicaid, ACA, drug pricing, public health bills, and the committees that shape health policy.',
  keywords: [
    'healthcare legislation',
    'Medicare bills',
    'Medicaid',
    'Affordable Care Act',
    'drug pricing',
    'public health policy',
    'health insurance',
    'prescription drugs Congress',
  ],
  openGraph: {
    title: 'Healthcare Legislation & Policy | CIV.IQ',
    description:
      'Track healthcare legislation in Congress. Medicare, Medicaid, ACA, drug pricing, and public health bills.',
    type: 'website',
  },
};

// Healthcare-related committees
const HEALTHCARE_COMMITTEES = [
  {
    id: 'HSIF',
    name: 'House Energy and Commerce Committee',
    jurisdiction: 'Primary jurisdiction over health legislation in the House',
    subcommittees: ['Health Subcommittee'],
  },
  {
    id: 'HSWM',
    name: 'House Ways and Means Committee',
    jurisdiction: 'Medicare, health tax policy',
    subcommittees: ['Health Subcommittee'],
  },
  {
    id: 'SSHR',
    name: 'Senate HELP Committee',
    jurisdiction: 'Health, Education, Labor, and Pensions',
    subcommittees: ['Primary Health and Retirement Security'],
  },
  {
    id: 'SSFI',
    name: 'Senate Finance Committee',
    jurisdiction: 'Medicare, Medicaid financing',
    subcommittees: ['Health Care Subcommittee'],
  },
];

// Key healthcare policy areas
const POLICY_AREAS = [
  {
    name: 'Medicare',
    description: 'Federal health insurance for seniors 65+ and people with disabilities',
    keywords: ['Medicare Advantage', 'Part D', 'prescription drugs'],
  },
  {
    name: 'Medicaid',
    description: 'Joint federal-state program providing health coverage for low-income individuals',
    keywords: ['Medicaid expansion', 'state waivers', 'eligibility'],
  },
  {
    name: 'Affordable Care Act (ACA)',
    description: 'Health insurance marketplaces and consumer protections',
    keywords: ['Obamacare', 'health exchanges', 'pre-existing conditions'],
  },
  {
    name: 'Drug Pricing',
    description: 'Efforts to lower prescription drug costs',
    keywords: ['Inflation Reduction Act', 'drug negotiations', 'generic drugs'],
  },
  {
    name: 'Public Health',
    description: 'CDC, NIH, pandemic preparedness, disease prevention',
    keywords: ['COVID-19', 'vaccines', 'mental health', 'opioid crisis'],
  },
  {
    name: 'Veterans Health',
    description: 'VA healthcare system and benefits',
    keywords: ['VA hospitals', 'PACT Act', 'toxic exposure'],
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
    question: 'Which congressional committee handles Medicare legislation?',
    answer:
      'Medicare legislation is primarily handled by the House Ways and Means Committee and the Senate Finance Committee. Both have dedicated health subcommittees that focus on Medicare policy, including Part D prescription drug coverage and Medicare Advantage.',
  },
  {
    question: 'How does Congress regulate drug prices?',
    answer:
      'Congress regulates drug prices through legislation like the Inflation Reduction Act, which allows Medicare to negotiate prices for certain drugs. The House Energy and Commerce Committee and Senate HELP Committee have jurisdiction over pharmaceutical regulation.',
  },
  {
    question: 'What is the difference between Medicare and Medicaid?',
    answer:
      'Medicare is a federal program providing health insurance primarily to people 65 and older. Medicaid is a joint federal-state program that provides health coverage to low-income individuals and families. Different congressional committees oversee each program.',
  },
  {
    question: 'How can I track healthcare bills in Congress?',
    answer:
      'You can track healthcare bills on CIV.IQ by following the relevant committees (Energy and Commerce, Ways and Means, HELP, Finance) or by searching for healthcare-related legislation on our bills page.',
  },
];

export default function HealthcareTopicPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: 'Healthcare', url: 'https://civdotiq.org/topics/healthcare' },
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
          <span className="font-medium text-gray-900">Healthcare</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🏥</span>
          <h1 className="text-3xl font-bold text-gray-900">Healthcare Policy</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Medicare, Medicaid, ACA, drug pricing, and public health legislation in Congress
        </p>

        <FreshnessTimestamp lastUpdated={new Date()} dataSource="Congress.gov" />

        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            <strong>Healthcare policy</strong> is one of the most actively legislated areas in
            Congress. Key programs like{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              Medicare
            </Link>{' '}
            and{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              Medicaid
            </Link>{' '}
            provide health coverage to over 150 million Americans. Congress debates issues ranging
            from prescription drug pricing to hospital funding to public health preparedness.
          </p>
          <p className="text-gray-700 mb-4">
            Healthcare legislation typically moves through specialized{' '}
            <Link href="#committees" className="text-blue-600 hover:underline">
              committees
            </Link>{' '}
            with jurisdiction over health policy. Understanding which committees handle which
            aspects of healthcare helps you track relevant legislation and engage with the right
            representatives.
          </p>
        </section>

        {/* Key Committees Section */}
        <section id="committees" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Key Committees
          </h2>
          <p className="text-gray-700 mb-4">
            These committees have primary jurisdiction over healthcare legislation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HEALTHCARE_COMMITTEES.map(committee => (
              <Link
                key={committee.id}
                href={`/committee/${committee.id}`}
                className="block p-4 bg-white border-2 border-gray-200 hover:border-blue-500 transition-colors"
              >
                <h3 className="font-bold text-gray-900 mb-1">{committee.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{committee.jurisdiction}</p>
                <p className="text-xs text-blue-600">
                  Key subcommittees: {committee.subcommittees.join(', ')}
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
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200"
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
            Major healthcare legislation in recent Congresses includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Inflation Reduction Act (2022)</strong> - Medicare drug price negotiation,
              insulin price caps
            </li>
            <li>
              <strong>PACT Act (2022)</strong> - Expanded VA healthcare for veterans exposed to
              toxic substances
            </li>
            <li>
              <strong>American Rescue Plan (2021)</strong> - Enhanced ACA subsidies, Medicaid
              expansion incentives
            </li>
            <li>
              <strong>CARES Act (2020)</strong> - COVID-19 response, hospital funding, vaccine
              development
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

        {/* Related Links */}
        <RelatedLinks
          links={[
            {
              href: '/topics/economy',
              title: 'Economy & Jobs',
              description: 'Economic policy and employment',
              type: 'bill',
            },
            {
              href: '/committees',
              title: 'All Committees',
              description: 'Browse congressional committees',
              type: 'committee',
            },
            {
              href: '/glossary',
              title: 'Civic Glossary',
              description: 'Definitions of legislative terms',
              type: 'bill',
            },
            {
              href: '/topics',
              title: 'All Topics',
              description: 'Browse all policy topics',
              type: 'bill',
            },
          ]}
        />

        <CategoryTags
          categories={[
            { name: 'Healthcare', href: '/topics/healthcare' },
            { name: 'Policy Topics', href: '/topics' },
            { name: 'Legislation', href: '/legislation' },
          ]}
        />
      </main>
    </div>
  );
}
