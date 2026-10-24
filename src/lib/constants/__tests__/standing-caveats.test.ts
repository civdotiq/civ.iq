/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import { ReadingLevelValidator } from '@/features/legislation/services/ai/reading-level-validator';
import {
  MONEY_AND_VOTES_CAVEAT,
  PATTERN_CAVEAT,
  ROLL_CALL_CAVEAT,
} from '@/lib/constants/standing-caveats';

const CAVEATS = { ROLL_CALL_CAVEAT, MONEY_AND_VOTES_CAVEAT, PATTERN_CAVEAT };

describe.each(Object.entries(CAVEATS))('%s', (_name, text) => {
  it('reads at grade 8 or below', () => {
    expect(ReadingLevelValidator.analyzeReadingLevel(text).gradeLevel).toBeLessThanOrEqual(8);
  });

  it('makes no causal claim', () => {
    expect(text).not.toMatch(/\b(caused?|influenced?|resulted in|because of)\b/i);
  });
});
