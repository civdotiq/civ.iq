/**
 * Banking & Finance Topic Hub Page
 *
 * SEO Strategy: Comprehensive topic page targeting banking and finance-related queries.
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
  title: 'Banking & Finance Legislation',
  description:
    'Track banking and finance legislation in Congress. Banking regulation, consumer protection, housing policy, securities, cryptocurrency, and insurance bills and the committees that shape financial policy.',
  keywords: [
    'banking legislation',
    'financial regulation Congress',
    'consumer protection',
    'housing policy',
    'cryptocurrency regulation',
    'securities law',
    'Dodd-Frank',
    'CFPB',
  ],
  openGraph: {
    title: 'Banking & Finance Legislation',
    description:
      'Track banking and finance legislation in Congress. Banking regulation, consumer protection, housing, and cryptocurrency.',
    type: 'website',
  },
};

// Finance-related committees
const FINANCE_COMMITTEES = [
  {
    id: 'HSBA',
    name: 'House Financial Services Committee',
    jurisdiction: 'Banking, securities, insurance, housing, monetary policy',
    subcommittees: [
      'Capital Markets',
      'Housing and Insurance',
      'Digital Assets, Financial Technology and Inclusion',
    ],
  },
  {
    id: 'SSBK',
    name: 'Senate Banking, Housing, and Urban Affairs Committee',
    jurisdiction: 'Banking, financial institutions, housing, urban development',
    subcommittees: [
      'Financial Institutions and Consumer Protection',
      'Securities, Insurance, and Investment',
    ],
  },
  {
    id: 'SSFI',
    name: 'Senate Finance Committee',
    jurisdiction: 'Tax policy, trade, Social Security, debt management',
    subcommittees: [
      'Taxation and IRS Oversight',
      'International Trade, Customs, and Global Competitiveness',
    ],
  },
];

// Key finance policy areas
const POLICY_AREAS = [
  {
    name: 'Banking Regulation',
    description: 'Capital requirements, stress testing, bank supervision, and systemic risk',
    keywords: ['Dodd-Frank', 'stress tests', 'capital requirements', 'too big to fail'],
  },
  {
    name: 'Consumer Protection',
    description: 'CFPB oversight, predatory lending, credit reporting, and financial literacy',
    keywords: ['CFPB', 'predatory lending', 'credit reporting', 'financial literacy'],
  },
  {
    name: 'Housing Policy',
    description: 'Affordable housing, mortgage regulation, FHA, and homelessness',
    keywords: ['affordable housing', 'FHA loans', 'mortgage rates', 'housing supply'],
  },
  {
    name: 'Securities & Markets',
    description: 'SEC oversight, investor protection, market structure, and disclosure rules',
    keywords: ['SEC', 'investor protection', 'market structure', 'IPO regulation'],
  },
  {
    name: 'Cryptocurrency',
    description: 'Digital asset regulation, stablecoin frameworks, and DeFi oversight',
    keywords: ['stablecoin', 'digital assets', 'DeFi', 'crypto exchanges'],
  },
  {
    name: 'Insurance',
    description: 'Federal insurance regulation, flood insurance, and terrorism risk insurance',
    keywords: ['NFIP', 'flood insurance', 'TRIA', 'insurance regulation'],
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
    question: 'Which committees oversee banking regulation?',
    answer:
      'Banking regulation is primarily overseen by the House Financial Services Committee and the Senate Banking, Housing, and Urban Affairs Committee. The Senate Finance Committee also plays a role in tax-related financial policy. These committees have jurisdiction over the Federal Reserve, FDIC, OCC, and other financial regulators.',
  },
  {
    question: 'What is the CFPB?',
    answer:
      'The Consumer Financial Protection Bureau (CFPB) is an independent federal agency created by the Dodd-Frank Act in 2010. It enforces consumer financial protection laws, supervises financial institutions, and handles consumer complaints. The CFPB has jurisdiction over mortgages, credit cards, student loans, and other consumer financial products.',
  },
  {
    question: 'How does Congress regulate cryptocurrency?',
    answer:
      'Congress has considered multiple frameworks for cryptocurrency regulation, including the FIT21 Act and various stablecoin proposals. Key questions include whether digital assets are securities or commodities, how to regulate stablecoins, and what requirements should apply to crypto exchanges. The Financial Services and Agriculture committees both claim jurisdiction over different aspects of digital asset regulation.',
  },
  {
    question: 'How can I track financial legislation?',
    answer:
      'Track financial legislation on CIV.IQ by following the House Financial Services Committee, Senate Banking Committee, and Senate Finance Committee. You can also search for specific topics like banking regulation or cryptocurrency on our bills page.',
  },
];

export default function FinanceTopicPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: 'Banking & Finance', url: 'https://civdotiq.org/topics/finance' },
        ]}
      />
      <CollectionPageSchema
        name="Banking & Finance Legislation"
        description="Track banking and finance legislation including banking regulation, housing, and consumer protection."
        url="https://civdotiq.org/topics/finance"
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
          <span className="font-medium text-gray-900">Banking & Finance</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">&#x1F3E6;</span>
          <h1 className="text-3xl font-bold text-gray-900">Banking & Finance</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Banking regulation, consumer protection, housing policy, securities, and cryptocurrency
          legislation in Congress
        </p>

        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            <strong>Banking and finance policy</strong> governs the institutions and rules that
            underpin the American financial system. From{' '}
            <Link href="#policy-areas" className="text-civiq-blue hover:underline">
              banking regulation
            </Link>{' '}
            ensuring the stability of financial institutions to{' '}
            <Link href="#policy-areas" className="text-civiq-blue hover:underline">
              consumer protection
            </Link>{' '}
            safeguarding everyday Americans, Congress plays a central role in shaping financial
            markets and oversight.
          </p>
          <p className="text-gray-700 mb-4">
            The{' '}
            <Link href="/committee/HSBA" className="text-civiq-blue hover:underline">
              House Financial Services Committee
            </Link>{' '}
            and{' '}
            <Link href="/committee/SSBK" className="text-civiq-blue hover:underline">
              Senate Banking Committee
            </Link>{' '}
            have primary jurisdiction over financial regulation. The emergence of{' '}
            <Link href="#policy-areas" className="text-civiq-blue hover:underline">
              cryptocurrency
            </Link>{' '}
            and digital assets has added new complexity to committee jurisdiction. Understanding
            these dynamics helps you follow legislation effectively.
          </p>
        </section>

        {/* Key Committees Section */}
        <section id="committees" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Key Committees
          </h2>
          <p className="text-gray-700 mb-4">
            These committees have primary jurisdiction over banking and finance legislation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FINANCE_COMMITTEES.map(committee => (
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
            Major banking and finance legislation in recent Congresses includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Dodd-Frank Implementation</strong> - Ongoing rulemaking and oversight of the
              2010 Wall Street reform law covering systemic risk, derivatives, and consumer
              protection
            </li>
            <li>
              <strong>CFPB Oversight</strong> - Congressional review of Consumer Financial
              Protection Bureau authority, structure, and enforcement actions
            </li>
            <li>
              <strong>Stablecoin Regulation Proposals</strong> - Proposed frameworks for regulating
              dollar-pegged digital currencies and their issuers
            </li>
            <li>
              <strong>Housing Affordability Bills</strong> - Proposals to increase housing supply,
              expand first-time buyer programs, and address rising costs
            </li>
            <li>
              <strong>FIT21 Crypto Framework Proposals</strong> - Financial Innovation and
              Technology for the 21st Century Act to establish regulatory clarity for digital assets
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
        <PolicyAreaCrossDomain policyArea="Finance and Financial Sector" />

        {/* FAQ Section */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="Banking & Finance"
          relatedLinks={[
            { href: '/topics/economy', label: 'Economy & Jobs' },
            { href: '/topics/technology', label: 'Technology & Privacy' },
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
