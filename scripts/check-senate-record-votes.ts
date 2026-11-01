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
 * Usage:
 *   npx tsx scripts/check-senate-record-votes.ts --year 2026 [--congress 119] [--out report.md]
 *
 * Read-only: changes nothing on the site. Needs GOVINFO_API_KEY. Downloads are
 * cached in .cache/congressional-record (gitignored), so reruns are free.
 * About 1,300 requests for 2026 on the first run.
 *
 * Pass = every roll call the Digest totals count is found, passes every check,
 * and every senator's position equals the stored senate.gov one, except where
 * a later Record prints a granted change of vote for exactly that difference.
 * Exits 1 otherwise. Nothing is corrected silently: every difference is listed.
 */

import './load-env';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import {
  congressStartYear,
  isSenateDigestTitle,
  parseSenateRecordVoteTotal,
} from '../src/lib/data-sources/congressional-record/senate-digest';
import {
  parseChangesOfVote,
  parseDigestVotePages,
  parseSenateRollCalls,
  recordNotes,
  recordText,
  selectGranulesForPages,
  type ChangeOfVote,
  type PageRange,
  type RecordRollCall,
} from '../src/lib/data-sources/congressional-record/senate-roll-calls';
import {
  isFirstOrLastDay,
  matchPrintedName,
  seatedOn,
  senateTerms,
  type RosterLegislator,
} from '../src/lib/data-sources/congressional-record/senate-roster';
import { loadSenateVotesSnapshot } from '../src/features/representatives/services/senate-votes-snapshot';
import type { PositionCode } from '../src/features/representatives/services/roll-call-corpus';

const API = 'https://api.govinfo.gov';
const CACHE_DIR = join(process.cwd(), '.cache', 'congressional-record');
/** Issues this recent may still be filling in on GovInfo; don't cache their lists. */
const FRESH_DAYS = 3;
const POSITION_WORD: Record<PositionCode, string> = {
  Y: 'Yea',
  N: 'Nay',
  P: 'Present',
  X: 'Not Voting',
};

interface Granule {
  granuleId: string;
  title?: string;
  granuleClass?: string;
}

interface FoundRoll {
  roll: RecordRollCall;
  issueDate: string;
  packageId: string;
}

let requests = 0;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function cachedGet(url: string, file: string, cache: boolean): Promise<string> {
  const path = join(CACHE_DIR, file);
  if (cache && existsSync(path)) return readFileSync(path, 'utf8');
  for (let attempt = 1; ; attempt++) {
    requests += 1;
    const response = await fetch(url, {
      headers: { 'X-API-Key': process.env.GOVINFO_API_KEY ?? 'DEMO_KEY' },
      signal: AbortSignal.timeout(30_000),
    }).catch((error: Error) => error);
    if (!(response instanceof Error) && response.ok) {
      const text = await response.text();
      if (cache) writeFileSync(path, text);
      return text;
    }
    const why = response instanceof Error ? response.message : `HTTP ${response.status}`;
    if (attempt >= 4) throw new Error(`GovInfo ${why} for ${url.replace(API, '')}`);
    await new Promise(resolve => setTimeout(resolve, 3_000 * attempt));
  }
}

async function listIssues(
  from: string,
  to: string
): Promise<{ packageId: string; date: string }[]> {
  const issues: { packageId: string; date: string }[] = [];
  let url: string | null =
    `${API}/published/${from}/${to}?collection=CREC&pageSize=100&offsetMark=*`;
  while (url) {
    const body = JSON.parse(await cachedGet(url, '', false)) as {
      packages?: { packageId: string; dateIssued: string }[];
      nextPage?: string | null;
    };
    for (const p of body.packages ?? [])
      issues.push({ packageId: p.packageId, date: p.dateIssued.slice(0, 10) });
    url = body.nextPage ?? null;
  }
  return issues.sort((a, b) => a.date.localeCompare(b.date));
}

async function granulesOf(packageId: string, cache: boolean): Promise<Granule[]> {
  const granules: Granule[] = [];
  let url: string | null = `${API}/packages/${packageId}/granules?pageSize=1000&offsetMark=*`;
  for (let page = 1; url; page++) {
    const body = JSON.parse(
      await cachedGet(url, `${packageId}-granules${page > 1 ? `-${page}` : ''}.json`, cache)
    ) as { granules?: Granule[]; nextPage?: string | null };
    granules.push(...(body.granules ?? []));
    url = body.nextPage ?? null;
  }
  return granules;
}

async function sectionText(packageId: string, granuleId: string): Promise<string> {
  return cachedGet(
    `${API}/packages/${packageId}/granules/${granuleId}/htm`,
    `${granuleId}.htm`,
    true
  );
}

/** GPO correction notes that mention a roll call, keyed by section, so a
 *  section read twice (Digest pages, then the whole day) lists each once. */
const corrections = new Map<string, string[]>();

async function rollsInSections(packageId: string, granuleIds: string[]): Promise<RecordRollCall[]> {
  const texts: string[] = [];
  for (const id of granuleIds) {
    const htm = await sectionText(packageId, id);
    const notes = recordNotes(htm);
    if (notes.length) corrections.set(id, notes);
    texts.push(recordText(htm));
  }
  return parseSenateRollCalls(texts.join('\n'));
}

/** Whether an outcome means the question carried. Null when it can't be told. */
function carried(text: string | null): boolean | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/veto sustained/.test(t)) return false;
  if (/\bnot\b|rejected|fail/.test(t)) return false;
  if (
    /agreed|confirmed|passed|adopted|sustained|invoked|ratified|well[ -]taken|tabled|overridden/.test(
      t
    )
  )
    return true;
  return null;
}

async function main(): Promise<void> {
  const congress = Number.parseInt(argValue('--congress') ?? '119', 10);
  const year = Number.parseInt(argValue('--year') ?? '2026', 10);
  const out = argValue('--out');
  const session = year - congressStartYear(congress) + 1;
  if (session < 1 || session > 2) throw new Error(`${year} is not in the ${congress}th Congress`);
  mkdirSync(CACHE_DIR, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const from = `${year}-01-03`;
  const to = `${year + 1}-01-02` < today ? `${year + 1}-01-02` : today;
  const freshFrom = new Date(Date.now() - FRESH_DAYS * 86_400_000).toISOString().slice(0, 10);

  const snapshot = await loadSenateVotesSnapshot(congress);
  if (!snapshot) throw new Error(`No snapshot file for the ${congress}th Congress`);
  const stored = new Map(
    snapshot.rolls.filter(r => r.session === session).map(r => [r.rollCallNumber, r])
  );
  const menu = new Map((snapshot.menu.sessions[String(session)] ?? []).map(e => [e.n, e]));

  const legislators: RosterLegislator[] = [];
  for (const file of ['legislators-current.yaml', 'legislators-departed.yaml']) {
    legislators.push(
      ...(yaml.load(readFileSync(join('data', file), 'utf8')) as RosterLegislator[])
    );
  }
  const terms = senateTerms(legislators);

  // 1. Each vote day's Digest: the running total (which roll calls that day
  //    holds) and the pages they are printed on.
  const issues = await listIssues(from, to);
  const days: {
    packageId: string;
    date: string;
    expected: number[];
    pages: PageRange[];
    granules: Granule[];
    /** The issue before, whose pages hold the rest of an overnight session
     *  (2025 rolls 37-48: counted in the Feb 6 Digest, printed in the Feb 5
     *  issue's part 2; the Feb 6 issue has no Senate pages). */
    earlier: { packageId: string; granules: Granule[] } | null;
  }[] = [];
  let previousTotal = 0;
  let earlier: { packageId: string; granules: Granule[] } | null = null;
  const digestProblems: string[] = [];
  /** Granted vote changes, by "roll|bioguide". */
  const changes = new Map<string, { change: ChangeOfVote; issueDate: string; bioguide: string }>();
  const changeProblems: string[] = [];
  for (const issue of issues) {
    const granules = await granulesOf(issue.packageId, issue.date < freshFrom);
    for (const g of granules) {
      if (g.granuleClass !== 'SENATE' || !/^change of vote/i.test(g.title ?? '')) continue;
      for (const change of parseChangesOfVote(await sectionText(issue.packageId, g.granuleId))) {
        const match = matchPrintedName(change.speaker, seatedOn(terms, issue.date));
        if ('error' in match) {
          changeProblems.push(`${g.granuleId}: roll ${change.rollCall}, speaker ${match.error}`);
          continue;
        }
        changes.set(`${change.rollCall}|${match.bioguide}`, {
          change,
          issueDate: issue.date,
          bioguide: match.bioguide,
        });
      }
    }
    const digests = granules.filter(
      g => g.granuleClass === 'DAILYDIGEST' && isSenateDigestTitle(g.title)
    );
    let total: number | null = null;
    let pages: PageRange[] = [];
    for (const d of digests) {
      const text = await sectionText(issue.packageId, d.granuleId);
      const t = parseSenateRecordVoteTotal(text);
      if (t !== null && (total === null || t > total)) {
        total = t;
        pages = parseDigestVotePages(text);
      }
    }
    const senate = granules.filter(g => g.granuleClass === 'SENATE');
    const before = earlier;
    if (senate.length) earlier = { packageId: issue.packageId, granules: senate };
    // A later part of an issue, or the next day's, can repeat the same Digest:
    // the same total means no new votes.
    if (total === null || total === previousTotal) continue;
    if (total < previousTotal) {
      digestProblems.push(
        `${issue.date}: Digest total ${total} is below the previous ${previousTotal}`
      );
      continue;
    }
    const expected = Array.from({ length: total - previousTotal }, (_, i) => previousTotal + i + 1);
    previousTotal = total;
    days.push({ ...issue, expected, pages, granules: senate, earlier: before });
  }

  // 2. Read the sections on the Digest's pages; where a roll call the total
  //    counts isn't there (the page list can be wrong), read the whole day.
  const found = new Map<number, FoundRoll>();
  const duplicates: string[] = [];
  const keep = (rolls: RecordRollCall[], day: (typeof days)[number]) => {
    for (const roll of rolls) {
      const prior = found.get(roll.rollCall);
      if (!prior) found.set(roll.rollCall, { roll, issueDate: day.date, packageId: day.packageId });
      else if (JSON.stringify(prior.roll.names) !== JSON.stringify(roll.names)) {
        duplicates.push(
          `Roll ${roll.rollCall} printed differently on ${prior.issueDate} and ${day.date}`
        );
      }
    }
  };
  let wholeDays = 0;
  let earlierDays = 0;
  for (const day of days) {
    const ids = selectGranulesForPages(
      day.granules.map(g => g.granuleId),
      day.pages
    );
    keep(await rollsInSections(day.packageId, ids), day);
    if (day.expected.some(n => !found.has(n))) {
      wholeDays += 1;
      keep(
        await rollsInSections(
          day.packageId,
          day.granules.map(g => g.granuleId)
        ),
        day
      );
    }
    if (day.expected.some(n => !found.has(n)) && day.earlier) {
      earlierDays += 1;
      keep(
        await rollsInSections(
          day.earlier.packageId,
          day.earlier.granules.map(g => g.granuleId)
        ),
        day
      );
    }
  }

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
  /** Differences a printed, granted change of vote accounts for. */
  const explained: string[] = [];
  const usedChanges = new Set<string>();
  let positionsCompared = 0;
  let rollsIdentical = 0;

  for (const n of expectedAll) {
    const hit = found.get(n);
    const storedRoll = stored.get(n);
    if (!hit || !storedRoll) continue;
    const { roll, issueDate } = hit;
    const problems: string[] = [];
    if (roll.unknownHeadings.length)
      problems.push(`unknown heading ${roll.unknownHeadings.join(', ')}`);
    for (const code of ['Y', 'N', 'P', 'X'] as PositionCode[]) {
      const printed = roll.printedCounts[code];
      const listed = roll.names[code].length;
      if (roll.uncountedHeadings.includes(code)) {
        readByHand.push(
          `Roll ${n}: the ${POSITION_WORD[code]} heading has no number; ${listed} name${listed === 1 ? '' : 's'} listed`
        );
      } else if ((printed ?? 0) !== listed) {
        problems.push(
          `${POSITION_WORD[code]}: heading says ${printed ?? 0}, ${listed} names listed`
        );
      }
    }
    const lists = `${roll.names.Y.length}-${roll.names.N.length}`;
    if (!roll.tally) problems.push('no tally sentence found');
    else if (`${roll.tally.yeas}-${roll.tally.nays}` !== lists) {
      problems.push(`tally sentence ${roll.tally.yeas}-${roll.tally.nays}, lists ${lists}`);
    }
    if (roll.chairTally && `${roll.chairTally.yeas}-${roll.chairTally.nays}` !== lists) {
      readByHand.push(
        `Roll ${n}: the chair's read-out says ${roll.chairTally.yeas}-${roll.chairTally.nays}; headings, lead-in and names say ${lists}`
      );
    }

    const seated = seatedOn(terms, issueDate);
    const record = new Map<string, PositionCode>();
    for (const code of ['Y', 'N', 'P', 'X'] as PositionCode[]) {
      for (const name of roll.names[code]) {
        const match = matchPrintedName(name, seated);
        if ('error' in match) problems.push(match.error);
        else if (record.has(match.bioguide)) problems.push(`${name} listed twice`);
        else record.set(match.bioguide, code);
      }
    }
    for (const s of seated.filter(t => !record.has(t.bioguide))) {
      if (isFirstOrLastDay(terms, s.bioguide, issueDate)) {
        readByHand.push(
          `Roll ${n}: ${s.bioguide} not listed on their first or last day of service (${issueDate})`
        );
      } else {
        problems.push(`seated but not listed: ${s.bioguide}`);
      }
    }

    // Leg./Ex. is the session the vote was taken in, not the kind of item:
    // cloture on a nomination is often voted in legislative session (2026
    // rolls 33, 42, 255), so it isn't compared.
    const entry = menu.get(n);
    if (problems.length) {
      failed.push(`Roll ${n} (${issueDate}): ${problems.join('; ')}`);
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
    const storedBy = new Map(storedRoll.votes.map(v => [v.b, v.v]));
    for (const id of new Set([...storedBy.keys(), ...record.keys()])) {
      positionsCompared += 1;
      const a = record.get(id);
      const b = storedBy.get(id);
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

  const pass =
    notFound.length === 0 &&
    notInSnapshot.length === 0 &&
    notInRecord.length === 0 &&
    failed.length === 0 &&
    differences.length === 0 &&
    digestProblems.length === 0 &&
    changeProblems.length === 0 &&
    duplicates.length === 0;

  const list = (title: string, items: string[]) =>
    items.length ? [`\n### ${title} (${items.length})\n`, ...items.map(i => `- ${i}`)] : [];
  const report = [
    `## Senate votes: Congressional Record vs senate.gov, ${year} (session ${session} of the ${congress}th Congress)`,
    '',
    `**Result: ${pass ? 'PASS' : 'FAIL'}**`,
    '',
    `- Record issues read: ${issues.length}, of which ${days.length} had Senate roll-call votes (Digest total ${previousTotal}).`,
    `- Roll calls found in the Record: ${expectedAll.length - notFound.length} of ${expectedAll.length} (${wholeDays} vote days needed the whole day's Senate pages because the Digest page list missed a vote; ${earlierDays} needed the issue before, where an overnight session's pages are).`,
    `- Stored senate.gov roll calls for ${year}: ${stored.size}.`,
    `- Roll calls passing every check: ${expectedAll.length - notFound.length - failed.length}; identical in every position: ${rollsIdentical}.`,
    `- Senator positions compared: ${positionsCompared}; unexplained differences: ${differences.length}; differences a printed change of vote accounts for: ${explained.length}.`,
    `- Outcome wording to read by hand (not a position difference): ${outcomeNotes.length}; other printed oddities touching no position: ${readByHand.length}.`,
    `- GovInfo requests this run: ${requests} (cached downloads are reused).`,
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
    ...list('Changed by unanimous consent after the vote (senate.gov shows the change)', explained),
    ...list('Change of vote notices that could not be read', changeProblems),
    ...list('Outcome wording to read by hand', outcomeNotes),
    ...list('Printed oddities that touch no position', readByHand),
  ].join('\n');

  console.log(report);
  if (out) writeFileSync(out, `${report}\n`);
  process.exit(pass ? 0 : 1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
