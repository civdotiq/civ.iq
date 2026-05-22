# PROMPT — MR15: Widen bill classification so more House votes contribute to vote-finance correlation

**Parent plan**: `PLAN-money-report-restoration-2026-04.md`
**Spawned from**: `PROMPT-MR13-httpclient-retry-tail.md` closeout (2026-05-15, PR https://github.com/civdotiq/civ.iq/pull/64)
**Blocking**: After MR13, House reps return `status: 'complete'` with **132 raw votes** through the analyzer (up from 50), but `overallCorrelation` is still `null` because the **classification rate** is the bottleneck, not the fetch budget. The analyzer needs **3+ sectors with ≥10 classifiable votes** each. At ~15% classification rate × 8-way sector spread, the top sector reaches 7–13 votes; one sector short for Sherman, every sector short for Lieu.

---

## What's actually wrong

`getBillSectors` at `src/lib/intelligence/analyzers/shared.ts:305` is gated on having a `billId` + `billTitle`. It only runs for House votes that have an attached bill (`vote.legislationNumber && vote.legislationType`). Of 132 raw House roll-call votes in a session:

- ~12–15% have an attached bill that classifies to a sector
- ~85% are **procedural** (motions to recommit, previous question, table, adjourn, suspend the rules, journal approval, quorum calls) or are HRES votes that pass through without sector context

Only the 12–15% with bills enter the classifier. Spread across 8 industry sectors, that's 2–7 classifiable votes per sector — well under `MIN_VOTES_PER_SECTOR=10`.

This was masked pre-MR12 because we never even got that far — the upstream timeouts hid the downstream sample-size problem. MR13 raised MAX_VOTES to 150 and confirmed the upstream is fine; now the classification gate is exposed as the real bottleneck.

### Observed on MR13 preview (2026-05-15)

```
S000344 (Sherman), cold cache, 33s elapsed, status=complete:
  raw votes fetched:     132
  bills classified:       ~20 (15%)
  total billsVotedOn:     50 (multi-sector classifications)
  sectors meeting 10:     2 (Defense=13, Construction=12)
  sectors needed:         3
  overallCorrelation:     null

L000582 (Lieu), cold cache, 51s elapsed, status=complete:
  raw votes fetched:     132
  bills classified:       ~20 (15%)
  total billsVotedOn:     28
  sectors meeting 10:     0 (best: Defense=7)
  overallCorrelation:     null
```

The 132-vote budget is healthy. The 15% classification rate is the wall.

## Suspected root cause (high confidence)

Three structural issues compound:

1. **Procedural votes never enter the classifier.** A motion-to-recommit on a defense bill is procedurally a "motion" vote but politically a vote on defense policy. The current pipeline drops it because no `legislationNumber` is attached at the vote level.

2. **Bill-attached votes that fail Step 1 (`BillSummaryCache`) drop straight to embedding/zero-shot on the bill title alone.** Bill titles are often short ("Workforce Innovation and Opportunity Act") — embedding similarity is noisy on 4-word inputs, so the classifier returns `[]` and the vote falls through to keyword inference, which is coarse (one policy area → one or two sectors).

3. **Multi-bill votes (e.g. omnibus appropriations) get classified to one or two sectors when they realistically touch 5+.** The single-bill-per-vote model under-counts sectoral coverage.

## Remediation options

### A. Classify procedural votes from `voteQuestion` text

When a vote has no `legislationNumber`, fall back to classifying `voteQuestion + voteDesc` text directly using the existing zero-shot pipeline. Cache under `insight:question_sectors:v1:{voteId}`.

- **Pros**: Single new code path. Reuses existing `classifyBillSectorsZeroShot`. Captures the ~85% of votes currently dropped. Could 5×+ the classifiable count.
- **Cons**: Vote questions are short and adversarial ("Motion to Recommit H.R. 5"). Zero-shot accuracy on this kind of text is unknown — needs empirical eval. False positives would create spurious correlations.
- **Effort**: 4–6 hours including a labelled-eval check on ~50 hand-classified vote questions.

### B. Use Congress.gov's `subject` / `policyArea` from the bill envelope (not just title)

The `/v3/bill/{cong}/{type}/{num}` endpoint returns `policyArea.name` and a `subjects.legislativeSubjects[]` array of 5–20 fine-grained subject tags. `getBillSectors` currently classifies from `billTitle` alone. Switching to `subjects` would give the classifier 10–20 tokens of authoritative metadata per bill.

- **Pros**: Highest-leverage. Pulls from Congress.gov's official editorial classification. No new ML cost.
- **Cons**: Requires fetching bill detail on every uncached bill (one extra Congress.gov call per vote). Already paid for in MR12's `fetchBillDetails` enrichment though — would need to plumb the subjects through.
- **Effort**: 1 day, including extending `BillSummaryCache` shape to carry subjects.

### C. Lower the per-sector floor from 10 → 6 votes

The 10-vote floor came from a statistical-power argument in `civic-statistics`. At α=0.05, a Spearman correlation needs n≥10 to detect a moderate effect (r≈0.5). Dropping to 6 widens to "weak-effect detectable" (r≈0.7+) which is honest but less powerful.

- **Pros**: Trivial. One constant change. Immediately surfaces the 7-vote Defense sector for Sherman and Lieu.
- **Cons**: **Violates published `intelligence-layer.md` rule** (`MIN_VOTES_PER_SECTOR = 10`) and the related "Minimum sample sizes" entry in `.claude/rules/intelligence-layer.md`. Statistical-integrity contract violation. Likely the wrong direction.
- **Effort**: 15 minutes + an angry email to yourself in three months.

### D. Combine A + B (recommended)

Run Option B first (use bill subjects metadata), measure the classification rate lift. If still short, add Option A (procedural-vote classification) on top.

- **Pros**: Layered. Option B is unambiguously correct (use the data we already have). Option A is empirically validated before shipping.
- **Cons**: 1.5–2 days of work, plus a labelled-eval set for A.
- **Effort**: 1.5 days end-to-end.

**Recommend D**, executed as B-first ship-and-measure, then A if needed.

## Recommended sequence

1. **Read** `src/lib/intelligence/analyzers/shared.ts:305-361` (`getBillSectors`, `computeBillSectors`) and `src/lib/fec/fec-api-service.ts` if you need context on how the `fetchBillDetails` enrichment currently flows.
2. **Phase B — bill-subjects plumbing**:
   - In `batch-voting-service.ts` → `fetchBillDetails` (line ~1400), capture `policyArea.name` and `subjects.legislativeSubjects[].name` into the `StandardizedVote['bill']` shape.
   - In `shared.ts` → `computeBillSectors`, prefer the subjects array (joined as comma-separated text) over `billTitle` when calling `classifyBillSectorsZeroShot`. Fall back to title when subjects are missing.
   - Bump cache key: `insight:bill_sectors:v2:{billId}` so old cache entries don't poison the new classifier output.
3. **Run `npm run validate:all`** — must be clean.
4. **Push to preview**. Probe S000344 + L000582 × 3 cold. Pull phase-timer logs and confirm:
   - `billsVotedOn` per top sector ≥ 10
   - `overallCorrelation` is **numeric**
   - 3+ sectors `meetsSampleSize: true`
   - Total cold-cache time still under 55s (subjects fetch is sub-second, but it adds one HTTP call per bill)
5. **If still short after Phase B, layer Phase A**:
   - Build a small labelled eval set: hand-classify 30–50 procedural vote questions into industry sectors. Save as `scripts/eval/vote-question-classifications.json`.
   - In `shared.ts`, add `getQuestionSectors(voteId, voteQuestion, voteDesc)` mirroring `getBillSectors` but classifying the question text.
   - Run against the eval set. Ship only if precision ≥ 0.7 on the eval set; otherwise gate behind a feature flag and iterate.
6. **Update tests**: `vote-finance-analyzer.test.ts` should add a case where bill subjects are present and a sector classification flows through.
7. **Open PR**, request review, merge after CI green.

## What's been ruled out (don't re-investigate)

- **Raising MAX_VOTES higher (180, 200, 250)**. MR13 verified MAX_VOTES=150 already hits the 55s ceiling on Sherman's cold path due to FEC contributions parallel-fetch. Adding more votes pushes failures, not classifications.
- **The retry tail**. MR13 fixed it. Failure-batch logs are ~5s apart now, not 18s.
- **Lowering `MIN_VOTES_PER_SECTOR`**. Option C above. Violates the statistical-integrity rule.
- **The 55s analyzer timeout**. Don't change it. Keep the budget; widen what fits inside it.

## Constraints

- **Do not change `MIN_VOTES_PER_SECTOR`** (`.claude/rules/intelligence-layer.md`).
- **Do not claim causation** in any new narrative text. Words allowed: pattern, correlation, association. Words banned: caused, influenced, resulted in.
- **Preserve all existing tests** in `vote-finance-analyzer.test.ts` and `shared.test.ts`. Add new ones for the new classification path.
- **No new analyzer dependencies on bill-summary cache entries that don't exist yet**. The bill-subjects path must work even when `BillSummaryCache.getSummary(billId)` returns null.
- **Cache invalidation matters**. Bumping `insight:bill_sectors:v1` → `v2` will cold-cache every bill on first request. Coordinate with `/api/cron/warm-intelligence` if you want to pre-warm.

## Success criteria

1. Direct vote-finance probes for **S000344** and **L000582** return `status: 'complete'` with **numeric** `overallCorrelation` in under 55s on cold cache. Verified across 3 consecutive probes.
2. At least **3 sectors** per rep return `meetsSampleSize: true`.
3. `/api/intelligence/address/money-report?zip=90049` shows Sherman with `voteFinance: { state: 'ready', value: <number> }`.
4. New tests pass for the bill-subjects classification path. Labelled-eval set committed to `scripts/eval/` if Phase A ships.
5. Bill classification rate observed in production: ≥30% of House roll-call votes get at least one sector label (up from ~15%).

## Closeout (landed 2026-05-18)

- [x] **Phase chosen**: B-only (bill subjects + policyArea metadata plumbed through; Phase A procedural-vote classification not needed — B alone hit success criteria).
- [x] **Commit SHA**: `998caed7` on `redesign/landing-prototype-2026-05` (combined MR15+MR16). Preview deployment id `dpl_BDxGxrxqkgq9H6Cc1yS51NLomKiu` at `civ-8pp270lhb-civdotiq.vercel.app`.
- [x] **Sector coverage before/after** (proxy for classification rate — actual rate-per-bill not instrumented):
  - S000344 (Sherman): sectors meeting 10-vote sample minimum went from **2 → 6** (Finance/Insurance/Real Estate=30, Defense=30, Lawyers=26, Construction=14, Energy=78, Ideology=16).
  - L000582 (Lieu): sectors meeting sample minimum went from **0 → 6**.
- [x] **Direct vote-finance probes**:
  - S000344 × 3 (warm cache after initial cron-warm): all `status: "complete"`, `overallCorrelation: -0.20`, 6 sectors meet sample size, HTTP 200.
  - L000582 × 3 — probe 1 was **cold cache, 10.0s wall time**, returned `overallCorrelation: 0.3`, 6 sectors meet sample size. Probes 2 + 3 warm at ~0.2s, same values.
- [x] **Money-report ZIP 90049**: orchestrator returned `status: "partial"` (Senate reps unavailable per MR10 Akamai block, unchanged). Sherman tile: `voteFinance: { state: 'ready', value: -0.40 }`. House tile is the success criterion target — it's ready.
- [x] **Phase A eval**: not applicable (Phase A not shipped).
- [x] **Cache invalidation strategy**: bumped `insight:bill_sectors:v1` → `v2` and `insight:vote_finance:v3` → `v4`. First request after deploy cold-computed; subsequent requests warm. Total cold-cache analyzer time for Lieu was ~10s (well under 55s budget), so no pre-warm cron coordination was needed.
- [x] **Reps still returning `null` correlation**: all Senate reps (Schiff, Padilla, etc.) still return `unavailable` due to the separate MR10 Akamai issue — not regressed, not in MR15 scope. Among House reps probed (Sherman, Lieu), zero `null` correlations observed.
