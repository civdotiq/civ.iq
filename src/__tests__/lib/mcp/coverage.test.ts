/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { coverageFor } from '@/lib/mcp/tools/coverage';

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
