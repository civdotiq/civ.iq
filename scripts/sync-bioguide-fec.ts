/**
 * Bioguide → FEC Mapping Sync
 *
 * Primary source: `legislators-current.yaml` from the
 * `unitedstates/congress-legislators` project — has authoritative bioguide↔FEC
 * links curated by the maintainers.
 *
 * Secondary source: Congress.gov `/member` endpoint (current membership).
 * When a member seated in Congress.gov is missing from the YAML (typical
 * 1–2 week lag after a new election or appointment), the script reaches to
 * FEC's `/candidates/search/` endpoint with name+state+party+office to
 * propose a match. Each proposal is scored; high-confidence matches are
 * auto-added, low-confidence matches are listed in the script output so a
 * human can resolve them in the review PR.
 *
 * Canonical source of truth: packages/entity-resolution/data/bioguide-fec-mapping.json
 * (the @civiq/entity-resolution package imports this file directly; the app
 * re-exports through the package via src/lib/data/bioguide-fec-mapping.ts).
 *
 * Runs weekly via .github/workflows/sync-bioguide-fec.yml and opens a PR when
 * the mapping drifts so a human reviews before merge.
 *
 * Usage:
 *   npx tsx scripts/sync-bioguide-fec.ts                    # write updated JSON
 *   npx tsx scripts/sync-bioguide-fec.ts --dry-run          # preview, no write
 *   npx tsx scripts/sync-bioguide-fec.ts --fixture PATH     # parse a local YAML file
 *   npx tsx scripts/sync-bioguide-fec.ts --no-fec-fallback  # skip FEC search
 *   npx tsx scripts/sync-bioguide-fec.ts --no-congress      # skip Congress.gov
 *
 * Environment: FEC_API_KEY and CONGRESS_API_KEY enable the two fallback
 * paths. When absent, the script still runs but only from YAML data.
 *
 * Sources: https://github.com/unitedstates/congress-legislators
 *          https://api.congress.gov/
 *          https://api.open.fec.gov/
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import yaml from 'js-yaml';

dotenv.config({ path: '.env.local' });

const LEGISLATORS_URL =
  'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml';

const PACKAGE_JSON_PATH = path.join(
  process.cwd(),
  'packages/entity-resolution/data/bioguide-fec-mapping.json'
);

export const FEC_ID_FORMAT = /^[HSP]\d[A-Z]{2}\d{5}$/;

interface LegislatorTerm {
  type: 'rep' | 'sen';
  state: string;
  district?: string | number;
  party?: string;
  start: string;
  end: string;
}

export interface Legislator {
  id: {
    bioguide: string;
    fec?: string[];
    [key: string]: unknown;
  };
  name: {
    first: string;
    last: string;
    official_full?: string;
  };
  terms: LegislatorTerm[];
}

export interface FECMapping {
  fecId: string;
  name: string;
  state: string;
  district?: string;
  office: 'H' | 'S';
  lastUpdated: string;
}

export type MappingFile = Record<string, FECMapping>;

async function fetchLegislatorsYaml(): Promise<string> {
  const res = await fetch(LEGISLATORS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch legislators-current.yaml: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/**
 * Verified FEC candidate IDs for current members whose congress-legislators
 * `ids.fec` array is missing or stale upstream. Each was confirmed against the
 * FEC `/candidates/search/` endpoint (name + state + district + recent
 * election_years) on 2026-07-17. Applied with the HIGHEST precedence so it
 * corrects stale upstream IDs too — e.g. Mullin, whose YAML still lists only his
 * defunct House ID (H2OK02083) after moving to the Senate. Remove an entry once
 * the upstream YAML carries the correct current-office ID.
 */
export const MANUAL_FEC_OVERRIDES: Record<string, string> = {
  M001190: 'S2OK00186', // Markwayne Mullin, OK-Sen (YAML has only stale House H2OK02083)
};

export function buildMappingFromLegislators(
  legislators: Legislator[],
  now: Date = new Date()
): {
  mappings: MappingFile;
  skippedNoFec: number;
  skippedInvalidFec: string[];
} {
  const mappings: MappingFile = {};
  let skippedNoFec = 0;
  const skippedInvalidFec: string[] = [];

  for (const legislator of legislators) {
    const bioguideId = legislator.id?.bioguide;
    if (!bioguideId) continue;

    const overrideFecId = MANUAL_FEC_OVERRIDES[bioguideId];
    const fecIds = legislator.id.fec ?? [];
    if (fecIds.length === 0 && !overrideFecId) {
      skippedNoFec++;
      continue;
    }

    const currentTerm = legislator.terms[legislator.terms.length - 1];
    if (!currentTerm) continue;

    const office: 'H' | 'S' = currentTerm.type === 'rep' ? 'H' : 'S';

    // congress-legislators stores all historical FEC IDs in an arbitrary
    // order. Prefer the ID whose office prefix matches the current term so
    // veteran members (House → Senate) get their active Senate ID rather
    // than a stale House one. Fall back to the first valid entry otherwise.
    const officeMatch = fecIds.find(
      id => typeof id === 'string' && id.startsWith(office) && FEC_ID_FORMAT.test(id)
    );
    const firstValid = fecIds.find(id => typeof id === 'string' && FEC_ID_FORMAT.test(id));
    // Manual override wins over upstream IDs so a stale current-office ID is corrected.
    const fecId = overrideFecId ?? officeMatch ?? firstValid;

    if (!fecId || !FEC_ID_FORMAT.test(fecId)) {
      // Surface the raw first entry so maintainers can see which upstream
      // value is malformed instead of an opaque "(missing)".
      const rawSample = fecIds.find(id => typeof id === 'string') ?? '(missing)';
      skippedInvalidFec.push(`${bioguideId}:${rawSample}`);
      continue;
    }
    const name = `${legislator.name.last.toUpperCase()}, ${legislator.name.first.toUpperCase()}`;

    // Key order (fecId, name, state, district?, office, lastUpdated) matches
    // the historical file layout so diffs stay focused on real changes.
    const entry: FECMapping = {
      fecId,
      name,
      state: currentTerm.state,
      ...(office === 'H' && currentTerm.district !== undefined && currentTerm.district !== null
        ? { district: String(currentTerm.district).padStart(2, '0') }
        : {}),
      office,
      lastUpdated: now.toISOString().slice(0, 10),
    };

    mappings[bioguideId] = entry;
  }

  return { mappings, skippedNoFec, skippedInvalidFec };
}

function readExisting(targetPath: string): MappingFile | null {
  if (!fs.existsSync(targetPath)) return null;
  const raw = fs.readFileSync(targetPath, 'utf8');
  return JSON.parse(raw) as MappingFile;
}

export function mergeWithExisting(fresh: MappingFile, existing: MappingFile | null): MappingFile {
  if (!existing) return fresh;

  // Preserve the existing `lastUpdated` on entries whose core fields are
  // unchanged. Otherwise entries rotate daily with no real signal.
  const merged: MappingFile = {};
  for (const [bioguideId, freshEntry] of Object.entries(fresh)) {
    const prior = existing[bioguideId];
    if (
      prior &&
      prior.fecId === freshEntry.fecId &&
      prior.name === freshEntry.name &&
      prior.state === freshEntry.state &&
      (prior.district ?? '') === (freshEntry.district ?? '') &&
      prior.office === freshEntry.office
    ) {
      merged[bioguideId] = { ...freshEntry, lastUpdated: prior.lastUpdated };
    } else {
      merged[bioguideId] = freshEntry;
    }
  }
  return merged;
}

export function summarizeDiff(
  fresh: MappingFile,
  existing: MappingFile | null
): {
  added: string[];
  removed: string[];
  updated: string[];
} {
  const added: string[] = [];
  const removed: string[] = [];
  const updated: string[] = [];

  if (!existing) return { added: Object.keys(fresh), removed, updated };

  for (const [id, entry] of Object.entries(fresh)) {
    const prior = existing[id];
    if (!prior) {
      added.push(id);
      continue;
    }
    if (
      prior.fecId !== entry.fecId ||
      prior.name !== entry.name ||
      prior.state !== entry.state ||
      (prior.district ?? '') !== (entry.district ?? '') ||
      prior.office !== entry.office
    ) {
      updated.push(id);
    }
  }
  for (const id of Object.keys(existing)) {
    if (!(id in fresh)) removed.push(id);
  }
  return { added, removed, updated };
}

export function serialize(mapping: MappingFile): string {
  // Sorted by bioguide ID for stable diffs.
  const sorted: MappingFile = Object.fromEntries(
    Object.entries(mapping).sort(([a], [b]) => a.localeCompare(b))
  );
  return JSON.stringify(sorted, null, 2) + '\n';
}

// ───────────────────────────────────────────────────────────────────────
// Congress.gov membership cross-check + FEC candidate search fallback
// ───────────────────────────────────────────────────────────────────────

export interface CongressMember {
  bioguideId: string;
  name: string; // "Last, First" format
  state: string;
  district?: string;
  party?: string;
  chamber: 'House' | 'Senate';
}

export interface FECCandidateSearchResult {
  candidate_id: string;
  name: string;
  state: string;
  district?: string;
  party: string;
  office: string;
  candidate_status?: string;
  last_file_date?: string;
  incumbent_challenge?: string;
}

export interface FallbackProposal {
  bioguideId: string;
  congressMember: CongressMember;
  fecCandidate: FECCandidateSearchResult | null;
  confidence: number;
  confidenceBreakdown: Record<string, number>;
  autoApplied: boolean;
}

const CONFIDENCE_AUTO_APPLY_THRESHOLD = 0.9;

function normalizeName(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z\s,.'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const STATE_NAME_TO_CODE: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
  'District of Columbia': 'DC',
  'Puerto Rico': 'PR',
  'Virgin Islands': 'VI',
  Guam: 'GU',
  'American Samoa': 'AS',
  'Northern Mariana Islands': 'MP',
};

export function normalizeStateCode(raw: string): string {
  if (!raw) return raw;
  // Already a 2-letter code?
  if (/^[A-Z]{2}$/.test(raw)) return raw;
  return STATE_NAME_TO_CODE[raw] ?? raw;
}

function splitLastFirst(name: string): { last: string; first: string } {
  const [last = '', firstRest = ''] = name.split(',').map(s => s.trim());
  const first = firstRest.split(/\s+/)[0] ?? '';
  return { last: normalizeName(last), first: normalizeName(first) };
}

/**
 * All normalized given-name tokens (everything after the comma). FEC records the
 * full legal name — e.g. "GONZALES, ERNEST ANTHONY TONY II" — so a member's
 * common first name ("Tony") often appears here as a non-leading token.
 */
function givenNameTokens(name: string): string[] {
  const firstRest = name.split(',')[1] ?? '';
  return normalizeName(firstRest).split(/\s+/).filter(Boolean);
}

/**
 * Score an FEC candidate against a Congress.gov member. Returns a value in
 * [0, 1] plus a per-feature breakdown for transparency in the review output.
 */
export function scoreFecMatch(
  member: CongressMember,
  fec: FECCandidateSearchResult
): { score: number; breakdown: Record<string, number> } {
  const memberParts = splitLastFirst(member.name);
  const fecParts = splitLastFirst(fec.name);

  const breakdown: Record<string, number> = {};

  breakdown.lastName = memberParts.last && memberParts.last === fecParts.last ? 0.4 : 0;

  // First name is the weakest identifier: FEC frequently records a legal first
  // name, middle names, or a suffix where Congress.gov uses a nickname
  // (e.g. "Tony" vs "ERNEST ANTHONY TONY II"). Grade it instead of demanding an
  // exact leading-token match, so an otherwise-perfect match (last + state +
  // office + party = 0.8) is no longer capped just under the 0.9 auto-apply
  // threshold. Exact match keeps its full weight; a name that only shares an
  // initial stays below the threshold so ambiguous matches still go to review.
  if (!memberParts.first) {
    breakdown.firstName = 0;
  } else if (memberParts.first === fecParts.first) {
    breakdown.firstName = 0.2; // exact primary given-name match
  } else if (givenNameTokens(fec.name).includes(memberParts.first)) {
    breakdown.firstName = 0.15; // member's name appears among FEC given names (nickname/middle)
  } else if (fecParts.first && memberParts.first[0] === fecParts.first[0]) {
    breakdown.firstName = 0.05; // initials agree only — insufficient to auto-apply alone
  } else {
    breakdown.firstName = 0;
  }

  breakdown.state = member.state && member.state === fec.state ? 0.1 : 0;

  const expectedOffice = member.chamber === 'Senate' ? 'S' : 'H';
  breakdown.office = fec.office === expectedOffice ? 0.2 : 0;

  // Party: FEC uses "REP"/"DEM"/"IND"/etc.; Congress.gov uses "Republican",
  // "Democratic", "Independent". Normalize to first letter after removing
  // the "ic" suffix variants.
  const normParty = (p?: string): string => {
    if (!p) return '';
    const up = p.toUpperCase();
    if (up.startsWith('DEM')) return 'DEM';
    if (up.startsWith('REP')) return 'REP';
    if (up.startsWith('IND')) return 'IND';
    return up.slice(0, 3);
  };
  breakdown.party =
    normParty(member.party) && normParty(member.party) === normParty(fec.party) ? 0.1 : 0;

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score: Math.min(1, score), breakdown };
}

/**
 * Pick the best FEC candidate for a given Congress.gov member. Returns null
 * if no candidate is returned by the API.
 */
export function pickBestFecMatch(
  member: CongressMember,
  fecResults: FECCandidateSearchResult[]
): {
  candidate: FECCandidateSearchResult;
  score: number;
  breakdown: Record<string, number>;
} | null {
  if (fecResults.length === 0) return null;

  // Filter to valid FEC IDs and prefer candidates whose most recent filing is
  // recent (active) — this breaks ties between same-name candidates across
  // historical cycles.
  const scored = fecResults
    .filter(c => FEC_ID_FORMAT.test(c.candidate_id))
    .map(c => ({
      candidate: c,
      ...scoreFecMatch(member, c),
      filingRecency: c.last_file_date ? Date.parse(c.last_file_date) : 0,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.filingRecency - a.filingRecency;
    });

  return scored[0] ? { ...scored[0] } : null;
}

async function fetchCongressMembers(apiKey: string): Promise<CongressMember[]> {
  // Congress.gov member endpoint. `currentMember=true` filters to active
  // members; pagination via `limit` + `offset`. 250 is the maximum limit.
  const members: CongressMember[] = [];
  let offset = 0;
  const limit = 250;

  // Loop is bounded by total count returned in the first page.
  let totalKnown = Infinity;
  while (offset < totalKnown) {
    const url =
      `https://api.congress.gov/v3/member?currentMember=true&limit=${limit}` +
      `&offset=${offset}&format=json&api_key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Congress.gov /member ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      members?: Array<{
        bioguideId: string;
        name: string;
        state: string;
        district?: number;
        partyName?: string;
        terms?: { item: Array<{ chamber: string }> };
      }>;
      pagination?: { count?: number };
    };
    const count = data.pagination?.count ?? 0;
    totalKnown = count;

    for (const m of data.members ?? []) {
      const lastTerm = m.terms?.item?.[m.terms.item.length - 1];
      const chamber =
        lastTerm?.chamber === 'Senate' || lastTerm?.chamber === 'Senate of the United States'
          ? 'Senate'
          : 'House';
      members.push({
        bioguideId: m.bioguideId,
        name: m.name,
        state: normalizeStateCode(m.state),
        district: m.district !== undefined ? String(m.district).padStart(2, '0') : undefined,
        party: m.partyName,
        chamber,
      });
    }

    if ((data.members ?? []).length < limit) break;
    offset += limit;
  }
  return members;
}

async function searchFecCandidates(
  apiKey: string,
  member: CongressMember
): Promise<FECCandidateSearchResult[]> {
  const { last, first } = splitLastFirst(member.name);
  const q = `${last} ${first}`.trim();
  const office = member.chamber === 'Senate' ? 'S' : 'H';

  const url =
    `https://api.open.fec.gov/v1/candidates/search/` +
    `?q=${encodeURIComponent(q)}&state=${member.state}&office=${office}` +
    `&per_page=20&sort=-load_date&api_key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) {
      // Treat 429 as empty — weekly sync can tolerate transient rate limits.
      return [];
    }
    throw new Error(`FEC candidate search ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { results?: FECCandidateSearchResult[] };
  return data.results ?? [];
}

/**
 * For each current Congress.gov member absent from the YAML-derived mapping,
 * query FEC and propose a match. High-confidence proposals are returned in
 * `autoApplied: true` so the caller can fold them into the mapping; the rest
 * are returned for human review.
 */
export async function proposeFallbackMappings(
  baseMapping: MappingFile,
  congressMembers: CongressMember[],
  search: (m: CongressMember) => Promise<FECCandidateSearchResult[]>,
  now: Date = new Date()
): Promise<FallbackProposal[]> {
  const proposals: FallbackProposal[] = [];
  const dateString = now.toISOString().slice(0, 10);

  for (const member of congressMembers) {
    if (baseMapping[member.bioguideId]) continue;

    let results: FECCandidateSearchResult[] = [];
    try {
      results = await search(member);
    } catch (error) {
      console.warn(
        `[sync] FEC search failed for ${member.bioguideId} (${member.name}): ${(error as Error).message}`
      );
    }

    const best = pickBestFecMatch(member, results);
    const confidence = best?.score ?? 0;
    const autoApplied = confidence >= CONFIDENCE_AUTO_APPLY_THRESHOLD && best !== null;

    proposals.push({
      bioguideId: member.bioguideId,
      congressMember: member,
      fecCandidate: best?.candidate ?? null,
      confidence,
      confidenceBreakdown: best?.breakdown ?? {},
      autoApplied,
    });

    if (autoApplied && best) {
      const entry: FECMapping = {
        fecId: best.candidate.candidate_id,
        name: member.name.toUpperCase(),
        state: member.state,
        ...(member.chamber === 'House' && member.district ? { district: member.district } : {}),
        office: member.chamber === 'Senate' ? 'S' : 'H',
        lastUpdated: dateString,
      };
      baseMapping[member.bioguideId] = entry;
    }
  }

  return proposals;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipFecFallback = args.includes('--no-fec-fallback');
  const skipCongressCheck = args.includes('--no-congress');
  const fixtureIdx = args.indexOf('--fixture');
  const fixture = fixtureIdx >= 0 ? args[fixtureIdx + 1] : null;

  const yamlText = fixture ? fs.readFileSync(fixture, 'utf8') : await fetchLegislatorsYaml();
  const parsed = yaml.load(yamlText) as Legislator[];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    console.error('Parsed zero legislators — aborting to avoid wiping the mapping.');
    process.exit(1);
  }

  const { mappings: fresh, skippedNoFec, skippedInvalidFec } = buildMappingFromLegislators(parsed);

  const entryCount = Object.keys(fresh).length;
  if (entryCount < 400) {
    // Sanity floor — a healthy Congress + recent past members is always ≥500.
    console.error(
      `Only ${entryCount} mappings parsed — aborting to avoid wiping the file. ` +
        `Check the upstream YAML.`
    );
    process.exit(1);
  }

  // Congress.gov cross-check + FEC candidate search fallback for members not
  // yet in congress-legislators.
  const congressKey = process.env.CONGRESS_API_KEY || process.env.CONGRESS_GOV_API_KEY;
  const fecKey = process.env.FEC_API_KEY;
  let fallbackProposals: FallbackProposal[] = [];

  if (!skipCongressCheck && congressKey) {
    try {
      const members = await fetchCongressMembers(congressKey);
      console.log(`Congress.gov reports ${members.length} currently seated members.`);
      const missing = members.filter(m => !fresh[m.bioguideId]);
      console.log(
        `Missing from YAML: ${missing.length} member(s)${missing.length > 0 ? ` — ${missing.map(m => m.bioguideId).join(', ')}` : ''}`
      );

      if (missing.length > 0 && !skipFecFallback && fecKey) {
        console.log(`Querying FEC candidate search to resolve missing members…`);
        fallbackProposals = await proposeFallbackMappings(fresh, missing, m =>
          searchFecCandidates(fecKey, m)
        );
        const auto = fallbackProposals.filter(p => p.autoApplied);
        const needReview = fallbackProposals.filter(p => !p.autoApplied);
        console.log(`  Auto-applied (confidence ≥ 0.9): ${auto.length}`);
        console.log(`  Needs human review: ${needReview.length}`);
        for (const p of needReview) {
          console.warn(
            `    ${p.bioguideId} (${p.congressMember.name}, ${p.congressMember.state}) — ` +
              `best match ${p.fecCandidate?.candidate_id ?? 'NONE'} @ ${p.confidence.toFixed(2)}`
          );
        }
      } else if (missing.length > 0) {
        console.warn(
          `  Skipping FEC fallback (${skipFecFallback ? '--no-fec-fallback' : 'no FEC_API_KEY'}). ` +
            `These bioguide IDs will not resolve until congress-legislators catches up.`
        );
      }
    } catch (error) {
      console.warn(
        `Congress.gov membership check failed — continuing with YAML-only sync. ` +
          `Error: ${(error as Error).message}`
      );
    }
  } else if (!skipCongressCheck) {
    console.log(
      'No CONGRESS_API_KEY set — skipping current-membership cross-check. ' +
        'Syncing from congress-legislators YAML only.'
    );
  }

  const existing = readExisting(PACKAGE_JSON_PATH);
  const merged = mergeWithExisting(fresh, existing);
  const diff = summarizeDiff(merged, existing);

  console.log(
    `Parsed ${parsed.length} legislators → ${Object.keys(fresh).length} FEC mappings ` +
      `(skipped ${skippedNoFec} without FEC ID, ${skippedInvalidFec.length} invalid).`
  );
  if (skippedInvalidFec.length > 0) {
    console.warn('Invalid FEC IDs:', skippedInvalidFec.join(', '));
  }
  console.log(
    `Diff vs existing: +${diff.added.length} added, -${diff.removed.length} removed, ` +
      `~${diff.updated.length} updated.`
  );
  if (diff.added.length > 0) console.log('  Added:', diff.added.join(', '));
  if (diff.removed.length > 0) console.log('  Removed:', diff.removed.join(', '));
  if (diff.updated.length > 0) console.log('  Updated:', diff.updated.join(', '));

  if (fallbackProposals.length > 0) {
    console.log(`\n### FEC candidate search proposals ###`);
    for (const p of fallbackProposals) {
      const tag = p.autoApplied ? '[auto]' : '[review]';
      const fecId = p.fecCandidate?.candidate_id ?? 'NONE';
      const breakdown = Object.entries(p.confidenceBreakdown)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');
      console.log(
        `  ${tag} ${p.bioguideId} ${p.congressMember.name} (${p.congressMember.state}) → ${fecId} ` +
          `confidence=${p.confidence.toFixed(2)} [${breakdown}]`
      );
    }
  }

  const serialized = serialize(merged);

  if (dryRun) {
    console.log('--dry-run: not writing output.');
    return;
  }

  const priorRaw = fs.existsSync(PACKAGE_JSON_PATH)
    ? fs.readFileSync(PACKAGE_JSON_PATH, 'utf8')
    : null;
  if (priorRaw === serialized) {
    console.log('No changes.');
    return;
  }
  fs.writeFileSync(PACKAGE_JSON_PATH, serialized);
  console.log(`Wrote ${PACKAGE_JSON_PATH}`);
}

// Only run when invoked as a script. Leaving `main()` untriggered when the
// module is imported lets the unit tests exercise the pure functions above
// without forcing a network fetch or writing to disk.
const isDirectInvocation = (() => {
  const entry = process.argv[1] ?? '';
  return entry.endsWith('sync-bioguide-fec.ts') || entry.endsWith('sync-bioguide-fec.js');
})();

if (isDirectInvocation) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
