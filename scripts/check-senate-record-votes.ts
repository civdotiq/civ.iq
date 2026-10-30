/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Check the Congressional Record as a source for Senate votes: read every
 * Senate roll call the Record prints for a year, match each printed name to a
 * senator, and compare every position with the committed senate.gov copy
 * (data/senate-votes-{congress}.json.br).
 *
 * With --descriptions, also check what each vote was on: the question,
 * result, measure and date the daily sync writes from Congress.gov
 * (scripts/senate-record-source.ts describeRoll) against senate.gov's vote
 * menu. Pass = every filled-in field equals senate.gov's; a blank is allowed
 * and counted.
 *
 * Usage:
 *   npx tsx scripts/check-senate-record-votes.ts --year 2026 [--congress 119] [--descriptions] [--out report.md]
 *
 * Read-only: changes nothing on the site. Needs GOVINFO_API_KEY (and
 * CONGRESS_API_KEY with --descriptions). Downloads are cached in .cache/
 * (gitignored), so reruns are free. About 1,300 GovInfo requests for 2026 on
 * the first run.
 *
 * Pass = every roll call the Digest totals count is found, passes every check,
 * and every senator's position equals the stored senate.gov one, except where
 * a later Record prints a granted change of vote for exactly that difference.
 * Exits 1 otherwise. Nothing is corrected silently: every difference is listed.
 */

import './load-env';

import { writeFileSync } from 'node:fs';
import { congressStartYear } from '../src/lib/data-sources/congressional-record/senate-digest';
import {
  carried,
  checkRecordRollCall,
  POSITION_WORD,
} from '../src/lib/data-sources/congressional-record/senate-roll-check';
import { stripMeasureTags } from '../src/lib/senate-vote-fields';
import { loadSenateVotesSnapshot } from '../src/features/representatives/services/senate-votes-snapshot';
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
} from './senate-record-source';

/** Issues this recent may still be filling in on GovInfo; don't cache their lists. */
const FRESH_DAYS = 3;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const congress = Number.parseInt(argValue('--congress') ?? '119', 10);
  const year = Number.parseInt(argValue('--year') ?? '2026', 10);
  const out = argValue('--out');
  const checkDescriptions = process.argv.includes('--descriptions');
  const session = year - congressStartYear(congress) + 1;
  if (session < 1 || session > 2) throw new Error(`${year} is not in the ${congress}th Congress`);

  const today = new Date().toISOString().slice(0, 10);
  const from = `${year}-01-03`;
  const to = `${year + 1}-01-02` < today ? `${year + 1}-01-02` : today;
  const freshFrom = addDays(today, -FRESH_DAYS);

  const snapshot = await loadSenateVotesSnapshot(congress);
  if (!snapshot) throw new Error(`No snapshot file for the ${congress}th Congress`);
  const stored = new Map(
    snapshot.rolls.filter(r => r.session === session).map(r => [r.rollCallNumber, r])
  );
  const menu = new Map((snapshot.menu.sessions[String(session)] ?? []).map(e => [e.n, e]));
  const terms = loadRoster();

  // 1. Each vote day's Digest: the running total (which roll calls that day
  //    holds) and the pages they are printed on.
  const issues = await listIssues(from, to);
  const { days, total, digestProblems, changes, changeProblems } = await collectVoteDays(
    issues,
    terms,
    { startTotal: 0, cacheBefore: freshFrom }
  );

  // 2. Read the sections on the Digest's pages, then the whole day, then the
  //    issue before.
  const { found, duplicates, wholeDays, earlierDays, corrections } = await findRolls(
    days,
    freshFrom
  );

  // 3. Check each roll call and compare it with the stored senate.gov vote.
  const expectedAll = days.flatMap(d => d.expected);
  const notFound = expectedAll.filter(n => !found.has(n));
  const notInSnapshot = expectedAll.filter(n => found.has(n) && !stored.has(n));
  const notInRecord = [...stored.keys()]
    .filter(n => !expectedAll.includes(n))
    .sort((a, b) => a - b);
  const failed: string[] = [];
  const outcomeNotes: string[] = [];
  /** Printed oddities that don't touch any senator's position. */
  const readByHand: string[] = [];
  const differences: string[] = [];
  const partyDifferences: string[] = [];
  /** Differences a printed, granted change of vote accounts for. */
  const explained: string[] = [];
  const usedChanges = new Set<string>();
  let positionsCompared = 0;
  let rollsIdentical = 0;

  for (const n of expectedAll) {
    const hit = found.get(n);
    const storedRoll = stored.get(n);
    if (!hit || !storedRoll) continue;
    const { roll } = hit;
    const issueDate = hit.day.date;
    const check = checkRecordRollCall(roll, terms, issueDate);
    readByHand.push(...check.notes);
    // Leg./Ex. is the session the vote was taken in, not the kind of item:
    // cloture on a nomination is often voted in legislative session (2026
    // rolls 33, 42, 255), so it isn't compared.
    const entry = menu.get(n);
    if (check.problems.length) {
      failed.push(`Roll ${n} (${issueDate}): ${check.problems.join('; ')}`);
      continue;
    }

    const recordCarried = roll.vicePresident ? roll.vicePresident === 'Y' : carried(roll.result);
    const storedCarried = carried(entry?.r ?? null);
    if (recordCarried === null || storedCarried === null || recordCarried !== storedCarried) {
      outcomeNotes.push(
        `Roll ${n}: Record "${roll.result ?? '(none found)'}"${roll.vicePresident ? ` (Vice President ${POSITION_WORD[roll.vicePresident]})` : ''}; senate.gov "${entry?.r ?? ''}"`
      );
    }

    let same = true;
    const storedBy = new Map(storedRoll.votes.map(v => [v.b, v]));
    for (const id of new Set([...storedBy.keys(), ...check.positions.keys()])) {
      positionsCompared += 1;
      const a = check.positions.get(id);
      const b = storedBy.get(id)?.v;
      const change = changes.get(`${n}|${id}`);
      if (a !== b && change && change.change.from === a && change.change.to === b) {
        same = false;
        explained.push(
          `Roll ${n} (${issueDate}), ${id}: Record ${POSITION_WORD[a]}, senate.gov ${POSITION_WORD[b]}; changed by unanimous consent in the Record of ${change.issueDate}`
        );
        usedChanges.add(`${n}|${id}`);
      } else if (a !== b) {
        same = false;
        differences.push(
          `Roll ${n} (${issueDate}), ${id}: Record ${a ? POSITION_WORD[a] : '(not listed)'}, senate.gov ${b ? POSITION_WORD[b] : '(not listed)'}`
        );
      }
      const storedParty = storedBy.get(id)?.p;
      const party = check.parties.get(id);
      if (storedParty && party !== undefined && party !== storedParty) {
        partyDifferences.push(`Roll ${n}, ${id}: roster "${party}", senate.gov "${storedParty}"`);
      }
    }
    if (same) rollsIdentical += 1;
  }
  // A change both sources already show (the Record's list printed after it).
  for (const [key, { change, issueDate, bioguide }] of changes) {
    if (!usedChanges.has(key)) {
      readByHand.push(
        `Roll ${change.rollCall}: ${bioguide} changed ${POSITION_WORD[change.from]} to ${POSITION_WORD[change.to]} (Record of ${issueDate}); both sources already agree`
      );
    }
  }

  // 4. What each vote was on, against senate.gov's vote menu.
  const descriptionLines: string[] = [];
  const descriptionDifferences: string[] = [];
  const descriptionNotes: string[] = [];
  let descriptionsPass = true;
  if (checkDescriptions) {
    const nominations = await loadNominations(congress, true);
    const inOrder = keepDayOrder();
    const filled = { q: 0, r: 0, i: 0, d: 0 };
    const blank = { q: 0, r: 0, i: 0, d: 0 };
    for (const n of expectedAll) {
      const hit = found.get(n);
      const entry = menu.get(n);
      if (!hit || !entry) continue;
      const ours = await describeRoll({ congress, session, found: hit, nominations, cache: true });
      inOrder(ours, hit.day.date);
      descriptionNotes.push(...ours.notes);
      const theirs = {
        q: stripMeasureTags(entry.q),
        r: entry.r,
        i: entry.i.trim(),
        d: entry.d,
      };
      for (const field of ['q', 'r', 'i', 'd'] as const) {
        if (!ours[field]) {
          blank[field] += 1;
          continue;
        }
        filled[field] += 1;
        if (ours[field] !== theirs[field]) {
          descriptionDifferences.push(
            `Roll ${n} ${field}: ours "${ours[field]}", senate.gov "${theirs[field]}"`
          );
        }
      }
    }
    descriptionsPass = descriptionDifferences.length === 0;
    const count = (field: keyof typeof filled, label: string) =>
      `- ${label}: ${filled[field]} filled in, ${blank[field]} blank.`;
    descriptionLines.push(
      '',
      `**What each vote was on: ${descriptionsPass ? 'PASS' : 'FAIL'}** (every filled-in field must equal senate.gov's)`,
      '',
      count('i', 'Bill, amendment or nomination (from Congress.gov)'),
      count('q', 'Question'),
      count('r', 'Result'),
      count('d', 'Date'),
      `- Fields that differ from senate.gov: ${descriptionDifferences.length}.`,
      `- Congress.gov requests this run: ${requestCounts.congress} (cached downloads are reused).`
    );
  }

  const pass =
    notFound.length === 0 &&
    notInSnapshot.length === 0 &&
    notInRecord.length === 0 &&
    failed.length === 0 &&
    differences.length === 0 &&
    partyDifferences.length === 0 &&
    digestProblems.length === 0 &&
    changeProblems.length === 0 &&
    duplicates.length === 0 &&
    descriptionsPass;

  const list = (title: string, items: string[]) =>
    items.length ? [`\n### ${title} (${items.length})\n`, ...items.map(i => `- ${i}`)] : [];
  const report = [
    `## Senate votes: Congressional Record vs senate.gov, ${year} (session ${session} of the ${congress}th Congress)`,
    '',
    `**Result: ${pass ? 'PASS' : 'FAIL'}**`,
    '',
    `- Record issues read: ${issues.length}, of which ${days.length} had Senate roll-call votes (Digest total ${total}).`,
    `- Roll calls found in the Record: ${expectedAll.length - notFound.length} of ${expectedAll.length} (${wholeDays} vote days needed the whole day's Senate pages because the Digest page list missed a vote; ${earlierDays} needed the issue before, where an overnight session's pages are).`,
    `- Stored senate.gov roll calls for ${year}: ${stored.size}.`,
    `- Roll calls passing every check: ${expectedAll.length - notFound.length - failed.length}; identical in every position: ${rollsIdentical}.`,
    `- Senator positions compared: ${positionsCompared}; unexplained differences: ${differences.length}; differences a printed change of vote accounts for: ${explained.length}; party differences: ${partyDifferences.length}.`,
    `- Outcome wording to read by hand (not a position difference): ${outcomeNotes.length}; other printed oddities touching no position: ${readByHand.length}.`,
    `- GovInfo requests this run: ${requestCounts.govinfo} (cached downloads are reused).`,
    ...descriptionLines,
    ...list(
      'Not found in the Record',
      notFound.map(n => `Roll ${n}`)
    ),
    ...list(
      'Stored, but not counted by any Digest total',
      notInRecord.map(n => `Roll ${n}`)
    ),
    ...list(
      'In the Record, not stored',
      notInSnapshot.map(n => `Roll ${n}`)
    ),
    ...list('Digest problems', digestProblems),
    ...list('Printed twice, differently', duplicates),
    ...list(
      'GPO correction notes on roll calls (the text read is the corrected one)',
      [...corrections].map(([id, notes]) => `${id}: ${notes.join(' | ')}`)
    ),
    ...list('Roll calls failing a check (not compared)', failed),
    ...list('Position differences', differences),
    ...list('Party differences', partyDifferences),
    ...list('Changed by unanimous consent after the vote (senate.gov shows the change)', explained),
    ...list('Change of vote notices that could not be read', changeProblems),
    ...list('Outcome wording to read by hand', outcomeNotes),
    ...list('Printed oddities that touch no position', readByHand),
    ...list('Description fields that differ from senate.gov', descriptionDifferences),
    ...list('Description notes (why a field was left blank)', descriptionNotes),
  ].join('\n');

  console.log(report);
  if (out) writeFileSync(out, `${report}\n`);
  process.exit(pass ? 0 : 1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
