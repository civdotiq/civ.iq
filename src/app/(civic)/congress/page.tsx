/**
 * Congress Hub Page - Wikipedia-style category page
 *
 * This page creates topical authority by linking to all Congress-related content.
 * Key SEO strategy: Massive internal linking network like Wikipedia.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { TableOfContents, FAQSection } from '@/components/seo';
import { ExploreFooter } from '@/components/seo/ExploreFooter';
import { OrganizationSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'United States Congress | Senators, Representatives & Committees',
  description:
    'Complete guide to the 119th United States Congress. Find all 100 Senators, 435 Representatives, and congressional committees. Track legislation, votes, and more.',
  keywords: [
    'US Congress',
    'Senate',
    'House of Representatives',
    'Senators',
    'Representatives',
    'Congressional committees',
    '119th Congress',
  ],
  openGraph: {
    title: 'United States Congress | CIV.IQ',
    description:
      'Complete guide to the 119th United States Congress. Find all Senators, Representatives, and committees.',
    type: 'website',
  },
};

// All 50 states for linking
const STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

// Table of contents items
const tocItems = [
  { id: 'overview', title: 'Overview', level: 1 as const },
  { id: 'senate', title: 'United States Senate', level: 1 as const },
  { id: 'house', title: 'House of Representatives', level: 1 as const },
  { id: 'committees', title: 'Congressional Committees', level: 1 as const },
  { id: 'by-state', title: 'Congress Members by State', level: 1 as const },
  { id: 'faq', title: 'Frequently Asked Questions', level: 1 as const },
];

// FAQ items for rich snippets
const faqItems = [
  {
    question: 'How many members are in Congress?',
    answer:
      'The United States Congress has 535 voting members: 100 Senators (2 per state) and 435 Representatives (apportioned by population). Additionally, there are 6 non-voting delegates representing U.S. territories and Washington D.C.',
  },
  {
    question: 'How long is a term for Senators and Representatives?',
    answer:
      'Senators serve 6-year terms, with approximately one-third of the Senate up for election every 2 years. Representatives serve 2-year terms, with all 435 seats up for election every 2 years.',
  },
  {
    question: 'What is the current Congress?',
    answer:
      'The current Congress is the 119th Congress, which began on January 3, 2025 and will end on January 3, 2027.',
  },
  {
    question: 'How do I find my representatives?',
    answer:
      'You can find your representatives by entering your ZIP code on the CIV.IQ homepage. Each U.S. citizen is represented by 2 Senators (representing the entire state) and 1 Representative (representing their congressional district).',
  },
];

export default function CongressHubPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Schema */}
      <OrganizationSchema
        name="United States Congress"
        url="https://congress.gov"
        description="The legislative branch of the United States federal government, composed of the Senate and House of Representatives."
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">›</span>
          <span>Congress</span>
        </nav>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">United States Congress</h1>
        <p className="text-gray-600 mb-6">
          The legislative branch of the United States federal government
        </p>

        {/* Table of Contents */}
        <TableOfContents items={tocItems} />

        {/* Overview Section */}
        <section id="overview" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Overview
          </h2>
          <p className="text-gray-700 mb-4">
            The <strong>United States Congress</strong> is the bicameral legislature of the federal
            government, consisting of the{' '}
            <Link href="#senate" className="text-blue-600 hover:underline">
              Senate
            </Link>{' '}
            and the{' '}
            <Link href="#house" className="text-blue-600 hover:underline">
              House of Representatives
            </Link>
            . Congress meets in the United States Capitol in Washington, D.C.
          </p>
          <p className="text-gray-700 mb-4">
            The current <strong>119th Congress</strong> began on January 3, 2025. Congress has 535
            voting members: 100 senators and 435 representatives, plus 6 non-voting delegates from
            U.S. territories.
          </p>

          {/* Quick Stats Box */}
          <div className="bg-white border-2 border-gray-200 p-4 my-6">
            <h3 className="font-bold text-gray-800 mb-3">119th Congress at a Glance</h3>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Senators</dt>
                <dd className="text-2xl font-bold text-gray-900">100</dd>
              </div>
              <div>
                <dt className="text-gray-500">Representatives</dt>
                <dd className="text-2xl font-bold text-gray-900">435</dd>
              </div>
              <div>
                <dt className="text-gray-500">Committees</dt>
                <dd className="text-2xl font-bold text-gray-900">45+</dd>
              </div>
              <div>
                <dt className="text-gray-500">Session</dt>
                <dd className="text-2xl font-bold text-gray-900">2025-27</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Senate Section */}
        <section id="senate" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            United States Senate
          </h2>
          <p className="text-gray-700 mb-4">
            The Senate is the upper chamber of Congress, with 100 members—two senators from each
            state. Senators serve six-year terms. The Senate has exclusive powers including
            confirming presidential appointments and ratifying treaties.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Find your Senators:</strong> Select your state below to view your two U.S.
              Senators and their voting records, committee assignments, and sponsored legislation.
            </p>
          </div>
          <Link
            href="/committees"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            View Senate Committees →
          </Link>
        </section>

        {/* House Section */}
        <section id="house" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            House of Representatives
          </h2>
          <p className="text-gray-700 mb-4">
            The House of Representatives is the lower chamber of Congress, with 435 voting members
            apportioned among the states by population. Representatives serve two-year terms. The
            House has exclusive powers including initiating revenue bills and impeaching federal
            officials.
          </p>
          <Link
            href="/committees"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            View House Committees →
          </Link>
        </section>

        {/* Committees Section */}
        <section id="committees" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Congressional Committees
          </h2>
          <p className="text-gray-700 mb-4">
            Congressional committees are subdivisions of Congress that handle specific policy areas.
            They review legislation, conduct oversight, and hold hearings. There are standing
            committees (permanent), select committees (temporary), and joint committees (with
            members from both chambers).
          </p>
          <Link
            href="/committees"
            className="inline-block bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
          >
            Browse All Committees →
          </Link>
        </section>

        {/* By State Section - THE INTERNAL LINKING GOLDMINE */}
        <section id="by-state" className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
            Congress Members by State
          </h2>
          <p className="text-gray-700 mb-4">
            Find all Senators and Representatives for each state. Click on a state to view the
            complete congressional delegation, including voting records, committee assignments, and
            contact information.
          </p>

          {/* State Grid - Creates 50 internal links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {STATES.map(state => (
              <Link
                key={state.code}
                href={`/delegation/${state.code}`}
                className="block p-3 bg-white border border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-center transition-colors"
              >
                <span className="font-medium text-gray-800">{state.code}</span>
                <span className="block text-xs text-gray-500">{state.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ Section with Schema */}
        <section id="faq">
          <FAQSection faqs={faqItems} />
        </section>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="U.S. Congress"
          relatedLinks={[
            { href: '/legislation', label: 'Legislation' },
            { href: '/committees', label: 'Committees' },
            { href: '/topics', label: 'Policy Topics' },
          ]}
          lastUpdated={new Date()}
          dataSource="Congress.gov"
        />
      </main>
    </div>
  );
}
