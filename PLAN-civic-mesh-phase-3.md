# Civic Mesh Phase 3: District Intelligence Profile

**Status**: Not started
**Parent plan**: `PLAN-civic-mesh.md`
**Depends on**: Phase 1 (schema + registry), Phase 2 (temporal mesh)
**Estimated files**: 5 new, 2 modified

---

## Goal

Build a computed district intelligence profile — the citizen-facing "digital twin" — that answers: **"Does my representative work for my district?"** by composing existing analyzers with district economic data, temporal trends, and peer comparison.

This is the most citizen-visible feature in the Civic Mesh initiative.

---

## What Exists Now (Read These First)

| File                                                              | What It Contains                            | Why It Matters                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/app/api/intelligence/district/[districtId]/route.ts`         | Lightweight insight availability check      | Currently just checks which insights exist for district reps — not a computed profile    |
| `src/app/api/intelligence/address/money-report/route.ts`          | Runs 4 analyzers for district reps          | Already composes vote-finance + finance-jurisdiction + vote-prediction + influence-chain |
| `src/app/api/district/[districtId]/bills/route.ts`                | Relevance-scored bills for district (Gap 8) | Already scores bills by district economic overlap — the most complex join                |
| `src/lib/intelligence/analyzers/vote-finance-analyzer.ts`         | Donation↔vote correlation by sector        | Outputs per-sector alignment scores                                                      |
| `src/lib/intelligence/analyzers/finance-jurisdiction-analyzer.ts` | Donor↔committee overlap                    | Outputs jurisdiction overlap score                                                       |
| `src/lib/intelligence/analyzers/vote-prediction-analyzer.ts`      | ML independence score                       | Outputs independence score (votes against donor prediction)                              |
| `src/lib/intelligence/analyzers/influence-chain-analyzer.ts`      | End-to-end money flow traces                | Outputs narrative chains                                                                 |
| `src/lib/connections/policy-area-map.ts`                          | policyArea → sectors, agencies, topics      | Enables mapping district economy → legislative relevance                                 |
| `packages/entity-resolution/src/industry-taxonomy.ts`             | 13 IndustrySector categories                | Shared sector classification                                                             |
| Census/BLS data via existing API routes                           | District demographics, employment           | Economic DNA data already accessible                                                     |
| USASpending district data via existing API routes                 | Federal spending by district                | Already fetched for Gap 8 (district bills)                                               |

**Key insight:** The district profile is a _composition_ of existing analyzers, not a new data source. The money-report endpoint already runs 4 analyzers for a district's reps. The district bills endpoint already scores bills by economic relevance. This phase adds economic DNA, representation alignment scoring, and peer district comparison.

---

## What to Build

### 1. `src/lib/mesh/district-profile.ts` — District Profile Computation

The core analyzer that composes existing data into a district intelligence profile.

```typescript
import { InsightBase } from '@/lib/intelligence/types';

export interface SectorConcentration {
  sector: IndustrySector;
  /** Percentage of district economy in this sector (from BLS/Census) */
  economicShare: number;
  /** Dollar amount of federal spending in this sector (from USASpending) */
  federalSpending: number;
  /** Number of pending bills affecting this sector */
  pendingBills: number;
}

export interface RepresentationAlignment {
  bioguideId: string;
  name: string;
  party: string;
  chamber: string;
  /** 0-1: How well do the rep's votes align with district economic interests? */
  voteAlignmentScore: number;
  /** 0-1: Do the rep's committees cover the district's top sectors? */
  jurisdictionCoverage: number;
  /** 0-1: Do the rep's donors match the district's economy? */
  fundingAlignmentScore: number;
  /** Composite score: weighted average of the three above */
  overallAlignment: number;
  /** Trend from temporal mesh (Phase 2) */
  alignmentTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface PeerDistrict {
  districtId: string;
  state: string;
  district: string;
  /** Cosine similarity of economic sector vectors */
  economicSimilarity: number;
  /** The peer district's rep alignment score (for comparison) */
  repAlignmentScore: number;
  /** Difference: peer alignment - this district's alignment */
  alignmentDelta: number;
}

export interface BillExposure {
  billId: string;
  title: string;
  /** Which district sectors this bill affects */
  affectedSectors: IndustrySector[];
  /** Dollar estimate of impact (from USASpending agency data) */
  estimatedImpact: number | null;
  /** Bill status */
  status: string;
  /** Relevance score (reuses existing district-bills scoring) */
  relevanceScore: number;
}

export interface DistrictProfile extends InsightBase {
  districtId: string;
  state: string;
  district: string;

  // Economic DNA
  topSectors: SectorConcentration[];
  federalSpendingTotal: number;
  federalSpendingPerCapita: number;
  topAgencies: Array<{ name: string; slug: string; amount: number }>;

  // Representation Alignment
  representatives: RepresentationAlignment[];

  // Legislative Exposure
  pendingBillExposure: BillExposure[];

  // Peer Districts
  peerDistricts: PeerDistrict[];

  // Temporal (from Phase 2)
  alignmentHistory: TemporalBucket[];
}
```

**Computation flow:**

```
buildDistrictProfile(districtId: string):
  1. Parse districtId → state + district number
  2. IN PARALLEL:
     a. Fetch district economic data:
        - USASpending awards by district → top agencies, total spending
        - BLS employment data by state → sector employment shares
        - Census demographics → population for per-capita
     b. Fetch district representatives:
        - Congress.gov members for this district
     c. Fetch district bills:
        - Reuse existing /district/[districtId]/bills logic
  3. For each representative, IN PARALLEL:
     a. Fetch existing analyzer results (from cache or compute):
        - vote-finance alignment scores by sector
        - finance-jurisdiction overlap score
        - vote-prediction independence score
     b. Compute representation alignment:
        - voteAlignmentScore = weighted correlation between district top sectors
          and rep's sector vote alignment (from vote-finance analyzer)
        - jurisdictionCoverage = fraction of district's top 5 sectors covered
          by rep's committee jurisdiction (from finance-jurisdiction analyzer)
        - fundingAlignmentScore = cosine similarity between district economic
          sector vector and rep's donor sector vector
        - overallAlignment = 0.4 * voteAlignment + 0.3 * jurisdiction + 0.3 * funding
  4. Find peer districts:
     - Build 13-dimensional economic sector vector for this district
     - Compare to all 435 districts (precomputed, like influence clusters)
     - Top 5 by cosine similarity, excluding same-state districts
     - For each peer, look up their rep's alignment score
  5. Build temporal alignment history:
     - Use Phase 2 temporal profile for each rep
     - Aggregate into quarterly alignment trend
  6. Assemble DistrictProfile with confidence, methodology, disclaimer
  7. Cache in Redis (24-hour TTL)
```

### 2. Precomputed District Economic Vectors

Like influence clusters (precomputed offline → JSON → served at runtime):

```
scripts/compute-district-vectors.ts
  → For each of 435 districts:
    → Query USASpending + BLS for sector spending/employment
    → Build 13-dimensional vector (one per IndustrySector)
    → Normalize to unit vector
  → Compute pairwise cosine similarity (top 10 peers per district)
  → Write to src/lib/mesh/district-vectors.json (~200KB)
```

This avoids computing 435×435 comparisons at request time.

### 3. API Endpoint: `/api/mesh/district/[districtId]/route.ts`

```typescript
// GET /api/mesh/district/CA-12
// Returns: DistrictProfile
// Cache: ISR 6 hours (district data relatively stable)
// maxDuration: 60 (multiple analyzer calls)
```

### 4. UI Component: `src/components/mesh/DistrictProfileCard.tsx`

A comprehensive card showing:

- **Economic DNA**: top sectors as horizontal bars, federal spending stat
- **Representation Alignment**: overall score as percentage, breakdown into 3 sub-scores
- **Peer Comparison**: "Similar districts have X% alignment vs your Y%"
- **Legislative Exposure**: top 3-5 pending bills affecting the district

Design: Aicher/Ulm system. No gradients, no shadows. 8px grid. Braun Linear font.

### 5. Integration: District Page Update

Integrate `DistrictProfileCard` into existing `/districts/[districtId]` page, alongside existing district content.

---

## Files to Create/Modify

| #   | File                                              | Action     | What                                                            |
| --- | ------------------------------------------------- | ---------- | --------------------------------------------------------------- |
| 1   | `src/lib/mesh/district-profile.ts`                | **Create** | District profile computation engine (~300 lines)                |
| 2   | `src/lib/mesh/district-vectors.json`              | **Create** | Precomputed 435-district economic vectors + peer lists (~200KB) |
| 3   | `scripts/compute-district-vectors.ts`             | **Create** | Offline script to build district vectors (~150 lines)           |
| 4   | `src/app/api/mesh/district/[districtId]/route.ts` | **Create** | GET endpoint (~80 lines)                                        |
| 5   | `src/components/mesh/DistrictProfileCard.tsx`     | **Create** | District profile display component (~200 lines)                 |
| 6   | `src/app/(civic)/districts/[districtId]/page.tsx` | **Edit**   | Integrate DistrictProfileCard                                   |
| 7   | `src/__tests__/mesh/district-profile.test.ts`     | **Create** | Alignment scoring, peer matching, edge cases (~100 lines)       |

---

## Validation

```bash
npm run validate:all
```

Specific checks:

- [ ] Alignment scoring produces 0-1 values for known test cases
- [ ] Peer district matching finds economically similar districts (not just geographically close)
- [ ] Profile handles missing data gracefully (new rep with no vote history → null alignment, not error)
- [ ] Timeout management: 60s max, partial results on analyzer timeout
- [ ] Confidence reflects data completeness (high when all 3 sub-scores computed, lower when some missing)
- [ ] District vectors JSON is reasonable size (<500KB)
- [ ] UI component renders correctly with Aicher/Ulm design system
- [ ] Existing district page not broken

---

## Citizen Value

This is the feature that makes CIV.IQ a civic utility rather than a data browser. Instead of asking citizens to navigate committee assignments, campaign finance filings, and voting records separately, the district profile answers the question directly:

> "Your representative's overall alignment with your district's economic interests is 62%, which is 15 points below the average for economically similar districts. Their committee assignments cover 3 of your district's top 5 sectors, but their donor profile skews heavily toward sectors not prominent in your local economy."

No jargon. No data science. Just the answer.
