# Embedding Pipeline Silently Broken in `@huggingface/transformers@3.8.1` (RESOLVED 2026-04-16)

**Discovered:** 2026-04-16 during Phase 2 threshold calibration
**Resolved:** 2026-04-16 by upgrading to `@huggingface/transformers@4.1.0`
**Severity at time of discovery:** High — silent degradation; no production error surfaced

## Summary

`embedText()` and `classifyBillSectors()` in `src/lib/intelligence/embeddings/embedding-classifier.ts` returned `null` / `[]` in the Node 25 + Next.js 16 + `@huggingface/transformers@3.8.1` stack. Callers all have graceful fallbacks to keyword matching, so nothing visibly errored — but every analyzer that claimed to use embeddings was silently running on keywords alone.

## Root cause

Two compounding issues in `@huggingface/transformers@3.8.1`:

1. **Node 25 ESM strict loader** rejected the HTTPS URL that `onnxruntime-web` used to fetch its WASM binary at runtime: `Only URLs with a scheme in: file and data are supported by the default ESM loader. Received protocol 'https:'`.
2. **Turbopack ≠ webpack package resolution.** `onnxruntime-web` at runtime dynamically imported `ort-wasm-simd-threaded.mjs` (without the `.jsep.` suffix), but the file shipped under `transformers/dist/` only carried the `.jsep.` variant.

`pipelineLoadFailed` was then permanently set for the process — zero retries, zero visibility in production logs unless someone grepped for `[EmbeddingClassifier] Pipeline load failed`.

## Resolution

`@huggingface/transformers@4.1.0` rewrites the WASM loader and resolves both issues. Verified empirically:

```bash
$ npm run smoke:embedding
[smoke] pipeline loaded in 294ms
[smoke] embedding shape OK (384 dims, unit norm = 1.0000)
[smoke] PASS — embedding pipeline is functional
```

The smoke script (`scripts/smoke-embedding-pipeline.ts`) loads the real pipeline in pure Node — no jest, no jsdom, no mocks. It must pass after any `@huggingface/transformers` change or Node major upgrade.

## Why mocked tests didn't catch this

Every test under `src/__tests__/intelligence/` that touches embeddings mocks `@huggingface/transformers`. Mocks return whatever vector you tell them to — they don't exercise the real WASM loader. 52 ML tests passed against a runtime that produced zero embeddings in production.

The fix going forward is the smoke script above. Run it any time the embedding stack changes.

## Phase 1 reopening

The `@huggingface/transformers@4.1.0` upgrade was deferred in Phase 1 (2026-04-15) under the "fresh-release + unverified runtime risk" rationale. SECURITY.md required: "Before upgrading, a non-mocked pipeline smoke test must exist." That test now exists (`scripts/smoke-embedding-pipeline.ts`), and the upgrade verification is straightforward — see updated SECURITY.md and the lobbying matcher status row in `PLAN-backbone-gaps-2026-04.md`.

## Workaround that was used to capture the calibration data on 2026-04-16

(Historical — kept here so anyone reading prior commits understands what happened.)

Before the upgrade landed, calibration data was captured by running `next dev --webpack` and symlinking the non-jsep WASM files into `node_modules/@huggingface/transformers/dist/`. The symlinks were removed after capture and never committed. With `@huggingface/transformers@4.1.0` the workaround is unnecessary; the calibration endpoint at `src/app/api/debug/calibrate-lobbying/route.ts` runs against the standard dev server.
