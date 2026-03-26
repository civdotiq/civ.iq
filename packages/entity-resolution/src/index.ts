/**
 * @civiq/entity-resolution
 *
 * Entity resolution for civic data — committee/agency alias matching,
 * industry taxonomy, ticker-to-sector resolution, FEC entity deduplication.
 */

// ── Configuration ────────────────────────────────────────────────────
export { configure } from './configure';
export { setLogger, getLogger } from './logger';
export type { Logger } from './logger';
export { setCache, getCache } from './cache';
export type { CacheAdapter } from './cache';

// ── Types ────────────────────────────────────────────────────────────
export type { GovernmentEntityResolution, TickerResolution } from './types';

// ── Industry Taxonomy ────────────────────────────────────────────────
export {
  IndustrySector,
  categorizeContribution,
  aggregateByIndustrySector,
  categorizePACByName,
  categorizeContributionSmart,
  getTopCategories,
} from './industry-taxonomy';
export type { IndustryCategory, CategorizedContribution } from './industry-taxonomy';

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
} from './committee-agency-map';
export type { AgencyInfo, CommitteeMapping } from './committee-agency-map';

// ── Committee Alias Table ────────────────────────────────────────────
export {
  COMMITTEE_ALIASES,
  AGENCY_ALIASES,
  getAllCommitteeAliasNames,
} from './committee-alias-table';

// ── Lobbying Committee Resolver ──────────────────────────────────────
export {
  resolveGovernmentEntity,
  resolveFilingEntities,
  getResolvedCommittees,
} from './lobbying-committee-resolver';

// ── SIC Sector Map ───────────────────────────────────────────────────
export { sicToSector, sectorToSicRanges } from './sic-sector-map';

// ── Ticker Industry Resolver ─────────────────────────────────────────
export { resolveTickerIndustry, resolveTickerIndustries } from './ticker-industry-resolver';

// ── LDA Issue Policy Map ─────────────────────────────────────────────
export {
  LDA_ISSUE_POLICY_MAP,
  getLDAIssueLabel,
  getPolicyAreasForLDAIssue,
  getAllLDAIssueCodes,
} from './lda-issue-policy-map';

// ── Company Entity Resolution ────────────────────────────────────────
export {
  resolveCompanyName,
  resolveCompanyNames,
  normalizeCompanyName,
  companiesMatch,
  validateTokenOverlap,
  similarityRatio,
} from './company-entity-resolver';
export type { ResolvedCompany } from './company-entity-resolver';

// ── Company Alias Table ─────────────────────────────────────────────
export { COMPANY_ALIAS_TABLE, findCompanyByAlias } from './company-alias-table';
export type { CompanyAlias } from './company-alias-table';

// ── FEC Entity Resolution ────────────────────────────────────────────
export {
  entitiesMatch,
  normalizeEntity,
  deduplicateContributions,
  deduplicateDisbursements,
  standardizeEmployerName,
} from './fec-entity-resolution';
export type { StandardizedEntity, AggregatedEntity } from './fec-entity-resolution';

// ── Bioguide-FEC Mapping ─────────────────────────────────────────────
export {
  bioguideToFECMapping,
  getFECIdFromBioguide,
  hasFECMapping,
  addFECMapping,
  getBioguideFromFEC,
  getMappingByFEC,
  getMappingStats,
} from './bioguide-fec-mapping';
export type { FECMapping } from './bioguide-fec-mapping';
