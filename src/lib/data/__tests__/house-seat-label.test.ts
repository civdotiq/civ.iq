import { houseSeatLabel } from '../us-states';

describe('houseSeatLabel', () => {
  it('names whole-state and territory seats At-Large, never District 0', () => {
    for (const d of ['0', '00', 'AL', 'at-large']) expect(houseSeatLabel(d)).toBe('At-Large');
  });

  it('numbers every other seat without padding', () => {
    expect(houseSeatLabel('7')).toBe('District 7');
    expect(houseSeatLabel('07')).toBe('District 7');
    expect(houseSeatLabel('12')).toBe('District 12');
  });
});
