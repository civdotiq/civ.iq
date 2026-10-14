/**
 * Agent-doc link check — every URL we hand to AI agents must resolve.
 *
 * llms.txt once pointed agents at /ask/party-alignment/{id}, a template that
 * no longer existed, so every agent that followed it got a 404. This pulls
 * every civdotiq.org URL and URL pattern out of the agent-facing docs, fills
 * the placeholders with real ids, and requests each one from production.
 *
 * Sources:
 *   public/llms.txt, public/llms-full.txt   backticked paths, endpoint headings, absolute URLs
 *   public/openapi.json                     every GET operation (required params from examples)
 *   public/.well-known/mcp.json             websiteUrl / remotes
 *   live /ask page                          /ask/... hrefs it renders
 *
 * Every /api/ request bumps a production request counter (middleware), so a
 * full run adds ~60 to the day's API count. Requests carry the User-Agent
 * below so they can be told apart in logs.
 *
 * Usage:
 *   npx tsx scripts/check-agent-doc-links.ts                    # check production
 *   npx tsx scripts/check-agent-doc-links.ts --base http://localhost:3000
 *   npx tsx scripts/check-agent-doc-links.ts --list             # print URLs, fetch nothing
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getAllTemplates,
  slugifyPolicyArea,
  type QuestionTemplate,
} from '../src/lib/questions/question-registry';

const ROOT = join(__dirname, '..');
const USER_AGENT = 'civiq-agent-doc-link-check/1.0';
const TIMEOUT_MS = 60_000;
const CONCURRENCY = 3;

// Real ids used to fill {placeholders}. P000197 = Nancy Pelosi.
const FILL: Record<string, string> = {
  bioguideId: 'P000197',
  id: 'P000197',
  billId: '119-hr-1',
  voteId: 'house-119-116',
  districtId: 'MI-12',
  'ST-NN': 'MI-12',
  committeeId: 'HSAG',
  state: 'mi',
  sector: 'defense',
  nodeId: 'rep:P000197',
  candidateId: 'H8CA05035',
  zip: '48226',
  query: 'healthcare',
  topic: 'health',
};

// Patterns whose placeholders don't fill independently — use the doc's own example.
const PATTERN_OVERRIDES: Record<string, string> = {
  '/bill/{congress}-{type}-{number}': '/bill/119-hr-1',
  '/vote/{chamber}-{congress}-{session}-{rollNumber}': '/vote/senate-119-2-1',
  '/state-legislature/{state}/legislator/{name}-{id}':
    '/state-legislature/mi/legislator/winnie-brinks-de38477b',
  '/mesh/embed/{type}/{id}': '/mesh/embed/scorecard/P000197',
  '/api/mesh/embed/{type}/{id}': '/api/mesh/embed/scorecard/P000197',
  // These 404 by design for members without committee seats (Pelosi has none).
  '/api/intelligence/representative/{bioguideId}/finance-jurisdiction':
    '/api/intelligence/representative/T000481/finance-jurisdiction',
  '/api/intelligence/representative/{bioguideId}/stock-trades':
    '/api/intelligence/representative/G000583/stock-trades',
};

// Required query params with no usable example in the OpenAPI spec.
const QUERY_OVERRIDES: Record<string, Record<string, string>> = {
  '/state-legislators-by-address': {
    street: '100 N Capitol Ave',
    city: 'Lansing',
    state: 'MI',
    zip: '48933',
  },
};

// Documented non-200s: /v1/analytics is bearer-token only (openapi.json security).
const EXPECTED_STATUS: Record<string, number> = {
  '/api/v1/analytics': 401,
};

// The MCP endpoint speaks JSON-RPC over POST; a bare GET is not a meaningful check.
const SKIP_PATHS = new Set(['/api/mcp']);

const ENTITY_FILL: Record<QuestionTemplate['entityType'], string> = {
  representative: 'P000197',
  committee: 'HSAG',
  topic: slugifyPolicyArea('Health'),
};

function parseArgs(): { base: string; listOnly: boolean } {
  const args = process.argv.slice(2);
  const baseIdx = args.indexOf('--base');
  const base = baseIdx >= 0 && args[baseIdx + 1] ? args[baseIdx + 1] : 'https://civdotiq.org';
  return { base: base.replace(/\/$/, ''), listOnly: args.includes('--list') };
}

function readPublic(file: string): string {
  return readFileSync(join(ROOT, 'public', file), 'utf8');
}

/** Paths and absolute civdotiq.org URLs mentioned in an llms*.txt file. */
function extractFromLlmsText(text: string): string[] {
  const found: string[] = [];
  // `GET /api/...` or `/path` inside backticks
  for (const m of text.matchAll(/`(?:GET )?(\/[^`\s]*)`/g)) found.push(m[1]!);
  // ### GET /api/... headings
  for (const m of text.matchAll(/^#+ GET (\/\S+)/gm)) found.push(m[1]!);
  // absolute URLs; markdown links end at ](
  for (const m of text.matchAll(/https:\/\/civdotiq\.org(\/[^\s`)"'<>\]]*)?/g)) {
    found.push(m[1] ?? '/');
  }
  return found;
}

/** `/ask/{anything}/{anything}` generic patterns expand to every registry template. */
function expandAskPattern(path: string): string[] | null {
  if (!/^\/ask\/\{[^}]+\}\/\{[^}]+\}$/.test(path)) return null;
  return getAllTemplates().map(t => `/ask/${t.slug}/${ENTITY_FILL[t.entityType]}`);
}

/** Fill placeholders; null when a placeholder has no known value. */
function fillPath(path: string): string | null {
  if (PATTERN_OVERRIDES[path]) return PATTERN_OVERRIDES[path]!;
  let filled = '';
  let rest = path;
  for (let open = rest.indexOf('{'); open >= 0; open = rest.indexOf('{')) {
    const close = rest.indexOf('}', open);
    if (close < 0) break;
    const value = FILL[rest.slice(open + 1, close)];
    if (value === undefined) return null;
    filled += rest.slice(0, open) + value;
    rest = rest.slice(close + 1);
  }
  return filled + rest;
}

/** An OpenAPI example usable in a URL, or null when absent/empty/non-scalar. */
function scalarExample(example: unknown): string | null {
  if (typeof example === 'string') return example === '' ? null : example;
  if (typeof example === 'number' || typeof example === 'boolean') return String(example);
  return null;
}

function extractFromOpenApi(): string[] {
  const spec = JSON.parse(readPublic('openapi.json')) as {
    servers: Array<{ url: string }>;
    paths: Record<
      string,
      Record<
        string,
        {
          parameters?: Array<{
            name: string;
            in: string;
            required?: boolean;
            example?: unknown;
            schema?: { example?: unknown; enum?: unknown[] };
          }>;
        }
      >
    >;
  };
  const prefix = new URL(spec.servers[0]!.url).pathname.replace(/\/$/, '');
  const out: string[] = [];
  for (const [path, ops] of Object.entries(spec.paths)) {
    const get = ops.get;
    if (!get) continue;
    let filled = path;
    const query = new URLSearchParams();
    for (const p of get.parameters ?? []) {
      const example = scalarExample(p.example ?? p.schema?.example ?? p.schema?.enum?.[0]);
      if (example === null) continue;
      if (p.in === 'path') filled = filled.replace(`{${p.name}}`, example);
      else if (p.in === 'query' && p.required) query.set(p.name, example);
    }
    for (const [k, v] of Object.entries(QUERY_OVERRIDES[path] ?? {})) query.set(k, v);
    const qs = query.toString();
    out.push(prefix + filled + (qs ? '?' + qs : ''));
  }
  return out;
}

function extractFromMcpManifest(): string[] {
  const manifest = JSON.parse(readPublic('.well-known/mcp.json')) as {
    websiteUrl?: string;
    remotes?: Array<{ url: string }>;
  };
  return [manifest.websiteUrl, ...(manifest.remotes ?? []).map(r => r.url)]
    .filter((u): u is string => typeof u === 'string' && u.startsWith('https://civdotiq.org'))
    .map(u => new URL(u).pathname);
}

async function extractFromAskPage(base: string): Promise<string[]> {
  const res = await fetch(`${base}/ask`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const html = await res.text();
  return [...html.matchAll(/href="(\/ask\/[^"#]+)"/g)].map(m => m[1]!.replace(/&amp;/g, '&'));
}

interface Result {
  url: string;
  status: number | string;
  note: string;
  sources: string[];
}

async function check(
  base: string,
  path: string
): Promise<{ status: number | string; note: string }> {
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await res.arrayBuffer();
    const note = res.redirected ? `via redirect → ${new URL(res.url).pathname}` : '';
    return { status: res.status, note };
  } catch (err) {
    const status = err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : String(err);
    return { status, note: '' };
  }
}

interface Targets {
  /** URL path → the docs that mention it */
  targets: Map<string, Set<string>>;
  skipped: Array<{ path: string; source: string; reason: string }>;
}

async function collectTargets(base: string, includeLivePages: boolean): Promise<Targets> {
  const targets = new Map<string, Set<string>>();
  const skipped: Targets['skipped'] = [];
  const skippedKeys = new Set<string>();

  const skip = (path: string, source: string, reason: string): void => {
    const key = `${path}|${source}`;
    if (skippedKeys.has(key)) return;
    skippedKeys.add(key);
    skipped.push({ path, source, reason });
  };

  const addFilled = (path: string, source: string): void => {
    if (SKIP_PATHS.has(path)) return skip(path, source, 'JSON-RPC POST endpoint');
    const sources = targets.get(path) ?? new Set<string>();
    sources.add(source);
    targets.set(path, sources);
  };

  const add = (raw: string, source: string): void => {
    const path = raw.split('#')[0]!;
    if (path === '/api/' || path.endsWith('/...')) return; // prose, not a URL
    const expanded = expandAskPattern(path);
    if (expanded) return expanded.forEach(p => addFilled(p, source));
    const filled = fillPath(path);
    if (filled === null) return skip(path, source, 'no fill value for placeholder');
    addFilled(filled, source);
  };

  for (const file of ['llms.txt', 'llms-full.txt']) {
    for (const p of extractFromLlmsText(readPublic(file))) add(p, file);
  }
  for (const p of extractFromOpenApi()) add(p, 'openapi.json');
  for (const p of extractFromMcpManifest()) add(p, 'mcp.json');
  if (includeLivePages) {
    for (const p of await extractFromAskPage(base)) add(p, '/ask page');
  }
  return { targets, skipped };
}

/** Request every path, CONCURRENCY at a time. */
async function checkAll(base: string, targets: Targets['targets']): Promise<Result[]> {
  const paths = [...targets.keys()];
  const results: Result[] = [];
  const worker = async (): Promise<void> => {
    const path = paths.shift();
    if (path === undefined) return;
    const { status, note } = await check(base, path);
    results.push({ url: path, status, note, sources: [...(targets.get(path) ?? [])] });
    return worker();
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results.sort((a, b) => a.url.localeCompare(b.url));
}

function printSkipped(skipped: Targets['skipped']): void {
  if (skipped.length === 0) return;
  console.log('\nSkipped:');
  for (const s of skipped) console.log(`  ${s.path}  [${s.source}] ${s.reason}`);
}

async function main(): Promise<void> {
  const { base, listOnly } = parseArgs();
  const { targets, skipped } = await collectTargets(base, !listOnly);

  if (listOnly) {
    const paths = [...targets.keys()].sort((a, b) => a.localeCompare(b));
    for (const p of paths) console.log(`${p}  [${[...targets.get(p)!].join(', ')}]`);
    printSkipped(skipped);
    return;
  }

  console.log(`Checking ${targets.size} URLs against ${base} …\n`);
  const results = await checkAll(base, targets);
  const isOk = (r: Result): boolean => r.status === (EXPECTED_STATUS[r.url] ?? 200);
  const bad = results.filter(r => !isOk(r));
  for (const r of results) {
    const mark = isOk(r) ? 'ok ' : 'BAD';
    const note = r.note ? ` (${r.note})` : '';
    console.log(`${mark} ${String(r.status).padEnd(5)} ${r.url}${note}  [${r.sources.join(', ')}]`);
  }
  printSkipped(skipped);
  console.log(`\n${results.length - bad.length}/${results.length} returned their expected status.`);
  if (bad.length) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
