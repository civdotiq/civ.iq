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
  ],
};

const INTEGRATION_CARDS = [
  {
    title: 'REST API',
    detail: '181 endpoints, no auth',
    href: '/docs/api',
  },
  {
    title: 'MCP Server',
    detail: '54 tools, 9 domains',
    href: '#mcp',
  },
  {
    title: 'TypeScript SDK',
    detail: '9 resource classes',
    href: '#sdk',
  },
  {
    title: 'Embed Widgets',
    detail: '3 widget types',
    href: '/embed-docs',
  },
  {
    title: 'Atom Feeds',
    detail: '8 feed types',
    href: '#feeds',
  },
  {
    title: 'Bulk Data',
    detail: `${DATASET_REGISTRY.length} datasets, CSV/JSON`,
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
  { domain: 'Health', examples: 'search_hospitals, search_open_payments, search_fda_recalls' },
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

const SDK_CLASSES = [
  'representatives',
  'legislation',
  'finance',
  'intelligence',
  'civic',
  'environment',
  'health',
  'safety',
  'economy',
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
          <p className="text-lg text-gray-600 max-w-2xl mb-6">
            Free civic data for developers, journalists, researchers, and AI agents. No API key. MIT
            licensed.
          </p>
          <div className="flex flex-wrap gap-grid-4">
            <div className="border-2 border-black p-grid-3">
              <div className="text-2xl font-bold">181</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">API Endpoints</div>
            </div>
            <div className="border-2 border-black p-grid-3">
              <div className="text-2xl font-bold">54</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">MCP Tools</div>
            </div>
            <div className="border-2 border-black p-grid-3">
              <div className="text-2xl font-bold">{DATASET_REGISTRY.length}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Bulk Datasets</div>
            </div>
            <div className="border-2 border-black p-grid-3">
              <div className="text-2xl font-bold">MIT</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">License</div>
            </div>
          </div>
        </header>

        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Start</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-grid-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">curl</p>
              <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm border-2 border-black">
                <code>{`curl https://civdotiq.org/api/v1/representatives\\
  ?state=MI&chamber=house`}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">TypeScript SDK</p>
              <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm border-2 border-black">
                <code>{`npm install @civiq/sdk

import { CivIQ } from '@civiq/sdk';
const civiq = new CivIQ();
const reps = await civiq.representatives
  .list({ state: 'MI', chamber: 'house' });`}</code>
              </pre>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Returns JSON. No authentication required. Cached for 1 hour.
          </p>
        </section>

        {/* Integration Cards */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Integrations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-grid-3">
            {INTEGRATION_CARDS.map(card => (
              <Link
                key={card.title}
                href={card.href}
                className="border-2 border-black p-grid-3 hover:bg-gray-50 transition-colors group"
              >
                <h3 className="font-bold text-gray-900 group-hover:text-[#3ea2d4] mb-1">
                  {card.title}
                </h3>
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  {card.detail}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* MCP Server */}
        <section id="mcp" className="mb-12 border-t-2 border-black pt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">MCP Server</h2>
          <p className="text-sm text-gray-600 mb-4">
            Connect AI agents to live civic data via the{' '}
            <a
              href="https://modelcontextprotocol.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3ea2d4] underline hover:no-underline"
            >
              Model Context Protocol
            </a>
            . 54 tools across 9 domains, plus resources and prompt templates.
          </p>

          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Configuration (Claude Desktop / Cursor)
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm border-2 border-black mb-6">
            <code>{`{
  "mcpServers": {
    "civiq": {
      "url": "https://civdotiq.org/api/mcp"
    }
  }
}`}</code>
          </pre>

          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Tool Domains</p>
          <div className="border-2 border-gray-200 overflow-x-auto mb-6">
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

          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Resources</p>
          <div className="border-2 border-gray-200 overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">URI</th>
                  <th className="text-left p-grid-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {MCP_RESOURCES.map(r => (
                  <tr key={r.uri} className="border-b border-gray-100">
                    <td className="p-grid-2 font-mono text-xs whitespace-nowrap">{r.uri}</td>
                    <td className="p-grid-2 text-gray-600">{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Prompt Templates</p>
          <div className="border-2 border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Prompt</th>
                  <th className="text-left p-grid-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {MCP_PROMPTS.map(p => (
                  <tr key={p.name} className="border-b border-gray-100">
                    <td className="p-grid-2 font-mono text-xs whitespace-nowrap">{p.name}</td>
                    <td className="p-grid-2 text-gray-600">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* TypeScript SDK */}
        <section id="sdk" className="mb-12 border-t-2 border-black pt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">TypeScript SDK</h2>
          <p className="text-sm text-gray-600 mb-4">
            Typed client for all CIV.IQ endpoints. Works in Node.js, Deno, and the browser.
          </p>

          <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm border-2 border-black mb-4">
            <code>{`npm install @civiq/sdk

import { CivIQ } from '@civiq/sdk';
const civiq = new CivIQ();

// List representatives
const reps = await civiq.representatives.list({ state: 'MI' });

// Get a bill
const bill = await civiq.legislation.getBill('hr1-119');

// Vote prediction
const prediction = await civiq.intelligence
  .votePrediction('B001230', 'hr1-119');`}</code>
          </pre>

          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Resource Classes</p>
          <div className="flex flex-wrap gap-grid-1 mb-4">
            {SDK_CLASSES.map(cls => (
              <code key={cls} className="bg-gray-100 px-grid-2 py-1 text-xs font-mono">
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
        <section id="feeds" className="mb-12 border-t-2 border-black pt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Atom Feeds</h2>
          <p className="text-sm text-gray-600 mb-4">
            Subscribe to civic updates in any RSS/Atom reader. All feeds return{' '}
            <code className="text-xs">application/atom+xml</code>.
          </p>

          <div className="border-2 border-gray-200 overflow-x-auto mb-4">
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

          <Link href="/open#feeds" className="inline-block text-sm text-[#3ea2d4] hover:underline">
            Full feed documentation on Open Data portal
          </Link>
        </section>

        {/* Bulk Data Downloads */}
        <section id="bulk-data" className="mb-12 border-t-2 border-black pt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Bulk Data Downloads</h2>
          <p className="text-sm text-gray-600 mb-4">
            Download complete datasets as CSV or JSON. No account required.
          </p>

          <div className="border-2 border-gray-200 overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Dataset</th>
                  <th className="text-left p-grid-2 font-semibold">Rows</th>
                  <th className="text-left p-grid-2 font-semibold">Source</th>
                  <th className="text-left p-grid-2 font-semibold">Freshness</th>
                  <th className="text-left p-grid-2 font-semibold">Download</th>
                </tr>
              </thead>
              <tbody>
                {DATASET_REGISTRY.map(dataset => (
                  <tr key={dataset.slug} className="border-b border-gray-100">
                    <td className="p-grid-2 font-medium">{dataset.name}</td>
                    <td className="p-grid-2 text-gray-600 whitespace-nowrap">
                      {dataset.approximateRows}
                    </td>
                    <td className="p-grid-2 text-gray-600">{dataset.source}</td>
                    <td className="p-grid-2 text-gray-500 text-xs">{dataset.freshness}</td>
                    <td className="p-grid-2 whitespace-nowrap">
                      <a
                        href={`/api/download/${dataset.slug}?format=csv`}
                        className="text-[#3ea2d4] underline hover:no-underline text-xs mr-2"
                      >
                        CSV
                      </a>
                      <a
                        href={`/api/download/${dataset.slug}?format=json`}
                        className="text-[#3ea2d4] underline hover:no-underline text-xs"
                      >
                        JSON
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm border-2 border-black mb-2">
            <code>curl -O https://civdotiq.org/api/download/congress-members?format=csv</code>
          </pre>
          <p className="text-xs text-gray-500">
            Catalog endpoint: <code className="text-xs">GET /api/download</code>
          </p>
        </section>

        {/* AI & Machine Readable */}
        <section className="mb-12 border-t-2 border-black pt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">AI &amp; Machine Readable</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="font-medium w-32">MCP Server</span>
              <Link
                href="#mcp"
                className="text-[#3ea2d4] underline hover:no-underline font-mono text-xs"
              >
                /api/mcp
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium w-32">OpenAPI 3.0</span>
              <a
                href="/openapi.json"
                className="text-[#3ea2d4] underline hover:no-underline font-mono text-xs"
              >
                /openapi.json
              </a>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium w-32">llms.txt</span>
              <a
                href="/llms.txt"
                className="text-[#3ea2d4] underline hover:no-underline font-mono text-xs"
              >
                /llms.txt
              </a>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium w-32">llms-full.txt</span>
              <a
                href="/llms-full.txt"
                className="text-[#3ea2d4] underline hover:no-underline font-mono text-xs"
              >
                /llms-full.txt
              </a>
            </div>
          </div>
        </section>

        {/* Open Protocols */}
        <section className="mb-12 border-t-2 border-black pt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Open Protocols</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-grid-3">
            <div className="border-2 border-gray-200 p-grid-3">
              <h3 className="font-bold mb-1">Nostr</h3>
              <p className="text-sm text-gray-600 mb-2">
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
              <p className="text-sm text-gray-600 mb-2">
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
              <p className="text-sm text-gray-600 mb-2">Open source, MIT license.</p>
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
        <section className="mb-12 border-t-2 border-black pt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">npm Packages</h2>
          <div className="space-y-4">
            <div className="border-2 border-gray-200 p-grid-3">
              <code className="text-sm font-bold">@civiq/sdk</code>
              <p className="text-sm text-gray-600 mt-1">
                TypeScript client for all CIV.IQ API endpoints.
              </p>
            </div>
            <div className="border-2 border-gray-200 p-grid-3">
              <code className="text-sm font-bold">@civiq/civic-statistics</code>
              <p className="text-sm text-gray-600 mt-1">
                Correlation, peer comparison, confidence scoring for civic data analysis.
              </p>
            </div>
            <div className="border-2 border-gray-200 p-grid-3">
              <code className="text-sm font-bold">@civiq/entity-resolution</code>
              <p className="text-sm text-gray-600 mt-1">
                Committee/agency matching, industry taxonomy, and entity disambiguation.
              </p>
            </div>
          </div>
        </section>

        {/* Resources */}
        <section className="mb-12 border-t-2 border-black pt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Resources</h2>
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
              Migration Guide
            </Link>
            <Link href="/api/v1/changelog" className="text-[#3ea2d4] underline hover:no-underline">
              API Changelog
            </Link>
          </div>
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
      </div>
    </>
  );
}
