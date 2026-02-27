/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * API Documentation Page
 *
 * Human-readable reference for the CIV.IQ Public API v1 and Atom feeds.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Reference | CIV.IQ',
  description:
    'Documentation for the CIV.IQ Public API v1. Open REST endpoints for U.S. government data. No API key required.',
};

const BASE = 'https://civ.iq/api/v1';
const FEED_BASE = 'https://civ.iq/api/feed';

interface Endpoint {
  method: string;
  path: string;
  description: string;
  params?: { name: string; type: string; description: string }[];
  example?: string;
  cache?: string;
}

const REST_ENDPOINTS: { group: string; endpoints: Endpoint[] }[] = [
  {
    group: 'Representatives',
    endpoints: [
      {
        method: 'GET',
        path: '/representatives',
        description: 'List all current members of Congress with optional filtering.',
        params: [
          { name: 'chamber', type: '"house" | "senate"', description: 'Filter by chamber' },
          { name: 'state', type: 'string', description: 'Two-letter state code (e.g., MI)' },
          { name: 'party', type: '"D" | "R" | "I"', description: 'Filter by party' },
          {
            name: 'limit',
            type: 'integer',
            description: 'Results per page (default: 100, max: 535)',
          },
          { name: 'offset', type: 'integer', description: 'Pagination offset (default: 0)' },
        ],
        example: `curl ${BASE}/representatives?state=MI&chamber=house`,
        cache: 's-maxage=3600',
      },
      {
        method: 'GET',
        path: '/representatives/{bioguideId}',
        description: 'Get detailed info for a specific member of Congress.',
        example: `curl ${BASE}/representatives/P000197`,
        cache: 's-maxage=3600',
      },
    ],
  },
  {
    group: 'Bills',
    endpoints: [
      {
        method: 'GET',
        path: '/bills',
        description: 'List latest bills from Congress.',
        params: [
          {
            name: 'sort',
            type: 'string',
            description:
              'Sort order: "updateDate+desc", "updateDate+asc", "number+desc", "number+asc"',
          },
          {
            name: 'limit',
            type: 'integer',
            description: 'Results per page (default: 50, max: 250)',
          },
          { name: 'offset', type: 'integer', description: 'Pagination offset (default: 0)' },
        ],
        example: `curl ${BASE}/bills?limit=10`,
        cache: 's-maxage=3600',
      },
      {
        method: 'GET',
        path: '/bills/{billId}',
        description: 'Get bill detail. Bill ID format: {congress}-{type}-{number}.',
        example: `curl ${BASE}/bills/119-hr-1`,
        cache: 's-maxage=86400 (current), s-maxage=31536000 (historical)',
      },
      {
        method: 'GET',
        path: '/bills/{billId}/summary',
        description:
          'Get cached AI-generated plain-language summary. Does not trigger live AI generation.',
        example: `curl ${BASE}/bills/119-hr-1/summary`,
        cache: 's-maxage=3600',
      },
    ],
  },
  {
    group: 'Votes',
    endpoints: [
      {
        method: 'GET',
        path: '/votes/{voteId}',
        description:
          'Get roll-call vote details with individual member positions. Vote ID format: {chamber}-{congress}-{rollNumber}.',
        example: `curl ${BASE}/votes/house-119-116`,
        cache: 's-maxage=3600',
      },
    ],
  },
  {
    group: 'Districts',
    endpoints: [
      {
        method: 'GET',
        path: '/districts/{districtId}',
        description:
          'Get district info and its representatives. District ID format: {state}-{district} (e.g., MI-12, AK-AL).',
        example: `curl ${BASE}/districts/MI-12`,
        cache: 's-maxage=86400',
      },
    ],
  },
  {
    group: 'Committees',
    endpoints: [
      {
        method: 'GET',
        path: '/committees',
        description: 'List congressional committees.',
        params: [
          { name: 'chamber', type: 'string', description: 'Filter by chamber' },
          {
            name: 'limit',
            type: 'integer',
            description: 'Results per page (default: 100, max: 250)',
          },
          { name: 'offset', type: 'integer', description: 'Pagination offset (default: 0)' },
        ],
        example: `curl ${BASE}/committees?limit=10`,
        cache: 's-maxage=86400',
      },
      {
        method: 'GET',
        path: '/committees/{committeeId}',
        description: 'Get committee detail with members and subcommittees.',
        example: `curl ${BASE}/committees/HSJU`,
        cache: 's-maxage=3600',
      },
    ],
  },
];

const FEED_ENDPOINTS: { path: string; description: string; example: string }[] = [
  {
    path: '/feed/member/{bioguideId}',
    description:
      'Activity feed for a member of Congress including recent votes and sponsored bills.',
    example: `${FEED_BASE}/member/P000197`,
  },
  {
    path: '/feed/bills/latest',
    description: 'Latest bills introduced in Congress.',
    example: `${FEED_BASE}/bills/latest`,
  },
  {
    path: '/feed/district/{districtId}',
    description: 'Activity feed for a congressional district including cached bill impacts.',
    example: `${FEED_BASE}/district/MI-12`,
  },
  {
    path: '/feed/bill/{billId}',
    description: 'Status updates for a specific bill.',
    example: `${FEED_BASE}/bill/119-hr-1`,
  },
  {
    path: '/feed/committee/{committeeId}',
    description: 'Activity feed for a congressional committee.',
    example: `${FEED_BASE}/committee/HSJU`,
  },
];

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-grid-3 py-grid-6">
        {/* Header */}
        <nav className="text-sm text-gray-500 mb-6">
          <a href="/" className="hover:text-blue-600">
            Home
          </a>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">API Reference</span>
        </nav>

        <h1 className="text-4xl font-bold text-gray-900 mb-grid-2">API Reference</h1>
        <p className="text-lg text-gray-600 mb-grid-6">
          Open REST API for normalized U.S. government data. No API key required. Rate limited to 60
          requests per minute.
        </p>

        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-grid-3 mb-grid-8">
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">10</div>
            <div className="text-sm text-gray-600 uppercase tracking-wider">REST Endpoints</div>
          </div>
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">5</div>
            <div className="text-sm text-gray-600 uppercase tracking-wider">Atom Feeds</div>
          </div>
          <div className="border-2 border-black p-grid-3">
            <div className="text-3xl font-bold">60/min</div>
            <div className="text-sm text-gray-600 uppercase tracking-wider">Rate Limit</div>
          </div>
        </div>

        {/* Base URL */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Base URL</h2>
          <code className="block bg-gray-50 border-2 border-gray-200 p-grid-2 text-sm font-mono">
            {BASE}
          </code>
        </section>

        {/* Response format */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Response Format</h2>
          <p className="text-gray-600 mb-grid-2">
            All endpoints return JSON with a consistent envelope:
          </p>
          <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto">
            {JSON.stringify(
              {
                data: '{ ... }',
                pagination: '{ total, limit, offset, hasMore }',
                meta: {
                  apiVersion: 'v1',
                  timestamp: '2025-01-15T12:00:00.000Z',
                  source: 'congress.gov',
                  license: 'MIT',
                  documentation: 'https://civ.iq/docs/api',
                },
              },
              null,
              2
            )}
          </pre>
          <p className="text-sm text-gray-500 mt-grid-1">
            The <code>pagination</code> field is only present on list endpoints.
          </p>
        </section>

        {/* Error format */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Error Format</h2>
          <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto">
            {JSON.stringify(
              {
                error: { code: 404, message: 'Representative not found' },
                meta: { apiVersion: 'v1', timestamp: '...' },
              },
              null,
              2
            )}
          </pre>
        </section>

        {/* Rate limiting */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Rate Limiting</h2>
          <p className="text-gray-600 mb-grid-2">
            All endpoints are rate limited to 60 requests per minute per IP. Rate limit status is
            returned in response headers:
          </p>
          <div className="border-2 border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Header</th>
                  <th className="text-left p-grid-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-mono text-sm">X-RateLimit-Limit</td>
                  <td className="p-grid-2">Maximum requests per window</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-grid-2 font-mono text-sm">X-RateLimit-Remaining</td>
                  <td className="p-grid-2">Remaining requests in current window</td>
                </tr>
                <tr>
                  <td className="p-grid-2 font-mono text-sm">X-RateLimit-Reset</td>
                  <td className="p-grid-2">Unix timestamp when window resets</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* REST Endpoints */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-4">REST Endpoints</h2>

          {REST_ENDPOINTS.map(group => (
            <div key={group.group} className="mb-grid-6">
              <h3 className="text-xl font-bold mb-grid-2 uppercase tracking-wider text-gray-500">
                {group.group}
              </h3>

              {group.endpoints.map(ep => (
                <div key={ep.path} className="border-2 border-black p-grid-3 mb-grid-2">
                  <div className="flex items-center gap-grid-2 mb-grid-1">
                    <span className="inline-block bg-civiq-blue text-white text-xs font-bold px-2 py-1 uppercase tracking-wider">
                      {ep.method}
                    </span>
                    <code className="text-sm font-mono font-semibold">{ep.path}</code>
                  </div>
                  <p className="text-gray-600 text-sm mb-grid-2">{ep.description}</p>

                  {ep.params && ep.params.length > 0 && (
                    <details className="mb-grid-2">
                      <summary className="text-sm font-semibold cursor-pointer hover:text-civiq-blue">
                        Query Parameters
                      </summary>
                      <div className="mt-grid-1 pl-grid-2 border-l-2 border-gray-200">
                        {ep.params.map(p => (
                          <div key={p.name} className="text-sm mb-1">
                            <code className="font-mono font-semibold">{p.name}</code>
                            <span className="text-gray-400 ml-1">({p.type})</span>
                            <span className="text-gray-600 ml-1">&#8212; {p.description}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {ep.example && (
                    <pre className="bg-gray-50 border border-gray-200 p-2 text-xs overflow-x-auto">
                      {ep.example}
                    </pre>
                  )}

                  {ep.cache && (
                    <div className="text-xs text-gray-400 mt-grid-1">Cache: {ep.cache}</div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </section>

        {/* Atom Feeds */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Atom Feeds</h2>
          <p className="text-gray-600 mb-grid-3">
            Subscribe to real-time updates via any RSS/Atom reader. All feeds return{' '}
            <code className="text-sm">application/atom+xml</code>.
          </p>

          {FEED_ENDPOINTS.map(feed => (
            <div key={feed.path} className="border-2 border-black p-grid-3 mb-grid-2">
              <code className="text-sm font-mono font-semibold">{feed.path}</code>
              <p className="text-gray-600 text-sm mt-1 mb-grid-1">{feed.description}</p>
              <pre className="bg-gray-50 border border-gray-200 p-2 text-xs overflow-x-auto">
                curl {feed.example}
              </pre>
            </div>
          ))}
        </section>

        {/* CORS */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">CORS</h2>
          <p className="text-gray-600">
            All <code>/api/v1/</code> and <code>/api/feed/</code> endpoints include{' '}
            <code>Access-Control-Allow-Origin: *</code>. You can call them directly from
            browser-side JavaScript.
          </p>
        </section>

        {/* Machine-readable spec */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Machine-Readable Spec</h2>
          <p className="text-gray-600">
            An{' '}
            <a href="/openapi.json" className="text-civiq-blue underline hover:no-underline">
              OpenAPI 3.0 specification
            </a>{' '}
            is available for code generation and API tooling.
          </p>
        </section>

        {/* Data sources */}
        <section className="mb-grid-6">
          <h2 className="text-2xl font-bold mb-grid-2">Data Sources</h2>
          <p className="text-gray-600 mb-grid-3">
            Data served by these API endpoints comes from:{' '}
            <a
              href="https://api.congress.gov"
              className="text-civiq-blue underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Congress.gov API
            </a>
            ,{' '}
            <a
              href="https://clerk.house.gov"
              className="text-civiq-blue underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              House Clerk
            </a>
            ,{' '}
            <a
              href="https://www.senate.gov"
              className="text-civiq-blue underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Senate.gov
            </a>
            ,{' '}
            <a
              href="https://api.govinfo.gov"
              className="text-civiq-blue underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GovInfo
            </a>
            ,{' '}
            <a
              href="https://api.open.fec.gov"
              className="text-civiq-blue underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              FEC
            </a>
            , and{' '}
            <a
              href="https://api.usaspending.gov"
              className="text-civiq-blue underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              USASpending.gov
            </a>
            . See the full list on the{' '}
            <a href="/open" className="text-civiq-blue underline hover:no-underline">
              Open Data
            </a>{' '}
            page.
          </p>
        </section>
      </div>
    </div>
  );
}
