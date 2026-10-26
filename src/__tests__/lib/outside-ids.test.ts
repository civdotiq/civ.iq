import {
  bioguideUrl,
  officialLegislatureUrl,
  openStatesId,
  openStatesUrl,
  wikidataUrl,
  wikipediaUrl,
} from '@/lib/outside-ids';

describe('federal outside IDs', () => {
  it('builds the Bioguide, Wikipedia and Wikidata URLs', () => {
    expect(bioguideUrl('S000033')).toBe('https://bioguide.congress.gov/search/bio/S000033');
    expect(wikipediaUrl('Bernie Sanders')).toBe('https://en.wikipedia.org/wiki/Bernie_Sanders');
    expect(wikipediaUrl('Mike Johnson (Louisiana politician)')).toBe(
      'https://en.wikipedia.org/wiki/Mike_Johnson_(Louisiana_politician)'
    );
    expect(wikipediaUrl('Nanette Barragán')).toBe(
      'https://en.wikipedia.org/wiki/Nanette_Barrag%C3%A1n'
    );
    expect(wikidataUrl('Q359442')).toBe('https://www.wikidata.org/wiki/Q359442');
  });

  it('gives nothing for a missing or malformed ID', () => {
    expect(wikipediaUrl(undefined)).toBeNull();
    expect(wikipediaUrl('  ')).toBeNull();
    expect(wikidataUrl('359442')).toBeNull();
    expect(wikidataUrl(null)).toBeNull();
  });
});

describe('state outside IDs', () => {
  it('encodes the Open States person UUID as openstates.org does', () => {
    // Verified 2026-10-26: this URL forwards to
    // pluralpolicy.com/app/person/d6da4c9b-26ef-4fa9-a1c6-a79d843abe09.
    expect(openStatesUrl('ocd-person/d6da4c9b-26ef-4fa9-a1c6-a79d843abe09', 'Jason Hoskins')).toBe(
      'https://openstates.org/person/jason-hoskins-6XQ7V9XU3bOuqgzPfNBHnl/'
    );
    expect(openStatesUrl('not-a-uuid', 'X')).toBeNull();
    expect(openStatesId('d6da4c9b-26ef-4fa9-a1c6-a79d843abe09')).toBe(
      'ocd-person/d6da4c9b-26ef-4fa9-a1c6-a79d843abe09'
    );
  });

  it('picks the legislator’s own page on a government domain', () => {
    const shared = new Set(['https://assembly.state.ny.us/mem/?sh=email']);
    expect(
      officialLegislatureUrl(
        [
          'https://assembly.state.ny.us/mem/?sh=email',
          'https://assembly.state.ny.us/mem/Al-Stirpe',
          'https://nyassembly.gov/mem/Al-Stirpe',
        ],
        shared
      )
    ).toBe('https://assembly.state.ny.us/mem/Al-Stirpe');
  });

  it("accepts Minnesota's Senate site, which is not on .gov", () => {
    expect(
      officialLegislatureUrl(
        [
          'https://www.mnsenaterepublicans.com/senator-jim-abeler/',
          'https://www.senate.mn/members/member_bio.html?mem_id=1216',
        ],
        new Set()
      )
    ).toBe('https://www.senate.mn/members/member_bio.html?mem_id=1216');
  });

  it('never treats a caucus site as the official page', () => {
    expect(officialLegislatureUrl(['https://housedems.com/Alabas-Farhat/'], new Set())).toBeNull();
    expect(
      officialLegislatureUrl(['https://gophouse.org/member/RepAngelaRigas/posts'], new Set())
    ).toBeNull();
  });
});
