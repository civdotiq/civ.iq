/**
 * Foreign Policy Topic Hub Page
 *
 * SEO Strategy: Comprehensive topic page targeting foreign policy-related queries.
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
  alternates: { canonical: 'https://civdotiq.org/topics/foreign-policy' },
  title: 'Foreign Policy Legislation',
  description:
    'Track foreign policy legislation in Congress. International relations, treaties, foreign aid, sanctions, diplomacy, and international organization bills and the committees that shape U.S. foreign policy.',
  keywords: [
    'foreign policy legislation',
    'international relations Congress',
    'foreign aid',
    'sanctions bills',
    'treaties Senate',
    'diplomacy',
    'foreign affairs committee',
    'AUKUS',
  ],
  openGraph: {
    title: 'Foreign Policy Legislation',
    description:
      'Track foreign policy legislation in Congress. International relations, treaties, foreign aid, and sanctions.',
    type: 'website',
  },
};

// Foreign policy-related committees
const FOREIGN_POLICY_COMMITTEES = [
  {
    id: 'HSFA',
    name: 'House Foreign Affairs Committee',
    jurisdiction: 'Foreign policy, international organizations, export controls',
    subcommittees: ['Europe', 'Indo-Pacific', 'Middle East, North Africa, and Central Asia'],
  },
  {
    id: 'SSFR',
    name: 'Senate Foreign Relations Committee',
    jurisdiction: 'Treaties, nominations, foreign aid authorization, diplomatic policy',
    subcommittees: [
      'Europe and Regional Security Cooperation',
      'East Asia, the Pacific, and International Cybersecurity Policy',
    ],
  },
  {
    id: 'HLIG',
    name: 'House Permanent Select Committee on Intelligence',
    jurisdiction: 'Intelligence community oversight, covert operations, foreign intelligence',
    subcommittees: [
      'Defense Intelligence and Overhead Architecture',
      'Strategic Technologies and Advanced Research',
    ],
  },
  {
    id: 'SLIN',
    name: 'Senate Select Committee on Intelligence',
    jurisdiction: 'Intelligence activities, national security threats, counterintelligence',
    subcommittees: ['Collection and Operations', 'Analysis'],
  },
];

// Key foreign policy areas
const POLICY_AREAS = [
  {
    name: 'International Relations',
    description: 'Bilateral and multilateral relationships, alliances, and diplomatic strategy',
    keywords: ['NATO', 'Indo-Pacific strategy', 'China relations', 'Russia policy'],
  },
  {
    name: 'Treaties & Agreements',
    description: 'Senate treaty ratification, executive agreements, and international accords',
    keywords: ['treaty ratification', 'executive agreements', 'arms control', 'trade agreements'],
  },
  {
    name: 'Foreign Aid',
    description: 'Development assistance, humanitarian relief, and security cooperation',
    keywords: ['USAID', 'development assistance', 'humanitarian aid', 'security assistance'],
  },
  {
    name: 'Sanctions',
    description:
      'Economic sanctions, export controls, and financial restrictions on foreign actors',
    keywords: ['economic sanctions', 'OFAC', 'export controls', 'asset freezes'],
  },
  {
    name: 'Diplomacy',
    description: 'State Department operations, ambassador nominations, and diplomatic missions',
    keywords: ['State Department', 'ambassadors', 'diplomatic corps', 'consular services'],
  },
  {
    name: 'International Organizations',
    description: 'U.S. participation in the UN, WHO, World Bank, and other multilateral bodies',
    keywords: ['United Nations', 'WHO', 'World Bank', 'IMF'],
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
    question: 'Which committees handle foreign policy?',
    answer:
      'Foreign policy legislation is primarily handled by the House Foreign Affairs Committee and the Senate Foreign Relations Committee. The intelligence committees in both chambers (House Permanent Select Committee on Intelligence and Senate Select Committee on Intelligence) oversee intelligence activities related to foreign policy. Appropriations subcommittees on State and Foreign Operations control foreign aid funding.',
  },
  {
    question: 'How does Congress authorize foreign aid?',
    answer:
      'Congress authorizes foreign aid through authorization bills reported by the Foreign Affairs and Foreign Relations committees, and funds it through appropriations bills from the State and Foreign Operations subcommittees. Authorization sets policy direction and spending limits, while appropriations provides the actual funding. Foreign aid includes development assistance, humanitarian relief, and security cooperation.',
  },
  {
    question: 'What role does the Senate play in treaties?',
    answer:
      'The Constitution requires the Senate to provide "advice and consent" for treaty ratification by a two-thirds vote. The Senate Foreign Relations Committee holds hearings on treaties and recommends action to the full Senate. This gives the Senate a unique role in foreign policy that the House does not share, making the Foreign Relations Committee one of the most influential in shaping international agreements.',
  },
  {
    question: 'How can I track foreign policy legislation?',
    answer:
      'Track foreign policy legislation on CIV.IQ by following the House Foreign Affairs Committee, Senate Foreign Relations Committee, and the intelligence committees. You can also search for specific topics like sanctions or foreign aid on our bills page.',
  },
];

export default function ForeignPolicyTopicPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: 'Foreign Policy', url: 'https://civdotiq.org/topics/foreign-policy' },
        ]}
      />
      <CollectionPageSchema
        name="Foreign Policy Legislation"
        description="Track foreign policy legislation including international relations, treaties, and foreign aid."
        url="https://civdotiq.org/topics/foreign-policy"
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
          <span className="font-medium text-gray-900">Foreign Policy</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">&#x1F310;</span>
          <h1 className="text-3xl font-bold text-gray-900">Foreign Policy</h1>
        </div>
        <p className="text-gray-600 mb-4">
          International relations, treaties, foreign aid, sanctions, and diplomacy legislation in
          Congress
        </p>

        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            <strong>Foreign policy</strong> is one of the areas where Congress and the executive
            branch share significant authority. While the President conducts diplomacy, Congress
            controls the power of the purse for{' '}
            <Link href="#policy-areas" className="text-civiq-blue hover:underline">
              foreign aid
            </Link>{' '}
            and has the sole authority to declare war. The Senate has the unique constitutional role
            of ratifying{' '}
            <Link href="#policy-areas" className="text-civiq-blue hover:underline">
              treaties
            </Link>{' '}
            and confirming ambassadors.
          </p>
          <p className="text-gray-700 mb-4">
            The{' '}
            <Link href="/committee/HSFA" className="text-civiq-blue hover:underline">
              House Foreign Affairs Committee
            </Link>{' '}
            and{' '}
            <Link href="/committee/SSFR" className="text-civiq-blue hover:underline">
              Senate Foreign Relations Committee
            </Link>{' '}
            lead on foreign policy legislation, while the intelligence committees provide critical
            oversight of national security activities. Understanding these committee roles helps you
            follow U.S. foreign policy actions effectively.
          </p>
        </section>

        {/* Key Committees Section */}
        <section id="committees" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Key Committees
          </h2>
          <p className="text-gray-700 mb-4">
            These committees have primary jurisdiction over foreign policy legislation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FOREIGN_POLICY_COMMITTEES.map(committee => (
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
            Major foreign policy legislation in recent Congresses includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Ukraine, Israel, and Taiwan Aid Packages</strong> - Supplemental
              appropriations providing security and economic assistance to key allies and partners
            </li>
            <li>
              <strong>AUKUS Agreement Implementation</strong> - Legislation supporting the
              trilateral security partnership between Australia, the United Kingdom, and the United
              States on nuclear submarine technology
            </li>
            <li>
              <strong>Countering CCP Act Proposals</strong> - Comprehensive legislation addressing
              competition with China across economic, technological, and security domains
            </li>
            <li>
              <strong>African Growth and Opportunity Act Reauthorization</strong> - Renewal of
              preferential trade access for eligible sub-Saharan African countries
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
        <PolicyAreaCrossDomain policyArea="International Affairs" />

        {/* FAQ Section */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="Foreign Policy"
          relatedLinks={[
            { href: '/topics/defense', label: 'Defense & Military' },
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
