/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * MCP setup page — "Use CIV.IQ in Claude / ChatGPT"
 * Client-by-client instructions for connecting AI assistants to the
 * CIV.IQ MCP server. The developer-oriented reference stays on /developers.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Use CIV.IQ in Claude & ChatGPT — Civic Data MCP Server',
  description:
    'Connect Claude, ChatGPT, Claude Code, or Cursor to live U.S. government data. One URL, no API key: representatives, votes, bills, campaign finance, and district data with citations.',
  openGraph: {
    title: 'Use CIV.IQ in Claude & ChatGPT — Civic Data MCP Server',
    description:
      'Connect Claude, ChatGPT, Claude Code, or Cursor to live U.S. government data. One URL, no API key.',
    type: 'website',
  },
  keywords: [
    'MCP server',
    'Model Context Protocol',
    'Claude connector',
    'ChatGPT connector',
    'civic data AI',
    'congress data Claude',
    'government data ChatGPT',
    'AI civic data',
  ],
};

const MCP_URL = 'https://civdotiq.org/api/mcp';

const EXAMPLE_QUESTIONS = [
  'Who represents 1600 Pennsylvania Avenue, and how did they vote this month?',
  'Which industries fund my representative, and do their committee assignments overlap?',
  'What federal grants went to Michigan’s 10th district this year?',
  'Compare the two senators from Michigan on votes, funding, and stock trades.',
  'What EPA violations exist in my district, and who lobbied on air quality?',
];

const TOOL_GROUPS = [
  {
    domain: 'Representatives & votes',
    detail: 'Address lookup, profiles, voting history, side-by-side comparison',
  },
  {
    domain: 'Legislation',
    detail: 'Bill search and detail, roll-call votes, committee information',
  },
  {
    domain: 'Money',
    detail: 'Campaign finance by industry, lobbying filings, federal spending by district',
  },
  {
    domain: 'District profiles',
    detail: 'Environment, health, safety, housing, education, banking, research funding',
  },
  {
    domain: 'Cross-domain analysis',
    detail: 'Influence chains, vote prediction, industry regulatory landscapes',
  },
];

export default function McpSetupPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Developers', url: 'https://civdotiq.org/developers' },
          { name: 'MCP Setup', url: 'https://civdotiq.org/mcp' },
        ]}
      />

      <div className="max-w-5xl mx-auto px-grid-3 py-grid-6">
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
          <span className="font-medium text-gray-900">MCP Setup</span>
        </nav>

        {/* Header */}
        <h1 className="text-4xl font-bold text-gray-900 mb-grid-2">
          Use CIV.IQ in Claude &amp; ChatGPT
        </h1>
        <p className="text-lg text-gray-600 mb-grid-3 max-w-3xl">
          Ask your AI assistant about representatives, votes, bills, and money in politics — and get
          answers from cited government records instead of training data.
        </p>
        <p className="text-sm text-gray-600 max-w-3xl mb-grid-6">
          CIV.IQ runs a free public{' '}
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3ea2d4] underline hover:no-underline"
          >
            Model Context Protocol
          </a>{' '}
          server. Once connected, your assistant can pull live data from Congress.gov, the FEC,
          Senate lobbying records, and a dozen other federal sources. No API key, no account.
        </p>

        {/* The one URL */}
        <div className="border-2 border-black p-grid-3 mb-grid-8">
          <span className="text-sm text-gray-500 uppercase tracking-wider">Server URL</span>
          <pre className="text-lg font-mono mt-1 overflow-x-auto">{MCP_URL}</pre>
          <p className="text-sm text-gray-600 mt-2">
            Streamable HTTP transport · 47 tools · no authentication required
          </p>
        </div>

        {/* Claude (web + desktop) */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Claude (web and desktop)</h2>
          <ol className="list-decimal list-inside text-gray-700 space-y-2 mb-grid-2">
            <li>
              Open <span className="font-medium">Settings &rsaquo; Connectors</span> (on claude.ai
              or in the Claude Desktop app)
            </li>
            <li>
              Choose <span className="font-medium">Add custom connector</span>
            </li>
            <li>
              Name it <code className="font-mono text-sm bg-gray-50 px-1">CIV.IQ</code> and paste
              the server URL above
            </li>
            <li>Start a new chat and ask a civic question — Claude will pick the right tools</li>
          </ol>
          <p className="text-sm text-gray-600">
            Custom connectors are available on Claude&rsquo;s paid plans. In a chat, you can confirm
            the connection from the tools menu below the message box.
          </p>
        </section>

        {/* Claude Code */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Claude Code</h2>
          <p className="text-gray-600 mb-grid-2">One command in your terminal:</p>
          <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto">
            {`claude mcp add --transport http civiq ${MCP_URL}`}
          </pre>
        </section>

        {/* ChatGPT */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">ChatGPT</h2>
          <ol className="list-decimal list-inside text-gray-700 space-y-2 mb-grid-2">
            <li>
              Enable developer mode:{' '}
              <span className="font-medium">
                Settings &rsaquo; Apps &amp; Connectors &rsaquo; Advanced &rsaquo; Developer mode
              </span>
            </li>
            <li>
              Choose <span className="font-medium">Create</span> under Connectors
            </li>
            <li>
              Name it <code className="font-mono text-sm bg-gray-50 px-1">CIV.IQ</code>, paste the
              server URL, and set authentication to{' '}
              <span className="font-medium">No authentication</span>
            </li>
            <li>In a new chat, enable the connector from the plus menu</li>
          </ol>
          <p className="text-sm text-gray-600">
            Connector creation requires a paid ChatGPT plan. OpenAI&rsquo;s connector UI changes
            frequently — if the menus have moved, search ChatGPT settings for
            &ldquo;connectors&rdquo;.
          </p>
        </section>

        {/* Cursor / other clients */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Cursor and other MCP clients</h2>
          <p className="text-gray-600 mb-grid-2">
            Any client that speaks streamable HTTP can connect with this configuration (for Cursor:{' '}
            <code className="font-mono text-sm bg-gray-50 px-1">.cursor/mcp.json</code>):
          </p>
          <pre className="bg-gray-50 border-2 border-gray-200 p-grid-3 text-sm overflow-x-auto">
            {`{
  "mcpServers": {
    "civiq": {
      "url": "${MCP_URL}"
    }
  }
}`}
          </pre>
        </section>

        {/* What you can ask */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">What you can ask</h2>
          <div className="border-2 border-gray-200">
            <ul className="text-sm">
              {EXAMPLE_QUESTIONS.map(q => (
                <li key={q} className="border-b border-gray-100 last:border-b-0 p-grid-2">
                  &ldquo;{q}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* What's inside */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">What&rsquo;s inside</h2>
          <div className="border-2 border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left p-grid-2 font-semibold">Domain</th>
                  <th className="text-left p-grid-2 font-semibold">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {TOOL_GROUPS.map(row => (
                  <tr key={row.domain} className="border-b border-gray-100">
                    <td className="p-grid-2 font-medium whitespace-nowrap">{row.domain}</td>
                    <td className="p-grid-2 text-gray-600">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 mt-grid-2">
            Every answer carries its government source. Analysis tools report confidence levels and
            never claim causation. Full tool reference, resources, and prompt templates are on the{' '}
            <Link href="/developers#mcp" className="text-[#3ea2d4] underline hover:no-underline">
              developers page
            </Link>
            .
          </p>
        </section>

        {/* Troubleshooting */}
        <section className="mb-grid-8">
          <h2 className="text-2xl font-bold mb-grid-2">Troubleshooting</h2>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>
              <span className="font-medium">Connector won&rsquo;t validate:</span> make sure the URL
              is exactly <code className="font-mono bg-gray-50 px-1">{MCP_URL}</code> — no trailing
              slash, https only.
            </li>
            <li>
              <span className="font-medium">Assistant doesn&rsquo;t use the tools:</span> mention
              CIV.IQ or ask a concrete civic question (&ldquo;use CIV.IQ to look up&hellip;&rdquo;
              works reliably).
            </li>
            <li>
              <span className="font-medium">Slow first response:</span> some tools aggregate several
              government APIs; district-wide analyses can take 10&ndash;30 seconds.
            </li>
            <li>
              <span className="font-medium">Something looks wrong:</span> every page on civdotiq.org
              has a &ldquo;report an error&rdquo; link, or use the{' '}
              <Link href="/corrections" className="text-[#3ea2d4] underline hover:no-underline">
                corrections page
              </Link>
              .
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
