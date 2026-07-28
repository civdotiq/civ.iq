#!/usr/bin/env node
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Re-expire frozen Redis keys.
 *
 * `cachedFetch(key, fn, ttlSeconds)` takes SECONDS. Thirty-nine call sites
 * wrote their expiry as `6 * 60 * 60 * 1000`, which reads naturally if you
 * assume milliseconds, and so asked Redis to hold the data for 250 days
 * instead of 6 hours. The code is fixed (see src/__tests__/lib/cache/
 * ttl-units.test.ts) but the entries written under the old behaviour are
 * still on disk, holding real government data from whenever they were
 * written and refusing to refresh for years.
 *
 * That is how the roster incident happened: congress-legislators-current was
 * 69 days stale and the site served a Congress missing two sitting members.
 *
 * WHAT THIS DOES NOT DO: delete. Dropping ~15,500 keys at once means every
 * one is refetched from Congress.gov, FEC and USAspending on next request.
 * The FEC shared key is observed to cut out around 60 requests/minute, so a
 * mass flush trades a staleness problem for an outage.
 *
 * Instead each frozen key gets a short, spread-out TTL. The data stays
 * available the whole time, keys expire gradually so refetches spread across
 * days, and as each expires the now-correct code rewrites it properly. The
 * whole thing self-heals with no further intervention.
 *
 * The spread is derived from a hash of the key, not a random number, so
 * re-running this does not reshuffle expiry times.
 *
 * Usage:
 *   node scripts/ops/reexpire-frozen-keys.mjs --stage=record-card
 *   node scripts/ops/reexpire-frozen-keys.mjs --stage=record-card --apply
 *
 * Run the stages in the order listed in STAGES: riskiest and smallest first,
 * so problems surface on a small batch. Watch it; do not run it overnight.
 */

import fs from 'fs/promises';
import crypto from 'crypto';

const DAY = 86_400;

/** Anything holding a TTL longer than this was written by the old bug. */
const FROZEN_THRESHOLD_SECONDS = 90 * DAY;

/**
 * Ordered riskiest-first. `spreadDays` is the window the new TTLs are
 * scattered across — wider for large sets so the refetches thin out.
 */
const STAGES = [
  // Highest staleness impact: per-member bill, vote and money-raised counts.
  // Expensive to recompute, so give them room.
  { name: 'record-card', match: 'civiq:record-card:*', spreadDays: [1, 4] },
  // Biggest by count, cheap individually. Bill status changes as bills move.
  { name: 'bills', match: 'civiq:bill-*', spreadDays: [2, 10] },
  { name: 'joins', match: 'civiq:join-*', spreadDays: [1, 3] },
  { name: 'activitypub', match: 'civiq:activitypub:*', spreadDays: [1, 3] },
  { name: 'vote-meaning', match: 'civiq:vote-meaning:*', spreadDays: [1, 3] },
  // Separate bug: these have no expiry at all. incrementRequestCounter sets
  // the TTL on first increment, so a dropped EXPIRE leaks the key forever.
  { name: 'analytics', match: 'analytics:*', spreadDays: [1, 7] },
];

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const stageName = args.find(a => a.startsWith('--stage='))?.slice('--stage='.length);

const stage = STAGES.find(s => s.name === stageName);
if (!stage) {
  console.error(`Usage: --stage=<${STAGES.map(s => s.name).join('|')}> [--apply]`);
  process.exit(1);
}

const env = Object.fromEntries(
  (await fs.readFile(new URL('../../.env.local', import.meta.url), 'utf8'))
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const URL_BASE = env.UPSTASH_REDIS_REST_URL;
const TOKEN = env.UPSTASH_REDIS_REST_TOKEN;
if (!URL_BASE || !TOKEN) throw new Error('Missing Upstash credentials in .env.local');

async function pipeline(commands) {
  if (commands.length === 0) return [];
  const res = await fetch(`${URL_BASE}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()).map(r => r.result);
}

/**
 * Deterministic spread. Same key always lands on the same TTL, so a re-run is
 * idempotent rather than reshuffling every expiry time.
 */
function jitteredTtl(key, [minDays, maxDays]) {
  const digest = crypto.createHash('sha1').update(key).digest();
  const span = (maxDays - minDays) * DAY;
  return minDays * DAY + (digest.readUInt32BE(0) % span);
}

const fmtDays = seconds => (seconds / DAY).toFixed(1);

// ── Collect keys ────────────────────────────────────────────────────────────
process.stdout.write(`Scanning for ${stage.match} ... `);
const keys = [];
let cursor = '0';
do {
  const [next, batch] = (
    await pipeline([['SCAN', cursor, 'MATCH', stage.match, 'COUNT', '1000']])
  )[0];
  cursor = next;
  keys.push(...batch);
} while (cursor !== '0');
console.log(`${keys.length} keys`);

if (keys.length === 0) process.exit(0);

// ── Classify by current TTL ─────────────────────────────────────────────────
const ttls = new Map();
for (let i = 0; i < keys.length; i += 500) {
  const chunk = keys.slice(i, i + 500);
  const results = await pipeline(chunk.map(k => ['TTL', k]));
  chunk.forEach((k, j) => ttls.set(k, results[j]));
}

const frozen = [];
const noExpiry = [];
const healthy = [];
for (const [key, ttl] of ttls) {
  if (ttl === -1) noExpiry.push(key);
  else if (ttl > FROZEN_THRESHOLD_SECONDS) frozen.push(key);
  else healthy.push(key);
}

const targets = [...frozen, ...noExpiry];

console.log(`\n  frozen (TTL > 90d)   ${String(frozen.length).padStart(6)}`);
console.log(`  never expiring       ${String(noExpiry.length).padStart(6)}`);
console.log(`  healthy, left alone  ${String(healthy.length).padStart(6)}`);

if (targets.length === 0) {
  console.log('\nNothing to do.');
  process.exit(0);
}

const currentTtls = frozen.map(k => ttls.get(k));
if (currentTtls.length > 0) {
  console.log(
    `\n  current frozen TTL   ${fmtDays(Math.min(...currentTtls))}d – ${fmtDays(Math.max(...currentTtls))}d`
  );
}

// ── Plan ────────────────────────────────────────────────────────────────────
const plan = targets.map(key => [key, jitteredTtl(key, stage.spreadDays)]);

const buckets = new Map();
for (const [, ttl] of plan) {
  const day = Math.floor(ttl / DAY);
  buckets.set(day, (buckets.get(day) ?? 0) + 1);
}

console.log(`\nPlanned expiry spread (${stage.spreadDays[0]}–${stage.spreadDays[1]} days):`);
const width = Math.max(...buckets.values());
for (const day of [...buckets.keys()].sort((a, b) => a - b)) {
  const count = buckets.get(day);
  const bar = '█'.repeat(Math.max(1, Math.round((count / width) * 40)));
  console.log(`  day ${String(day).padStart(2)}  ${String(count).padStart(6)}  ${bar}`);
}

console.log('\nSample:');
for (const [key, ttl] of plan.slice(0, 5)) {
  const was = ttls.get(key);
  const wasLabel = was === -1 ? 'no expiry' : `${fmtDays(was)}d`;
  console.log(`  ${key.slice(0, 62).padEnd(64)} ${wasLabel.padStart(10)} -> ${fmtDays(ttl)}d`);
}

if (!apply) {
  console.log(`\nDRY RUN. ${plan.length} keys would be re-expired. Re-run with --apply.`);
  process.exit(0);
}

// ── Apply ───────────────────────────────────────────────────────────────────
console.log(`\nApplying to ${plan.length} keys ...`);
let done = 0;
for (let i = 0; i < plan.length; i += 500) {
  const chunk = plan.slice(i, i + 500);
  const results = await pipeline(chunk.map(([key, ttl]) => ['EXPIRE', key, String(ttl)]));
  done += results.filter(r => r === 1).length;
  process.stdout.write(`\r  ${done}/${plan.length}`);
}

console.log(`\n\nDone. ${done} keys re-expired; they now lapse gradually and the`);
console.log('current code rewrites each one with a correct TTL as it does.');
if (done !== plan.length) {
  console.log(`\nNote: ${plan.length - done} keys did not take an expiry (likely expired mid-run).`);
}
