/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getSenatorBioguideLookup } from '@/lib/data/legislator-mappings';

describe('getSenatorBioguideLookup (data/legislators-current.yaml)', () => {
  it('maps senators appointed in 2026 from LIS to bioguide IDs', async () => {
    const lookup = await getSenatorBioguideLookup();
    // Regression: S440 (Alan Armstrong, OK) was missing, so Senate roll calls
    // stored the raw LIS ID and the vote page linked /representative/S440.
    expect(lookup.byLis.get('S440')).toBe('A000383');
    expect(lookup.byLis.get('S441')).toBe('G000608');
  });

  it('maps every LIS ID to a bioguide-shaped ID', async () => {
    const lookup = await getSenatorBioguideLookup();
    expect(lookup.byLis.size).toBeGreaterThanOrEqual(100);
    for (const bioguideId of lookup.byLis.values()) {
      expect(bioguideId).toMatch(/^[A-Z]\d{6}$/);
    }
  });

  it('keeps senators who left this or the previous Congress resolvable (legislators-departed.yaml)', async () => {
    const lookup = await getSenatorBioguideLookup();
    // Senate roll-call XML carries only the LIS id; these senators voted in
    // the 119th Congress and have since left.
    expect(lookup.byLis.get('S419')).toBe('M001190'); // Mullin, OK (left 2026-03)
    expect(lookup.byLis.get('S293')).toBe('G000359'); // Graham, SC (left 2026-07)
    expect(lookup.byLis.get('S421')).toBe('V000137'); // Vance, OH (left 2025-01)
    expect(lookup.byLis.get('S350')).toBe('R000595'); // Rubio, FL (left 2025-01)
  });

  it('uses the name+state fallback for sitting senators only', async () => {
    const lookup = await getSenatorBioguideLookup();
    // Lindsey Graham has left; his "graham_sc" key must not be available to
    // capture another South Carolina senator named Graham.
    expect(lookup.byNameState.get('graham_sc')).not.toBe('G000359');
    expect(lookup.byNameState.get('mullin_ok')).toBeUndefined();
  });
});
