/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The Congressional Record Daily Digest reader, on real GPO text (fixtures
 * downloaded from GovInfo 2026-10-27; NUL bytes GPO leaves in the text were
 * stripped from the files and are tested inline).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isSenateDigestTitle,
  parseSenateRecordVoteTotal,
  readSenateDigest,
  sessionForDate,
} from '@/lib/data-sources/congressional-record/senate-digest';

const fixture = (name: string) =>
  readFileSync(join(__dirname, 'fixtures/congressional-record', name), 'utf8');

describe('parseSenateRecordVoteTotal', () => {
  it('reads the running total on a vote day (Sep 30, 2026: four votes, total 256)', () => {
    expect(parseSenateRecordVoteTotal(fixture('CREC-2026-09-30-senate-digest.txt'))).toBe(256);
  });

  it('reads "One record vote was taken today" (Jan 7, 2026)', () => {
    const text =
      'Pages S90\nRecord Votes: One record vote was taken today. (Total--4)\n  Page S74\nRecess: …';
    expect(parseSenateRecordVoteTotal(text)).toBe(4);
  });

  it('returns null for a pro forma session (Oct 26, 2026)', () => {
    expect(
      parseSenateRecordVoteTotal(fixture('CREC-2026-10-26-senate-digest-pro-forma.txt'))
    ).toBeNull();
  });

  it('returns null when the Senate was not in session', () => {
    expect(parseSenateRecordVoteTotal('The Senate was not in session today.')).toBeNull();
  });

  it('ignores NUL bytes GPO leaves in the text', () => {
    const text =
      'Res. 929-949.\0\0\0\0\nRecord Votes: Two record\0 votes were taken today. (Total--252)';
    expect(parseSenateRecordVoteTotal(text)).toBe(252);
  });
});

describe('isSenateDigestTitle', () => {
  it.each([
    ['Daily Digest/Senate', true],
    ['Daily Digest/Highlights + Senate', true],
    ['Daily Digest/Senate Committee Meetings', false],
    ['Daily Digest/House of Representatives', false],
    ['Daily Digest/Next Meeting of the SENATE + Next Meeting of the HOUSE', false],
    [undefined, false],
  ])('%s → %s', (title, expected) => {
    expect(isSenateDigestTitle(title)).toBe(expected);
  });
});

describe('sessionForDate', () => {
  it('maps Record dates to sessions of the 119th Congress', () => {
    expect(sessionForDate(119, '2025-01-03')).toBe(1);
    expect(sessionForDate(119, '2025-12-18')).toBe(1);
    expect(sessionForDate(119, '2026-01-02')).toBe(1);
    expect(sessionForDate(119, '2026-09-30')).toBe(2);
    expect(sessionForDate(119, '2027-01-02')).toBe(2);
    expect(sessionForDate(119, '2027-01-03')).toBeNull();
    expect(sessionForDate(119, '2024-12-20')).toBeNull();
  });
});

/** jsdom has no Response; the reader only needs ok, status, json() and text(). */
function fakeResponse(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(body),
    text: async () => body,
  } as Response;
}

describe('readSenateDigest', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  function mockGovInfo(
    granules: { granuleId: string; title: string; granuleClass: string }[],
    htm: Record<string, string>
  ) {
    global.fetch = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/granules?')) {
        return fakeResponse(JSON.stringify({ granules, nextPage: null }));
      }
      const id = Object.keys(htm).find(k => url.includes(`/granules/${k}/htm`));
      return id ? fakeResponse(htm[id]) : fakeResponse('', 404);
    }) as typeof fetch;
  }

  it('reads only the Senate section, not the House or committee sections', async () => {
    mockGovInfo(
      [
        { granuleId: 'S', title: 'Daily Digest/Senate', granuleClass: 'DAILYDIGEST' },
        {
          granuleId: 'H',
          title: 'Daily Digest/House of Representatives',
          granuleClass: 'DAILYDIGEST',
        },
        { granuleId: 'X', title: 'Some floor speech', granuleClass: 'SENATE' },
      ],
      { S: fixture('CREC-2026-09-30-senate-digest.txt'), H: '(Total--999)' }
    );
    await expect(
      readSenateDigest({ packageId: 'CREC-2026-09-30', dateIssued: '2026-09-30' })
    ).resolves.toEqual({
      packageId: 'CREC-2026-09-30',
      dateIssued: '2026-09-30',
      digestFound: true,
      total: 256,
    });
  });

  it('reports an issue with no Daily Digest yet as not found', async () => {
    mockGovInfo([{ granuleId: 'X', title: 'Prayer', granuleClass: 'SENATE' }], {});
    const reading = await readSenateDigest({
      packageId: 'CREC-2026-11-09',
      dateIssued: '2026-11-09',
    });
    expect(reading).toMatchObject({ digestFound: false, total: null });
  });

  it('throws when GovInfo fails, so a failed read is never "no votes"', async () => {
    global.fetch = jest.fn(async () => fakeResponse('busy', 503)) as typeof fetch;
    await expect(
      readSenateDigest({ packageId: 'CREC-2026-09-30', dateIssued: '2026-09-30' })
    ).rejects.toThrow('GovInfo 503');
  });
});
