/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Reading Senate roll calls from the Congressional Record (GovInfo) and what
 * each was on (Congress.gov), for scripts/check-senate-record-votes.ts and
 * scripts/sync-senate-votes-from-record.ts.
 *
 * Needs GOVINFO_API_KEY and CONGRESS_API_KEY. Downloads go to .cache/
 * (gitignored) when asked to: the check reruns for free, while the daily sync
 * reads recent issues fresh.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import {
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
  matchPrintedName,
  seatedOn,
  senateTerms,
  type RosterLegislator,
  type SenateTerm,
} from '../src/lib/data-sources/congressional-record/senate-roster';
import {
  actionsForRoll,
  amendmentInAction,
  billLabel,
  digestVoteContext,
  easternDate,
  measureCitations,
  nominationCitation,
  nominationKey,
  nomineeDescription,
  nomineeKeys,
  questionFromAction,
  recordedVoteTime,
  resultFromAction,
  resultFromRecord,
  voteTitle,
  type CongressAction,
  type VoteTarget,
} from '../src/lib/data-sources/congressional-record/senate-vote-descriptions';

const GOVINFO = 'https://api.govinfo.gov';
const CONGRESS_GOV = 'https://api.congress.gov/v3';
const GOVINFO_CACHE = join(process.cwd(), '.cache', 'congressional-record');
const CONGRESS_CACHE = join(process.cwd(), '.cache', 'congress-gov');
/** Congress.gov allows 5,000 requests an hour per key. */
const CONGRESS_SPACING_MS = 800;

export const requestCounts = { govinfo: 0, congress: 0 };

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function getWithRetry(url: string, headers: Record<string, string>): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) }).catch(
      (error: Error) => error
    );
    if (!(response instanceof Error) && response.ok) return response.text();
    const why = response instanceof Error ? response.message : `HTTP ${response.status}`;
    if (!(response instanceof Error) && response.status === 404) throw new Error(`${why}`);
    if (attempt >= 4) throw new Error(why);
    await new Promise(resolve => setTimeout(resolve, 3_000 * attempt));
  }
}

async function govinfoGet(url: string, file: string, cache: boolean): Promise<string> {
  const path = join(GOVINFO_CACHE, file);
  if (cache && file && existsSync(path)) return readFileSync(path, 'utf8');
  requestCounts.govinfo += 1;
  const text = await getWithRetry(url, {
    'X-API-Key': process.env.GOVINFO_API_KEY ?? 'DEMO_KEY',
  }).catch((error: Error) => {
    throw new Error(`GovInfo ${error.message} for ${url.replace(GOVINFO, '')}`);
  });
  if (cache && file) {
    mkdirSync(GOVINFO_CACHE, { recursive: true });
    writeFileSync(path, text);
  }
  return text;
}

let lastCongressRequest = 0;

/** A Congress.gov API path ("/bill/119/hr/9340/actions"), parsed. Null on 404. */
export async function congressGet<T>(path: string, cache: boolean): Promise<T | null> {
  const file = join(CONGRESS_CACHE, `${path.replace(/^\//, '').replace(/[/?&=]/g, '_')}.json`);
  if (cache && existsSync(file)) {
    const text = readFileSync(file, 'utf8');
    return text === 'null' ? null : (JSON.parse(text) as T);
  }
  const key = process.env.CONGRESS_API_KEY;
  if (!key) throw new Error('CONGRESS_API_KEY is required');
  const wait = lastCongressRequest + CONGRESS_SPACING_MS - Date.now();
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  lastCongressRequest = Date.now();
  requestCounts.congress += 1;
  const sep = path.includes('?') ? '&' : '?';
  let text: string;
  try {
    text = await getWithRetry(`${CONGRESS_GOV}${path}${sep}format=json`, { 'X-Api-Key': key });
  } catch (error) {
    if ((error as Error).message !== 'HTTP 404') {
      throw new Error(`Congress.gov ${(error as Error).message} for ${path}`);
    }
    text = 'null';
  }
  if (cache) {
    mkdirSync(CONGRESS_CACHE, { recursive: true });
    writeFileSync(file, text);
  }
  return text === 'null' ? null : (JSON.parse(text) as T);
}

// ── GovInfo: Record issues and sections ──────────────────────────────

export interface Granule {
  granuleId: string;
  title?: string;
  granuleClass?: string;
}

export interface RecordIssueRef {
  packageId: string;
  date: string;
}

export async function listIssues(from: string, to: string): Promise<RecordIssueRef[]> {
  const issues: RecordIssueRef[] = [];
  let url: string | null =
    `${GOVINFO}/published/${from}/${to}?collection=CREC&pageSize=100&offsetMark=*`;
  while (url) {
    const body = JSON.parse(await govinfoGet(url, '', false)) as {
      packages?: { packageId: string; dateIssued: string }[];
      nextPage?: string | null;
    };
    for (const p of body.packages ?? [])
      issues.push({ packageId: p.packageId, date: p.dateIssued.slice(0, 10) });
    url = body.nextPage ?? null;
  }
  return issues.sort((a, b) => a.date.localeCompare(b.date));
}

export async function granulesOf(packageId: string, cache: boolean): Promise<Granule[]> {
  const granules: Granule[] = [];
  let url: string | null = `${GOVINFO}/packages/${packageId}/granules?pageSize=1000&offsetMark=*`;
  for (let page = 1; url; page++) {
    const body = JSON.parse(
      await govinfoGet(url, `${packageId}-granules${page > 1 ? `-${page}` : ''}.json`, cache)
    ) as { granules?: Granule[]; nextPage?: string | null };
    granules.push(...(body.granules ?? []));
    url = body.nextPage ?? null;
  }
  return granules;
}

export async function sectionText(
  packageId: string,
  granuleId: string,
  cache: boolean
): Promise<string> {
  return govinfoGet(
    `${GOVINFO}/packages/${packageId}/granules/${granuleId}/htm`,
    `${granuleId}.htm`,
    cache
  );
}

/** A section's public page on GovInfo, for source links. */
export function sectionUrl(packageId: string, granuleId: string): string {
  return `https://www.govinfo.gov/content/pkg/${packageId}/html/${granuleId}.htm`;
}

export function loadRoster(): SenateTerm[] {
  const legislators: RosterLegislator[] = [];
  for (const file of ['legislators-current.yaml', 'legislators-departed.yaml']) {
    legislators.push(
      ...(yaml.load(readFileSync(join('data', file), 'utf8')) as RosterLegislator[])
    );
  }
  return senateTerms(legislators);
}

// ── Vote days: which roll calls each issue holds ─────────────────────

export interface VoteDay {
  packageId: string;
  date: string;
  /** Roll calls the Digest's running total adds on this day. */
  expected: number[];
  pages: PageRange[];
  granules: Granule[];
  /** The Senate Daily Digest text, for what each vote was on. */
  digestText: string;
  /** The issue before, whose pages hold the rest of an overnight session
   *  (2025 rolls 37-48: counted in the Feb 6 Digest, printed in the Feb 5
   *  issue's part 2; the Feb 6 issue has no Senate pages). */
  earlier: { packageId: string; granules: Granule[] } | null;
}

export interface GrantedChange {
  change: ChangeOfVote;
  issueDate: string;
  bioguide: string;
  granuleId: string;
}

export interface VoteDays {
  days: VoteDay[];
  /** The Digest's newest running total. */
  total: number;
  digestProblems: string[];
  /** Granted vote changes, by "roll|bioguide". */
  changes: Map<string, GrantedChange>;
  changeProblems: string[];
}

/**
 * Walk Record issues in date order and assign each roll call above
 * `startTotal` to the issue whose Digest total first counts it. A later part
 * of an issue, or the next day's, can repeat the same total: no new votes.
 */
export async function collectVoteDays(
  issues: RecordIssueRef[],
  terms: SenateTerm[],
  opts: { startTotal: number; cacheBefore: string }
): Promise<VoteDays> {
  const days: VoteDay[] = [];
  let previousTotal = opts.startTotal;
  let earlier: VoteDay['earlier'] = null;
  const digestProblems: string[] = [];
  const changes = new Map<string, GrantedChange>();
  const changeProblems: string[] = [];
  for (const issue of issues) {
    const cache = issue.date < opts.cacheBefore;
    const granules = await granulesOf(issue.packageId, cache);
    for (const g of granules) {
      if (g.granuleClass !== 'SENATE' || !/^change of vote/i.test(g.title ?? '')) continue;
      for (const change of parseChangesOfVote(
        await sectionText(issue.packageId, g.granuleId, cache)
      )) {
        const match = matchPrintedName(change.speaker, seatedOn(terms, issue.date));
        if ('error' in match) {
          changeProblems.push(`${g.granuleId}: roll ${change.rollCall}, speaker ${match.error}`);
          continue;
        }
        changes.set(`${change.rollCall}|${match.bioguide}`, {
          change,
          issueDate: issue.date,
          bioguide: match.bioguide,
          granuleId: g.granuleId,
        });
      }
    }
    const digests = granules.filter(
      g => g.granuleClass === 'DAILYDIGEST' && isSenateDigestTitle(g.title)
    );
    let total: number | null = null;
    let pages: PageRange[] = [];
    const digestTexts: string[] = [];
    for (const d of digests) {
      const text = await sectionText(issue.packageId, d.granuleId, cache);
      digestTexts.push(recordText(text));
      const t = parseSenateRecordVoteTotal(text);
      if (t !== null && (total === null || t > total)) {
        total = t;
        pages = parseDigestVotePages(text);
      }
    }
    const senate = granules.filter(g => g.granuleClass === 'SENATE');
    const before = earlier;
    if (senate.length) earlier = { packageId: issue.packageId, granules: senate };
    if (total === null || total <= previousTotal) {
      // Below the start is a day we already have; below a total this run
      // has already read is a Digest error.
      if (total !== null && total < previousTotal && previousTotal > opts.startTotal) {
        digestProblems.push(
          `${issue.date}: Digest total ${total} is below the previous ${previousTotal}`
        );
      }
      continue;
    }
    const expected = Array.from({ length: total - previousTotal }, (_, i) => previousTotal + i + 1);
    previousTotal = total;
    days.push({
      ...issue,
      expected,
      pages,
      granules: senate,
      digestText: digestTexts.join('\n'),
      earlier: before,
    });
  }
  return { days, total: previousTotal, digestProblems, changes, changeProblems };
}

// ── Finding each roll call's printed text ────────────────────────────

export interface FoundRoll {
  roll: RecordRollCall;
  day: VoteDay;
  /** The section the roll call header is printed in. */
  granuleId: string;
  packageId: string;
}

export interface FoundRolls {
  found: Map<number, FoundRoll>;
  duplicates: string[];
  wholeDays: number;
  earlierDays: number;
  /** GPO correction notes that mention a roll call, by section. */
  corrections: Map<string, string[]>;
}

/**
 * Read the sections on each day's Digest pages; where a roll call the total
 * counts isn't there (the page list can be wrong), read the whole day, then
 * the issue before.
 */
export async function findRolls(days: VoteDay[], cacheBefore: string): Promise<FoundRolls> {
  const found = new Map<number, FoundRoll>();
  const duplicates: string[] = [];
  const corrections = new Map<string, string[]>();
  let wholeDays = 0;
  let earlierDays = 0;

  const read = async (day: VoteDay, packageId: string, granuleIds: string[]) => {
    const cache = day.date < cacheBefore;
    for (const id of granuleIds) {
      const htm = await sectionText(packageId, id, cache);
      const notes = recordNotes(htm);
      if (notes.length) corrections.set(id, notes);
    }
    // Sections are joined so a roll call running onto the next section
    // (roll 254 of 2026) is read whole; each roll is credited to the
    // section its header is printed in.
    const texts: { id: string; text: string }[] = [];
    for (const id of granuleIds) {
      texts.push({ id, text: recordText(await sectionText(packageId, id, cache)) });
    }
    const joined = texts.map(t => t.text).join('\n');
    const rolls = parseSenateRollCalls(joined);
    for (const roll of rolls) {
      const marker = new RegExp(`\\[Rollcall\\s+Vote\\s+No\\.\\s*${roll.rollCall}\\b`, 'i');
      const granuleId = texts.find(t => marker.test(t.text))?.id ?? granuleIds[0] ?? '';
      const prior = found.get(roll.rollCall);
      if (!prior) found.set(roll.rollCall, { roll, day, granuleId, packageId });
      else if (JSON.stringify(prior.roll.names) !== JSON.stringify(roll.names)) {
        duplicates.push(
          `Roll ${roll.rollCall} printed differently on ${prior.day.date} and ${day.date}`
        );
      }
    }
  };

  for (const day of days) {
    await read(
      day,
      day.packageId,
      selectGranulesForPages(
        day.granules.map(g => g.granuleId),
        day.pages
      )
    );
    if (day.expected.some(n => !found.has(n))) {
      wholeDays += 1;
      await read(
        day,
        day.packageId,
        day.granules.map(g => g.granuleId)
      );
    }
    if (day.expected.some(n => !found.has(n)) && day.earlier) {
      earlierDays += 1;
      await read(
        day,
        day.earlier.packageId,
        day.earlier.granules.map(g => g.granuleId)
      );
    }
  }
  return { found, duplicates, wholeDays, earlierDays, corrections };
}

// ── Congress.gov: what each roll call was on ─────────────────────────

export interface NominationListing {
  citation: string;
  number: number;
  partNumber: string;
  description: string;
  key: string | null;
  /** Congress.gov's latest action: usually the confirmation vote. */
  latestAction: { actionDate?: string; text?: string } | null;
}

/** Every nomination of the Congress, for matching nominees by name. */
export async function loadNominations(
  congress: number,
  cache: boolean
): Promise<NominationListing[]> {
  const out: NominationListing[] = [];
  for (let offset = 0; ; offset += 250) {
    const page = await congressGet<{
      nominations?: Array<{
        citation?: string;
        number?: number;
        partNumber?: string;
        description?: string;
        latestAction?: { actionDate?: string; text?: string };
      }>;
    }>(`/nomination/${congress}?limit=250&offset=${offset}&sort=updateDate+asc`, cache);
    const items = page?.nominations ?? [];
    for (const n of items) {
      if (!n.number) continue;
      out.push({
        citation: n.citation ?? nominationCitation(n.number, n.partNumber),
        number: n.number,
        partNumber: n.partNumber ?? '00',
        description: n.description ?? '',
        key: nominationKey(n.description),
        latestAction: n.latestAction ?? null,
      });
    }
    if (items.length < 250) return out;
  }
}

async function allActions(path: string, cache: boolean): Promise<CongressAction[]> {
  const actions: CongressAction[] = [];
  for (let offset = 0; ; offset += 250) {
    const page = await congressGet<{ actions?: CongressAction[] }>(
      `${path}?limit=250&offset=${offset}`,
      cache
    );
    const items = page?.actions ?? [];
    actions.push(...items);
    if (items.length < 250) return actions;
  }
}

export interface RollDescription {
  /** The menu fields: blank where nothing was confirmed. */
  d: string;
  /** When the vote closed (UTC), from Congress.gov; null when it doesn't say. */
  votedAt: string | null;
  q: string;
  r: string;
  i: string;
  t: string;
  /** What Congress.gov confirmed ("PN1129", "H.R. 9340", "S.Amdt. 3937"), or null. */
  confirmedBy: string | null;
  /** Why something was left blank, or a disagreement worth reading. */
  notes: string[];
}

type Match =
  | {
      kind: 'amendment';
      number: string;
      action: CongressAction;
      bill?: string;
      /** Found in the bill's own actions, which name the amendment as the question. */
      onBill?: boolean;
    }
  | { kind: 'bill'; type: string; number: string; action: CongressAction }
  | { kind: 'nomination'; listing: NominationListing; action: CongressAction };

/**
 * What one Record roll call was on. A bill, amendment or nomination is used
 * only when Congress.gov's actions on it record this roll call; otherwise the
 * question and measure stay blank, and the result comes from the Record's
 * own outcome sentence.
 */
export async function describeRoll(args: {
  congress: number;
  session: number;
  found: FoundRoll;
  nominations: NominationListing[];
  cache: boolean;
}): Promise<RollDescription> {
  const { congress, session, found, nominations, cache } = args;
  const { roll, day } = found;
  const n = roll.rollCall;
  const notes: string[] = [];
  const digest = digestVoteContext(day.digestText, n);
  const text = `${digest ?? ''} ${roll.context}`;
  const dates = [addDays(day.date, -1), day.date, addDays(day.date, 1)];

  const matches: Match[] = [];
  for (const cite of measureCitations(text)) {
    if (cite.kind === 'amendment') {
      const actions = await allActions(
        `/amendment/${congress}/samdt/${cite.number}/actions`,
        cache
      );
      for (const action of actionsForRoll(actions, n, session, dates)) {
        matches.push({ kind: 'amendment', number: cite.number, action });
      }
      continue;
    }
    const actions = await allActions(
      `/bill/${congress}/${cite.type.toLowerCase()}/${cite.number}/actions`,
      cache
    );
    for (const action of actionsForRoll(actions, n, session, dates)) {
      const amendment = amendmentInAction(action.text ?? '');
      const label = billLabel(cite.type, cite.number) ?? undefined;
      if (amendment) {
        matches.push({ kind: 'amendment', number: amendment, action, bill: label, onBill: true });
      } else matches.push({ kind: 'bill', type: cite.type, number: cite.number, action });
    }
  }
  // Nominees by name ("Keith Sonderling, of Florida, to be …"), and
  // nominations whose latest action is this vote (military nominations have
  // no description to match: 2026 roll 49, Lt. Gen. Joshua M. Rudd).
  const keys = new Set(nomineeKeys(text));
  const latestIsThisVote = (l: NominationListing) =>
    l.latestAction !== null &&
    actionsForRoll([{ ...l.latestAction }], n, session, dates).length > 0;
  for (const listing of nominations.filter(
    l => (l.key && keys.has(l.key)) || latestIsThisVote(l)
  )) {
    const id = listing.partNumber === '00' ? `${listing.number}` : listing.citation.slice(2);
    const actions = await allActions(`/nomination/${congress}/${id}/actions`, cache);
    for (const action of actionsForRoll(actions, n, session, dates)) {
      matches.push({ kind: 'nomination', listing, action });
    }
  }

  const recordResult = resultFromRecord(roll.result);
  const blank = (why: string): RollDescription => {
    notes.push(why);
    return {
      d: day.date,
      votedAt: null,
      q: '',
      r: recordResult ?? '',
      i: '',
      t: '',
      confirmedBy: null,
      notes,
    };
  };
  const distinct = <T>(items: T[], key: (item: T) => string) => [
    ...new Map(items.map(item => [key(item), item])).values(),
  ];

  const amendments = distinct(
    matches.filter((m): m is Extract<Match, { kind: 'amendment' }> => m.kind === 'amendment'),
    m => m.number
  );
  const bills = distinct(
    matches.filter((m): m is Extract<Match, { kind: 'bill' }> => m.kind === 'bill'),
    m => `${m.type} ${m.number}`
  );
  const noms = distinct(
    matches.filter((m): m is Extract<Match, { kind: 'nomination' }> => m.kind === 'nomination'),
    m => m.listing.citation
  );

  let target: VoteTarget;
  let action: CongressAction;
  let issue = '';
  let title = '';
  let confirmedBy: string;
  // The bill's own actions say what the question was: an amendment's record
  // can list a vote the bill frames as a motion ("Senate concurred in the
  // House amendment … with an amendment (SA 5823)": 2026 roll 182).
  const framedByBill = bills.length > 0 && !amendments.some(a => a.onBill);
  if (!framedByBill && amendments.length > 1) {
    return blank(`roll ${n} recorded on ${amendments.length} amendments`);
  }
  if (!framedByBill && amendments.length === 1 && amendments[0]) {
    const a = amendments[0];
    const detail = await congressGet<{
      amendment?: {
        amendedBill?: { type?: string; number?: string; title?: string };
        purpose?: string;
        sponsors?: Array<{ lastName?: string }>;
      };
    }>(`/amendment/${congress}/samdt/${a.number}`, cache);
    const amended = detail?.amendment?.amendedBill;
    issue =
      (amended?.type && amended.number ? billLabel(amended.type, amended.number) : null) ??
      a.bill ??
      '';
    target = { kind: 'amendment', number: a.number };
    action = a.action;
    confirmedBy = `S.Amdt. ${a.number}`;
    const q = questionFromAction(action.text ?? '', target);
    title = q
      ? voteTitle(q, {
          kind: 'amendment',
          number: a.number,
          sponsor: detail?.amendment?.sponsors?.[0]?.lastName,
          purpose: detail?.amendment?.purpose ?? undefined,
        })
      : '';
  } else if (bills.length > 1) {
    return blank(`roll ${n} recorded on ${bills.length} bills`);
  } else if (bills.length === 1 && bills[0]) {
    const b = bills[0];
    const detail = await congressGet<{ bill?: { title?: string } }>(
      `/bill/${congress}/${b.type.toLowerCase()}/${b.number}`,
      cache
    );
    issue = billLabel(b.type, b.number) ?? '';
    target = { kind: 'bill', type: b.type };
    action = b.action;
    confirmedBy = issue;
    const q = questionFromAction(action.text ?? '', target);
    title = q ? voteTitle(q, { kind: 'bill', label: issue, title: detail?.bill?.title }) : '';
  } else if (noms.length > 1) {
    return blank(`roll ${n} recorded on ${noms.length} nominations`);
  } else if (noms.length === 1 && noms[0]) {
    const m = noms[0];
    issue = m.listing.citation;
    target = { kind: 'nomination' };
    action = m.action;
    confirmedBy = issue;
    const q = questionFromAction(action.text ?? '', target);
    title = q
      ? voteTitle(q, {
          kind: 'nomination',
          description: nomineeDescription(m.listing.description),
        })
      : '';
  } else {
    return blank(
      `roll ${n}: Congress.gov lists no record vote ${n} on ${
        measureCitations(text).length + keys.size
      } candidate measures${digest ? '' : ' (not named in the Digest)'}`
    );
  }

  const q = questionFromAction(action.text ?? '', target) ?? '';
  const r = resultFromAction(action.text ?? '', target) ?? '';
  const votedAt = recordedVoteTime(action, n, session);
  if (!q) notes.push(`roll ${n}: question not read from "${action.text ?? ''}"`);
  if (!r) notes.push(`roll ${n}: result not read from "${action.text ?? ''}"`);
  if (r && recordResult && r !== recordResult) {
    notes.push(`roll ${n}: Congress.gov "${r}", Record outcome "${roll.result ?? ''}"`);
  }
  return {
    // senate.gov dates a vote by the calendar day it was held: votes after
    // midnight in an overnight session (2026 rolls 96-105) carry the next
    // day, while the Record issue carries the day the session began.
    d: votedAt ? easternDate(votedAt) : (action.actionDate ?? day.date).slice(0, 10),
    votedAt,
    q,
    r: r || recordResult || '',
    i: issue,
    t: title,
    confirmedBy,
    notes,
  };
}

/**
 * Votes are taken one after another, so a roll call can't fall on an
 * earlier calendar day than the one before it in the same Record issue. For
 * a roll call Congress.gov gives no time for (nominations, blanks), take the
 * later day: 2025 roll 210 followed votes held after midnight on April 11.
 * Call in roll-call order.
 */
export function keepDayOrder(): (description: RollDescription, issueDate: string) => void {
  const latest = new Map<string, string>();
  return (description, issueDate) => {
    const previous = latest.get(issueDate);
    if (!description.votedAt && previous && previous > description.d) {
      description.d = previous;
    }
    if (!previous || description.d > previous) latest.set(issueDate, description.d);
  };
}
