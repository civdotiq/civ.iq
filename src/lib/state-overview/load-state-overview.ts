/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Server data for /states/[state]: the parts a crawler and a first-time
 * reader should see without waiting on the browser.
 *
 * - Chief executive: committed NGA/Wikidata file, no network.
 * - Delegation: the cached Congress roster every profile page uses.
 * - Demographics: Census ACS, Redis-cached 30 days.
 *
 * Every piece is optional. A slow or failed source renders as absent here and
 * the page's existing browser fetch takes over, rather than holding the page.
 */

import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import {
  getStateDemographics,
  hasStateDemographics,
  type StateDemographics,
} from '@/lib/data-sources/census-state-demographics';
import {
  getStateChiefExecutive,
  type StateChiefExecutive,
} from '@/lib/data-sources/state-governors';
import logger from '@/lib/logging/simple-logger';

export interface DelegationMember {
  bioguideId: string;
  name: string;
  party: string;
  /** "Senator", "Representative", "Delegate" or "Resident Commissioner". */
  role: string;
  /** House district number; "0" for an at-large or delegate seat. */
  district: string | null;
}

export interface StateOverviewServerData {
  chiefExecutive: StateChiefExecutive | null;
  senators: DelegationMember[];
  houseMembers: DelegationMember[];
  /** False when the roster couldn't be read in time (the list is then hidden). */
  delegationAvailable: boolean;
  demographics: StateDemographics | null;
}

/** Census and the roster are usually cached; this only bounds a cold miss. */
const SOURCE_BUDGET_MS = 4000;

function withinBudget<T>(work: Promise<T>, label: string, stateCode: string): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>(resolve => {
    timer = setTimeout(() => {
      logger.warn('[state-overview] source over budget; browser will fetch', { label, stateCode });
      resolve(null);
    }, SOURCE_BUDGET_MS);
  });
  const guarded = work.catch(error => {
    logger.warn('[state-overview] source failed', {
      label,
      stateCode,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });
  return Promise.race([guarded, timeout]).finally(() => clearTimeout(timer));
}

async function loadDelegation(
  stateCode: string
): Promise<{ senators: DelegationMember[]; houseMembers: DelegationMember[] }> {
  const roster = await getAllEnhancedRepresentatives();
  if (roster.length === 0) throw new Error('empty Congress roster');
  const members = roster
    .filter(r => r.state?.toUpperCase() === stateCode)
    .map(r => ({
      bioguideId: r.bioguideId,
      name: r.name,
      party: r.party,
      role: r.role,
      district: r.chamber === 'House' ? (r.district ?? null) : null,
    }));
  const senators = members
    .filter(m => m.district === null)
    .sort((a, b) => a.name.localeCompare(b.name));
  const houseMembers = members
    .filter(m => m.district !== null)
    .sort((a, b) => Number(a.district) - Number(b.district));
  return { senators, houseMembers };
}

export async function loadStateOverview(stateCode: string): Promise<StateOverviewServerData> {
  const [delegation, demographics] = await Promise.all([
    withinBudget(loadDelegation(stateCode), 'delegation', stateCode),
    hasStateDemographics(stateCode)
      ? withinBudget(getStateDemographics(stateCode), 'demographics', stateCode)
      : Promise.resolve(null),
  ]);

  return {
    chiefExecutive: getStateChiefExecutive(stateCode),
    senators: delegation?.senators ?? [],
    houseMembers: delegation?.houseMembers ?? [],
    delegationAvailable: delegation !== null,
    demographics,
  };
}
