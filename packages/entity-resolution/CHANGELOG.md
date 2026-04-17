# Changelog

All notable changes to `@civiq/entity-resolution` are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

## [0.1.0] — 2026-04-16

Initial public release. Extracted from CIV.IQ so any civic-data project can reuse the same resolvers, alias tables, and taxonomy.

### Added — industry taxonomy

- `categorizeContribution(employer?, occupation?)` — keyword-based classification into the 13-sector OpenSecrets-inspired taxonomy.
- `categorizePACByName(name?)` — PAC/committee classification by name.
- `categorizeContributionSmart(...)` — tries employer, occupation, and name in order.
- `aggregateByIndustrySector(contributions)` and `getTopCategories(...)` — sector-level aggregation helpers.

### Added — committee-agency map

- `ALL_COMMITTEE_MAPPINGS` — 29 House and Senate standing committees with the federal agencies they oversee.
- `getAgenciesForCommittee(name)`, `getCommitteesForAgency(slug)`, `getTopicsForCommittee(name)`.

### Added — lobbying resolution

- `resolveGovernmentEntity(entity)` — 3-tier resolver (noise → exact → fuzzy) for LDA `government_entities` strings.
- `resolveFilingEntities(entities)` — batch resolution.
- `getResolvedCommittees(resolutions)` — extract committee codes for downstream joins.

### Added — ticker / SIC / LDA issue resolution

- `resolveTickerIndustry(ticker)` — stock ticker → `IndustrySector` via SEC EDGAR + bundled SIC data.
- `sicToSector(sicCode)` — SIC code → `IndustrySector`.
- `getLDAIssueLabel(code)`, `getPolicyAreasForLDAIssue(code)` — LDA issue code ↔ human label ↔ Congress.gov policy area.

### Added — FEC entity resolution

- `deduplicateContributions(contributions)` and `deduplicateDisbursements(disbursements)` — merge name variants (e.g., "GOLDMAN SACHS" and "Goldman, Sachs & Co.") via Levenshtein similarity.
- `entitiesMatch(a, b, threshold?)` — similarity test with configurable threshold.

### Added — bioguide ↔ FEC mapping

- `getFECIdFromBioguide(id)` and `getBioguideFromFEC(id)` — canonical mapping bundled as `data/bioguide-fec-mapping.json`. Refreshed weekly by CIV.IQ's sync workflow; consumers can override via `configure({ bioguideFecMapping })` if they maintain their own.

### Added — configuration

- `configure({ logger?, cache? })` — optional hooks for a project's logger and cache (e.g., Redis). Default no-ops keep the library standalone.

### Subpath exports

- `@civiq/entity-resolution/industry-taxonomy` and `@civiq/entity-resolution/committee-agency-map` are importable directly for callers that want only one slice.

### Notes

- Tested against Node 20+ with vitest.
- ESM-only. Bundled as `.js` + `.d.ts`; no CJS build.
- Single runtime dep: `fuse.js` for fuzzy matching.
- Bundled data: `data/bioguide-fec-mapping.json` (~88 KB), `data/sec-sic-data.json` (~196 KB).
