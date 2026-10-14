/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { billTypeChamber, mapCongressStatus } from '../bill.service';

describe('mapCongressStatus', () => {
  // Latest-action texts from Congress.gov, 119th Congress.
  it('reads a bare House "Agreed to" as House passage, not Senate (H.Res. 1)', () => {
    expect(
      mapCongressStatus(
        'Motion to reconsider laid on the table Agreed to without objection.',
        'House'
      )
    ).toBe('passed_house');
    expect(
      mapCongressStatus(
        'On motion to suspend the rules and pass the bill, as amended Agreed to by the Yeas and Nays: (2/3 required): 402 - 15 (Roll no. 250).',
        'House'
      )
    ).toBe('passed_house');
  });

  it('reads a Senate "agreed to" as Senate passage (S.Res. 1)', () => {
    expect(
      mapCongressStatus(
        'Submitted in the Senate, considered, and agreed to without amendment by Unanimous Consent. (consideration: CR S5-6; text: CR S6)',
        'Senate'
      )
    ).toBe('passed_senate');
  });

  it('trusts a chamber named in the text over the chamber passed in', () => {
    expect(
      mapCongressStatus('Passed Senate without amendment by Unanimous Consent.', 'House')
    ).toBe('passed_senate');
    expect(mapCongressStatus('Passed/agreed to in House: On passage Passed', 'Senate')).toBe(
      'passed_house'
    );
  });

  it('keeps failures and enactments regardless of chamber', () => {
    expect(mapCongressStatus('On agreeing to the resolution Not Agreed to', 'House')).toBe(
      'failed'
    );
    expect(mapCongressStatus('Became Public Law No: 119-21.', 'House')).toBe('enacted');
  });
});

describe('billTypeChamber', () => {
  it('maps bill and resolution types to their chamber', () => {
    expect(billTypeChamber('hres')).toBe('House');
    expect(billTypeChamber('HR')).toBe('House');
    expect(billTypeChamber('hconres')).toBe('House');
    expect(billTypeChamber('sjres')).toBe('Senate');
    expect(billTypeChamber('S')).toBe('Senate');
    expect(billTypeChamber('')).toBeUndefined();
  });
});
