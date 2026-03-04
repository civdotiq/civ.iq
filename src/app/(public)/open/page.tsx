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
import { DATASET_REGISTRY } from '@/lib/datasets';
import { DatasetSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Open Data | CIV.IQ',
  description:
    'CIV.IQ publishes civic data through open protocols: REST API, Atom feeds, Nostr, and ActivityPub. No API key required. MIT licensed.',
};

const BASE = 'https://civdotiq.org/api/v1';
const FEED_BASE = 'https://civdotiq.org/api/feed';

const FEEDS: { path: string; shortPath?: string; description: string }[] = [
  {
    path: '/api/feed/bills/latest',
    shortPath: '/feeds/bills',
    description: 'Latest bills introduced in Congress',
  },
  {
    path: '/api/feed/member/{bioguideId}',
    shortPath: '/feeds/representative/{bioguideId}',
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
    path: '/feeds/floor',
    description: 'House and Senate floor activity',
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

const ENDPOINTS: {
  method: string;
  path: string;
  description: string;
  params?: string;
  example?: string;
}[] = [
  {
    method: 'GET',
    path: '/representatives',
    description: 'List all current members of Congress',
    params: 'chamber, state, party, limit, offset',
    example: '/representatives?state=MI&chamber=house',
  },
  {
    method: 'GET',
    path: '/representatives/{bioguideId}',
    description: 'Detailed info for one member',
    example: '/representatives/P000197',
  },
  {
    method: 'GET',
    path: '/bills',
    description: 'Latest bills from Congress',
    params: 'sort, limit, offset',
    example: '/bills?limit=10&sort=updateDate+desc',
  },
  {
    method: 'GET',
    path: '/bills/{billId}',
    description: 'Bill detail from Congress.gov',
    example: '/bills/119-hr-1',
  },
  {
    method: 'GET',
    path: '/bills/{billId}/summary',
    description: 'Cached plain-language bill summary',
    example: '/bills/119-hr-1/summary',
  },
  {
    method: 'GET',
    path: '/votes/{voteId}',
    description: 'Roll-call vote details',
    example: '/votes/house-119-116',
  },
  {
    method: 'GET',
    path: '/districts/{districtId}',
    description: 'District info and representatives',
    example: '/districts/MI-12',
  },
  {
    method: 'GET',
    path: '/committees',
    description: 'List congressional committees',
    params: 'chamber, limit, offset',
  },
  {
    method: 'GET',
    path: '/committees/{committeeId}',
    description: 'Committee detail with members',
    example: '/committees/HSJU',
  },
  {
    method: 'GET',
    path: '/changelog',
    description: 'API version history',
  },
];

const FRESHNESS: { endpoint: string; cache: string; stale: string }[] = [
  { endpoint: 'Bills list', cache: '1 hour', stale: '2 hours' },
  { endpoint: 'Bill detail (active)', cache: '24 hours', stale: '1 hour' },
  { endpoint: 'Bill detail (historical)', cache: '1 year', stale: '24 hours' },
  { endpoint: 'Bill summary', cache: '1 hour', stale: '2 hours' },
  { endpoint: 'Representatives list', cache: '1 hour', stale: '24 hours' },
  { endpoint: 'Representative detail', cache: '1 hour', stale: '2 hours' },
  { endpoint: 'Vote detail', cache: '1 hour', stale: '2 hours' },
  { endpoint: 'District detail', cache: '24 hours', stale: '48 hours' },
  { endpoint: 'Committees list', cache: '24 hours', stale: '48 hours' },
  { endpoint: 'Committee detail', cache: '1 hour', stale: '2 hours' },
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
  { name: 'NewsAPI', url: 'https://newsapi.org', description: 'News aggregation' },
];

const DATASET_KEYWORDS: Record<string, string[]> = {
  'congress-members': [
    'congress',
    'representatives',
    'senators',
    '119th congress',
    'federal government',
  ],
  committees: [
    'congress',
    'committees',
    'committee membership',
    '119th congress',
    'congressional committees',
  ],
  'recent-bills': ['congress', 'legislation', 'bills', '119th congress', 'federal law'],
  'recent-votes': [
    'congress',
    'roll call votes',
    'voting records',
    '119th congress',
    'legislative votes',
  ],
  'vote-positions': ['congress', 'member votes', 'voting positions', '119th congress', 'roll call'],
  'campaign-finance': [
    'campaign finance',
    'FEC',
    'political contributions',
    'PAC',
    'election funding',
  ],
};

const DATASET_SAME_AS: Record<string, string> = {
  'congress-members': 'https://api.congress.gov/v3/member',
  committees: 'https://api.congress.gov/v3/committee',
  'recent-bills': 'https://api.congress.gov/v3/bill',
  'recent-votes': 'https://api.congress.gov/v3/summaries',
  'vote-positions': 'https://api.congress.gov/v3/member',
  'campaign-finance': 'https://api.open.fec.gov/v1/candidates',
};

export default function OpenDataPage() {
  const BASE_URL = 'https://civdotiq.org';

  return (
    <div className="min-h-screen bg-white">
      {/* Schema.org Breadcrumb */}
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: `${BASE_URL}` },
          { name: 'Open Data', url: `${BASE_URL}/open` },
        ]}
      />
      {/* Schema.org Dataset markup for each bulk dataset */}
      {DATASET_REGISTRY.map(dataset => (
        <DatasetSchema
          key={dataset.slug}
          name={`${dataset.name} - CIV.IQ`}
          description={dataset.description}
          url={`${BASE_URL}/open`}
          distributions={[
            {
              encodingFormat: 'text/csv',
              contentUrl: `${BASE_URL}/api/download/${dataset.slug}?format=csv`,
            },
            {
              encodingFormat: 'application/json',
              contentUrl: `${BASE_URL}/api/download/${dataset.slug}?format=json`,
            },
          ]}
          source={dataset.source}
          sourceUrl={dataset.sourceUrl}
          temporalCoverage="2025-01/2027-01"
          dateModified={new Date().toISOString()}
          keywords={DATASET_KEYWORDS[dataset.slug]}
          variableMeasured={dataset.columnLabels}
          includedInDataCatalog={{ name: 'CIV.IQ Bulk Datasets', url: `${BASE_URL}/api/download` }}
          sameAs={DATASET_SAME_AS[dataset.slug]}
          version="119th-congress"
        />
      ))}
      <div className="max-w-5xl mx-auto px-grid-3 py-grid-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <a href="/" className="hover:text-blue-600">
            Home
          </a>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">Open Data</span>
        </nav>

        {/* Header */}
        <h1 className="text-4xl font-bold text-gray-900 mb-grid-2">Open Data</h1>
        <p className="text-lg text-gray-600 mb-grid-3">
          This platform publishes civic data through open protocols. No API key required.
        </p>
        <p className="text-sm text-gray-600 max-w-3xl mb-grid-6">
          Every piece of data on CIV.IQ is available through open protocols. No account. No API key.
          No tracking. We pull from official government sources and publish to decentralized
          networks so these records exist independently of this website.
        </p>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-grid-3 mb-grid-8">
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">{DATASET_REGISTRY.length}</div>
            <div className="text-sm text-gray-600 uppercase tracking-wider">Bulk Datasets</div>
          </div>
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">10</div>
            <div className="text-sm text-gray-600 uppercase tracking-wider">REST Endpoints</div>
          </div>
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">8</div>
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

        {/* Bulk Datasets */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Bulk Datasets</h2>
          <p className="text-gray-600 mb-grid-3">
            Download complete datasets as CSV or JSON. Updated hourly from official government
            sources. No account required.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-grid-3 mb-grid-3">
            {DATASET_REGISTRY.map(dataset => (
              <div key={dataset.slug} className="border-2 border-gray-200 p-grid-3">
                <h3 className="font-bold text-base mb-1">{dataset.name}</h3>
                <p className="text-sm text-gray-600 mb-grid-2">{dataset.description}</p>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">
                    {dataset.approximateRows} rows
                  </span>
                  <span className="text-xs text-gray-500">{dataset.source}</span>
                </div>
                <div className="text-xs text-gray-400 mb-grid-2">{dataset.freshness}</div>
                <div className="flex gap-grid-2">
                  <a
                    href={`/api/download/${dataset.slug}?format=csv`}
                    className="flex-1 text-center text-sm font-medium border-2 border-black px-grid-2 py-1 hover:bg-black hover:text-white transition-colors"
                  >
                    CSV
                  </a>
                  <a
                    href={`/api/download/${dataset.slug}?format=json`}
                    className="flex-1 text-center text-sm font-medium border-2 border-black px-grid-2 py-1 hover:bg-black hover:text-white transition-colors"
                  >
                    JSON
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500">
            All datasets are public domain. CSV files include metadata comment headers. JSON files
            include a column data dictionary. Data refreshes every hour via ISR (campaign finance
            refreshes daily).
          </p>
        </section>

        {/* Quick Start */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Quick Start</h2>
          <p className="text-gray-600 mb-grid-3">
            No API key, no registration. Paste this into a terminal:
          </p>

          <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mb-grid-3">
            curl {BASE}/bills?limit=5
          </pre>

          <div className="mb-grid-3">
            <span className="text-sm text-gray-500 uppercase tracking-wider">
              Response envelope
            </span>
            <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mt-1">
              {JSON.stringify(
                {
                  data: '[ ... ]',
                  pagination: { total: '...', limit: 5, offset: 0, hasMore: '...' },
                  meta: {
                    apiVersion: 'v1',
                    timestamp: '...',
                    source: 'congress.gov',
                    license: 'MIT',
                    documentation: 'https://civdotiq.org/docs/api',
                  },
                },
                null,
                2
              )}
            </pre>
            <p className="text-xs text-gray-500 mt-grid-1">
              Every response includes <code>data</code>, optional <code>pagination</code>, and{' '}
              <code>meta</code> with source attribution. Try the URL above to see live data.
            </p>
          </div>

          <div className="border-2 border-gray-200 overflow-x-auto mb-grid-3">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Detail</th>
                  <th className="text-left p-grid-2 font-semibold">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2">Authentication</td>
                  <td className="p-grid-2 text-gray-600">None required</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2">Rate limit</td>
                  <td className="p-grid-2 text-gray-600">
                    60 requests/min per IP. Headers:{' '}
                    <code className="text-xs">X-RateLimit-Remaining</code>,{' '}
                    <code className="text-xs">X-RateLimit-Reset</code>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2">Response format</td>
                  <td className="p-grid-2 text-gray-600">
                    JSON with <code className="text-xs">data</code>,{' '}
                    <code className="text-xs">pagination</code>,{' '}
                    <code className="text-xs">meta</code> envelope
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2">CORS</td>
                  <td className="p-grid-2 text-gray-600">
                    <code className="text-xs">Access-Control-Allow-Origin: *</code> on all endpoints
                  </td>
                </tr>
                <tr>
                  <td className="p-grid-2">Freshness</td>
                  <td className="p-grid-2 text-gray-600">
                    Legislative data cached 1&ndash;24 hours depending on endpoint. Historical data
                    cached longer. Cache headers included in every response.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 text-sm">
            JavaScript:{' '}
            <code className="text-xs bg-gray-50 px-1 py-0.5">
              fetch(&apos;https://civdotiq.org/api/v1/bills?limit=5&apos;).then(r =&gt; r.json())
            </code>
          </p>
        </section>

        {/* REST API */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">REST API</h2>
          <p className="text-gray-600 mb-grid-3">
            10 endpoints covering representatives, bills, votes, districts, and committees.
          </p>
          <div className="mb-grid-3">
            <span className="text-sm text-gray-500 uppercase tracking-wider">Base URL</span>
            <code className="block bg-gray-50 border-2 border-gray-200 p-grid-2 text-sm font-mono mt-1">
              {BASE}
            </code>
          </div>

          <div className="border-2 border-gray-200 overflow-x-auto mb-grid-3">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Method</th>
                  <th className="text-left p-grid-2 font-semibold">Path</th>
                  <th className="text-left p-grid-2 font-semibold">Description</th>
                  <th className="text-left p-grid-2 font-semibold">Parameters</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map(ep => (
                  <tr key={ep.path} className="border-b border-gray-100">
                    <td className="p-grid-2 font-mono text-xs">{ep.method}</td>
                    <td className="p-grid-2 font-mono text-xs whitespace-nowrap">
                      {ep.example ? (
                        <a
                          href={`${BASE}${ep.example}`}
                          className="text-civiq-blue underline hover:no-underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {ep.path}
                        </a>
                      ) : (
                        ep.path
                      )}
                    </td>
                    <td className="p-grid-2 text-gray-600">{ep.description}</td>
                    <td className="p-grid-2 text-gray-500 text-xs font-mono">
                      {ep.params || '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 text-sm">
            <a href="/openapi.json" className="text-civiq-blue underline hover:no-underline">
              OpenAPI 3.0 specification
            </a>{' '}
            &middot;{' '}
            <a href="/docs/api" className="text-civiq-blue underline hover:no-underline">
              Full API reference
            </a>{' '}
            &middot;{' '}
            <a href={`${BASE}`} className="text-civiq-blue underline hover:no-underline">
              Self-describing index
            </a>
          </p>
        </section>

        {/* Pagination */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Pagination</h2>
          <p className="text-gray-600 mb-grid-3">
            List endpoints use offset-based pagination. The response{' '}
            <code className="text-sm">pagination</code> object tells you where you are.
          </p>

          <div className="border-2 border-gray-200 overflow-x-auto mb-grid-3">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Parameter</th>
                  <th className="text-left p-grid-2 font-semibold">Type</th>
                  <th className="text-left p-grid-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-mono text-xs">limit</td>
                  <td className="p-grid-2 text-gray-600">integer</td>
                  <td className="p-grid-2 text-gray-600">
                    Results per page. Default varies by endpoint (50&ndash;100). Max 250&ndash;535.
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-mono text-xs">offset</td>
                  <td className="p-grid-2 text-gray-600">integer</td>
                  <td className="p-grid-2 text-gray-600">Number of results to skip. Default 0.</td>
                </tr>
                <tr>
                  <td className="p-grid-2 font-mono text-xs">hasMore</td>
                  <td className="p-grid-2 text-gray-600">boolean</td>
                  <td className="p-grid-2 text-gray-600">
                    Returned in response. <code className="text-xs">true</code> when{' '}
                    <code className="text-xs">offset + limit &lt; total</code>.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <span className="text-sm text-gray-500 uppercase tracking-wider">
            Paginate through all results
          </span>
          <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mt-1">{`# Fetch page by page until hasMore is false
offset=0
while true; do
  resp=$(curl -s "${BASE}/bills?limit=50&offset=$offset")
  echo "$resp" | jq '.data | length'
  has_more=$(echo "$resp" | jq '.pagination.hasMore')
  [ "$has_more" = "false" ] && break
  offset=$((offset + 50))
done`}</pre>
        </section>

        {/* Error Responses */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Error Responses</h2>
          <p className="text-gray-600 mb-grid-3">
            Errors use the same envelope with an <code className="text-sm">error</code> object
            instead of <code className="text-sm">data</code>.
          </p>

          <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mb-grid-3">
            {JSON.stringify(
              {
                error: {
                  code: 404,
                  message: 'Bill not found',
                  details: 'No bill matching ID "119-hr-99999"',
                },
                meta: {
                  apiVersion: 'v1',
                  timestamp: '...',
                  source: 'error',
                  license: 'MIT',
                  documentation: 'https://civdotiq.org/docs/api',
                },
              },
              null,
              2
            )}
          </pre>

          <div className="border-2 border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Code</th>
                  <th className="text-left p-grid-2 font-semibold">Meaning</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-mono">400</td>
                  <td className="p-grid-2 text-gray-600">Invalid request parameters</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-mono">404</td>
                  <td className="p-grid-2 text-gray-600">Resource not found</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-mono">429</td>
                  <td className="p-grid-2 text-gray-600">
                    Rate limited. Check <code className="text-xs">X-RateLimit-Reset</code> header.
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-mono">500</td>
                  <td className="p-grid-2 text-gray-600">Internal error</td>
                </tr>
                <tr>
                  <td className="p-grid-2 font-mono">503</td>
                  <td className="p-grid-2 text-gray-600">
                    Upstream data source temporarily unavailable
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Code Examples */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Code Examples</h2>

          <div className="mb-grid-4">
            <span className="text-sm text-gray-500 uppercase tracking-wider">
              Python &mdash; fetch all senators from a state
            </span>
            <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mt-1">{`import requests

resp = requests.get("${BASE}/representatives", params={
    "chamber": "senate",
    "state": "MI"
})
data = resp.json()

for member in data["data"]:
    print(f'{member["name"]} ({member["party"]})')

print(f'Source: {data["meta"]["source"]}')`}</pre>
          </div>

          <div className="mb-grid-4">
            <span className="text-sm text-gray-500 uppercase tracking-wider">
              JavaScript &mdash; paginate all bills
            </span>
            <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mt-1">{`async function fetchAllBills() {
  const bills = [];
  let offset = 0;

  while (true) {
    const url = \`${BASE}/bills?limit=250&offset=\${offset}\`;
    const { data, pagination } = await fetch(url).then(r => r.json());
    bills.push(...data);
    if (!pagination.hasMore) break;
    offset += 250;
  }

  return bills;
}`}</pre>
          </div>

          <div className="mb-grid-4">
            <span className="text-sm text-gray-500 uppercase tracking-wider">
              Python &mdash; subscribe to an Atom feed
            </span>
            <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mt-1">{`import feedparser

feed = feedparser.parse("${FEED_BASE}/member/P000197")

for entry in feed.entries:
    print(f'{entry.updated}: {entry.title}')
    print(f'  {entry.link}')`}</pre>
          </div>

          <div>
            <span className="text-sm text-gray-500 uppercase tracking-wider">
              curl &mdash; compare two representatives
            </span>
            <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mt-1">{`# Fetch two members in parallel
curl -s "${BASE}/representatives/P000197" > rep1.json &
curl -s "${BASE}/representatives/S000148" > rep2.json &
wait

# Compare with jq
jq -s '.[0].data.name, .[1].data.name' rep1.json rep2.json`}</pre>
          </div>
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
            {nostrConfig.eventKind}) with Markdown content readable in any long-form client. A
            NIP-65 relay list (kind 10002) is published so clients auto-discover which relays carry
            CIV.IQ data. State coverage spans {nostrConfig.enabledStates.length} states.
          </p>

          <div className="mb-grid-3">
            <span className="text-sm text-gray-500 uppercase tracking-wider">NIP-05 Address</span>
            <code className="block bg-gray-50 border-2 border-gray-200 p-grid-2 text-sm font-mono mt-1">
              civiq@civdotiq.org
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

          <div className="mb-grid-4">
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

          <div className="mb-grid-3">
            <span className="text-sm text-gray-500 uppercase tracking-wider">Event structure</span>
            <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mt-1">
              {JSON.stringify(
                {
                  kind: nostrConfig.eventKind,
                  content:
                    '# HR 1 passed in House\n\nThe bill passed...\n\n**Type**: bill-action | **Source**: [congress.gov](...)\n\n---\n\n<details><summary>Structured Data</summary>\n\n```json\n{ ... }\n```\n\n</details>',
                  tags: [
                    ['d', 'civiq:bill-action:hr1-119-action-2025-01-15'],
                    ['title', 'HR 1 passed in House'],
                    ['summary', 'The bill passed...'],
                    ['published_at', '1705276800'],
                    ['t', 'bill-action'],
                    ['t', 'legislation'],
                    ['r', 'https://www.congress.gov/bill/119th-congress/house-bill/1'],
                  ],
                  pubkey: '<civiq public key>',
                  sig: '<schnorr signature>',
                },
                null,
                2
              )}
            </pre>
            <p className="text-xs text-gray-500 mt-grid-1">
              Content is Markdown, readable in any NIP-23 client (Habla, Yakihonne, Highlighter).
              Structured data is preserved in a collapsible <code>&lt;details&gt;</code> block.
              Filter by <code>t</code> tag to subscribe to specific event types. The <code>d</code>{' '}
              tag is the unique event identifier.
            </p>
          </div>

          <div>
            <span className="text-sm text-gray-500 uppercase tracking-wider">
              Subscribe with nostr-tools
            </span>
            <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mt-1">{`import { SimplePool } from 'nostr-tools/pool';

const pool = new SimplePool();
const relays = ${JSON.stringify(nostrConfig.relays.slice(0, 3), null, 2).replace(/\n/g, '\n')};

// Subscribe to all CIV.IQ civic events
const sub = pool.subscribeMany(relays, [{
  kinds: [${nostrConfig.eventKind}],
  '#L': ['civic-event'],
  // Optional: filter by type
  // '#t': ['bill-action', 'vote-record'],
}], {
  onevent(event) {
    const title = event.tags.find(t => t[0] === 'title')?.[1];
    const type = event.tags.find(t => t[0] === 't')?.[1];
    console.log(\`[\${type}] \${title}\`);
    console.log(event.content.slice(0, 200));
  }
});`}</pre>
          </div>
        </section>

        {/* Fediverse */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Fediverse</h2>
          <p className="text-gray-600 mb-grid-3">
            Follow CIV.IQ from Mastodon or any ActivityPub client. The same civic events published
            to Nostr are delivered to every follower&apos;s inbox as signed ActivityPub activities.
          </p>

          <div className="mb-grid-3">
            <span className="text-sm text-gray-500 uppercase tracking-wider">Handle</span>
            <code className="block bg-gray-50 border-2 border-gray-200 p-grid-2 text-sm font-mono mt-1">
              @{activitypubConfig.actor.username}@{activitypubConfig.domain}
            </code>
          </div>

          <div className="mb-grid-4">
            <span className="text-sm text-gray-500 uppercase tracking-wider">
              Federation Endpoints
            </span>
            <div className="border-2 border-gray-200 overflow-x-auto mt-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left p-grid-2 font-semibold">Endpoint</th>
                    <th className="text-left p-grid-2 font-semibold">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="p-grid-2 font-mono text-xs">
                      <a
                        href={activitypubConfig.actor.id}
                        className="text-civiq-blue underline hover:no-underline"
                      >
                        /api/activitypub/actor
                      </a>
                    </td>
                    <td className="p-grid-2 text-gray-600">
                      JSON-LD actor document (Service type)
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="p-grid-2 font-mono text-xs">/api/activitypub/inbox</td>
                    <td className="p-grid-2 text-gray-600">
                      Receives Follow/Undo activities from remote instances
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="p-grid-2 font-mono text-xs">
                      <a
                        href={activitypubConfig.actor.outbox}
                        className="text-civiq-blue underline hover:no-underline"
                      >
                        /api/activitypub/outbox
                      </a>
                    </td>
                    <td className="p-grid-2 text-gray-600">
                      Paginated OrderedCollection of published activities
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="p-grid-2 font-mono text-xs">
                      <a
                        href={activitypubConfig.actor.followers}
                        className="text-civiq-blue underline hover:no-underline"
                      >
                        /api/activitypub/followers
                      </a>
                    </td>
                    <td className="p-grid-2 text-gray-600">
                      Paginated OrderedCollection of follower actors
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="p-grid-2 font-mono text-xs">
                      <a
                        href={activitypubConfig.actor.following}
                        className="text-civiq-blue underline hover:no-underline"
                      >
                        /api/activitypub/following
                      </a>
                    </td>
                    <td className="p-grid-2 text-gray-600">
                      Empty collection (CIV.IQ is publish-only)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-grid-2 font-mono text-xs">
                      <a
                        href="/.well-known/nodeinfo"
                        className="text-civiq-blue underline hover:no-underline"
                      >
                        /.well-known/nodeinfo
                      </a>
                    </td>
                    <td className="p-grid-2 text-gray-600">
                      NodeInfo 2.0 for fediverse directory discovery
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-gray-600 text-sm">
            Search{' '}
            <code className="text-sm">
              @{activitypubConfig.actor.username}@{activitypubConfig.domain}
            </code>{' '}
            in your Mastodon instance to follow. New civic events are delivered directly to follower
            inboxes via HTTP Signature-authenticated POST. Activities support Create and Update
            types.
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
                      href="/.well-known/webfinger?resource=acct:civiq@civdotiq.org"
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
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2">NodeInfo 2.0</td>
                  <td className="p-grid-2 font-mono text-sm">
                    <a
                      href="/.well-known/nodeinfo"
                      className="text-civiq-blue underline hover:no-underline"
                    >
                      /.well-known/nodeinfo
                    </a>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2">NIP-65 Relay List</td>
                  <td className="p-grid-2 font-mono text-sm text-gray-600">
                    Kind 10002 event (published to relays)
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

        {/* Data Freshness */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Data Freshness</h2>
          <p className="text-gray-600 mb-grid-3">
            Cache durations per endpoint. Every response includes{' '}
            <code className="text-sm">Cache-Control</code> headers so your HTTP client can cache
            automatically. <code className="text-sm">s-maxage</code> is the CDN cache time;{' '}
            <code className="text-sm">stale-while-revalidate</code> allows serving stale data while
            refreshing in the background.
          </p>

          <div className="border-2 border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Endpoint</th>
                  <th className="text-left p-grid-2 font-semibold">Cache (s-maxage)</th>
                  <th className="text-left p-grid-2 font-semibold">Stale-while-revalidate</th>
                </tr>
              </thead>
              <tbody>
                {FRESHNESS.map(row => (
                  <tr key={row.endpoint} className="border-b border-gray-100">
                    <td className="p-grid-2">{row.endpoint}</td>
                    <td className="p-grid-2 text-gray-600 font-mono text-xs">{row.cache}</td>
                    <td className="p-grid-2 text-gray-600 font-mono text-xs">{row.stale}</td>
                  </tr>
                ))}
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
