import { MEMBER_NAMES } from '@/data/member-names';
import { commonName, goesByName } from '@/features/representatives/utils/common-name';

describe('MEMBER_NAMES', () => {
  const entries = Object.entries(MEMBER_NAMES);

  it.each(entries)('%s cites the member’s own official site', (bioguideId, entry) => {
    expect(bioguideId).toMatch(/^[A-Z]\d{6}$/);
    expect(entry.name.trim()).toBe(entry.name);
    expect(entry.source).toMatch(/^https:\/\/(www\.)?[a-z]+\.(house|senate)\.gov\//);
    if (entry.via) expect(entry.via).toMatch(/^https:\/\/web\.archive\.org\/web\/\d{8}\//);
    expect(entry.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('wins over the roster name for that member only', () => {
    const durbin = {
      first: 'Richard',
      middle: 'J.',
      last: 'Durbin',
      official_full: 'Richard J. Durbin',
    };
    expect(goesByName(durbin, 'D000563')).toBe('Dick Durbin');
    expect(goesByName(durbin)).toBe('Richard Durbin');
    expect(goesByName(durbin, 'X000000')).toBe('Richard Durbin');
  });

  it('applies to records named by commonName', () => {
    expect(
      commonName({
        bioguideId: 'B001323',
        name: 'Nicholas Begich',
        fullName: { first: 'Nicholas', last: 'Begich', official: 'Nicholas J. Begich III' },
      })
    ).toBe('Nick Begich');
  });
});
