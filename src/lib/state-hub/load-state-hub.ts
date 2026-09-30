/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Data for /state-legislature/[state], the "Who is my state representative?"
 * hub. Everything here comes from committed files — the OpenStates roster
 * corpus and the curated NCSL chamber data — so rendering the hub (and
 * Googlebot crawling all 52 of them) makes no upstream API call.
 */

import { cache } from 'react';
import {
  getJurisdictionRoster,
  getPeopleCorpusStatus,
} from '@/lib/data-sources/openstates-people/load-people';
import { chamberBucket } from '@/lib/data-sources/openstates-people/adapt';
import { getStateLegislatureMetadata } from '@/lib/data/static-state-legislatures';
import { getStateName, normalizeStateIdentifier } from '@/lib/data/us-states';
import { generalElectionHasPassed } from '@/lib/data/election-dates';
import { getNextElectionYear } from '@/lib/data/state-election-cycles';
import { getChamberName, getLegislatorRoleTitle } from '@/types/state-legislature';
import { buildStateLegislatorUrl } from '@/lib/helpers/url-builders';
import {
  compareDistricts,
  getHubCopy,
  isAtLargeDistrict,
  rosterPartyLabel,
  type HubCopy,
} from './hub-copy';
import type { HubMember } from './types';

export type { HubMember };

export interface HubChamber {
  key: 'upper' | 'lower';
  /** "Senate", "Assembly", "House of Delegates", "Council". */
  name: string;
  /** "State Senator", "Assemblymember", "Councilmember". */
  roleTitle: string;
  /** Seat count from NCSL; null where NCSL has no entry (Puerto Rico). */
  seats: number | null;
  termYears: number | null;
  members: HubMember[];
  /** Listed members by party label, largest first. */
  partyCounts: Array<{ party: string; count: number }>;
  /** True when at least one district elects more than one member. */
  hasMultiMemberDistricts: boolean;
}

export interface StateHubData {
  stateCode: string;
  stateName: string;
  legislatureName: string;
  copy: HubCopy;
  chambers: HubChamber[];
  memberCount: number;
  unicameral: boolean;
  website: string | null;
  capitolCity: string | null;
  /** Year of the next regular legislative election; null where unknown (PR). */
  nextElectionYear: number | null;
  /** When OpenStates last changed the roster data we committed. */
  rosterAsOf: string | null;
}

/** Puerto Rico has a roster in the corpus but no NCSL entry. */
const LEGISLATURE_NAME_FALLBACK: Record<string, string> = {
  PR: 'Legislative Assembly of Puerto Rico',
};

function nextRegularElectionYear(stateCode: string, now: Date): number | null {
  // Puerto Rico votes every four years (2024, 2028), which the even/odd-year
  // schedule below doesn't model; say nothing rather than a wrong year.
  if (stateCode === 'PR') return null;
  const year = getNextElectionYear(stateCode, now.getFullYear());
  // After this year's Election Day the next one is two years out.
  if (year === now.getFullYear() && generalElectionHasPassed(year, now)) {
    return getNextElectionYear(stateCode, year + 1);
  }
  return year;
}

function partyCounts(members: HubMember[]): HubChamber['partyCounts'] {
  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.party, (counts.get(m.party) ?? 0) + 1);
  return [...counts.entries()]
    .map(([party, count]) => ({ party, count }))
    .sort((a, b) => b.count - a.count || a.party.localeCompare(b.party));
}

function hasMultiMember(members: HubMember[]): boolean {
  const seen = new Set<string>();
  for (const m of members) {
    if (m.atLarge) continue;
    if (seen.has(m.district)) return true;
    seen.add(m.district);
  }
  return false;
}

/**
 * Hub data for a state code in any case, or null when it names no
 * jurisdiction we hold a roster for (the page then 404s).
 */
export const loadStateHub = cache(async (state: string): Promise<StateHubData | null> => {
  if (!/^[a-z]{2}$/i.test(state)) return null;
  const stateCode = normalizeStateIdentifier(state);
  const stateName = stateCode ? getStateName(stateCode) : undefined;
  if (!stateCode || !stateName) return null;

  const [roster, status] = await Promise.all([
    getJurisdictionRoster(stateCode),
    getPeopleCorpusStatus(),
  ]);
  if (!roster || roster.length === 0) return null;

  const meta = getStateLegislatureMetadata(stateCode);
  const unicameral = meta?.unicameral ?? roster.every(p => p.chamber === 'legislature');

  const members: HubMember[] = roster.map(p => ({
    id: p.id,
    name: p.name,
    district: p.district,
    party: rosterPartyLabel(p.party),
    chamber: chamberBucket(p),
    phone: p.phone,
    email: p.email,
    url: buildStateLegislatorUrl(stateCode, p.id, p.name),
    atLarge: isAtLargeDistrict(p.district),
  }));
  members.sort((a, b) => compareDistricts(a.district, b.district) || a.name.localeCompare(b.name));

  const keys: Array<'upper' | 'lower'> = unicameral
    ? [members.some(m => m.chamber === 'upper') ? 'upper' : 'lower']
    : ['upper', 'lower'];

  const chambers: HubChamber[] = keys.map(key => {
    const inChamber = unicameral ? members : members.filter(m => m.chamber === key);
    const ncsl = meta?.chambers[key];
    return {
      key,
      name:
        stateCode === 'DC'
          ? 'Council'
          : unicameral
            ? 'Legislature'
            : (ncsl?.name ?? getChamberName(stateCode, key)),
      roleTitle: getLegislatorRoleTitle(stateCode, key),
      seats: ncsl?.seats ?? null,
      termYears: ncsl?.termLength ?? null,
      members: inChamber,
      partyCounts: partyCounts(inChamber),
      hasMultiMemberDistricts: hasMultiMember(inChamber),
    };
  });

  const legislatureName =
    meta?.name ?? LEGISLATURE_NAME_FALLBACK[stateCode] ?? `${stateName} Legislature`;
  const byKey = (k: 'upper' | 'lower') => chambers.find(c => c.key === k);

  return {
    stateCode,
    stateName,
    legislatureName,
    copy: getHubCopy({
      stateCode,
      stateName,
      legislatureName,
      memberCount: members.length,
      multiMember: {
        upper: byKey('upper')?.hasMultiMemberDistricts ?? false,
        lower: byKey('lower')?.hasMultiMemberDistricts ?? false,
      },
    }),
    chambers,
    memberCount: members.length,
    unicameral,
    website: meta?.website ?? null,
    capitolCity: meta?.capitolCity ?? null,
    nextElectionYear: nextRegularElectionYear(stateCode, new Date()),
    rosterAsOf: status?.upstreamCommittedAt || status?.generatedAt || null,
  };
});
