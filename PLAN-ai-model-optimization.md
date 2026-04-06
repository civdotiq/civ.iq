# PLAN: AI Model Optimization (Post-Audit)

**Status**: P2 done, P3 done (awaiting data), P4 reverted (gate not met)
**Source**: AI_LAYER_AUDIT_APRIL2026.md + reviewer feedback
**Approach**: Priority 2 first, then 3, then 4. Priority 5+ parked.

---

## Priority 2: NER Model Swap (Highest ROI)

### Why

`Xenova/bert-base-NER` is 170MB q8 (110M params) — the largest model in the stack by far. A DistilBERT-based NER model cuts ~70MB from cold start downloads since `env.allowLocalModels = false` means every new serverless instance fetches from HF CDN. The NER pipeline only runs on Federal Register documents, so it's the least latency-sensitive of the three models.

### Target Model

**`Xenova/bert-large-NER-finetuned-conll03-english`** is overkill (larger). The right candidates are:

1. **`Xenova/distilbert-NER`** — DistilBERT fine-tuned on CoNLL-2003 (~100MB q8, 66M params, same BIO tag scheme)
2. **`Xenova/distilbert-base-NER`** — same model, alternate naming

Both produce the same entity types (PER, ORG, LOC, MISC) and BIO tag format as the current model. No output schema change.

**Validation required before committing**: Run the actual model against a sample of Federal Register documents and compare entity extraction quality. The model swap is mechanical, but quality regression is the real risk.

### Exact Changes

#### Step 2a: Swap model ID

**File**: `src/lib/intelligence/embeddings/civic-ner.ts`

**Line 23**:

```typescript
// FROM:
const MODEL_ID = 'Xenova/bert-base-NER';
// TO:
const MODEL_ID = 'Xenova/distilbert-NER';
```

That's it. The pipeline type (`token-classification`), quantization (`q8`), singleton pattern, sliding window, BIO tag merging, and regex augmentation are all model-agnostic.

#### Step 2b: Validate extraction quality

Write a quick validation script (not shipped — run locally):

```bash
# Fetch a real Federal Register document, run NER with both models, diff the output
npm run tsx scripts/validate-ner-swap.ts
```

The script should:

1. Pick 5 Federal Register documents that have cached NER results in Redis
2. Run extraction with the new model
3. Compare entity counts and types (ORG, PER, LOC, MISC)
4. Flag if any document loses >20% of entities or gains >50% new entities

#### Step 2c: Invalidate NER cache

Existing cached results use key pattern `ner:{documentNumber}`. After model swap, stale cache entries would serve old-model results. Options:

- **Simple**: Change cache key prefix to `ner2:{documentNumber}` (old entries expire naturally at 30-day TTL)
- **Clean**: No-op if you're comfortable with gradual cache refresh

### What Does NOT Change

- Pipeline type, quantization, timeout, window size, overlap
- BIO tag merging logic, regex augmentation (MONEY, DATE)
- Redis caching layer, test mocks
- No test changes (all mock `@huggingface/transformers` entirely)

### Risk

| Risk                                               | Likelihood | Mitigation                                                         |
| -------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| Fewer entities extracted (DistilBERT less capable) | Medium     | Validation script compares against current output                  |
| Different BIO tag confidence distribution          | Low        | Existing entity merging handles varying scores                     |
| Model not available in Xenova ONNX format          | Low        | Check HF Hub before starting; fall back to `Xenova/bert-small-NER` |

---

## Priority 3: Profile Cold Start Measurement

### Why

Before optimizing model loading, we need to know if there's actually a problem. If p50 is 200ms and p95 is 800ms, the model loading cost is already acceptable and priorities 4+ become low-urgency.

### What to Measure

Add timing instrumentation to the three model-loading singletons:

1. `civic-ner.ts` — `loadPipeline()` (line 311)
2. `embedding-classifier.ts` — `loadPipeline()` (line 134)
3. `zero-shot-classifier.ts` — `loadPipeline()` (line 170)

### Exact Changes

In each `loadPipeline()` function, add `performance.now()` timing around the `pipeline()` call and log via `simple-logger`:

```typescript
const t0 = performance.now();
pipelineInstance = await pipeline(...) as unknown as Pipeline;
const loadMs = Math.round(performance.now() - t0);
logger.info('ML pipeline loaded', {
  model: MODEL_ID,
  loadTimeMs: loadMs,
  operation: 'ml_pipeline_load',
});
```

### What to Observe

After deploying, check Vercel function logs for `ml_pipeline_load` events:

- **p50 < 2s**: Model loading is fine. Priority 4+ can wait.
- **p50 2-5s**: Worth optimizing but not urgent.
- **p50 > 5s**: Model loading is a real problem. Priority 4 becomes urgent.

Also note which model is slowest — that tells you where optimization effort pays off most (likely NER at 170MB, which Priority 2 already addresses).

### What Does NOT Change

- No behavioral changes, no test changes
- Logging only fires on cold starts (singleton pattern means subsequent calls skip loading)

---

## Priority 4: Embedding Model Swap — REVERTED (2026-04-06)

### Status: Reverted. Gate not met.

bge-small-en-v1.5 was implemented prematurely and reverted for three reasons:

1. **Threshold margin was 0.002** — The calibration set (9 good, 4 bad) produced min-known-good=0.562 and max-known-bad=0.560 at `DEFAULT_THRESHOLD=0.56`. This 0.002 gap is far too thin for production, where bill titles are vastly more diverse than 13 samples.

2. **Gate was skipped** — This plan explicitly states Priority 4 should only proceed "if Priority 3 shows model loading is a bottleneck." Priority 3 instrumentation was deployed but no measurement data has been collected yet.

3. **Model is larger, not smaller** — bge-small-en-v1.5 is ~34MB q8 vs ~23MB q8 for all-MiniLM-L6-v2. The swap made cold starts 11MB worse. Net savings dropped from 104MB (NER swap alone) to 93MB.

### What was reverted

- `embedding-classifier.ts` MODEL_ID → `Xenova/all-MiniLM-L6-v2`
- `cosine-similarity.ts` DEFAULT_THRESHOLD → `0.28`
- `bill-lobbying-similarity.ts` HIGH_SIMILARITY_THRESHOLD → `0.55`, cache prefix → `lobbying-embedding:`
- `generate-sector-embeddings.ts` model → `Xenova/all-MiniLM-L6-v2`
- `sector-embeddings.json` regenerated with all-MiniLM-L6-v2
- All test assertions reverted to match

### What was kept

The calibration script (`scripts/calibrate-embedding-thresholds.ts`) was expanded and retained as reusable infrastructure: 30 known-good bills, 16 known-bad, 4 edge cases, 10 bill-lobbying pairs, model-agnostic `--model` flag, and a hard gate requiring gap >= 0.05.

### Gate criteria for re-opening Priority 4

All three conditions must be met:

1. **Priority 3 data** — Embedding pipeline cold start p50 > 2s (measured from Vercel logs)
2. **Calibration gate** — `npx tsx scripts/calibrate-embedding-thresholds.ts --model <candidate>` exits 0 (gap >= 0.05 for both sector and bill-lobbying thresholds)
3. **A/B accuracy** — Run `scripts/validate-sector-classification.ts` with both models on the same 10 bills; candidate must match or exceed current accuracy

---

## Priority 5+: Parked

The following are explicitly deferred. Do not implement without a new decision:

- NLI model swap (nli-deberta-v3-xsmall works well, 60MB is reasonable)
- WASM → native ONNX runtime switch (dependency complexity not justified yet)
- Vote prediction model improvements (XGBoost is interpretable and working)
- LLM fallback chain (separate initiative, statistical fallback sufficient)
- Automated retraining pipeline
- RAG layer
- Time-series forecasting

---

## Execution Status

1. **Priority 2** (NER swap) — DONE. Swapped to distilbert-NER, ~104MB cold start savings.
2. **Priority 3** (cold start measurement) — DONE. Instrumentation deployed. Awaiting measurement data.
3. **Priority 4** (embedding swap) — REVERTED. Implemented prematurely, threshold margin was 0.002, model was larger. Reverted to all-MiniLM-L6-v2. See gate criteria above for re-opening.

Net cold start savings: ~104MB (NER swap only — clean, validated).
