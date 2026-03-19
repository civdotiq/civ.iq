/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Google Civic Info API Migration Guide
 * SEO-optimized page targeting developers searching for replacements
 * after Google's Representatives API shutdown (March 2025).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Google Civic Info API Alternative — Free Migration Guide',
  description:
    'Migrate from the Google Civic Information API to CIV.IQ. Free, no API key, same data. Drop-in replacement for representativeInfoByAddress with code examples.',
  keywords: [
    'google civic info api alternative',
    'google civic api replacement',
    'google civic api shutdown',
    'google civic information api migration',
    'google civic api deprecated',
    'representativeInfoByAddress alternative',
    'free congress api',
    'representative lookup api',
    'civic data api',
    'congress api free',
  ],
  openGraph: {
    title: 'Google Civic Info API Alternative — Free Migration Guide',
    description:
      'Migrate from the Google Civic Information API to CIV.IQ. Free, no API key, same data.',
    type: 'article',
  },
  alternates: {
    canonical: 'https://civdotiq.org/migrate/google-civic',
  },
};

/* ── Endpoint mapping data ─────────────────────────────────── */

interface EndpointMapping {
  google: string;
  googleMethod: string;
  googleStatus: 'shutdown' | 'active';
  civiq: string;
  civiqMethod: string;
  notes: string;
}

const ENDPOINT_MAP: EndpointMapping[] = [
  {
    google: '/civicinfo/v2/representatives',
    googleMethod: 'GET',
    googleStatus: 'shutdown',
    civiq: '/api/intelligence/address/representatives',
    civiqMethod: 'POST',
    notes: 'Full address lookup — resolves exact congressional district via Census Geocoder',
  },
  {
    google: '/civicinfo/v2/representatives/{ocdId}',
    googleMethod: 'GET',
    googleStatus: 'shutdown',
    civiq: '/api/v1/representatives?state={ST}',
    civiqMethod: 'GET',
    notes:
      'Filter by state, chamber, party. Use /api/representatives/by-district for district-specific lookup.',
  },
  {
    google: '/civicinfo/v2/elections',
    googleMethod: 'GET',
    googleStatus: 'active',
    civiq: '/api/elections/2024',
    civiqMethod: 'GET',
    notes: 'Election results by type (house, senate, governor, president) and geography',
  },
  {
    google: '/civicinfo/v2/voterinfo',
    googleMethod: 'GET',
    googleStatus: 'active',
    civiq: '—',
    civiqMethod: '—',
    notes: 'Polling locations not yet available. Use vote.org or your state election board.',
  },
  {
    google: '/civicinfo/v2/divisions',
    googleMethod: 'GET',
    googleStatus: 'active',
    civiq: '/api/districts/all',
    civiqMethod: 'GET',
    notes: 'All 435 congressional districts with demographics, representatives, and Cook PVI',
  },
  {
    google: '/civicinfo/v2/divisionsByAddress',
    googleMethod: 'GET',
    googleStatus: 'active',
    civiq: '/api/geocode',
    civiqMethod: 'POST',
    notes: 'Address or coordinates to congressional district + state legislative districts',
  },
];

/* ── Code example data ─────────────────────────────────────── */

const GOOGLE_BEFORE = `// Google Civic Info API (SHUT DOWN March 2025)
const API_KEY = "YOUR_GOOGLE_API_KEY";
const address = "1600 Amphitheatre Parkway, Mountain View, CA";

const res = await fetch(
  \`https://www.googleapis.com/civicinfo/v2/representatives?\` +
  \`key=\${API_KEY}&address=\${encodeURIComponent(address)}\`
);
const data = await res.json();

// Navigate the offices→officials index structure
const officials = data.offices.flatMap(office =>
  office.officialIndices.map(i => ({
    office: office.name,
    level: office.levels?.[0],
    ...data.officials[i],
  }))
);`;

const CIVIQ_AFTER = `// CIV.IQ — Free, no API key
const res = await fetch(
  "https://civdotiq.org/api/intelligence/address/representatives",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      street: "1600 Amphitheatre Parkway",
      city: "Mountain View",
      state: "CA",
    }),
  }
);
const data = await res.json();

// Direct access — no index indirection
const reps = data.representatives;
// [{ bioguideId, name, party, state, district, chamber, ... }]`;

const CIVIQ_ALL_REPS = `// List all members of Congress
const res = await fetch(
  "https://civdotiq.org/api/v1/representatives?state=CA&chamber=house"
);
const { data } = await res.json();
// [{ bioguideId, name, party, district, phone, website, ... }]`;

const CIVIQ_PROFILE = `// Detailed legislator profile (committees, social media, bio)
const res = await fetch(
  "https://civdotiq.org/api/representative/P000197"
);
const rep = await res.json();
// { name, party, committees, socialMedia, contactInfo, terms, ... }`;

const CIVIQ_GEOCODE = `// Address to district (replaces divisionsByAddress)
const res = await fetch(
  "https://civdotiq.org/api/geocode",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "address",
      address: "100 Congress Ave, Austin, TX 78701",
    }),
  }
);
const { district, representatives } = await res.json();
// district: { state: "TX", district: "37", districtId: "TX-37" }`;

/* ── FAQ data ──────────────────────────────────────────────── */

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    q: 'Do I need an API key?',
    a: 'No. CIV.IQ is completely free with no authentication required. Rate limited to 60 requests/minute per IP.',
  },
  {
    q: 'Does CIV.IQ cover state legislators?',
    a: 'Yes. Use /api/state-legislators-by-address for state-level representatives, or /api/unified-geocode for federal + state in one call.',
  },
  {
    q: 'What about local officials (city council, school board)?',
    a: 'Not yet. Google Civic covered some local officials. CIV.IQ currently covers federal Congress (535 members), state legislators (7,383), and governors. Local official data is on the roadmap.',
  },
  {
    q: 'Is the data real-time?',
    a: 'Data is sourced from Congress.gov, OpenStates, and Census Bureau with caching from 1 hour (representatives) to 7 days (districts). New members appear within hours of Congress.gov updates.',
  },
  {
    q: 'Can I use this in production?',
    a: "Yes. CIV.IQ serves real government data with no usage restrictions. MIT licensed. We appreciate attribution but don't require it.",
  },
  {
    q: 'What if I need photos and social media links?',
    a: 'The /api/representative/{bioguideId} endpoint returns photo URLs, Twitter, Facebook, Instagram, YouTube, and Mastodon handles — more social platforms than Google Civic provided.',
  },
  {
    q: 'Does CIV.IQ have an MCP server for AI assistants?',
    a: 'Yes. Connect any MCP-compatible AI assistant to https://civdotiq.org/api/mcp — 16 tools for representative lookup, legislation, voting records, campaign finance, and more.',
  },
];

/* ── Component ─────────────────────────────────────────────── */

export default function GoogleCivicMigrationPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Developers', url: 'https://civdotiq.org/developers' },
          {
            name: 'Google Civic API Migration',
            url: 'https://civdotiq.org/migrate/google-civic',
          },
        ]}
      />

      {/* FAQ Schema for rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          }).replace(/</g, '\\u003c'),
        }}
      />

      {/* Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: 'Google Civic Info API Alternative — Free Migration Guide',
            description:
              'Step-by-step guide to migrate from the Google Civic Information API to CIV.IQ, a free civic data API with no API key required.',
            author: {
              '@type': 'Organization',
              name: 'CIV.IQ',
              url: 'https://civdotiq.org',
            },
            datePublished: '2025-03-19',
            dateModified: '2025-03-19',
            url: 'https://civdotiq.org/migrate/google-civic',
          }).replace(/</g, '\\u003c'),
        }}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-[#3ea2d4]">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <Link href="/developers" className="hover:text-[#3ea2d4]">
            Developers
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900">Google Civic API Migration</span>
        </nav>

        {/* Hero */}
        <header className="mb-12 border-b-2 border-black pb-8">
          <p className="text-sm font-bold text-[#e11d07] uppercase tracking-wider mb-2">
            Migration Guide
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Google Civic Info API Shut Down? Switch to CIV.IQ.
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Google turned off the Representatives API in March 2025. CIV.IQ is a free, open-source
            replacement with the same data, better coverage, and no API key.
          </p>
        </header>

        {/* What happened */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">What Happened</h2>
          <div className="border-l-4 border-[#e11d07] pl-4 mb-4">
            <p className="text-sm text-gray-700">
              On <strong>March 25, 2025</strong>, Google shut down the{' '}
              <code className="bg-gray-100 px-1 text-xs">representativeInfoByAddress</code> and{' '}
              <code className="bg-gray-100 px-1 text-xs">representativeInfoByDivision</code>{' '}
              endpoints from the Civic Information API. These were the most-used endpoints for civic
              apps — the core &ldquo;enter your address, see your representatives&rdquo; feature.
            </p>
          </div>
          <p className="text-sm text-gray-600">
            The Elections and Divisions endpoints remain active, but the representative lookup that
            powered thousands of civic apps is gone. Commercial alternatives like Cicero start at
            $100+/month. CIV.IQ is free.
          </p>
        </section>

        {/* Quick comparison */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">CIV.IQ vs Google Civic Info</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2 pr-4 font-bold">Feature</th>
                  <th className="text-left py-2 pr-4 font-bold">Google Civic</th>
                  <th className="text-left py-2 font-bold">CIV.IQ</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4">Address-to-reps lookup</td>
                  <td className="py-2 pr-4 line-through text-gray-400">Shut down</td>
                  <td className="py-2 font-medium text-[#0a9338]">Free, no key</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4">Federal legislators</td>
                  <td className="py-2 pr-4 line-through text-gray-400">Shut down</td>
                  <td className="py-2">535 members, updated hourly</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4">State legislators</td>
                  <td className="py-2 pr-4 line-through text-gray-400">Shut down</td>
                  <td className="py-2">7,383 via OpenStates</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4">Contact info</td>
                  <td className="py-2 pr-4">Phone, email, website</td>
                  <td className="py-2">Phone, email, website, office address</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4">Social media</td>
                  <td className="py-2 pr-4">Twitter, Facebook, YouTube</td>
                  <td className="py-2">Twitter, Facebook, YouTube, Instagram, Mastodon</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4">Photo URLs</td>
                  <td className="py-2 pr-4">Yes</td>
                  <td className="py-2">Yes</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4">Committees</td>
                  <td className="py-2 pr-4 text-gray-400">No</td>
                  <td className="py-2 font-medium text-[#0a9338]">Yes, with roles</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4">Voting records</td>
                  <td className="py-2 pr-4 text-gray-400">No</td>
                  <td className="py-2 font-medium text-[#0a9338]">Yes, roll call votes</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4">Campaign finance</td>
                  <td className="py-2 pr-4 text-gray-400">No</td>
                  <td className="py-2 font-medium text-[#0a9338]">Yes, FEC data</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4">District demographics</td>
                  <td className="py-2 pr-4 text-gray-400">No</td>
                  <td className="py-2 font-medium text-[#0a9338]">Yes, Census ACS</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4">API key required</td>
                  <td className="py-2 pr-4">Yes</td>
                  <td className="py-2 font-medium text-[#0a9338]">No</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-4">Rate limit</td>
                  <td className="py-2 pr-4">25,000/day</td>
                  <td className="py-2">60/min per IP</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Price</td>
                  <td className="py-2 pr-4">Free (was)</td>
                  <td className="py-2 font-medium text-[#0a9338]">Free</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Endpoint mapping */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Endpoint Mapping</h2>
          <p className="text-sm text-gray-600 mb-4">
            Direct mapping from Google Civic Info API endpoints to CIV.IQ equivalents.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2 pr-3 font-bold">Google Endpoint</th>
                  <th className="text-left py-2 pr-3 font-bold">Status</th>
                  <th className="text-left py-2 pr-3 font-bold">CIV.IQ Equivalent</th>
                  <th className="text-left py-2 font-bold">Notes</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {ENDPOINT_MAP.map(ep => (
                  <tr key={ep.google} className="border-b border-gray-200">
                    <td className="py-2 pr-3">
                      <code className="text-xs bg-gray-100 px-1">{ep.google}</code>
                    </td>
                    <td className="py-2 pr-3">
                      {ep.googleStatus === 'shutdown' ? (
                        <span className="text-xs font-bold text-[#e11d07] uppercase">
                          Shut down
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 uppercase">Active</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {ep.civiq === '—' ? (
                        <span className="text-gray-400">Not available</span>
                      ) : (
                        <code className="text-xs bg-gray-100 px-1">
                          {ep.civiqMethod} {ep.civiq}
                        </code>
                      )}
                    </td>
                    <td className="py-2 text-xs text-gray-500">{ep.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Code examples */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Code Examples</h2>

          {/* Before/After */}
          <h3 className="text-base font-bold text-gray-900 mb-3">
            Address Lookup: Before &amp; After
          </h3>

          <div className="mb-6">
            <p className="text-xs font-bold text-[#e11d07] uppercase tracking-wider mb-1">
              Before (Google — no longer works)
            </p>
            <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-xs border-2 border-black">
              <code>{GOOGLE_BEFORE}</code>
            </pre>
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold text-[#0a9338] uppercase tracking-wider mb-1">
              After (CIV.IQ — works now)
            </p>
            <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-xs border-2 border-black">
              <code>{CIVIQ_AFTER}</code>
            </pre>
          </div>

          {/* Additional examples */}
          <h3 className="text-base font-bold text-gray-900 mb-3">List Representatives by State</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-xs border-2 border-black mb-8">
            <code>{CIVIQ_ALL_REPS}</code>
          </pre>

          <h3 className="text-base font-bold text-gray-900 mb-3">Detailed Legislator Profile</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-xs border-2 border-black mb-8">
            <code>{CIVIQ_PROFILE}</code>
          </pre>

          <h3 className="text-base font-bold text-gray-900 mb-3">
            Address to District (replaces divisionsByAddress)
          </h3>
          <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-xs border-2 border-black mb-4">
            <code>{CIVIQ_GEOCODE}</code>
          </pre>
        </section>

        {/* Response comparison */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Response Format Comparison</h2>
          <p className="text-sm text-gray-600 mb-4">
            Google Civic used an indirect index-based structure where{' '}
            <code className="bg-gray-100 px-1 text-xs">offices[].officialIndices</code> pointed into
            a separate <code className="bg-gray-100 px-1 text-xs">officials[]</code> array. CIV.IQ
            returns flat, direct objects.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Google (indirect)
              </p>
              <pre className="bg-gray-100 p-3 overflow-x-auto text-xs border border-gray-200">
                <code>{`{
  "offices": [{
    "name": "U.S. Senator",
    "officialIndices": [0]
  }],
  "officials": [{
    "name": "John Cornyn",
    "party": "Republican",
    "phones": ["(202) 224-2934"]
  }]
}`}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                CIV.IQ (direct)
              </p>
              <pre className="bg-gray-100 p-3 overflow-x-auto text-xs border border-gray-200">
                <code>{`{
  "representatives": [{
    "bioguideId": "C001056",
    "name": "John Cornyn",
    "party": "Republican",
    "chamber": "Senate",
    "state": "TX",
    "phone": "(202) 224-2934",
    "website": "https://..."
  }]
}`}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* What you get extra */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            What You Get That Google Never Had
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'Voting Records',
                desc: 'Every roll call vote with position, result, and bill context.',
                href: '/docs/api',
              },
              {
                title: 'Campaign Finance',
                desc: 'FEC contribution data — who funds your representative.',
                href: '/docs/api',
              },
              {
                title: 'Committee Assignments',
                desc: 'Full committee and subcommittee memberships with roles.',
                href: '/docs/api',
              },
              {
                title: 'District Demographics',
                desc: 'Population, income, age, diversity, urbanization from Census ACS.',
                href: '/docs/api',
              },
              {
                title: 'Lobbying Data',
                desc: 'Senate LDA filings — who lobbies on what issues.',
                href: '/docs/api',
              },
              {
                title: 'AI/MCP Integration',
                desc: '16-tool MCP server for AI assistants. Connect Claude, GPT, or any MCP client.',
                href: '/developers',
              },
            ].map(card => (
              <Link
                key={card.title}
                href={card.href}
                className="border-2 border-black p-4 hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-sm font-bold text-gray-900 mb-1">{card.title}</h3>
                <p className="text-xs text-gray-600">{card.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">FAQ</h2>
          <div className="space-y-4">
            {FAQS.map(faq => (
              <div key={faq.q} className="border-b border-gray-200 pb-4">
                <h3 className="text-sm font-bold text-gray-900 mb-1">{faq.q}</h3>
                <p className="text-sm text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-12 border-2 border-black p-8 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Start Migrating</h2>
          <p className="text-sm text-gray-600 mb-6">
            No signup. No API key. No billing. Just swap the URL and start making requests.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/docs/api"
              className="inline-block border-2 border-black bg-black text-white px-6 py-2 text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              API Reference
            </Link>
            <Link
              href="/developers"
              className="inline-block border-2 border-black px-6 py-2 text-sm font-bold hover:bg-gray-100 transition-colors"
            >
              Developer Hub
            </Link>
            <a
              href="https://github.com/civdotiq/civic-intel-hub"
              className="inline-block border-2 border-black px-6 py-2 text-sm font-bold hover:bg-gray-100 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </section>

        {/* Attribution */}
        <footer className="text-xs text-gray-400 border-t border-gray-200 pt-4">
          <p>
            Data sourced from Congress.gov, FEC.gov, OpenStates, Census Bureau, and other official
            government APIs. CIV.IQ is an independent open-source project, not affiliated with
            Google.
          </p>
        </footer>
      </div>
    </>
  );
}
