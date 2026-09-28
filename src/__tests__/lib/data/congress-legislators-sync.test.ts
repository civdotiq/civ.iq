/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  applyOverlay,
  previousCongressStart,
  selectDeparted,
  type UpstreamLegislator,
} from '@/lib/data/congress-legislators-sync';

function legislator(
  bioguide: string,
  lastEnd: string,
  extra: Partial<UpstreamLegislator> = {}
): UpstreamLegislator {
  return {
    id: { bioguide },
    name: { first: 'A', last: bioguide },
    terms: [{ type: 'sen', start: '2019-01-03', end: lastEnd }],
    ...extra,
  };
}

describe('previousCongressStart', () => {
  it('returns the start of the Congress before the current one', () => {
    expect(previousCongressStart(new Date('2026-09-23T00:00:00Z'))).toBe('2023-01-03');
    expect(previousCongressStart(new Date('2025-01-03T00:00:00Z'))).toBe('2023-01-03');
    expect(previousCongressStart(new Date('2027-01-03T00:00:00Z'))).toBe('2025-01-03');
  });

  it('treats January 1-2 of an odd year as the previous Congress', () => {
    expect(previousCongressStart(new Date('2027-01-02T12:00:00Z'))).toBe('2023-01-03');
  });
});

describe('selectDeparted', () => {
  it('keeps historical members whose last term ended on/after the cutoff and are not current', () => {
    const historical = [
      legislator('OLD0001', '2021-01-03'),
      legislator('LEFT001', '2026-03-23'),
      legislator('EDGE001', '2023-01-03'),
      legislator('BACK001', '2024-01-03'), // left, then returned: current wins
    ];
    const current = [legislator('BACK001', '2027-01-03')];

    const departed = selectDeparted(historical, current, '2023-01-03').map(l => l.id.bioguide);
    expect(departed).toEqual(['LEFT001', 'EDGE001']);
  });
});

describe('applyOverlay', () => {
  const role = {
    title: 'House Republican Conference Secretary',
    chamber: 'house',
    start: '2025-01-03',
  };

  it('appends overlay roles to the matching member', () => {
    const { legislators, applied, unmatched } = applyOverlay(
      [legislator('H001093', '2027-01-03')],
      [{ bioguide: 'H001093', leadership_roles: [role] }]
    );
    expect(legislators[0]?.leadership_roles).toEqual([role]);
    expect(applied).toBe(1);
    expect(unmatched).toEqual([]);
  });

  it('skips a role upstream already lists (same title and start)', () => {
    const { legislators, applied } = applyOverlay(
      [legislator('H001093', '2027-01-03', { leadership_roles: [role] })],
      [{ bioguide: 'H001093', leadership_roles: [role] }]
    );
    expect(legislators[0]?.leadership_roles).toHaveLength(1);
    expect(applied).toBe(0);
  });

  it('reports overlay entries for members not in the roster', () => {
    const { unmatched } = applyOverlay(
      [legislator('A000001', '2027-01-03')],
      [{ bioguide: 'GONE001', leadership_roles: [role] }]
    );
    expect(unmatched).toEqual(['GONE001']);
  });
});
