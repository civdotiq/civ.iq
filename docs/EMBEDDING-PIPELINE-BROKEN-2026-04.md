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

`@huggingface/transformers@4.1.0` rewrites the WASM loader and resolves both issues. Verified empirically by `npm run smoke:embedding`, which exercises all four ML runtime entry points CIV.IQ uses (feature-extraction, zero-shot-classification, token-classification, and onnxruntime-web for the vote predictor). All four pass.

Measured timings (2026-04-16):

- Warm cache: **3.8 s total** — FE 234 ms · ZS 2096 ms · NER 1275 ms · ORT 184 ms
- Cold cache: **9.9 s total** — FE 3051 ms · ZS 4456 ms · NER 2194 ms · ORT 181 ms (~150 MB of model weights pulled from huggingface.co)

The smoke script (`scripts/smoke-embedding-pipeline.ts`) loads the real pipelines in pure Node — no jest, no jsdom, no mocks — and is wired into `validate:all` (critical task), so a regression here breaks CI rather than living silently in production.

## Why mocked tests didn't catch this

Every test under `src/__tests__/intelligence/` that touches embeddings (and zero-shot, and NER) mocks `@huggingface/transformers`. Mocks return whatever you tell them to — they don't exercise the real WASM loader. The 86 jest tests across the seven ML test suites passed against a runtime that produced zero embeddings in production.

The fix going forward is the smoke script above plus its inclusion in `validate:all`. The script covers every transformers consumer (FE, ZS, NER) and `onnxruntime-web` directly — same coverage shape as the four production call sites.

## Phase 1 reopening

The `@huggingface/transformers@4.1.0` upgrade was deferred in Phase 1 (2026-04-15) under the "fresh-release + unverified runtime risk" rationale. SECURITY.md required: "Before upgrading, a non-mocked pipeline smoke test must exist." That test now exists (`scripts/smoke-embedding-pipeline.ts`), and the upgrade verification is straightforward — see updated SECURITY.md and the lobbying matcher status row in `PLAN-backbone-gaps-2026-04.md`.

## Workaround that was used to capture the calibration data on 2026-04-16

(Historical — kept here so anyone reading prior commits understands what happened.)

Before the upgrade landed, calibration data was captured by running `next dev --webpack` and symlinking the non-jsep WASM files into `node_modules/@huggingface/transformers/dist/`. The symlinks were removed after capture and never committed. With `@huggingface/transformers@4.1.0` the workaround is unnecessary; the calibration endpoint at `src/app/api/debug/calibrate-lobbying/route.ts` runs against the standard dev server.
