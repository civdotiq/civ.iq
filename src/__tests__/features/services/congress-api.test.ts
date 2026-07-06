/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for congress-api.ts — bioguide validation, Congress.gov member
 * formatting, state filtering, the congress-legislators fallback, and
 * Senate.gov XML vote parsing. All network I/O is mocked.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// unstable_cache needs a Next.js request context; make it a pass-through.
jest.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: jest.fn(),
  getEnhancedRepresentative: jest.fn(),
}));

import {
  isValidBioguideId,
  validateRepresentatives,
  formatCongressMember,
  getCurrentMembersByState,
  getRepresentativesByLocation,
  getVoteDetails,
  getSenateVoteDetails,
  type Representative,
} from '@/features/representatives/services/congress-api';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import {
  getCurrentCongressNumber,
  getCongressDateRange,
  getNextHouseElection,
  getNextSenateElectionFromTermEnd,
} from '@/lib/data/congressional-constants';
import type { CongressApiMember } from '@/types/api-responses';

const CURRENT_CONGRESS = getCurrentCongressNumber();
const CONGRESS_START_YEAR = getCongressDateRange(CURRENT_CONGRESS).start.getUTCFullYear();

function makeApiMember(overrides: Partial<CongressApiMember> = {}): CongressApiMember {
  return {
    bioguideId: 'P000197',
    name: 'Pelosi, Nancy',
    firstName: 'Nancy',
    lastName: 'Pelosi',
    state: 'California',
    partyName: 'Democratic',
    district: '11',
    terms: {
      item: [
        {
          chamber: 'House of Representatives',
          congress: CURRENT_CONGRESS,
          startYear: CONGRESS_START_YEAR,
        },
      ],
    },
    updateDate: '2026-01-01',
    ...overrides,
  } as CongressApiMember;
}

const okJson = (body: unknown) => ({ ok: true, json: async () => body });
const failedResponse = { ok: false, status: 500, statusText: 'Internal Server Error' };

afterEach(() => {
  jest.clearAllMocks();
});

describe('isValidBioguideId', () => {
  it('accepts the canonical letter + 6 digits format', () => {
    expect(isValidBioguideId('P000197')).toBe(true);
    expect(isValidBioguideId('J000282')).toBe(true);
  });

  it('rejects malformed IDs', () => {
    expect(isValidBioguideId('')).toBe(false);
    expect(isValidBioguideId('p000197')).toBe(false); // lowercase
    expect(isValidBioguideId('P00019')).toBe(false); // 5 digits
    expect(isValidBioguideId('P0001977')).toBe(false); // 7 digits
    expect(isValidBioguideId('S123')).toBe(false); // LIS member id
    expect(isValidBioguideId('PELOSINANCY_CA')).toBe(false); // synthesized fallback id
  });
});

describe('validateRepresentatives', () => {
  it('filters out representatives with invalid bioguide IDs', () => {
    const reps = [
      { bioguideId: 'P000197', name: 'Valid', state: 'CA', party: 'D', chamber: 'House' },
      { bioguideId: 'BOGUS_ID', name: 'Invalid', state: 'CA', party: 'D', chamber: 'House' },
    ] as Representative[];

    const validated = validateRepresentatives(reps);
    expect(validated).toHaveLength(1);
    expect(validated[0]?.bioguideId).toBe('P000197');
  });
});

describe('formatCongressMember', () => {
  const currentYear = new Date().getFullYear();

  it('maps a House member with chamber, district, and party', () => {
    const rep = formatCongressMember(makeApiMember());

    expect(rep.bioguideId).toBe('P000197');
    expect(rep.name).toBe('Pelosi, Nancy');
    expect(rep.chamber).toBe('House');
    expect(rep.district).toBe('11');
    expect(rep.party).toBe('Democratic');
    // House members: next even-year election that hasn't happened yet
    // (helper covered with fixed dates in congressional-constants.test.ts).
    expect(rep.nextElection).toBe(String(getNextHouseElection()));
  });

  it('maps a Senator and anchors next election at term end minus one', () => {
    const rep = formatCongressMember(
      makeApiMember({
        district: undefined,
        terms: {
          item: [{ chamber: 'Senate', congress: CURRENT_CONGRESS, startYear: 2023, endYear: 2029 }],
        },
      })
    );

    expect(rep.chamber).toBe('Senate');
    expect(rep.district).toBeUndefined();
    // Term ends Jan 2029 → seat is up in November 2028, not 2029.
    expect(rep.nextElection).toBe(String(getNextSenateElectionFromTermEnd(2029)));
  });

  it('leaves a Senator without a term end year unset — never guesses', () => {
    const rep = formatCongressMember(
      makeApiMember({
        district: undefined,
        terms: {
          item: [{ chamber: 'Senate', congress: CURRENT_CONGRESS, startYear: 2023 }],
        },
      })
    );

    expect(rep.nextElection).toBeUndefined();
  });

  it('computes yearsInOffice from the earliest term', () => {
    const rep = formatCongressMember(
      makeApiMember({
        terms: {
          item: [
            {
              chamber: 'House of Representatives',
              congress: CURRENT_CONGRESS,
              startYear: CONGRESS_START_YEAR,
            },
            { chamber: 'House of Representatives', congress: 100, startYear: 1987 },
          ],
        },
      })
    );

    expect(rep.yearsInOffice).toBe(currentYear - 1987);
  });

  it('infers a missing term end year from chamber term length', () => {
    const house = formatCongressMember(makeApiMember());
    expect(house.terms?.[0]?.endYear).toBe(String(CONGRESS_START_YEAR + 2));

    const senate = formatCongressMember(
      makeApiMember({
        terms: { item: [{ chamber: 'Senate', congress: CURRENT_CONGRESS, startYear: 2025 }] },
      })
    );
    expect(senate.terms?.[0]?.endYear).toBe('2031');
  });

  it('falls back through name and party fields', () => {
    const rep = formatCongressMember(
      makeApiMember({ name: undefined, partyName: undefined, party: 'R' })
    );
    expect(rep.name).toBe('Nancy Pelosi');
    expect(rep.party).toBe('R');

    const unknown = formatCongressMember(
      makeApiMember({ name: undefined, firstName: undefined, lastName: undefined })
    );
    expect(unknown.name).toBe('Unknown');
  });
});

describe('getCurrentMembersByState', () => {
  it('returns only members matching the requested state', async () => {
    const members = [
      makeApiMember(),
      makeApiMember({ bioguideId: 'J000282', name: 'Joyce, David', state: 'Ohio' }),
    ];
    global.fetch = jest.fn().mockResolvedValue(okJson({ members }));

    const result = await getCurrentMembersByState('CA', 'test-key');

    expect(result).toHaveLength(1);
    expect(result[0]?.bioguideId).toBe('P000197');
    expect(result[0]?.fullName).toBe('Pelosi, Nancy');
  });

  it('matches when the caller passes the full state name', async () => {
    global.fetch = jest.fn().mockResolvedValue(okJson({ members: [makeApiMember()] }));
    const result = await getCurrentMembersByState('California', 'test-key');
    expect(result).toHaveLength(1);
  });

  it('falls through to the second endpoint when the first fails', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(failedResponse)
      .mockResolvedValueOnce(okJson({ members: [makeApiMember()] }));

    const result = await getCurrentMembersByState('CA', 'test-key');

    expect(result).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('returns an empty array when every endpoint fails — never fake data', async () => {
    global.fetch = jest.fn().mockResolvedValue(failedResponse);
    await expect(getCurrentMembersByState('CA', 'test-key')).resolves.toEqual([]);
  });

  it('excludes members whose terms all predate the sitting Congress', async () => {
    const former = makeApiMember({
      bioguideId: 'F000001',
      terms: {
        item: [
          { chamber: 'House of Representatives', congress: 110, startYear: 2007, endYear: 2009 },
        ],
      },
    });
    global.fetch = jest.fn().mockResolvedValue(okJson({ members: [former] }));

    await expect(getCurrentMembersByState('CA', 'test-key')).resolves.toEqual([]);
  });
});

describe('getRepresentativesByLocation', () => {
  const mockedGetAll = getAllEnhancedRepresentatives as jest.Mock;

  it('uses the congress-legislators fallback when the API returns nothing', async () => {
    global.fetch = jest.fn().mockResolvedValue(failedResponse);
    mockedGetAll.mockResolvedValue([
      {
        bioguideId: 'P000197',
        name: 'Nancy Pelosi',
        party: 'Democrat',
        state: 'CA',
        district: '11',
        chamber: 'House',
        terms: [],
      },
      {
        bioguideId: 'S000148',
        name: 'Charles Schumer',
        party: 'Democrat',
        state: 'NY',
        chamber: 'Senate',
        terms: [],
      },
    ]);

    const reps = await getRepresentativesByLocation('CA', '11');

    expect(mockedGetAll).toHaveBeenCalled();
    expect(reps).toHaveLength(1);
    expect(reps[0]?.bioguideId).toBe('P000197');
    expect(reps[0]?.chamber).toBe('House');
  });

  it('returns all chambers for the state when no district is given', async () => {
    global.fetch = jest.fn().mockResolvedValue(failedResponse);
    mockedGetAll.mockResolvedValue([
      {
        bioguideId: 'P000197',
        name: 'A',
        party: 'D',
        state: 'CA',
        district: '11',
        chamber: 'House',
        terms: [],
      },
      { bioguideId: 'S000510', name: 'B', party: 'D', state: 'CA', chamber: 'Senate', terms: [] },
      { bioguideId: 'S000148', name: 'C', party: 'D', state: 'NY', chamber: 'Senate', terms: [] },
    ]);

    const reps = await getRepresentativesByLocation('CA');
    expect(reps.map(r => r.bioguideId).sort()).toEqual(['P000197', 'S000510']);
  });

  it('strips synthesized/invalid bioguide IDs before returning', async () => {
    global.fetch = jest.fn().mockResolvedValue(failedResponse);
    mockedGetAll.mockResolvedValue([
      {
        bioguideId: 'P000197',
        name: 'Valid',
        party: 'D',
        state: 'CA',
        chamber: 'House',
        district: '11',
        terms: [],
      },
      {
        bioguideId: 'UNKNOWN_CA',
        name: 'Bogus',
        party: 'D',
        state: 'CA',
        chamber: 'House',
        district: '11',
        terms: [],
      },
    ]);

    const reps = await getRepresentativesByLocation('CA', '11');
    expect(reps.map(r => r.bioguideId)).toEqual(['P000197']);
  });
});

describe('getVoteDetails (House)', () => {
  it('parses member positions from the House roll call response', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      okJson({
        houseRollCallVoteMemberVotes: {
          results: [
            {
              bioguideID: 'P000197',
              voteCast: 'Yea',
              firstName: 'Nancy',
              lastName: 'Pelosi',
              voteParty: 'D',
              voteState: 'CA',
            },
            {
              bioguideID: 'J000282',
              voteCast: 'Nay',
              firstName: 'David',
              lastName: 'Joyce',
              voteParty: 'R',
              voteState: 'OH',
            },
          ],
        },
      })
    );

    const details = await getVoteDetails(CURRENT_CONGRESS, 'house', 1, 42, 'test-key');

    expect(details.success).toBe(true);
    expect(details.memberVotes).toEqual([
      { bioguideId: 'P000197', position: 'Yea', name: 'Nancy Pelosi', party: 'D', state: 'CA' },
      { bioguideId: 'J000282', position: 'Nay', name: 'David Joyce', party: 'R', state: 'OH' },
    ]);
  });

  it('fails closed without an API key', async () => {
    const saved = process.env.CONGRESS_API_KEY;
    delete process.env.CONGRESS_API_KEY;
    global.fetch = jest.fn();

    try {
      const details = await getVoteDetails(CURRENT_CONGRESS, 'house', 1, 42);
      expect(details).toEqual({ memberVotes: [], success: false });
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      if (saved !== undefined) process.env.CONGRESS_API_KEY = saved;
    }
  });

  it('fails closed on an API error response', async () => {
    global.fetch = jest.fn().mockResolvedValue(failedResponse);
    const details = await getVoteDetails(CURRENT_CONGRESS, 'house', 1, 42, 'test-key');
    expect(details).toEqual({ memberVotes: [], success: false });
  });
});

describe('getSenateVoteDetails', () => {
  const SENATE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<roll_call_vote>
  <vote_question>On Passage of the Bill</vote_question>
  <vote_result>Bill Passed</vote_result>
  <vote_date>January 15, 2026</vote_date>
  <vote_title>A bill to do something</vote_title>
  <document><document_name>S. 100</document_name></document>
  <members>
    <member>
      <member_full>Schumer (D-NY)</member_full>
      <first_name>Charles</first_name>
      <last_name>Schumer</last_name>
      <state>NY</state>
      <party>D</party>
      <vote_cast>Yea</vote_cast>
      <bioguide_id>S000148</bioguide_id>
    </member>
    <member>
      <member_full>Thune (R-SD)</member_full>
      <state>SD</state>
      <party>R</party>
      <vote_cast>nay</vote_cast>
      <lis_member_id>S303</lis_member_id>
    </member>
    <member>
      <member_full>Absent (I-VT)</member_full>
      <state>VT</state>
      <party>I</party>
      <vote_cast>Guilty</vote_cast>
    </member>
  </members>
</roll_call_vote>`;

  it('refuses congresses other than the sitting one (XML only plumbed for current)', async () => {
    global.fetch = jest.fn();
    const details = await getSenateVoteDetails(CURRENT_CONGRESS - 1, 1, 17);
    expect(details).toEqual({ memberVotes: [], success: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('parses vote metadata and member positions from Senate.gov XML', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => SENATE_XML });

    const details = await getSenateVoteDetails(CURRENT_CONGRESS, 1, 17);

    expect(details.success).toBe(true);
    expect(details.voteMetadata).toEqual({
      question: 'On Passage of the Bill',
      result: 'Bill Passed',
      date: 'January 15, 2026',
      bill: { number: 'S. 100', title: 'A bill to do something' },
    });

    expect(details.memberVotes).toHaveLength(3);
    expect(details.memberVotes[0]).toEqual({
      bioguideId: 'S000148',
      position: 'Yea',
      name: 'Schumer (D-NY)',
      party: 'D',
      state: 'NY',
    });
    // Case-insensitive vote_cast mapping; bioguide falls back to the LIS id.
    expect(details.memberVotes[1]).toMatchObject({ bioguideId: 'S303', position: 'Nay' });
    // Unrecognized vote_cast values map to Not Voting, never to a position.
    expect(details.memberVotes[2]).toMatchObject({ position: 'Not Voting' });
  });

  it('fails closed when the proxy returns an error', async () => {
    global.fetch = jest.fn().mockResolvedValue(failedResponse);
    const details = await getSenateVoteDetails(CURRENT_CONGRESS, 1, 17);
    expect(details).toEqual({ memberVotes: [], success: false });
  });
});
