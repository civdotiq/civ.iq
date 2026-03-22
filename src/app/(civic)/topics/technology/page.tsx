/**
 * Technology & Privacy Topic Hub Page
 *
 * SEO Strategy: Comprehensive topic page targeting technology-related queries.
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
  title: 'Technology & Privacy Legislation',
  description:
    'Track technology legislation in Congress. Big tech regulation, data privacy, artificial intelligence, cybersecurity, social media, and broadband access bills and the committees that shape tech policy.',
  keywords: [
    'technology legislation',
    'data privacy Congress',
    'AI regulation',
    'big tech antitrust',
    'cybersecurity bills',
    'social media regulation',
    'broadband access',
    'CHIPS Act',
  ],
  openGraph: {
    title: 'Technology & Privacy Legislation',
    description:
      'Track technology legislation in Congress. Big tech regulation, data privacy, AI, and cybersecurity.',
    type: 'website',
  },
};

// Technology-related committees
const TECHNOLOGY_COMMITTEES = [
  {
    id: 'HSIF',
    name: 'House Energy and Commerce Committee',
    jurisdiction: 'Telecommunications, internet, consumer protection, data privacy',
    subcommittees: ['Communications and Technology', 'Innovation, Data, and Commerce'],
  },
  {
    id: 'SSCM',
    name: 'Senate Commerce, Science, and Transportation Committee',
    jurisdiction: 'Technology policy, broadband, consumer protection, science',
    subcommittees: [
      'Communications, Media, and Broadband',
      'Consumer Protection, Product Safety, and Data Security',
    ],
  },
  {
    id: 'HSJU',
    name: 'House Judiciary Committee',
    jurisdiction: 'Antitrust, intellectual property, platform competition',
    subcommittees: ['Courts, Intellectual Property, and the Internet'],
  },
  {
    id: 'HSSY',
    name: 'House Science, Space, and Technology Committee',
    jurisdiction: 'Federal R&D, NIST, NSF, emerging technology research',
    subcommittees: ['Research and Technology', 'Energy'],
  },
];

// Key technology policy areas
const POLICY_AREAS = [
  {
    name: 'Big Tech Regulation',
    description: 'Antitrust enforcement, platform competition, and market dominance',
    keywords: ['antitrust', 'platform competition', 'Section 230', 'market power'],
  },
  {
    name: 'Data Privacy',
    description: 'Consumer data protection, collection practices, and breach notification',
    keywords: ['ADPPA', 'GDPR', 'data brokers', 'consumer consent'],
  },
  {
    name: 'Artificial Intelligence',
    description: 'AI safety, algorithmic accountability, and federal AI strategy',
    keywords: ['AI safety', 'algorithmic bias', 'deepfakes', 'AI governance'],
  },
  {
    name: 'Cybersecurity',
    description:
      'Critical infrastructure protection, incident reporting, and federal cyber defense',
    keywords: ['CISA', 'ransomware', 'critical infrastructure', 'incident reporting'],
  },
  {
    name: 'Social Media',
    description: 'Content moderation, child safety online, and platform transparency',
    keywords: ['child safety', 'content moderation', 'algorithmic transparency', 'COPPA'],
  },
  {
    name: 'Broadband Access',
    description: 'Universal connectivity, rural broadband, and digital equity',
    keywords: ['rural broadband', 'digital divide', 'net neutrality', 'spectrum allocation'],
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
    question: 'Which committees regulate big tech?',
    answer:
      'Big tech regulation is handled by multiple committees. The House Energy and Commerce Committee oversees telecommunications and consumer protection. The House Judiciary Committee handles antitrust matters. The Senate Commerce, Science, and Transportation Committee covers technology policy broadly. Each committee examines different aspects of tech company conduct.',
  },
  {
    question: 'How does Congress approach AI regulation?',
    answer:
      'Congress approaches AI regulation through hearings, bipartisan working groups, and proposed legislation. The Senate has held multiple hearings on AI safety and governance. Proposed measures include algorithmic accountability requirements, disclosure rules for AI-generated content, and frameworks for federal agency use of AI systems.',
  },
  {
    question: 'What privacy laws is Congress considering?',
    answer:
      "Congress has considered comprehensive federal privacy legislation including the American Data Privacy and Protection Act (ADPPA), which would establish national data privacy standards. Other proposals address children's online privacy (updates to COPPA), data broker regulation, and biometric data protection. The Kids Online Safety Act has also advanced in committee.",
  },
  {
    question: 'How can I track technology legislation?',
    answer:
      'Track technology legislation on CIV.IQ by following the Energy and Commerce, Commerce Science and Transportation, Judiciary, and Science committees. You can also search for specific topics like data privacy or AI on our bills page.',
  },
];

export default function TechnologyTopicPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: 'Technology & Privacy', url: 'https://civdotiq.org/topics/technology' },
        ]}
      />
      <CollectionPageSchema
        name="Technology & Privacy Legislation"
        description="Track technology legislation including big tech regulation, data privacy, AI, and cybersecurity."
        url="https://civdotiq.org/topics/technology"
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
          <span className="font-medium text-gray-900">Technology & Privacy</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">&#x1F4BB;</span>
          <h1 className="text-3xl font-bold text-gray-900">Technology & Privacy</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Big tech regulation, data privacy, artificial intelligence, cybersecurity, and broadband
          access legislation in Congress
        </p>

        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            <strong>Technology policy</strong> has become one of the fastest-evolving areas of
            congressional activity. From{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              data privacy
            </Link>{' '}
            affecting every internet user to{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              artificial intelligence
            </Link>{' '}
            reshaping entire industries, Congress faces growing pressure to establish regulatory
            frameworks for emerging technologies.
          </p>
          <p className="text-gray-700 mb-4">
            Technology legislation is spread across multiple committees, reflecting its
            cross-cutting nature. The{' '}
            <Link href="/committee/HSIF" className="text-blue-600 hover:underline">
              House Energy and Commerce Committee
            </Link>{' '}
            handles telecommunications and consumer protection, while the{' '}
            <Link href="/committee/HSJU" className="text-blue-600 hover:underline">
              Judiciary Committee
            </Link>{' '}
            addresses antitrust concerns. Understanding this divided jurisdiction helps you follow
            tech legislation effectively.
          </p>
        </section>

        {/* Key Committees Section */}
        <section id="committees" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Key Committees
          </h2>
          <p className="text-gray-700 mb-4">
            These committees have primary jurisdiction over technology legislation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TECHNOLOGY_COMMITTEES.map(committee => (
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
                      className="px-2 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200"
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
            Major technology legislation in recent Congresses includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>CHIPS and Science Act (2022)</strong> - Semiconductor manufacturing
              incentives, federal R&D investment in emerging technologies
            </li>
            <li>
              <strong>TikTok Divestiture Legislation</strong> - Proposed requirement for
              foreign-owned social media platforms to divest or face prohibition
            </li>
            <li>
              <strong>AI Executive Orders</strong> - Executive branch directives on AI safety,
              testing requirements, and federal agency AI use
            </li>
            <li>
              <strong>American Data Privacy and Protection Act</strong> - Proposed comprehensive
              federal data privacy framework with consumer rights
            </li>
            <li>
              <strong>Kids Online Safety Act</strong> - Proposed duty of care for online platforms
              serving minors, algorithmic safeguards
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
        <PolicyAreaCrossDomain policyArea="Science, Technology, Communications" />

        {/* FAQ Section */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="Technology & Privacy"
          relatedLinks={[
            { href: '/topics/justice', label: 'Criminal Justice' },
            { href: '/topics/defense', label: 'Defense & Military' },
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
