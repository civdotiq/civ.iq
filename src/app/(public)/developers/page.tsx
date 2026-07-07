/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Developer Portal
 * Comprehensive hub for all developer-facing resources.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema, WebAPISchema, SoftwareSourceCodeSchema } from '@/components/seo/JsonLd';
import { DATASET_REGISTRY } from '@/lib/datasets';

export const metadata: Metadata = {
  title: 'Developers — Free Civic Data API, MCP Server, SDK & Bulk Data',
  description:
    'Build with CIV.IQ: free REST API (181 endpoints), MCP server for AI agents, TypeScript SDK, embeddable widgets, Atom feeds, and bulk datasets. No API key required. MIT licensed.',
  openGraph: {
    title: 'Developers — Free Civic Data API, MCP Server, SDK & Bulk Data',
    description:
      'Build with CIV.IQ: free REST API (181 endpoints), MCP server for AI agents, TypeScript SDK, embeddable widgets, Atom feeds, and bulk datasets. No API key required. MIT licensed.',
    type: 'website',
  },
  keywords: [
    'congress API',
    'civic data API',
    'government data API',
    'MCP server',
    'Model Context Protocol',
    'civic TypeScript SDK',
    'congressional district widget',
    'open government data',
    'bulk civic data',
    'campaign finance API',
    'FEC API',
    'OpenStates API',
    'civic data npm',
    'government data rate limits',
  ],
};

const INTEGRATION_CARDS = [
  {
    title: 'REST API',
    detail: '181 endpoints, no auth',
    description: 'Public JSON endpoints for representatives, bills, votes, and districts.',
    href: '/docs/api',
  },
  {
    title: 'MCP Server',
    detail: '47 tools, 9 domains',
    description: 'Connect AI agents to live civic data via the Model Context Protocol.',
    href: '#mcp',
  },
  {
    title: 'TypeScript SDK',
    detail: '9 resource classes',
    description: 'Typed client for all CIV.IQ endpoints. Node.js, Deno, and browser.',
    href: '#sdk',
  },
  {
    title: 'Embed Widgets',
    detail: '3 widget types',
    description: 'Drop-in iframes for live civic data on any website.',
    href: '/embed-docs',
  },
  {
    title: 'Atom Feeds',
    detail: '8 feed types',
    description: 'Subscribe to legislative updates in any RSS/Atom reader.',
    href: '#feeds',
  },
  {
    title: 'Bulk Data',
    detail: `${DATASET_REGISTRY.length} datasets, CSV/JSON`,
    description: 'Download complete datasets. No account required.',
    href: '#bulk-data',
  },
];

const MCP_DOMAINS = [
  { domain: 'Representatives', examples: 'get_representative_profile, search_representatives' },
  { domain: 'Legislation', examples: 'get_bill_details, search_bills, get_voting_history' },
  { domain: 'Finance', examples: 'get_campaign_finance, search_lobbying' },
  { domain: 'Intelligence', examples: 'analyze_vote_prediction, get_influence_chain' },
  { domain: 'Civic', examples: 'get_district_info, lookup_address_district' },
  { domain: 'Environment', examples: 'search_epa_facilities, get_district_environmental_profile' },
  { domain: 'Health', examples: 'search_healthcare_providers, get_district_healthcare_profile' },
  { domain: 'Safety', examples: 'search_fema_disasters, search_consumer_complaints' },
  { domain: 'Economy', examples: 'get_state_energy_profile, search_fdic_institutions' },
];

const MCP_RESOURCES = [
  { uri: 'civiq://legislators/{bioguideId}', description: 'Legislator profile' },
  { uri: 'civiq://bills/{congress}/{type}/{number}', description: 'Bill detail' },
  { uri: 'civiq://districts/{state}/{district}', description: 'District info' },
  { uri: 'civiq://districts/{state}/{district}/environment', description: 'District environment' },
  { uri: 'civiq://districts/{state}/{district}/health', description: 'District health' },
  { uri: 'civiq://districts/{state}/{district}/safety', description: 'District safety' },
  { uri: 'civiq://districts/{state}/{district}/economy', description: 'District economy' },
];

const MCP_PROMPTS = [
  {
    name: 'legislator_accountability',
    description: 'Accountability analysis combining finance, votes, and lobbying',
  },
  {
    name: 'bill_impact_analysis',
    description: 'Bill analysis with sponsor funding and industry alignment',
  },
  { name: 'policy_comparison', description: 'Compare legislators on votes, funding, and policy' },
  { name: 'district_deep_dive', description: 'Cross-domain district analysis (12 data sources)' },
  {
    name: 'industry_investigation',
    description: 'Industry sector across regulatory, lobbying, and political dimensions',
  },
  {
    name: 'environmental_justice',
    description: 'Environmental justice analysis for a congressional district',
  },
];

const FEEDS = [
  { path: '/api/feed/bills/latest', description: 'Latest bills introduced in Congress' },
  { path: '/api/feed/member/{bioguideId}', description: 'Per-member activity feed' },
  { path: '/api/feed/bill/{billId}', description: 'Status updates for a specific bill' },
  { path: '/api/feed/committee/{committeeId}', description: 'Committee activity feed' },
  { path: '/api/feed/district/{districtId}', description: 'District activity feed' },
  { path: '/feeds/floor', description: 'House and Senate floor activity' },
  { path: '/api/feed/state/{state}/bills', description: 'State legislation feed' },
  { path: '/api/feed/state/{state}/legislator/{id}', description: 'State legislator activity' },
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
      <SoftwareSourceCodeSchema
        name="CIV.IQ"
        description="Open-source civic intelligence platform providing access to federal and state government data through REST API, MCP server, TypeScript SDK, Atom feeds, and embeddable widgets."
        url="https://civdotiq.org/developers"
        codeRepository="https://github.com/civdotiq/civic-intel-hub"
        programmingLanguage={['TypeScript', 'React', 'Next.js']}
        runtimePlatform="Node.js"
      />
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

      <div className="max-w-5xl mx-auto px-grid-3 py-grid-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-[#3ea2d4]">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900">Developers</span>
        </nav>

        {/* Header */}
        <h1 className="text-4xl font-bold text-gray-900 mb-grid-2">Build with CIV.IQ</h1>
        <p className="text-lg text-gray-600 mb-grid-3">
          Free civic data for developers, journalists, researchers, and AI agents.
        </p>
        <p className="text-sm text-gray-600 max-w-3xl mb-grid-6">
          No API key. No account. No tracking. Every endpoint, dataset, and protocol on this page is
          free and open under the MIT license.
        </p>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-grid-3 mb-grid-8">
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">181</div>
            <div className="text-sm text-gray-600 uppercase tracking-wider">API Endpoints</div>
          </div>
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">47</div>
            <div className="text-sm text-gray-600 uppercase tracking-wider">MCP Tools</div>
          </div>
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">{DATASET_REGISTRY.length}</div>
            <div className="text-sm text-gray-600 uppercase tracking-wider">Bulk Datasets</div>
          </div>
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">MIT</div>
            <div className="text-sm text-gray-600 uppercase tracking-wider">License</div>
          </div>
        </div>

        {/* Quick Start */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Quick Start</h2>
          <p className="text-gray-600 mb-grid-3">
            No API key, no registration. Paste this into a terminal:
          </p>

          <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mb-grid-3">
            curl https://civdotiq.org/api/v1/representatives?state=MI&amp;chamber=house
          </pre>

          <div className="mb-grid-3">
            <span className="text-sm text-gray-500 uppercase tracking-wider">TypeScript SDK</span>
            <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mt-1">
              {`npm install @civiq/sdk

import { CivIQ } from '@civiq/sdk';
const civiq = new CivIQ();
const reps = await civiq.representatives.list({ state: 'MI', chamber: 'house' });`}
            </pre>
          </div>

          <div className="mb-grid-3">
            <span className="text-sm text-gray-500 uppercase tracking-wider">Example Response</span>
            <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mt-1">
              {`{
  "data": [
    {
      "bioguideId": "S000770",
      "name": "Debbie Stabenow",
      "party": "Democrat",
      "state": "MI",
      "district": null,
      "chamber": "Senate",
      "title": "Senator",
      "phone": "(202) 224-4822",
      "website": "https://stabenow.senate.gov",
      "yearsInOffice": 24,
      "nextElection": "2026"
    }
  ],
  "pagination": { "total": 13, "limit": 100, "offset": 0, "hasMore": false },
  "meta": {
    "apiVersion": "v1",
    "timestamp": "2026-03-25T14:32:15.894Z",
    "source": "congress-legislators",
    "license": "MIT",
    "documentation": "https://civdotiq.org/docs/api"
  }
}`}
            </pre>
          </div>

          <p className="text-xs text-gray-500">
            Returns JSON. No authentication required. Cached for 1 hour.
          </p>
        </section>

        {/* Rate Limits */}
        <section id="rate-limits" className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Rate Limits</h2>
          <p className="text-gray-600 mb-grid-3">
            All endpoints are rate-limited per IP using a sliding window. No API key required — but
            respect the limits so the service stays free for everyone.
          </p>

          <div className="border-2 border-gray-200 overflow-x-auto mb-grid-3">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Endpoint</th>
                  <th className="text-left p-grid-2 font-semibold">Limit</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-mono text-xs">/api/v1/*</td>
                  <td className="p-grid-2">60 requests / minute</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-mono text-xs">/api/feed/*</td>
                  <td className="p-grid-2">60 requests / minute</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-mono text-xs">/api/representatives</td>
                  <td className="p-grid-2">60 requests / minute</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-mono text-xs">/api/district-map</td>
                  <td className="p-grid-2">30 requests / minute</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-mono text-xs">/api/* (other)</td>
                  <td className="p-grid-2">100 requests / minute</td>
                </tr>
                <tr>
                  <td className="p-grid-2 font-mono text-xs">Default</td>
                  <td className="p-grid-2">200 requests / minute</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-600">
            Rate limit headers are included in every response:{' '}
            <code className="text-xs bg-gray-50 px-1">X-RateLimit-Limit</code>,{' '}
            <code className="text-xs bg-gray-50 px-1">X-RateLimit-Remaining</code>,{' '}
            <code className="text-xs bg-gray-50 px-1">X-RateLimit-Reset</code>. If you hit the
            limit, you&apos;ll receive a <code className="text-xs bg-gray-50 px-1">429</code>{' '}
            response. Need higher limits?{' '}
            <a
              href="https://github.com/civdotiq/civ.iq/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3ea2d4] underline hover:no-underline"
            >
              Open an issue
            </a>
            .
          </p>
        </section>

        {/* Integration Cards */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Integrations</h2>
          <p className="text-gray-600 mb-grid-3">
            Six ways to access civic data, from REST to AI-native protocols.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-grid-3">
            {INTEGRATION_CARDS.map(card => (
              <Link
                key={card.title}
                href={card.href}
                className="border-2 border-gray-200 p-grid-3 hover:border-black transition-colors group"
              >
                <h3 className="font-bold text-gray-900 group-hover:text-[#3ea2d4] mb-1">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-600 mb-grid-2">{card.description}</p>
                <span className="text-xs text-gray-400 uppercase tracking-wider">
                  {card.detail}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* MCP Server */}
        <section id="mcp" className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">MCP Server</h2>
          <p className="text-gray-600 mb-grid-3">
            Connect AI agents to live civic data via the{' '}
            <a
              href="https://modelcontextprotocol.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3ea2d4] underline hover:no-underline"
            >
              Model Context Protocol
            </a>
            . 47 tools across 9 domains, plus resources and prompt templates. For step-by-step
            instructions in Claude, ChatGPT, and Cursor, see the{' '}
            <Link href="/mcp" className="text-[#3ea2d4] underline hover:no-underline">
              setup guide
            </Link>
            .
          </p>

          <div className="mb-grid-3">
            <span className="text-sm text-gray-500 uppercase tracking-wider">
              Configuration (Claude Desktop / Cursor)
            </span>
            <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mt-1">
              {`{
  "mcpServers": {
    "civiq": {
      "url": "https://civdotiq.org/api/mcp"
    }
  }
}`}
            </pre>
          </div>

          <div className="mb-grid-3">
            <span className="text-sm text-gray-500 uppercase tracking-wider">Tool Domains</span>
            <div className="border-2 border-gray-200 overflow-x-auto mt-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left p-grid-2 font-semibold">Domain</th>
                    <th className="text-left p-grid-2 font-semibold">Example Tools</th>
                  </tr>
                </thead>
                <tbody>
                  {MCP_DOMAINS.map(row => (
                    <tr key={row.domain} className="border-b border-gray-100">
                      <td className="p-grid-2 font-medium">{row.domain}</td>
                      <td className="p-grid-2 text-gray-600 font-mono text-xs">{row.examples}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-grid-3">
            <div>
              <span className="text-sm text-gray-500 uppercase tracking-wider">Resources</span>
              <div className="border-2 border-gray-200 overflow-x-auto mt-1">
                <table className="w-full text-sm">
                  <tbody>
                    {MCP_RESOURCES.map(r => (
                      <tr key={r.uri} className="border-b border-gray-100">
                        <td className="p-grid-2 font-mono text-xs">{r.uri}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-500 uppercase tracking-wider">
                Prompt Templates
              </span>
              <div className="border-2 border-gray-200 overflow-x-auto mt-1">
                <table className="w-full text-sm">
                  <tbody>
                    {MCP_PROMPTS.map(p => (
                      <tr key={p.name} className="border-b border-gray-100">
                        <td className="p-grid-2">
                          <code className="font-mono text-xs">{p.name}</code>
                          <span className="block text-xs text-gray-500 mt-0.5">
                            {p.description}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* TypeScript SDK */}
        <section id="sdk" className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">TypeScript SDK</h2>
          <p className="text-gray-600 mb-grid-3">
            Typed client for all CIV.IQ endpoints. Works in Node.js, Deno, and the browser.
          </p>

          <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mb-grid-3">
            {`import { CivIQ } from '@civiq/sdk';
const civiq = new CivIQ();

const reps = await civiq.representatives.list({ state: 'MI' });
const bill = await civiq.legislation.getBill('hr1-119');
const prediction = await civiq.intelligence.votePrediction('B001230', 'hr1-119');`}
          </pre>

          <div className="flex flex-wrap gap-grid-1 mb-grid-3">
            {[
              'representatives',
              'legislation',
              'finance',
              'intelligence',
              'civic',
              'environment',
              'health',
              'safety',
              'economy',
            ].map(cls => (
              <code
                key={cls}
                className="bg-gray-50 border border-gray-200 px-grid-2 py-1 text-xs font-mono"
              >
                civiq.{cls}
              </code>
            ))}
          </div>

          <div className="flex gap-grid-3 text-sm">
            <a
              href="https://www.npmjs.com/package/@civiq/sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3ea2d4] underline hover:no-underline"
            >
              npm
            </a>
            <a
              href="https://github.com/civdotiq/civ.iq"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3ea2d4] underline hover:no-underline"
            >
              GitHub
            </a>
          </div>
        </section>

        {/* Atom Feeds */}
        <section id="feeds" className="mb-grid-8">
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
                    <td className="p-grid-2 font-mono text-xs whitespace-nowrap">{feed.path}</td>
                    <td className="p-grid-2 text-gray-600">{feed.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Link href="/open#feeds" className="text-sm text-[#3ea2d4] underline hover:no-underline">
            Full feed documentation on Open Data portal
          </Link>
        </section>

        {/* Bulk Data Downloads */}
        <section id="bulk-data" className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Bulk Data Downloads</h2>
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

          <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mb-grid-1">
            curl -O https://civdotiq.org/api/download/congress-members?format=csv
          </pre>
          <p className="text-xs text-gray-500">
            Catalog endpoint: <code className="text-xs">GET /api/download</code>
          </p>
        </section>

        {/* AI & Machine Readable */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">AI &amp; Machine Readable</h2>
          <p className="text-gray-600 mb-grid-3">
            Machine-readable specs and AI-optimized content for LLMs, agents, and crawlers.
          </p>
          <div className="border-2 border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-medium">MCP Server</td>
                  <td className="p-grid-2">
                    <Link
                      href="#mcp"
                      className="text-[#3ea2d4] underline hover:no-underline font-mono text-xs"
                    >
                      /api/mcp
                    </Link>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-medium">OpenAPI 3.0</td>
                  <td className="p-grid-2">
                    <a
                      href="/openapi.json"
                      className="text-[#3ea2d4] underline hover:no-underline font-mono text-xs"
                    >
                      /openapi.json
                    </a>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-medium">llms.txt</td>
                  <td className="p-grid-2">
                    <a
                      href="/llms.txt"
                      className="text-[#3ea2d4] underline hover:no-underline font-mono text-xs"
                    >
                      /llms.txt
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="p-grid-2 font-medium">llms-full.txt</td>
                  <td className="p-grid-2">
                    <a
                      href="/llms-full.txt"
                      className="text-[#3ea2d4] underline hover:no-underline font-mono text-xs"
                    >
                      /llms-full.txt
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Open Protocols */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Open Protocols</h2>
          <p className="text-gray-600 mb-grid-3">
            CIV.IQ publishes to decentralized networks so civic records exist independently of this
            website.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-grid-3">
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold mb-1">Nostr</h3>
              <p className="text-sm text-gray-600 mb-grid-2">
                NIP-05: civiq@civdotiq.org. Signed civic events published to relays.
              </p>
              <Link
                href="/open#nostr"
                className="text-sm text-[#3ea2d4] underline hover:no-underline"
              >
                Protocol details
              </Link>
            </div>
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold mb-1">ActivityPub</h3>
              <p className="text-sm text-gray-600 mb-grid-2">
                @civiq@civdotiq.org. Federation with the Fediverse.
              </p>
              <Link
                href="/open#activitypub"
                className="text-sm text-[#3ea2d4] underline hover:no-underline"
              >
                Protocol details
              </Link>
            </div>
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold mb-1">GitHub</h3>
              <p className="text-sm text-gray-600 mb-grid-2">Open source, MIT license.</p>
              <a
                href="https://github.com/civdotiq/civ.iq"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#3ea2d4] underline hover:no-underline"
              >
                Repository
              </a>
            </div>
          </div>
        </section>

        {/* npm Packages */}
        <section id="npm" className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">npm Packages</h2>
          <p className="text-gray-600 mb-grid-3">
            Standalone packages you can use in your own civic tech projects. All MIT licensed.
          </p>

          <div className="grid grid-cols-1 gap-grid-3">
            <div className="border-2 border-gray-200 p-grid-3">
              <div className="flex items-start justify-between mb-grid-2">
                <div>
                  <h3 className="font-mono font-bold text-base">@civiq/sdk</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Typed TypeScript client for all 181 CIV.IQ API endpoints. Covers
                    representatives, bills, votes, committees, districts, intelligence, search,
                    states, and the civic graph. Works in Node.js, Deno, and browsers.
                  </p>
                </div>
                <a
                  href="https://www.npmjs.com/package/@civiq/sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#3ea2d4] underline hover:no-underline whitespace-nowrap ml-grid-2"
                >
                  View on npm
                </a>
              </div>
              <pre className="bg-gray-50 border border-gray-200 p-grid-2 text-sm overflow-x-auto">
                npm install @civiq/sdk
              </pre>
            </div>

            <div className="border-2 border-gray-200 p-grid-3">
              <div className="flex items-start justify-between mb-grid-2">
                <div>
                  <h3 className="font-mono font-bold text-base">@civiq/civic-statistics</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Statistical utilities tuned for civic data — correlation analysis, peer
                    comparison, confidence scoring, anomaly detection, and significance testing with
                    civic-domain defaults and minimum sample sizes.
                  </p>
                </div>
                <a
                  href="https://www.npmjs.com/package/@civiq/civic-statistics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#3ea2d4] underline hover:no-underline whitespace-nowrap ml-grid-2"
                >
                  View on npm
                </a>
              </div>
              <pre className="bg-gray-50 border border-gray-200 p-grid-2 text-sm overflow-x-auto">
                npm install @civiq/civic-statistics
              </pre>
            </div>

            <div className="border-2 border-gray-200 p-grid-3">
              <div className="flex items-start justify-between mb-grid-2">
                <div>
                  <h3 className="font-mono font-bold text-base">@civiq/entity-resolution</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Entity resolution for civic data — committee and agency alias matching, industry
                    taxonomy classification, ticker-to-sector resolution, FEC contributor
                    deduplication, and lobbying issue-to-policy mapping.
                  </p>
                </div>
                <a
                  href="https://www.npmjs.com/package/@civiq/entity-resolution"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#3ea2d4] underline hover:no-underline whitespace-nowrap ml-grid-2"
                >
                  View on npm
                </a>
              </div>
              <pre className="bg-gray-50 border border-gray-200 p-grid-2 text-sm overflow-x-auto">
                npm install @civiq/entity-resolution
              </pre>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section id="data-sources" className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Data Sources</h2>
          <p className="text-gray-600 mb-grid-3">
            Every data point on CIV.IQ comes from an official government source. We never fabricate
            or estimate data. If a source is unavailable, we return empty results — not guesses.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-grid-3 mb-grid-3">
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-grid-2">
                Federal Legislative
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Congress.gov API v3 — bills, members, committees, votes, hearings</li>
                <li>Senate.gov XML — Senate roll call votes</li>
                <li>House Clerk XML — House roll call votes</li>
                <li>GovInfo.gov API — hearing transcripts, reports</li>
              </ul>
            </div>
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-grid-2">
                State Legislative
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>OpenStates GraphQL — all 50 states: legislators, bills, committees, votes</li>
                <li>Wikidata SPARQL — state executives, judiciary, biographies</li>
              </ul>
            </div>
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-grid-2">
                Money &amp; Influence
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>FEC.gov (OpenFEC) — campaign finance, contributions, expenditures</li>
                <li>Senate LDA API — lobbying disclosures, registrants, issues</li>
                <li>SEC EDGAR — financial disclosures, stock transactions</li>
                <li>USASpending.gov API v2 — federal contracts and grants by district</li>
              </ul>
            </div>
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-grid-2">
                Regulatory &amp; Policy
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Federal Register API — rules, proposed rules, notices, executive orders</li>
                <li>Regulations.gov — public comment periods</li>
                <li>CourtListener — federal court opinions</li>
              </ul>
            </div>
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-grid-2">
                Demographics &amp; Economy
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Census Bureau ACS — demographics, income, education by district</li>
                <li>Census Geocoder — address-to-district resolution</li>
                <li>BLS API — employment, wages, labor statistics</li>
                <li>FRED (Federal Reserve) — economic indicators</li>
                <li>EIA — state energy profiles</li>
                <li>FDIC — banking institution data</li>
                <li>Treasury — fiscal data</li>
              </ul>
            </div>
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-grid-2">
                Health, Safety &amp; Environment
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>EPA ECHO — environmental compliance, facilities</li>
                <li>FDA — drug recalls, food safety</li>
                <li>CMS — hospital data, Medicare spending</li>
                <li>NIH Reporter — research grants</li>
                <li>FEMA — disaster declarations</li>
                <li>CFPB — consumer complaints</li>
                <li>OSHA — workplace safety inspections</li>
                <li>NOAA — climate and weather data</li>
                <li>NHTSA — vehicle safety recalls</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Freshness */}
        <section id="freshness" className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Data Freshness</h2>
          <p className="text-gray-600 mb-grid-3">
            API responses are cached using Incremental Static Regeneration (ISR). The cache
            automatically refreshes at these intervals from the upstream government sources:
          </p>

          <div className="border-2 border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Update Frequency</th>
                  <th className="text-left p-grid-2 font-semibold">Data Types</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-medium">5 minutes</td>
                  <td className="p-grid-2 text-gray-600">News, trending bills, search results</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-medium">1 hour</td>
                  <td className="p-grid-2 text-gray-600">
                    Votes, bills, campaign finance, lobbying
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-medium">24 hours</td>
                  <td className="p-grid-2 text-gray-600">
                    Representatives, committees, districts, demographics
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-medium">30 days</td>
                  <td className="p-grid-2 text-gray-600">Geocoding results, address lookups</td>
                </tr>
                <tr>
                  <td className="p-grid-2 font-medium">6 months</td>
                  <td className="p-grid-2 text-gray-600">Historical voting records</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Coverage & Limitations */}
        <section id="coverage" className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Coverage &amp; Limitations</h2>
          <p className="text-gray-600 mb-grid-3">
            We believe in being transparent about what our data covers and where gaps exist.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-grid-3">
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold mb-grid-2">What&apos;s covered</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  <span className="font-medium">Congress:</span> 119th (current), plus historical
                  116th–118th sessions
                </li>
                <li>
                  <span className="font-medium">State legislatures:</span> All 50 states via
                  OpenStates
                </li>
                <li>
                  <span className="font-medium">Campaign finance:</span> Federal FEC data, current
                  and historical cycles
                </li>
                <li>
                  <span className="font-medium">Districts:</span> All 435 House districts + 6
                  at-large (AK, DE, ND, SD, VT, WY)
                </li>
                <li>
                  <span className="font-medium">Lobbying:</span> Federal lobbying disclosures (LDA)
                </li>
              </ul>
            </div>
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold mb-grid-2">Known limitations</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  <span className="font-medium">State campaign finance:</span> Not yet available
                  (FollowTheMoney.org API is in maintenance)
                </li>
                <li>
                  <span className="font-medium">Local government:</span> City and county level data
                  is not yet covered
                </li>
                <li>
                  <span className="font-medium">Real-time votes:</span> Vote data may lag 1–24 hours
                  behind the official record
                </li>
                <li>
                  <span className="font-medium">Upstream outages:</span> If a government API is
                  down, affected endpoints return cached data or empty results
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* API Versioning & Status */}
        <section id="status" className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">API Status &amp; Versioning</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-grid-3">
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold mb-grid-2">Status</h3>
              <p className="text-sm text-gray-600 mb-grid-2">
                Check API health and upstream connectivity in real time:
              </p>
              <a
                href="/api/health"
                className="text-sm text-[#3ea2d4] underline hover:no-underline font-mono"
              >
                GET /api/health
              </a>
            </div>
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold mb-grid-2">Versioning</h3>
              <p className="text-sm text-gray-600 mb-grid-2">
                The public API is currently <strong>v1</strong>. We follow semantic versioning:
                breaking changes will only ship in a new major version with at least 90 days notice.
                Non-breaking additions (new fields, new endpoints) ship continuously.
              </p>
              <Link
                href="/api/v1/changelog"
                className="text-sm text-[#3ea2d4] underline hover:no-underline"
              >
                View API Changelog
              </Link>
            </div>
          </div>
        </section>

        {/* Support */}
        <section id="support" className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Support</h2>
          <p className="text-gray-600 mb-grid-3">
            CIV.IQ is open source and community-supported. Here&apos;s how to get help:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-grid-3">
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold mb-1">Bug Reports</h3>
              <p className="text-sm text-gray-600 mb-grid-2">
                Found an issue with the API, data accuracy, or documentation?
              </p>
              <a
                href="https://github.com/civdotiq/civ.iq/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#3ea2d4] underline hover:no-underline"
              >
                Open a GitHub Issue
              </a>
            </div>
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold mb-1">Feature Requests</h3>
              <p className="text-sm text-gray-600 mb-grid-2">
                Need an endpoint, dataset, or integration that doesn&apos;t exist yet?
              </p>
              <a
                href="https://github.com/civdotiq/civ.iq/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#3ea2d4] underline hover:no-underline"
              >
                Request on GitHub
              </a>
            </div>
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold mb-1">Contribute</h3>
              <p className="text-sm text-gray-600 mb-grid-2">
                PRs welcome. The entire platform is MIT licensed and open source.
              </p>
              <a
                href="https://github.com/civdotiq/civ.iq"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#3ea2d4] underline hover:no-underline"
              >
                GitHub Repository
              </a>
            </div>
          </div>
        </section>

        {/* Resources */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Resources</h2>
          <div className="flex flex-wrap gap-x-grid-4 gap-y-grid-2 text-sm">
            <Link href="/docs/api" className="text-[#3ea2d4] underline hover:no-underline">
              API Reference
            </Link>
            <Link href="/open" className="text-[#3ea2d4] underline hover:no-underline">
              Open Data Portal
            </Link>
            <Link href="/embed-docs" className="text-[#3ea2d4] underline hover:no-underline">
              Embed Widget Docs
            </Link>
            <Link
              href="/migrate/google-civic"
              className="text-[#3ea2d4] underline hover:no-underline"
            >
              Google Civic API Migration Guide
            </Link>
            <Link href="/api/v1/changelog" className="text-[#3ea2d4] underline hover:no-underline">
              API Changelog
            </Link>
            <a
              href="https://www.npmjs.com/org/civiq"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3ea2d4] underline hover:no-underline"
            >
              npm Packages
            </a>
            <a href="/api/health" className="text-[#3ea2d4] underline hover:no-underline">
              API Status
            </a>
          </div>
        </section>

        {/* Attribution */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Attribution</h2>
          <p className="text-sm text-gray-600 mb-grid-3">
            Using CIV.IQ data? We appreciate a link back. Copy this HTML:
          </p>
          <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto mb-grid-1">
            {`<a href="https://civdotiq.org" rel="dofollow">Powered by CIV.IQ</a>`}
          </pre>
          <p className="text-xs text-gray-500">
            All data is sourced from official government APIs. CIV.IQ is MIT licensed.
          </p>
        </section>
      </div>
    </>
  );
}
