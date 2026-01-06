/**
 * Topics Hub Page - Wikipedia-style index of legislative topics
 *
 * SEO Strategy: Creates topical authority pages that link to related legislation,
 * committees, and representatives working on specific policy areas.
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
  title: 'Legislative Topics - Policy Areas & Issues | CIV.IQ',
  description:
    'Explore legislative topics including healthcare, economy, education, environment, and more. Find related bills, committees, and representatives for each policy area.',
  keywords: [
    'legislative topics',
    'policy areas',
    'healthcare legislation',
    'economic policy',
    'education bills',
    'environmental legislation',
    'Congress issues',
  ],
  openGraph: {
    title: 'Legislative Topics - Policy Areas & Issues',
    description:
      'Explore legislative topics and policy areas. Find related bills, committees, and representatives.',
    type: 'website',
  },
};

// Policy topic categories
const TOPICS = [
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Medicare, Medicaid, ACA, drug pricing, public health',
    icon: '🏥',
    committees: ['Energy and Commerce', 'Ways and Means', 'HELP'],
  },
  {
    id: 'economy',
    name: 'Economy & Jobs',
    description: 'Employment, wages, trade, small business, manufacturing',
    icon: '💼',
    committees: ['Ways and Means', 'Financial Services', 'Small Business'],
  },
  {
    id: 'education',
    name: 'Education',
    description: 'K-12, higher education, student loans, early childhood',
    icon: '📚',
    committees: ['Education and Workforce', 'HELP'],
  },
  {
    id: 'environment',
    name: 'Environment & Climate',
    description: 'Climate change, EPA, clean energy, conservation',
    icon: '🌍',
    committees: ['Energy and Commerce', 'Natural Resources', 'Environment and Public Works'],
  },
  {
    id: 'defense',
    name: 'Defense & Military',
    description: 'National defense, veterans affairs, military spending',
    icon: '🛡️',
    committees: ['Armed Services', 'Veterans Affairs', 'Defense Appropriations'],
  },
  {
    id: 'immigration',
    name: 'Immigration',
    description: 'Border security, visas, citizenship, asylum',
    icon: '🗽',
    committees: ['Judiciary', 'Homeland Security'],
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    description: 'Transportation, broadband, water systems, energy grid',
    icon: '🏗️',
    committees: ['Transportation and Infrastructure', 'Energy and Commerce'],
  },
  {
    id: 'justice',
    name: 'Criminal Justice',
    description: 'Policing reform, sentencing, courts, civil rights',
    icon: '⚖️',
    committees: ['Judiciary'],
  },
  {
    id: 'technology',
    name: 'Technology & Privacy',
    description: 'Big tech regulation, data privacy, AI, cybersecurity',
    icon: '💻',
    committees: ['Energy and Commerce', 'Judiciary', 'Science'],
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    description: 'Farm policy, food safety, rural development, nutrition',
    icon: '🌾',
    committees: ['Agriculture'],
  },
  {
    id: 'finance',
    name: 'Banking & Finance',
    description: 'Banking regulation, housing, consumer protection',
    icon: '🏦',
    committees: ['Financial Services', 'Banking'],
  },
  {
    id: 'foreign-policy',
    name: 'Foreign Policy',
    description: 'International relations, treaties, foreign aid',
    icon: '🌐',
    committees: ['Foreign Affairs', 'Foreign Relations'],
  },
];

// Table of Contents
const tocItems = [
  { id: 'overview', title: 'Overview', level: 1 as const },
  { id: 'topics', title: 'All Topics', level: 1 as const },
  { id: 'faq', title: 'Frequently Asked Questions', level: 1 as const },
];

// FAQ items
const faqItems = [
  {
    question: 'How are legislative topics organized?',
    answer:
      'Legislative topics are organized by policy area. Each topic page shows related committees that have jurisdiction, recent legislation, and representatives who focus on that area.',
  },
  {
    question: 'Which committees handle healthcare legislation?',
    answer:
      'Healthcare legislation is primarily handled by the House Energy and Commerce Committee, House Ways and Means Committee, and the Senate HELP Committee (Health, Education, Labor, and Pensions).',
  },
  {
    question: 'How can I track legislation on a specific topic?',
    answer:
      'Visit the topic page for your area of interest to see recent bills and ongoing legislation. You can also search for specific keywords on the legislation page.',
  },
];

export default function TopicsHubPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
        ]}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">Topics</span>
        </nav>

        {/* Page Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Legislative Topics</h1>
        <p className="text-gray-600 mb-4">
          Explore policy areas and find related legislation, committees, and representatives
        </p>

        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            Congress addresses a wide range of policy issues. Each topic area has dedicated{' '}
            <Link href="/committees" className="text-blue-600 hover:underline">
              committees
            </Link>{' '}
            that hold hearings, draft legislation, and provide oversight. Understanding which
            committees handle which topics helps you follow legislation and engage with your
            representatives effectively.
          </p>
        </section>

        {/* Topics Grid */}
        <section id="topics" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            All Topics
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOPICS.map(topic => (
              <Link
                key={topic.id}
                href={`/topics/${topic.id}`}
                className="block p-4 bg-white border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{topic.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{topic.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{topic.description}</p>
                    <p className="text-xs text-blue-600">
                      Committees: {topic.committees.slice(0, 2).join(', ')}
                      {topic.committees.length > 2 && '...'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="Policy Topics"
          relatedLinks={[
            { href: '/committees', label: 'Committees' },
            { href: '/bills/latest', label: 'Recent Bills' },
            { href: '/congress', label: 'U.S. Congress' },
          ]}
          lastUpdated={new Date()}
          dataSource="Congress.gov"
        />
      </main>
    </div>
  );
}
