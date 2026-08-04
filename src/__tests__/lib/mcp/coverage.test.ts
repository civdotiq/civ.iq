/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { coverageFor, coverageOf } from '@/lib/mcp/tools/coverage';

describe('coverageFor', () => {
  it('reports complete when the fetch came back short of its cap', () => {
    expect(coverageFor(37, 50, 'grants')).toEqual({ complete: true });
  });

  it('reports incomplete the moment a fetch fills its cap', () => {
    const coverage = coverageFor(50, 50, 'grants');

    expect(coverage.complete).toBe(false);
    expect(coverage.note).toContain('50 grants');
    expect(coverage.note).toContain('lower bounds');
  });

  it('treats an exactly-full page as saturated', () => {
    // A source holding exactly `cap` rows is reported incomplete. Claiming a
    // total that is short is the more damaging of the two possible errors.
    expect(coverageFor(100, 100, 'regulated facilities').complete).toBe(false);
  });

  it('carries no note when complete, so nothing is disclaimed without cause', () => {
    expect(coverageFor(0, 200, 'hospitals').note).toBeUndefined();
  });

  it('names the subject so an agent reading the note knows what is missing', () => {
    expect(coverageFor(200, 200, 'nursing homes').note).toContain('nursing homes');
  });
});

describe('coverageOf', () => {
  it('reports the real population, not just that more rows exist', () => {
    const coverage = coverageOf(100, 3158, 'facilities');

    expect(coverage.complete).toBe(false);
    expect(coverage.examined).toBe(100);
    expect(coverage.population).toBe(3158);
    expect(coverage.note).toContain('100 of 3158 facilities');
  });

  it('reports complete when the fetch retrieved every row upstream has', () => {
    // A full page that happens to be the whole population is complete here,
    // where the cap-only check has to assume saturation and disclaim it.
    expect(coverageOf(148, 148, 'hospitals')).toEqual({
      complete: true,
      examined: 148,
      population: 148,
    });
  });

  it('carries no note when complete, so nothing is disclaimed without cause', () => {
    expect(coverageOf(50, 50, 'grants').note).toBeUndefined();
  });

  it('disclaims a short fetch even when it never reached the cap', () => {
    // Rows can fall short of the population without saturating a cap — a
    // district filter drops rows, for instance. The cap-only check would call
    // this complete; against a real population it plainly is not.
    expect(coverageOf(37, 50, 'grants').complete).toBe(false);
  });

  it('falls back to a lower-bound warning when upstream reports no count', () => {
    const coverage = coverageOf(50, null, 'institutions');

    expect(coverage.complete).toBe(false);
    expect(coverage.population).toBeUndefined();
    expect(coverage.note).toContain('lower bounds');
  });

  it('never claims completeness from a null count, which means unknown', () => {
    // The failure this guards: treating "no count reported" as zero and
    // concluding the fetch saw everything.
    expect(coverageOf(0, null, 'grants').complete).toBe(false);
  });
});
