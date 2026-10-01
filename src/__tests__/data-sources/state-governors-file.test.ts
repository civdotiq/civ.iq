/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getStateChiefExecutive } from '@/lib/data-sources/state-governors';
import { getAllStateCodes } from '@/lib/data/us-states';

describe('committed state-governors.json', () => {
  it('has a chief executive for every state, DC and territory', () => {
    const missing = getAllStateCodes().filter(code => !getStateChiefExecutive(code));
    expect(missing).toEqual([]);
  });

  it('carries a name, party, start date and source for each', () => {
    for (const code of getAllStateCodes()) {
      const exec = getStateChiefExecutive(code)!;
      expect(exec.name).toBeTruthy();
      expect(exec.party).toBeTruthy();
      expect(exec.inOfficeSince).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(exec.sourceUrl).toMatch(/^https:\/\/www\.(nga\.org|wikidata\.org)\//);
    }
  });

  it("calls DC's executive a mayor and everyone else a governor", () => {
    expect(getStateChiefExecutive('DC')?.title).toBe('Mayor');
    expect(getStateChiefExecutive('mi')?.title).toBe('Governor');
  });
});
