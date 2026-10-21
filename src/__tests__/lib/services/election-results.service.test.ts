/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import { HOUSE_RESULTS_2024 } from '@/data/election-results-house';
import { HOUSE_SEATS_PER_STATE } from '@/lib/districts/known-districts';
import { electionPartyLabel, getHouseResult2024 } from '@/lib/services/election-results.service';

// Expected values are from the House Clerk's "Statistics of the Presidential
// and Congressional Election of November 5, 2024".
describe('2024 House results', () => {
  it('has a result for every voting seat and DC', () => {
    const territories = ['PR', 'VI', 'GU', 'AS', 'MP'];
    const seats = Object.entries(HOUSE_SEATS_PER_STATE)
      .filter(([state]) => !territories.includes(state))
      .reduce((sum, [, n]) => sum + n, 0);
    expect(Object.keys(HOUSE_RESULTS_2024)).toHaveLength(seats);
  });

  it('has no at-large (-00) record for a state with more than one seat', () => {
    // A '-00' key in a multi-seat state means districts were summed together
    // (MT, RI and NJ did this when House results came from precinct files).
    const merged = Object.keys(HOUSE_RESULTS_2024).filter(key => {
      const [state, district] = key.split('-');
      return district === '00' && (HOUSE_SEATS_PER_STATE[state] ?? 0) > 1;
    });
    expect(merged).toEqual([]);
  });

  it.each([
    ['MT', '1', 'R', 'RYAN K. ZINKE', 168529],
    ['MT', '2', 'R', 'TROY DOWNING', 181832],
    ['RI', '1', 'D', 'GABE AMO', 139352],
    ['RI', '2', 'D', 'SETH MAGAZINER', 153439],
    // Seats the precinct data showed as Republican wins
    ['NJ', '11', 'D', 'MIKIE SHERRILL', 222583],
    ['IN', '1', 'D', 'FRANK J. MRVAN', 172467],
    ['VT', '0', 'D', 'BECCA BALINT', 218398],
  ])('%s-%s winner matches the Clerk', (state, district, winner, name, votes) => {
    const result = getHouseResult2024(state, district);
    if (!result.dataAvailable) throw new Error(`${state}-${district} unavailable`);
    expect(result.winner).toBe(winner);
    expect(result.candidates?.[0]).toMatchObject({ name, votes });
  });

  it('counts a fusion candidate toward their major party', () => {
    // Coester ran on the Republican and Libertarian lines.
    const vt = getHouseResult2024('VT', '0');
    if (!vt.dataAvailable) throw new Error('VT unavailable');
    expect(vt.candidates?.[1]).toMatchObject({ name: 'MARK COESTER', partyCode: 'R' });
    expect(vt.rep).toBe(104451);
  });

  it('measures a same-party race by candidate, not by party', () => {
    const ca12 = getHouseResult2024('CA', '12');
    if (!ca12.dataAvailable) throw new Error('CA-12 unavailable');
    expect(ca12.candidates?.map(c => c.partyCode)).toEqual(['D', 'D']);
    expect(ca12.margin).toBeCloseTo(30.86, 2);
  });

  it('reports a not-on-ballot unopposed race with no vote total', () => {
    const fl20 = getHouseResult2024('FL', '20');
    if (!fl20.dataAvailable) throw new Error('FL-20 unavailable');
    expect(fl20.candidates).toHaveLength(1);
    expect(fl20.total).toBe(0);
  });

  it('never labels a non-D, non-R winner as Republican', () => {
    expect(electionPartyLabel('OTHER')).toBe('Other');
    expect(electionPartyLabel('L')).toBe('Libertarian');
  });
});
