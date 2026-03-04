/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Process MEDSL 2024 Election Data
 *
 * Downloads precinct-level CSV files from MEDSL's GitHub repository,
 * filters and aggregates to district level, and outputs static TypeScript
 * data files following the cook-pvi-data.ts pattern.
 *
 * Usage: npm run process-election-data
 *
 * Source: MIT Election Data and Science Lab
 * Repository: https://github.com/MEDSL/2024-elections-official
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import JSZip from 'jszip';
import zlib from 'zlib';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManifestState {
  file: string;
  format: 'zip' | 'gz';
}

interface Manifest {
  source: string;
  repository: string;
  doi: string;
  baseUrl: string;
  states: Record<string, ManifestState>;
  missingStates: string[];
}

interface MedslRow {
  year: string;
  state_po: string;
  office: string;
  district: string;
  dataverse: string;
  stage: string;
  special: string;
  writein: string;
  mode: string;
  candidate: string;
  party_simplified: string;
  votes: string;
  precinct: string;
  county_name: string;
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

const DATA_DIR = path.join(process.cwd(), 'scripts', 'data', 'medsl-2024');
const OUTPUT_DIR = path.join(process.cwd(), 'src', 'data');
const MANIFEST_PATH = path.join(process.cwd(), 'scripts', 'medsl-2024-manifest.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readManifest(): Manifest {
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(raw) as Manifest;
}

async function downloadFile(url: string, dest: string): Promise<boolean> {
  if (fs.existsSync(dest)) {
    console.log(`  [cached] ${path.basename(dest)}`);
    return true;
  }

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      console.warn(`  [skip] ${path.basename(dest)} — HTTP ${response.status}`);
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
    console.warn(`  [error] ${path.basename(dest)} — ${msg}`);
    return false;
  }
}

/**
 * Extract the CSV from a zip/gz archive to a temporary file on disk.
 * Returns the path to the extracted CSV.  This avoids loading multi-hundred-MB
 * CSVs (e.g. Ohio, 496 MB uncompressed) entirely into a Node.js Buffer.
 */
async function extractCsvToFile(filePath: string, format: 'zip' | 'gz'): Promise<string> {
  const tmpCsv = filePath.replace(/\.(zip|gz)$/, '.csv');

  // If we already extracted, reuse
  if (fs.existsSync(tmpCsv)) return tmpCsv;

  if (format === 'gz') {
    // Stream decompress gz → disk
    await new Promise<void>((resolve, reject) => {
      const src = fs.createReadStream(filePath);
      const dest = fs.createWriteStream(tmpCsv);
      src.pipe(zlib.createGunzip()).pipe(dest);
      dest.on('finish', resolve);
      dest.on('error', reject);
      src.on('error', reject);
    });
    return tmpCsv;
  }

  // ZIP — extract via JSZip (must load zip into memory, but stream the CSV out)
  const raw = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(raw);
  // Look for CSV files first, then fall back to any non-directory file (e.g. FL's 'fl24')
  const allFiles = Object.keys(zip.files).filter(
    name => !name.startsWith('__MACOSX') && !zip.files[name].dir
  );
  const csvFiles = allFiles.filter(name => name.endsWith('.csv'));
  const targetFiles = csvFiles.length > 0 ? csvFiles : allFiles;

  if (targetFiles.length === 0) {
    throw new Error(`No data file found in ${path.basename(filePath)}`);
  }

  const csvFile = zip.files[targetFiles[0]];
  const nodeStream = csvFile.nodeStream('nodebuffer');
  await new Promise<void>((resolve, reject) => {
    const dest = fs.createWriteStream(tmpCsv);
    nodeStream.pipe(dest);
    dest.on('finish', resolve);
    dest.on('error', reject);
    nodeStream.on('error', reject);
  });

  return tmpCsv;
}

function shouldIncludeRow(row: MedslRow, hasTotalMode: boolean): boolean {
  // Filter chain — MEDSL uses UPPERCASE values
  // 1. Mode filter: if state has TOTAL rows, use only those to prevent double-counting.
  //    If no TOTAL rows exist (e.g. AK, AR, HI, IA, MD, NC, SC, WV), accept all modes.
  if (hasTotalMode && row.mode !== 'TOTAL') return false;
  // 2. General election only (uppercase GEN in MEDSL data)
  if (row.stage !== 'GEN') return false;
  // 3. No special elections
  if (row.special === 'TRUE') return false;
  // 4. Exclude write-ins
  if (row.writein === 'TRUE') return false;
  // 5. Exclude FLOATING precincts/counties
  if (row.precinct === 'FLOATING' || row.county_name === 'FLOATING') return false;

  return true;
}

/**
 * Pre-scan the first N rows to detect if this state file has 'TOTAL' mode rows.
 */
async function detectHasTotalMode(csvPath: string): Promise<boolean> {
  const parser = fs.createReadStream(csvPath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      to: 2000, // Only read first 2000 rows
    })
  );

  for await (const row of parser) {
    if ((row as MedslRow).mode === 'TOTAL') return true;
  }
  return false;
}

function normalizeHouseDistrict(district: string): string {
  // MEDSL uses "000" for at-large; we use "00" to match cook-pvi-data.ts
  const num = parseInt(district, 10);
  if (isNaN(num) || num === 0) return '00';
  return String(num).padStart(2, '0');
}

function normalizeStateLegDistrict(district: string): string {
  // Strip leading zeros: "001" → "1", matching state-districts-manifest.json
  const num = parseInt(district, 10);
  if (isNaN(num)) return district.trim();
  return String(num);
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

function partyBucket(partySimplified: string): 'dem' | 'rep' | 'other' {
  switch (partySimplified) {
    case 'DEMOCRAT':
      return 'dem';
    case 'REPUBLICAN':
      return 'rep';
    default:
      return 'other';
  }
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

interface AggBuckets {
  house: Map<string, VoteTotals>;
  president: Map<string, VoteTotals>;
  senate: Map<string, VoteTotals>;
  governor: Map<string, VoteTotals>;
  stateSenate: Map<string, VoteTotals>;
  stateHouse: Map<string, VoteTotals>;
}

function newBuckets(): AggBuckets {
  return {
    house: new Map(),
    president: new Map(),
    senate: new Map(),
    governor: new Map(),
    stateSenate: new Map(),
    stateHouse: new Map(),
  };
}

function addVotes(
  map: Map<string, VoteTotals>,
  key: string,
  bucket: 'dem' | 'rep' | 'other',
  votes: number
): void {
  let entry = map.get(key);
  if (!entry) {
    entry = { dem: 0, rep: 0, other: 0, total: 0 };
    map.set(key, entry);
  }
  entry[bucket] += votes;
  entry.total += votes;
}

function aggregateRow(row: MedslRow, buckets: AggBuckets, hasTotalMode: boolean): boolean {
  if (!shouldIncludeRow(row, hasTotalMode)) return false;

  const votes = parseInt(row.votes, 10);
  if (isNaN(votes) || votes < 0) return false;

  const bucket = partyBucket(row.party_simplified);
  const state = row.state_po;
  const dataverse = row.dataverse;
  const office = row.office?.toUpperCase() || '';

  if (dataverse === 'HOUSE' || office.includes('US HOUSE') || office.includes('U.S. HOUSE')) {
    const dist = normalizeHouseDistrict(row.district);
    const key = `${state}-${dist}`;
    addVotes(buckets.house, key, bucket, votes);
    return true;
  } else if (dataverse === 'PRESIDENT' || office.includes('PRESIDENT')) {
    const key = `${state}-PRESIDENT`;
    addVotes(buckets.president, key, bucket, votes);
    return true;
  } else if (
    dataverse === 'SENATE' ||
    office.includes('US SENATE') ||
    office.includes('U.S. SENATE')
  ) {
    const key = `${state}-SENATE`;
    addVotes(buckets.senate, key, bucket, votes);
    return true;
  } else if (office.includes('GOVERNOR')) {
    const key = `${state}-GOVERNOR`;
    addVotes(buckets.governor, key, bucket, votes);
    return true;
  } else if (dataverse === 'STATE') {
    // State legislature — determine chamber from office name
    if (
      office.includes('STATE SENATE') ||
      office.includes('STATE SENATOR') ||
      (office.includes('SENATE') && !office.includes('US '))
    ) {
      const dist = normalizeStateLegDistrict(row.district);
      const key = `${state}-upper-${dist}`;
      addVotes(buckets.stateSenate, key, bucket, votes);
      return true;
    } else if (
      office.includes('STATE HOUSE') ||
      office.includes('STATE REPRESENTATIVE') ||
      (office.includes('HOUSE') && !office.includes('US ')) ||
      office.includes('ASSEMBLY') ||
      office.includes('DELEGATE')
    ) {
      const dist = normalizeStateLegDistrict(row.district);
      const key = `${state}-lower-${dist}`;
      addVotes(buckets.stateHouse, key, bucket, votes);
      return true;
    }
  }

  return false;
}

/**
 * Stream-parse a CSV file from disk, aggregating rows one at a time
 * without loading the full file into memory.
 */
async function streamAggregate(
  csvPath: string,
  buckets: AggBuckets
): Promise<{ totalRows: number; matchedRows: number; hasTotalMode: boolean }> {
  // Pre-scan to detect TOTAL mode
  const hasTotalMode = await detectHasTotalMode(csvPath);

  let totalRows = 0;
  let matchedRows = 0;

  const parser = fs.createReadStream(csvPath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    })
  );

  for await (const row of parser) {
    totalRows++;
    if (aggregateRow(row as MedslRow, buckets, hasTotalMode)) {
      matchedRows++;
    }
  }

  return { totalRows, matchedRows, hasTotalMode };
}

// ---------------------------------------------------------------------------
// Output generation
// ---------------------------------------------------------------------------

function raceResultLiteral(r: RaceResultData): string {
  return `{ dem: ${r.dem}, rep: ${r.rep}, other: ${r.other}, total: ${r.total}, winner: '${r.winner}', margin: ${r.margin}, demPct: ${r.demPct}, repPct: ${r.repPct} }`;
}

function generateDataFile(
  name: string,
  variableName: string,
  description: string,
  map: Map<string, VoteTotals>
): string {
  const sortedKeys = [...map.keys()].sort();
  const entries: string[] = [];

  for (const key of sortedKeys) {
    const totals = map.get(key)!;
    const result = computeResult(totals);
    entries.push(`  '${key}': ${raceResultLiteral(result)},`);
  }

  return `/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ${name}
 *
 * ${description}
 * Generated: ${new Date().toISOString()}
 * Source: MIT Election Data and Science Lab (MEDSL)
 * Repository: https://github.com/MEDSL/2024-elections-official
 */

import type { RaceResult } from '@/types/elections';

export const ${variableName}: Record<string, RaceResult> = {
${entries.join('\n')}
};
`;
}

function generateMetadataFile(coveredStates: string[], missingStates: string[]): string {
  return `/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Election Results Metadata
 *
 * Coverage and provenance info for 2024 election results data.
 * Generated: ${new Date().toISOString()}
 */

import type { ElectionMetadata } from '@/types/elections';

export const ELECTION_2024_METADATA: ElectionMetadata = {
  year: 2024,
  source: 'MIT Election Data and Science Lab (MEDSL)',
  doi: '10.7910/DVN/2024',
  generatedAt: '${new Date().toISOString()}',
  coveredStates: ${JSON.stringify(coveredStates.sort())},
  missingStates: ${JSON.stringify(missingStates.sort())},
};
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== MEDSL 2024 Election Data Processor ===\n');

  const manifest = readManifest();
  const stateEntries = Object.entries(manifest.states);
  console.log(
    `Manifest: ${stateEntries.length} states + ${manifest.missingStates.length} missing\n`
  );

  // Ensure data directory
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Phase 1: Download
  console.log('--- Phase 1: Download ---');
  const downloadedStates: string[] = [];
  const failedStates: string[] = [];

  for (const [state, info] of stateEntries) {
    const url = `${manifest.baseUrl}/${info.file}`;
    const dest = path.join(DATA_DIR, info.file);
    const ok = await downloadFile(url, dest);
    if (ok) {
      downloadedStates.push(state);
    } else {
      failedStates.push(state);
    }
  }

  console.log(`\nDownloaded: ${downloadedStates.length}, Failed: ${failedStates.length}\n`);

  // Phase 2: Parse and aggregate (streaming to avoid OOM)
  console.log('--- Phase 2: Parse & Aggregate ---');
  const buckets = newBuckets();
  const coveredStates: string[] = [];
  let grandTotalRows = 0;
  let grandMatchedRows = 0;

  for (const state of downloadedStates) {
    const info = manifest.states[state];
    const filePath = path.join(DATA_DIR, info.file);

    try {
      process.stdout.write(`  Processing ${state}...`);
      const csvPath = await extractCsvToFile(filePath, info.format);

      const before = countEntries(buckets);
      const { totalRows, matchedRows, hasTotalMode } = await streamAggregate(csvPath, buckets);
      const after = countEntries(buckets);
      const newRaces = after - before;

      grandTotalRows += totalRows;
      grandMatchedRows += matchedRows;

      const modeLabel = hasTotalMode ? 'TOTAL' : 'sum-all';
      console.log(
        ` ${totalRows.toLocaleString()} rows, ${matchedRows.toLocaleString()} matched (${modeLabel}) → ${newRaces} new races`
      );
      coveredStates.push(state);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(` ERROR: ${msg}`);
      failedStates.push(state);
    }
  }

  const allMissing = [...new Set([...manifest.missingStates, ...failedStates])].sort();

  console.log(`\nTotal rows parsed: ${grandTotalRows.toLocaleString()}`);
  console.log(`Total matched rows: ${grandMatchedRows.toLocaleString()}`);
  console.log(
    `Race entries: house=${buckets.house.size}, president=${buckets.president.size}, senate=${buckets.senate.size}, governor=${buckets.governor.size}`
  );
  console.log(`State leg: upper=${buckets.stateSenate.size}, lower=${buckets.stateHouse.size}`);
  console.log(`Covered states: ${coveredStates.length}, Missing: ${allMissing.join(', ')}\n`);

  // Phase 3: Write output files
  console.log('--- Phase 3: Write Output Files ---');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // House results
  const houseContent = generateDataFile(
    '2024 House Election Results',
    'HOUSE_RESULTS_2024',
    "US House race results keyed by 'STATE-DD' (e.g., 'PA-07').",
    buckets.house
  );
  const housePath = path.join(OUTPUT_DIR, 'election-results-house.ts');
  fs.writeFileSync(housePath, houseContent);
  console.log(`  ${housePath} — ${buckets.house.size} races`);

  // Statewide results (president + senate + governor merged)
  const statewideMap = new Map<string, VoteTotals>();
  for (const [k, v] of buckets.president) statewideMap.set(k, v);
  for (const [k, v] of buckets.senate) statewideMap.set(k, v);
  for (const [k, v] of buckets.governor) statewideMap.set(k, v);

  const statewideContent = generateDataFile(
    '2024 Statewide Election Results',
    'STATEWIDE_RESULTS_2024',
    "President, Senate, and Governor results keyed by 'STATE-OFFICE' (e.g., 'GA-SENATE').",
    statewideMap
  );
  const statewidePath = path.join(OUTPUT_DIR, 'election-results-statewide.ts');
  fs.writeFileSync(statewidePath, statewideContent);
  console.log(`  ${statewidePath} — ${statewideMap.size} races`);

  // State legislature results
  const stateLegMap = new Map<string, VoteTotals>();
  for (const [k, v] of buckets.stateSenate) stateLegMap.set(k, v);
  for (const [k, v] of buckets.stateHouse) stateLegMap.set(k, v);

  const stateLegContent = generateDataFile(
    '2024 State Legislature Election Results',
    'STATE_LEG_RESULTS_2024',
    "State senate and house results keyed by 'STATE-chamber-N' (e.g., 'AL-lower-1').",
    stateLegMap
  );
  const stateLegPath = path.join(OUTPUT_DIR, 'election-results-state-leg.ts');
  fs.writeFileSync(stateLegPath, stateLegContent);
  console.log(`  ${stateLegPath} — ${stateLegMap.size} races`);

  // Metadata
  const metadataContent = generateMetadataFile(coveredStates, allMissing);
  const metadataPath = path.join(OUTPUT_DIR, 'election-results-metadata.ts');
  fs.writeFileSync(metadataPath, metadataContent);
  console.log(`  ${metadataPath}`);

  console.log('\n=== Done ===');
}

function countEntries(buckets: AggBuckets): number {
  return (
    buckets.house.size +
    buckets.president.size +
    buckets.senate.size +
    buckets.governor.size +
    buckets.stateSenate.size +
    buckets.stateHouse.size
  );
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
