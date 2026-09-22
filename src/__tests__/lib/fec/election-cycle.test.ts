/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getCurrentElectionCycle, getRecentElectionCycles } from '@/lib/fec/election-cycle';

describe('election-cycle', () => {
  it('names the cycle for the even year it ends in', () => {
    expect(getCurrentElectionCycle(new Date(2026, 8, 22))).toBe(2026);
    expect(getCurrentElectionCycle(new Date(2027, 0, 1))).toBe(2028);
  });

  it('lists the current cycle first, then prior cycles newest-first', () => {
    expect(getRecentElectionCycles(4, new Date(2026, 8, 22))).toEqual([2026, 2024, 2022, 2020]);
    expect(getRecentElectionCycles(3, new Date(2027, 5, 1))).toEqual([2028, 2026, 2024]);
    expect(getRecentElectionCycles(1, new Date(2026, 0, 1))).toEqual([2026]);
  });
});
