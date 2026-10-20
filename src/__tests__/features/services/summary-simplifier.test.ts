/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Tests for simplifyToTargetGrade: up to two rewrite passes on the summary
 * text, keeping the easiest-reading version and never throwing.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/ai/provider', () => ({
  generateAIText: jest.fn(),
}));

import { generateAIText } from '@/lib/ai/provider';
import {
  measureGradeLevel,
  simplifyToTargetGrade,
} from '@/features/legislation/services/ai/summary-simplifier';

const mockGenerateAIText = generateAIText as jest.Mock;
const CONTEXT = { billNumber: '1234' };

const SIMPLE = 'This bill helps schools. It gives money to fix old buildings.';
const COMPLEX =
  'This comprehensive legislation establishes multifaceted administrative infrastructure ' +
  'requirements notwithstanding considerable organizational implementation complications.';
// Easier than COMPLEX but still above grade 8.
const MEDIUM =
  'This legislation establishes administrative requirements for organizations ' +
  'implementing regulatory coordination across participating jurisdictions.';

beforeEach(() => jest.clearAllMocks());

describe('simplifyToTargetGrade', () => {
  it('leaves a summary at or under grade 8 alone', async () => {
    const result = await simplifyToTargetGrade(SIMPLE, CONTEXT);

    expect(result).toEqual({ text: SIMPLE, gradeLevel: measureGradeLevel(SIMPLE), passes: 0 });
    expect(mockGenerateAIText).not.toHaveBeenCalled();
  });

  it('stops after the first rewrite that reaches grade 8', async () => {
    mockGenerateAIText.mockResolvedValueOnce(SIMPLE);

    const result = await simplifyToTargetGrade(COMPLEX, CONTEXT);

    expect(result.text).toBe(SIMPLE);
    expect(result.passes).toBe(1);
    expect(result.gradeLevel).toBeLessThanOrEqual(8);
    expect(mockGenerateAIText).toHaveBeenCalledTimes(1);
  });

  it('makes at most two passes and reports the real grade if still above 8', async () => {
    expect(measureGradeLevel(MEDIUM)).toBeGreaterThan(8);
    expect(measureGradeLevel(MEDIUM)).toBeLessThan(measureGradeLevel(COMPLEX));
    mockGenerateAIText.mockResolvedValueOnce(MEDIUM).mockResolvedValueOnce(MEDIUM + ' ');

    const result = await simplifyToTargetGrade(COMPLEX, CONTEXT);

    expect(result.text).toBe(MEDIUM);
    expect(result.gradeLevel).toBe(measureGradeLevel(MEDIUM));
    expect(mockGenerateAIText).toHaveBeenCalledTimes(2);
  });

  it('discards a rewrite that reads harder than the original', async () => {
    mockGenerateAIText.mockResolvedValueOnce(COMPLEX);

    const result = await simplifyToTargetGrade(MEDIUM, CONTEXT);

    expect(result).toEqual({ text: MEDIUM, gradeLevel: measureGradeLevel(MEDIUM), passes: 0 });
  });

  it('returns the best version so far when the AI call fails', async () => {
    mockGenerateAIText.mockRejectedValueOnce(new Error('quota exceeded'));

    const result = await simplifyToTargetGrade(COMPLEX, CONTEXT);

    expect(result.text).toBe(COMPLEX);
    expect(result.passes).toBe(0);
  });
});
