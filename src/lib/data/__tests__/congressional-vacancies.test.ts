/**
 * Vacancy lookups must only report a seat open between its vacancy date and
 * the successor's swearing-in — an announced resignation leaves the member in
 * office. Fixture data keeps the test stable as the weekly sync updates the
 * real file.
 */

jest.mock('../vacancies.json', () => ({
  congress: 119,
  lastUpdated: '2026-09-28',
  source: 'fixture',
  vacancies: [
    {
      state: 'OK',
      chamber: 'Senate',
      district: null,
      senateClass: '2',
      vacantSince: null,
      reason: 'resignation',
      reasonDetail: 'Appointee resigning late 2026.',
      previousMember: { name: 'Alan S. Armstrong', party: 'Republican' },
    },
    {
      state: 'FL',
      chamber: 'House',
      district: '20',
      senateClass: null,
      vacantSince: '2026-04-21',
      reason: 'resignation',
      previousMember: { name: 'Sheila Cherfilus-McCormick', party: 'Democrat' },
    },
    {
      state: 'NJ',
      chamber: 'House',
      district: '11',
      senateClass: null,
      vacantSince: '2025-11-20',
      reason: 'resignation',
      previousMember: { name: 'Mikie Sherrill', party: 'Democrat' },
      successor: {
        name: 'Analilia Mejia',
        party: 'Democrat',
        installedDate: '2026-04-20',
        method: 'elected',
      },
    },
    {
      state: 'TX',
      chamber: 'House',
      district: '99',
      senateClass: null,
      vacantSince: '2999-01-01',
      reason: 'resignation',
      previousMember: { name: 'Future Resigner', party: 'Republican' },
    },
  ],
}));

import {
  getAllVacancies,
  getMemberStatus,
  getSenateVacancy,
  getVacancyInfo,
  isDistrictVacant,
} from '../congressional-vacancies';

describe('congressional vacancy lookups', () => {
  it('does not treat an announced, undated resignation as an open seat', () => {
    expect(getSenateVacancy('OK', '2')).toBeUndefined();
    expect(
      getMemberStatus({ name: 'Alan S. Armstrong', state: 'OK', chamber: 'Senate' }).status
    ).toBe('pending_resignation');
  });

  it('does not treat a future-dated resignation as an open seat', () => {
    expect(isDistrictVacant('TX', '99')).toBe(false);
  });

  it('reports a dated vacancy with no successor as open', () => {
    expect(getVacancyInfo('FL', '20')?.previousMember.name).toBe('Sheila Cherfilus-McCormick');
    expect(isDistrictVacant('FL', '20')).toBe(true);
  });

  it('reports a seat as filled once the successor is sworn in', () => {
    expect(getVacancyInfo('NJ', '11')).toBeUndefined();
  });

  it('lists only open seats', () => {
    expect(getAllVacancies().map(v => `${v.state}-${v.district}`)).toEqual(['FL-20']);
  });
});
