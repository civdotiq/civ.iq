# Phase 1: Data Acquisition & Validation

## Deliverable
Complete ZIP-to-district dataset with 100% US coverage (~41,000 ZIP codes)

## Success Test
Run 1000 random ZIPs → all return valid districts with proper representatives

## Timeline: 3-4 days

## Tasks

### Day 1: Download Census Data
- [ ] Download ZCTA to CD relationship file from Census
- [ ] Get 119th Congress district boundaries
- [ ] Acquire state FIPS codes reference
- [ ] Document data sources and versions

### Day 2: Process Raw Data
- [ ] Create processing script in `scripts/process-census-data.ts`
- [ ] Convert Census TSV to TypeScript mappings
- [ ] Handle state code conversions (FIPS to abbreviations)
- [ ] Generate initial mapping file

### Day 3: Validate & Handle Edge Cases
- [ ] Cross-reference with existing mappings
- [ ] Identify and document split ZIPs
- [ ] Handle military/territory addresses
- [ ] Create confidence scoring system

### Day 4: Testing & Documentation
- [ ] Create comprehensive test suite
- [ ] Run validation against all representatives
- [ ] Document edge cases and exceptions
- [ ] Generate coverage report

## Implementation Files

```
scripts/
├── process-census-data.ts    # Main processing script
├── validate-mappings.ts      # Validation logic
└── lookup-zip.ts            # Quick lookup tool

src/lib/data/
├── complete-zip-mapping.ts   # Generated mapping (2MB)
└── zip-district-types.ts     # TypeScript interfaces

tests/
└── zip-mapping.test.ts       # Test suite
```

## Quick Start

```bash
# 1. Create scripts directory
mkdir scripts

# 2. Install dependencies
npm install csv-parser node-fetch

# 3. Download Census data
curl -O https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_cd118_natl.txt

# 4. Run processing script
npm run process-census-data
```

## Success Metrics
- Total ZIPs mapped: Target 41,000+
- Validation errors: <50 (0.1%)
- Test coverage: 100%
- Lookup performance: <10ms
- File size: <2MB compressed

## Phase Completion
When all tasks are checked, run:
```bash
npm run complete-phase 1
```

This will:
1. Update completion-tracking.yaml
2. Generate phase-2-lookup-system.md
3. Create performance baseline report