/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import { HOUSE_RESULTS_2024 } from '@/data/election-results-house';
import { HOUSE_SEATS_PER_STATE } from '@/lib/districts/known-districts';
import { STATEWIDE_RESULTS_2024 } from '@/data/election-results-statewide';
import {
  electionPartyLabel,
  getAllStatewideResults2024,
  getHouseResult2024,
  getStatewideResult2024,
} from '@/lib/services/election-results.service';

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

// Same Clerk statistics: President by party line, Senate by candidate.
describe('2024 statewide results', () => {
  it('has a presidential result for every state and DC', () => {
    expect(getAllStatewideResults2024('US_PRESIDENT')).toHaveLength(51);
  });

  it('has every 2024 Senate race, including the CA and NE specials', () => {
    const senate = getAllStatewideResults2024('US_SENATE');
    expect(senate).toHaveLength(35);
    expect(senate.map(r => r.districtId)).toEqual(
      expect.arrayContaining(['CA-SENATE-SPECIAL', 'NE-SENATE-SPECIAL'])
    );
    expect(STATEWIDE_RESULTS_2024['DC-SENATE']).toBeUndefined(); // DC elects shadow senators only
  });

  it.each([
    // States the precinct data showed as "Other" wins
    ['ME', 'US_PRESIDENT', 'D', 'HARRIS, KAMALA D.', 435652], // Clerk prints 435,351
    ['VT', 'US_PRESIDENT', 'D', 'HARRIS, KAMALA D.', 235791],
    ['UT', 'US_PRESIDENT', 'R', 'TRUMP, DONALD J.', 883818],
    ['NE', 'US_PRESIDENT', 'R', 'TRUMP, DONALD J.', 564816],
    ['NJ', 'US_SENATE', 'D', 'ANDY KIM', 2161491],
    ['UT', 'US_SENATE', 'R', 'JOHN CURTIS', 914700],
    // States the precinct data did not cover
    ['AZ', 'US_SENATE', 'D', 'RUBEN GALLEGO', 1676335],
    ['MS', 'US_PRESIDENT', 'R', 'TRUMP, DONALD J.', 747744],
  ] as const)('%s %s winner matches the Clerk', (state, office, winner, name, votes) => {
    const result = getStatewideResult2024(state, office);
    if (!result.dataAvailable) throw new Error(`${state} ${office} unavailable`);
    expect(result.winner).toBe(winner);
    expect(result.candidates?.[0]).toMatchObject({ name, votes });
  });

  it('reports an independent winner as Other, with the candidate named', () => {
    const vt = getStatewideResult2024('VT', 'US_SENATE');
    if (!vt.dataAvailable) throw new Error('VT Senate unavailable');
    expect(vt.winner).toBe('OTHER');
    expect(vt.candidates?.[0]).toMatchObject({ name: 'BERNIE SANDERS', votes: 229429 });
  });

  it('keeps the two Nebraska Senate races apart', () => {
    expect(STATEWIDE_RESULTS_2024['NE-SENATE'].candidates?.[0]).toMatchObject({
      name: 'DEB FISCHER',
      votes: 499124,
    });
    expect(STATEWIDE_RESULTS_2024['NE-SENATE-SPECIAL'].candidates?.[0]).toMatchObject({
      name: 'PETE RICKETTS',
      votes: 585103,
    });
  });

  it('counts a fusion candidate once, toward their major party', () => {
    // Murphy: Democratic 953,646 + Working Families 47,049.
    const ct = getStatewideResult2024('CT', 'US_SENATE');
    if (!ct.dataAvailable) throw new Error('CT Senate unavailable');
    expect(ct.candidates?.[0]).toMatchObject({ partyCode: 'D', votes: 1000695 });
  });
});

// Expected values are from each state's certified results; see
// CERTIFIED_GOVERNOR_2024 in scripts/process-statewide-results-2024.ts.
describe('2024 governor results', () => {
  it('lists only states that held a 2024 governor race', () => {
    const states = getAllStatewideResults2024('GOVERNOR').map(r => r.districtId.slice(0, 2));
    // NE (college boards of governors), MA (Governor's Council) and MI (university
    // boards) had no governor race; the precinct pipeline matched them anyway.
    expect(states).toEqual(['DE', 'MO', 'MT', 'NC', 'NH', 'UT', 'VT', 'WV']);
  });

  it.each([
    ['UT', 'R', 'SPENCER J COX DEIDRE M HENDERSON', 781114], // certified 781,431
    ['VT', 'R', 'PHIL SCOTT', 266439],
    ['NH', 'R', 'KELLY AYOTTE', 436122],
    ['DE', 'D', 'MATT MEYER', 279585],
  ] as const)('%s winner matches the certified result', (state, winner, name, votes) => {
    const result = getStatewideResult2024(state, 'GOVERNOR');
    if (!result.dataAvailable) throw new Error(`${state} governor unavailable`);
    expect(result.winner).toBe(winner);
    expect(result.candidates?.[0]).toMatchObject({ name, votes });
  });

  it('does not count summary rows as candidates', () => {
    const names = ['UT', 'VT'].flatMap(
      state => STATEWIDE_RESULTS_2024[`${state}-GOVERNOR`].candidates?.map(c => c.name) ?? []
    );
    expect(names).not.toContain('BALLOTS CAST');
    expect(names).not.toContain('TOTAL VOTES CAST');
  });

  it('reports a governor race it could not verify as unavailable', () => {
    // IN's and ND's precinct files undercount the certified totals.
    for (const state of ['IN', 'ND', 'WA']) {
      expect(getStatewideResult2024(state, 'GOVERNOR')).toMatchObject({
        dataAvailable: false,
        reason: 'state_not_in_dataset',
      });
    }
  });
});
