/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Build-time encoder for the roster corpus. Runs from
 * scripts/sync-openstates-people.ts, never in a request — it takes the parsed
 * YAML of every `data/<jurisdiction>/legislature/*.yml` file in
 * openstates/people and emits the dictionary-encoded artifact described in
 * people-corpus.ts.
 */

import type { CorpusChamber, EncodedPersonRow, PeopleCorpusFile } from './people-corpus';

/** The subset of an openstates/people YAML record this build reads. */
export interface RawPersonYaml {
  id?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  image?: string;
  party?: Array<{ name?: string }>;
  roles?: Array<{
    type?: string;
    district?: string | number;
    start_date?: string | Date;
    end_date?: string | Date;
  }>;
  offices?: Array<{ classification?: string; address?: string; voice?: string }>;
  links?: Array<{ url?: string }>;
  ids?: Record<string, string>;
}

const CHAMBERS: CorpusChamber[] = ['upper', 'lower', 'legislature'];
const CHAMBER_SET = new Set<string>(CHAMBERS);

/** `ids` schemes worth keeping. `other_identifiers` is almost all legacy
 *  OpenStates row ids, which resolve to nothing and are dropped. */
const KEPT_ID_SCHEMES = new Set(['twitter', 'facebook', 'instagram', 'youtube']);

/**
 * YAML dates parse to Date objects when unquoted and strings when quoted —
 * upstream is inconsistent about it, so both forms reach here.
 */
function toDateString(value: string | Date | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/**
 * The chamber role a person currently holds.
 *
 * Upstream models a career as a list of roles, so "which seat is this person in
 * now" has to be derived. Measured across all 7,453 records: 7,445 have exactly
 * one chamber role with no `end_date` and none have two, so an open role is an
 * unambiguous answer. The 8 exceptions carry an explicit end date — six in the
 * future (still seated) and two in the past (departed since upstream last swept
 * `retired/`). Hence: prefer the open role, then a future-dated one, and treat a
 * person whose every role has ended as no longer seated.
 *
 * Sorting by `start_date` instead would be wrong: roles routinely omit it, and
 * a missing start date must not outrank a real one.
 */
export function currentChamberRole(
  person: RawPersonYaml,
  asOf: string
): NonNullable<RawPersonYaml['roles']>[number] | null {
  const roles = (person.roles ?? []).filter(r => r.type && CHAMBER_SET.has(r.type));
  if (roles.length === 0) return null;

  const open = roles.find(r => !r.end_date);
  if (open) return open;

  const future = roles
    .filter(r => toDateString(r.end_date) >= asOf)
    .sort((a, b) => toDateString(a.end_date).localeCompare(toDateString(b.end_date)));
  return future[future.length - 1] ?? null;
}

/** Prefer the capitol office, then any office that carries the field. */
function officeField(person: RawPersonYaml, field: 'address' | 'voice'): string {
  const offices = person.offices ?? [];
  const capitol = offices.find(o => o.classification === 'capitol' && o[field]);
  return (capitol ?? offices.find(o => o[field]))?.[field] ?? '';
}

function encode(
  person: RawPersonYaml,
  role: NonNullable<RawPersonYaml['roles']>[number],
  partyIndex: (name: string) => number
): EncodedPersonRow {
  const identifiers = Object.entries(person.ids ?? {})
    .filter(([scheme, value]) => KEPT_ID_SCHEMES.has(scheme) && value)
    .map(([scheme, value]) => [scheme, value] as [string, string]);

  return [
    (person.id ?? '').replace(/^ocd-person\//, ''),
    person.name ?? '',
    person.given_name ?? '',
    person.family_name ?? '',
    partyIndex(person.party?.[0]?.name ?? ''),
    CHAMBERS.indexOf(role.type as CorpusChamber),
    role.district === undefined || role.district === null ? '' : String(role.district),
    toDateString(role.start_date),
    toDateString(role.end_date),
    person.email ?? '',
    officeField(person, 'voice'),
    officeField(person, 'address'),
    person.image ?? '',
    (person.links ?? []).map(l => l.url).filter((u): u is string => !!u),
    identifiers,
  ];
}

export interface BuildInput {
  /** USPS code (uppercase) → the jurisdiction's parsed legislature YAML records. */
  byJurisdiction: Map<string, RawPersonYaml[]>;
  generatedAt: string;
  upstreamCommit: string;
  upstreamCommittedAt: string;
}

export function buildPeopleCorpus(input: BuildInput): PeopleCorpusFile {
  const asOf = input.generatedAt.slice(0, 10);
  const parties: string[] = [];
  const partyIndexes = new Map<string, number>();
  const partyIndex = (name: string): number => {
    const existing = partyIndexes.get(name);
    if (existing !== undefined) return existing;
    const next = parties.push(name) - 1;
    partyIndexes.set(name, next);
    return next;
  };

  const rows: EncodedPersonRow[] = [];
  const jurisdictions: PeopleCorpusFile['jurisdictions'] = [];
  let departed = 0;

  for (const jurisdiction of [...input.byJurisdiction.keys()].sort()) {
    const offset = rows.length;
    for (const person of input.byJurisdiction.get(jurisdiction) ?? []) {
      if (!person.id) continue;
      const role = currentChamberRole(person, asOf);
      // No open or future role means the seat has been vacated — upstream has
      // simply not moved the file to retired/ yet. Publishing them would show a
      // departed member as sitting and hide the vacancy.
      if (!role) {
        departed++;
        continue;
      }
      rows.push(encode(person, role, partyIndex));
    }
    jurisdictions.push([jurisdiction, offset, rows.length - offset]);
  }

  return {
    version: 1,
    generatedAt: input.generatedAt,
    upstreamCommit: input.upstreamCommit,
    upstreamCommittedAt: input.upstreamCommittedAt,
    parties,
    chambers: CHAMBERS,
    jurisdictions,
    rows,
    meta: {
      people: rows.length,
      departed,
      source: 'https://github.com/openstates/people (CC0-1.0)',
      methodology:
        'Every data/<jurisdiction>/legislature/*.yml record whose current role is a ' +
        'chamber seat (upper, lower, or the unicameral legislature). Statewide ' +
        'executives, municipal officials and retired members are excluded, as are ' +
        'members whose every chamber role has an end date in the past. The current ' +
        'role is the one with no end date, or failing that the latest future-dated one.',
    },
  };
}
