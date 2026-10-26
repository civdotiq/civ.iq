import { describeTenure, tenureFact, type TenureTerm } from '../tenure';

/** Terms as congress-legislators lists them, oldest first; the helper takes newest first. */
const newestFirst = (...terms: Array<[string, string, 'House' | 'Senate']>): TenureTerm[] =>
  terms.map(([startYear, endYear, chamber]) => ({ startYear, endYear, chamber })).reverse();

const house = (from: number, to: number): Array<[string, string, 'House']> =>
  Array.from({ length: (to - from) / 2 }, (_, i) => [
    String(from + 2 * i),
    String(from + 2 * i + 2),
    'House',
  ]);

describe('describeTenure', () => {
  it('shows both chambers for a member who moved from the House to the Senate', () => {
    const slotkin = newestFirst(...house(2019, 2025), ['2025', '2031', 'Senate']);
    expect(describeTenure(slotkin, { chamber: 'Senate', role: 'Senator' })).toBe(
      'Senator since 2025 · in Congress since 2019 (House 2019–2025) · current term 2025–2031'
    );
  });

  it('gives no mixed term total, since House and Senate terms differ in length', () => {
    const durbin = newestFirst(
      ...house(1983, 1997),
      ['1997', '2003', 'Senate'],
      ['2003', '2009', 'Senate'],
      ['2009', '2015', 'Senate'],
      ['2015', '2021', 'Senate'],
      ['2021', '2027', 'Senate']
    );
    const text = describeTenure(durbin, { chamber: 'Senate', role: 'Senator' });
    expect(text).toBe(
      'Senator since 1997 · in Congress since 1983 (House 1983–1997) · current term 2021–2027'
    );
    expect(text).not.toMatch(/terms total/);
  });

  it('names the chamber and counts terms for a House-only member', () => {
    expect(
      describeTenure(newestFirst(...house(2015, 2027)), {
        chamber: 'House',
        role: 'Representative',
      })
    ).toBe('Representative since 2015 · current term 2025–2027 · 6 terms total');
  });

  it('says first term for a new member', () => {
    expect(describeTenure(newestFirst(['2025', '2031', 'Senate']), { chamber: 'Senate' })).toBe(
      'Senator since 2025 (first term)'
    );
  });

  it('lists earlier service separately after a gap, without "in Congress since"', () => {
    const mfume = newestFirst(
      ...house(1987, 1997),
      ['2020', '2021', 'House'],
      ...house(2021, 2027)
    );
    mfume[mfume.length - 5]!.endYear = '1996'; // resigned February 1996
    expect(describeTenure(mfume, { chamber: 'House' })).toBe(
      'Representative since 2020 · earlier service: House 1987–1996 · current term 2025–2027'
    );
  });

  it('uses Delegate and Resident Commissioner titles', () => {
    expect(
      describeTenure(newestFirst(...house(2021, 2027)), { chamber: 'House', role: 'Delegate' })
    ).toBe('Delegate since 2021 · current term 2025–2027 · 3 terms total');
  });

  it('returns null without terms', () => {
    expect(describeTenure([], { chamber: 'House' })).toBeNull();
  });
});

describe('tenureFact', () => {
  it('shows the current chamber and the earlier one for a House-to-Senate member', () => {
    const slotkin = newestFirst(...house(2019, 2025), ['2025', '2031', 'Senate']);
    expect(tenureFact(slotkin, { chamber: 'Senate' })).toEqual({
      label: 'In the Senate',
      value: 'Since 2025',
      caption: 'In Congress since 2019 (House 2019–2025)',
    });
  });

  it('counts terms only within one chamber', () => {
    expect(tenureFact(newestFirst(...house(2015, 2027)), { chamber: 'House' })).toEqual({
      label: 'In the House',
      value: 'Since 2015',
      caption: '6 terms served',
    });
  });

  it('lists earlier service after a gap instead of "in Congress since"', () => {
    const mfume = newestFirst(
      ...house(1987, 1997),
      ['2020', '2021', 'House'],
      ...house(2021, 2027)
    );
    mfume[mfume.length - 5]!.endYear = '1996';
    expect(tenureFact(mfume, { chamber: 'House' })).toEqual({
      label: 'In the House',
      value: 'Since 2020',
      caption: 'Earlier service: House 1987–1996',
    });
  });

  it('says first term for a new member', () => {
    expect(tenureFact(newestFirst(['2025', '2031', 'Senate']), { chamber: 'Senate' })).toEqual({
      label: 'In the Senate',
      value: 'Since 2025',
      caption: 'First term',
    });
  });

  it('never gives a term count that mixes chambers', () => {
    const durbin = newestFirst(
      ...house(1983, 1997),
      ['1997', '2003', 'Senate'],
      ['2021', '2027', 'Senate']
    );
    expect(tenureFact(durbin, { chamber: 'Senate' })?.caption).not.toMatch(/terms? served/);
  });
});
