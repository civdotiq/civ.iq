# Intelligence Hardening — Remaining Gaps

## Context

The 8-phase hardening plan is implemented and audited. These 7 items remain — 4 are quick mechanical fixes, 2 are medium features, 1 is research-grade.

**Workflow**: Same as before — implement → `npm run validate:all` → commit → next.

---

## Gap 1: Real `billsSponsored` / `billsCosponsored` (~45 min)

**Problem**: The civic brief sets both to 0 because `batchVotingService` doesn't have sponsorship data. The fields exist in `BriefVoting`, are displayed in the AI prompt, and the confidence score uses them as a quality signal.

**Fix**:

1. In `civic-brief-assembler.ts`, import the Congress.gov bills service:

   ```typescript
   import { getMemberBills } from '@/features/representatives/services/congress.service';
   ```

   Check if `getMemberBills` exists. If not, check for `fetchBillFromCongress` or the Congress.gov API service for a member-bills endpoint.

2. In `fetchVotingData()`, after getting votes from batchVotingService, also fetch bills:

   ```typescript
   const memberBills = await congressService.getMemberLegislation(bioguideId);
   return {
     totalVotes: votes.length,
     partyAlignmentPct: null,
     missedVotePct: null,
     billsSponsored: memberBills?.sponsored ?? 0,
     billsCosponsored: memberBills?.cosponsored ?? 0,
   };
   ```

3. If no existing service method exists, add one to `congress.service.ts` that calls:

   ```
   GET https://api.congress.gov/v3/member/{bioguideId}/sponsored-legislation?limit=1
   GET https://api.congress.gov/v3/member/{bioguideId}/cosponsored-legislation?limit=1
   ```

   We only need the `pagination.count` from each response, so `limit=1` keeps it fast.

4. Wrap in try/catch — if Congress.gov fails, fall back to 0 (current behavior).

**Verification**: `npm run validate:all`. Then manually check: `curl localhost:3000/api/intelligence/representative/G000386/brief | jq '.voting.billsSponsored'` should return a real number > 0.

**Commit**: `fix(intelligence): fetch real billsSponsored/billsCosponsored from Congress.gov`

---

## Gap 2: Populate `confidenceMethod` across all analyzers (~30 min)

**Problem**: `confidenceMethod` was added to `InsightBase` as optional but no analyzer sets it. It's dead metadata.

**Fix**: Set the field in every analyzer's insight object construction. The mapping:

| Analyzer                | File                                | confidenceMethod | Reason                                                  |
| ----------------------- | ----------------------------------- | ---------------- | ------------------------------------------------------- |
| finance-jurisdiction    | finance-jurisdiction-analyzer.ts    | `'computed'`     | Uses `confidenceScore()` from stats                     |
| vote-finance            | vote-finance-analyzer.ts            | `'computed'`     | Uses `confidenceScore()`                                |
| temporal-votes          | temporal-vote-analyzer.ts           | `'computed'`     | Uses `confidenceScore()`                                |
| lobbying-pipeline       | lobbying-pipeline-analyzer.ts       | `'computed'`     | Uses `confidenceScore()`                                |
| enforcement             | enforcement-analyzer.ts             | `'computed'`     | Uses `confidenceScore()`                                |
| influence-chain         | influence-chain-analyzer.ts         | `'mixed'`        | Link confidences are heuristic, overall is computed     |
| regulation              | regulation-analyzer.ts              | `'mixed'`        | Link confidence is heuristic (0.8), overall is computed |
| influence-graph         | influence-graph-analyzer.ts         | `'mixed'`        | Multiplicative of heuristic link confidences            |
| civic-brief             | civic-brief-assembler.ts            | `'computed'`     | Uses `computeConfidence()`                              |
| stock-committee         | stock-committee-analyzer.ts         | `'computed'`     | Uses `confidenceScore()`                                |
| vote-prediction         | vote-prediction-analyzer.ts         | `'computed'`     | Model probability                                       |
| sector-leaderboard      | sector-leaderboard-analyzer.ts      | `'computed'`     | Statistical aggregation                                 |
| bill-intelligence       | bill-intelligence-analyzer.ts       | `'computed'`     | Uses `confidenceScore()`                                |
| pac-vote                | pac-vote-analyzer.ts                | `'computed'`     | Uses `confidenceScore()`                                |
| temporal-proximity      | temporal-proximity-analyzer.ts      | `'computed'`     | Statistical                                             |
| stock-trade-leaderboard | stock-trade-leaderboard-analyzer.ts | `'computed'`     | Statistical                                             |

For each, find the insight object construction (search for `methodology:` near `disclaimer:` and `lastAnalyzedAt:`) and add `confidenceMethod: 'computed'` or `'mixed'`.

**Verification**: `npm run validate:all`. Then grep: `grep -rn "confidenceMethod" src/lib/intelligence/analyzers/` should show all 16 files.

**Commit**: `feat(intelligence): populate confidenceMethod across all 16 analyzers`

---

## Gap 3: Per-instance SHAP values (~4-8 hrs, research)

**Problem**: Current SHAP direction inference uses mean absolute SHAP values (global importance) to approximate per-prediction directions. This is fundamentally approximate — we know which features matter in general, but not which features pushed THIS specific prediction up or down.

**Why it's hard**: True per-instance SHAP requires running the SHAP explainer at inference time, which means:

1. The ONNX model doesn't expose SHAP natively — we'd need to run TreeExplainer (Python) or a JS SHAP library
2. No mature JS SHAP library exists for XGBoost/ONNX models
3. Running Python at inference time defeats the purpose of ONNX

**Recommended approach**:

Option A — **Pre-compute SHAP for common feature patterns** (~3 hrs):

1. In `scripts/train-vote-model.py`, after training, compute SHAP values for a representative sample of 1000 predictions
2. Cluster these into ~20 "archetypes" (e.g., "R senator voting on defense bill with high defense donations")
3. Export archetype SHAP directions to `models/shap-archetypes.json`
4. At inference time, find the nearest archetype by feature similarity and use its SHAP directions
5. This gives per-pattern (not per-instance) explanations — much better than global mean

Option B — **Use SHAP interaction values** (~6 hrs):

1. Compute SHAP interaction values during training
2. Export a matrix of feature×feature interaction effects
3. At inference time, use the interaction matrix plus the specific feature values to estimate directional SHAP
4. More accurate but more complex

**Recommendation**: Option A. It's 80% of the accuracy gain for 40% of the effort.

**Commit**: `feat(intelligence): add SHAP archetype-based per-pattern explanations`

---

## Gap 4: Fix enforcement trend computation (~20 min)

**Problem**: `enforcement-analyzer.ts` computes trend by splitting actions into two halves BY INDEX, then comparing counts. Since splitting by index always gives ~equal counts, the trend is always "stable".

**Fix**: Split by TIME, not by index.

```typescript
// Current (broken):
const mid = Math.floor(dated.length / 2);
const firstHalf = dated.slice(0, mid).length;
const secondHalf = dated.slice(mid).length;

// Fixed:
const dates = actions.map(a => new Date(a.date).getTime()).sort();
const midDate = (dates[0]! + dates[dates.length - 1]!) / 2;
const firstHalf = actions.filter(a => new Date(a.date).getTime() <= midDate).length;
const secondHalf = actions.filter(a => new Date(a.date).getTime() > midDate).length;
```

Then the existing ratio logic (`firstHalf / secondHalf`) will correctly detect "increasing" (more recent actions) and "decreasing" (more older actions).

**File**: `src/lib/intelligence/analyzers/enforcement-analyzer.ts` — find the trend computation function (search for `stable.*increasing.*decreasing`).

**Verification**: `npm run validate:all`.

**Commit**: `fix(intelligence): compute enforcement trend by time period, not index split`

---

## Gap 5: promptfoo testing for AI narratives (~2-3 hrs)

**Problem**: 7 analyzers generate AI narratives via `generateInsightNarrative()` or `generateAIText()`. There's no automated test that the narratives:

- Stay below Flesch-Kincaid 8 reading level
- Don't claim causation ("caused", "influenced", "resulted in")
- Include required disclaimer language
- Don't hallucinate data not in the input

**Approach**:

1. Install promptfoo: `npm install -D promptfoo`

2. Create `promptfoo/intelligence-narratives.yaml`:

   ```yaml
   providers:
     - id: file://src/lib/intelligence/analyzers/shared.ts:generateInsightNarrative

   tests:
     - vars:
         analysisType: vote-finance
         statsBlock: |
           Representative: Chuck Grassley (R-IA)
           Top sector correlation: Defense at 0.72
           Sample size: 45 votes
       assert:
         - type: not-contains
           value: 'caused'
         - type: not-contains
           value: 'influenced'
         - type: not-contains
           value: 'resulted in'
         - type: contains
           value: 'correlation'
         - type: javascript
           value: 'output.length < 500'
   ```

3. Create test cases for each analyzer's narrative prompt format (7 cases).

4. Add `package.json` script: `"test:narratives": "promptfoo eval -c promptfoo/intelligence-narratives.yaml"`

5. Run in CI as a non-blocking quality signal (failures warn, don't block).

**Alternative if promptfoo is too heavy**: Write a Jest test that mocks the AI provider to return known strings, then validates the narrative post-processing (reading level check, causation word filter). This tests the validation logic without needing an LLM. Faster to implement but doesn't test actual LLM output quality.

**Recommendation**: Start with the Jest-based approach for the validation logic, add promptfoo later when evaluating actual LLM outputs matters (e.g., before switching models).

**Commit**: `test(intelligence): add narrative quality validation tests`

---

## Gap 6: SIC prefix filter efficiency (~30 min)

**Problem**: The enforcement analyzer only passes the first SIC range's 2-digit prefix to EPA/OSHA API queries. For multi-range sectors like Energy (mining 10-14, petroleum 29-30, pipelines 46, utilities 49), the API query only filters on "10", missing 60% of the sector's industries. The post-fetch filter catches everything, so results are correct — but the API returns unnecessary data.

**Fix**: Collect all unique 2-digit prefixes from all ranges, then make one API call per prefix (or pass them as a comma-separated filter if the APIs support it).

1. Check EPA ECHO and OSHA API docs — do they support multiple SIC code filters?
   - If yes: pass all prefixes in one call
   - If no: make parallel calls with each prefix, deduplicate results

2. Update `fetchEPAActions` and `fetchOSHAActions` to accept `sicCodes: string[]` instead of `sicCode?: string`.

3. In `fetchEnforcementActions`, compute all unique 2-digit prefixes:
   ```typescript
   const sicPrefixes =
     scope.type === 'sector'
       ? [...new Set(sectorToSicRanges(scope.sector).map(r => String(r.start).slice(0, 2)))]
       : [];
   ```

**Verification**: `npm run validate:all`. Run enforcement for Energy sector and verify more results come back.

**Commit**: `fix(intelligence): pass all SIC prefixes for multi-range sectors in enforcement queries`

---

## Execution Order

| Order | Gap                          | Time    | Risk   | Dependencies                  |
| ----- | ---------------------------- | ------- | ------ | ----------------------------- |
| 1     | Gap 4: Enforcement trend     | 20 min  | Low    | None                          |
| 2     | Gap 2: confidenceMethod      | 30 min  | Low    | None                          |
| 3     | Gap 6: SIC prefix efficiency | 30 min  | Low    | None                          |
| 4     | Gap 1: Real billsSponsored   | 45 min  | Medium | Congress.gov API availability |
| 5     | Gap 5: Narrative testing     | 2-3 hrs | Low    | None                          |
| 6     | Gap 3: Per-instance SHAP     | 4-8 hrs | Medium | Training data, Python env     |

Gaps 1-4 can be done in one session (~2 hrs). Gap 5 is a standalone session. Gap 3 is a separate research spike.

---

## Commit Sequence

```
fix(intelligence): compute enforcement trend by time period, not index split
feat(intelligence): populate confidenceMethod across all 16 analyzers
fix(intelligence): pass all SIC prefixes for multi-range sectors in enforcement queries
fix(intelligence): fetch real billsSponsored/billsCosponsored from Congress.gov
test(intelligence): add narrative quality validation tests
feat(intelligence): add SHAP archetype-based per-pattern explanations
```
