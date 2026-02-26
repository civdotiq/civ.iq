/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Open Data Page
 *
 * Discoverable reference for all data access protocols:
 * REST API, Atom feeds, Nostr publishing, and ActivityPub federation.
 */

import type { Metadata } from 'next';
import { nostrConfig } from '@/config/nostr.config';
import { activitypubConfig } from '@/config/activitypub.config';

export const metadata: Metadata = {
  title: 'Open Data | CIV.IQ',
  description:
    'CIV.IQ publishes civic data through open protocols: REST API, Atom feeds, Nostr, and ActivityPub. All data from official government sources, MIT licensed.',
};

const BASE = 'https://civ.iq/api/v1';
const FEED_BASE = 'https://civ.iq/api/feed';

const FEEDS: { path: string; shortPath?: string; description: string }[] = [
  {
    path: '/api/feed/bills/latest',
    shortPath: '/feeds/bills',
    description: 'Latest bills introduced in Congress',
  },
  {
    path: '/api/feed/member/{bioguideId}',
    description: 'Activity feed for a member of Congress',
  },
  {
    path: '/api/feed/bill/{billId}',
    description: 'Status updates for a specific bill',
  },
  {
    path: '/api/feed/committee/{committeeId}',
    description: 'Activity feed for a congressional committee',
  },
  {
    path: '/api/feed/district/{districtId}',
    description: 'Activity feed for a congressional district',
  },
  {
    path: '/api/feed/state/{state}/bills',
    description: 'State legislation feed',
  },
  {
    path: '/api/feed/state/{state}/legislator/{id}',
    description: 'State legislator activity feed',
  },
];

const NOSTR_EVENT_TYPES: { type: string; description: string }[] = [
  { type: 'bill-action', description: 'Bill status changes (passed, amended, signed)' },
  { type: 'bill-introduced', description: 'New bills introduced in Congress' },
  { type: 'vote-record', description: 'Roll-call vote results' },
  { type: 'executive-order', description: 'Presidential executive orders' },
  { type: 'comment-period', description: 'Federal regulation comment periods' },
  { type: 'hearing', description: 'Congressional committee hearings' },
  { type: 'state-bill-introduced', description: 'State legislation introduced' },
  { type: 'state-bill-action', description: 'State bill status changes' },
  { type: 'state-vote', description: 'State legislature votes' },
];

const DATA_SOURCES: { name: string; url: string; description: string }[] = [
  {
    name: 'Congress.gov API',
    url: 'https://api.congress.gov',
    description: 'Members, bills, votes, committees',
  },
  { name: 'House Clerk', url: 'https://clerk.house.gov', description: 'House floor votes' },
  {
    name: 'Senate.gov',
    url: 'https://www.senate.gov',
    description: 'Senate floor schedule, roll-call votes',
  },
  {
    name: 'GovInfo',
    url: 'https://api.govinfo.gov',
    description: 'Bill text, legislative documents',
  },
  {
    name: 'Federal Register',
    url: 'https://www.federalregister.gov/developers',
    description: 'Regulations, federal documents',
  },
  {
    name: 'FEC',
    url: 'https://api.open.fec.gov',
    description: 'Campaign finance, contributions, committees',
  },
  {
    name: 'USASpending.gov',
    url: 'https://api.usaspending.gov',
    description: 'Federal spending, contracts, grants',
  },
  { name: 'Senate LDA', url: 'https://lda.senate.gov/api', description: 'Lobbying disclosures' },
  {
    name: 'U.S. Census Bureau',
    url: 'https://www.census.gov/data/developers.html',
    description: 'Demographics, geocoding, district boundaries',
  },
  {
    name: 'Bureau of Labor Statistics',
    url: 'https://www.bls.gov/developers',
    description: 'Employment, economic indicators',
  },
  { name: 'CDC Open Data', url: 'https://data.cdc.gov', description: 'Public health statistics' },
  { name: 'Dept. of Education', url: 'https://api.ed.gov', description: 'School district data' },
  { name: 'FCC Open Data', url: 'https://opendata.fcc.gov', description: 'Broadband deployment' },
  { name: 'OpenStates', url: 'https://openstates.org', description: 'State legislature data' },
  {
    name: 'Wikipedia',
    url: 'https://en.wikipedia.org/w/api.php',
    description: 'Reference information',
  },
  { name: 'Wikidata', url: 'https://www.wikidata.org', description: 'Structured reference data' },
  {
    name: 'GDELT Project',
    url: 'https://www.gdeltproject.org',
    description: 'News events, trends',
  },
  { name: 'NewsAPI', url: 'https://newsapi.org', description: 'News aggregation' },
  { name: 'Radar.io', url: 'https://radar.com', description: 'Address search, geolocation' },
];

export default function OpenDataPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-grid-3 py-grid-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-grid-4">
          <a href="/" className="hover:text-civiq-blue">
            Home
          </a>{' '}
          / Open Data
        </nav>

        {/* Header */}
        <h1 className="text-4xl font-bold text-gray-900 mb-grid-2">Open Data</h1>
        <p className="text-lg text-gray-600 mb-grid-6">
          This platform publishes civic data through open protocols. No API key required.
        </p>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-grid-3 mb-grid-8">
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">10</div>
            <div className="text-sm text-gray-600 uppercase tracking-wider">REST Endpoints</div>
          </div>
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">7</div>
            <div className="text-sm text-gray-600 uppercase tracking-wider">Atom Feeds</div>
          </div>
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">{nostrConfig.relays.length}</div>
            <div className="text-sm text-gray-600 uppercase tracking-wider">Nostr Relays</div>
          </div>
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">AP</div>
            <div className="text-sm text-gray-600 uppercase tracking-wider">Fediverse</div>
          </div>
        </div>

        {/* REST API */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">REST API</h2>
          <p className="text-gray-600 mb-grid-2">
            Normalized U.S. government data via open REST endpoints. JSON responses, CORS enabled,
            rate limited to 60 requests per minute.
          </p>
          <div className="mb-grid-2">
            <span className="text-sm text-gray-500 uppercase tracking-wider">Base URL</span>
            <code className="block bg-gray-50 border-2 border-gray-200 p-grid-2 text-sm font-mono mt-1">
              {BASE}
            </code>
          </div>
          <p className="text-gray-600 text-sm">
            <a href="/openapi.json" className="text-civiq-blue underline hover:no-underline">
              OpenAPI 3.0 specification
            </a>{' '}
            &middot;{' '}
            <a href="/docs/api" className="text-civiq-blue underline hover:no-underline">
              Full API reference
            </a>
          </p>
        </section>

        {/* Atom Feeds */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Atom Feeds</h2>
          <p className="text-gray-600 mb-grid-3">
            Subscribe to civic updates in any RSS/Atom reader. All feeds return{' '}
            <code className="text-sm">application/atom+xml</code>.
          </p>

          <div className="border-2 border-gray-200 overflow-x-auto mb-grid-3">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Feed</th>
                  <th className="text-left p-grid-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {FEEDS.map(feed => (
                  <tr key={feed.path} className="border-b border-gray-100">
                    <td className="p-grid-2 font-mono text-sm whitespace-nowrap">
                      {feed.path}
                      {feed.shortPath && (
                        <span className="text-gray-400 block text-xs">{feed.shortPath}</span>
                      )}
                    </td>
                    <td className="p-grid-2 text-gray-600">{feed.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto">
            curl -H &quot;Accept: application/atom+xml&quot; {FEED_BASE}/bills/latest
          </pre>
        </section>

        {/* Nostr */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Nostr</h2>
          <p className="text-gray-600 mb-grid-3">
            Every significant civic event is cryptographically signed and published to Nostr relays
            as a permanent public record. Events use NIP-23 long-form content (kind{' '}
            {nostrConfig.eventKind}).
          </p>

          <div className="mb-grid-3">
            <span className="text-sm text-gray-500 uppercase tracking-wider">NIP-05 Address</span>
            <code className="block bg-gray-50 border-2 border-gray-200 p-grid-2 text-sm font-mono mt-1">
              civiq@civ.iq
            </code>
          </div>

          <div className="mb-grid-3">
            <span className="text-sm text-gray-500 uppercase tracking-wider">Relays</span>
            <div className="border-2 border-gray-200 mt-1">
              {nostrConfig.relays.map(relay => (
                <div
                  key={relay}
                  className="px-grid-2 py-1 text-sm font-mono border-b border-gray-100 last:border-b-0"
                >
                  {relay}
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm text-gray-500 uppercase tracking-wider">Event Types</span>
            <div className="border-2 border-gray-200 overflow-x-auto mt-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left p-grid-2 font-semibold">Type</th>
                    <th className="text-left p-grid-2 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {NOSTR_EVENT_TYPES.map(evt => (
                    <tr key={evt.type} className="border-b border-gray-100">
                      <td className="p-grid-2 font-mono text-sm">{evt.type}</td>
                      <td className="p-grid-2 text-gray-600">{evt.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Fediverse */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Fediverse</h2>
          <p className="text-gray-600 mb-grid-3">
            Follow CIV.IQ from Mastodon or any ActivityPub client. The same civic events published
            to Nostr are formatted as ActivityPub activities.
          </p>

          <div className="mb-grid-3">
            <span className="text-sm text-gray-500 uppercase tracking-wider">Handle</span>
            <code className="block bg-gray-50 border-2 border-gray-200 p-grid-2 text-sm font-mono mt-1">
              @{activitypubConfig.actor.username}@{activitypubConfig.domain}
            </code>
          </div>

          <p className="text-gray-600 text-sm">
            Search{' '}
            <code className="text-sm">
              @{activitypubConfig.actor.username}@{activitypubConfig.domain}
            </code>{' '}
            in your Mastodon instance to follow. &middot;{' '}
            <a
              href={activitypubConfig.actor.id}
              className="text-civiq-blue underline hover:no-underline"
            >
              Actor URL
            </a>
          </p>
        </section>

        {/* Standards */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Standards &amp; Discovery</h2>
          <p className="text-gray-600 mb-grid-3">
            Machine-readable endpoints for protocol discovery.
          </p>

          <div className="border-2 border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Standard</th>
                  <th className="text-left p-grid-2 font-semibold">URL</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2">OpenAPI 3.0</td>
                  <td className="p-grid-2 font-mono text-sm">
                    <a
                      href="/openapi.json"
                      className="text-civiq-blue underline hover:no-underline"
                    >
                      /openapi.json
                    </a>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2">WebFinger (RFC 7033)</td>
                  <td className="p-grid-2 font-mono text-sm">
                    <a
                      href="/.well-known/webfinger?resource=acct:civiq@civ.iq"
                      className="text-civiq-blue underline hover:no-underline"
                    >
                      /.well-known/webfinger
                    </a>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2">NIP-05 (Nostr)</td>
                  <td className="p-grid-2 font-mono text-sm">
                    <a
                      href="/.well-known/nostr.json?name=civiq"
                      className="text-civiq-blue underline hover:no-underline"
                    >
                      /.well-known/nostr.json
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="p-grid-2">Atom 1.0 (RFC 4287)</td>
                  <td className="p-grid-2 font-mono text-sm">
                    <a href="/feeds/bills" className="text-civiq-blue underline hover:no-underline">
                      /feeds/bills
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Data Sources */}
        <section className="mb-grid-6">
          <h2 className="text-2xl font-bold mb-grid-2">Data Sources</h2>
          <p className="text-gray-600 mb-grid-3">
            Making publicly accessible data easier to understand. Licensed under{' '}
            <a
              href="https://opensource.org/licenses/MIT"
              className="text-civiq-blue underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              MIT
            </a>
            .
          </p>

          <div className="border-2 border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Source</th>
                  <th className="text-left p-grid-2 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody>
                {DATA_SOURCES.map(src => (
                  <tr key={src.url} className="border-b border-gray-100">
                    <td className="p-grid-2">
                      <a
                        href={src.url}
                        className="text-civiq-blue underline hover:no-underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {src.name}
                      </a>
                    </td>
                    <td className="p-grid-2 text-gray-600">{src.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
