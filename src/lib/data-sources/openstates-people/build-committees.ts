/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Build-time encoder for the committee corpus (committees-corpus.ts). Run by
 * scripts/sync-openstates-people.ts from the same tarball as the rosters.
 */

import type {
  CommitteeChamber,
  CommitteesCorpusFile,
  EncodedCommitteeRow,
  EncodedMember,
} from './committees-corpus';

/** The subset of an upstream data/<state>/committees/*.yml record we read. */
export interface RawCommitteeYaml {
  id?: string;
  name?: string;
  classification?: string;
  chamber?: string;
  parent?: string;
  links?: Array<{ url?: string }>;
  sources?: Array<{ url?: string }>;
  members?: Array<{ name?: string; role?: string; person_id?: string }>;
}

export interface BuildCommitteesInput {
  byJurisdiction: Map<string, RawCommitteeYaml[]>;
  generatedAt: string;
  upstreamCommit: string;
  upstreamCommittedAt: string;
}

const CHAMBERS: CommitteeChamber[] = ['upper', 'lower', 'legislature'];
const ORG_PREFIX = 'ocd-organization/';
const PERSON_PREFIX = 'ocd-person/';

function urls(list: Array<{ url?: string }> | undefined): string[] {
  return (list ?? []).map(l => l.url ?? '').filter(Boolean);
}

export function buildCommitteesCorpus(input: BuildCommitteesInput): CommitteesCorpusFile {
  const roles: string[] = [];
  const roleIndex = new Map<string, number>();
  const roleIdx = (role: string): number => {
    let i = roleIndex.get(role);
    if (i === undefined) {
      i = roles.length;
      roles.push(role);
      roleIndex.set(role, i);
    }
    return i;
  };

  const rows: EncodedCommitteeRow[] = [];
  const jurisdictions: CommitteesCorpusFile['jurisdictions'] = [];
  let memberships = 0;

  for (const code of [...input.byJurisdiction.keys()].sort((a, b) => a.localeCompare(b))) {
    const offset = rows.length;
    const committees = (input.byJurisdiction.get(code) ?? [])
      .filter(c => c.id?.startsWith(ORG_PREFIX) && c.name)
      // Stable order so a weekly rebuild only diffs on real changes.
      .sort(
        (a, b) =>
          (a.name ?? '').localeCompare(b.name ?? '') || (a.id ?? '').localeCompare(b.id ?? '')
      );

    for (const c of committees) {
      const chamber = CHAMBERS.indexOf((c.chamber ?? 'legislature') as CommitteeChamber);
      const members: EncodedMember[] = (c.members ?? [])
        .filter(m => m.name)
        .map(m => [
          m.name ?? '',
          roleIdx(m.role ?? 'member'),
          m.person_id?.startsWith(PERSON_PREFIX) ? m.person_id.slice(PERSON_PREFIX.length) : '',
        ]);
      memberships += members.length;
      rows.push([
        (c.id ?? '').slice(ORG_PREFIX.length),
        c.name ?? '',
        chamber === -1 ? 2 : chamber,
        c.classification === 'subcommittee' ? 1 : 0,
        c.parent?.startsWith(ORG_PREFIX) ? c.parent.slice(ORG_PREFIX.length) : '',
        urls(c.links),
        urls(c.sources),
        members,
      ]);
    }

    const count = rows.length - offset;
    if (count > 0) jurisdictions.push([code, offset, count]);
  }

  return {
    version: 1,
    generatedAt: input.generatedAt,
    upstreamCommit: input.upstreamCommit,
    upstreamCommittedAt: input.upstreamCommittedAt,
    chambers: CHAMBERS,
    roles,
    jurisdictions,
    rows,
    meta: {
      committees: rows.length,
      memberships,
      source: 'https://github.com/openstates/people (CC0-1.0)',
      methodology:
        'Every data/<jurisdiction>/committees/*.yml record with an ocd-organization id: ' +
        'standing committees, subcommittees (linked to their parent) and joint committees. ' +
        'Members are listed as upstream records them, with their role verbatim.',
    },
  };
}
