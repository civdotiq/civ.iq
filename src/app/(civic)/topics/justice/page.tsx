/**
 * Criminal Justice Topic Hub Page
 *
 * SEO Strategy: Comprehensive topic page targeting criminal justice-related queries.
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
  title: 'Criminal Justice Legislation & Policy | CIV.IQ',
  description:
    'Track criminal justice legislation in Congress. Policing reform, sentencing reform, courts, civil rights, prison reform, and gun violence prevention bills and the committees that shape justice policy.',
  keywords: [
    'criminal justice legislation',
    'policing reform Congress',
    'sentencing reform',
    'civil rights bills',
    'prison reform',
    'gun violence prevention',
    'judiciary committee',
    'First Step Act',
  ],
  openGraph: {
    title: 'Criminal Justice Legislation & Policy | CIV.IQ',
    description:
      'Track criminal justice legislation in Congress. Policing reform, sentencing, courts, and civil rights.',
    type: 'website',
  },
};

// Justice-related committees
const JUSTICE_COMMITTEES = [
  {
    id: 'HSJU',
    name: 'House Judiciary Committee',
    jurisdiction: 'Criminal law, courts, civil liberties, constitutional amendments',
    subcommittees: [
      'Crime and Federal Government Surveillance',
      'Courts, Intellectual Property, and the Internet',
    ],
  },
  {
    id: 'SSJU',
    name: 'Senate Judiciary Committee',
    jurisdiction: 'Federal courts, judicial nominations, criminal justice reform',
    subcommittees: ['Criminal Justice and Counterterrorism', 'Human Rights and the Law'],
  },
  {
    id: 'HSGO',
    name: 'House Oversight and Accountability Committee',
    jurisdiction: 'Government operations, civil rights enforcement, law enforcement oversight',
    subcommittees: ['Civil Rights and Civil Liberties', 'Government Operations'],
  },
];

// Key criminal justice policy areas
const POLICY_AREAS = [
  {
    name: 'Policing Reform',
    description: 'Use-of-force standards, accountability, training, and community policing',
    keywords: ['qualified immunity', 'body cameras', 'community policing', 'use of force'],
  },
  {
    name: 'Sentencing Reform',
    description: 'Mandatory minimums, disparities in sentencing, and alternatives to incarceration',
    keywords: ['mandatory minimums', 'crack-powder disparity', 'diversion programs', 'reentry'],
  },
  {
    name: 'Courts & Judicial Nominees',
    description: 'Federal court appointments, judicial confirmation process, court structure',
    keywords: ['judicial nominations', 'federal judges', 'Supreme Court', 'circuit courts'],
  },
  {
    name: 'Civil Rights',
    description: 'Voting rights, anti-discrimination protections, equal justice under law',
    keywords: ['Voting Rights Act', 'equal protection', 'hate crimes', 'civil liberties'],
  },
  {
    name: 'Prison Reform',
    description: 'Conditions of confinement, rehabilitation programs, reentry support',
    keywords: ['First Step Act', 'recidivism', 'prison conditions', 'rehabilitation'],
  },
  {
    name: 'Gun Violence Prevention',
    description: 'Background checks, assault weapons legislation, red flag laws',
    keywords: ['background checks', 'assault weapons ban', 'red flag laws', 'gun safety'],
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
    question: 'Which committees handle criminal justice legislation?',
    answer:
      'Criminal justice legislation is primarily handled by the House Judiciary Committee and the Senate Judiciary Committee. The House Oversight and Accountability Committee also plays a role in law enforcement oversight and civil rights enforcement. These committees consider bills on policing, sentencing, courts, and civil liberties.',
  },
  {
    question: 'What was the First Step Act?',
    answer:
      'The First Step Act, signed into law in 2018, was a bipartisan criminal justice reform law. It reduced mandatory minimum sentences for certain nonviolent drug offenses, expanded early release programs, and improved conditions in federal prisons. It also expanded rehabilitative programs aimed at reducing recidivism.',
  },
  {
    question: 'How does sentencing reform work in Congress?',
    answer:
      'Sentencing reform in Congress typically involves amending federal criminal statutes to change mandatory minimum sentences, address sentencing disparities, or create alternatives to incarceration. Bills are referred to the Judiciary Committees in each chamber, where hearings are held and markup occurs before floor votes.',
  },
  {
    question: 'How can I track criminal justice legislation?',
    answer:
      'Track criminal justice legislation on CIV.IQ by following the House and Senate Judiciary Committees. You can also search for specific topics like policing reform or sentencing on our bills page to find relevant legislation.',
  },
];

export default function JusticeTopicPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: 'Criminal Justice', url: 'https://civdotiq.org/topics/justice' },
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
          <span className="font-medium text-gray-900">Criminal Justice</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">&#x2696;&#xFE0F;</span>
          <h1 className="text-3xl font-bold text-gray-900">Criminal Justice</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Policing reform, sentencing, courts, civil rights, and gun violence prevention legislation
          in Congress
        </p>

        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            <strong>Criminal justice policy</strong> addresses the laws, institutions, and practices
            that govern how the federal government enforces the law and administers justice. From{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              policing reform
            </Link>{' '}
            to{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              sentencing policy
            </Link>
            , Congress debates how to balance public safety with fairness and civil liberties.
          </p>
          <p className="text-gray-700 mb-4">
            The{' '}
            <Link href="/committee/HSJU" className="text-blue-600 hover:underline">
              House Judiciary Committee
            </Link>{' '}
            and{' '}
            <Link href="/committee/SSJU" className="text-blue-600 hover:underline">
              Senate Judiciary Committee
            </Link>{' '}
            have primary jurisdiction over criminal law, courts, and civil liberties. Understanding
            committee jurisdiction helps you follow legislation and engage with your representatives
            effectively.
          </p>
        </section>

        {/* Key Committees Section */}
        <section id="committees" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Key Committees
          </h2>
          <p className="text-gray-700 mb-4">
            These committees have primary jurisdiction over criminal justice legislation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {JUSTICE_COMMITTEES.map(committee => (
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
                      className="px-2 py-1 text-xs bg-amber-50 text-amber-700 border border-amber-200"
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
            Major criminal justice legislation in recent Congresses includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Bipartisan Safer Communities Act (2022)</strong> - Enhanced background checks
              for young gun buyers, funding for crisis intervention programs
            </li>
            <li>
              <strong>Violence Against Women Act Reauthorization (2022)</strong> - Renewed and
              expanded protections for victims of domestic violence, sexual assault, and stalking
            </li>
            <li>
              <strong>First Step Act (2018)</strong> - Reduced mandatory minimums, expanded early
              release, improved federal prison conditions
            </li>
            <li>
              <strong>George Floyd Justice in Policing Act</strong> - Proposed federal standards for
              policing, including limits on qualified immunity and use of force
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
        <PolicyAreaCrossDomain policyArea="Crime and Law Enforcement" />

        {/* FAQ Section */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="Criminal Justice"
          relatedLinks={[
            { href: '/topics/immigration', label: 'Immigration' },
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
