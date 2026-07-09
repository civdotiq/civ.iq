/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * LIVE LLM output eval (out-of-band; NOT in `validate:all`).
 *
 * Generates REAL output from the actual prompt path (BillSummarizer → Gemini)
 * and asserts it meets the guarantee the bill-summary surface actually makes:
 * Flesch-Kincaid ≤ 8, non-empty prose, constrained IndustrySector vocabulary,
 * and a not-a-fallback guard so we never grade the offline canned summary.
 *
 * This is a node-side tsx script, not a jest test, on purpose: a live network
 * call needs Node's fetch/streams, which the jest jsdom environment does not
 * provide. The DETERMINISTIC validator tests remain in
 * `src/__tests__/intelligence/narrative-quality.test.ts`.
 *
 * Run:  npm run test:llm-eval   (loads GOOGLE_GENERATIVE_AI_API_KEY from .env.local)
 *
 * NOTE on causation: the "no causation" rule (intelligence-layer.md) guards the
 * money→vote ANALYZER narratives, not bill summaries (a summary legitimately
 * says "the bill provides funding to…"). A live causation eval belongs on the
 * analyzer narratives (civic-brief, vote-finance) and needs fixtured analyzer
 * INPUTS — that is the documented next step, not covered here.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import {
  BillSummarizer,
  type BillMetadata,
} from '@/features/legislation/services/ai/bill-summarizer';
import { ReadingLevelValidator } from '@/features/legislation/services/ai/reading-level-validator';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';

// Representative INPUTS (real enacted laws + their genuine stated purpose).
// These feed the model; they are not user-facing civic data.
const BILL_FIXTURES: Array<{ text: string; meta: BillMetadata }> = [
  {
    meta: {
      number: 'HR 3684',
      title: 'Infrastructure Investment and Jobs Act',
      congress: 117,
      chamber: 'house',
      policyArea: 'Transportation and Public Works',
    },
    text:
      'To authorize funds for Federal-aid highways, highway safety programs, and transit ' +
      'programs, and for other purposes. The Act provides funding to repair and rebuild roads ' +
      'and bridges, improve public transit and rail, expand access to clean drinking water, ' +
      'deliver high-speed internet, and modernize the electric grid.',
  },
  {
    meta: {
      number: 'HR 1319',
      title: 'American Rescue Plan Act of 2021',
      congress: 117,
      chamber: 'house',
      policyArea: 'Health',
    },
    text:
      'To provide for reconciliation pursuant to title II of S. Con. Res. 5. The Act provides ' +
      'funding for the public health response to COVID-19, direct payments to individuals, ' +
      'expanded unemployment benefits, aid to state and local governments, and support for ' +
      'schools and small businesses.',
  },
];

const validIndustries = new Set<string>(Object.values(IndustrySector));

type Check = { name: string; pass: boolean; detail?: string };

function evaluateSummary(
  summary: Awaited<ReturnType<typeof BillSummarizer.summarizeBill>>
): Check[] {
  const readingAnalysis = ReadingLevelValidator.analyzeReadingLevel(summary.summary, {
    targetGrade: 8,
  });
  const badSectors = summary.affectedIndustries.filter(s => !validIndustries.has(s));

  return [
    // Not-a-fallback guard: the AI path sets source 'ai-generated' with
    // confidence ≥ 0.8; the rule-based fallbacks use ≤ 0.6. If this fails, the
    // model call errored and we'd otherwise be grading canned text.
    {
      name: 'real model output (not fallback)',
      pass: summary.source === 'ai-generated' && summary.confidence >= 0.8,
      detail: `source=${summary.source} confidence=${summary.confidence}`,
    },
    // Core contract: 8th-grade reading level on the prose the reader sees.
    {
      name: 'reading level ≤ 8',
      pass: readingAnalysis.passesTarget,
      detail: `grade=${readingAnalysis.gradeLevel} fk=${readingAnalysis.fleschKincaidScore}`,
    },
    { name: 'summary non-empty', pass: summary.summary.trim().length > 0 },
    { name: 'whatItDoes non-empty', pass: summary.whatItDoes.trim().length > 0 },
    { name: 'whyItMatters non-empty', pass: summary.whyItMatters.trim().length > 0 },
    { name: 'has key points', pass: summary.keyPoints.length > 0 },
    // Structural: the constrained-vocabulary instruction held (catches prompt
    // drift that lets the model invent categories the FEC taxonomy lacks).
    {
      name: 'industries are valid IndustrySector',
      pass: badSectors.length === 0,
      detail: badSectors.length ? `invalid: ${badSectors.join(', ')}` : undefined,
    },
  ];
}

async function main(): Promise<void> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error(
      'ERROR: GOOGLE_GENERATIVE_AI_API_KEY is not set (looked in .env.local).\n' +
        'The live eval must call the real model, not the offline fallback.'
    );
    process.exit(1);
  }

  let failures = 0;

  for (const { text, meta } of BILL_FIXTURES) {
    process.stdout.write(`\n${meta.number} — ${meta.title}\n`);
    let checks: Check[];
    try {
      const summary = await BillSummarizer.summarizeBill(text, meta, { useCache: false });
      checks = evaluateSummary(summary);
      process.stdout.write(`  summary: "${summary.summary}"\n`);
    } catch (err) {
      checks = [{ name: 'summarizeBill threw', pass: false, detail: (err as Error).message }];
    }

    for (const c of checks) {
      const mark = c.pass ? 'PASS' : 'FAIL';
      if (!c.pass) failures++;
      process.stdout.write(`  [${mark}] ${c.name}${c.detail ? ` — ${c.detail}` : ''}\n`);
    }
  }

  process.stdout.write(
    `\n${failures === 0 ? 'OK' : 'FAILED'}: ${BILL_FIXTURES.length} bills, ${failures} failed check(s)\n`
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
