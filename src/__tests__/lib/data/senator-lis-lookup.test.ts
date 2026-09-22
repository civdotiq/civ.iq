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
});
