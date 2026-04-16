# Embedding Pipeline Silently Broken in Current Stack

**Discovered:** 2026-04-16 during Phase 2 threshold calibration
**Severity:** High — silent degradation; no production error surfaces
**Affects:** vote prediction, bill-lobbying similarity, sector classification, lobbying committee embedding fallback

## Summary

`embedText()` and `classifyBillSectors()` in `src/lib/intelligence/embeddings/embedding-classifier.ts` return `null` / `[]` in the current Node 25 + Next.js 16 + `@huggingface/transformers@3.8.1` stack. Callers all have graceful fallbacks to keyword matching, so nothing visibly errors — but every analyzer that claims to use embeddings is silently running on keywords alone.

## Reproduction

```bash
npm run dev   # Turbopack — fails with ERR_UNSUPPORTED_ESM_URL_SCHEME
npx next dev --webpack   # webpack — fails with ERR_MODULE_NOT_FOUND on ort-wasm-simd-threaded.mjs
```

Server log shows:

```
[EmbeddingClassifier] Pipeline load failed, disabling for this process
```

`pipelineLoadFailed` is then permanently set for the process — zero retries, zero visibility in production logs unless someone greps for that exact message.

## Root cause

Two compounding issues:

1. **Node 25 ESM strict loader** rejects the HTTPS URL that `onnxruntime-web` uses to fetch its WASM binary at runtime: `Only URLs with a scheme in: file and data are supported by the default ESM loader. Received protocol 'https:'`.
2. **Turbopack ≠ webpack package resolution.** `@huggingface/transformers@3.8.1` ships a `dist/ort-wasm-simd-threaded.jsep.mjs` variant, but `onnxruntime-web` at runtime dynamically imports `ort-wasm-simd-threaded.mjs` (without the `.jsep.` suffix). The non-jsep file only exists under `node_modules/onnxruntime-web/dist/`.

## Workaround used to run 2026-04-16 calibration

1. Start dev with `npx next dev --webpack` (Turbopack cannot bundle the dynamic WASM imports).
2. Symlink the non-jsep WASM files from `onnxruntime-web/dist/` into `transformers/dist/`:
   ```bash
   ln -sf /path/to/node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs  \
          /path/to/node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.mjs
   ln -sf /path/to/node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm \
          /path/to/node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.wasm
   ```
3. Override `env.backends.onnx.wasm.wasmPaths` to a `file://` URL pointing at `onnxruntime-web/dist/`.

See `src/app/api/debug/calibrate-lobbying/route.ts` for the override code.

These symlinks were removed after calibration — they're not a permanent fix.

## Recommended fix

**Reopen Phase 1** to upgrade `@huggingface/transformers` to `4.1.0+`. Phase 1 (2026-04-15) deferred this upgrade citing "fresh-release + unverified major-bump runtime risk." The calibration work exposes a concrete, shipped-to-production bug that 4.x likely resolves (the WASM loading code was rewritten upstream).

Verification for a 4.x upgrade attempt:

- `/api/debug/calibrate-lobbying` returns HTTP 200 with real similarity scores
- `classifyBillSectors('National Defense Authorization Act')` returns non-empty results
- The 52 ML inference tests still pass (vote predictor, cosine-similarity, etc.)
- Turbopack dev (`npm run dev`) works without the `--webpack` flag

If 4.x regresses ML inference tests, the alternative is a `patch-package` script that creates the symlinks at install time — ugly but would unblock the embedding feature without risking the full upgrade.

## Until this is fixed

All embedding-dependent features run on keyword/fallback paths only. The lobbying matcher's Tier 2 (embedding) never fires. Vote prediction uses fewer features than designed. Bill-lobbying similarity returns empty. This is the reality of the current deployment — not a hypothetical risk.
