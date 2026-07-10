/**
 * Immigration Topic Hub Page
 *
 * SEO Strategy: Comprehensive topic page targeting immigration-related queries.
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
  alternates: { canonical: 'https://civdotiq.org/topics/immigration' },
  title: 'Immigration Legislation & Policy',
  description:
    'Track immigration legislation in Congress. Border security, legal immigration, asylum, workforce visas, citizenship, and the committees that shape immigration policy.',
  keywords: [
    'immigration legislation',
    'border security Congress',
    'visa policy',
    'asylum law',
    'DREAM Act',
    'H-1B visa',
    'citizenship',
    'immigration reform',
  ],
  openGraph: {
    title: 'Immigration Legislation & Policy',
    description:
      'Track immigration legislation in Congress. Border security, legal immigration, asylum, and workforce visas.',
    type: 'website',
  },
};

// Immigration-related committees
const IMMIGRATION_COMMITTEES = [
  {
    id: 'HSJU',
    name: 'House Judiciary Committee',
    jurisdiction: 'Immigration law, citizenship, visa policy, border enforcement',
    subcommittees: ['Immigration Integrity, Security, and Enforcement'],
  },
  {
    id: 'SSJU',
    name: 'Senate Judiciary Committee',
    jurisdiction: 'Immigration reform, asylum, immigration courts',
    subcommittees: ['Immigration, Citizenship, and Border Safety'],
  },
  {
    id: 'HSHM',
    name: 'House Homeland Security Committee',
    jurisdiction: 'Border security, CBP and ICE oversight, DHS operations',
    subcommittees: ['Border Security and Enforcement', 'Counterterrorism'],
  },
  {
    id: 'SSGA',
    name: 'Senate Homeland Security and Governmental Affairs Committee',
    jurisdiction: 'DHS oversight, border management, immigration enforcement',
    subcommittees: ['Government Operations and Border Management'],
  },
];

// Key immigration policy areas
const POLICY_AREAS = [
  {
    name: 'Border Security',
    description: 'Physical barriers, technology, personnel, and enforcement at U.S. borders',
    keywords: ['CBP', 'border wall', 'border technology', 'ports of entry'],
  },
  {
    name: 'Legal Immigration',
    description: 'Family-based, employment-based, and diversity visa categories',
    keywords: ['green card', 'family reunification', 'diversity visa', 'immigration backlog'],
  },
  {
    name: 'Asylum & Refugees',
    description: 'Asylum processing, refugee resettlement, and humanitarian protection',
    keywords: ['asylum seekers', 'refugee cap', 'credible fear', 'TPS'],
  },
  {
    name: 'Workforce Visas',
    description: 'Temporary and permanent employment-based immigration programs',
    keywords: ['H-1B', 'H-2A', 'H-2B', 'EB-5'],
  },
  {
    name: 'Citizenship',
    description: 'Naturalization, DACA, pathways to legal status',
    keywords: ['naturalization', 'DACA', 'DREAM Act', 'civics test'],
  },
  {
    name: 'Enforcement',
    description: 'Interior enforcement, workplace verification, and deportation policy',
    keywords: ['ICE', 'E-Verify', 'deportation', 'sanctuary cities'],
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
    question: 'Which congressional committees handle immigration legislation?',
    answer:
      'Immigration legislation is primarily handled by the Judiciary Committees in both the House and Senate. The House and Senate Homeland Security Committees oversee border security and DHS operations. Immigration bills often require coordination between these committees due to overlapping jurisdictions.',
  },
  {
    question: 'What is the U.S. visa system?',
    answer:
      'The U.S. visa system includes family-based visas, employment-based visas (such as H-1B for skilled workers), diversity visas, and humanitarian visas. Congress sets annual numerical limits for most visa categories and establishes eligibility requirements. Employment visa categories include temporary (nonimmigrant) and permanent (immigrant) pathways.',
  },
  {
    question: 'How does the asylum process work?',
    answer:
      'Asylum seekers must demonstrate a well-founded fear of persecution based on race, religion, nationality, political opinion, or membership in a particular social group. Applications can be filed affirmatively with USCIS or defensively in immigration court. Congress sets the legal framework for asylum through the Immigration and Nationality Act.',
  },
  {
    question: 'How can I track immigration legislation in Congress?',
    answer:
      'Track immigration legislation on CIV.IQ by following the House and Senate Judiciary Committees and the Homeland Security Committees. You can also search for specific immigration topics on our bills page.',
  },
];

export default function ImmigrationTopicPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: 'Immigration', url: 'https://civdotiq.org/topics/immigration' },
        ]}
      />
      <CollectionPageSchema
        name="Immigration Legislation & Policy"
        description="Track immigration legislation including border security, visas, citizenship, and asylum."
        url="https://civdotiq.org/topics/immigration"
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
          <span className="font-medium text-gray-900">Immigration</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl"></span>
          <h1 className="text-3xl font-bold text-gray-900">Immigration</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Border security, legal immigration, asylum, workforce visas, and citizenship policy in
          Congress
        </p>

        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            <strong>Immigration policy</strong> is among the most debated areas of federal
            legislation. Congress sets the rules for{' '}
            <Link href="#policy-areas" className="text-civiq-blue hover:underline">
              legal immigration
            </Link>
            , including visa categories and annual limits, while also addressing{' '}
            <Link href="#policy-areas" className="text-civiq-blue hover:underline">
              border security
            </Link>{' '}
            and enforcement. The Immigration and Nationality Act provides the statutory foundation,
            with Congress periodically considering comprehensive reform efforts.
          </p>
          <p className="text-gray-700 mb-4">
            Immigration jurisdiction is shared between the{' '}
            <Link href="/committee/HSJU" className="text-civiq-blue hover:underline">
              Judiciary Committees
            </Link>{' '}
            (which handle immigration law) and the{' '}
            <Link href="/committee/HSHM" className="text-civiq-blue hover:underline">
              Homeland Security Committees
            </Link>{' '}
            (which oversee border operations and enforcement agencies). This split jurisdiction
            often complicates the legislative process for comprehensive immigration reform.
          </p>
        </section>

        {/* Key Committees Section */}
        <section id="committees" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Key Committees
          </h2>
          <p className="text-gray-700 mb-4">
            These committees have primary jurisdiction over immigration legislation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {IMMIGRATION_COMMITTEES.map(committee => (
              <Link
                key={committee.id}
                href={`/committee/${committee.id}`}
                className="block p-4 bg-white border-2 border-gray-200 hover:border-civiq-blue transition-colors"
              >
                <h3 className="font-bold text-gray-900 mb-1">{committee.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{committee.jurisdiction}</p>
                <p className="text-xs text-civiq-blue">
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
                      className="px-2 py-1 text-xs bg-civiq-red/10 text-civiq-red border border-civiq-red"
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
            Major immigration legislation and proposals in recent Congresses include:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Bipartisan Border Security Bill (2024)</strong> - Proposed reforms to asylum
              processing, border enforcement, and immigration court capacity
            </li>
            <li>
              <strong>DREAM Act Proposals</strong> - Legislation to provide a pathway to citizenship
              for individuals brought to the U.S. as children
            </li>
            <li>
              <strong>H-1B Visa Reform Proposals</strong> - Bills to modernize the skilled worker
              visa program, adjust caps, and reform allocation
            </li>
            <li>
              <strong>Afghan Adjustment Act Proposals</strong> - Legislation to provide permanent
              legal status to Afghan evacuees following the 2021 withdrawal
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
        <PolicyAreaCrossDomain policyArea="Immigration" />

        {/* FAQ Section */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="Immigration"
          relatedLinks={[
            { href: '/topics/justice', label: 'Criminal Justice' },
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
