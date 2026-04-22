/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { hasIntelligenceData } from './has-intelligence-data';
import { MIN_VOTES_PER_SECTOR } from '@/lib/intelligence/statistics/civic-stats';

describe('hasIntelligenceData', () => {
  it('returns true when summary has not resolved yet (optimistic)', () => {
    expect(hasIntelligenceData({ committeeCount: 0, votesParticipated: undefined })).toBe(true);
  });

  it('returns true when committee count > 0 regardless of vote count', () => {
    expect(hasIntelligenceData({ committeeCount: 1, votesParticipated: 0 })).toBe(true);
    expect(hasIntelligenceData({ committeeCount: 3, votesParticipated: 5 })).toBe(true);
  });

  it('returns true when vote count meets MIN_VOTES_PER_SECTOR regardless of committees', () => {
    expect(
      hasIntelligenceData({
        committeeCount: 0,
        votesParticipated: MIN_VOTES_PER_SECTOR,
      })
    ).toBe(true);
  });

  it('returns false when a rep has 0 committees and fewer votes than the floor', () => {
    expect(
      hasIntelligenceData({
        committeeCount: 0,
        votesParticipated: MIN_VOTES_PER_SECTOR - 1,
      })
    ).toBe(false);
  });

  it('returns false when a freshman has 0 committees and 0 votes', () => {
    expect(hasIntelligenceData({ committeeCount: 0, votesParticipated: 0 })).toBe(false);
  });
});
