import {
  ABOUT_META_DESCRIPTION,
  META_DESCRIPTION_MAX,
  memberProfileMetaDescription,
  recordCardMetaDescription,
  stateLegislatorMetaDescription,
} from '@/lib/seo/meta-descriptions';

describe('ABOUT_META_DESCRIPTION', () => {
  it('fits and keeps the main fact', () => {
    expect(ABOUT_META_DESCRIPTION.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(ABOUT_META_DESCRIPTION).toMatch(
      /^Nonpartisan data on Congress \(535 voting members and 6 non-voting delegates\)/
    );
  });
});

describe('recordCardMetaDescription', () => {
  it('names the record and its sources for a typical name', () => {
    expect(recordCardMetaDescription('Elissa Slotkin')).toBe(
      "Elissa Slotkin's record: bills, votes, campaign money and district federal funding, every number cited to Congress.gov, the FEC and USASpending."
    );
  });

  it.each(['Mariannette Miller-Meeks', 'Debbie Wasserman Schultz', 'Bonnie Watson Coleman'])(
    'fits for a long name: %s',
    name => {
      const text = recordCardMetaDescription(name);
      expect(text.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
      expect(text.startsWith(`${name}'s record`)).toBe(true);
    }
  );
});

describe('stateLegislatorMetaDescription', () => {
  const hoskins = {
    name: 'Jason Hoskins',
    stateName: 'Michigan',
    role: 'State Representative',
    district: 'District 18',
    party: 'Democratic',
    phone: '517-373-1180',
    email: 'jasonhoskins@house.mi.gov',
  };

  it('keeps identity and contact, dropping the summary to fit', () => {
    const text = stateLegislatorMetaDescription(hoskins);
    expect(text).toBe(
      'Jason Hoskins is the Michigan State Representative for District 18 (Democratic). Phone 517-373-1180, email jasonhoskins@house.mi.gov.'
    );
    expect(text.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
  });

  it('keeps the full summary when it fits', () => {
    expect(
      stateLegislatorMetaDescription({ ...hoskins, name: 'Al Ng', email: null, phone: null })
    ).toBe(
      'Al Ng is the Michigan State Representative for District 18 (Democratic). Office address, committees, sponsored bills and votes.'
    );
  });

  it('drops the email before the phone when the address is long', () => {
    const text = stateLegislatorMetaDescription({
      ...hoskins,
      name: 'Christopher Alexander Montgomery-Whitfield',
      district: '7th Hampden',
      email: 'christopher.montgomery-whitfield@mahouse.gov',
    });
    expect(text.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(text).toContain('Phone 517-373-1180');
    expect(text).not.toContain('@');
  });

  it('starts the contact sentence with a capital when there is no phone', () => {
    expect(stateLegislatorMetaDescription({ ...hoskins, phone: null })).toContain(
      '(Democratic). Email jasonhoskins@house.mi.gov.'
    );
  });
});

describe('memberProfileMetaDescription', () => {
  it('names party, role, member and seat first', () => {
    expect(
      memberProfileMetaDescription({
        party: 'Democratic',
        title: 'Representative',
        name: 'Debbie Dingell',
        state: 'MI',
        district: '6',
        committeeCount: 7,
      })
    ).toBe(
      'Democratic Representative Debbie Dingell (MI-6): voting record, campaign finance and bills in the 119th Congress. Serves on 7 committees.'
    );
  });

  it('fits the longest current House entry, keeping its committee count', () => {
    const text = memberProfileMetaDescription({
      party: 'Democratic',
      title: 'Resident Commissioner',
      name: 'Pablo José Hernández Rivera',
      state: 'PR',
      district: '0',
      committeeCount: 6,
    });
    expect(text.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(text).toContain('(PR):');
    expect(text).toContain('Serves on 6 committees.');
  });

  it('never prints "District 0" for at-large seats', () => {
    expect(
      memberProfileMetaDescription({
        party: 'Republican',
        title: 'Representative',
        name: 'Nick Begich',
        state: 'AK',
        district: '0',
      })
    ).toMatch(/^Republican Representative Nick Begich \(AK\):/);
  });

  it('drops the committee count before going over the limit', () => {
    const text = memberProfileMetaDescription({
      party: 'Independent',
      title: 'Resident Commissioner',
      name: 'Bartholomew Alexander Montgomery-Whitfield',
      state: 'PR',
      district: '0',
      committeeCount: 12,
    });
    expect(text.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(text).not.toContain('committees');
  });
});
