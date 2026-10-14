/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { pickBillTitles } from '../bill.service';

describe('pickBillTitles', () => {
  // Abridged from Congress.gov /v3/bill/119/hr/1/titles (2026-10-14). The Senate
  // stripped the whole-bill short title, so only a "portions" title was enacted.
  const hr1 = [
    {
      titleType: 'Short Titles as Enacted for portions of this bill',
      title: 'FEHB Protection Act of 2025',
    },
    {
      titleType: 'Official Title as Enacted',
      title: 'An act to provide for reconciliation pursuant to title II of H. Con. Res. 14.',
    },
    { titleType: 'Popular Titles', title: 'One Big Beautiful Bill Act' },
    {
      titleType: 'Short Title(s) from PCS (Placed on Senate Calendar) bill text',
      billTextVersionCode: 'PCS',
      title: 'One Big Beautiful Bill Act',
    },
    {
      titleType: 'Short Title(s) as Reported to House',
      billTextVersionCode: 'RH',
      title: 'One Big Beautiful Bill Act',
    },
  ];

  it('reads the popular title and skips short titles for portions of the bill', () => {
    expect(pickBillTitles(hr1)).toEqual({
      popularTitle: 'One Big Beautiful Bill Act',
      shortTitle: 'One Big Beautiful Bill Act',
    });
  });

  it('prefers the short title from the most advanced bill stage', () => {
    expect(
      pickBillTitles([
        {
          titleType: 'Short Title(s) as Introduced',
          billTextVersionCode: 'IH',
          title: 'Continuing Appropriations Act, 2026',
        },
        {
          titleType: 'Short Titles from ENR (Enrolled) bill text',
          billTextVersionCode: 'ENR',
          title: 'Continuing Appropriations and Extensions Act, 2026',
        },
        {
          titleType: 'Short Title(s) as Passed House',
          billTextVersionCode: 'EH',
          title: 'Continuing Appropriations Act, 2026',
        },
      ])
    ).toEqual({ shortTitle: 'Continuing Appropriations and Extensions Act, 2026' });
  });

  it('returns nothing when only official titles exist', () => {
    expect(
      pickBillTitles([
        {
          titleType: 'Official Title as Introduced',
          billTextVersionCode: 'IH',
          title: 'To amend title 38, United States Code, and for other purposes.',
        },
      ])
    ).toEqual({});
  });
});
