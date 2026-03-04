/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Committees & Memberships Dataset Generator
 *
 * All current congressional committees with their members, roles,
 * and chamber assignments.
 * Source: unitedstates/congress-legislators committee data.
 */

import {
  fetchCommittees,
  fetchCommitteeMemberships,
} from '@/features/representatives/services/congress.service';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import type { DatasetResult, DatasetColumn } from '@/types/dataset';

const COLUMNS: DatasetColumn[] = [
  {
    key: 'committeeId',
    label: 'Committee ID',
    description: 'Thomas ID for the committee',
    type: 'string',
  },
  {
    key: 'committeeName',
    label: 'Committee Name',
    description: 'Full committee name',
    type: 'string',
  },
  { key: 'chamber', label: 'Chamber', description: 'House, Senate, or Joint', type: 'string' },
  {
    key: 'memberBioguideId',
    label: 'Member Bioguide ID',
    description: 'Bioguide ID of the committee member',
    type: 'string',
  },
  {
    key: 'memberName',
    label: 'Member Name',
    description: 'Full name of the committee member',
    type: 'string',
  },
  {
    key: 'memberParty',
    label: 'Member Party',
    description: 'Party affiliation of the member',
    type: 'string',
  },
  { key: 'memberState', label: 'Member State', description: 'State of the member', type: 'string' },
  {
    key: 'role',
    label: 'Committee Role',
    description: 'Role on committee (Chair, Ranking Member, Member)',
    type: 'string',
  },
  { key: 'rank', label: 'Rank', description: 'Seniority rank on committee', type: 'number' },
];

export async function generateCommittees(): Promise<DatasetResult> {
  const [committees, memberships, representatives] = await Promise.all([
    fetchCommittees(),
    fetchCommitteeMemberships(),
    RepresentativesCoreService.getAllRepresentatives(),
  ]);

  // Build a lookup map for representative names
  const repMap = new Map(representatives.map(r => [r.bioguideId, r]));

  // Build committee name lookup
  const committeeMap = new Map(committees.map(c => [c.thomas_id, c]));

  // Flatten: one row per committee-member pair
  const data: Record<string, unknown>[] = [];

  for (const membership of memberships) {
    const rep = repMap.get(membership.bioguide);
    for (const committee of membership.committees) {
      const committeeInfo = committeeMap.get(committee.thomas_id);
      data.push({
        committeeId: committee.thomas_id,
        committeeName: committeeInfo?.name ?? committee.thomas_id,
        chamber: committeeInfo?.type ?? committee.chamber ?? '',
        memberBioguideId: membership.bioguide,
        memberName: rep?.name ?? '',
        memberParty: rep?.party ?? '',
        memberState: rep?.state ?? '',
        role: committee.title ?? 'Member',
        rank: committee.rank ?? 0,
      });
    }
  }

  return {
    metadata: {
      name: 'Congressional Committees & Memberships',
      slug: 'committees',
      description:
        'All current congressional committees and their members with roles and seniority rankings.',
      source: 'unitedstates/congress-legislators',
      sourceUrl: 'https://github.com/unitedstates/congress-legislators',
      generated: new Date().toISOString(),
      recordCount: data.length,
      license: 'Public Domain',
      columns: COLUMNS,
    },
    data,
  };
}
