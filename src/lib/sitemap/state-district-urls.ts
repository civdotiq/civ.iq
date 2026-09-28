/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getJurisdictionRoster } from '@/lib/data-sources/openstates-people/load-people';
import { chamberBucket } from '@/lib/data-sources/openstates-people/adapt';

export type StateChamberKey = 'upper' | 'lower';

const byNaturalOrder = new Intl.Collator('en', { numeric: true, sensitivity: 'base' }).compare;

/**
 * One real district per chamber for a state, as the state-district page
 * matches it (chamberBucket + the roster's district string). Chambers with
 * no seated members (Nebraska's lower house) are omitted.
 *
 * District names are not always numbers ("1st Suffolk", "Belknap 1",
 * "Addison-1", "1A", "A"), so "1" cannot be assumed.
 */
export async function firstDistrictPerChamber(
  state: string
): Promise<Array<{ chamber: StateChamberKey; district: string }>> {
  const roster = await getJurisdictionRoster(state);
  if (!roster) return [];

  const districts: Record<StateChamberKey, Set<string>> = { upper: new Set(), lower: new Set() };
  for (const person of roster) {
    const district = person.district?.trim();
    if (district) districts[chamberBucket(person)].add(district);
  }

  return (['upper', 'lower'] as const).flatMap(chamber => {
    const [first] = [...districts[chamber]].sort(byNaturalOrder);
    return first ? [{ chamber, district: first }] : [];
  });
}
