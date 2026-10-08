/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Build-time encoder for one state's roll-call corpus. Runs from
 * scripts/sync-openstates-votes.ts, never in a request — it takes the parsed
 * rows of each session's `votes.csv`, `vote_people.csv`, `bills.csv` and
 * `organizations.csv` from the OpenStates bulk archive, plus the roster corpus
 * for party and chamber size, and emits the artifact described in
 * votes-corpus.ts.
 */

import { FLOOR_SHARE, ROLL_CALL_CHAMBERS, VOTE_OPTIONS } from './votes-corpus';
import type { EncodedRollCall, RollCallChamber, VoteOption, VotesCorpusFile } from './votes-corpus';

/** `votes.csv` — one row per roll call. */
export interface RawVoteRow {
  id: string;
  identifier?: string;
  motion_text?: string;
  start_date?: string;
  result?: string;
  organization_id?: string;
  bill_id?: string;
  session_identifier?: string;
}

/** `vote_people.csv` — one row per member per roll call. */
export interface RawVotePersonRow {
  vote_event_id: string;
  option?: string;
  voter_name?: string;
  voter_id?: string;
}

/** `bills.csv` — the two columns a vote card shows. */
export interface RawBillRow {
  id: string;
  identifier?: string;
  title?: string;
}

/** `organizations.csv` — classification resolves a roll call's chamber. */
export interface RawOrganizationRow {
  id: string;
  classification?: string;
  parent_id?: string;
}

export interface SessionInput {
  identifier: string;
  name: string;
  upstreamGeneratedAt: string;
  votes: RawVoteRow[];
  votePeople: RawVotePersonRow[];
  bills: RawBillRow[];
  organizations: RawOrganizationRow[];
}

/** What the builder needs from the roster corpus. */
export interface RosterMember {
  /** uuid, `ocd-person/` stripped. */
  uuid: string;
  party: string;
  chamber: RollCallChamber;
}

export interface BuildVotesInput {
  jurisdiction: string;
  generatedAt: string;
  sessions: SessionInput[];
  roster: RosterMember[];
}

const BILL_TITLE_MAX = 160;
const MOTION_MAX = 200;

const OPTION_SET = new Set<string>(VOTE_OPTIONS);

/** The CSV writes options in lower case already; anything unnamed is 'other'. */
function normalizeOption(raw: string | undefined): VoteOption {
  const option = (raw ?? '').trim().toLowerCase();
  return OPTION_SET.has(option) ? (option as VoteOption) : 'other';
}

/**
 * The chamber a roll call belongs to. Committee organizations carry a
 * `parent_id` chain up to their chamber; chambers classify as upper/lower, and
 * a unicameral body as legislature.
 */
function resolveChamber(
  organizationId: string | undefined,
  organizations: Map<string, RawOrganizationRow>
): RollCallChamber | null {
  let id = organizationId;
  for (let hops = 0; id && hops < 6; hops++) {
    const org = organizations.get(id);
    if (!org) return null;
    const classification = org.classification ?? '';
    if ((ROLL_CALL_CHAMBERS as readonly string[]).includes(classification)) {
      return classification as RollCallChamber;
    }
    id = org.parent_id;
  }
  return null;
}

function truncate(text: string | undefined, max: number): string {
  const value = (text ?? '').replace(/\s+/g, ' ').trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function buildVotesCorpus(input: BuildVotesInput): VotesCorpusFile {
  const parties: string[] = [];
  const partyIndexes = new Map<string, number>();
  const partyIndex = (name: string): number => {
    const existing = partyIndexes.get(name);
    if (existing !== undefined) return existing;
    const next = parties.push(name) - 1;
    partyIndexes.set(name, next);
    return next;
  };

  const rosterByUuid = new Map(input.roster.map(m => [m.uuid, m]));
  const chamberSizes = new Map<RollCallChamber, number>();
  for (const member of input.roster) {
    chamberSizes.set(member.chamber, (chamberSizes.get(member.chamber) ?? 0) + 1);
  }

  interface Pending {
    row: EncodedRollCall;
    /** [voter uuid, optionIdx] for every resolved voter. */
    voters: Array<[string, number]>;
  }
  const pending: Pending[] = [];
  let unresolvedVotes = 0;

  input.sessions.forEach((session, sessionIdx) => {
    const bills = new Map(session.bills.map(b => [b.id, b]));
    const organizations = new Map(session.organizations.map(o => [o.id, o]));

    const peopleByVote = new Map<string, RawVotePersonRow[]>();
    for (const person of session.votePeople) {
      const list = peopleByVote.get(person.vote_event_id);
      if (list) list.push(person);
      else peopleByVote.set(person.vote_event_id, [person]);
    }

    for (const vote of session.votes) {
      if (!vote.id) continue;
      const chamber = resolveChamber(vote.organization_id, organizations);
      if (!chamber) continue;

      const people = peopleByVote.get(vote.id) ?? [];
      let yes = 0;
      let no = 0;
      let other = 0;
      const tally = new Map<number, { yes: number; no: number }>();
      const voters: Array<[string, number]> = [];

      for (const person of people) {
        const option = normalizeOption(person.option);
        if (option === 'yes') yes++;
        else if (option === 'no') no++;
        else other++;

        const uuid = (person.voter_id ?? '').replace(/^ocd-person\//, '');
        if (!uuid) {
          unresolvedVotes++;
          continue;
        }
        voters.push([uuid, VOTE_OPTIONS.indexOf(option)]);

        const member = rosterByUuid.get(uuid);
        if (member && (option === 'yes' || option === 'no')) {
          const idx = partyIndex(member.party);
          const counts = tally.get(idx) ?? { yes: 0, no: 0 };
          if (option === 'yes') counts.yes++;
          else counts.no++;
          tally.set(idx, counts);
        }
      }

      const bill = vote.bill_id ? bills.get(vote.bill_id) : undefined;
      const chamberSize = chamberSizes.get(chamber) ?? 0;
      const floor: 0 | 1 = chamberSize > 0 && people.length >= chamberSize * FLOOR_SHARE ? 1 : 0;

      const partyTally: number[] = [];
      for (const [idx, counts] of [...tally.entries()].sort((a, b) => a[0] - b[0])) {
        partyTally.push(idx, counts.yes, counts.no);
      }

      pending.push({
        row: [
          vote.id.replace(/^ocd-vote\//, ''),
          (vote.start_date ?? '').slice(0, 10),
          (vote.result ?? '').toLowerCase() === 'pass' ? 1 : 0,
          ROLL_CALL_CHAMBERS.indexOf(chamber),
          (vote.bill_id ?? '').replace(/^ocd-bill\//, ''),
          truncate(bill?.identifier, 40),
          truncate(bill?.title, BILL_TITLE_MAX),
          truncate(vote.motion_text, MOTION_MAX),
          yes,
          no,
          other,
          floor,
          partyTally,
          sessionIdx,
        ],
        voters,
      });
    }
  });

  // Newest first, so a member's first entries are their most recent votes and
  // a profile's "recent roll calls" is a prefix rather than a sort.
  pending.sort((a, b) => b.row[1].localeCompare(a.row[1]) || a.row[0].localeCompare(b.row[0]));

  const members: Record<string, number[]> = {};
  let memberVotes = 0;
  pending.forEach((entry, rollCallIdx) => {
    for (const [uuid, optionIdx] of entry.voters) {
      (members[uuid] ??= []).push(rollCallIdx, optionIdx);
      memberVotes++;
    }
  });

  return {
    version: 1,
    jurisdiction: input.jurisdiction.toUpperCase(),
    generatedAt: input.generatedAt,
    sessions: input.sessions.map(s => ({
      identifier: s.identifier,
      name: s.name,
      upstreamGeneratedAt: s.upstreamGeneratedAt,
    })),
    chambers: ROLL_CALL_CHAMBERS,
    parties,
    options: VOTE_OPTIONS,
    rollCalls: pending.map(p => p.row),
    members,
    meta: {
      rollCalls: pending.length,
      memberVotes,
      members: Object.keys(members).length,
      unresolvedVotes,
      source: 'https://open.pluralpolicy.com/data/session-csv/ (public domain dedication)',
      methodology:
        'Every roll call in votes.csv of each current session whose organization ' +
        'resolves to a chamber, with each vote_people.csv row attributed to its ' +
        'voter_id. Rows without a voter_id are counted in the tallies but not ' +
        'attributed to any member. Party tallies use the roster corpus party of ' +
        `each resolved voter. A roll call is a floor vote when at least ${FLOOR_SHARE * 100}% ` +
        'of the chamber roster voted.',
    },
  };
}
