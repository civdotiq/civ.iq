/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for the shared @huggingface/transformers runtime configuration.
 * The cache must live in the OS temp dir — Vercel's /var/task is read-only.
 */

import os from 'node:os';
import {
  assertMlPipelinesEnabled,
  configureTransformersEnv,
  TRANSFORMERS_CACHE_DIR,
} from '@/lib/intelligence/embeddings/transformers-env';

describe('assertMlPipelinesEnabled', () => {
  const original = process.env.CIVIQ_ML_PIPELINES;
  afterEach(() => {
    if (original === undefined) delete process.env.CIVIQ_ML_PIPELINES;
    else process.env.CIVIQ_ML_PIPELINES = original;
  });

  it('allows loads by default', () => {
    delete process.env.CIVIQ_ML_PIPELINES;
    expect(() => assertMlPipelinesEnabled()).not.toThrow();
  });

  it('throws when CIVIQ_ML_PIPELINES=off', () => {
    process.env.CIVIQ_ML_PIPELINES = 'off';
    expect(() => assertMlPipelinesEnabled()).toThrow('CIVIQ_ML_PIPELINES=off');
  });
});

describe('configureTransformersEnv', () => {
  it('points the model cache at a writable temp directory', () => {
    const env = { allowLocalModels: true, cacheDir: './node_modules/.cache/' as string | null };
    configureTransformersEnv(env);

    expect(env.cacheDir).toBe(TRANSFORMERS_CACHE_DIR);
    expect(TRANSFORMERS_CACHE_DIR.startsWith(os.tmpdir())).toBe(true);
    expect(TRANSFORMERS_CACHE_DIR).not.toContain('node_modules');
  });

  it('disables local model lookup', () => {
    const env = { allowLocalModels: true, cacheDir: null };
    configureTransformersEnv(env);

    expect(env.allowLocalModels).toBe(false);
  });
});
