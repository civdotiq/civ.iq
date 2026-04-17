/**
 * @civiq/entity-resolution
 *
 * Entity resolution for civic data — committee/agency alias matching,
 * industry taxonomy, ticker-to-sector resolution, FEC entity deduplication.
 */

// ── Configuration ────────────────────────────────────────────────────
export { configure } from './configure.js';
export { setLogger, getLogger } from './logger.js';
export type { Logger } from './logger.js';
export { setCache, getCache } from './cache.js';
export type { CacheAdapter } from './cache.js';

// ── Types ────────────────────────────────────────────────────────────
export type { GovernmentEntityResolution, TickerResolution } from './types.js';

// ── Industry Taxonomy ────────────────────────────────────────────────
export {
  IndustrySector,
  categorizeContribution,
  aggregateByIndustrySector,
  categorizePACByName,
  categorizeContributionSmart,
  getTopCategories,
} from './industry-taxonomy.js';
export type { IndustryCategory, CategorizedContribution } from './industry-taxonomy.js';

// ── Committee-Agency Map ─────────────────────────────────────────────
export {
  HOUSE_COMMITTEE_MAPPINGS,
  SENATE_COMMITTEE_MAPPINGS,
  ALL_COMMITTEE_MAPPINGS,
  getAgenciesForCommittee,
  getTopicsForCommittee,
  getAgenciesForCommittees,
  getCommitteesForAgency,
  getTopicsForCommittees,
} from './committee-agency-map.js';
export type { AgencyInfo, CommitteeMapping } from './committee-agency-map.js';

// ── Committee Alias Table ────────────────────────────────────────────
export {
  COMMITTEE_ALIASES,
  AGENCY_ALIASES,
  getAllCommitteeAliasNames,
} from './committee-alias-table.js';

// ── Lobbying Committee Resolver ──────────────────────────────────────
export {
  resolveGovernmentEntity,
  resolveFilingEntities,
  getResolvedCommittees,
} from './lobbying-committee-resolver.js';

// ── SIC Sector Map ───────────────────────────────────────────────────
export { sicToSector, sectorToSicRanges } from './sic-sector-map.js';

// ── Ticker Industry Resolver ─────────────────────────────────────────
export { resolveTickerIndustry, resolveTickerIndustries } from './ticker-industry-resolver.js';

// ── LDA Issue Policy Map ─────────────────────────────────────────────
export {
  LDA_ISSUE_POLICY_MAP,
  getLDAIssueLabel,
  getPolicyAreasForLDAIssue,
  getAllLDAIssueCodes,
} from './lda-issue-policy-map.js';

// ── Company Entity Resolution ────────────────────────────────────────
export {
  resolveCompanyName,
  resolveCompanyNames,
  normalizeCompanyName,
  companiesMatch,
  validateTokenOverlap,
  similarityRatio,
} from './company-entity-resolver.js';
export type { ResolvedCompany } from './company-entity-resolver.js';

// ── Company Alias Table ─────────────────────────────────────────────
export { COMPANY_ALIAS_TABLE, findCompanyByAlias } from './company-alias-table.js';
export type { CompanyAlias } from './company-alias-table.js';

// ── FEC Entity Resolution ────────────────────────────────────────────
export {
  entitiesMatch,
  normalizeEntity,
  deduplicateContributions,
  deduplicateDisbursements,
  standardizeEmployerName,
} from './fec-entity-resolution.js';
export type { StandardizedEntity, AggregatedEntity } from './fec-entity-resolution.js';

// ── Bioguide-FEC Mapping ─────────────────────────────────────────────
export {
  bioguideToFECMapping,
  getFECIdFromBioguide,
  hasFECMapping,
  addFECMapping,
  getBioguideFromFEC,
  getMappingByFEC,
  getMappingStats,
} from './bioguide-fec-mapping.js';
export type { FECMapping } from './bioguide-fec-mapping.js';
