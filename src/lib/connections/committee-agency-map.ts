/**
 * Re-export shim — source moved to @civiq/entity-resolution package.
 * All existing consumers import from this path unchanged.
 *
 * STATE_MAJOR_CITIES and getCitiesForState remain here (1 app consumer,
 * not part of the general-purpose entity-resolution package).
 */
export {
  HOUSE_COMMITTEE_MAPPINGS,
  SENATE_COMMITTEE_MAPPINGS,
  ALL_COMMITTEE_MAPPINGS,
  getAgenciesForCommittee,
  getTopicsForCommittee,
  getAgenciesForCommittees,
  getCommitteesForAgency,
  getTopicsForCommittees,
} from '@civiq/entity-resolution/committee-agency-map';

export type { AgencyInfo, CommitteeMapping } from '@civiq/entity-resolution/committee-agency-map';

/**
 * Major cities by state for local government connections
 */
export const STATE_MAJOR_CITIES: Record<string, string[]> = {
  IL: ['chicago'],
  WA: ['seattle'],
  MA: ['boston'],
  CO: ['denver'],
  TX: ['austin'],
  OR: ['portland'],
  CA: ['oakland'],
  MN: ['minneapolis'],
  PA: ['philadelphia'],
  MI: ['detroit'],
};

/**
 * Get Legistar-supported cities for a state
 */
export function getCitiesForState(stateCode: string): string[] {
  return STATE_MAJOR_CITIES[stateCode.toUpperCase()] || [];
}
