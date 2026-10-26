import {
  congressionalDistrictLede,
  formatOfficeAddress,
  memberLede,
  questionLede,
  stateDistrictLede,
  stateLegislatorLede,
  type MemberLedeInput,
} from '@/lib/seo/answer-first';
import type { TenureTerm } from '@/features/representatives/utils/tenure';

/** Terms oldest first; the builders take them newest first. */
const newestFirst = (...terms: Array<[string, string, 'House' | 'Senate']>): TenureTerm[] =>
  terms.map(([startYear, endYear, chamber]) => ({ startYear, endYear, chamber })).reverse();

const house = (from: number, to: number): Array<[string, string, 'House']> =>
  Array.from({ length: (to - from) / 2 }, (_, i) => [
    String(from + 2 * i),
    String(from + 2 * i + 2),
    'House',
  ]);

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

const census = {
  population: 770957,
  medianIncome: 91059,
  medianAge: 38.5,
  collegePct: 26.3,
  povertyPct: 10.1,
  surveyYear: 2022,
};

const dingell: MemberLedeInput = {
  name: 'Debbie Dingell',
  surname: 'Dingell',
  party: 'Democratic',
  chamber: 'House',
  role: 'Representative',
  stateName: 'Michigan',
  district: '6',
  terms: newestFirst(...house(2015, 2027)),
  nextElection: 2026,
  committeeCount: 2,
  subcommitteeCount: 5,
};

describe('memberLede', () => {
  it('describes a one-chamber member with a term count', () => {
    expect(memberLede(dingell)).toBe(
      "Debbie Dingell is the Democratic U.S. representative for Michigan's 6th congressional district. Dingell has served in the House since 2015 and is serving a sixth term, which runs 2025–2027. The next election for the seat is in November 2026. Dingell serves on 2 committees and 5 subcommittees."
    );
  });

  it('names both chambers for a House-to-Senate member', () => {
    expect(
      memberLede({
        ...dingell,
        name: 'Elissa Slotkin',
        surname: 'Slotkin',
        chamber: 'Senate',
        role: 'Senator',
        district: null,
        terms: newestFirst(...house(2019, 2025), ['2025', '2031', 'Senate']),
        nextElection: 2030,
        committeeCount: 4,
        subcommitteeCount: 7,
      })
    ).toBe(
      'Elissa Slotkin is a Democratic U.S. senator from Michigan. Slotkin has served in the Senate since 2025, after serving in the House from 2019 to 2025; the current term runs 2025–2031. The next election for the seat is in November 2030. Slotkin serves on 4 committees and 7 subcommittees.'
    );
  });

  it('calls a delegate non-voting and puts "the" before DC', () => {
    const text = memberLede({
      ...dingell,
      name: 'Eleanor Norton',
      surname: 'Norton',
      role: 'Delegate',
      stateName: 'District of Columbia',
      district: '0',
      terms: newestFirst(...house(1991, 2027)),
    });
    expect(text).toMatch(
      /^Eleanor Norton is the Democratic delegate for the District of Columbia, a non-voting member of the U\.S\. House\./
    );
    expect(text).toContain('is serving an 18th term');
  });

  it('lists earlier service after a break', () => {
    const mfume = newestFirst(
      ...house(1987, 1997),
      ['2020', '2021', 'House'],
      ...house(2021, 2027)
    );
    mfume[mfume.length - 5]!.endYear = '1996';
    expect(
      memberLede({ ...dingell, name: 'Kweisi Mfume', surname: 'Mfume', terms: mfume })
    ).toContain(
      'Mfume has served in the House since 2020, with earlier service from 1987 to 1996; the current term runs 2025–2027.'
    );
  });

  it('leaves out facts it does not have', () => {
    const text = memberLede({
      ...dingell,
      terms: [],
      nextElection: null,
      committeeCount: 0,
      subcommitteeCount: 0,
    });
    expect(text).toBe(
      "Debbie Dingell is the Democratic U.S. representative for Michigan's 6th congressional district."
    );
  });
});

describe('congressionalDistrictLede', () => {
  it('names the member, the 2024 result and the Census survey and year', () => {
    const text = congressionalDistrictLede({
      stateName: 'Michigan',
      district: '06',
      member: { name: 'Debbie Dingell', surname: 'Dingell', party: 'Democratic' },
      lastElection: { winnerName: 'DEBBIE DINGELL', pct: 62 },
      demographics: census,
    });
    expect(text).toBe(
      "Michigan's 6th congressional district is represented by Debbie Dingell, a Democratic U.S. representative. Dingell won the 2024 general election with 62.0% of the vote. The district has 770,957 residents, a median household income of $91,059 and a median age of 38.5, according to the Census Bureau's 2022 American Community Survey 5-year estimates."
    );
  });

  it('keeps the shares sentence when it fits', () => {
    expect(
      congressionalDistrictLede({ stateName: 'Michigan', district: '6', demographics: census })
    ).toContain('The same survey counts 26.3% as college educated and 10.1% as living in poverty.');
  });

  it('describes a delegate seat as non-voting', () => {
    expect(
      congressionalDistrictLede({
        stateName: 'District of Columbia',
        district: '0',
        member: {
          name: 'Eleanor Norton',
          surname: 'Norton',
          party: 'Democratic',
          role: 'Delegate',
        },
      })
    ).toBe(
      "The District of Columbia's at-large congressional district is represented by Delegate Eleanor Norton (Democratic), a non-voting member of the U.S. House."
    );
  });

  it('says nothing about a special election when no date is on file', () => {
    expect(
      congressionalDistrictLede({
        stateName: 'Florida',
        district: '20',
        vacancy: { previousName: 'Sheila Cherfilus-McCormick', previousParty: 'Democratic' },
      })
    ).toBe(
      "Florida's 20th congressional district is vacant. The previous representative was Sheila Cherfilus-McCormick (Democratic)."
    );
  });

  it('states a recorded special election date, future or past', () => {
    const base = {
      stateName: 'Texas',
      district: '23',
      today: new Date('2026-10-26T00:00:00Z'),
    };
    const vacancy = { previousName: 'Tony Gonzales', previousParty: 'Republican' };
    expect(
      congressionalDistrictLede({
        ...base,
        vacancy: { ...vacancy, specialElectionDate: '2026-11-03' },
      })
    ).toContain('A special election is scheduled for November 3, 2026.');
    expect(
      congressionalDistrictLede({
        ...base,
        vacancy: { ...vacancy, specialElectionDate: '2026-04-01' },
      })
    ).toContain('A special election was held on April 1, 2026.');
  });
});

describe('stateLegislatorLede', () => {
  const hoskins = {
    name: 'Jason Hoskins',
    surname: 'Hoskins',
    stateName: 'Michigan',
    role: 'State Representative',
    district: 'District 18',
    party: 'Democratic',
    inSeatSince: '2023',
    committees: [
      { name: 'Finance', role: 'democratic vice chair' },
      { name: 'Health Policy', role: 'member' },
    ],
    phone: '517-373-1180',
    email: 'jasonhoskins@house.mi.gov',
  };

  it('uses the "X, a Democrat, is the … and has held the seat since" form', () => {
    expect(stateLegislatorLede(hoskins)).toBe(
      'Jason Hoskins, a Democrat, is the Michigan state representative for District 18 and has held the seat since 2023. Hoskins serves on 2 committees: Finance (Democratic vice chair) and Health Policy. The office can be reached by phone at 517-373-1180 or by email at jasonhoskins@house.mi.gov.'
    );
  });

  it('says "elected on a nonpartisan ballot" for Nebraska', () => {
    expect(
      stateLegislatorLede({
        ...hoskins,
        name: 'Bob Hallstrom',
        stateName: 'Nebraska',
        role: 'State Senator',
        district: 'District 1',
        party: 'Nonpartisan',
      })
    ).toMatch(
      /^Bob Hallstrom, elected on a nonpartisan ballot, is the Nebraska state senator for District 1/
    );
  });

  it('leaves out an "Other" party and a missing start year', () => {
    expect(
      stateLegislatorLede({ ...hoskins, party: 'Other', inSeatSince: null, committees: [] })
    ).toMatch(/^Jason Hoskins is the Michigan state representative for District 18\. The office/);
  });

  it('counts committees without listing more than three', () => {
    const many = ['A', 'B', 'C', 'D'].map(name => ({ name }));
    expect(stateLegislatorLede({ ...hoskins, committees: many })).toContain(
      'Hoskins serves on 4 committees.'
    );
  });
});

describe('stateDistrictLede', () => {
  it('names one member with the chamber title', () => {
    expect(
      stateDistrictLede({
        districtName: 'Michigan Senate District 18',
        title: 'Senator',
        members: [{ name: 'Thomas Albert', party: 'Republican' }],
      })
    ).toBe('Michigan Senate District 18 is represented by Senator Thomas Albert (Republican).');
  });

  it('names every member of a multi-member district', () => {
    expect(
      stateDistrictLede({
        districtName: 'Arizona House of Representatives District 1',
        title: 'Representative',
        members: [
          { name: 'Quang Nguyen', party: 'Republican' },
          { name: 'Selina Bliss', party: 'Republican' },
        ],
      })
    ).toBe(
      'Arizona House of Representatives District 1 elects 2 members: Representatives Quang Nguyen (Republican) and Selina Bliss (Republican).'
    );
  });

  it('says so when no legislator is listed', () => {
    expect(
      stateDistrictLede({
        districtName: 'Michigan Senate District 9',
        title: 'Senator',
        members: [],
      })
    ).toBe('No current legislator is listed for Michigan Senate District 9.');
  });
});

describe('questionLede', () => {
  it('describes the voting page without tallying positions', () => {
    const text = questionLede({
      slug: 'voting-record',
      name: 'Elissa Slotkin',
      surname: 'Slotkin',
      votes: [{ date: '2026-09-30' }, { date: '2026-09-28' }],
      hasLegislationSummary: true,
    });
    expect(text).toBe(
      "This page lists Elissa Slotkin's 2 most recent recorded votes in the 119th Congress, from September 28, 2026 to September 30, 2026, with the measure and how Slotkin voted on each. It also summarizes the bills Slotkin has sponsored and cosponsored. Slotkin's full voting record is linked below."
    );
    expect(text).not.toMatch(/Yea|Nay|times/);
  });

  it('dates the bill count', () => {
    expect(
      questionLede({
        slug: 'bills-sponsored',
        name: 'Debbie Dingell',
        surname: 'Dingell',
        sponsoredCount: 88,
        asOf: '2026-10-26T12:00:00Z',
        latest: {
          number: 'H.R. 10865',
          title: 'Samier Amer Foster Care Improvement Act of 2026',
          introducedDate: '2026-10-22',
          status: 'In committee',
        },
      })
    ).toBe(
      'As of October 26, 2026, Debbie Dingell has sponsored 88 bills and resolutions in the 119th Congress, according to Congress.gov. The most recent is H.R. 10865, the Samier Amer Foster Care Improvement Act of 2026, introduced on October 22, 2026 (status: in committee).'
    );
  });

  it('dates campaign money by the FEC report period', () => {
    expect(
      questionLede({
        slug: 'campaign-contributions',
        name: 'Elissa Slotkin',
        surname: 'Slotkin',
        finance: {
          totalRaised: 6_000_000,
          totalSpent: 3_400_000,
          cashOnHand: 2_900_000,
          individualContributions: 5_640_000,
          pacContributions: 38_000,
          cycle: 2026,
          isCurrentCycle: true,
          coverageEndDate: '2026-09-30T00:00:00',
        },
      })
    ).toBe(
      'According to FEC reports through September 30, 2026, Elissa Slotkin has raised $6.0 million in the 2025–26 election cycle and spent $3.4 million, leaving $2.9 million cash on hand. Of the money raised, 94% came from individual donors and 1% from PACs.'
    );
  });

  it('formats a Washington office address', () => {
    expect(
      questionLede({
        slug: 'contact-info',
        name: 'Eleanor Norton',
        surname: 'Norton',
        phone: '202-225-8050',
        office: '2136 Rayburn House Office Building Washington DC 20515-5101',
        website: 'https://norton.house.gov/',
        hasContactForm: false,
        districtOfficeCount: 0,
      })
    ).toBe(
      "Eleanor Norton's Washington office can be reached by phone at 202-225-8050. The office address is 2136 Rayburn House Office Building, Washington, DC 20515. The official website is norton.house.gov."
    );
  });

  it('says nothing about stock trades when the source was unreachable', () => {
    expect(
      questionLede({ slug: 'stock-trades', name: 'A B', surname: 'B', trades: null })
    ).toBeNull();
  });

  it('names committee leaders as the page labels them', () => {
    expect(
      questionLede({
        slug: 'committee-members',
        committee: 'House Committee on Agriculture',
        memberCount: 53,
        subcommitteeCount: 6,
        chair: 'Glenn Thompson (R-PA-15)',
        rankingMember: 'Angie Craig (D-MN-2)',
      })
    ).toBe(
      'The House Committee on Agriculture has 53 members in the 119th Congress. Glenn Thompson (R-PA-15) is the chair and Angie Craig (D-MN-2) is the ranking member. The committee has 6 subcommittees.'
    );
  });

  it('describes the hearings as the most recent the page lists', () => {
    const text = questionLede({
      slug: 'committee-activity',
      committee: 'House Committee on Agriculture',
      meetings: [
        { date: '2026-09-16', title: 'A' },
        { date: '2026-07-22', title: 'B' },
        { date: '2026-07-21', title: 'C' },
        { date: '2026-06-25', title: 'D' },
        { date: '2026-06-10', title: 'E' },
      ],
      billsShown: 8,
      newestBillDate: '2026-10-22',
      asOf: '2026-10-26T00:00:00Z',
    });
    expect(text).toBe(
      'As of October 26, 2026, this page lists the 5 most recent hearings and meetings of the House Committee on Agriculture from Congress.gov. It also lists 8 bills referred to the committee, the newest introduced on October 22, 2026.'
    );
  });

  it('counts lobbying reports, not dollars, and says how reports are matched', () => {
    const text = questionLede({
      slug: 'committee-lobbying',
      committee: 'Senate Committee on Finance',
      corpus: { reportCount: 41234, firstQuarter: '2024-Q4', lastQuarter: '2026-Q3' },
    });
    expect(text).toBe(
      'From the fourth quarter of 2024 through the third quarter of 2026, 41,234 lobbying reports filed with the Senate listed issues or agencies that fall under the Senate Committee on Finance. Reports do not name committees; CIV.IQ matches each one by its issue codes and the agencies it contacted, so one report can count toward several committees.'
    );
    expect(text).not.toMatch(/\$|median|name the/);
  });

  it('states the topic total the source reports, not the page size', () => {
    const text = questionLede({
      slug: 'topic-bills',
      topic: 'Health',
      billsShown: 10,
      billsTotal: 1930,
      congress: 119,
      asOf: '2026-10-26T00:00:00Z',
      committees: [{ name: 'Finance', chamber: 'Senate' }],
      regulationCount: 1,
    });
    expect(text).toBe(
      'As of October 26, 2026, there are 1,930 bills in the Health policy area in the 119th Congress, according to govinfo.gov bill status data. This page lists the 10 most recently active bills and related federal regulations. The Senate Finance Committee oversees the area.'
    );
  });
});

describe('formatOfficeAddress', () => {
  it.each([
    [
      '2136 Rayburn House Office Building Washington DC 20515-5101',
      '2136 Rayburn House Office Building, Washington, DC 20515',
    ],
    [
      '311 Hart Senate Office Building, Washington, DC 20510',
      '311 Hart Senate Office Building, Washington, DC 20510',
    ],
    ['100 Main St, Lansing, MI 48933', '100 Main St, Lansing, MI 48933'],
  ])('%s', (input, expected) => {
    expect(formatOfficeAddress(input)).toBe(expected);
  });
});

describe('every opening', () => {
  const samples = [
    memberLede(dingell),
    congressionalDistrictLede({
      stateName: 'Michigan',
      district: '6',
      member: { name: 'Debbie Dingell', surname: 'Dingell', party: 'Democratic' },
      lastElection: { winnerName: 'DEBBIE DINGELL', pct: 62 },
      demographics: census,
    }),
    stateDistrictLede({
      districtName: 'Michigan Senate District 18',
      title: 'Senator',
      members: [{ name: 'Thomas Albert', party: 'Republican' }],
      demographics: census,
    }),
  ];

  it.each(samples.map((s, i) => [i, s]))('sample %i stays within 60 words', (_, text) => {
    expect(wordCount(text as string)).toBeLessThanOrEqual(60);
  });

  it.each(samples.map((s, i) => [i, s]))(
    'sample %i states facts, not positions, and uses no pronouns',
    (_, text) => {
      expect(text).not.toMatch(/\b(supports?|opposes?|he|she|his|her|they|their)\b/i);
    }
  );
});
