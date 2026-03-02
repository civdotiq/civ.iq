/**
 * Defense & Military Topic Hub Page
 *
 * SEO Strategy: Comprehensive topic page targeting defense-related queries.
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
  title: 'Defense & Military Legislation | CIV.IQ',
  description:
    'Track defense legislation in Congress. NDAA, military personnel, veterans benefits, defense procurement, nuclear security, and the committees that shape defense policy.',
  keywords: [
    'defense legislation',
    'NDAA',
    'military spending Congress',
    'veterans benefits',
    'Armed Services Committee',
    'defense budget',
    'cybersecurity',
    'nuclear security',
  ],
  openGraph: {
    title: 'Defense & Military Legislation | CIV.IQ',
    description:
      'Track defense legislation in Congress. NDAA, military personnel, veterans benefits, and defense procurement.',
    type: 'website',
  },
};

// Defense-related committees
const DEFENSE_COMMITTEES = [
  {
    id: 'HSAS',
    name: 'House Armed Services Committee',
    jurisdiction: 'Defense policy, military operations, DOD oversight',
    subcommittees: ['Strategic Forces', 'Military Personnel', 'Readiness'],
  },
  {
    id: 'SSAS',
    name: 'Senate Armed Services Committee',
    jurisdiction: 'Defense authorization, military strategy, nominations',
    subcommittees: ['Strategic Forces', 'Personnel', 'Cybersecurity'],
  },
  {
    id: 'HSVR',
    name: 'House Veterans Affairs Committee',
    jurisdiction: 'Veterans benefits, VA healthcare, disability compensation',
    subcommittees: ['Health', 'Disability Assistance', 'Economic Opportunity'],
  },
  {
    id: 'SSVA',
    name: 'Senate Veterans Affairs Committee',
    jurisdiction: 'Veterans programs, VA oversight, benefits policy',
    subcommittees: ['Health', 'Benefits'],
  },
  {
    id: 'HSAP',
    name: 'House Appropriations Committee',
    jurisdiction: 'Defense spending levels via Defense subcommittee',
    subcommittees: ['Defense Subcommittee'],
  },
];

// Key defense policy areas
const POLICY_AREAS = [
  {
    name: 'National Defense Authorization',
    description: 'Annual NDAA setting defense policy, programs, and personnel levels',
    keywords: ['NDAA', 'defense authorization', 'force structure', 'military readiness'],
  },
  {
    name: 'Military Personnel',
    description: 'Troop levels, pay, benefits, recruitment, and quality of life',
    keywords: ['military pay', 'recruitment', 'housing', 'family support'],
  },
  {
    name: 'Veterans Benefits',
    description: 'Healthcare, education, disability compensation, and transition support',
    keywords: ['GI Bill', 'VA healthcare', 'disability claims', 'PACT Act'],
  },
  {
    name: 'Defense Procurement',
    description: 'Weapons systems, defense contracts, and acquisition reform',
    keywords: ['F-35', 'shipbuilding', 'acquisition reform', 'defense industrial base'],
  },
  {
    name: 'Nuclear Security',
    description: 'Nuclear arsenal modernization, nonproliferation, and NNSA oversight',
    keywords: ['nuclear modernization', 'NNSA', 'nonproliferation', 'arms control'],
  },
  {
    name: 'Cybersecurity',
    description: 'Military cyber operations, critical infrastructure, and cyber defense',
    keywords: ['Cyber Command', 'cyber defense', 'critical infrastructure', 'information warfare'],
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
    question: 'What is the NDAA?',
    answer:
      'The National Defense Authorization Act (NDAA) is annual legislation that sets defense policy, authorizes military programs, and establishes personnel levels for the Department of Defense. Congress has passed the NDAA for over 60 consecutive years, making it one of the most reliable pieces of annual legislation.',
  },
  {
    question: 'Which congressional committees oversee the military?',
    answer:
      'The House and Senate Armed Services Committees have primary jurisdiction over defense policy and the NDAA. The Veterans Affairs Committees in both chambers oversee VA programs. Defense spending levels are set by the Defense subcommittees of the Appropriations Committees in each chamber.',
  },
  {
    question: 'How does defense spending work in Congress?',
    answer:
      'Defense spending involves two steps: authorization and appropriation. The Armed Services Committees authorize programs and set policy through the NDAA. The Appropriations Committees then set actual funding levels through annual defense spending bills. The defense budget typically represents about half of federal discretionary spending.',
  },
  {
    question: 'What benefits do veterans receive from the federal government?',
    answer:
      'Veterans may receive healthcare through the VA system, education benefits under the GI Bill, disability compensation, home loan guarantees, and pension benefits. The PACT Act of 2022 expanded healthcare eligibility for veterans exposed to toxic substances including burn pits and Agent Orange.',
  },
];

export default function DefenseTopicPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: 'Defense & Military', url: 'https://civdotiq.org/topics/defense' },
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
          <span className="font-medium text-gray-900">Defense & Military</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🛡️</span>
          <h1 className="text-3xl font-bold text-gray-900">Defense & Military</h1>
        </div>
        <p className="text-gray-600 mb-4">
          National defense authorization, military personnel, veterans benefits, and defense
          procurement in Congress
        </p>

        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            <strong>Defense policy</strong> is one of the most significant areas of federal
            legislation. The annual{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              National Defense Authorization Act
            </Link>{' '}
            sets policy for the Department of Defense, while separate appropriations bills fund
            military operations. Congress also oversees{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              veterans benefits
            </Link>{' '}
            through the VA system, serving millions of former service members.
          </p>
          <p className="text-gray-700 mb-4">
            The{' '}
            <Link href="/committee/HSAS" className="text-blue-600 hover:underline">
              House Armed Services Committee
            </Link>{' '}
            and{' '}
            <Link href="/committee/SSAS" className="text-blue-600 hover:underline">
              Senate Armed Services Committee
            </Link>{' '}
            have primary jurisdiction over defense authorization. Defense spending represents
            approximately half of all federal discretionary spending, making oversight of these
            programs critical.
          </p>
        </section>

        {/* Key Committees Section */}
        <section id="committees" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Key Committees
          </h2>
          <p className="text-gray-700 mb-4">
            These committees have primary jurisdiction over defense and veterans legislation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEFENSE_COMMITTEES.map(committee => (
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
                      className="px-2 py-1 text-xs bg-slate-50 text-slate-700 border border-slate-200"
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
            Major defense and military legislation in recent Congresses includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>National Defense Authorization Act FY2024</strong> - Annual defense policy
              bill, military pay raise, force structure updates
            </li>
            <li>
              <strong>PACT Act (2022)</strong> - Expanded VA healthcare for veterans exposed to burn
              pits and toxic substances
            </li>
            <li>
              <strong>AUKUS Security Partnership</strong> - Nuclear submarine technology sharing
              with Australia and the United Kingdom
            </li>
            <li>
              <strong>Ukraine Security Assistance</strong> - Military aid packages supporting
              Ukraine through supplemental appropriations
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
        <PolicyAreaCrossDomain policyArea="Armed Forces and National Security" />

        {/* FAQ Section */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="Defense & Military"
          relatedLinks={[
            { href: '/topics/foreign-policy', label: 'Foreign Policy' },
            { href: '/topics/technology', label: 'Technology & Privacy' },
            { href: '/topics', label: 'All Topics' },
          ]}
          lastUpdated={new Date()}
          dataSource="Congress.gov"
        />
      </main>
    </div>
  );
}
