/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Mirror senate.gov roll-call votes into the app's Redis corpus (MR10).
 *
 * senate.gov XML is Akamai-blocked from cloud IPs, so production can't
 * fetch it. This script runs where senate.gov IS reachable (the scheduled
 * GitHub Actions workflow, or a dev machine) and relays the official XML,
 * unmodified, to the authenticated ingest route:
 *
 *   1. Fetch the vote menu for each session of the current Congress.
 *   2. POST the menu inventory; the server answers with the rolls it lacks.
 *   3. Fetch only the missing roll-call XML files (paced), POST in batches.
 *   4. Trigger the Senate chamber-baselines build (reads the corpus only).
 *
 * Usage:
 *   CRON_SECRET=... npx tsx scripts/sync-senate-votes.ts [--base https://civdotiq.org]
 *
 * The base URL defaults to BASE_URL, then https://civdotiq.org. For local
 * runs against a dev server: --base http://localhost:3000
 */

import type { SenateMenuEntry } from '../src/lib/intelligence/analyzers/chamber-baselines';

const SENATE_BASE = 'https://www.senate.gov/legislative/LIS';

/** Be a polite guest on senate.gov: one request every 600ms. */
const FETCH_SPACING_MS = 600;

/** Rolls per ingest POST (server caps at 25). */
const BATCH_SIZE = 20;

const baseArgIndex = process.argv.indexOf('--base');
const BASE_URL = (
  (baseArgIndex !== -1 && process.argv[baseArgIndex + 1]) ||
  process.env.BASE_URL ||
  'https://civdotiq.org'
).replace(/\/$/, '');

const CRON_SECRET = process.env.CRON_SECRET;

function currentCongress(year: number): number {
  return Math.floor((year - 1789) / 2) + 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'CIV.IQ civic data mirror (civdotiq.org; contact via GitHub civdotiq/civ.iq)',
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status}`);
  }
  return response.text();
}

async function postIngest(payload: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${BASE_URL}/api/intelligence/chamber-baselines/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(110_000),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`POST ingest -> ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

/** Parse senate.gov's vote_menu XML into mirror entries. The menu's
 *  vote_date is day-month only ("24-Jun"); the year comes from the menu's
 *  own congress_year element. */
function parseMenu(xml: string): SenateMenuEntry[] {
  const year = xml.match(/<congress_year>(\d{4})<\/congress_year>/)?.[1];
  if (!year) throw new Error('Vote menu XML has no congress_year');

  const entries: SenateMenuEntry[] = [];
  for (const [block] of xml.matchAll(/<vote>[\s\S]*?<\/vote>/g)) {
    const tag = (name: string): string =>
      block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? '';

    const n = parseInt(tag('vote_number'), 10);
    if (!Number.isInteger(n)) continue;

    const date = new Date(`${tag('vote_date')}-${year}`);
    entries.push({
      n,
      d: Number.isNaN(date.getTime()) ? `${year}` : date.toISOString().slice(0, 10),
      q: tag('question').replace(/\s+/g, ' '),
      r: tag('result'),
      i: tag('issue'),
      t: tag('title'),
    });
  }
  return entries;
}

async function main(): Promise<void> {
  if (!CRON_SECRET) {
    throw new Error('CRON_SECRET env var is required');
  }

  const year = new Date().getFullYear();
  const congress = currentCongress(year);
  const sessions = year % 2 === 1 ? [1] : [1, 2];
  console.log(
    `Syncing Senate votes: Congress ${congress}, sessions [${sessions.join(', ')}] -> ${BASE_URL}`
  );

  // 1. Mirror the vote menus (the corpus' coverage denominator)
  const menuSessions: Record<string, SenateMenuEntry[]> = {};
  for (const session of sessions) {
    const xml = await fetchText(
      `${SENATE_BASE}/roll_call_lists/vote_menu_${congress}_${session}.xml`
    );
    const entries = parseMenu(xml);
    if (entries.length === 0) {
      throw new Error(`Vote menu for session ${session} parsed to zero entries`);
    }
    menuSessions[String(session)] = entries;
    console.log(`  menu session ${session}: ${entries.length} roll calls`);
  }

  // 2. The server answers with what it's missing
  const menuResult = await postIngest({ kind: 'menu', congress, sessions: menuSessions });
  const missing = (menuResult.missing ?? {}) as Record<string, number[]>;
  const totalMissing = Object.values(missing).reduce((sum, nums) => sum + nums.length, 0);
  console.log(`  server missing ${totalMissing} roll calls`);

  // 3. Fetch the gaps from senate.gov (paced) and relay in batches
  let persisted = 0;
  let rejected = 0;
  let fetchFailures = 0;

  for (const [sessionKey, voteNumbers] of Object.entries(missing)) {
    const session = parseInt(sessionKey, 10);
    let batch: Array<{ voteNumber: number; xml: string }> = [];

    const flush = async (): Promise<void> => {
      if (batch.length === 0) return;
      const result = await postIngest({ kind: 'rolls', congress, session, rolls: batch });
      persisted += Number(result.persisted ?? 0);
      const rejectedRolls = Array.isArray(result.rejected) ? result.rejected : [];
      rejected += rejectedRolls.length;
      for (const r of rejectedRolls) {
        console.warn(`  rejected: session ${session} roll ${JSON.stringify(r)}`);
      }
      console.log(`  session ${session}: ${persisted}/${totalMissing} persisted`);
      batch = [];
    };

    for (const voteNumber of voteNumbers) {
      const padded = String(voteNumber).padStart(5, '0');
      const url = `${SENATE_BASE}/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${padded}.xml`;
      try {
        const xml = await fetchText(url);
        batch.push({ voteNumber, xml });
      } catch (error) {
        fetchFailures++;
        console.warn(`  fetch failed: session ${session} roll ${voteNumber}: ${String(error)}`);
      }
      if (batch.length >= BATCH_SIZE) await flush();
      await sleep(FETCH_SPACING_MS);
    }
    await flush();
  }

  console.log(
    `Mirror complete: ${persisted} persisted, ${rejected} rejected, ${fetchFailures} fetch failures`
  );

  // 4. Rebuild the Senate baselines from the (now fuller) corpus
  const buildResponse = await fetch(
    `${BASE_URL}/api/intelligence/chamber-baselines?chamber=senate&build=true`,
    { headers: { Authorization: `Bearer ${CRON_SECRET}` }, signal: AbortSignal.timeout(290_000) }
  );
  const buildBody = (await buildResponse.json().catch(() => ({}))) as Record<string, unknown>;
  console.log(`Baselines build -> ${buildResponse.status}: ${JSON.stringify(buildBody)}`);

  if (!buildResponse.ok) {
    throw new Error('Senate baselines build did not produce a trustworthy blob');
  }
  if (rejected > 0 || fetchFailures > 0) {
    // Coverage gate passed (build succeeded), but surface partial-fetch
    // problems so the scheduled run's failure-issue automation notices
    // persistent rot instead of silently serving 90.1% coverage forever.
    throw new Error(
      `Sync completed with gaps: ${rejected} rejected, ${fetchFailures} fetch failures`
    );
  }
}

main().catch(error => {
  console.error(String(error));
  process.exit(1);
});
