/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { RollCallParser } from '@/features/legislation/services/rollcall-parser';

// Helper to mock fetch responses for XML
function mockXMLFetchResponse(xmlText: string): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: () => Promise.resolve(xmlText),
    json: () => Promise.resolve({}),
    headers: new Headers(),
    url: 'https://example.com',
    redirected: false,
    type: 'basic' as ResponseType,
    body: null,
    bodyUsed: false,
    clone: () => new Response(xmlText, { status: 200 }),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as unknown as Response);
}

describe('RollCallParser', () => {
  let parser: RollCallParser;

  beforeEach(() => {
    parser = new RollCallParser();
    jest.clearAllMocks();
  });

  describe('Senate Roll Call Parsing', () => {
    const mockSenateXML = `<?xml version="1.0" encoding="UTF-8"?>
    <roll_call_vote>
      <congress>117</congress>
      <session>2</session>
      <vote_number>71</vote_number>
      <vote_date>2022-03-08</vote_date>
      <question>On Passage of the Bill</question>
      <vote_result>Bill Passed</vote_result>
      <document>
        <document_name>H.R. 3076</document_name>
        <document_title>Postal Service Reform Act</document_title>
      </document>
      <members>
        <member>
          <member_full>Baldwin (D-WI)</member_full>
          <last_name>Baldwin</last_name>
          <first_name>Tammy</first_name>
          <lis_member_id>S354</lis_member_id>
          <vote_cast>Yea</vote_cast>
        </member>
        <member>
          <member_full>Schumer (D-NY)</member_full>
          <last_name>Schumer</last_name>
          <first_name>Charles</first_name>
          <lis_member_id>S000148</lis_member_id>
          <vote_cast>Yea</vote_cast>
        </member>
      </members>
    </roll_call_vote>`;

    it('should parse Senate roll call XML correctly', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce(mockXMLFetchResponse(mockSenateXML));

      const result = await parser.fetchAndParseRollCall('https://www.senate.gov/test.xml');

      expect(result).toEqual({
        congress: 117,
        session: 2,
        chamber: 'Senate',
        rollNumber: 71,
        date: '2022-03-08',
        bill: {
          number: 'H.R. 3076',
          title: 'Postal Service Reform Act',
        },
        question: 'On Passage of the Bill',
        result: 'Bill Passed',
        votes: [
          {
            memberId: 'S354',
            memberName: 'Baldwin',
            party: 'D',
            state: 'WI',
            vote: 'Yea',
          },
          {
            memberId: 'S000148',
            memberName: 'Schumer',
            party: 'D',
            state: 'NY',
            vote: 'Yea',
          },
        ],
        totals: {
          yea: 2,
          nay: 0,
          present: 0,
          notVoting: 0,
        },
      });
    });

    it('should find member vote correctly', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce(mockXMLFetchResponse(mockSenateXML));

      const rollCallData = await parser.fetchAndParseRollCall('https://www.senate.gov/test.xml');
      const memberVote = parser.findMemberVote(rollCallData!, 'S000148', 'Charles Schumer');

      expect(memberVote).toEqual({
        memberId: 'S000148',
        memberName: 'Schumer',
        party: 'D',
        state: 'NY',
        vote: 'Yea',
      });
    });
  });

  describe('House Roll Call Parsing', () => {
    const mockHouseXML = `<?xml version="1.0"?>
    <rollcall-vote>
      <vote-metadata>
        <congress>119</congress>
        <session>1</session>
        <rollcall_num>28</rollcall_num>
        <action-date>2025-02-04</action-date>
        <legis_num>H.R. 43</legis_num>
        <vote_question>On Motion to Suspend the Rules and Pass</vote_question>
        <vote_result>Passed</vote_result>
        <vote_desc>Alaska Native Village Municipal Lands Restoration Act</vote_desc>
      </vote-metadata>
      <vote-data>
        <recorded-vote>
          <legislator name-id="A000055" unaccented-name="ADERHOLT, Robert" party="R" state="AL"/>
          <vote>Yea</vote>
        </recorded-vote>
        <recorded-vote>
          <legislator name-id="O000172" unaccented-name="OCASIO-CORTEZ, Alexandria" party="D" state="NY"/>
          <vote>Yea</vote>
        </recorded-vote>
      </vote-data>
    </rollcall-vote>`;

    it('should parse House roll call XML correctly', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce(mockXMLFetchResponse(mockHouseXML));

      const result = await parser.fetchAndParseRollCall('https://clerk.house.gov/test.xml');

      expect(result).toEqual({
        congress: 119,
        session: 1,
        chamber: 'House',
        rollNumber: 28,
        date: '2025-02-04',
        bill: {
          number: 'H.R. 43',
          title: 'Alaska Native Village Municipal Lands Restoration Act',
        },
        question: 'On Motion to Suspend the Rules and Pass',
        result: 'Passed',
        votes: [
          {
            memberId: 'A000055',
            memberName: 'ADERHOLT, Robert',
            party: 'R',
            state: 'AL',
            vote: 'Yea',
          },
          {
            memberId: 'O000172',
            memberName: 'OCASIO-CORTEZ, Alexandria',
            party: 'D',
            state: 'NY',
            vote: 'Yea',
          },
        ],
        totals: {
          yea: 2,
          nay: 0,
          present: 0,
          notVoting: 0,
        },
      });
    });
  });

  describe('Vote Normalization', () => {
    it('should normalize different vote formats', () => {
      const testCases = [
        { input: 'Yea', expected: 'Yea' },
        { input: 'YEA', expected: 'Yea' },
        { input: 'Aye', expected: 'Yea' },
        { input: 'Yes', expected: 'Yea' },
        { input: 'Nay', expected: 'Nay' },
        { input: 'No', expected: 'Nay' },
        { input: 'Present', expected: 'Present' },
        { input: 'Not Voting', expected: 'Not Voting' },
        { input: '', expected: 'Not Voting' },
        { input: 'Unknown', expected: 'Not Voting' },
      ];

      testCases.forEach(({ input, expected }) => {
        // Access private method for testing
        const normalizeVote = (
          parser as unknown as { normalizeVote: (input: string) => string }
        ).normalizeVote.bind(parser);
        expect(normalizeVote(input)).toBe(expected);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await parser.fetchAndParseRollCall('https://invalid-url.com/test.xml');

      expect(result).toBeNull();
    });

    it('should handle invalid XML gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce(mockXMLFetchResponse('invalid xml'));

      const result = await parser.fetchAndParseRollCall('https://example.com/test.xml');

      expect(result).toBeNull();
    });

    it('should handle 404 responses gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await parser.fetchAndParseRollCall('https://example.com/test.xml');

      expect(result).toBeNull();
    });
  });
});
