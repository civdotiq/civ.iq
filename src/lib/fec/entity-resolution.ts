/**
 * Re-export shim — source moved to @civiq/entity-resolution package.
 */
export {
  entitiesMatch,
  normalizeEntity,
  deduplicateContributions,
  deduplicateDisbursements,
  standardizeEmployerName,
} from '@civiq/entity-resolution';
export type { StandardizedEntity, AggregatedEntity } from '@civiq/entity-resolution';
