/**
 * Education Topic Hub Page
 *
 * SEO Strategy: Comprehensive topic page targeting education-related queries.
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
  title: 'Education Legislation & Policy',
  description:
    'Track education legislation in Congress. K-12, higher education, student loans, early childhood, special education bills and the committees that shape education policy.',
  keywords: [
    'education legislation',
    'student loans Congress',
    'K-12 education policy',
    'higher education bills',
    'Title I funding',
    'FAFSA',
    'special education',
    'early childhood education',
  ],
  openGraph: {
    title: 'Education Legislation & Policy',
    description:
      'Track education legislation in Congress. K-12, higher education, student loans, and early childhood policy.',
    type: 'website',
  },
};

// Education-related committees
const EDUCATION_COMMITTEES = [
  {
    id: 'HSED',
    name: 'House Education and Workforce Committee',
    jurisdiction: 'Primary jurisdiction over education legislation in the House',
    subcommittees: [
      'Early Childhood, Elementary, and Secondary Education',
      'Higher Education and Workforce Development',
    ],
  },
  {
    id: 'SSHR',
    name: 'Senate HELP Committee',
    jurisdiction: 'Health, Education, Labor, and Pensions',
    subcommittees: ['Children and Families', 'Employment and Workplace Safety'],
  },
  {
    id: 'HSAP',
    name: 'House Appropriations Committee',
    jurisdiction: 'Labor, HHS, and Education funding subcommittee',
    subcommittees: ['Labor, HHS, Education Subcommittee'],
  },
];

// Key education policy areas
const POLICY_AREAS = [
  {
    name: 'K-12 Education',
    description: 'Elementary and secondary education funding, standards, and accountability',
    keywords: ['Title I', 'ESSA', 'school choice', 'teacher pay'],
  },
  {
    name: 'Higher Education',
    description: 'Colleges, universities, Pell Grants, and institutional accreditation',
    keywords: ['Pell Grants', 'Higher Education Act', 'accreditation', 'college affordability'],
  },
  {
    name: 'Student Loans',
    description: 'Federal student loan programs, repayment, and forgiveness',
    keywords: ['loan forgiveness', 'FAFSA', 'income-driven repayment', 'interest rates'],
  },
  {
    name: 'Early Childhood',
    description: 'Pre-K programs, Head Start, and childcare policy',
    keywords: ['Head Start', 'pre-K', 'childcare', 'child development'],
  },
  {
    name: 'Special Education',
    description: 'IDEA funding, disability accommodations, and inclusive education',
    keywords: ['IDEA', 'IEP', 'disability services', 'Section 504'],
  },
  {
    name: 'Vocational Training',
    description: 'Career and technical education, apprenticeships, and workforce readiness',
    keywords: ['CTE', 'apprenticeships', 'workforce development', 'Perkins Act'],
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
    question: 'Which congressional committee handles education legislation?',
    answer:
      'Education legislation is primarily handled by the House Education and Workforce Committee and the Senate HELP Committee (Health, Education, Labor, and Pensions). The House Appropriations Subcommittee on Labor, HHS, and Education controls federal education funding levels.',
  },
  {
    question: 'How does federal education funding work?',
    answer:
      'The federal government provides about 8-10% of K-12 education funding, primarily through Title I grants for low-income schools and IDEA funding for special education. Higher education funding flows through Pell Grants, federal student loans, and research grants. Congress sets funding levels through annual appropriations bills.',
  },
  {
    question: 'What is Title I?',
    answer:
      'Title I is the largest federal program supporting elementary and secondary education. It provides financial assistance to schools with high percentages of children from low-income families. Title I funds are allocated through formulas based on Census poverty data and per-pupil education expenditures.',
  },
  {
    question: 'How can I track education bills in Congress?',
    answer:
      'Track education bills on CIV.IQ by following the Education and Workforce Committee and the Senate HELP Committee. You can also search for education-related legislation by topic on our bills page.',
  },
];

export default function EducationTopicPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Topics', url: 'https://civdotiq.org/topics' },
          { name: 'Education', url: 'https://civdotiq.org/topics/education' },
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
          <span className="font-medium text-gray-900">Education</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">📚</span>
          <h1 className="text-3xl font-bold text-gray-900">Education</h1>
        </div>
        <p className="text-gray-600 mb-4">
          K-12 education, higher education, student loans, and early childhood policy in Congress
        </p>

        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            <strong>Education policy</strong> in Congress spans the full range of American learning,
            from{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              early childhood programs
            </Link>{' '}
            to{' '}
            <Link href="#policy-areas" className="text-blue-600 hover:underline">
              higher education
            </Link>{' '}
            and workforce training. While most K-12 education funding comes from state and local
            sources, federal programs like Title I and IDEA play a critical role in ensuring
            equitable access.
          </p>
          <p className="text-gray-700 mb-4">
            Federal student loan programs, Pell Grants, and research funding are among the largest
            areas of federal education spending. The{' '}
            <Link href="/committee/HSED" className="text-blue-600 hover:underline">
              House Education and Workforce Committee
            </Link>{' '}
            and the{' '}
            <Link href="/committee/SSHR" className="text-blue-600 hover:underline">
              Senate HELP Committee
            </Link>{' '}
            share primary jurisdiction over education legislation.
          </p>
        </section>

        {/* Key Committees Section */}
        <section id="committees" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Key Committees
          </h2>
          <p className="text-gray-700 mb-4">
            These committees have primary jurisdiction over education legislation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EDUCATION_COMMITTEES.map(committee => (
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
            Major education legislation in recent Congresses includes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>FAFSA Simplification Act (2020)</strong> - Streamlined financial aid
              application, expanded Pell Grant eligibility
            </li>
            <li>
              <strong>ESSER Funds via American Rescue Plan (2021)</strong> - $122 billion in
              emergency relief for K-12 schools during COVID-19
            </li>
            <li>
              <strong>Bipartisan Safer Communities Act (2022)</strong> - School safety funding,
              mental health resources for students
            </li>
            <li>
              <strong>PACT Act Education Provisions (2022)</strong> - Expanded education benefits
              for veterans and their dependents
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
        <PolicyAreaCrossDomain policyArea="Education" />

        {/* FAQ Section */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="Education"
          relatedLinks={[
            { href: '/topics/healthcare', label: 'Healthcare' },
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
