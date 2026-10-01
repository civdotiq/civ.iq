/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Build src/data/state-governors.json: the sitting governor of every state
 * and territory, plus the mayor of the District of Columbia.
 *
 * Governors come from the National Governors Association's public pages
 * (nga.org/governors): one index page and one page per governor, 56 requests.
 * NGA doesn't cover DC, so its mayor comes from Wikidata's preferred-rank,
 * open-ended "head of government" statement. See
 * src/lib/data-sources/state-governors/parse-nga.ts for why not Wikidata
 * throughout.
 *
 * The file is rewritten only when a governor changes, so a weekly run that
 * finds nothing new leaves no diff. Any parse failure exits non-zero and
 * nothing is written: pages keep serving the last committed file.
 *
 * Usage:
 *   npx tsx scripts/sync-state-governors.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import {
  inOfficeSince,
  normalizeGovernorParty,
  parseNgaGovernorPage,
  parseNgaIndex,
} from '../src/lib/data-sources/state-governors/parse-nga';
import type {
  StateChiefExecutive,
  StateGovernorsFile,
} from '../src/lib/data-sources/state-governors';
import { getStateCode } from '../src/lib/data/us-states';

const OUT_PATH = resolve(process.cwd(), 'src/data/state-governors.json');
const NGA_INDEX = 'https://www.nga.org/governors/';
const USER_AGENT = 'CIV.IQ data sync (https://civdotiq.org)';
/** 50 states + AS, GU, MP, PR, VI. */
const EXPECTED_GOVERNORS = 55;

async function get(url: string, accept = 'text/html'): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: accept },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

async function fetchGovernors(): Promise<Record<string, StateChiefExecutive>> {
  const index = parseNgaIndex(await get(NGA_INDEX));
  if (index.length !== EXPECTED_GOVERNORS) {
    throw new Error(`NGA index lists ${index.length} governors, expected ${EXPECTED_GOVERNORS}`);
  }

  const out: Record<string, StateChiefExecutive> = {};
  for (const entry of index) {
    const code = getStateCode(entry.stateName);
    if (!code) throw new Error(`Unknown NGA state name: ${entry.stateName}`);
    if (out[code]) throw new Error(`Two NGA governors for ${code}`);

    const detail = parseNgaGovernorPage(await get(entry.url));
    const party = normalizeGovernorParty(detail.party);
    const since = inOfficeSince(detail.terms);
    if (!party || !since) {
      throw new Error(`${entry.url}: party=${party} inOfficeSince=${since}`);
    }
    out[code] = {
      title: 'Governor',
      name: entry.name,
      party,
      inOfficeSince: since,
      website: detail.website,
      sourceUrl: entry.url,
    };
    // Be polite: one request at a time with a short pause.
    await new Promise(r => setTimeout(r, 300));
  }
  return out;
}

interface SparqlBinding {
  [key: string]: { value: string } | undefined;
}

/** DC's mayor: Wikidata's preferred, open-ended "head of government" (P6). */
async function fetchDcMayor(): Promise<StateChiefExecutive> {
  const query = `SELECT ?person ?personLabel ?partyLabel ?start ?site WHERE {
    wd:Q61 p:P6 ?st . ?st ps:P6 ?person ; wikibase:rank wikibase:PreferredRank .
    FILTER NOT EXISTS { ?st pq:P582 ?end }
    OPTIONAL { ?st pq:P580 ?start }
    OPTIONAL { ?person wdt:P102 ?party }
    OPTIONAL { wd:Q61 wdt:P1313 ?office . ?office wdt:P856 ?site }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`;
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
  const body = JSON.parse(await get(url, 'application/sparql-results+json')) as {
    results?: { bindings?: SparqlBinding[] };
  };
  const rows = body.results?.bindings ?? [];
  const people = new Set(rows.map(r => r.person?.value));
  if (rows.length === 0 || people.size !== 1) {
    throw new Error(`Wikidata DC mayor: expected one current holder, got ${people.size}`);
  }
  const row = rows[0]!;
  const name = row.personLabel?.value;
  const qid = row.person?.value.split('/').pop();
  if (!name || !qid) throw new Error('Wikidata DC mayor: missing name');
  return {
    title: 'Mayor',
    name,
    party: normalizeGovernorParty(row.partyLabel?.value.replace(/\s+Party$/, '') ?? null),
    inOfficeSince: row.start?.value.slice(0, 10) ?? null,
    website: row.site?.value.replace(/^http:\/\//, 'https://') ?? null,
    sourceUrl: `https://www.wikidata.org/wiki/${qid}`,
  };
}

function readExisting(): StateGovernorsFile | null {
  try {
    return JSON.parse(readFileSync(OUT_PATH, 'utf8')) as StateGovernorsFile;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const [governors, dcMayor] = await Promise.all([fetchGovernors(), fetchDcMayor()]);
  const executives = Object.fromEntries(
    Object.entries({ ...governors, DC: dcMayor }).sort(([a], [b]) => a.localeCompare(b))
  );

  const existing = readExisting();
  if (existing && isDeepStrictEqual(existing.executives, executives)) {
    console.log(`No change: ${Object.keys(executives).length} executives, as of ${existing.asOf}`);
    return;
  }

  const file: StateGovernorsFile = {
    source:
      'National Governors Association (https://www.nga.org/governors/); District of Columbia mayor from Wikidata',
    asOf: new Date().toISOString().slice(0, 10),
    executives,
  };
  writeFileSync(OUT_PATH, JSON.stringify(file, null, 2) + '\n');

  const changed = Object.keys(executives).filter(
    code => !isDeepStrictEqual(existing?.executives[code], executives[code])
  );
  console.log(`Wrote ${OUT_PATH}: ${Object.keys(executives).length} executives`);
  console.log(`Changed: ${changed.join(', ') || '(new file)'}`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
