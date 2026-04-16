/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Smoke test for the @huggingface/transformers WASM pipeline.
 *
 * Every jest test that touches embeddings mocks the pipeline. Mocked tests
 * pass even when the real runtime is broken — which is exactly what
 * happened with @huggingface/transformers@3.8.1 on Node 25 (the loader
 * threw `ERR_UNSUPPORTED_ESM_URL_SCHEME` and `embedText()` silently
 * returned `null` in production while every test stayed green).
 *
 * Run after any change to `@huggingface/transformers`, Node major version,
 * or `embedding-classifier.ts`:
 *
 *   npm run smoke:embedding
 *
 * Exit code 0 = pipeline functional. Non-zero = regression.
 *
 * Cost: ~1s on a warm cache; ~15s on first run (downloads the ~23MB
 * quantized model from huggingface.co).
 */

async function main(): Promise<void> {
  const t0 = performance.now();
  let pipeline: typeof import('@huggingface/transformers').pipeline;
  let env: typeof import('@huggingface/transformers').env;
  try {
    ({ pipeline, env } = await import('@huggingface/transformers'));
  } catch (err) {
    fail('Failed to import @huggingface/transformers', err);
  }

  env.allowLocalModels = false;

  let pipe: Awaited<ReturnType<typeof pipeline>>;
  try {
    pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      dtype: 'q8',
    });
  } catch (err) {
    fail('Failed to load feature-extraction pipeline', err);
  }

  const loadMs = Math.round(performance.now() - t0);
  console.log(`[smoke] pipeline loaded in ${loadMs}ms`);

  let out: { data: Float32Array; dims: number[] };
  try {
    const result = await pipe('Special Committee on Aging jurisdiction and policy', {
      pooling: 'mean',
      normalize: true,
    });
    out = result as { data: Float32Array; dims: number[] };
  } catch (err) {
    fail('Failed to embed text', err);
  }

  if (!(out.data instanceof Float32Array)) {
    fail(`Expected Float32Array, got ${typeof out.data}`);
  }
  if (out.data.length !== 384) {
    fail(`Expected 384-dim embedding, got ${out.data.length}`);
  }

  let norm = 0;
  for (let i = 0; i < out.data.length; i++) norm += out.data[i]! * out.data[i]!;
  norm = Math.sqrt(norm);
  if (Math.abs(norm - 1.0) > 0.01) {
    fail(`Expected unit-norm embedding, got norm = ${norm.toFixed(4)}`);
  }

  console.log(`[smoke] embedding shape OK (384 dims, unit norm = ${norm.toFixed(4)})`);
  console.log('[smoke] PASS — embedding pipeline is functional');
}

function fail(message: string, error?: unknown): never {
  console.error(`[smoke] FAIL — ${message}`);
  if (error) console.error(error);
  process.exit(1);
}

main().catch(err => fail('Unexpected error', err));
