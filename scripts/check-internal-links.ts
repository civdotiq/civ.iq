/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Internal link check (Google/AI findability audit, item 2: links between
 * pages). Loads one or more pages of each type and reports, from the server
 * HTML a crawler reads:
 *
 * - links the site redirects: a state code in the wrong case (/states/MI,
 *   /state-legislature/MI/..., /delegation/mi) or a district id not in its
 *   canonical form (/districts/MI-6, /districts/AK-01). Each one costs a
 *   crawler a redirect and splits the link's weight;
 * - links to a district that doesn't exist (/district/MI/6 was one);
 * - pages that should link their state's page (/states/xx) and don't:
 *   member profiles, congressional districts, state legislators and state
 *   districts.
 *
 * Usage:
 *   npx tsx scripts/check-internal-links.ts                          # production
 *   npx tsx scripts/check-internal-links.ts --base http://localhost:3000
 *
 * Production needs FIREWALL_BYPASS_TOKEN (Bot Protection); it is read from
 * the environment or .env.local and never printed.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalCasePath, canonicalizeDistrictId } from '../src/lib/helpers/url-builders';
import { checkDistrictId } from '../src/lib/districts/known-districts';

const args = process.argv.slice(2);
const baseIndex = args.indexOf('--base');
const BASE = (baseIndex >= 0 ? args[baseIndex + 1] : 'https://civdotiq.org')!.replace(/\/$/, '');

function bypassToken(): string | undefined {
  if (process.env.FIREWALL_BYPASS_TOKEN) return process.env.FIREWALL_BYPASS_TOKEN;
  const envFile = join(__dirname, '..', '.env.local');
  if (!existsSync(envFile)) return undefined;
  const line = readFileSync(envFile, 'utf8')
    .split('\n')
    .find(l => l.startsWith('FIREWALL_BYPASS_TOKEN='));
  return line?.split('=').slice(1).join('=').replace(/["\s]/g, '') || undefined;
}

const TOKEN = bypassToken();
const HEADERS: Record<string, string> = {
  'User-Agent': 'civiq-internal-link-check/1.0',
  ...(TOKEN ? { 'x-civiq-bypass': TOKEN } : {}),
};

interface PageCheck {
  path: string;
  /** The state page this page should link, e.g. /states/mi. */
  stateLink?: string;
}

const SEED: PageCheck[] = [
  { path: '/' },
  { path: '/congress' },
  { path: '/representatives' },
  { path: '/districts' },
  { path: '/state-districts' },
  { path: '/elections/2026/how-to-vote' },
  { path: '/states/mi' },
  { path: '/delegation/MI' },
  { path: '/representative/D000624', stateLink: '/states/mi' },
  { path: '/representative/S001208', stateLink: '/states/mi' },
  { path: '/representative/P000197', stateLink: '/states/ca' },
  { path: '/representative/D000624/votes' },
  { path: '/districts/MI-06', stateLink: '/states/mi' },
  { path: '/districts/AK-AL', stateLink: '/states/ak' },
  { path: '/committee/SSJU' },
  { path: '/state-legislature/mi' },
  { path: '/state-legislature/mi/committees' },
  { path: '/state-bills/mi' },
  { path: '/state-districts/mi/lower/1', stateLink: '/states/mi' },
  { path: '/state-districts/tx/upper/1', stateLink: '/states/tx' },
];

const HREF = /href="(\/[^"#?]*)/g;

/** Where the site redirects a link, or null when the link is final. */
function redirectTarget(link: string): string | null {
  const recased = canonicalCasePath(link);
  if (recased) return recased;
  const district = link.match(/^\/districts\/([^/]+)$/);
  if (!district?.[1]) return null;
  const parsed = canonicalizeDistrictId(district[1]);
  if (!parsed) return null;
  const check = checkDistrictId(parsed.state, parsed.district);
  const canonical = check.kind === 'at-large' ? check.canonical : parsed.canonical;
  return canonical === district[1] ? null : `/districts/${canonical}`;
}

/** A link to a route that doesn't exist. */
function deadLink(link: string): boolean {
  return /^\/district\//.test(link);
}

async function load(path: string): Promise<{ status: number; html: string }> {
  try {
    const response = await fetch(`${BASE}${path}`, {
      headers: HEADERS,
      redirect: 'manual',
      signal: AbortSignal.timeout(120_000),
    });
    return { status: response.status, html: response.ok ? await response.text() : '' };
  } catch (error) {
    return { status: 0, html: `${(error as Error).message}` };
  }
}

function internalLinks(html: string): string[] {
  const links = new Set<string>();
  for (const match of html.matchAll(HREF)) {
    const href = match[1]!;
    if (href.startsWith('/_next/') || href.startsWith('/fonts/') || href.startsWith('/api/')) {
      continue;
    }
    links.add(href);
  }
  return [...links];
}

/** Pages found on the seed pages: a legislator, a committee, a bill, a vote. */
function discovered(seen: Map<string, string[]>): PageCheck[] {
  const all = [...seen.values()].flat();
  const pick = (re: RegExp) => all.find(l => re.test(l));
  const extra: Array<PageCheck | null> = [
    ((p?: string) => (p ? { path: p, stateLink: '/states/mi' } : null))(
      pick(/^\/state-legislature\/mi\/legislator\//i)
    ),
    ((p?: string) => (p ? { path: p } : null))(pick(/^\/state-legislature\/mi\/committee\//i)),
    ((p?: string) => (p ? { path: p } : null))(pick(/^\/state-bills\/mi\/[^/]+$/i)),
    ((p?: string) => (p ? { path: p } : null))(pick(/^\/state-legislature\/mi\/vote\//i)),
  ];
  // Fetch the canonical form, so the page itself isn't a redirect.
  return extra
    .filter((p): p is PageCheck => p !== null)
    .map(p => ({ ...p, path: canonicalCasePath(p.path) ?? p.path }));
}

async function main(): Promise<void> {
  console.log(`Base: ${BASE}${TOKEN ? ' (bypass header set)' : ''}\n`);
  const seen = new Map<string, string[]>();
  let redirecting = 0;
  let missingState = 0;
  let dead = 0;
  let failed = 0;

  const check = async (page: PageCheck): Promise<void> => {
    const { status, html } = await load(page.path);
    if (status !== 200) {
      failed++;
      console.log(`FAIL ${page.path}: HTTP ${status}`);
      return;
    }
    const links = internalLinks(html);
    seen.set(page.path, links);
    const wrongCase = links.filter(l => redirectTarget(l) !== null);
    const deadLinks = links.filter(deadLink);
    const hasState = page.stateLink ? links.includes(page.stateLink) : true;
    redirecting += wrongCase.length;
    dead += deadLinks.length;
    if (!hasState) missingState++;
    const flags = [
      wrongCase.length ? `${wrongCase.length} redirecting` : '',
      deadLinks.length ? `${deadLinks.length} dead` : '',
      hasState ? '' : `no link to ${page.stateLink}`,
    ].filter(Boolean);
    console.log(`${flags.length ? 'FAIL' : 'ok  '} ${page.path} (${links.length} links)`);
    for (const link of wrongCase.slice(0, 5)) {
      console.log(`       ${link} -> ${redirectTarget(link)}`);
    }
    if (wrongCase.length > 5) console.log(`       … ${wrongCase.length - 5} more`);
    for (const link of deadLinks) console.log(`       ${link} (no such page)`);
    if (!hasState) console.log(`       no link to ${page.stateLink}`);
  };

  for (const page of SEED) await check(page);
  for (const page of discovered(seen)) await check(page);

  console.log(
    `\n${redirecting} redirecting links, ${dead} dead links, ${missingState} pages missing their state link, ${failed} pages failed to load`
  );
  process.exit(redirecting || dead || missingState || failed ? 1 : 0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
