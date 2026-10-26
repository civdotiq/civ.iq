import { partyAbbreviation, partyAdjective } from '@/lib/party-label';

describe('partyAdjective', () => {
  it.each([
    ['Democrat', 'Democratic'],
    ['Democratic', 'Democratic'],
    ['D', 'Democratic'],
    ['dem', 'Democratic'],
    ['Democratic-Farmer-Labor', 'Democratic'],
    ['Republican', 'Republican'],
    ['R', 'Republican'],
    ['Independent', 'Independent'],
    ['I', 'Independent'],
  ])('labels %s as %s', (party, expected) => {
    expect(partyAdjective(party)).toBe(expected);
  });

  it('never labels anything "Democrat"', () => {
    for (const party of ['Democrat', 'D', 'Democratic', 'DEMOCRAT']) {
      expect(partyAdjective(party)).not.toBe('Democrat');
    }
  });

  it('shows other parties as recorded', () => {
    expect(partyAdjective('Nonpartisan')).toBe('Nonpartisan');
    expect(partyAdjective('Libertarian')).toBe('Libertarian');
    expect(partyAdjective(undefined)).toBe('');
  });
});

describe('partyAbbreviation', () => {
  it.each([
    ['Democrat', 'D'],
    ['Democratic', 'D'],
    ['Republican', 'R'],
    ['Independent', 'I'],
    ['Libertarian', 'Libertarian'],
  ])('abbreviates %s as %s', (party, expected) => {
    expect(partyAbbreviation(party)).toBe(expected);
  });
});
