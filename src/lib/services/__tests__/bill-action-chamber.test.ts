import { actionChamber } from '../bill.service';

describe('actionChamber', () => {
  it('reads the chamber from sourceSystem', () => {
    expect(
      actionChamber({
        actionDate: '2026-09-15',
        text: 'Referred to the House Committee on the Judiciary.',
        actionCode: 'H11100',
        sourceSystem: { code: 2, name: 'House floor actions' },
      })
    ).toBe('House');
    expect(
      actionChamber({
        actionDate: '2026-09-15',
        text: 'Read twice.',
        sourceSystem: { name: 'Senate' },
      })
    ).toBe('Senate');
  });

  it('falls back to chamber-prefixed action codes', () => {
    expect(actionChamber({ actionDate: '2026-09-15', text: 'x', actionCode: 'Intro-H' })).toBe(
      'House'
    );
    expect(actionChamber({ actionDate: '2026-09-15', text: 'x', actionCode: 'S32000' })).toBe(
      'Senate'
    );
  });

  it('returns undefined instead of guessing Senate for chamber-neutral actions', () => {
    expect(
      actionChamber({
        actionDate: '2026-09-15',
        text: 'Introduced in House',
        actionCode: '1000',
        sourceSystem: { code: 9, name: 'Library of Congress' },
      })
    ).toBeUndefined();
    expect(actionChamber(undefined)).toBeUndefined();
  });
});
