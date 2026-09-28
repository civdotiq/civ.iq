/**
 * Re-export shim — source moved to @civiq/entity-resolution package.
 * All existing consumers import from this path unchanged.
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
