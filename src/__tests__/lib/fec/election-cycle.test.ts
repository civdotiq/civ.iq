/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  findNewestCycleWithData,
  getCurrentElectionCycle,
  getRecentElectionCycles,
} from '@/lib/fec/election-cycle';

describe('election-cycle', () => {
  it('names the cycle for the even year it ends in', () => {
    expect(getCurrentElectionCycle(new Date(2026, 8, 22))).toBe(2026);
    expect(getCurrentElectionCycle(new Date(2027, 0, 1))).toBe(2028);
    expect(getCurrentElectionCycle(new Date(2025, 5, 1))).toBe(2026);
  });

  it('lists the current cycle first, then prior cycles newest-first', () => {
    expect(getRecentElectionCycles(4, new Date(2026, 8, 22))).toEqual([2026, 2024, 2022, 2020]);
    expect(getRecentElectionCycles(3, new Date(2027, 5, 1))).toEqual([2028, 2026, 2024]);
    expect(getRecentElectionCycles(1, new Date(2026, 0, 1))).toEqual([2026]);
  });

  describe('findNewestCycleWithData', () => {
    it('uses the current cycle when it has data, with one fetch', async () => {
      const fetch = jest.fn(async (cycle: number) => ({ cycle }));
      await expect(findNewestCycleWithData([2026, 2024], fetch)).resolves.toEqual({
        data: { cycle: 2026 },
        cycle: 2026,
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('falls back only when the current cycle is empty, and reports the cycle used', async () => {
      const fetch = async (cycle: number) => (cycle === 2024 ? { raised: 1 } : null);
      await expect(findNewestCycleWithData([2026, 2024], fetch)).resolves.toEqual({
        data: { raised: 1 },
        cycle: 2024,
      });
    });

    it('throws when the current cycle errors instead of serving an older cycle', async () => {
      const fetch = jest.fn(async (cycle: number) => {
        if (cycle === 2026) throw new Error('FEC API error: 429');
        return { raised: 1 };
      });
      await expect(findNewestCycleWithData([2026, 2024], fetch)).rejects.toThrow('429');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('returns null when no cycle has data', async () => {
      await expect(findNewestCycleWithData([2026, 2024], async () => null)).resolves.toBeNull();
    });
  });
});
