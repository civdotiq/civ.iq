#!/usr/bin/env tsx
/**
 * Embedding Threshold Calibration Script
 *
 * Tests an embedding model against known-good and known-bad bill titles
 * to find the optimal cosine similarity threshold and validate that the
 * gap between the two classes is wide enough for production use.
 *
 * Usage:
 *   npx tsx scripts/calibrate-embedding-thresholds.ts
 *   npx tsx scripts/calibrate-embedding-thresholds.ts --model Xenova/bge-small-en-v1.5
 *
 * NOT shipped — local calibration only.
 *
 * Gate: the script exits with code 1 if the gap between min-known-good
 * and max-known-bad is less than MIN_GAP (0.05). This prevents deploying
 * a model whose threshold margin is too thin for production diversity.
 */

import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

/** Minimum acceptable gap between worst known-good and best known-bad. */
const MIN_GAP = 0.05;

interface Tensor {
  data: Float32Array;
  dims: number[];
}

interface Pipeline {
  (text: string, options?: { pooling?: string; normalize?: boolean }): Promise<Tensor>;
}

// ── Calibration data ───────────────────────────────────────────────
// Source: real bill titles from Congress.gov, covering diverse types
// and phrasing styles. Minimum 30 good + 15 bad for statistical rigor.

/** Bills that SHOULD classify to at least one sector. */
const KNOWN_GOOD = [
  // ── Major/famous legislation (9) ──
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

  // ── Routine/obscure legislation (10) ──
  {
    title: 'To amend the Internal Revenue Code to increase the deduction for business meals',
    expectSector: 'Finance/Insurance/Real Estate',
  },
  {
    title: 'Rural Broadband Expansion Act',
    expectSector: 'Communications/Electronics',
  },
  {
    title: 'Veterans Health Care Improvement Act of 2024',
    expectSector: 'Health',
  },
  {
    title: 'Coast Guard Authorization Act of 2024',
    expectSector: 'Defense',
  },
  {
    title: 'Crop Insurance Reform Act',
    expectSector: 'Agribusiness',
  },
  {
    title: 'Pipeline Safety Improvement Act of 2024',
    expectSector: 'Energy/Natural Resources',
  },
  {
    title: 'National Highway Freight Program Reauthorization',
    expectSector: 'Transportation',
  },
  {
    title: 'Small Business Investment Company Modernization Act',
    expectSector: 'Finance/Insurance/Real Estate',
  },
  {
    title: 'Federal Prison Industries Competition in Contracting Act',
    expectSector: 'Misc Business',
  },
  {
    title: 'Mine Safety and Health Act Amendments',
    expectSector: 'Labor',
  },

  // ── Ambiguous sector overlap bills (5) ──
  {
    title: 'TRICARE Pharmacy Benefits Improvement Act',
    expectSector: 'Health', // defense-health overlap, Health is primary
  },
  {
    title: 'Renewable Fuel Standard Reform Act',
    expectSector: 'Energy/Natural Resources', // energy-agriculture overlap
  },
  {
    title: 'Military Construction and Veterans Affairs Appropriations Act',
    expectSector: 'Defense', // defense-construction overlap
  },
  {
    title: 'Cybersecurity and Infrastructure Security Agency Act',
    expectSector: 'Communications/Electronics', // tech-defense overlap
  },
  {
    title: 'Agricultural Export Promotion Act',
    expectSector: 'Agribusiness', // agriculture-trade overlap
  },

  // ── Terse/unusual titles that stress the classifier (6) ──
  {
    title: 'SECURE Act',
    expectSector: 'Finance/Insurance/Real Estate', // retirement savings
  },
  {
    title: 'CARES Act',
    expectSector: 'Health', // COVID relief — health is dominant sector
  },
  {
    title: 'COMPETES Act',
    expectSector: 'Communications/Electronics', // science & tech competitiveness
  },
  {
    title: 'FAST Act',
    expectSector: 'Transportation', // surface transportation
  },
  {
    title: 'PFAS Action Act',
    expectSector: 'Energy/Natural Resources', // chemical contamination
  },
  {
    title: 'To prohibit the sale of personal health data',
    expectSector: 'Health',
  },
];

/** Bills that should return EMPTY (no sector match above threshold). */
const KNOWN_BAD = [
  // ── Ceremonial resolutions (4) ──
  'Resolution honoring National Cheese Day',
  'A resolution designating October as National Pumpkin Month',
  'Congratulating the Kansas City Chiefs on winning Super Bowl LVIII',
  'Resolution commemorating the 50th anniversary of the local library',

  // ── Sense-of-Congress resolutions mentioning real topics (5) ──
  'Expressing the sense of Congress regarding the importance of civic education',
  'A resolution recognizing the contributions of teachers to our Nation',
  'Expressing the sense of the Senate that the President should designate a day of unity',
  'Expressing the sense of the House that voting is a fundamental right of citizenship',
  'Expressing the sense of Congress regarding the sacrifices of military families',

  // ── Procedural bills (3) ──
  'Providing for consideration of the resolution and providing for consideration of motions to suspend the rules',
  'A concurrent resolution providing for an adjournment of the House and Senate',
  'A joint resolution relating to the disapproval of the Presidents exercise of authority',

  // ── Commemorative/naming bills (4) ──
  'To designate the facility of the United States Postal Service located at 123 Main Street as the John Smith Post Office',
  'To name the Department of Veterans Affairs outpatient clinic in Springfield after Sergeant Jane Doe',
  'A bill to mint commemorative coins in recognition of the centennial of the National Park Service',
  'To designate a mountain in the State of Colorado as Mount Valor',
];

/** Bills that touch multiple sectors (informational — not gated). */
const EDGE_CASES = [
  { title: 'Build Back Better Act', note: 'touches energy, health, labor, construction' },
  { title: 'American Rescue Plan Act', note: 'broad — health, labor, finance' },
  {
    title: 'Infrastructure Investment and Jobs Act',
    note: 'construction, transportation, energy, communications',
  },
  {
    title: 'Consolidated Appropriations Act, 2024',
    note: 'omnibus — touches everything',
  },
];

/** Known bill-lobbying pairs for HIGH_SIMILARITY_THRESHOLD calibration. */
const LOBBYING_PAIRS = {
  related: [
    {
      bill: 'National Defense Authorization Act for defense spending and military readiness',
      lobbying: 'Defense contracting, military procurement, weapons systems acquisition',
    },
    {
      bill: 'Medicare Prescription Drug Price Negotiation Act',
      lobbying: 'Pharmaceutical pricing, Medicare Part D, drug cost negotiations',
    },
    {
      bill: 'CHIPS and Science Act semiconductor manufacturing incentives',
      lobbying: 'Semiconductor industry subsidies, chip fabrication facility tax credits',
    },
    {
      bill: 'Clean Energy Innovation Act renewable energy tax credits',
      lobbying: 'Solar and wind energy tax incentives, clean energy investment credits',
    },
    {
      bill: 'FAA Reauthorization Act of 2024 aviation safety',
      lobbying:
        'Aviation safety regulations, air traffic control modernization, airline operations',
    },
  ],
  unrelated: [
    {
      bill: 'National Defense Authorization Act for defense spending and military readiness',
      lobbying: 'Organic food certification standards for small farms',
    },
    {
      bill: 'Medicare Prescription Drug Price Negotiation Act',
      lobbying: 'Commercial fishing vessel licensing and catch limits',
    },
    {
      bill: 'CHIPS and Science Act semiconductor manufacturing incentives',
      lobbying: 'Livestock grazing rights on federal land management',
    },
    {
      bill: 'Clean Energy Innovation Act renewable energy tax credits',
      lobbying: 'Professional boxing safety regulations and oversight',
    },
    {
      bill: 'FAA Reauthorization Act of 2024 aviation safety',
      lobbying: 'Dental insurance plan coverage requirements for orthodontics',
    },
  ],
};

// ── Main ───────────────────────────────────────────────────────────

function parseModelArg(): string {
  const modelFlag = process.argv.indexOf('--model');
  if (modelFlag !== -1 && process.argv[modelFlag + 1]) {
    return process.argv[modelFlag + 1]!;
  }
  return 'Xenova/all-MiniLM-L6-v2';
}

async function main() {
  const modelId = parseModelArg();
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  Embedding Threshold Calibration                ║`);
  console.log(`║  Model: ${modelId.padEnd(40)}║`);
  console.log(
    `║  Known-good: ${KNOWN_GOOD.length}, Known-bad: ${KNOWN_BAD.length}, Edge: ${EDGE_CASES.length}        ║`
  );
  console.log(`║  Min gap required: ${MIN_GAP}                          ║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  console.log(`Loading ${modelId}...`);
  const extractor = (await pipeline('feature-extraction', modelId, {
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
  let goodCorrect = 0;

  for (const bill of KNOWN_GOOD) {
    const emb = await embed(bill.title);
    const top = getTopSectors(emb);
    const topScore = top[0]!.score;
    goodScores.push(topScore);
    const match = top[0]!.sector === bill.expectSector;
    if (match) goodCorrect++;
    const icon = match ? '✓' : '✗';
    console.log(`\n  ${icon} "${bill.title}"`);
    console.log(`    Expected: ${bill.expectSector}`);
    console.log(
      `    Top 3: ${top
        .slice(0, 3)
        .map(s => `${s.sector} (${s.score.toFixed(4)})`)
        .join(', ')}`
    );
  }

  console.log(`\n  Sector accuracy: ${goodCorrect}/${KNOWN_GOOD.length}`);

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

  console.log('\n═══ EDGE CASES (multi-sector — informational) ═══');

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

  console.log('\n═══ SECTOR THRESHOLD ANALYSIS ═══');
  const minGood = Math.min(...goodScores);
  const maxBad = Math.max(...badScores);
  const gap = minGood - maxBad;

  console.log(`  Known-good bills:   ${KNOWN_GOOD.length}`);
  console.log(`  Known-bad bills:    ${KNOWN_BAD.length}`);
  console.log(`  Min known-good top: ${minGood.toFixed(4)}`);
  console.log(`  Max known-bad top:  ${maxBad.toFixed(4)}`);
  console.log(`  Gap:                ${gap.toFixed(4)}`);
  console.log(`  Required min gap:   ${MIN_GAP.toFixed(4)}`);

  let gatePass = true;

  if (gap < MIN_GAP) {
    console.log(`\n  ✗ GATE FAILED: gap ${gap.toFixed(4)} < required ${MIN_GAP}`);
    console.log(`  This model's similarity distribution does not cleanly separate`);
    console.log(`  real bills from ceremonial resolutions. Do NOT deploy.`);
    gatePass = false;
  } else if (minGood <= maxBad) {
    console.log(`\n  ✗ GATE FAILED: known-good and known-bad scores overlap`);
    gatePass = false;
  } else {
    const optimal = (minGood + maxBad) / 2;
    console.log(`\n  ✓ Gate passed — clean separation with ${gap.toFixed(4)} gap`);
    console.log(`  Recommended DEFAULT_THRESHOLD: ${optimal.toFixed(2)}`);
    console.log(`  Safe range: [${(maxBad + 0.005).toFixed(3)}, ${(minGood - 0.005).toFixed(3)}]`);
  }

  // ── Bill-lobbying threshold guidance ───────────────────────────

  console.log('\n═══ BILL-LOBBYING THRESHOLD CALIBRATION ═══');
  const relatedSims: number[] = [];
  const unrelatedSims: number[] = [];

  console.log('\n  Related pairs:');
  for (const pair of LOBBYING_PAIRS.related) {
    const billEmb = await embed(pair.bill);
    const lobbyEmb = await embed(pair.lobbying);
    const sim = cosineSim(billEmb, lobbyEmb);
    relatedSims.push(sim);
    console.log(
      `    ${sim.toFixed(4)} — "${pair.bill.substring(0, 50)}..." ↔ "${pair.lobbying.substring(0, 50)}..."`
    );
  }

  console.log('\n  Unrelated pairs:');
  for (const pair of LOBBYING_PAIRS.unrelated) {
    const billEmb = await embed(pair.bill);
    const lobbyEmb = await embed(pair.lobbying);
    const sim = cosineSim(billEmb, lobbyEmb);
    unrelatedSims.push(sim);
    console.log(
      `    ${sim.toFixed(4)} — "${pair.bill.substring(0, 50)}..." ↔ "${pair.lobbying.substring(0, 50)}..."`
    );
  }

  const minRelated = Math.min(...relatedSims);
  const maxUnrelated = Math.max(...unrelatedSims);
  const lobbyGap = minRelated - maxUnrelated;

  console.log(`\n  Min related similarity:   ${minRelated.toFixed(4)}`);
  console.log(`  Max unrelated similarity: ${maxUnrelated.toFixed(4)}`);
  console.log(`  Gap:                      ${lobbyGap.toFixed(4)}`);

  if (lobbyGap >= MIN_GAP) {
    const optimalLobby = (minRelated + maxUnrelated) / 2;
    console.log(`  ✓ Clean separation`);
    console.log(`  Recommended HIGH_SIMILARITY_THRESHOLD: ${optimalLobby.toFixed(2)}`);
  } else {
    console.log(`  ⚠ Thin or overlapping separation — manual review needed`);
    gatePass = false;
  }

  // ── Summary ────────────────────────────────────────────────────

  console.log('\n═══ SUMMARY ═══');
  console.log(`  Model:          ${modelId}`);
  console.log(
    `  Sector gate:    ${gap >= MIN_GAP && minGood > maxBad ? 'PASS' : 'FAIL'} (gap=${gap.toFixed(4)})`
  );
  console.log(
    `  Lobbying gate:  ${lobbyGap >= MIN_GAP ? 'PASS' : 'FAIL'} (gap=${lobbyGap.toFixed(4)})`
  );
  console.log(`  Sector accuracy: ${goodCorrect}/${KNOWN_GOOD.length}`);

  if (!gatePass) {
    console.log('\n  ✗ Overall: FAIL — do not deploy this model without further tuning');
    process.exit(1);
  } else {
    console.log('\n  ✓ Overall: PASS — model is safe to deploy with recommended thresholds');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
