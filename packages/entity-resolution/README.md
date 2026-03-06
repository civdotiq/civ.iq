# @civiq/entity-resolution

Entity resolution for civic data — committee/agency alias matching, industry taxonomy, ticker-to-sector resolution, FEC entity deduplication.

## Install

```bash
npm install @civiq/entity-resolution
```

## Quick Start

```typescript
import {
  configure,
  categorizeContribution,
  resolveGovernmentEntity,
  resolveTickerIndustry,
  deduplicateContributions,
} from '@civiq/entity-resolution';

// Optional: provide your own logger and cache
configure({
  logger: myLogger,
  cache: myRedisAdapter,
});

// Categorize a campaign contribution by employer/occupation
const result = categorizeContribution('Goldman Sachs', 'Investment Banker');
// { sector: 'Finance/Insurance/Real Estate', category: 'Commercial Banks', confidence: 'high', ... }

// Resolve LDA government_entities to committees/agencies
const entity = resolveGovernmentEntity('Senate Committee on Finance');
// { type: 'committee', committeeCode: 'SSFI', committeeName: 'Finance', confidence: 1.0, ... }

// Resolve stock ticker to industry sector (async, uses SEC EDGAR)
const ticker = await resolveTickerIndustry('AAPL');
// { sector: 'Communications/Electronics', sicCode: '3571', confidence: 1.0 }

// Deduplicate FEC contributions by entity
const unique = deduplicateContributions(rawContributions);
```

## Subpath Exports

```typescript
// Just the industry taxonomy
import { IndustrySector, categorizeContribution } from '@civiq/entity-resolution/industry-taxonomy';

// Just the committee-agency mapping
import {
  ALL_COMMITTEE_MAPPINGS,
  getAgenciesForCommittee,
} from '@civiq/entity-resolution/committee-agency-map';
```

## Configuration

By default, the package uses no-op logger and no-op cache. For production use, call `configure()` once at startup:

```typescript
import { configure } from '@civiq/entity-resolution';

configure({
  logger: {
    debug: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error,
  },
  cache: {
    get: async key => redis.get(key),
    set: async (key, value, ttl) => redis.set(key, value, 'EX', ttl),
  },
});
```

## API Reference

### Industry Taxonomy

- `categorizeContribution(employer?, occupation?)` — Classify by employer/occupation keywords
- `categorizePACByName(name?)` — Classify PAC/committee by name
- `categorizeContributionSmart(employer?, occupation?, name?)` — Try all methods
- `aggregateByIndustrySector(contributions)` — Aggregate contributions by sector
- `getTopCategories(contributions, limit?)` — Top categories across sectors

### Committee-Agency Map

- `getAgenciesForCommittee(name)` — Agencies a committee oversees
- `getCommitteesForAgency(slug)` — Committees that oversee an agency
- `getTopicsForCommittee(name)` — Topics for a committee
- `ALL_COMMITTEE_MAPPINGS` — All 29 committee mappings

### Lobbying Resolution

- `resolveGovernmentEntity(entity)` — 3-tier resolution (noise/exact/fuzzy)
- `resolveFilingEntities(entities)` — Batch resolution
- `getResolvedCommittees(resolutions)` — Extract committee codes

### Ticker Resolution

- `resolveTickerIndustry(ticker)` — Ticker to IndustrySector via SEC EDGAR

### SIC Mapping

- `sicToSector(sicCode)` — SIC code to IndustrySector

### LDA Issue Mapping

- `getLDAIssueLabel(code)` — Human-readable label
- `getPolicyAreasForLDAIssue(code)` — Congress.gov policyArea strings

### FEC Entity Resolution

- `deduplicateContributions(contributions)` — Merge name variants
- `deduplicateDisbursements(disbursements)` — Merge recipients
- `entitiesMatch(entity1, entity2, threshold?)` — Levenshtein similarity

### Bioguide-FEC Mapping

- `getFECIdFromBioguide(id)` — Bioguide ID to FEC candidate ID
- `getBioguideFromFEC(id)` — Reverse lookup

## Data Sources

- FEC.gov — Contributor employer/occupation, PAC names
- Senate LDA API — Lobbying government entities, issue codes
- SEC EDGAR — Company tickers, SIC codes
- Congress.gov — Bill policy areas, committee assignments
- OpenSecrets — 13-sector classification model (inspiration)

## License

MIT - Mark Sandford
