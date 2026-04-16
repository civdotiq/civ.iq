/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Smoke test for every ML runtime entrypoint CIV.IQ uses.
 *
 * Every jest test that touches these pipelines mocks them. Mocked tests
 * pass even when the real runtime is broken — exactly what happened with
 * `@huggingface/transformers@3.8.1` on Node 25 (the loader threw
 * `ERR_UNSUPPORTED_ESM_URL_SCHEME` and `embedText()` silently returned
 * `null` in production while every test stayed green).
 *
 * The four checks below mirror the four production code paths:
 *   1. feature-extraction (embedding-classifier, lobbying matcher)
 *   2. zero-shot-classification (zero-shot-classifier — bill sectors)
 *   3. token-classification (civic-ner — entity extraction)
 *   4. onnxruntime-web direct (vote-predictor — custom ONNX model)
 *
 * Run after any change to `@huggingface/transformers`, `onnxruntime-web`,
 * Node major version, or any of the four pipeline call sites:
 *
 *   npm run smoke:embedding
 *
 * Exit code 0 = all pipelines functional. Non-zero = regression.
 *
 * Cost (measured 2026-04-16, transformers@4.1.0):
 *   - Warm cache: ~3.8s total (FE 234ms, ZS 2096ms, NER 1275ms, ORT 184ms)
 *   - Cold cache: ~9.9s total (FE 3051ms, ZS 4456ms, NER 2194ms, ORT 181ms)
 * Cold pulls ~150MB of model weights from huggingface.co.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

const results: CheckResult[] = [];

async function checkFeatureExtraction(): Promise<void> {
  const t0 = performance.now();
  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowLocalModels = false;
  const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' });
  const out = (await pipe('Special Committee on Aging jurisdiction and policy', {
    pooling: 'mean',
    normalize: true,
  })) as { data: Float32Array; dims: number[] };
  if (!(out.data instanceof Float32Array) || out.data.length !== 384) {
    throw new Error(`expected 384-dim Float32Array, got ${out.data?.length ?? 'null'}`);
  }
  let norm = 0;
  for (let i = 0; i < out.data.length; i++) norm += out.data[i]! * out.data[i]!;
  norm = Math.sqrt(norm);
  if (Math.abs(norm - 1.0) > 0.01) {
    throw new Error(`expected unit-norm embedding, got ${norm.toFixed(4)}`);
  }
  results.push({
    name: 'feature-extraction (embedding-classifier)',
    ok: true,
    detail: `384-dim unit-norm in ${Math.round(performance.now() - t0)}ms`,
  });
}

async function checkZeroShot(): Promise<void> {
  const t0 = performance.now();
  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowLocalModels = false;
  const pipe = await pipeline('zero-shot-classification', 'Xenova/nli-deberta-v3-xsmall', {
    dtype: 'q8',
  });
  const out = (await pipe('National Defense Authorization Act', [
    'Defense',
    'Health',
    'Energy',
  ])) as {
    labels: string[];
    scores: number[];
  };
  if (!Array.isArray(out.labels) || out.labels.length !== 3) {
    throw new Error(`expected 3 labels, got ${out.labels?.length ?? 'null'}`);
  }
  if (out.labels[0] !== 'Defense') {
    throw new Error(`expected top label "Defense" for NDAA, got "${out.labels[0]}"`);
  }
  results.push({
    name: 'zero-shot-classification (zero-shot-classifier)',
    ok: true,
    detail: `top label = ${out.labels[0]} (${out.scores[0]!.toFixed(3)}) in ${Math.round(performance.now() - t0)}ms`,
  });
}

async function checkNER(): Promise<void> {
  const t0 = performance.now();
  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowLocalModels = false;
  const pipe = await pipeline('token-classification', 'onnx-community/distilbert-NER-ONNX', {
    dtype: 'q8',
  });
  const out = (await pipe('Senator Chuck Grassley introduced the bill in Iowa.')) as Array<{
    word: string;
    entity: string;
    score: number;
  }>;
  if (!Array.isArray(out) || out.length === 0) {
    throw new Error(`expected non-empty NER output, got ${JSON.stringify(out).slice(0, 100)}`);
  }
  results.push({
    name: 'token-classification (civic-ner)',
    ok: true,
    detail: `${out.length} entities in ${Math.round(performance.now() - t0)}ms`,
  });
}

async function checkVotePredictor(): Promise<void> {
  const t0 = performance.now();
  // Same import path the production module uses (onnxruntime-web, not -node)
  const ort = (await import('onnxruntime-web')) as unknown as {
    InferenceSession: {
      create(buffer: ArrayBuffer): Promise<{ inputNames: string[]; outputNames: string[] }>;
    };
  };
  const modelPath = resolve('models/vote-prediction.onnx');
  const buf = readFileSync(modelPath);
  // Float32Array view → fresh ArrayBuffer copy, satisfies onnxruntime-web's typed-buffer contract
  const ab = new Uint8Array(buf).buffer;
  const session = await ort.InferenceSession.create(ab);
  if (!session.inputNames || session.inputNames.length === 0) {
    throw new Error('expected non-empty inputNames on the session');
  }
  results.push({
    name: 'onnxruntime-web (vote-predictor)',
    ok: true,
    detail: `session loaded with input "${session.inputNames[0]}" in ${Math.round(performance.now() - t0)}ms`,
  });
}

async function main(): Promise<void> {
  const checks = [
    { name: 'feature-extraction', fn: checkFeatureExtraction },
    { name: 'zero-shot-classification', fn: checkZeroShot },
    { name: 'token-classification', fn: checkNER },
    { name: 'onnxruntime-web', fn: checkVotePredictor },
  ];

  const overallStart = performance.now();
  let failed = 0;

  for (const { name, fn } of checks) {
    try {
      await fn();
    } catch (err) {
      failed++;
      results.push({
        name,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  for (const r of results) {
    const tag = r.ok ? '[smoke] PASS' : '[smoke] FAIL';
    console.log(`${tag} — ${r.name} — ${r.detail}`);
  }

  const totalMs = Math.round(performance.now() - overallStart);
  if (failed > 0) {
    console.error(`\n[smoke] ${failed}/${checks.length} pipelines FAILED in ${totalMs}ms`);
    process.exit(1);
  }
  console.log(`\n[smoke] ALL ${checks.length} pipelines PASS in ${totalMs}ms`);
}

main().catch(err => {
  console.error('[smoke] FAIL — unexpected error:', err);
  process.exit(1);
});
