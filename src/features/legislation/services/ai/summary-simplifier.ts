/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Summary Simplifier
 *
 * Rewrites an AI bill summary that reads above the grade-8 target. It rewrites
 * the summary itself (not the bill text), so the facts stay the same; only the
 * sentences and words get simpler. Used by both the JSON and streaming summary
 * routes, so every new summary goes through the same check.
 *
 * In a 15-bill trial against cached prod summaries, one pass brought 13 of 15
 * to grade 8 or below and two passes brought 14 of 15. A summary still above
 * the target after the last pass is returned with its real grade; callers
 * label it honestly rather than claim it was simplified.
 */

import logger from '@/lib/logging/simple-logger';
import { generateAIText } from '@/lib/ai/provider';
import { PLAIN_LANGUAGE_RULES, PLAIN_LANGUAGE_SYSTEM_PROMPT } from '@/lib/ai/plain-language';
import { ReadingLevelValidator } from './reading-level-validator';

export const TARGET_READING_GRADE = 8;
const MAX_REWRITE_PASSES = 2;

export interface SimplifiedSummary {
  text: string;
  gradeLevel: number;
  passes: number;
}

export function measureGradeLevel(text: string): number {
  return ReadingLevelValidator.analyzeReadingLevel(text, {
    targetGrade: TARGET_READING_GRADE,
    provideSuggestions: false,
  }).gradeLevel;
}

function buildRewritePrompt(summary: string, gradeLevel: number): string {
  return `This bill summary reads at grade ${gradeLevel}. Rewrite it so it reads at grade ${TARGET_READING_GRADE} or below.
Keep every fact, number, date, and name. Add nothing new. Use shorter sentences and shorter, everyday words.
Spell out what an acronym means once, then keep sentences short.

SUMMARY:
${summary}

${PLAIN_LANGUAGE_RULES}`;
}

/**
 * Bring a summary to the grade-8 target with up to two rewrite passes.
 * Never throws: on an AI failure it returns the best version so far.
 */
export async function simplifyToTargetGrade(
  summary: string,
  context: { billNumber: string }
): Promise<SimplifiedSummary> {
  let best: SimplifiedSummary = {
    text: summary,
    gradeLevel: measureGradeLevel(summary),
    passes: 0,
  };
  const system = `You summarize U.S. legislation for CIV.IQ. ${PLAIN_LANGUAGE_SYSTEM_PROMPT.replace(
    'Output valid JSON only.',
    'Output plain text only. Do not output JSON.'
  )}`;

  for (let pass = 1; pass <= MAX_REWRITE_PASSES; pass++) {
    if (best.gradeLevel <= TARGET_READING_GRADE) break;
    try {
      const rewritten = (
        await generateAIText(system, buildRewritePrompt(best.text, best.gradeLevel), {
          temperature: 0.2,
          maxTokens: 1000,
        })
      ).trim();
      if (rewritten === '') break;

      const gradeLevel = measureGradeLevel(rewritten);
      // A rewrite that reads harder than what we have is discarded.
      if (gradeLevel >= best.gradeLevel) break;
      best = { text: rewritten, gradeLevel, passes: pass };
    } catch (error) {
      logger.warn('Summary rewrite failed; keeping the best version so far', {
        billNumber: context.billNumber,
        pass,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      break;
    }
  }

  if (best.gradeLevel > TARGET_READING_GRADE) {
    logger.warn('Summary still above the reading-level target after rewrites', {
      billNumber: context.billNumber,
      gradeLevel: best.gradeLevel,
      passes: best.passes,
      operation: 'summary_simplifier',
    });
  }

  return best;
}
