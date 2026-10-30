/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Daily Senate vote sync from the Congressional Record (step 4 of the Senate
 * vote source plan; senate.gov has blocked our mirror since 2026-10-23,
 * issue #300).
 *
 *   1. Read the Record issues since about a week before our newest stored
 *      Senate vote (GovInfo).
 *   2. For every roll call the Daily Digest totals count that we don't
 *      store yet, read the printed roll call and run the checks proven on
 *      all 915 roll calls of the 119th Congress (senate-roll-check.ts).
 *      A roll call failing any check is not stored.
 *   3. Look up what each vote was on in Congress.gov; a bill, amendment or
 *      nomination is used only when Congress.gov's own actions record this
 *      roll call. Otherwise it stays blank (and is retried on later runs).
 *   4. Apply granted "Change of Vote" requests, printed 1-5 days later.
 *   5. Roll calls in the window that we already store are read again and
 *      must agree with what we store; a disagreement is reported, never
 *      overwritten.
 *   6. Write data/senate-votes-{congress}.json.br (the workflow commits it,
 *      so the daily refill keeps these votes past Redis's 90 days) and POST
 *      the new and changed roll calls to the ingest route.
 *
 * Usage:
 *   npx tsx scripts/sync-senate-votes-from-record.ts [--congress 119] [--base https://civdotiq.org]
 *
 * --congress defaults to the sitting Congress.
 *     [--dry-run] [--summary summary.md]
 *
 * --dry-run writes nothing and posts nothing; it prints what would change.
 * --replay-from N (with --dry-run) treats this session's stored roll calls
 * from N on as not stored yet, rebuilds them from the Record, and compares
 * the result with the stored senate.gov copy: a test of this script on
 * votes whose answer is known.
 * Needs GOVINFO_API_KEY and CONGRESS_API_KEY; CRON_SECRET unless --dry-run.
 * Exits 1 when anything needs a person to look (the workflow opens an
 * issue); roll calls that passed are still stored.
 */

import './load-env';

import { createHash } from 'node:crypto';
import { appendFileSync, writeFileSync } from 'node:fs';
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { getCurrentCongressNumber } from '../src/lib/data/congressional-constants';
import { congressStartYear } from '../src/lib/data-sources/congressional-record/senate-digest';
import {
  checkRecordRollCall,
  POSITION_WORD,
} from '../src/lib/data-sources/congressional-record/senate-roll-check';
import { stripMeasureTags } from '../src/lib/senate-vote-fields';
import {
  withSenateMenuEntries,
  type CompactRollCall,
  type SenateMenuEntry,
} from '../src/features/representatives/services/roll-call-corpus';
import {
  loadSenateVotesSnapshot,
  snapshotPath,
  type SenateVotesSnapshotFile,
} from '../src/features/representatives/services/senate-votes-snapshot';
import {
  addDays,
  collectVoteDays,
  describeRoll,
  findRolls,
  keepDayOrder,
  listIssues,
  loadNominations,
  loadRoster,
  requestCounts,
  sectionUrl,
  type FoundRoll,
} from './senate-record-source';

/** Re-read this many days before our newest stored vote: change-of-vote
 *  requests arrive up to 5 days later, and blank descriptions get retried. */
const LOOKBACK_DAYS = 7;
/** Rolls per ingest POST (the route caps at 25). */
const BATCH_SIZE = 20;

const SOURCE =
  'senate.gov roll-call vote XML and vote menus (mirrored by the sync-senate-votes workflow, through 2026-10-22), and the Congressional Record (GovInfo) with Congress.gov for what each vote was on (sync-senate-votes-from-record workflow, from 2026-11)';

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const DRY_RUN = process.argv.includes('--dry-run');
const BASE_URL = (argValue('--base') || process.env.BASE_URL || 'https://civdotiq.org').replace(
  /\/$/,
  ''
);

/** Skips the Vercel Bot Protection challenge (firewall bypass rule). */
function siteHeaders(): Record<string, string> {
  const bypass = process.env.FIREWALL_BYPASS_TOKEN;
  return {
    Authorization: `Bearer ${process.env.CRON_SECRET}`,
    ...(bypass ? { 'x-civiq-bypass': bypass } : {}),
  };
}

async function postIngest(payload: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${BASE_URL}/api/intelligence/chamber-baselines/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...siteHeaders() },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(110_000),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || body.ok !== true) {
    throw new Error(`POST ingest -> ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function sameVotes(a: CompactRollCall['votes'], b: CompactRollCall['votes']): boolean {
  const key = (votes: CompactRollCall['votes']) =>
    votes
      .map(v => `${v.b}:${v.v}`)
      .sort()
      .join(',');
  return key(a) === key(b);
}

async function main(): Promise<void> {
  // The sitting Congress. A new one (the 120th, from 2027-01-03) has no
  // snapshot file yet, so the run fails loudly rather than file its votes
  // under the old one.
  const congress = Number.parseInt(argValue('--congress') ?? `${getCurrentCongressNumber()}`, 10);
  const summaryPath = argValue('--summary');
  if (!DRY_RUN && !process.env.CRON_SECRET) throw new Error('CRON_SECRET is required');

  const today = new Date().toISOString().slice(0, 10);
  const year = Number.parseInt(today.slice(0, 4), 10);
  // Jan 1-2 of an odd year still belong to the outgoing Congress's second session.
  const session = Math.min(2, year - congressStartYear(congress) + 1);
  if (session < 1 || session > 2) throw new Error(`${year} is not in the ${congress}th Congress`);

  const snapshot = await loadSenateVotesSnapshot(congress);
  if (!snapshot) throw new Error(`No snapshot file for the ${congress}th Congress`);
  const replayFrom = Number.parseInt(argValue('--replay-from') ?? '', 10);
  const replay = Number.isInteger(replayFrom);
  if (replay && !DRY_RUN) throw new Error('--replay-from needs --dry-run');
  const known = new Map(
    snapshot.rolls.filter(r => r.session === session).map(r => [r.rollCallNumber, r])
  );
  const knownEntries = new Map((snapshot.menu.sessions[String(session)] ?? []).map(e => [e.n, e]));
  const kept = (n: number) => !replay || n < replayFrom;
  const menuEntries = new Map([...knownEntries].filter(([n]) => kept(n)));
  const stored = new Map([...known].filter(([n]) => kept(n)));

  // The window: from the last stored roll call (with every one before it
  // stored too) at least LOOKBACK_DAYS before our newest vote.
  const newestDate = [...menuEntries.values()].reduce((d, e) => (e.d > d ? e.d : d), '');
  const lookbackFrom = newestDate ? addDays(newestDate, -LOOKBACK_DAYS) : '';
  let anchor = 0;
  while (stored.has(anchor + 1) && (menuEntries.get(anchor + 1)?.d ?? '') < lookbackFrom) {
    anchor += 1;
  }
  const sessionStart = `${congressStartYear(congress) + session - 1}-01-03`;
  const from = menuEntries.get(anchor)?.d ?? sessionStart;

  const terms = loadRoster();
  const issues = await listIssues(from < sessionStart ? sessionStart : from, today);
  const voteDays = await collectVoteDays(issues, terms, { startTotal: anchor, cacheBefore: '' });
  const { found, duplicates } = await findRolls(voteDays.days, '');
  const nominations = await loadNominations(congress, false);

  const problems: string[] = [
    ...voteDays.digestProblems,
    ...voteDays.changeProblems.map(p => `Change of vote could not be read: ${p}`),
    ...duplicates,
  ];
  const notes: string[] = [];
  const readAt = new Date().toISOString();
  const newRolls: CompactRollCall[] = [];
  const changedRolls = new Map<number, CompactRollCall>();
  const entries = new Map<number, SenateMenuEntry>();

  const inOrder = keepDayOrder();
  const entryFor = async (
    hit: FoundRoll
  ): Promise<{ entry: SenateMenuEntry; votedAt: string | null }> => {
    const description = await describeRoll({
      congress,
      session,
      found: hit,
      nominations,
      cache: false,
    });
    inOrder(description, hit.day.date);
    notes.push(...description.notes);
    return {
      entry: {
        n: hit.roll.rollCall,
        d: description.d,
        q: description.q,
        r: description.r,
        i: description.i,
        t: description.t,
        record: { url: sectionUrl(hit.packageId, hit.granuleId), readAt },
      },
      votedAt: description.votedAt,
    };
  };

  for (const day of voteDays.days) {
    for (const n of day.expected) {
      const hit = found.get(n);
      if (!hit) {
        problems.push(`Roll ${n} (${day.date}): counted by the Digest, not found in the Record`);
        continue;
      }
      const check = checkRecordRollCall(hit.roll, terms, day.date);
      notes.push(...check.notes);
      if (check.problems.length) {
        problems.push(`Roll ${n} (${day.date}) not stored: ${check.problems.join('; ')}`);
        continue;
      }
      const votes = [...check.positions].map(([b, v]) => ({ b, p: check.parties.get(b) ?? '', v }));
      const missingParty = votes.filter(v => !v.p).map(v => v.b);
      if (missingParty.length) {
        problems.push(`Roll ${n} not stored: no party on record for ${missingParty.join(', ')}`);
        continue;
      }
      const existing = stored.get(n);
      const entry = menuEntries.get(n);
      if (existing) {
        // Read again: it must agree with what we store, after any change of
        // vote this run applies below.
        const pending = votes.map(v => {
          const change = voteDays.changes.get(`${n}|${v.b}`);
          return change && change.change.from === v.v ? { ...v, v: change.change.to } : v;
        });
        if (!sameVotes(pending, existing.votes) && !sameVotes(votes, existing.votes)) {
          problems.push(
            `Roll ${n} (${day.date}): the Record and our stored ${entry?.record ? 'Record' : 'senate.gov'} copy disagree; stored copy kept`
          );
        }
        // A Record roll call whose description is still incomplete: try again.
        if (entry?.record && (!entry.q || !entry.i)) {
          const { entry: retried } = await entryFor(hit);
          if (retried.q !== entry.q || retried.i !== entry.i || retried.r !== entry.r) {
            entries.set(n, { ...retried, record: entry.record });
          }
        }
        continue;
      }
      const { entry: described, votedAt } = await entryFor(hit);
      newRolls.push({
        rollCallNumber: n,
        session,
        // Congress.gov's close time; the Record prints none, so without it
        // the vote day at 12:00 UTC (the same day in every U.S. time zone).
        date: votedAt ?? `${described.d}T12:00:00.000Z`,
        votes,
      });
      entries.set(n, described);
    }
  }

  // Granted changes of vote, on new or stored roll calls.
  const byNumber = new Map<number, CompactRollCall>([
    ...stored,
    ...newRolls.map(r => [r.rollCallNumber, r] as const),
  ]);
  for (const { change, bioguide, issueDate } of voteDays.changes.values()) {
    const roll = byNumber.get(change.rollCall);
    if (!roll) {
      if (change.rollCall > anchor) {
        problems.push(
          `Change of vote on roll ${change.rollCall} (Record of ${issueDate}): roll call not stored`
        );
      }
      continue;
    }
    const vote = roll.votes.find(v => v.b === bioguide);
    if (vote?.v === change.change.to) continue;
    if (vote?.v !== change.change.from) {
      problems.push(
        `Change of vote on roll ${change.rollCall}, ${bioguide}: Record says ${POSITION_WORD[change.change.from]} to ${POSITION_WORD[change.change.to]}, stored ${vote ? POSITION_WORD[vote.v] : '(not listed)'}`
      );
      continue;
    }
    const updated: CompactRollCall = {
      ...roll,
      votes: roll.votes.map(v => (v.b === bioguide ? { ...v, v: change.change.to } : v)),
    };
    byNumber.set(change.rollCall, updated);
    const fresh = newRolls.findIndex(r => r.rollCallNumber === change.rollCall);
    if (fresh >= 0) newRolls[fresh] = updated;
    else changedRolls.set(change.rollCall, updated);
    notes.push(
      `Roll ${change.rollCall}: ${bioguide} changed ${POSITION_WORD[change.change.from]} to ${POSITION_WORD[change.change.to]} by unanimous consent (Record of ${issueDate})`
    );
  }

  const rollsToSend = [...newRolls, ...changedRolls.values()];
  const changed = rollsToSend.length > 0 || entries.size > 0;

  const lines = [
    `## Senate votes from the Congressional Record, ${today}`,
    '',
    `- Record issues read: ${issues.length} (from ${from}); Digest total for session ${session}: ${voteDays.total}.`,
    `- New roll calls stored: ${newRolls.length}${newRolls.length ? ` (${newRolls.map(r => r.rollCallNumber).join(', ')})` : ''}.`,
    `- Stored roll calls changed by a change of vote: ${changedRolls.size}.`,
    `- Descriptions written or filled in: ${entries.size}; still blank: ${[...entries.values()].filter(e => !e.i).length}.`,
    `- Requests: GovInfo ${requestCounts.govinfo}, Congress.gov ${requestCounts.congress}.`,
    ...(DRY_RUN ? ['- Dry run: nothing written or posted.'] : []),
    ...(problems.length
      ? ['', `### Needs a look (${problems.length})`, '', ...problems.map(p => `- ${p}`)]
      : []),
    ...(notes.length ? ['', `### Notes (${notes.length})`, '', ...notes.map(p => `- ${p}`)] : []),
    ...(entries.size
      ? [
          '',
          '### What each vote was on',
          '',
          ...[...entries.values()]
            .sort((a, b) => a.n - b.n)
            .map(
              e =>
                `- Roll ${e.n} (${e.d}): ${e.q || '(question blank)'} · ${e.i || '(measure blank)'} · ${e.r || '(result blank)'}`
            ),
        ]
      : []),
  ];
  if (replay) {
    // Positions and parties must equal senate.gov's (after any change of
    // vote); filled-in description fields must equal senate.gov's too.
    const mismatches: string[] = [];
    for (const roll of newRolls) {
      const theirs = known.get(roll.rollCallNumber);
      const ours = new Map(roll.votes.map(v => [v.b, `${v.v}${v.p}`]));
      const differ = (theirs?.votes ?? []).filter(v => ours.get(v.b) !== `${v.v}${v.p}`);
      if (!theirs || differ.length || theirs.votes.length !== roll.votes.length) {
        mismatches.push(`Roll ${roll.rollCallNumber}: ${differ.length} senators differ`);
      }
    }
    for (const entry of entries.values()) {
      const theirs = knownEntries.get(entry.n);
      for (const field of ['d', 'q', 'r', 'i'] as const) {
        const value = field === 'q' ? stripMeasureTags(theirs?.q ?? '') : (theirs?.[field] ?? '');
        if (entry[field] && entry[field] !== value.trim()) {
          mismatches.push(
            `Roll ${entry.n} ${field}: ours "${entry[field]}", senate.gov "${value}"`
          );
        }
      }
    }
    const replayed = [...known.keys()].filter(n => !kept(n)).length;
    lines.push(
      '',
      `### Replay from roll ${replayFrom}: ${mismatches.length === 0 && newRolls.length === replayed ? 'PASS' : 'FAIL'}`,
      '',
      `- Rebuilt ${newRolls.length} of ${replayed} roll calls; ${mismatches.length} mismatches with senate.gov.`,
      ...mismatches.map(m => `- ${m}`)
    );
    if (mismatches.length || newRolls.length !== replayed) problems.push('replay mismatch');
  }

  const summary = lines.join('\n');
  console.log(summary);
  if (summaryPath) writeFileSync(summaryPath, `${summary}\n`);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);

  if (changed && !DRY_RUN) {
    // The committed file first: it is what keeps these votes alive.
    const rolls = [
      ...snapshot.rolls.filter(
        r =>
          r.session !== session ||
          (!changedRolls.has(r.rollCallNumber) &&
            !newRolls.some(n => n.rollCallNumber === r.rollCallNumber))
      ),
      ...rollsToSend,
    ].sort((a, b) => a.session - b.session || a.rollCallNumber - b.rollCallNumber);
    const file: SenateVotesSnapshotFile = {
      congress,
      generatedAt: readAt,
      source: SOURCE,
      menu: withSenateMenuEntries(snapshot.menu, session, [...entries.values()]),
      rolls,
    };
    writeSnapshot(file);

    // Each roll call goes with its new entry, if it has one; entries for
    // stored roll calls (a description filled in later) go in the last batch.
    const sent = new Set<number>();
    const batches: { rolls: CompactRollCall[]; entries: SenateMenuEntry[] }[] = [];
    for (let i = 0; i < rollsToSend.length; i += BATCH_SIZE) {
      const batch = rollsToSend.slice(i, i + BATCH_SIZE);
      const batchEntries = batch.flatMap(r => {
        const entry = entries.get(r.rollCallNumber);
        return entry ? [entry] : [];
      });
      batchEntries.forEach(e => sent.add(e.n));
      batches.push({ rolls: batch, entries: batchEntries });
    }
    const rest = [...entries.values()].filter(e => !sent.has(e.n));
    if (rest.length) batches.push({ rolls: [], entries: rest });
    for (const batch of batches) {
      const result = await postIngest({ kind: 'record-rolls', congress, session, ...batch });
      console.log(`Ingest: ${JSON.stringify(result)}`);
    }

    if (rollsToSend.length > 0) {
      const build = await fetch(
        `${BASE_URL}/api/intelligence/chamber-baselines?chamber=senate&build=true`,
        {
          headers: siteHeaders(),
          signal: AbortSignal.timeout(290_000),
        }
      );
      console.log(`Baselines build -> ${build.status}`);
      if (!build.ok) problems.push(`Senate baselines build answered ${build.status}`);
    }
  }

  process.exit(problems.length ? 1 : 0);
}

function writeSnapshot(file: SenateVotesSnapshotFile): void {
  const json = JSON.stringify(file);
  const compressed = brotliCompressSync(Buffer.from(json), {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
  });
  const outPath = snapshotPath(file.congress);
  writeFileSync(outPath, compressed);
  const rollsPerSession: Record<string, number> = {};
  let memberVotes = 0;
  for (const r of file.rolls) {
    rollsPerSession[r.session] = (rollsPerSession[r.session] ?? 0) + 1;
    memberVotes += r.votes.length;
  }
  const dates = file.rolls.map(r => r.date).sort((a, b) => a.localeCompare(b));
  const meta = {
    generatedAt: file.generatedAt,
    congress: file.congress,
    menuUpdatedAt: file.menu.updatedAt,
    rolls: file.rolls.length,
    rollsPerSession,
    memberVotes,
    firstVoteDate: dates[0] ?? null,
    lastVoteDate: dates.at(-1) ?? null,
    compressedBytes: compressed.length,
    sha256: createHash('sha256').update(json).digest('hex'),
    source: file.source,
  };
  writeFileSync(outPath.replace(/\.json\.br$/, '.meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`Wrote ${outPath} (${compressed.length} bytes)`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
