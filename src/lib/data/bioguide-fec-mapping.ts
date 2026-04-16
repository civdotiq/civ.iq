/**
 * Re-export shim — canonical source lives in @civiq/entity-resolution
 * (package JSON at packages/entity-resolution/data/bioguide-fec-mapping.json).
 * The weekly sync workflow `.github/workflows/sync-bioguide-fec.yml` keeps
 * the package data fresh; do not edit the JSON or this file by hand — open
 * a PR against the package instead.
 */
export {
  bioguideToFECMapping,
  getFECIdFromBioguide,
  hasFECMapping,
  addFECMapping,
  getBioguideFromFEC,
  getMappingByFEC,
  getMappingStats,
} from '@civiq/entity-resolution';
export type { FECMapping } from '@civiq/entity-resolution';
