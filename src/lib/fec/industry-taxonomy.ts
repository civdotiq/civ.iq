/**
 * Re-export shim — source moved to @civiq/entity-resolution package.
 * All existing consumers import from this path unchanged.
 */
export {
  IndustrySector,
  categorizeContribution,
  aggregateByIndustrySector,
  categorizePACByName,
  categorizeContributionSmart,
  getTopCategories,
} from '@civiq/entity-resolution/industry-taxonomy';

export type {
  IndustryCategory,
  CategorizedContribution,
} from '@civiq/entity-resolution/industry-taxonomy';
