/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  billHrefForVote,
  isBioguideId,
  isLisMemberId,
  nominationUrlForVote,
  officialVoteRecordUrl,
  voteMeasureBillHref,
} from '@/lib/votes/vote-links';

describe('isBioguideId / isLisMemberId', () => {
  it('accepts bioguide IDs and rejects Senate LIS IDs', () => {
    expect(isBioguideId('A000383')).toBe(true);
    expect(isBioguideId('S440')).toBe(false);
    expect(isBioguideId('')).toBe(false);
    expect(isBioguideId(undefined)).toBe(false);
    expect(isLisMemberId('S440')).toBe(true);
    expect(isLisMemberId('A000383')).toBe(false);
  });
});

describe('billHrefForVote', () => {
  it('builds canonical bill hrefs from dotted type codes', () => {
    expect(billHrefForVote('119', 'H.R.', 'H.R. 4')).toBe('/bill/119-hr-4');
    expect(billHrefForVote(119, 'S.J.Res.', 'S.J.Res. 185')).toBe('/bill/119-sjres-185');
  });

  it('never links a nomination as a bill (senate-119-2-1: PN12-1)', () => {
    expect(billHrefForVote('119', 'PN', 'PN12-1')).toBeNull();
  });

  it('returns null for missing or placeholder type/number', () => {
    expect(billHrefForVote('119', undefined, '12')).toBeNull();
    expect(billHrefForVote('119', 'Unknown', 'Unknown')).toBeNull();
    expect(billHrefForVote('119', 'HR', '')).toBeNull();
  });
});

describe('voteMeasureBillHref', () => {
  it('falls back to the chamber bill type when the XML says only "Bill"', () => {
    expect(voteMeasureBillHref('119', 'Senate', 'Bill', 'S. 5')).toBe('/bill/119-s-5');
    expect(voteMeasureBillHref('119', 'House', undefined, '7567')).toBe('/bill/119-hr-7567');
  });

  it('does not fall back for a nomination', () => {
    expect(voteMeasureBillHref('119', 'Senate', 'PN', 'PN12-1')).toBeNull();
  });
});

describe('nominationUrlForVote', () => {
  it('links partitioned nominations to the parent Congress.gov page', () => {
    expect(nominationUrlForVote('119', 'PN', 'PN12-1')).toBe(
      'https://www.congress.gov/nomination/119th-congress/12'
    );
    expect(nominationUrlForVote(121, 'PN', 'PN 7')).toBe(
      'https://www.congress.gov/nomination/121st-congress/7'
    );
  });

  it('returns null for bills', () => {
    expect(nominationUrlForVote('119', 'H.R.', 'H.R. 4')).toBeNull();
  });
});

describe('officialVoteRecordUrl', () => {
  it('maps House Clerk EVS XML to the /Votes/<year><roll> page (unpadded)', () => {
    expect(officialVoteRecordUrl('https://clerk.house.gov/evs/2026/roll151.xml')).toBe(
      'https://clerk.house.gov/Votes/2026151'
    );
    expect(officialVoteRecordUrl('https://clerk.house.gov/evs/2026/roll001.xml')).toBe(
      'https://clerk.house.gov/Votes/20261'
    );
  });

  it('maps senate.gov roll-call XML to its .htm sibling', () => {
    expect(
      officialVoteRecordUrl(
        'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1192/vote_119_2_00101.xml'
      )
    ).toBe('https://www.senate.gov/legislative/LIS/roll_call_votes/vote1192/vote_119_2_00101.htm');
  });

  it('returns null for empty or unrecognized URLs', () => {
    expect(officialVoteRecordUrl('')).toBeNull();
    expect(officialVoteRecordUrl('https://example.com/roll1.xml')).toBeNull();
  });
});
