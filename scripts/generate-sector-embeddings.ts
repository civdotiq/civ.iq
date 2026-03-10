#!/usr/bin/env tsx
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Generate pre-computed sector embeddings for bill classification.
 *
 * This script embeds the 13 IndustrySector descriptions using all-MiniLM-L6-v2
 * and writes the resulting vectors to sector-embeddings.json. The JSON file is
 * checked into git and loaded at runtime by the embedding classifier.
 *
 * Run: npm run generate:embeddings
 * Re-run if: sector descriptions change or model is upgraded
 *
 * Requires network access on first run to download the model (~23MB).
 * Subsequent runs use the cached model.
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

interface Tensor {
  data: Float32Array;
  dims: number[];
}

interface Pipeline {
  (text: string, options?: { pooling?: string; normalize?: boolean }): Promise<Tensor>;
}

async function main() {
  console.log('Loading @huggingface/transformers...');
  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowLocalModels = false;

  console.log('Loading model Xenova/all-MiniLM-L6-v2 (quantized int8)...');
  const extractor = (await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    dtype: 'q8',
  })) as unknown as Pipeline;

  // Import sector descriptions — use dynamic import for ESM/CJS compat with tsx
  const { SECTOR_DESCRIPTIONS } = await import(
    '../src/lib/intelligence/embeddings/sector-descriptions'
  );

  console.log(`Embedding ${SECTOR_DESCRIPTIONS.size} sector descriptions...`);

  const entries: Array<{ sector: string; embedding: number[] }> = [];

  for (const [sector, description] of SECTOR_DESCRIPTIONS) {
    const output = await extractor(description, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data);

    // Verify dimensions
    if (embedding.length !== 384) {
      throw new Error(`Expected 384-dim embedding for ${sector}, got ${embedding.length}`);
    }

    // Verify normalization (magnitude should be ~1.0)
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (Math.abs(magnitude - 1.0) > 0.01) {
      throw new Error(`Embedding for ${sector} not normalized: magnitude=${magnitude.toFixed(4)}`);
    }

    entries.push({ sector: sector as string, embedding });
    console.log(`  ✓ ${sector} (${embedding.length}-dim, magnitude=${magnitude.toFixed(4)})`);
  }

  // Write to JSON
  const outPath = resolve(__dirname, '../src/lib/intelligence/embeddings/sector-embeddings.json');
  writeFileSync(outPath, JSON.stringify(entries, null, 2));

  const fileSizeKB = (JSON.stringify(entries).length / 1024).toFixed(1);
  console.log(`\nWrote ${entries.length} embeddings to sector-embeddings.json (${fileSizeKB} KB)`);

  // Validate: check that distinct sectors have reasonable separation
  console.log('\nPairwise similarity check (should be <0.9 for distinct sectors):');
  let maxSimilarity = 0;
  let maxPair = '';

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]!;
      const b = entries[j]!;
      let dot = 0;
      for (let k = 0; k < a.embedding.length; k++) {
        dot += a.embedding[k]! * b.embedding[k]!;
      }
      if (dot > maxSimilarity) {
        maxSimilarity = dot;
        maxPair = `${a.sector} ↔ ${b.sector}`;
      }
    }
  }

  console.log(`  Most similar pair: ${maxPair} (${maxSimilarity.toFixed(4)})`);
  if (maxSimilarity > 0.9) {
    console.warn('  ⚠ WARNING: Two sectors are too similar — descriptions may need refinement');
  } else {
    console.log('  ✓ All sector pairs have reasonable separation');
  }
}

main().catch(error => {
  console.error('Failed to generate embeddings:', error);
  process.exit(1);
});
