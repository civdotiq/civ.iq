import {
  ABOUT_META_DESCRIPTION,
  META_DESCRIPTION_MAX,
  recordCardMetaDescription,
  stateLegislatorMetaDescription,
} from '@/lib/seo/meta-descriptions';

describe('ABOUT_META_DESCRIPTION', () => {
  it('fits and keeps the main fact', () => {
    expect(ABOUT_META_DESCRIPTION.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(ABOUT_META_DESCRIPTION).toMatch(/^Nonpartisan data on 535 members of Congress/);
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
