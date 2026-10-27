/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Backtest the Senate vote freshness check: read every Congressional Record
 * issue in a date range and compare each Daily Digest "Record Votes …
 * (Total--N)" with the number of Senate roll calls the committed snapshot
 * (data/senate-votes-{congress}.json.br) holds through that date.
 *
 * Usage:
 *   npx tsx scripts/backtest-senate-digest.ts [--congress 119] [--from 2026-01-03] [--to 2026-10-27]
 *
 * Read-only. Needs GOVINFO_API_KEY (about 2–3 GovInfo requests per issue).
 * Exits 1 when any total disagrees with the snapshot.
 */

import './load-env';

import {
  listRecordIssues,
  readSenateDigest,
  sessionForDate,
} from '../src/lib/data-sources/congressional-record/senate-digest';
import { loadSenateVotesSnapshot } from '../src/features/representatives/services/senate-votes-snapshot';

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const congress = Number.parseInt(argValue('--congress') ?? '119', 10);
  const from = argValue('--from') ?? '2026-01-03';
  const to = argValue('--to') ?? new Date().toISOString().slice(0, 10);

  const snapshot = await loadSenateVotesSnapshot(congress);
  if (!snapshot) throw new Error(`No snapshot file for the ${congress}th Congress`);

  const issues = await listRecordIssues(from, to);
  console.log(`${issues.length} Record issues from ${from} to ${to}`);

  let withTotal = 0;
  let noDigest = 0;
  const mismatches: string[] = [];
  for (const issue of issues) {
    const reading = await readSenateDigest(issue);
    if (!reading.digestFound) noDigest += 1;
    if (reading.total === null) continue;
    withTotal += 1;

    const session = sessionForDate(congress, issue.dateIssued);
    const entries = snapshot.menu.sessions[String(session)] ?? [];
    const through = entries.filter(e => e.d <= issue.dateIssued).length;
    // A session that runs past midnight dates its last votes the next day.
    const throughNextDay = entries.filter(e => e.d <= nextDay(issue.dateIssued)).length;
    const ok = reading.total === through || reading.total === throughNextDay;
    console.log(
      `${issue.dateIssued}  Record total ${reading.total}  stored through date ${through}` +
        `${throughNextDay !== through ? ` (next day ${throughNextDay})` : ''}  ${ok ? 'ok' : 'MISMATCH'}`
    );
    if (!ok) {
      mismatches.push(`${issue.dateIssued}: Record ${reading.total}, stored ${through}`);
    }
  }

  console.log(
    `\n${withTotal} issues with a Senate vote total, ${issues.length - withTotal} without` +
      ` (${noDigest} with no Daily Digest at all). Mismatches: ${mismatches.length}`
  );
  for (const m of mismatches) console.log(`  ${m}`);
  process.exit(mismatches.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
