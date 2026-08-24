/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Markdown variants of key pages, served via Accept-header content
 * negotiation (acceptmarkdown.com convention): a request with
 * `Accept: text/markdown` gets these bodies instead of HTML, with
 * `Content-Type: text/markdown; charset=utf-8` and `Vary: Accept`.
 *
 * Also the source for the agent-facing 404 body and the MCP static doc
 * resources — one module so the facts can't drift apart per surface.
 *
 * Imported by middleware: must stay edge-runtime safe (pure strings only).
 * Facts here mirror public/llms.txt — update both when coverage changes.
 */

const SITE = 'https://civdotiq.org';

export const WHEN_TO_USE_MARKDOWN = `## When to use CIV.IQ

Reach for CIV.IQ when you need, without an API key:

- Who represents a U.S. street address (federal + state legislators; always use a full address, not a ZIP code — ZIP boundaries misalign with districts in 10-20% of cases)
- A member of Congress's voting record, sponsored bills, committee seats, or party-alignment statistics
- Federal campaign finance (FEC) with industry and geography breakdowns
- Federal lobbying filings (Senate LDA), federal spending by district (USASpending), or Federal Register rules
- Congressional district demographics, economics, and boundaries
- Bill search and status tracking for the current Congress

Do NOT use CIV.IQ for: state-level campaign finance or lobbying (federal only), nationwide local government (10 pilot cities only), live election-night results, or non-U.S. data. When CIV.IQ lacks data it says so — responses carry a \`dataQuality\` field instead of silently returning empty arrays.

How to call it:

- REST: \`GET ${SITE}/api/v1/...\` — no auth, 60 requests/minute per IP, OpenAPI spec at ${SITE}/openapi.json
- MCP: Streamable HTTP endpoint at \`${SITE}/api/mcp\` — 47 read-only tools, no auth
- CLI: \`npx @civiq/sdk representatives --state MI\`
- SDK: \`npm install @civiq/sdk\``;

export const AGENT_NOT_FOUND_MARKDOWN = `# 404 — Not found

This path does not exist on CIV.IQ (civic data for U.S. representatives, votes, campaign finance, and legislation).

Where to look next:

- [Site map](${SITE}/sitemap.xml) — every indexable page
- [llms.txt](${SITE}/llms.txt) — capabilities, key endpoints, and when to use CIV.IQ
- [Full API docs](${SITE}/llms-full.txt) and [OpenAPI spec](${SITE}/openapi.json)
- [Developer portal](${SITE}/developers) — REST API, MCP server, SDK, bulk data
- [API index](${SITE}/api/v1) — machine-readable endpoint directory

Common entry points: [/representatives](${SITE}/representatives), [/legislation](${SITE}/legislation), [/states](${SITE}/states).
`;

export const VERSIONING_POLICY_MARKDOWN = `# CIV.IQ API versioning & deprecation policy

- The public API is versioned in the URL path: \`${SITE}/api/v1\`. The current version is v1.
- Additive, non-breaking changes (new endpoints, new optional fields) ship within v1 and are recorded at \`GET /api/v1/changelog\`.
- Breaking changes only ever ship as a new URL version (e.g. \`/api/v2\`); v1 is never mutated incompatibly.
- Before any version is retired, responses from it will carry \`Deprecation\` and \`Sunset\` headers (RFC 8594) plus a \`Link rel="successor-version"\` header, at least 6 months before shutdown. The changelog and ${SITE}/docs/api will announce the same dates.
- No version is currently deprecated and no sunset is scheduled for v1.
- Every v1 response carries an \`X-API-Version\` header with the exact spec version.
`;

const HOME_MARKDOWN = `# CIV.IQ — Know your representatives

CIV.IQ is a nonpartisan civic intelligence platform. See how your U.S. representatives vote, who funds them, and what they sponsor — all from official government data (Congress.gov, FEC, Census Bureau, Open States). No account required.

## Start here

- Find your representatives by street address: ${SITE}/your-reps
- All 535 members of Congress: ${SITE}/representatives
- Bills and votes: ${SITE}/legislation
- State legislatures: ${SITE}/states
- Congressional districts: ${SITE}/districts

${WHEN_TO_USE_MARKDOWN}

## Machine-readable entry points

- [llms.txt](${SITE}/llms.txt) · [llms-full.txt](${SITE}/llms-full.txt) · [OpenAPI](${SITE}/openapi.json) · [Site map](${SITE}/sitemap.xml)
- Developer portal: ${SITE}/developers
`;

const DEVELOPERS_MARKDOWN = `# CIV.IQ developer portal

Free, no-auth civic data API, MCP server, TypeScript SDK, CLI, and bulk data.

## Quick start

\`\`\`
curl "${SITE}/api/v1/representatives?state=MI&chamber=house"
\`\`\`

- Base URL: \`${SITE}/api/v1\` — no API key, 60 requests/minute per IP
- OpenAPI 3.0 spec: ${SITE}/openapi.json
- Full endpoint docs: ${SITE}/llms-full.txt and ${SITE}/docs/api
- Errors are structured JSON: \`{ "error": { "code", "message", "details?" }, "meta": {...} }\`
- Rate limit state is exposed via standard \`RateLimit-*\` response headers (plus legacy \`X-RateLimit-*\`); a 429 carries \`Retry-After\`

## MCP server

Streamable HTTP endpoint at \`${SITE}/api/mcp\` (also reachable at \`${SITE}/mcp\`) — 47 read-only tools, 6 prompts, doc resources. No auth.

## SDK & CLI

- \`npm install @civiq/sdk\` — typed TypeScript client
- \`npx @civiq/sdk --help\` — command-line lookups (representatives, bills, votes, districts, committees)

## Versioning

See the [deprecation policy](${SITE}/docs/api#versioning). Current: v1, no deprecations.

${WHEN_TO_USE_MARKDOWN}
`;

const ABOUT_MARKDOWN = `# About CIV.IQ

CIV.IQ is a nonpartisan civic intelligence platform: factual profiles of U.S. representatives built only from official government sources — Congress.gov, the FEC, Senate lobbying disclosures, USASpending, the Federal Register, and the Census Bureau. It never uses mock or fabricated data; where data is unavailable it says so.

- Live site: ${SITE}
- Open source: https://github.com/civdotiq/civ.iq (MIT)
- Contact: contact@civdotiq.org · ${SITE}/support
- For agents and developers: ${SITE}/llms.txt · ${SITE}/developers
`;

const DOCS_API_MARKDOWN = `# CIV.IQ API reference

Complete REST reference for the free CIV.IQ civic data API.

- Base URL: \`${SITE}/api/v1\` (no auth, 60 req/min per IP)
- OpenAPI 3.0 spec: ${SITE}/openapi.json
- Plain-text full docs: ${SITE}/llms-full.txt

## Key endpoints

- \`GET /api/v1/representatives?state=MI&chamber=house\` — list legislators
- \`GET /api/v1/representatives/{bioguideId}\` — legislator detail
- \`GET /api/representative/{bioguideId}/votes\` — voting record
- \`GET /api/representative/{bioguideId}/finance\` — campaign finance
- \`GET /api/v1/bills?sort=updateDate+desc&limit=20\` — recent bills
- \`GET /api/search/unified?q=healthcare\` — keyword search (bills, members, committees)
- \`GET /api/v1/bills/{billId}\` — bill detail
- \`GET /api/v1/committees\` — committees
- \`GET /api/v1/changelog\` — API changelog

## Errors

All errors are JSON: \`{ "error": { "code": <http status>, "message": "...", "details": "..." }, "meta": {...} }\`. Unknown API paths return this shape with status 404 — never HTML.

${VERSIONING_POLICY_MARKDOWN.replace('# CIV.IQ API versioning & deprecation policy', '## Versioning & deprecation policy')}
`;

const MCP_MARKDOWN = `# CIV.IQ MCP server

Model Context Protocol server exposing CIV.IQ's civic data to AI assistants.

- Endpoint: \`${SITE}/api/mcp\` (Streamable HTTP; \`${SITE}/mcp\` accepts the same protocol traffic). No auth.
- Server manifest: \`${SITE}/.well-known/mcp.json\` (MCP registry server.json format)
- 47 read-only tools across representatives, legislation, finance, intelligence, civic, environment, safety, health, and economy domains
- 6 prompt templates, 7 resource templates (e.g. \`civiq://legislators/{bioguideId}\`), plus static doc resources (\`civiq://docs/*\`)

Claude Desktop / Claude Code config:

\`\`\`json
{ "mcpServers": { "civiq": { "type": "http", "url": "${SITE}/api/mcp" } } }
\`\`\`

${WHEN_TO_USE_MARKDOWN}
`;

const SUPPORT_MARKDOWN = `# CIV.IQ support

- Email: contact@civdotiq.org (monitored; response within a few business days)
- Bug reports: https://github.com/civdotiq/civ.iq/issues
- Developer docs: ${SITE}/developers · API reference: ${SITE}/docs/api
- Data corrections: every representative page links a corrections flow
`;

/**
 * Path → markdown variant. Paths are normalized (no trailing slash, lowercase)
 * before lookup in middleware.
 */
export const MARKDOWN_PAGES: ReadonlyMap<string, string> = new Map([
  ['/', HOME_MARKDOWN],
  ['/about', ABOUT_MARKDOWN],
  ['/developers', DEVELOPERS_MARKDOWN],
  ['/docs/api', DOCS_API_MARKDOWN],
  ['/mcp', MCP_MARKDOWN],
  ['/support', SUPPORT_MARKDOWN],
]);
