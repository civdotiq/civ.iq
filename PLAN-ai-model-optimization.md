# PLAN: AI Model Optimization (Post-Audit)

**Status**: Ready to implement (sequential)
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

## Priority 4: Embedding Model Swap (bge-small-en-v1.5)

### Why

`all-MiniLM-L6-v2` is a 2021 model. `bge-small-en-v1.5` (2023, BAAI) produces better semantic quality at the same size class (33M params, 384-dim, ~23MB q8). The MTEB benchmark improvements are meaningful for short-text classification (bill titles).

### The Real Cost

Swapping the model ID is trivial. The non-trivial work is:

1. **Regenerate sector embeddings** — Run `npm run generate:embeddings` with the new model. The script (`scripts/generate-sector-embeddings.ts`) hardcodes `Xenova/all-MiniLM-L6-v2` on line 39 and must be updated too.

2. **Recalibrate cosine similarity threshold** — The current `DEFAULT_THRESHOLD = 0.28` in `cosine-similarity.ts:26` was empirically tuned for all-MiniLM-L6-v2's similarity distribution. Different embedding models produce different similarity ranges. bge-small tends to produce higher absolute similarities, so the threshold likely needs to increase (maybe 0.35-0.45). This requires testing against the same calibration set mentioned in the code comments:
   - Known-good: NDAA, CHIPS Act, Medicare → should classify correctly
   - Known-bad: "Resolution honoring National Cheese Day" → should return empty
   - Edge cases: bills touching multiple sectors

3. **Verify bill-lobbying similarity** — `bill-lobbying-similarity.ts` uses `embedText()` from the same pipeline with a 0.55 "strong match" threshold (line 24). This threshold also needs recalibration against the new model's similarity distribution.

### Exact Changes

#### Step 4a: Swap model ID (2 files)

**`src/lib/intelligence/embeddings/embedding-classifier.ts` line 28**:

```typescript
// FROM:
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
// TO:
const MODEL_ID = 'Xenova/bge-small-en-v1.5';
```

**`scripts/generate-sector-embeddings.ts` lines 38-39**:

```typescript
// FROM:
console.log('Loading model Xenova/all-MiniLM-L6-v2 (quantized int8)...');
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
// TO:
console.log('Loading model Xenova/bge-small-en-v1.5 (quantized int8)...');
const extractor = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
```

#### Step 4b: Regenerate sector embeddings

```bash
npm run generate:embeddings
```

This overwrites `src/lib/intelligence/embeddings/sector-embeddings.json` (1731 lines) with new 384-dim vectors from the new model. The script validates dimensions and normalization automatically.

#### Step 4c: Recalibrate thresholds

Write a calibration script that:

1. Embeds the calibration bill titles with the new model
2. Computes cosine similarity against new sector embeddings
3. Finds the threshold that correctly separates known-good from known-bad
4. Reports the new optimal threshold

Then update:

- `cosine-similarity.ts:26` — `DEFAULT_THRESHOLD` (currently 0.28)
- `bill-lobbying-similarity.ts:24` — `HIGH_SIMILARITY_THRESHOLD` (currently 0.55)
- `cosine-similarity.test.ts` — update threshold assertion if hardcoded

#### Step 4d: Invalidate embedding caches

All embedding caches need invalidation since old-model embeddings are incompatible with new-model sector embeddings:

- Filing embeddings: `lobbying-embedding:{filing.id}` (30-day TTL)
- Bill sector cache: `bill-sector:{hash}` if one exists
- Option: prefix bump (e.g., `v2-lobbying-embedding:`) or flush via Redis CLI

### Risk

| Risk                                                    | Likelihood | Mitigation                                            |
| ------------------------------------------------------- | ---------- | ----------------------------------------------------- |
| Threshold miscalibration degrades sector classification | Medium     | Calibration script with known-good/bad test cases     |
| bge-small not available as Xenova ONNX q8               | Low        | Check HF Hub first; `Xenova/bge-small-en-v1.5` exists |
| Bill-lobbying matches shift significantly               | Medium     | Compare top-10 matches for sample bills before/after  |
| Embedding dimension changes (not 384)                   | Very Low   | bge-small-en-v1.5 is 384-dim; script validates        |

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

## Execution Order

1. **Priority 2** (NER swap) — Do first. Standalone, no dependencies, biggest download savings.
2. **Priority 3** (cold start measurement) — Do second. Results inform whether Priority 4 is urgent.
3. **Priority 4** (embedding swap) — Do third, only if Priority 3 shows model loading is a bottleneck. Most effort due to threshold recalibration.

Each priority is independently committable and deployable.
