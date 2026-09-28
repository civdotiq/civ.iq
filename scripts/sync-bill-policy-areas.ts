/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Mirror GovInfo BILLSTATUS bulk data into a bill → policy-area corpus
 * (data/bill-policy-areas.json.br), and from the same pass derive per-member
 * bills-and-resolutions-introduced counts (data/member-sponsored-counts.json)
 * for the search filter. See PLAN-bill-policy-area-corpus.md.
 *
 * Why: Congress.gov's /v3/bill list carries no policyArea field and has no
 * policy-area filter, so every /ask/topic-bills/* page rendered empty. The
 * BILLSTATUS XML has the CRS-assigned <policyArea> for every bill.
 *
 * Usage:
 *   npx tsx scripts/sync-bill-policy-areas.ts [--congress 119] [--out PATH]
 *                                            [--counts-out PATH]
 *                                            [--types hr,s] [--keep-temp]
 *
 * --types limits the build for smoke tests; a partial corpus must never be
 * committed, so the script refuses to write either default path when it is set.
 * No API key is involved — these are public bulk zips.
 */

import { writeFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import {
  buildBillPolicyAreaCorpus,
  parseBillStatusXml,
} from '../src/lib/data-sources/bill-policy-areas/build';
import type { ParsedBillStatus } from '../src/lib/data-sources/bill-policy-areas/build';
import {
  BILLSTATUS_TYPES,
  CORPUS_BILL_TYPES,
} from '../src/lib/data-sources/bill-policy-areas/corpus';
import type { BillStatusType } from '../src/lib/data-sources/bill-policy-areas/corpus';
import { buildMemberSponsoredCounts } from '../src/lib/data-sources/member-sponsored-counts/corpus';

const OUT_PATH_DEFAULT = 'data/bill-policy-areas.json.br';
const COUNTS_OUT_PATH_DEFAULT = 'data/member-sponsored-counts.json';

/**
 * GovInfo refreshes BILLSTATUS daily and the mirror runs weekly, so three
 * consecutive misses is where "bills in this area" stops being defensible.
 */
const STALE_AFTER_DAYS = 21;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const CONGRESS = Number(arg('--congress') ?? '119');
const ONLY = arg('--types')
  ?.split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
const OUT_PATH = resolve(process.cwd(), arg('--out') ?? OUT_PATH_DEFAULT);
const COUNTS_OUT_PATH = resolve(process.cwd(), arg('--counts-out') ?? COUNTS_OUT_PATH_DEFAULT);
const KEEP_TEMP = process.argv.includes('--keep-temp');

function zipUrl(type: BillStatusType): string {
  return `https://www.govinfo.gov/bulkdata/BILLSTATUS/${CONGRESS}/${type}/BILLSTATUS-${CONGRESS}-${type}.zip`;
}

/** Absolute YYYY-MM-DD, same reasoning as the OpenStates mirror's staleAfter. */
function staleAfterFrom(generatedAt: string): string {
  const d = new Date(generatedAt);
  d.setUTCDate(d.getUTCDate() + STALE_AFTER_DAYS);
  return d.toISOString().slice(0, 10);
}

/** Download one type's zip (hr is ~32 MB) and parse every XML in it. */
async function fetchType(type: BillStatusType, temp: string): Promise<ParsedBillStatus[]> {
  const url = zipUrl(type);
  const res = await fetch(url, { signal: AbortSignal.timeout(300_000) });
  if (!res.ok) throw new Error(`BILLSTATUS ${res.status} from ${url}`);

  const archive = join(temp, `${type}.zip`);
  writeFileSync(archive, Buffer.from(await res.arrayBuffer()));
  const dir = join(temp, type);
  mkdirSync(dir);
  // Absolute path so a writable PATH entry cannot substitute the binary.
  execFileSync('/usr/bin/unzip', ['-q', archive, '-d', dir]);

  const files = readdirSync(dir).filter(f => f.endsWith('.xml'));
  const bills: ParsedBillStatus[] = [];
  let skipped = 0;
  for (const file of files) {
    const bill = parseBillStatusXml(readFileSync(join(dir, file), 'utf8'));
    if (bill) bills.push(bill);
    else skipped++;
  }
  console.log(`${type}: ${files.length} files, ${bills.length} parsed, ${skipped} skipped`);
  if (bills.length === 0) throw new Error(`No bills parsed from ${url}`);
  return bills;
}

async function main(): Promise<void> {
  if (
    ONLY &&
    (OUT_PATH === resolve(process.cwd(), OUT_PATH_DEFAULT) ||
      COUNTS_OUT_PATH === resolve(process.cwd(), COUNTS_OUT_PATH_DEFAULT))
  ) {
    throw new Error(
      '--types builds a partial corpus; pass --out and --counts-out to scratch paths'
    );
  }
  const types = BILLSTATUS_TYPES.filter(t => !ONLY || ONLY.includes(t));
  const temp = mkdtempSync(join(tmpdir(), 'billstatus-'));

  try {
    const bills: ParsedBillStatus[] = [];
    for (const type of types) bills.push(...(await fetchType(type, temp)));

    const generatedAt = new Date().toISOString();
    // The policy-area corpus only reads the bill and joint-resolution zips.
    const corpus = buildBillPolicyAreaCorpus({
      congress: CONGRESS,
      bills,
      generatedAt,
      sources: CORPUS_BILL_TYPES.filter(t => types.includes(t)).map(zipUrl),
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

    // Sidecar so a status check can read freshness without decompressing.
    writeFileSync(
      OUT_PATH.replace(/\.json\.br$/, '.meta.json'),
      JSON.stringify({
        generatedAt: corpus.generatedAt,
        staleAfter: staleAfterFrom(corpus.generatedAt),
        congress: corpus.congress,
        bills: corpus.rows.length,
        policyAreas: corpus.policyAreas.length,
        compressedBytes: compressed.length,
        meta: corpus.meta,
      })
    );

    console.log(
      `Wrote ${OUT_PATH} — ${(compressed.length / 1_000).toFixed(0)}KB brotli ` +
        `(${(Buffer.byteLength(json) / 1_000_000).toFixed(2)}MB raw) · ` +
        `${corpus.rows.length} bills · ${corpus.policyAreas.length} policy areas · ` +
        `${corpus.meta.unassigned} unassigned`
    );

    const counts = buildMemberSponsoredCounts({
      congress: CONGRESS,
      bills,
      generatedAt,
      staleAfter: staleAfterFrom(generatedAt),
      sources: types.map(zipUrl),
    });
    // Plain indented JSON: ~535 members is small, and weekly diffs stay readable.
    const countsJson = JSON.stringify(counts, null, 2) + '\n';
    mkdirSync(dirname(COUNTS_OUT_PATH), { recursive: true });
    writeFileSync(COUNTS_OUT_PATH, countsJson);
    const members = Object.keys(counts.counts).length;
    writeFileSync(
      COUNTS_OUT_PATH.replace(/\.json$/, '.meta.json'),
      JSON.stringify({
        generatedAt: counts.generatedAt,
        staleAfter: counts.staleAfter,
        congress: counts.congress,
        members,
        bytes: Buffer.byteLength(countsJson),
        meta: counts.meta,
      })
    );
    console.log(
      `Wrote ${COUNTS_OUT_PATH} — ${members} members · ` +
        `${counts.meta.noSponsor} bills without a sponsor`
    );
  } finally {
    if (!KEEP_TEMP) rmSync(temp, { recursive: true, force: true });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
