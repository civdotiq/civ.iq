/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Rebuild src/data/committees-with-subcommittees.json (the /committees hub
 * and the sitemap's committee URLs) from congress-legislators'
 * committees-current.yaml, the list the committee pages check IDs against.
 *
 * The file was last generated 2025-12-15 from another source and drifted:
 * 546 subcommittees where 181 sit, Foreign Relations as "SSFO" (it is SSFR),
 * House Ethics as "HLET" (HSSO), and four current committees missing. Each
 * stale entry linked a page that rendered its parent committee; those
 * addresses 404 now.
 *
 * Everything else already stored for a committee (Wikipedia summary,
 * jurisdiction, history) is kept, by ID.
 */

export interface UpstreamCommittee {
  thomas_id: string;
  type: 'house' | 'senate' | 'joint';
  name: string;
  subcommittees?: Array<{ thomas_id: string; name: string }>;
}

export interface StoredCommittee {
  committeeId: string;
  committeeName: string;
  chamber: 'House' | 'Senate' | 'Joint';
  jurisdiction?: string;
  wikipedia?: Record<string, unknown>;
  subcommittees: Array<{ code: string; name: string }>;
  /** Other fields earlier runs stored (history, oversight, …), kept as they are. */
  [field: string]: unknown;
}

export interface StoredCommitteeList {
  committees: Record<string, StoredCommittee>;
  metadata: { generatedAt: string; totalSubcommittees: number; source?: string };
}

/** Old IDs in the stored file that name a current committee under its real ID. */
const RENAMED: Record<string, string> = { SSFO: 'SSFR', HLET: 'HSSO' };

const CHAMBER: Record<UpstreamCommittee['type'], StoredCommittee['chamber']> = {
  house: 'House',
  senate: 'Senate',
  joint: 'Joint',
};

/** "Senate Committee on the Judiciary" → "Committee on the Judiciary"; the hub groups by chamber. */
export function displayCommitteeName(name: string): string {
  return name.replace(/^(?:House|Senate|Joint) (?=(?:Committee|Select|Permanent|Special)\b)/, '');
}

export function buildCommitteeList(
  upstream: UpstreamCommittee[],
  previous: StoredCommitteeList | null,
  now: Date = new Date()
): StoredCommitteeList {
  const kept = new Map<string, StoredCommittee>();
  for (const [id, entry] of Object.entries(previous?.committees ?? {})) {
    kept.set(RENAMED[id] ?? id, entry);
  }

  const committees: Record<string, StoredCommittee> = {};
  let totalSubcommittees = 0;
  for (const c of upstream) {
    const old = kept.get(c.thomas_id);
    const subcommittees = (c.subcommittees ?? []).map(s => ({
      code: `${c.thomas_id}${s.thomas_id}`,
      name: s.name,
    }));
    totalSubcommittees += subcommittees.length;
    committees[c.thomas_id] = {
      ...old,
      committeeId: c.thomas_id,
      committeeName: displayCommitteeName(c.name),
      chamber: CHAMBER[c.type],
      subcommittees,
    };
  }

  return {
    committees,
    metadata: {
      generatedAt: now.toISOString(),
      totalSubcommittees,
      source:
        'unitedstates/congress-legislators committees-current.yaml (CC0-1.0); Wikipedia summaries kept from earlier runs',
    },
  };
}
