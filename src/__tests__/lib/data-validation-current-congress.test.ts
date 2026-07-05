/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * validateCurrentCongress derives the expected Congress from today's date
 * (2026-07 audit item 3 — replaced validate119thCongress, which would have
 * rejected valid 120th-Congress data in Jan 2027). Time is pinned so the
 * suite is deterministic across Congress boundaries.
 */

import { dataValidator } from '@/lib/data-validation';

describe('dataValidator.validateCurrentCongress', () => {
  beforeAll(() => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    jest.setSystemTime(new Date('2026-06-15T12:00:00Z')); // 119th Congress
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('accepts data for the sitting Congress', () => {
    const result = dataValidator.validateCurrentCongress({ congress: 119, name: 'Rep Test' });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts the string form of the sitting Congress', () => {
    const result = dataValidator.validateCurrentCongress({ congress: '119' });
    expect(result.isValid).toBe(true);
  });

  it('warns (not errors) on the previous Congress near a transition', () => {
    const result = dataValidator.validateCurrentCongress({ congress: 118 });
    expect(result.isValid).toBe(true);
    expect(result.warnings.some(w => w.includes('previous Congress'))).toBe(true);
  });

  it('rejects data from an older Congress', () => {
    const result = dataValidator.validateCurrentCongress({ congress: 116 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('must be 119'))).toBe(true);
  });

  it('would accept 120th-Congress data once the 120th convenes', () => {
    jest.setSystemTime(new Date('2027-02-01T12:00:00Z')); // 120th Congress
    const accepted = dataValidator.validateCurrentCongress({ congress: 120 });
    expect(accepted.isValid).toBe(true);
    const previous = dataValidator.validateCurrentCongress({ congress: 119 });
    expect(previous.isValid).toBe(true);
    expect(previous.warnings.some(w => w.includes('previous Congress'))).toBe(true);
    jest.setSystemTime(new Date('2026-06-15T12:00:00Z'));
  });

  it('flags years predating the sitting Congress as a staleness warning', () => {
    const result = dataValidator.validateCurrentCongress({
      congress: 119,
      note: 'filed 2023-05-01',
    });
    expect(result.warnings.some(w => w.includes('2023/2024'))).toBe(true);
  });
});
