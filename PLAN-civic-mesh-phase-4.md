# Civic Mesh Phase 4: Influence Propagation

**Status**: Not started
**Parent plan**: `PLAN-civic-mesh.md`
**Depends on**: Phase 1 (schema), Phase 2 (temporal), Phase 3 (district profiles)
**Estimated files**: 6 new, 1 modified

---

## Goal

Add three ML-driven capabilities that compose the existing vote prediction model, path finder, and influence chain analyzer into new forms of civic intelligence:

1. **Counterfactual queries** — "What would this rep vote without their top donor sector?"
2. **Weighted influence path scoring** — "How strongly is Org X connected to Regulation Z?"
3. **Cascade simulation** — "If energy funding increases 20%, which votes shift?"

These use existing ML models with new input compositions — no retraining required.

---

## What Exists Now (Read These First)

| File                                                         | What It Contains                                            | Why It Matters                                                          |
| ------------------------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/lib/intelligence/ml/vote-predictor.ts`                  | XGBoost ONNX model, predicts P(yea) from 13 sector features | The model we'll query counterfactually — mask/perturb features          |
| `src/lib/graph/path-finder.ts`                               | BFS path finding, confidence-weighted, max 4 hops           | Foundation for weighted influence scoring — add dollar/temporal weights |
| `src/lib/intelligence/analyzers/influence-chain-analyzer.ts` | Traces lobbying→contribution→committee→bill→vote chains     | Already finds chains — we add quantitative scoring                      |
| `src/lib/intelligence/analyzers/vote-finance-analyzer.ts`    | Per-sector donation amounts and vote alignment scores       | Provides the sector feature vectors for counterfactuals                 |
| `src/lib/mesh/traversal.ts` (Phase 1)                        | Generic N-hop traversal                                     | Used to find all reps affected by a sector perturbation                 |
| `src/lib/mesh/temporal.ts` (Phase 2)                         | Temporal edge data                                          | Used to weight paths by recency                                         |

---

## What to Build

### 1. `src/lib/mesh/propagation/counterfactual.ts` — Feature-Masking Counterfactuals

```typescript
/**
 * Counterfactual analysis: "What would Rep X vote on Bill Y
 * without donations from Sector Z?"
 *
 * Method:
 * 1. Get rep's current sector feature vector (from vote-finance analyzer cache)
 * 2. Create masked vector: set target sector(s) to 0, renormalize
 * 3. Run both vectors through vote predictor ONNX model
 * 4. Compare P(yea) original vs P(yea) masked
 * 5. Return delta and interpretation
 */

export interface CounterfactualQuery {
  bioguideId: string;
  /** Sectors to mask (set funding to 0) */
  maskSectors: IndustrySector[];
  /** Optional: specific bill to predict on. If omitted, uses all recent sector-relevant bills */
  billId?: string;
}

export interface CounterfactualResult {
  bioguideId: string;
  maskedSectors: IndustrySector[];
  predictions: CounterfactualPrediction[];
  /** Summary: average shift across all predictions */
  averageShift: number;
  /** How many predictions flipped (yea→nay or vice versa) */
  flippedCount: number;
  confidence: number;
  methodology: string;
  disclaimer: string;
}

export interface CounterfactualPrediction {
  billId: string;
  billTitle: string;
  /** P(yea) with actual funding profile */
  originalProbability: number;
  /** P(yea) with masked sectors */
  maskedProbability: number;
  /** Difference: masked - original */
  shift: number;
  /** Whether the predicted vote flipped */
  flipped: boolean;
}

export async function runCounterfactual(query: CounterfactualQuery): Promise<CounterfactualResult>;
```

**Implementation:**

- Get sector funding vector from `vote-finance-analyzer` cache (already computed)
- Clone vector, zero out masked sectors, renormalize remaining to sum to 1
- Call `predictVote()` from `vote-predictor.ts` twice (original features, masked features)
- Compare probabilities — if delta > 0.2, flag as "significant shift"
- For billId queries: predict on specific bill. For general queries: predict on top 10 sector-relevant bills
- Disclaimer: "This analysis shows statistical sensitivity to funding sources, not causation"

### 2. `src/lib/mesh/propagation/path-scorer.ts` — Weighted Influence Paths

```typescript
/**
 * Score influence paths between two entities by weighting edges
 * with dollar amounts, temporal proximity, and confidence.
 *
 * Extends path-finder.ts with quantitative scoring:
 * - donated_to edges: weighted by dollar amount (log-scaled)
 * - lobbied edges: weighted by filing spend (log-scaled)
 * - voted_on edges: weighted by vote alignment (0 or 1)
 * - temporal weight: more recent = higher weight (exponential decay)
 * - confidence weight: existing edge confidence (0-1)
 *
 * Overall path score = product of edge scores along path
 */

export interface ScoredPath {
  /** Ordered list of node IDs in the path */
  nodes: string[];
  /** Edges traversed */
  edges: GraphEdge[];
  /** Overall path score (product of edge scores) */
  score: number;
  /** Breakdown: which edge contributed most to the score */
  edgeScores: Array<{
    edgeId: string;
    dollarWeight: number;
    temporalWeight: number;
    confidenceWeight: number;
    combinedScore: number;
  }>;
  /** Human-readable narrative of the path */
  narrative: string;
}

export interface InfluenceScore {
  fromId: string;
  toId: string;
  /** Aggregate score across all paths (sum of path scores, capped at 1) */
  aggregateScore: number;
  /** Individual scored paths */
  paths: ScoredPath[];
  /** How many distinct paths found */
  pathCount: number;
  confidence: number;
  methodology: string;
}

export async function scoreInfluence(
  fromId: string,
  toId: string,
  options?: { maxDepth?: number; maxPaths?: number }
): Promise<InfluenceScore>;
```

**Implementation:**

- Call existing `findPaths()` from path-finder.ts
- For each path, score each edge:
  - `dollarWeight = log10(amount + 1) / log10(maxAmount + 1)` (normalized 0-1)
  - `temporalWeight = exp(-λ * daysSinceLastActivity)` where λ = 0.005 (~6-month half-life)
  - `confidenceWeight = edge.confidence` (already 0-1)
  - `combinedScore = dollarWeight * temporalWeight * confidenceWeight`
- Path score = product of edge combinedScores
- Aggregate = sum of path scores, capped at 1.0
- Generate narrative: "Org X donated $50K to Rep Y, who sits on Committee Z, which oversees Agency W that issued Regulation R"

### 3. `src/lib/mesh/propagation/cascade.ts` — Funding Cascade Simulation

```typescript
/**
 * Cascade simulation: "If Sector X funding changes by Y%,
 * which representatives' votes are most likely to shift?"
 *
 * Method:
 * 1. Find all reps with significant exposure to the target sector
 *    (using vote-finance analyzer cache)
 * 2. For each rep, perturb their sector funding vector:
 *    - Increase/decrease target sector by specified percentage
 *    - Renormalize remaining sectors proportionally
 * 3. Run perturbed vectors through vote predictor
 * 4. Compare to original predictions
 * 5. Rank reps by sensitivity (largest prediction shift)
 */

export interface CascadeQuery {
  /** Which sector to perturb */
  sector: IndustrySector;
  /** Percentage change: +20 means 20% increase, -50 means 50% decrease */
  changePercent: number;
  /** Optional: only simulate for reps on specific committees */
  committeeFilter?: string[];
  /** Optional: only simulate for specific bills */
  billFilter?: string[];
}

export interface CascadeResult {
  sector: IndustrySector;
  changePercent: number;
  /** Reps sorted by sensitivity (most affected first) */
  affectedReps: CascadeRepEffect[];
  /** Total predictions that would flip */
  totalFlips: number;
  /** Bills most affected (most flipped predictions) */
  mostAffectedBills: Array<{ billId: string; title: string; flipCount: number }>;
  confidence: number;
  methodology: string;
  disclaimer: string;
}

export interface CascadeRepEffect {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  /** Current sector funding amount */
  currentFunding: number;
  /** Simulated sector funding amount */
  simulatedFunding: number;
  /** Average prediction shift across all sector-relevant bills */
  averageShift: number;
  /** Number of predictions that flipped */
  flippedVotes: number;
  /** Most affected bill for this rep */
  topAffectedBill: { billId: string; title: string; shift: number } | null;
}

export async function simulateCascade(query: CascadeQuery): Promise<CascadeResult>;
```

**Implementation:**

- Use `traverseMesh()` (Phase 1) to find all reps with `donated_to` edges from organizations in the target sector
- Filter to reps with sector funding > 5% of total (skip negligible exposure)
- For each rep: perturb sector feature, predict on all sector-relevant bills
- This is batch inference: ~100 reps × ~10 bills = ~1000 predictions
- ONNX WASM runtime handles this in seconds (model is tiny, inference is fast)
- Sort by `averageShift` descending
- Aggregate: which bills have the most flipped predictions across all reps?

### 4. API Endpoints

```
POST /api/mesh/influence/counterfactual
  Body: { bioguideId, maskSectors, billId? }
  Returns: CounterfactualResult

GET /api/mesh/influence/path?from=org:lockheed-martin&to=reg:2024-12345
  Returns: InfluenceScore

POST /api/mesh/influence/cascade
  Body: { sector, changePercent, committeeFilter?, billFilter? }
  Returns: CascadeResult
```

All endpoints:

- `force-dynamic` (computationally expensive)
- `maxDuration: 60`
- Include confidence, methodology, disclaimer
- Cache results in Redis (1-hour TTL for counterfactuals, 6-hour for cascades)

### 5. UI Components

- `CounterfactualCard.tsx` — Shows "with vs without" comparison for masked sectors
- `InfluencePathView.tsx` — Visual path with edge scores (reuse graph styling)
- `CascadeSummary.tsx` — Ranked list of affected reps with shift magnitudes

---

## Files to Create/Modify

| #   | File                                                 | Action     | What                                                               |
| --- | ---------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| 1   | `src/lib/mesh/propagation/counterfactual.ts`         | **Create** | Feature-masking counterfactual engine (~200 lines)                 |
| 2   | `src/lib/mesh/propagation/path-scorer.ts`            | **Create** | Weighted influence path scoring (~180 lines)                       |
| 3   | `src/lib/mesh/propagation/cascade.ts`                | **Create** | Funding cascade simulation (~220 lines)                            |
| 4   | `src/lib/mesh/propagation/index.ts`                  | **Create** | Barrel exports (~10 lines)                                         |
| 5   | `src/app/api/mesh/influence/counterfactual/route.ts` | **Create** | POST endpoint (~70 lines)                                          |
| 6   | `src/app/api/mesh/influence/path/route.ts`           | **Create** | GET endpoint (~60 lines)                                           |
| 7   | `src/app/api/mesh/influence/cascade/route.ts`        | **Create** | POST endpoint (~70 lines)                                          |
| 8   | `src/components/mesh/CounterfactualCard.tsx`         | **Create** | Counterfactual display (~120 lines)                                |
| 9   | `src/components/mesh/InfluencePathView.tsx`          | **Create** | Scored path visualization (~150 lines)                             |
| 10  | `src/components/mesh/CascadeSummary.tsx`             | **Create** | Cascade results display (~130 lines)                               |
| 11  | `src/__tests__/mesh/counterfactual.test.ts`          | **Create** | Feature masking, prediction comparison tests (~80 lines)           |
| 12  | `src/__tests__/mesh/path-scorer.test.ts`             | **Create** | Edge scoring, path scoring, narrative generation tests (~80 lines) |
| 13  | `src/__tests__/mesh/cascade.test.ts`                 | **Create** | Perturbation, batch prediction, ranking tests (~80 lines)          |

---

## Validation

```bash
npm run validate:all
```

Specific checks:

- [ ] Counterfactual masking produces valid probability shifts (always 0-1)
- [ ] Masked vectors are properly renormalized (sum to 1)
- [ ] Path scoring is monotonic (more dollars + more recent = higher score)
- [ ] Cascade correctly perturbs only the target sector
- [ ] Batch inference completes within 60s timeout for 435 reps
- [ ] All results include "correlation not causation" disclaimer
- [ ] Minimum sample sizes enforced (skip reps with < 10 sector votes)
- [ ] UI components follow Aicher/Ulm design system

---

## Accuracy Validation

Before shipping, validate against known cases:

- Pick 5 reps with clear sector dependencies (e.g., rep on Energy Committee with heavy energy donor)
- Run counterfactual: mask their top sector → verify prediction shifts meaningfully
- Pick 5 reps with diverse funding → verify cascade shows proportional sensitivity
- Compare influence path scores to intuition: direct donation path should score higher than 3-hop indirect path

If counterfactual shifts are < 0.05 for all reps (model isn't sensitive to funding features), reconsider whether this feature adds value. The XGBoost model's SHAP values should guide which sectors have the most predictive power.

---

## Disclaimers (Required on Every Output)

Every result MUST include:

> "This analysis models statistical sensitivity between campaign funding patterns and voting behavior. It does not establish causation. Representatives may vote based on ideology, constituency preferences, party leadership, or other factors not captured by funding data. Correlation between donor sectors and votes does not mean donations influenced votes."
