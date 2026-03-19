/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Developer Hub Page
 * Single entry point for all developer-facing resources.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema, WebAPISchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Developers | CIV.IQ — Free Civic Data API, Widgets & Open Data',
  description:
    'Build with CIV.IQ: free REST API, embeddable widgets, Atom feeds, and bulk datasets for U.S. government data. No API key required. MIT licensed.',
  openGraph: {
    title: 'Developers | CIV.IQ — Free Civic Data API, Widgets & Open Data',
    description:
      'Build with CIV.IQ: free REST API, embeddable widgets, Atom feeds, and bulk datasets for U.S. government data. No API key required. MIT licensed.',
    type: 'website',
  },
  keywords: [
    'congress API',
    'civic data API',
    'government data API',
    'congressional district widget',
    'open government data',
  ],
};

interface DevCard {
  title: string;
  description: string;
  href: string;
  detail: string;
}

const DEV_CARDS: DevCard[] = [
  {
    title: 'Migrate from Google Civic',
    description: 'Google shut down the Representatives API. Switch to CIV.IQ — free, no key.',
    href: '/migrate/google-civic',
    detail: 'Drop-in replacement, code examples',
  },
  {
    title: 'Open Data',
    description: 'Bulk datasets, Atom feeds, and open protocols for civic data.',
    href: '/open',
    detail: 'Atom feeds, Nostr, ActivityPub, bulk datasets',
  },
  {
    title: 'REST API',
    description: 'Public JSON endpoints for representatives, bills, votes, and districts.',
    href: '/docs/api',
    detail: '180+ endpoints, no API key required',
  },
  {
    title: 'Embed Widgets',
    description: 'Drop-in iframes for live civic data on any website.',
    href: '/embed-docs',
    detail: 'District reps, bill trackers, district snapshots',
  },
];

export default function DevelopersPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Developers', url: 'https://civdotiq.org/developers' },
        ]}
      />
      <WebAPISchema
        name="CIV.IQ Public API"
        description="Open REST API for U.S. government data including representatives, bills, votes, committees, and districts. No API key required."
        url="https://civdotiq.org/api/v1"
        documentation="https://civdotiq.org/docs/api"
      />
      {/* DataCatalog schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'DataCatalog',
            name: 'CIV.IQ Open Data',
            description:
              'Open datasets of U.S. government data including congressional votes, bills, representatives, and campaign finance.',
            url: 'https://civdotiq.org/open',
            provider: {
              '@type': 'Organization',
              name: 'CIV.IQ',
              url: 'https://civdotiq.org',
            },
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
          <span className="font-medium text-gray-900">Developers</span>
        </nav>

        {/* Hero */}
        <header className="mb-12 border-b-2 border-black pb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Build with CIV.IQ</h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Free civic data for developers, journalists, and researchers. No API key. MIT licensed.
          </p>
        </header>

        {/* Resource Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {DEV_CARDS.map(card => (
            <Link
              key={card.href}
              href={card.href}
              className="border-2 border-black p-6 hover:bg-gray-50 transition-colors group"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#3ea2d4]">
                {card.title}
              </h2>
              <p className="text-sm text-gray-600 mb-3">{card.description}</p>
              <span className="text-xs text-gray-400 uppercase tracking-wider">{card.detail}</span>
            </Link>
          ))}
        </div>

        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Start</h2>
          <p className="text-sm text-gray-600 mb-4">
            Fetch all members of Congress with a single request:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm border-2 border-black mb-2">
            <code>curl https://civdotiq.org/api/v1/representatives</code>
          </pre>
          <p className="text-xs text-gray-500">
            Returns JSON. No authentication required. Cached for 1 hour.
          </p>
        </section>

        {/* RSS/Atom Feeds */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">RSS/Atom Feeds</h2>
          <p className="text-sm text-gray-600 mb-4">
            Subscribe to legislative updates in any feed reader.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <code className="bg-gray-100 px-2 py-1 text-xs">/api/feed/bills/latest</code>
              <span className="text-gray-600">Latest bills</span>
            </div>
            <div className="flex items-center gap-3">
              <code className="bg-gray-100 px-2 py-1 text-xs">/api/feed/votes/recent</code>
              <span className="text-gray-600">Recent roll call votes</span>
            </div>
            <div className="flex items-center gap-3">
              <code className="bg-gray-100 px-2 py-1 text-xs">
                /api/feed/member/&#123;bioguideId&#125;
              </code>
              <span className="text-gray-600">Per-member activity</span>
            </div>
          </div>
          <Link
            href="/open#feeds"
            className="inline-block mt-3 text-sm text-[#3ea2d4] hover:underline"
          >
            View all feeds →
          </Link>
        </section>

        {/* Nostr & Fediverse */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Nostr & Fediverse</h2>
          <p className="text-sm text-gray-600 mb-4">
            CIV.IQ publishes signed civic events to Nostr relays and supports ActivityPub for
            federation with the Fediverse.
          </p>
          <Link href="/open#nostr" className="inline-block text-sm text-[#3ea2d4] hover:underline">
            Protocol details →
          </Link>
        </section>

        {/* Attribution */}
        <section className="mb-12 border-t-2 border-black pt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Attribution</h2>
          <p className="text-sm text-gray-600 mb-4">
            Using CIV.IQ data? We appreciate a link back. Copy this HTML:
          </p>
          <pre className="bg-gray-100 p-4 overflow-x-auto text-sm border border-gray-200 mb-4">
            <code>{`<a href="https://civdotiq.org" rel="dofollow">Powered by CIV.IQ</a>`}</code>
          </pre>
          <p className="text-xs text-gray-500">
            All data is sourced from official government APIs. CIV.IQ is MIT licensed.
          </p>
        </section>

        {/* Who Uses CIV.IQ */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Who Uses CIV.IQ</h2>
          <p className="text-sm text-gray-500">
            Civic organizations, newsrooms, and open-source projects building on CIV.IQ data. Want
            to be listed here?{' '}
            <a
              href="https://github.com/civdotiq"
              className="text-[#3ea2d4] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Let us know on GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </>
  );
}
