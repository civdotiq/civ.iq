/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Shared runtime configuration for `@huggingface/transformers` pipelines.
 *
 * The library's default file cache lives next to the package itself
 * (`node_modules/@huggingface/transformers/.cache/`). On Vercel that path is
 * under the read-only `/var/task`, and a failed cache write is NOT caught by
 * the library — `pipeline()` rejects after the download, so every load failed
 * and callers silently fell back to keywords. Only the OS temp dir (`/tmp` on
 * Vercel) is writable, so the cache must live there.
 *
 * The other half of that outage (onnxruntime-node's shared library missing
 * from function bundles) is fixed by the ONNX_NODE_SHARED_LIB tracing include in
 * next.config.mjs.
 * See docs/EMBEDDING-PIPELINE-BROKEN-2026-04.md.
 */

import os from 'node:os';
import path from 'node:path';

/** Writable model cache directory (`/tmp/hf-transformers-cache` on Vercel). */
export const TRANSFORMERS_CACHE_DIR = path.join(os.tmpdir(), 'hf-transformers-cache');

/** The subset of the transformers `env` object this module configures. */
interface TransformersEnv {
  allowLocalModels: boolean;
  cacheDir: string | null;
}

/** Apply CIV.IQ's runtime settings to the transformers `env` singleton. */
export function configureTransformersEnv(env: TransformersEnv): void {
  // Models come from the Hub, never a local `/models/` lookup.
  env.allowLocalModels = false;
  env.cacheDir = TRANSFORMERS_CACHE_DIR;
}

/**
 * Emergency kill switch: set CIVIQ_ML_PIPELINES=off (then redeploy) to stop
 * every model load. Loaders call this first inside their try, so the existing
 * failure path marks the pipeline unavailable and callers fall back to
 * keyword matching — the behaviour before the models worked on Vercel — with
 * no huggingface.co download and no native library load.
 */
export function assertMlPipelinesEnabled(): void {
  if (process.env.CIVIQ_ML_PIPELINES === 'off') {
    throw new Error('ML pipelines disabled by CIVIQ_ML_PIPELINES=off');
  }
}
