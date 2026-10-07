/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * What each page's share image says. Pure: the opengraph-image routes fetch,
 * these only arrange. A fallback card carries only what the URL itself
 * proves, for when the upstream isn't ready in time.
 */

import type { PageCard, PageCardFact } from './page-card';
import { ordinal } from './profile-preview-data';
import type { EnhancedStateLegislator } from '@/types/state-legislature';
import { formatStateDistrict, getLegislatorRoleTitle } from '@/types/state-legislature';
import type { StateHubData } from '@/lib/state-hub/load-state-hub';
import type { Bill } from '@/types/bill';
import { getBillDisplayStatus } from '@/types/bill';
import type { EnhancedRepresentative } from '@/types/representative';
import { formatBillNumber, voteMeasureLabel } from '@/lib/bill-label';
import { stripMeasureTags } from '@/lib/senate-vote-fields';
import { formatDateOnly } from '@/lib/utils/date-only';
import { getStateName } from '@/lib/data/us-states';

/** Cut at a word boundary so a long title still reads. */
export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:—-]+$/, '')}…`;
}

function partyLetter(party: string | undefined): string {
  const p = (party ?? '').toLowerCase();
  if (p.startsWith('democrat')) return 'D';
  if (p.startsWith('republican')) return 'R';
  if (p.startsWith('independent')) return 'I';
  return party ? party.charAt(0).toUpperCase() : '';
}

// ── State legislator ────────────────────────────────────────────────────────

export function legislatorCard(legislator: EnhancedStateLegislator): PageCard {
  const stateName = getStateName(legislator.state) ?? legislator.state;
  const phone = legislator.phone || legislator.contact?.capitolOffice?.phone;
  return {
    party: legislator.party || undefined,
    kicker: `${stateName} ${getLegislatorRoleTitle(legislator.state, legislator.chamber)}`,
    title: legislator.name,
    subtitle: formatStateDistrict(legislator.district),
    facts: [],
    blurb: 'Contact, committees, sponsored bills and votes',
    line: phone ? { label: 'Capitol office', value: phone } : undefined,
    sources: ['Open States'],
  };
}

// ── State legislature hub ───────────────────────────────────────────────────

export function stateHubCard(hub: StateHubData): PageCard {
  const facts: PageCardFact[] = hub.chambers.map(c => ({
    value: String(c.seats ?? c.members.length),
    label: c.seats === null ? `${c.name} members` : `${c.name} seats`,
    detail: c.partyCounts.map(p => `${p.count} ${partyLetter(p.party)}`).join(' · '),
  }));
  if (hub.nextElectionYear) {
    facts.push({ value: String(hub.nextElectionYear), label: 'Next election' });
  }
  return {
    kicker: 'State legislature',
    title: hub.legislatureName,
    subtitle: 'Find your state legislators by home address',
    facts,
    sources: ['Open States', 'NCSL'],
  };
}

// ── Bill ────────────────────────────────────────────────────────────────────

const RESOLUTION_TYPES = new Set(['hres', 'sres', 'hconres', 'sconres', 'hjres', 'sjres']);

function billKind(type: string): string {
  return RESOLUTION_TYPES.has(type.toLowerCase()) ? 'Resolution' : 'Bill';
}

/**
 * "Jodey C. Arrington (R-TX)". Congress.gov's sponsor name arrives as
 * "Rep. Arrington, Jodey C. [R-TX-19]"; the roster's as "Jodey Arrington".
 */
export function sponsorLabel(name: string, party?: string, state?: string): string {
  const cg = name.match(
    /^(?:(?:Rep|Sen|Del)\.\s+)?([^,[]+),\s*([^[]+?)\s*\[([A-Z])-([A-Z]{2})(?:-\d+)?\]$/
  );
  if (cg) return `${cg[2]} ${cg[1]} (${cg[3]}-${cg[4]})`;
  const tag = [partyLetter(party), state].filter(Boolean).join('-');
  const bare = name.replace(/\s*\[[^\]]*\]$/, '');
  return tag ? `${bare} (${tag})` : bare;
}

export function billCard(bill: Bill): PageCard {
  const sponsor = bill.sponsor?.representative;
  const cosponsors = (bill.cosponsors ?? []).filter(c => !c.withdrawn).length;
  const facts: PageCardFact[] = [
    { value: getBillDisplayStatus(bill.status.current), label: 'Status' },
  ];
  if (sponsor?.name) {
    facts.push({
      value: sponsorLabel(sponsor.name, sponsor.party, sponsor.state),
      label: 'Sponsor',
    });
  }
  facts.push({ value: String(cosponsors), label: cosponsors === 1 ? 'Cosponsor' : 'Cosponsors' });

  const introduced = formatDateOnly(bill.introducedDate, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return {
    kicker: [
      `${billKind(bill.type)} · ${ordinal(Number(bill.congress))} Congress`,
      introduced && `introduced ${introduced}`,
    ]
      .filter(Boolean)
      .join(' · '),
    title: bill.number,
    subtitle: clip(bill.shortTitle || bill.title, 150),
    facts,
    sources: ['Congress.gov'],
  };
}

/** From the canonical slug alone, e.g. "119-hr-1". */
export function billFallbackCard(canonicalSlug: string): PageCard {
  const [congress = '', type = '', number = ''] = canonicalSlug.split('-');
  return {
    kicker: `${billKind(type)} · ${ordinal(Number(congress))} Congress`,
    title: formatBillNumber(type, number),
    facts: [],
    blurb: 'Status, sponsor, summary, text and roll-call votes',
    sources: ['Congress.gov'],
  };
}

// ── Roll-call vote ──────────────────────────────────────────────────────────

export interface VoteCardInput {
  chamber: 'House' | 'Senate';
  congress: string;
  rollNumber: number;
  date: string;
  question: string;
  result: string;
  yeas: number;
  nays: number;
  bill?: { number?: string; title?: string; type?: string } | null;
  amendment?: { number: string; purpose?: string } | null;
}

export function voteCard(vote: VoteCardInput): PageCard {
  const date = formatDateOnly(vote.date, { month: 'short', day: 'numeric', year: 'numeric' });
  const question = stripMeasureTags(vote.question);
  const measure = voteMeasureLabel(vote);
  return {
    kicker: [`${vote.chamber} roll call ${vote.rollNumber}`, date].filter(Boolean).join(' · '),
    title: clip(question || `Roll call ${vote.rollNumber}`, 70),
    subtitle: measure && measure !== question ? clip(measure, 130) : undefined,
    facts: [
      { value: vote.yeas.toLocaleString('en-US'), label: 'Yea' },
      { value: vote.nays.toLocaleString('en-US'), label: 'Nay' },
      { value: vote.result, label: 'Result' },
    ],
    sources: [vote.chamber === 'Senate' ? 'Senate.gov' : 'House Clerk'],
  };
}

/** From an id whose chamber is spelled out (house-119-1-100, senate-119-42). */
export function voteFallbackCard(id: {
  chamber: 'House' | 'Senate';
  congress: string;
  session?: string;
  rollNumber: string;
}): PageCard {
  const session = id.session ? `, session ${id.session}` : '';
  return {
    kicker: `${id.chamber} roll call`,
    title: `Roll call ${Number(id.rollNumber)}`,
    subtitle: `${ordinal(Number(id.congress))} Congress${session}`,
    facts: [],
    blurb: 'Question, result and how every member voted',
    sources: [id.chamber === 'Senate' ? 'Senate.gov' : 'House Clerk'],
  };
}

// ── Congressional district ──────────────────────────────────────────────────

/** "Michigan District 12" / "Alaska At-Large", matching the page's h1. */
export function districtSeatName(state: string, district: string): string {
  const stateName = getStateName(state) ?? state;
  if (district === 'STATE') return `${stateName} (Statewide)`;
  const seat = district.replace(/^0+/, '');
  return seat === '' || district === 'AL'
    ? `${stateName} At-Large`
    : `${stateName} District ${seat}`;
}

/** Who holds the seat, as far as the roster and the vacancy list say. */
export type DistrictSeat =
  | { kind: 'member'; member: EnhancedRepresentative }
  | { kind: 'vacant'; since: string | null }
  /** Roster read, nobody listed, no recorded vacancy: the roster may lag. */
  | { kind: 'unlisted' }
  /** Roster not read in time; say nothing about the member. */
  | { kind: 'unknown' };

function seatSubtitle(seat: DistrictSeat): string | undefined {
  switch (seat.kind) {
    case 'member': {
      const letter = partyLetter(seat.member.party);
      return `Represented by ${seat.member.name}${letter ? ` (${letter})` : ''}`;
    }
    case 'vacant': {
      const since = formatDateOnly(seat.since, { month: 'short', day: 'numeric', year: 'numeric' });
      return since ? `Vacant since ${since}` : 'Vacant seat';
    }
    case 'unlisted':
      return 'No current member on the congress-legislators roster';
    case 'unknown':
      return undefined;
  }
}

export function districtCard(state: string, district: string, seat: DistrictSeat): PageCard {
  const member = seat.kind === 'member' ? seat.member : null;
  const phone = member?.currentTerm?.phone || member?.phone;
  return {
    kicker: 'Congressional district',
    title: districtSeatName(state, district),
    subtitle: seatSubtitle(seat),
    facts: [],
    blurb: 'Representative, demographics and federal spending',
    line: phone ? { label: 'DC office', value: phone } : undefined,
    sources: seat.kind === 'unknown' ? [] : ['congress-legislators'],
  };
}
