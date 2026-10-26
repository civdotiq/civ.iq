/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Answer-first openings: one short paragraph under a page's h1 that answers
 * who or what the page is about, in the server HTML crawlers download.
 *
 * Rules every builder follows:
 * - Only facts the page already shows, from CIV.IQ's own data.
 * - Facts, never positions: how someone voted and how often, not what they
 *   "support" or "oppose".
 * - A missing fact is left out of the sentence, never guessed. A builder
 *   returns null when it has nothing to say.
 * - No pronouns: the second mention of a person is their surname.
 */

import { analyzeTenure, type TenureTerm } from '@/features/representatives/utils/tenure';

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

const ORDINAL_WORDS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
];

/** "sixth term", or "12th term" past ten. */
function termOrdinal(n: number): string {
  return ORDINAL_WORDS[n - 1] ?? ordinal(n);
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

/** "a Democratic", "an Independent", "an 18th", "an 11th". */
function withArticle(word: string): string {
  const vowelSound = /^[AEIOU]/i.test(word) || /^(8|11th|18th|11\d|18\d)/.test(word);
  return `${vowelSound ? 'an' : 'a'} ${word}`;
}

/** "the District of Columbia", "the U.S. Virgin Islands"; states as they are. */
function place(stateName: string): string {
  return /^(District of Columbia|(U\.S\. )?Virgin Islands|Northern Mariana Islands)/.test(stateName)
    ? `the ${stateName}`
    : stateName;
}

/** "Michigan's", "Texas'" stays "Texas's" (Chicago style). */
function possessive(name: string): string {
  return `${name}'s`;
}

/** The opening stays short: about 40 to 60 words. */
const MAX_WORDS = 60;

const words = (text: string): number => text.split(/\s+/).filter(Boolean).length;

/**
 * Sentences in priority order. Trailing sentences are dropped while the
 * paragraph runs over MAX_WORDS, but the first one is always kept.
 */
function join(sentences: Array<string | null | undefined | false>): string | null {
  const kept = sentences.filter((s): s is string => Boolean(s));
  while (kept.length > 1 && words(kept.join(' ')) > MAX_WORDS) kept.pop();
  return kept.length > 0 ? kept.join(' ') : null;
}

/** House seat as people say it: "Michigan's 6th congressional district". */
function houseSeat(stateName: string, district: string | null | undefined): string {
  const n = Number.parseInt(district ?? '', 10);
  return Number.isFinite(n) && n > 0
    ? `${possessive(place(stateName))} ${ordinal(n)} congressional district`
    : `${possessive(place(stateName))} at-large congressional district`;
}

// ── Federal member profile ──────────────────────────────────────────────

export interface MemberLedeInput {
  /** The name the member goes by ("Bernie Sanders"). */
  name: string;
  surname: string;
  /** "Democratic", "Republican", "Independent" (already an adjective). */
  party: string;
  chamber: 'House' | 'Senate';
  /** "Representative", "Delegate", "Resident Commissioner", "Senator". */
  role?: string;
  stateName: string;
  district?: string | null;
  terms: readonly TenureTerm[];
  /** November election year for the seat, when the page shows one. */
  nextElection?: number | null;
  committeeCount: number;
  subcommitteeCount: number;
}

/**
 * "Elissa Slotkin is a Democratic U.S. senator from Michigan. Slotkin has
 * served in the Senate since 2025, after serving in the House from 2019 to
 * 2025; the current term runs 2025–2031. The next election for the seat is in
 * November 2030. Slotkin serves on 4 committees and 7 subcommittees."
 */
export function memberLede(m: MemberLedeInput): string | null {
  const nonVoting = m.role === 'Delegate' || m.role === 'Resident Commissioner';
  const party = m.party ? `${m.party} ` : '';
  const who =
    m.chamber === 'Senate'
      ? `${m.name} is ${withArticle(`${party}U.S. senator`)} from ${place(m.stateName)}.`
      : nonVoting
        ? `${m.name} is the ${party}${m.role?.toLowerCase()} for ${place(m.stateName)}, a non-voting member of the U.S. House.`
        : `${m.name} is the ${party}U.S. representative for ${houseSeat(m.stateName, m.district)}.`;

  const t = analyzeTenure(m.terms, { chamber: m.chamber, role: m.role });
  let tenure: string | null = null;
  if (t) {
    const chamberName = t.now.chamber === 'Senate' ? 'Senate' : 'House';
    const term = `${t.currentTerm.start}–${t.currentTerm.end}`;
    if (t.earlier.length > 0) {
      const earlier = t.earlier
        .map(r =>
          r.chamber === t.now.chamber
            ? `from ${r.start} to ${r.end}`
            : `in the ${r.chamber} from ${r.start} to ${r.end}`
        )
        .join(' and ');
      const verb = t.unbroken ? 'after serving' : 'with earlier service';
      tenure = `${m.surname} has served in the ${chamberName} since ${t.now.start}, ${verb} ${earlier}; the current term runs ${term}.`;
    } else if (t.now.terms === 1) {
      tenure = `${m.surname} took office in ${t.now.start} and is serving a first term, which runs ${term}.`;
    } else {
      tenure = `${m.surname} has served in the ${chamberName} since ${t.now.start} and is serving ${withArticle(termOrdinal(t.now.terms))} term, which runs ${term}.`;
    }
  }

  const election = m.nextElection
    ? `The next election for the seat is in November ${m.nextElection}.`
    : null;

  const committees =
    m.committeeCount > 0
      ? `${m.surname} serves on ${plural(m.committeeCount, 'committee', 'committees')}${
          m.subcommitteeCount > 0
            ? ` and ${plural(m.subcommitteeCount, 'subcommittee', 'subcommittees')}`
            : ''
        }.`
      : null;

  return join([who, tenure, election, committees]);
}

// ── Congressional district ──────────────────────────────────────────────

export interface DistrictDemographics {
  population?: number;
  medianIncome?: number;
  medianAge?: number;
  collegePct?: number;
  povertyPct?: number;
  /** ACS 5-year vintage the figures come from (2024 = the 2020–2024 survey). */
  surveyYear?: number;
}

function demographicSentences(
  subject: string,
  d: DistrictDemographics | null | undefined
): string[] {
  if (!d) return [];
  const source = d.surveyYear
    ? `the Census Bureau's ${d.surveyYear} American Community Survey 5-year estimates`
    : 'the Census Bureau';
  const out: string[] = [];
  const traits: string[] = [];
  if (d.medianIncome)
    traits.push(
      `a median household income of $${Math.round(d.medianIncome).toLocaleString('en-US')}`
    );
  if (d.medianAge) traits.push(`a median age of ${d.medianAge.toFixed(1)}`);
  if (d.population) {
    out.push(
      `${subject} has ${d.population.toLocaleString('en-US')} residents${
        traits.length ? `, ${traits.join(' and ')}` : ''
      }, according to ${source}.`
    );
  }
  const shares: string[] = [];
  if (d.collegePct) shares.push(`${d.collegePct.toFixed(1)}% as college educated`);
  if (d.povertyPct) shares.push(`${d.povertyPct.toFixed(1)}% as living in poverty`);
  if (shares.length) {
    out.push(
      d.population
        ? `The same survey counts ${shares.join(' and ')}.`
        : `${source.charAt(0).toUpperCase()}${source.slice(1)} counts ${shares.join(' and ')}.`
    );
  }
  return out;
}

export interface CongressionalDistrictLedeInput {
  stateName: string;
  /** "6", "0"/"AL" for at-large. */
  district: string;
  member?: { name: string; surname: string; party: string; role?: string } | null;
  /** Shown on the page when the seat is vacant. */
  vacancy?: {
    previousName: string;
    previousParty: string;
    /** Recorded special election date (YYYY-MM-DD); absent when none is on file. */
    specialElectionDate?: string | null;
  } | null;
  demographics?: DistrictDemographics | null;
  /** 2024 general election winner, when the page lists results. */
  lastElection?: { winnerName: string; pct: number } | null;
  /** For tests; defaults to now. */
  today?: Date;
}

/**
 * "Michigan's 6th congressional district is represented by Debbie Dingell,
 * a Democratic U.S. representative. The district has 770,957 residents, …"
 */
export function congressionalDistrictLede(d: CongressionalDistrictLedeInput): string | null {
  const seat = houseSeat(d.stateName, d.district);
  const Seat = seat.charAt(0).toUpperCase() + seat.slice(1);
  let who: string | null = null;
  let election: string | null = null;
  if (d.vacancy) {
    // A date is stated only when one is on file; no date on file is not
    // evidence that none has been set, so nothing is said then.
    const date = d.vacancy.specialElectionDate;
    const when = date ? longDate(date) : null;
    const special = when
      ? new Date(date!) < (d.today ?? new Date())
        ? `A special election was held on ${when}.`
        : `A special election is scheduled for ${when}.`
      : null;
    who = join([
      `${Seat} is vacant.`,
      `The previous representative was ${d.vacancy.previousName} (${d.vacancy.previousParty}).`,
      special,
    ]);
  } else if (d.member) {
    const nonVoting = d.member.role === 'Delegate' || d.member.role === 'Resident Commissioner';
    who = nonVoting
      ? `${Seat} is represented by ${d.member.role} ${d.member.name} (${d.member.party}), a non-voting member of the U.S. House.`
      : `${Seat} is represented by ${d.member.name}, ${withArticle(`${d.member.party} U.S. representative`)}.`;
    if (d.lastElection && d.lastElection.pct > 0) {
      election = `${d.member.surname} won the 2024 general election with ${d.lastElection.pct.toFixed(1)}% of the vote.`;
    }
  }
  return join([who, election, ...demographicSentences('The district', d.demographics)]);
}

// ── State legislator ────────────────────────────────────────────────────

export interface StateLegislatorLedeInput {
  name: string;
  surname: string;
  stateName: string;
  /** "State Representative", "State Senator", "Assemblymember", "Councilmember". */
  role: string;
  /** "District 18", "Ward 1", "At-Large". */
  district: string;
  /** As the page shows it ("Democratic"); "Nonpartisan" is described, not labeled. */
  party?: string | null;
  inSeatSince?: string | null;
  committees: Array<{ name: string; role?: string | null }>;
  phone?: string | null;
  email?: string | null;
}

/** The party as a noun for a person: "a Democrat", "an independent". */
function partyMember(party: string | null | undefined): string | null {
  if (!party) return null;
  if (/^nonpartisan$/i.test(party)) return 'elected on a nonpartisan ballot';
  if (/^democratic/i.test(party)) return 'a Democrat';
  if (/^republican/i.test(party)) return 'a Republican';
  if (/^independent/i.test(party)) return 'an independent';
  if (/^libertarian/i.test(party)) return 'a Libertarian';
  if (/^green/i.test(party)) return 'a member of the Green Party';
  // "Other" says nothing about a member, so it is left out.
  return null;
}

/**
 * "Jason Hoskins, a Democrat, is the Michigan state representative for
 * District 18 and has held the seat since 2023. Hoskins serves on 3
 * committees: …"
 */
export function stateLegislatorLede(l: StateLegislatorLedeInput): string | null {
  const party = partyMember(l.party);
  const role = l.role.toLowerCase();
  const since = l.inSeatSince ? ` and has held the seat since ${l.inSeatSince}` : '';
  const who = `${l.name}${party ? `, ${party},` : ''} is the ${l.stateName} ${role} for ${l.district}${since}.`;

  let committees: string | null = null;
  if (l.committees.length > 0) {
    const named = l.committees.map(c => {
      const role =
        c.role && !/^member$/i.test(c.role)
          ? ` (${c.role
              .toLowerCase()
              .replace(
                /\b(democratic|republican)\b/g,
                w => w.charAt(0).toUpperCase() + w.slice(1)
              )})`
          : '';
      return `${c.name}${role}`;
    });
    const list =
      named.length <= 3
        ? named.length === 1
          ? named[0]
          : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`
        : null;
    committees = list
      ? `${l.surname} serves on ${plural(l.committees.length, 'committee', 'committees')}: ${list}.`
      : `${l.surname} serves on ${plural(l.committees.length, 'committee', 'committees')}.`;
  }

  const contact = [l.phone && `by phone at ${l.phone}`, l.email && `by email at ${l.email}`].filter(
    Boolean
  );
  const reach = contact.length ? `The office can be reached ${contact.join(' or ')}.` : null;
  return join([who, committees, reach]);
}

// ── State legislative district ──────────────────────────────────────────

export interface StateDistrictLedeInput {
  /** "Michigan Senate District 18". */
  districtName: string;
  /** "Senator", "Representative", "Delegate", "Assemblymember". */
  title: string;
  members: Array<{ name: string; party?: string | null }>;
  demographics?: DistrictDemographics | null;
}

/** "Michigan Senate District 18 is represented by Senator Thomas Albert (Republican). …" */
export function stateDistrictLede(d: StateDistrictLedeInput): string | null {
  const named = d.members.map(
    m => `${m.name}${m.party && !/^(nonpartisan|other)$/i.test(m.party) ? ` (${m.party})` : ''}`
  );
  let who: string;
  if (named.length === 0) {
    who = `No current legislator is listed for ${d.districtName}.`;
  } else if (named.length === 1) {
    who = `${d.districtName} is represented by ${d.title} ${named[0]}.`;
  } else {
    who = `${d.districtName} elects ${named.length} members: ${d.title}s ${named
      .slice(0, -1)
      .join(', ')} and ${named[named.length - 1]}.`;
  }
  return join([who, ...demographicSentences('The district', d.demographics)]);
}

// ── Question pages (/ask/[slug]/[bioguideId]) ───────────────────────────

const DAY = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "October 26, 2026"; null for an unparseable date. */
export function longDate(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : DAY.format(d);
}

function money(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)} billion`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)} million`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000).toLocaleString('en-US')},000`;
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

/**
 * "2136 Rayburn House Office Building, Washington, DC 20515": commas before
 * the city and state, and the five-digit ZIP. Other addresses pass through.
 */
export function formatOfficeAddress(address: string): string {
  const m = address.trim().match(/^(.*?),?\s+Washington,?\s+(?:DC|D\.C\.)\s+(\d{5})(?:-\d{4})?$/i);
  return m ? `${m[1]}, Washington, DC ${m[2]}` : address.trim();
}

/** "2024-Q4" → "the fourth quarter of 2024". */
function quarterPhrase(q: string): string | null {
  const m = q.match(/^(\d{4})-Q([1-4])$/);
  if (!m) return null;
  return `the ${['first', 'second', 'third', 'fourth'][Number(m[2]) - 1]} quarter of ${m[1]}`;
}

function listOf(items: string[]): string {
  return items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export type QuestionLedeInput =
  | {
      slug: 'voting-record';
      name: string;
      surname: string;
      /** The votes the page lists, newest first. */
      votes: Array<{ date: string }>;
      /** The page also summarizes sponsored and cosponsored bills. */
      hasLegislationSummary: boolean;
    }
  | {
      slug: 'bills-sponsored';
      name: string;
      surname: string;
      /** Congress.gov count of bills and resolutions sponsored in the 119th Congress. */
      sponsoredCount: number;
      /** When Congress.gov was read for the count. */
      asOf?: string | null;
      latest?: { number: string; title: string; introducedDate?: string; status?: string } | null;
    }
  | {
      slug: 'campaign-contributions';
      name: string;
      surname: string;
      finance: {
        totalRaised: number;
        totalSpent: number;
        cashOnHand: number;
        individualContributions: number;
        pacContributions: number;
        cycle: number;
        isCurrentCycle: boolean;
        coverageEndDate?: string;
      } | null;
    }
  | {
      slug: 'contact-info';
      name: string;
      surname: string;
      phone?: string | null;
      office?: string | null;
      website?: string | null;
      hasContactForm: boolean;
      districtOfficeCount: number;
    }
  | {
      slug: 'stock-trades';
      name: string;
      surname: string;
      /** 119th-Congress trades the page lists, newest first; null when the source was unreachable. */
      trades: Array<{ transactionDate: string }> | null;
    }
  | {
      slug: 'committee-members';
      /** "House Committee on Agriculture". */
      committee: string;
      memberCount: number;
      subcommitteeCount: number;
      /** "Glenn Thompson (R-PA-15)", as the page labels the leaders. */
      chair?: string | null;
      rankingMember?: string | null;
    }
  | {
      slug: 'committee-activity';
      committee: string;
      /** Hearings and meetings the page lists. */
      meetings: Array<{ date: string; title: string }>;
      /** Bills the page lists as referred to the committee. */
      billsShown: number;
      newestBillDate?: string | null;
      /** When Congress.gov was read. */
      asOf?: string | null;
    }
  | {
      slug: 'committee-lobbying';
      committee: string;
      /** Reports in the complete Senate LDA corpus matched to the committee; null when unavailable. */
      corpus: {
        reportCount: number;
        firstQuarter?: string;
        lastQuarter?: string;
      } | null;
    }
  | {
      slug: 'topic-bills';
      /** Policy area, e.g. "Health". */
      topic: string;
      billsShown: number;
      billsTotal: number | null;
      congress: number | null;
      asOf?: string | null;
      committees: Array<{ name: string; chamber: string }>;
      regulationCount: number;
    };

/**
 * The answer to the question the page asks, describing only what the page
 * shows. A list the page caps is described as "the N most recent", never as a
 * total; totals are stated only where the source reports one.
 */
export function questionLede(q: QuestionLedeInput): string | null {
  switch (q.slug) {
    case 'voting-record': {
      if (q.votes.length === 0) return null;
      const newest = longDate(q.votes[0]!.date);
      const oldest = longDate(q.votes[q.votes.length - 1]!.date);
      const span =
        newest && oldest
          ? newest === oldest
            ? `, all on ${newest}`
            : `, from ${oldest} to ${newest}`
          : '';
      return join([
        `This page lists ${possessive(q.name)} ${plural(q.votes.length, 'most recent recorded vote', 'most recent recorded votes')} in the 119th Congress${span}, with the measure and how ${q.surname} voted on each.`,
        q.hasLegislationSummary
          ? `It also summarizes the bills ${q.surname} has sponsored and cosponsored.`
          : null,
        `${possessive(q.surname)} full voting record is linked below.`,
      ]);
    }
    case 'bills-sponsored': {
      if (q.sponsoredCount <= 0) return null;
      const asOf = q.asOf ? longDate(q.asOf) : null;
      const latest = q.latest;
      const latestDate = latest?.introducedDate ? longDate(latest.introducedDate) : null;
      return join([
        `${asOf ? `As of ${asOf}, ` : ''}${q.name} has sponsored ${plural(q.sponsoredCount, 'bill or resolution', 'bills and resolutions')} in the 119th Congress, according to Congress.gov.`,
        latest
          ? `The most recent is ${latest.number}, the ${latest.title}${latestDate ? `, introduced on ${latestDate}` : ''}${
              latest.status ? ` (status: ${latest.status.toLowerCase()})` : ''
            }.`
          : null,
      ]);
    }
    case 'campaign-contributions': {
      const f = q.finance;
      if (!f || f.totalRaised <= 0) return null;
      const cycle = `${f.cycle - 1}–${String(f.cycle).slice(2)}`;
      const when = f.isCurrentCycle
        ? `in the ${cycle} election cycle`
        : `in the ${cycle} cycle, the most recent with FEC filings`;
      const through = f.coverageEndDate ? longDate(f.coverageEndDate) : null;
      const pct = (part: number) => Math.round((part / f.totalRaised) * 100);
      const sources: string[] = [];
      if (f.individualContributions > 0)
        sources.push(`${pct(f.individualContributions)}% came from individual donors`);
      if (f.pacContributions > 0) sources.push(`${pct(f.pacContributions)}% from PACs`);
      return join([
        `${through ? `According to FEC reports through ${through}` : 'According to FEC filings'}, ${q.name} has raised ${money(f.totalRaised)} ${when} and spent ${money(f.totalSpent)}, leaving ${money(f.cashOnHand)} cash on hand.`,
        sources.length ? `Of the money raised, ${sources.join(' and ')}.` : null,
      ]);
    }
    case 'contact-info': {
      const ways: string[] = [];
      if (q.phone) ways.push(`by phone at ${q.phone}`);
      if (q.hasContactForm) ways.push('through the official contact form');
      if (ways.length === 0 && !q.office) return null;
      return join([
        ways.length
          ? `${possessive(q.name)} Washington office can be reached ${ways.join(' or ')}.`
          : null,
        q.office ? `The office address is ${formatOfficeAddress(q.office)}.` : null,
        q.website
          ? `The official website is ${q.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}.`
          : null,
        q.districtOfficeCount > 0
          ? `${q.surname} also has ${plural(q.districtOfficeCount, 'district office', 'district offices')} listed below.`
          : null,
      ]);
    }
    case 'stock-trades': {
      if (q.trades === null) return null;
      if (q.trades.length === 0) {
        return `${q.name} has reported no stock trades in the 119th Congress, according to STOCK Act periodic transaction reports.`;
      }
      const latest = longDate(q.trades[0]!.transactionDate);
      return `${q.name} has reported ${plural(q.trades.length, 'stock trade', 'stock trades')} in the 119th Congress${
        latest ? `, most recently on ${latest}` : ''
      }, according to STOCK Act periodic transaction reports.`;
    }
    case 'committee-members': {
      if (q.memberCount <= 0) return null;
      const leaders = [
        q.chair && `${q.chair} is the chair`,
        q.rankingMember && `${q.rankingMember} is the ranking member`,
      ].filter((x): x is string => Boolean(x));
      return join([
        `The ${q.committee} has ${plural(q.memberCount, 'member', 'members')} in the 119th Congress.`,
        leaders.length ? `${listOf(leaders)}.` : null,
        q.subcommitteeCount > 0
          ? `The committee has ${plural(q.subcommitteeCount, 'subcommittee', 'subcommittees')}.`
          : null,
      ]);
    }
    case 'committee-activity': {
      // The page lists the committee's most recent held meetings by date.
      const asOf = q.asOf ? longDate(q.asOf) : null;
      const newestBill = q.newestBillDate ? longDate(q.newestBillDate) : null;
      if (q.meetings.length === 0 && q.billsShown === 0) return null;
      const lead = asOf ? `As of ${asOf}, this` : 'This';
      return join([
        q.meetings.length > 0
          ? `${lead} page lists the ${q.meetings.length === 1 ? 'most recent hearing or meeting' : `${q.meetings.length} most recent hearings and meetings`} of the ${q.committee} from Congress.gov.`
          : null,
        q.billsShown > 0
          ? `${q.meetings.length > 0 ? 'It also lists' : `${lead} page lists`} ${plural(q.billsShown, 'bill', 'bills')} referred to the committee${newestBill ? `, the newest introduced on ${newestBill}` : ''}.`
          : null,
      ]);
    }
    case 'committee-lobbying': {
      const c = q.corpus;
      if (!c || c.reportCount <= 0) return null;
      const from = c.firstQuarter ? quarterPhrase(c.firstQuarter) : null;
      const to = c.lastQuarter ? quarterPhrase(c.lastQuarter) : null;
      const span = from && to ? `From ${from} through ${to}, ` : '';
      const reports = plural(c.reportCount, 'lobbying report', 'lobbying reports');
      return join([
        `${span}${span ? reports : reports.replace(/^./, ch => ch.toUpperCase())} filed with the Senate listed issues or agencies that fall under the ${q.committee}.`,
        'Reports do not name committees; CIV.IQ matches each one by its issue codes and the agencies it contacted, so one report can count toward several committees.',
      ]);
    }
    case 'topic-bills': {
      const asOf = q.asOf ? longDate(q.asOf) : null;
      const counted =
        q.billsTotal !== null && q.congress !== null
          ? `${asOf ? `As of ${asOf}, ` : ''}there are ${plural(q.billsTotal, 'bill', 'bills')} in the ${q.topic} policy area in the ${ordinal(q.congress)} Congress, according to govinfo.gov bill status data.`.replace(
              /^./,
              c => c.toUpperCase()
            )
          : null;
      const shown =
        q.billsShown > 0
          ? `This page lists the ${plural(q.billsShown, 'most recently active bill', 'most recently active bills')}${
              q.regulationCount > 0 ? ' and related federal regulations' : ''
            }.`
          : null;
      const named = q.committees.map(c => `the ${c.chamber} ${c.name} Committee`);
      const committees = named.length
        ? `${listOf(named).replace(/^t/, 'T')} ${named.length === 1 ? 'oversees' : 'oversee'} the area.`
        : null;
      return join([counted, shown, committees]);
    }
  }
}
