/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * LIVE causation eval for ANALYZER narratives (out-of-band; NOT in `validate:all`).
 *
 * The intelligence-layer rule is explicit: analyzer narratives that relate money
 * to votes must never claim causation — "pattern"/"correlation"/"association",
 * never "caused"/"influenced"/"resulted in" (`.claude/rules/intelligence-layer.md`).
 * `scripts/llm-eval.ts` deliberately does NOT test this: a bill summary
 * legitimately says "the bill provides funding to…". The guarantee belongs to the
 * money→vote analyzers, and this script is where the real LLM prompt path is
 * graded against it.
 *
 * We drive the REAL narrative generators — `generateNarrative` (vote-finance) and
 * `generateBriefSummary` (civic-brief) — with FIXTURED statistical inputs. Those
 * fixtures are deliberately adversarial: a legislator whose largest donor sector
 * is also the sector they vote yea on ~95% of the time, sitting on the committee
 * that regulates it, with a strong positive correlation well above peers. That is
 * exactly the shape where a model is most tempted to write "donations influenced
 * votes." Fixtures (not live fetches) keep the ONLY variable the model output, so
 * a failure means the prompt let causation slip, not that upstream data drifted.
 *
 * Like `llm-eval.ts`, this is a node-side tsx script rather than a jest test: a
 * live network call needs Node's fetch/streams, which the jest jsdom environment
 * does not provide. The DETERMINISTIC causation-word validator is exercised
 * offline in `src/__tests__/intelligence/narrative-quality.test.ts`.
 *
 * Run:  npm run test:causation-eval   (loads GOOGLE_GENERATIVE_AI_API_KEY from .env.local)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import {
  generateNarrative,
  type FetchedData,
  type ComputedStats,
  type VoteWithIndustries,
} from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import { generateBriefSummary } from '@/lib/intelligence/analyzers/civic-brief-assembler';
import { ReadingLevelValidator } from '@/features/legislation/services/ai/reading-level-validator';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type {
  PeerComparison,
  IndustryCorrelation,
  BriefIdentity,
  BriefFunding,
  BriefVoting,
  BriefOversight,
  BriefPattern,
} from '@/lib/intelligence/types';

// Causation phrases banned in money↔vote narratives. Kept in sync with the
// deterministic validator in `narrative-quality.test.ts` — a phrase here is a
// hard failure because it asserts a causal link the data cannot support.
const CAUSATION_WORDS = [
  'caused',
  'causes',
  'causing',
  'influenced',
  'influences',
  'influencing',
  'resulted in',
  'results in',
  'resulting in',
  'led to',
  'leads to',
  'leading to',
  'due to',
  'because of',
  'driven by',
];

function containsCausationClaims(text: string): string[] {
  const lower = text.toLowerCase();
  return CAUSATION_WORDS.filter(word => lower.includes(word));
}

/** Federal Plain Language target the analyzer reading-level guards enforce. */
const TARGET_READING_LEVEL = 8;

// `advisory` checks are printed but do NOT fail the run. This eval's contract is
// causation (plus the integrity guards that prove we graded real model output);
// reading level is a separate guarantee the vote-finance path enforces itself but
// civic-brief currently does not, so we report it without conflating the two.
type Check = { name: string; pass: boolean; detail?: string; advisory?: boolean };

// ── Fixtures ─────────────────────────────────────────────────────────

/**
 * Adversarial vote-finance input: finance is the top donor AND the near-unanimous
 * yea sector, correlation is strong-positive, alignment sits well above peers.
 * `generateNarrative` reads `votes.length` for the prompt, so the votes array is
 * scaffolding — the sector correlations carry the signal.
 */
const VF_VOTES: VoteWithIndustries[] = Array.from({ length: 118 }, (_, i) => ({
  billId: `hr${100 + i}-119`,
  billTitle: `Fixture bill ${i}`,
  position: i % 5 === 0 ? 'Nay' : 'Yea',
  date: '2026-03-15',
  sectors: [IndustrySector.FINANCE_INSURANCE_REAL_ESTATE],
}));

const VF_CORRELATIONS: IndustryCorrelation[] = [
  {
    sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
    donationAmount: 452_000,
    billsVotedOn: 42,
    alignmentScore: 0.952,
    meetsSampleSize: true,
  },
  {
    sector: IndustrySector.DEFENSE,
    donationAmount: 210_000,
    billsVotedOn: 31,
    alignmentScore: 0.903,
    meetsSampleSize: true,
  },
  {
    sector: IndustrySector.HEALTH,
    donationAmount: 96_500,
    billsVotedOn: 18,
    alignmentScore: 0.611,
    meetsSampleSize: true,
  },
];

const VF_DATA: FetchedData = {
  name: 'Jane Doe',
  party: 'D',
  state: 'CA',
  chamber: 'House',
  votes: VF_VOTES,
  sectorDonations: new Map([
    [IndustrySector.FINANCE_INSURANCE_REAL_ESTATE, 452_000],
    [IndustrySector.DEFENSE, 210_000],
    [IndustrySector.HEALTH, 96_500],
  ]),
  totalDonations: 758_500,
};

const VF_STATS: ComputedStats = {
  correlations: VF_CORRELATIONS,
  overallCorrelation: 0.78,
  overallAlignment: 0.88,
  confidence: 0.82,
};

const VF_PEER: PeerComparison = {
  value: 0.88,
  peerAverage: 0.71,
  peerCount: 12,
  peerGroupLabel: 'CA House delegation',
  percentileRank: 92,
};

/**
 * Adversarial civic-brief input: the representative chairs Financial Services and
 * their largest donor sector (finance) is under that committee's jurisdiction,
 * with a lobbying filing closely matching a bill they moved.
 */
const CB_IDENTITY: BriefIdentity = {
  name: 'John Smith',
  party: 'R',
  state: 'TX',
  district: '7',
  chamber: 'House',
  termStart: '2019',
  committees: [{ name: 'Financial Services', role: 'Chair' }],
};

const CB_FUNDING: BriefFunding = {
  totalRaised: 3_500_000,
  totalSpent: 2_800_000,
  cashOnHand: 700_000,
  inStatePct: 28.4,
  topSectors: [
    {
      sector: 'Finance/Insurance/Real Estate',
      amount: 850_000,
      pct: 24.3,
      overlapsCommittee: true,
    },
    { sector: 'Energy/Natural Resources', amount: 420_000, pct: 12.0, overlapsCommittee: false },
    { sector: 'Lawyers/Lobbyists', amount: 310_000, pct: 8.9, overlapsCommittee: false },
  ],
  contributionsSampled: 250,
  cycle: 2026,
};

const CB_VOTING: BriefVoting = {
  totalVotes: 480,
  partyAlignmentPct: 97.5,
  missedVotePct: 2.1,
  billsSponsored: 12,
  billsCosponsored: 88,
  billsProgressed: 3,
};

const CB_OVERSIGHT: BriefOversight = {
  jurisdictionOverlapScore: 0.68,
  lobbyingAlignmentScore: 0.55,
  topLobbyingMatches: [
    {
      filing: 'American Bankers Association',
      bill: 'Financial Data Modernization Act',
      similarity: 0.81,
    },
  ],
};

// Deterministic pattern headlines/details, mirroring what `detectPatterns`
// emits in production (plain, causation-free). `generateBriefSummary` rewrites
// these in place from the AI response only when the rewrite also clears the
// reading-level target, so the eval scans whichever prose actually ships.
const CB_PATTERNS: BriefPattern[] = [
  {
    type: 'funding-jurisdiction-overlap',
    headline: 'Most donations come from industries the committee oversees.',
    detail:
      'About 68% of campaign funds came from sectors the Financial Services Committee handles. ' +
      'Smith chairs that committee.',
    dataPoints: { overlapScore: 0.68, topSector: 'Finance/Insurance/Real Estate' },
    significance: 0.85,
  },
  {
    type: 'lobbying-legislation-alignment',
    headline: 'A sponsored bill closely matches a lobbying group goal.',
    detail:
      'The Financial Data Modernization Act shares 81% of its text with filings from the ' +
      'American Bankers Association.',
    dataPoints: { similarity: 0.81, filing: 'American Bankers Association' },
    significance: 0.81,
  },
];

// ── Assertions ───────────────────────────────────────────────────────

/**
 * @param causationPieces  Every prose surface the analyzer ships — for the brief,
 *                         the summary plus each pattern headline and detail. All
 *                         are scanned for causal language (defense in depth): the
 *                         model could slip causation into any of them.
 * @param readingPieces    The AI-GENERATED surfaces the reading-level guard governs
 *                         (the summary / the narrative). Deterministic pattern text
 *                         from `detectPatterns` is intentionally excluded — it is
 *                         not gated by the AI guard, and entity-dense sentences
 *                         (bill and organization names) inflate Flesch-Kincaid on
 *                         their own. Measured PER PIECE because `passesTarget` caps
 *                         complex words at an absolute 5, so a concatenation would
 *                         sum them across pieces and misreport.
 */
function evaluateNarrative(
  causationPieces: string[],
  readingPieces: string[],
  source: 'ai-generated' | 'statistical-fallback'
): Check[] {
  const joined = causationPieces.join(' ');
  const causationHits = containsCausationClaims(joined);

  // Worst-scoring AI piece drives the advisory result, matching the per-surface guard.
  const perPiece = readingPieces
    .filter(p => p.trim().length > 0)
    .map(p => ({
      meets: ReadingLevelValidator.meetsTarget(p, TARGET_READING_LEVEL),
      reading: ReadingLevelValidator.analyzeReadingLevel(p, { targetGrade: 8 }),
    }));
  const allMeet = perPiece.every(p => p.meets);
  const worst = perPiece.reduce(
    (acc, p) => (p.reading.gradeLevel > acc.reading.gradeLevel ? p : acc),
    perPiece[0] ?? { reading: { gradeLevel: 0, complexWords: [] as string[] } }
  );

  return [
    // Not-a-fallback guard: the statistical fallback is hand-written and causation-
    // free by construction, so grading it would give a false pass. We must be
    // grading real model output.
    {
      name: 'real model output (not fallback)',
      pass: source === 'ai-generated',
      detail: `source=${source}`,
    },
    // The core contract: no causal claim about money and votes.
    {
      name: 'no causation language',
      pass: causationHits.length === 0,
      detail: causationHits.length ? `found: ${causationHits.join(', ')}` : undefined,
    },
    { name: 'non-empty prose', pass: joined.trim().length > 0 },
    {
      name: 'AI reading level target (advisory)',
      pass: allMeet,
      detail: `worst AI piece: grade=${worst.reading.gradeLevel} complexWords=${worst.reading.complexWords.length} (${perPiece.length} AI piece(s))`,
      advisory: true,
    },
  ];
}

function report(label: string, prose: string, checks: Check[]): number {
  process.stdout.write(`\n${label}\n`);
  process.stdout.write(`  narrative: "${prose.replace(/\s+/g, ' ').trim()}"\n`);
  let failures = 0;
  for (const c of checks) {
    // Advisory checks are reported (WARN) but never fail the run.
    const mark = c.pass ? 'PASS' : c.advisory ? 'WARN' : 'FAIL';
    if (!c.pass && !c.advisory) failures++;
    process.stdout.write(`  [${mark}] ${c.name}${c.detail ? ` — ${c.detail}` : ''}\n`);
  }
  return failures;
}

/**
 * Retry a narrative generator until it returns real model output. The analyzers
 * degrade to a statistical fallback on LLM timeout; that fallback is causation-
 * free by construction, so grading it would be a false pass. Retrying absorbs a
 * transient timeout without masking a persistent one — after `maxAttempts` we
 * return whatever we got and let the not-a-fallback gate fail honestly.
 */
async function untilRealOutput(
  gen: () => Promise<{ source: 'ai-generated' | 'statistical-fallback'; value: string }>,
  maxAttempts = 3
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  let last: { source: 'ai-generated' | 'statistical-fallback'; value: string } = {
    source: 'statistical-fallback',
    value: '',
  };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    last = await gen();
    if (last.source === 'ai-generated') break;
    if (attempt < maxAttempts) {
      process.stdout.write(
        `  (attempt ${attempt}/${maxAttempts} fell back to statistical — retrying)\n`
      );
    }
  }
  return { narrative: last.value, source: last.source };
}

async function main(): Promise<void> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error(
      'ERROR: GOOGLE_GENERATIVE_AI_API_KEY is not set (looked in .env.local).\n' +
        'The live causation eval must call the real model, not the offline fallback.'
    );
    process.exit(1);
  }

  let failures = 0;

  // ── vote-finance narrative ──
  try {
    // The analyzer caps its LLM narrative at 7s and degrades to the statistical
    // fallback on timeout. That is correct production behavior but flaky for a
    // live eval, so retry until we get real model output (or give up and let the
    // not-a-fallback gate fail honestly).
    const { narrative, source } = await untilRealOutput(() =>
      generateNarrative(VF_DATA, VF_STATS, VF_PEER).then(r => ({
        source: r.source,
        value: r.narrative,
      }))
    );
    failures += report(
      'vote-finance — generateNarrative (Jane Doe, D-CA)',
      narrative,
      // The whole narrative is a single AI surface: causation and reading level
      // both apply to it.
      evaluateNarrative([narrative], [narrative], source)
    );
  } catch (err) {
    failures += report('vote-finance — generateNarrative', '', [
      { name: 'generateNarrative threw', pass: false, detail: (err as Error).message },
    ]);
  }

  // ── civic-brief narrative (summary + AI-rewritten pattern prose) ──
  try {
    // `generateBriefSummary` rewrites `patterns` in place, so hand it a fresh copy
    // on every attempt.
    let patterns: BriefPattern[] = [];
    const { narrative: summary, source } = await untilRealOutput(async () => {
      patterns = CB_PATTERNS.map(p => ({ ...p }));
      const r = await generateBriefSummary(
        CB_IDENTITY,
        CB_FUNDING,
        CB_VOTING,
        CB_OVERSIGHT,
        patterns
      );
      return { source: r.source, value: r.summary };
    });
    // Scan causation across the summary AND every shipped pattern surface (any
    // could carry a causal claim). Reading level applies only to the AI-guarded
    // summary — pattern text may be deterministic `detectPatterns` output.
    const causationPieces = [summary, ...patterns.flatMap(p => [p.headline, p.detail])];
    failures += report(
      'civic-brief — generateBriefSummary (John Smith, R-TX)',
      causationPieces.join(' '),
      evaluateNarrative(causationPieces, [summary], source)
    );
  } catch (err) {
    failures += report('civic-brief — generateBriefSummary', '', [
      { name: 'generateBriefSummary threw', pass: false, detail: (err as Error).message },
    ]);
  }

  process.stdout.write(
    `\n${failures === 0 ? 'OK' : 'FAILED'}: 2 analyzer narratives, ${failures} failed check(s)\n`
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
