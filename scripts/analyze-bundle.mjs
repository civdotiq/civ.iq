#!/usr/bin/env node
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Client bundle size report.
 *
 * Reads the client chunks emitted by a normal `next build` and reports total
 * size, the largest chunks (raw + gzipped), and a guess at what each large
 * chunk contains. Run `npm run build` first.
 *
 * Why this exists rather than @next/bundle-analyzer: that package does not
 * work on this project. It is incompatible with Turbopack (which this project
 * builds with), `next build --webpack` OOMs even at an 8 GB heap, and
 * `next experimental-analyze` produced no output in 11 minutes. See the note
 * at the top of next.config.mjs. This script has no such problem because it
 * just measures the build output that actually ships.
 *
 * It is deliberately dumb and dependency-free. Its job is to answer "did that
 * change make the bundle bigger or smaller, and what is the biggest thing in
 * here" — which is the question that matters when reviewing a perf change.
 *
 * Usage:
 *   npm run perf:analyze              # report current build
 *   npm run perf:analyze -- --json    # machine-readable, for diffing in CI
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const CHUNK_DIR = '.next/static/chunks';
const TOP_N = 15;

// Substrings that identify a heavy dependency or data blob inside a chunk.
// Extend freely — a miss just means the chunk is reported as "unidentified".
const FINGERPRINTS = [
  ['maplibre-gl', /MapLibre|maplibre_gl/],
  ['recharts', /recharts/],
  ['d3', /d3-selection|d3_selection/],
  ['onnxruntime', /onnxruntime/],
  ['@huggingface/transformers', /huggingface|transformers/],
  ['nostr-tools', /nostr-tools|nostr_tools/],
  ['zip→district map', /ZIP_TO_DISTRICT/],
  ['representative biographies', /wikipediaSuccessRate/],
  ['civic glossary', /CIVIC_GLOSSARY/],
  ['education curriculum', /EDUCATION_CURRICULUM/],
  ['election results', /ELECTION_RESULTS/],
  ['committee names', /COMMITTEE_NAMES/],
];

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function identify(contents) {
  const hits = FINGERPRINTS.filter(([, re]) => re.test(contents)).map(([name]) => name);
  return hits.length ? hits.join(', ') : '—';
}

function main() {
  const json = process.argv.includes('--json');

  if (!existsSync(CHUNK_DIR)) {
    console.error(`No build output at ${CHUNK_DIR}. Run \`npm run build\` first.`);
    process.exit(1);
  }

  const chunks = readdirSync(CHUNK_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => {
      const path = join(CHUNK_DIR, f);
      const raw = statSync(path).size;
      const contents = readFileSync(path, 'utf8');
      return { file: f, raw, gzip: gzipSync(contents).length, contains: identify(contents) };
    })
    .sort((a, b) => b.raw - a.raw);

  const totalRaw = chunks.reduce((n, c) => n + c.raw, 0);
  const totalGzip = chunks.reduce((n, c) => n + c.gzip, 0);

  if (json) {
    console.log(JSON.stringify({ totalRaw, totalGzip, count: chunks.length, chunks }, null, 2));
    return;
  }

  console.log(`\nClient bundle — ${chunks.length} chunks`);
  console.log(`Total: ${kb(totalRaw)} raw, ${kb(totalGzip)} gzipped\n`);
  console.log(`Largest ${Math.min(TOP_N, chunks.length)}:\n`);
  console.log(`${'RAW'.padStart(9)}  ${'GZIP'.padStart(8)}  CONTAINS`);

  for (const c of chunks.slice(0, TOP_N)) {
    console.log(`${kb(c.raw).padStart(9)}  ${kb(c.gzip).padStart(8)}  ${c.contains}`);
  }

  console.log(`\nTip: \`npm run perf:analyze -- --json\` for a diffable snapshot.\n`);
}

main();
