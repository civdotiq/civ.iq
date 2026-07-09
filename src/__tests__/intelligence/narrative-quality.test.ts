/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Narrative Quality Validation Tests (DETERMINISTIC)
 *
 * Validates the reading-level and causation VALIDATORS against static fixture
 * strings. Fast, offline, no model calls — safe for `validate:all`.
 *
 * The complementary LIVE eval, which calls the real model (BillSummarizer →
 * Gemini) and asserts real generated prose meets the guarantees, lives in
 * `scripts/llm-eval.ts` and runs out-of-band via `npm run test:llm-eval`.
 * It is a node-side tsx script, not a jest test, because a live network call
 * needs Node's fetch/streams, which the jest jsdom environment does not provide.
 *
 * Quality standards checked here:
 * - Reading level ≤ 8th grade (Flesch-Kincaid)
 * - No causation claims (uses "pattern", "correlation", not "caused", "influenced")
 * - Length within bounds
 */

import { ReadingLevelValidator } from '@/features/legislation/services/ai/reading-level-validator';

// ── Causation word detection ────────────────────────────────────────

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

const ALLOWED_CORRELATION_WORDS = [
  'pattern',
  'correlation',
  'association',
  'coincides',
  'aligns with',
  'corresponds',
  'overlaps',
];

function containsCausationClaims(text: string): string[] {
  const lower = text.toLowerCase();
  return CAUSATION_WORDS.filter(word => lower.includes(word));
}

// ── Sample narratives (mimicking statistical fallbacks from analyzers) ──

const GOOD_NARRATIVES = {
  financeJurisdiction:
    '35% of campaign funds come from the finance sector. ' +
    'This representative sits on the Financial Services Committee. ' +
    'The overlap between donor sectors and committee topics is 0.72, ' +
    'above the peer average of 0.45.',

  voteFinance:
    'Voting records show a 0.68 correlation between campaign donor sectors ' +
    'and favorable votes on sector bills. Defense sector shows the strongest ' +
    'pattern at 0.82 across 45 roll calls.',

  enforcement:
    'EPA issued 12 actions against energy companies in Texas over the past 24 months. ' +
    'Total penalties reached $4.2 million. The trend is increasing, with 8 actions ' +
    'in the second half of the period compared to 4 in the first.',

  influenceChain:
    'Three lobbying-to-vote patterns detected. The American Petroleum Institute ' +
    'spent $2.1 million on lobbying, contributed $45,000 to this representative, ' +
    'who then voted in favor of 4 of 5 energy bills in committee.',

  stockCommittee:
    'This representative made 8 stock trades in sectors under their committee jurisdiction. ' +
    'The overlap rate is 0.62, compared to an expected rate of 0.15 based on ' +
    'jurisdiction coverage of 2 out of 13 industry sectors.',
};

const BAD_NARRATIVES = {
  causation:
    'Campaign donations from the defense sector caused this representative ' +
    'to vote in favor of military spending bills. The contributions influenced ' +
    'their voting behavior, resulting in a pattern of favorable votes.',

  highReadingLevel:
    'The juxtaposition of pecuniary contributions from pharmaceutical conglomerates ' +
    'vis-à-vis the legislative predilections of the aforementioned representative ' +
    'necessitates a comprehensive examination of the interrelationship between ' +
    'campaign finance disbursements and subsequent Congressional appropriations.',

  tooLong: 'x '.repeat(600),
};

// ── Tests ────────────────────────────────────────────────────────────

describe('Narrative Quality: Reading Level', () => {
  it.each(Object.entries(GOOD_NARRATIVES))(
    '%s narrative meets 8th grade reading level',
    (_name, narrative) => {
      const analysis = ReadingLevelValidator.analyzeReadingLevel(narrative, {
        targetGrade: 8,
      });
      expect(analysis.passesTarget).toBe(true);
    }
  );

  it('rejects overly complex narrative', () => {
    const analysis = ReadingLevelValidator.analyzeReadingLevel(BAD_NARRATIVES.highReadingLevel, {
      targetGrade: 8,
    });
    expect(analysis.gradeLevel).toBeGreaterThan(8);
  });
});

describe('Narrative Quality: No Causation Claims', () => {
  it.each(Object.entries(GOOD_NARRATIVES))(
    '%s narrative avoids causation language',
    (_name, narrative) => {
      const found = containsCausationClaims(narrative);
      expect(found).toEqual([]);
    }
  );

  it('detects causation words in bad narrative', () => {
    const found = containsCausationClaims(BAD_NARRATIVES.causation);
    expect(found.length).toBeGreaterThan(0);
    expect(found).toContain('caused');
    expect(found).toContain('influenced');
    expect(found).toContain('resulting in');
  });

  it('allows correlation language', () => {
    const narrative =
      'A correlation pattern exists between donor sectors and voting records. ' +
      'This association aligns with committee jurisdiction overlap.';
    const found = containsCausationClaims(narrative);
    expect(found).toEqual([]);

    // Verify correlation words are present
    const lower = narrative.toLowerCase();
    const correlationWordsFound = ALLOWED_CORRELATION_WORDS.filter(w => lower.includes(w));
    expect(correlationWordsFound.length).toBeGreaterThan(0);
  });
});

describe('Narrative Quality: Length Bounds', () => {
  it.each(Object.entries(GOOD_NARRATIVES))(
    '%s narrative is under 500 characters',
    (_name, narrative) => {
      expect(narrative.length).toBeLessThanOrEqual(500);
    }
  );

  it.each(Object.entries(GOOD_NARRATIVES))('%s narrative is not empty', (_name, narrative) => {
    expect(narrative.trim().length).toBeGreaterThan(0);
  });
});

describe('Narrative Quality: Disclaimer Standards', () => {
  const REQUIRED_DISCLAIMER_PHRASES = [
    'does not indicate',
    'not imply',
    'factual',
    'public data',
    'public record',
    'correlation',
  ];

  it('sample disclaimer contains required concepts', () => {
    const sampleDisclaimer =
      'This analysis shows factual patterns in public data. ' +
      'Campaign contributions are legal and do not indicate wrongdoing. ' +
      'Correlation does not imply causation.';

    const lower = sampleDisclaimer.toLowerCase();
    const found = REQUIRED_DISCLAIMER_PHRASES.filter(phrase => lower.includes(phrase));
    // At least 3 of the required phrases should be present
    expect(found.length).toBeGreaterThanOrEqual(3);
  });
});

describe('ReadingLevelValidator integration', () => {
  it('meetsTarget returns true for simple text', () => {
    expect(
      ReadingLevelValidator.meetsTarget(
        'This bill helps schools get more money. It passed the House.',
        8
      )
    ).toBe(true);
  });

  it('meetsTarget returns false for complex jargon', () => {
    expect(
      ReadingLevelValidator.meetsTarget(
        'The juxtaposition of appropriations notwithstanding the aforementioned promulgation ' +
          'necessitates adjudication of the constitutional ramifications.',
        8
      )
    ).toBe(false);
  });

  it('analyzeReadingLevel returns structured analysis', () => {
    const analysis = ReadingLevelValidator.analyzeReadingLevel(
      'This representative voted yes on 10 bills about health care. Three of those bills ' +
        'got money from health companies. The average donation was $5,000 per company.',
      { targetGrade: 8 }
    );

    expect(analysis).toHaveProperty('gradeLevel');
    expect(analysis).toHaveProperty('fleschKincaidScore');
    expect(analysis).toHaveProperty('avgWordsPerSentence');
    expect(analysis).toHaveProperty('passesTarget');
    expect(typeof analysis.gradeLevel).toBe('number');
  });
});
