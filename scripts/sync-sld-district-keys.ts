/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Build src/data/sld-district-keys.json: Census state legislative district
 * GEOID → the district string the OpenStates roster corpus uses. See
 * src/lib/data-sources/sld-district-keys/build-keys.ts for why.
 *
 * Source: the Census 2020 relationship files for the 2024 state legislative
 * districts (the vintage the geocoder serves for sitting officeholders until
 * 2027-01-03, see src/lib/census-vintage.ts). They are ZCTA crosswalks; only
 * their district GEOID and NAMELSAD columns are used here.
 *
 * Re-run after `npm run sync:openstates-people` changes district strings, and
 * when the geocoder's sitting-officeholder SLD vintage moves.
 *
 * Usage:
 *   npx tsx scripts/sync-sld-district-keys.ts [--dir PATH]
 *
 * --dir reads already-downloaded tab20_sld{u,l}202420_zcta520_natl.txt files.
 * Exits non-zero when a Census district outside KNOWN_GAPS can't be mapped.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildSldDistrictKeys } from '../src/lib/data-sources/sld-district-keys/build-keys';
import type { CensusSld, SldChamber } from '../src/lib/data-sources/sld-district-keys/build-keys';
import {
  getAllPeople,
  getPeopleCorpusStatus,
} from '../src/lib/data-sources/openstates-people/load-people';
import { STATE_FIPS_TO_CODE } from '../src/lib/data/us-states';

const VINTAGE = '2024';
const BASE = 'https://www2.census.gov/geo/docs/maps-data/data/rel2020/cd-sld';
const FILES: Record<SldChamber, string> = {
  upper: `tab20_sldu${VINTAGE}20_zcta520_natl.txt`,
  lower: `tab20_sldl${VINTAGE}20_zcta520_natl.txt`,
};
const OUT_PATH = resolve(process.cwd(), 'src/data/sld-district-keys.json');

/**
 * Chambers whose Census districts can't all be named from the corpus, and why.
 * The lookup still shows the district; it just can't list the members.
 */
const KNOWN_GAPS: Record<string, string> = {
  'NH-lower':
    'Floterial districts overlay the base districts; the Census layer has 165 districts, the corpus 199.',
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function readRelationshipFile(file: string): Promise<string> {
  const dir = arg('--dir');
  if (dir) return readFileSync(join(dir, file), 'utf8');
  const res = await fetch(`${BASE}/${file}`, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.text();
}

/** Unique (GEOID, NAMELSAD) pairs; rows with no district (water, ZZZ) are skipped. */
function parseDistricts(text: string, chamber: SldChamber): CensusSld[] {
  const seen = new Map<string, CensusSld>();
  for (const line of text.split('\n').slice(1)) {
    const [, geoid, name] = line.split('|');
    if (!geoid || !name || /ZZZ$/.test(geoid)) continue;
    if (!seen.has(geoid)) seen.set(geoid, { geoid, name: name.trim(), chamber });
  }
  return [...seen.values()];
}

async function main(): Promise<void> {
  const census: CensusSld[] = [];
  for (const chamber of ['upper', 'lower'] as const) {
    census.push(...parseDistricts(await readRelationshipFile(FILES[chamber]), chamber));
  }

  const all = await getAllPeople();
  const status = await getPeopleCorpusStatus();
  if (!all || !status) throw new Error('OpenStates people corpus unavailable');

  const corpus = all.people.map(p => ({
    state: p.jurisdiction,
    chamber: p.chamber,
    district: p.district,
  }));
  const built = buildSldDistrictKeys(census, corpus, STATE_FIPS_TO_CODE);

  const sorted = (o: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  const file = {
    vintage: VINTAGE,
    source: `${BASE}/ (${FILES.upper}, ${FILES.lower})`,
    corpusUpstreamCommit: status.upstreamCommit,
    generatedAt: new Date().toISOString(),
    knownGaps: KNOWN_GAPS,
    upper: sorted(built.upper),
    lower: sorted(built.lower),
  };
  writeFileSync(OUT_PATH, JSON.stringify(file) + '\n');

  const { unmapped, noSittingMember, unreached } = built.report;
  console.log(
    `Wrote ${OUT_PATH}: ${Object.keys(built.upper).length} upper, ${Object.keys(built.lower).length} lower keys`
  );
  for (const [label, bucket] of [
    ['Unmapped Census districts', unmapped],
    ['Mapped with no sitting member (vacancies)', noSittingMember],
    ['Corpus districts no GEOID reaches', unreached],
  ] as const) {
    console.log(`\n${label}:`);
    for (const [group, names] of Object.entries(bucket)) {
      const gap = KNOWN_GAPS[group] ? ' [known gap]' : '';
      console.log(`  ${group}${gap} (${names.length}): ${names.slice(0, 8).join('; ')}`);
    }
  }

  const unexpected = Object.keys(unmapped).filter(g => !KNOWN_GAPS[g]);
  if (unexpected.length > 0) {
    console.error(`\nUnmapped Census districts outside KNOWN_GAPS: ${unexpected.join(', ')}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
