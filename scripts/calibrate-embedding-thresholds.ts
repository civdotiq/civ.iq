#!/usr/bin/env tsx
/**
 * Embedding Threshold Calibration Script
 *
 * Tests the new bge-small-en-v1.5 model against known-good and known-bad
 * bill titles to find the optimal cosine similarity threshold.
 *
 * Usage: npx tsx scripts/calibrate-embedding-thresholds.ts
 *
 * NOT shipped — local calibration only.
 */

import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

interface Tensor {
  data: Float32Array;
  dims: number[];
}

interface Pipeline {
  (text: string, options?: { pooling?: string; normalize?: boolean }): Promise<Tensor>;
}

// ── Calibration data ───────────────────────────────────────────────

/** Bills that SHOULD classify to at least one sector. */
const KNOWN_GOOD = [
  { title: 'National Defense Authorization Act for Fiscal Year 2025', expectSector: 'Defense' },
  { title: 'CHIPS and Science Act', expectSector: 'Communications/Electronics' },
  { title: 'Medicare Prescription Drug Price Negotiation Act', expectSector: 'Health' },
  { title: 'Bipartisan Infrastructure Law', expectSector: 'Construction' },
  {
    title: 'Inflation Reduction Act clean energy provisions',
    expectSector: 'Energy/Natural Resources',
  },
  { title: 'Farm Bill Reauthorization Act of 2024', expectSector: 'Agribusiness' },
  {
    title: 'Dodd-Frank Wall Street Reform and Consumer Protection Act',
    expectSector: 'Finance/Insurance/Real Estate',
  },
  { title: 'PRO Act - Protecting the Right to Organize', expectSector: 'Labor' },
  { title: 'FAA Reauthorization Act of 2024', expectSector: 'Transportation' },
];

/** Bills that should return EMPTY (no sector match). */
const KNOWN_BAD = [
  'Resolution honoring National Cheese Day',
  'A resolution designating October as National Pumpkin Month',
  'Congratulating the Kansas City Chiefs on winning Super Bowl LVIII',
  'Resolution commemorating the 50th anniversary of the local library',
];

/** Bills that touch multiple sectors (edge cases). */
const EDGE_CASES = [
  { title: 'Build Back Better Act', note: 'touches energy, health, labor, construction' },
  { title: 'American Rescue Plan Act', note: 'broad — health, labor, finance' },
];

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('Loading bge-small-en-v1.5...');
  const extractor = (await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
    dtype: 'q8',
  })) as unknown as Pipeline;

  // Load sector embeddings
  const sectorEmbeddings: Array<{
    sector: string;
    embedding: number[];
  }> = require('../src/lib/intelligence/embeddings/sector-embeddings.json');

  async function embed(text: string): Promise<Float32Array> {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return output.data;
  }

  function cosineSim(a: ArrayLike<number>, b: ArrayLike<number>): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
    }
    return dot; // Already normalized
  }

  function getTopSectors(embedding: Float32Array) {
    return sectorEmbeddings
      .map(s => ({ sector: s.sector, score: cosineSim(embedding, s.embedding) }))
      .sort((a, b) => b.score - a.score);
  }

  // ── Test known-good bills ──────────────────────────────────────

  console.log('\n═══ KNOWN-GOOD BILLS ═══');
  const goodScores: number[] = [];

  for (const bill of KNOWN_GOOD) {
    const emb = await embed(bill.title);
    const top = getTopSectors(emb);
    const topScore = top[0]!.score;
    goodScores.push(topScore);
    const match = top[0]!.sector === bill.expectSector ? '✓' : '✗';
    console.log(`\n  ${match} "${bill.title}"`);
    console.log(`    Expected: ${bill.expectSector}`);
    console.log(
      `    Top 3: ${top
        .slice(0, 3)
        .map(s => `${s.sector} (${s.score.toFixed(4)})`)
        .join(', ')}`
    );
  }

  // ── Test known-bad bills ───────────────────────────────────────

  console.log('\n═══ KNOWN-BAD BILLS (should have LOW scores) ═══');
  const badScores: number[] = [];

  for (const title of KNOWN_BAD) {
    const emb = await embed(title);
    const top = getTopSectors(emb);
    const topScore = top[0]!.score;
    badScores.push(topScore);
    console.log(`\n  "${title}"`);
    console.log(`    Top: ${top[0]!.sector} (${topScore.toFixed(4)})`);
  }

  // ── Test edge cases ────────────────────────────────────────────

  console.log('\n═══ EDGE CASES (multi-sector) ═══');

  for (const bill of EDGE_CASES) {
    const emb = await embed(bill.title);
    const top = getTopSectors(emb);
    console.log(`\n  "${bill.title}" — ${bill.note}`);
    console.log(
      `    Top 5: ${top
        .slice(0, 5)
        .map(s => `${s.sector} (${s.score.toFixed(4)})`)
        .join(', ')}`
    );
  }

  // ── Threshold analysis ─────────────────────────────────────────

  console.log('\n═══ THRESHOLD ANALYSIS ═══');
  const minGood = Math.min(...goodScores);
  const maxBad = Math.max(...badScores);

  console.log(`  Min known-good top score: ${minGood.toFixed(4)}`);
  console.log(`  Max known-bad top score:  ${maxBad.toFixed(4)}`);
  console.log(`  Gap:                      ${(minGood - maxBad).toFixed(4)}`);

  if (minGood > maxBad) {
    const optimal = (minGood + maxBad) / 2;
    console.log(`\n  ✓ Clean separation exists`);
    console.log(`  Recommended DEFAULT_THRESHOLD: ${optimal.toFixed(2)}`);
    console.log(`  Range: any value in [${maxBad.toFixed(4)}, ${minGood.toFixed(4)}] works`);
  } else {
    console.log(`\n  ⚠ No clean separation — known-good and known-bad overlap`);
    console.log(`  Manual tuning required`);
  }

  // ── Bill-lobbying threshold guidance ───────────────────────────

  console.log('\n═══ BILL-LOBBYING THRESHOLD GUIDANCE ═══');
  console.log('  The HIGH_SIMILARITY_THRESHOLD (currently 0.55) is for');
  console.log('  comparing bill text vs lobbying filing text (longer docs).');
  console.log('  bge-small tends to produce higher similarities for matching docs.');

  // Test with a known bill-lobbying pair
  const billEmb = await embed(
    'National Defense Authorization Act for defense spending and military readiness'
  );
  const lobbyEmb = await embed(
    'Defense contracting, military procurement, weapons systems acquisition'
  );
  const pairSim = cosineSim(billEmb, lobbyEmb);
  console.log(`\n  Sample bill-lobbying pair similarity: ${pairSim.toFixed(4)}`);

  const unrelatedEmb = await embed('Organic food certification standards for small farms');
  const unrelatedSim = cosineSim(billEmb, unrelatedEmb);
  console.log(`  Unrelated pair similarity:            ${unrelatedSim.toFixed(4)}`);
  console.log(
    `  Recommended HIGH_SIMILARITY_THRESHOLD: ${((pairSim + unrelatedSim) / 2).toFixed(2)} to ${(pairSim * 0.85).toFixed(2)}`
  );
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
