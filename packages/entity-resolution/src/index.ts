/**
 * @civiq/entity-resolution
 *
 * Entity resolution for civic data — committee/agency alias matching,
 * industry taxonomy, ticker-to-sector resolution, FEC entity deduplication.
 */

// ── Configuration ────────────────────────────────────────────────────
export { configure } from './configure.ts';
export { setLogger, getLogger } from './logger.ts';
export type { Logger } from './logger.ts';
export { setCache, getCache } from './cache.ts';
export type { CacheAdapter } from './cache.ts';

// ── Types ────────────────────────────────────────────────────────────
export type { GovernmentEntityResolution, TickerResolution } from './types.ts';

// ── Industry Taxonomy ────────────────────────────────────────────────
export {
  IndustrySector,
  categorizeContribution,
  aggregateByIndustrySector,
  categorizePACByName,
  categorizeContributionSmart,
  getTopCategories,
} from './industry-taxonomy.ts';
export type { IndustryCategory, CategorizedContribution } from './industry-taxonomy.ts';

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
} from './committee-agency-map.ts';
export type { AgencyInfo, CommitteeMapping } from './committee-agency-map.ts';

// ── Committee Alias Table ────────────────────────────────────────────
export {
  COMMITTEE_ALIASES,
  AGENCY_ALIASES,
  getAllCommitteeAliasNames,
} from './committee-alias-table.ts';

// ── Lobbying Committee Resolver ──────────────────────────────────────
export {
  resolveGovernmentEntity,
  resolveFilingEntities,
  getResolvedCommittees,
} from './lobbying-committee-resolver.ts';

// ── SIC Sector Map ───────────────────────────────────────────────────
export { sicToSector, sectorToSicRanges } from './sic-sector-map.ts';

// ── Ticker Industry Resolver ─────────────────────────────────────────
export { resolveTickerIndustry, resolveTickerIndustries } from './ticker-industry-resolver.ts';

// ── LDA Issue Policy Map ─────────────────────────────────────────────
export {
  LDA_ISSUE_POLICY_MAP,
  getLDAIssueLabel,
  getPolicyAreasForLDAIssue,
  getAllLDAIssueCodes,
} from './lda-issue-policy-map.ts';

// ── Company Entity Resolution ────────────────────────────────────────
export {
  resolveCompanyName,
  resolveCompanyNames,
  normalizeCompanyName,
  companiesMatch,
  validateTokenOverlap,
  similarityRatio,
} from './company-entity-resolver.ts';
export type { ResolvedCompany } from './company-entity-resolver.ts';

// ── Company Alias Table ─────────────────────────────────────────────
export { COMPANY_ALIAS_TABLE, findCompanyByAlias } from './company-alias-table.ts';
export type { CompanyAlias } from './company-alias-table.ts';

// ── FEC Entity Resolution ────────────────────────────────────────────
export {
  entitiesMatch,
  normalizeEntity,
  deduplicateContributions,
  deduplicateDisbursements,
  standardizeEmployerName,
} from './fec-entity-resolution.ts';
export type { StandardizedEntity, AggregatedEntity } from './fec-entity-resolution.ts';

// ── Bioguide-FEC Mapping ─────────────────────────────────────────────
export {
  bioguideToFECMapping,
  getFECIdFromBioguide,
  hasFECMapping,
  addFECMapping,
  getBioguideFromFEC,
  getMappingByFEC,
  getMappingStats,
} from './bioguide-fec-mapping.ts';
export type { FECMapping } from './bioguide-fec-mapping.ts';
