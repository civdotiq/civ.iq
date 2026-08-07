/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Build the 120th-Congress district-boundary corpus
 * (data/cd120-districts.json.br). See PLAN-elections-2026-08.md, Phase 0.
 *
 * Why a corpus: ten states have new congressional maps for the 2026 election
 * (Census RDO list: AL, CA, FL, LA, MO, NC, OH, TN, TX, UT) and the Census
 * Geocoder still returns 119th-Congress districts, with no published cutover
 * date. Address→district for 2026 ballots therefore needs local
 * point-in-polygon against CD120 geometry; the geocoder stays the
 * address→coordinate step.
 *
 * Why this source: the TIGER 2026 geodatabase is the only published CD120
 * geometry (TIGER2026 shapefiles were not yet released as of 2026-08-07). It
 * is public domain and includes the late-arriving Louisiana map.
 *
 * Fidelity: geometry is simplified at 0.0002° (~20m) tolerance, 5-decimal
 * coordinates. Validated against the full-resolution layer 2026-08-07:
 * 0% misclassification on interior points, 0.85% within a ~300m band around
 * district boundaries — inside the geocoder's own address-interpolation
 * error. Full resolution would be a 105MB GeoJSON; this is ~3MB compressed.
 *
 * Requires GDAL (`brew install gdal` / `apt install gdal-bin`) for ogr2ogr.
 *
 * Usage:
 *   npx tsx scripts/sync-cd120-districts.ts [--out PATH] [--gdb PATH] [--keep-temp]
 *
 * --gdb reuses an already-downloaded .gdb directory instead of fetching the
 * 104MB zip from the Census.
 */

import { writeFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { buildCd120Corpus } from '../src/lib/data-sources/cd120-districts/cd120-corpus';
import type { OgrFeatureCollection } from '../src/lib/data-sources/cd120-districts/cd120-corpus';
import { STATE_FIPS_TO_CODE } from '../src/lib/data/us-states';

const GDB_URL = 'https://www2.census.gov/geo/tiger/TGRGDB26/tlgdb_2026_us_legislative.gdb.zip';
const GDB_NAME = 'tlgdb_2026_us_legislative.gdb';
const LAYER = 'Congressional_Districts';
const TOLERANCE_DEGREES = 0.0002;
const OUT_PATH_DEFAULT = 'data/cd120-districts.json.br';

/**
 * District boundaries are stable within a Congress, but mid-cycle court
 * redraws happen (Louisiana's 2026 map itself arrived late). Twice-yearly
 * re-verification against the Census vintage is the point where the corpus
 * stops being defensible without a check.
 */
const STALE_AFTER_DAYS = 180;

function staleAfterFrom(generatedAt: string): string {
  const d = new Date(generatedAt);
  d.setUTCDate(d.getUTCDate() + STALE_AFTER_DAYS);
  return d.toISOString().slice(0, 10);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const OUT_PATH = resolve(process.cwd(), arg('--out') ?? OUT_PATH_DEFAULT);
const GDB_ARG = arg('--gdb');
const KEEP_TEMP = process.argv.includes('--keep-temp');

function requireOgr2ogr(): void {
  try {
    execFileSync('ogr2ogr', ['--version'], { stdio: 'pipe' });
  } catch {
    throw new Error('ogr2ogr not found — install GDAL (brew install gdal / apt install gdal-bin)');
  }
}

async function fetchGdb(dir: string): Promise<string> {
  const zipPath = join(dir, 'legislative.gdb.zip');
  console.log(`Downloading ${GDB_URL} (~104MB)…`);
  const res = await fetch(GDB_URL, { signal: AbortSignal.timeout(600_000) });
  if (!res.ok) throw new Error(`Census gdb download ${res.status} from ${GDB_URL}`);
  writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  execFileSync('unzip', ['-o', '-q', zipPath, '-d', dir]);
  const gdb = join(dir, GDB_NAME);
  if (!existsSync(gdb)) throw new Error(`${GDB_NAME} not found after unzip`);
  return gdb;
}

/** ogr2ogr does the projection-aware simplify; everything after is pure JSON. */
function extractLayer(gdbPath: string, dir: string): OgrFeatureCollection {
  const outJson = join(dir, 'cd120.json');
  execFileSync('ogr2ogr', [
    '-f',
    'GeoJSON',
    outJson,
    gdbPath,
    LAYER,
    '-simplify',
    String(TOLERANCE_DEGREES),
    '-lco',
    'COORDINATE_PRECISION=5',
    '-select',
    'STATEFP,CD120FP,GEOID,NAMELSAD,CDSESSN',
  ]);
  return JSON.parse(readFileSync(outJson, 'utf8')) as OgrFeatureCollection;
}

async function main(): Promise<void> {
  requireOgr2ogr();
  const temp = mkdtempSync(join(tmpdir(), 'cd120-districts-'));

  try {
    const gdbPath = GDB_ARG ? resolve(GDB_ARG) : await fetchGdb(temp);
    const collection = extractLayer(gdbPath, temp);

    const corpus = buildCd120Corpus({
      collection,
      fipsToState: STATE_FIPS_TO_CODE,
      generatedAt: new Date().toISOString(),
      source: GDB_URL,
      toleranceDegrees: TOLERANCE_DEGREES,
    });

    const json = JSON.stringify(corpus);
    const compressed = brotliCompressSync(Buffer.from(json), {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
        [zlibConstants.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(json),
      },
    });

    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, compressed);

    const states = new Set(corpus.districts.map(d => d.state));
    writeFileSync(
      OUT_PATH.replace(/\.json\.br$/, '.meta.json'),
      JSON.stringify({
        cdSession: corpus.cdSession,
        generatedAt: corpus.generatedAt,
        staleAfter: staleAfterFrom(corpus.generatedAt),
        source: corpus.source,
        toleranceDegrees: corpus.toleranceDegrees,
        districts: corpus.districts.length,
        states: states.size,
        compressedBytes: compressed.length,
        methodology:
          'Census TIGER 2026 geodatabase, Congressional_Districts layer (CDSESSN=120), ' +
          'ogr2ogr -simplify 0.0002deg at 5-decimal precision; undefined-district (ZZ) ' +
          'water areas excluded. Validated against full resolution: 0% interior ' +
          'misclassification, 0.85% within ~300m of boundaries.',
      })
    );

    console.log(
      `Wrote ${OUT_PATH} — ${(compressed.length / 1_000_000).toFixed(2)}MB brotli ` +
        `(${(Buffer.byteLength(json) / 1_000_000).toFixed(2)}MB raw) · ` +
        `${corpus.districts.length} districts · ${states.size} states/territories`
    );
  } finally {
    if (!KEEP_TEMP) rmSync(temp, { recursive: true, force: true });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
