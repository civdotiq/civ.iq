/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Process MEDSL Constituency-Level House Election History (2014-2024)
 *
 * Downloads the MEDSL "U.S. House 1976-2024" constituency-level dataset
 * from Harvard Dataverse and generates a multi-year TypeScript data file.
 *
 * Usage: npx tsx scripts/process-election-history.ts
 *
 * Source: MIT Election Data and Science Lab (MEDSL)
 * DOI: 10.7910/DVN/IG0UN2
 * File: 1976-2024-house.tab (~4.2 MB, ~33,800 rows)
 *
 * Note: Redistricting boundary between 2020 and 2022. Districts changed
 * after the 2020 Census. Pre-2022 district numbers may not match current
 * district boundaries.
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MedslConstituencyRow {
  year: string;
  state: string;
  state_po: string;
  office: string;
  district: string;
  stage: string;
  special: string;
  candidate: string;
  party: string;
  writein: string;
  mode: string;
  candidatevotes: string;
  totalvotes: string;
  runoff: string;
  fusion_ticket: string;
}

interface VoteTotals {
  dem: number;
  rep: number;
  other: number;
  total: number;
}

interface RaceResultData {
  dem: number;
  rep: number;
  other: number;
  total: number;
  winner: 'D' | 'R' | 'L' | 'OTHER';
  margin: number;
  demPct: number;
  repPct: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data', 'medsl-history');
const OUTPUT_DIR = path.join(process.cwd(), 'src', 'data');

// Harvard Dataverse file ID for 1976-2024-house.tab
const DATAVERSE_FILE_ID = '13592823';
const DOWNLOAD_URL = `https://dataverse.harvard.edu/api/access/datafile/${DATAVERSE_FILE_ID}?format=original`;

const TARGET_YEARS = [2014, 2016, 2018, 2020, 2022, 2024];

// Redistricting happened after 2020 Census. Districts from 2022+ use new
// boundaries. Districts from 2014-2020 use pre-redistricting boundaries.
const REDISTRICTING_YEAR = 2022;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function downloadFile(url: string, dest: string): Promise<boolean> {
  if (fs.existsSync(dest)) {
    console.log(`  [cached] ${path.basename(dest)}`);
    return true;
  }

  try {
    console.log(`  Downloading from Harvard Dataverse...`);
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      console.warn(`  [error] HTTP ${response.status}`);
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(dest, buffer);
    console.log(
      `  [downloaded] ${path.basename(dest)} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`  [error] ${msg}`);
    return false;
  }
}

function normalizeDistrict(district: string): string {
  const num = parseInt(district, 10);
  if (isNaN(num) || num === 0) return '00'; // at-large
  return String(num).padStart(2, '0');
}

function partyBucket(party: string): 'dem' | 'rep' | 'other' {
  const upper = party.toUpperCase();
  if (upper === 'DEMOCRAT' || upper === 'DEMOCRATIC' || upper === 'DEMOCRATIC-FARMER-LABOR') {
    return 'dem';
  }
  if (upper === 'REPUBLICAN') return 'rep';
  return 'other';
}

function computeResult(totals: VoteTotals): RaceResultData {
  const { dem, rep, other, total } = totals;
  const demPct = total > 0 ? Math.round((dem / total) * 10000) / 100 : 0;
  const repPct = total > 0 ? Math.round((rep / total) * 10000) / 100 : 0;

  let winner: 'D' | 'R' | 'L' | 'OTHER';
  let margin: number;

  if (dem >= rep && dem >= other) {
    winner = 'D';
    margin = Math.round((demPct - repPct) * 100) / 100;
  } else if (rep >= dem && rep >= other) {
    winner = 'R';
    margin = Math.round((repPct - demPct) * 100) / 100;
  } else {
    winner = 'OTHER';
    const otherPct = total > 0 ? Math.round((other / total) * 10000) / 100 : 0;
    margin = Math.round((otherPct - Math.max(demPct, repPct)) * 100) / 100;
  }

  return { dem, rep, other, total, winner, margin, demPct, repPct };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

async function parseAndAggregate(csvPath: string): Promise<Map<number, Map<string, VoteTotals>>> {
  // year -> districtKey -> vote totals
  const yearBuckets = new Map<number, Map<string, VoteTotals>>();

  for (const year of TARGET_YEARS) {
    yearBuckets.set(year, new Map());
  }

  let totalRows = 0;
  let matchedRows = 0;

  const parser = fs.createReadStream(csvPath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      delimiter: ',', // Despite .tab extension, this file is CSV
      quote: '"',
      relax_quotes: true,
    })
  );

  for await (const rawRow of parser) {
    totalRows++;
    const row = rawRow as MedslConstituencyRow;

    const year = parseInt(row.year, 10);
    if (!TARGET_YEARS.includes(year)) continue;

    // General election only
    const stage = (row.stage || '').toUpperCase();
    if (stage !== 'GEN') continue;

    // No special elections
    const special = (row.special || '').toUpperCase();
    if (special === 'TRUE') continue;

    // No write-ins
    const writein = (row.writein || '').toUpperCase();
    if (writein === 'TRUE') continue;

    const votes = parseInt(row.candidatevotes, 10);
    if (isNaN(votes) || votes < 0) continue;

    const statePo = (row.state_po || '').toUpperCase();
    const dist = normalizeDistrict(row.district);
    const key = `${statePo}-${dist}`;
    const bucket = partyBucket(row.party || '');

    const yearMap = yearBuckets.get(year);
    if (!yearMap) continue;

    let entry = yearMap.get(key);
    if (!entry) {
      entry = { dem: 0, rep: 0, other: 0, total: 0 };
      yearMap.set(key, entry);
    }

    entry[bucket] += votes;
    entry.total += votes;
    matchedRows++;
  }

  console.log(`  Total rows parsed: ${totalRows.toLocaleString()}`);
  console.log(`  Matched rows: ${matchedRows.toLocaleString()}`);

  return yearBuckets;
}

// ---------------------------------------------------------------------------
// Output generation
// ---------------------------------------------------------------------------

function raceResultLiteral(r: RaceResultData): string {
  return `{ dem: ${r.dem}, rep: ${r.rep}, other: ${r.other}, total: ${r.total}, winner: '${r.winner}', margin: ${r.margin}, demPct: ${r.demPct}, repPct: ${r.repPct} }`;
}

function generateHistoryFile(yearBuckets: Map<number, Map<string, VoteTotals>>): string {
  const yearEntries: string[] = [];

  for (const year of TARGET_YEARS) {
    const yearMap = yearBuckets.get(year);
    if (!yearMap || yearMap.size === 0) continue;

    const sortedKeys = [...yearMap.keys()].sort();
    const raceEntries: string[] = [];

    for (const key of sortedKeys) {
      const totals = yearMap.get(key)!;
      const result = computeResult(totals);
      raceEntries.push(`    '${key}': ${raceResultLiteral(result)},`);
    }

    yearEntries.push(`  ${year}: {\n${raceEntries.join('\n')}\n  },`);
  }

  return `/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * US House Election History (2014-2024)
 *
 * District-level results for 6 election cycles from MEDSL constituency data.
 * Keyed by year, then by 'STATE-DD' (e.g., 'PA-07').
 *
 * REDISTRICTING NOTE: Districts changed after the 2020 Census.
 * Results from 2014-2020 use pre-redistricting boundaries.
 * Results from 2022-2024 use post-redistricting boundaries.
 * Comparing a district across this boundary may be misleading.
 *
 * Generated: ${new Date().toISOString()}
 * Source: MIT Election Data and Science Lab (MEDSL)
 * DOI: 10.7910/DVN/IG0UN2
 */

import type { RaceResult } from '@/types/elections';

export const HOUSE_ELECTION_HISTORY: Record<number, Record<string, RaceResult>> = {
${yearEntries.join('\n')}
};

/** Years where redistricting changed district boundaries */
export const REDISTRICTING_YEAR = ${REDISTRICTING_YEAR};

/** All available election years in the dataset */
export const ELECTION_YEARS = [${TARGET_YEARS.join(', ')}] as const;

export type ElectionYear = (typeof ELECTION_YEARS)[number];
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== MEDSL House Election History Processor (2014-2024) ===\n');

  // Ensure data directory
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Phase 1: Download
  console.log('--- Phase 1: Download ---');
  const destFile = path.join(DATA_DIR, '1976-2024-house.tab');
  const ok = await downloadFile(DOWNLOAD_URL, destFile);

  if (!ok) {
    console.error('Failed to download constituency data. Aborting.');
    process.exit(1);
  }

  // Phase 2: Parse and aggregate
  console.log('\n--- Phase 2: Parse & Aggregate ---');
  const yearBuckets = await parseAndAggregate(destFile);

  for (const year of TARGET_YEARS) {
    const yearMap = yearBuckets.get(year);
    const count = yearMap?.size ?? 0;
    console.log(`  ${year}: ${count} districts`);
  }

  // Phase 3: Write output
  console.log('\n--- Phase 3: Write Output ---');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const content = generateHistoryFile(yearBuckets);
  const outputPath = path.join(OUTPUT_DIR, 'election-history-house.ts');
  fs.writeFileSync(outputPath, content);
  console.log(`  ${outputPath}`);

  console.log('\n=== Done ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
