/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Rebuild src/data/committees-with-subcommittees.json from
 * unitedstates/congress-legislators committees-current.yaml (CC0-1.0). See
 * src/lib/data/committee-list-sync.ts. Run weekly by the Sync Congress
 * Legislators workflow.
 *
 * Usage: npx tsx scripts/sync-committee-list.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import {
  buildCommitteeList,
  type StoredCommitteeList,
  type UpstreamCommittee,
} from '../src/lib/data/committee-list-sync';

const URL = 'https://unitedstates.github.io/congress-legislators/committees-current.yaml';
const PATH = resolve(process.cwd(), 'src/data/committees-with-subcommittees.json');
// Structural floors far below the real figures (49 committees, 181
// subcommittees in October 2026): they trip on a truncated download.
const MIN_COMMITTEES = 35;
const MIN_SUBCOMMITTEES = 120;

async function main(): Promise<void> {
  const response = await fetch(URL, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`GET ${URL} -> ${response.status}`);
  const upstream = yaml.load(await response.text()) as UpstreamCommittee[];
  const previous = JSON.parse(readFileSync(PATH, 'utf8')) as StoredCommitteeList;
  const list = buildCommitteeList(upstream, previous);
  const count = Object.keys(list.committees).length;
  if (count < MIN_COMMITTEES || list.metadata.totalSubcommittees < MIN_SUBCOMMITTEES) {
    throw new Error(
      `Refusing to write: ${count} committees, ${list.metadata.totalSubcommittees} subcommittees`
    );
  }
  // Rewrite only when the committees changed, not just the timestamp.
  if (JSON.stringify(list.committees) === JSON.stringify(previous.committees)) {
    console.log(
      `No change: ${count} committees, ${list.metadata.totalSubcommittees} subcommittees`
    );
    return;
  }
  writeFileSync(PATH, `${JSON.stringify(list, null, 2)}\n`);
  console.log(`Wrote ${count} committees, ${list.metadata.totalSubcommittees} subcommittees`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
