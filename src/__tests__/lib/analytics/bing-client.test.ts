/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Bing Webmaster Tools client (scripts/bing-client.ts). The weekly stats run
 * must survive every access state — no key, bad key, wrong site — and turn
 * Bing's daily and weekly rows into one windowed summary.
 */

import {
  aggregateDetail,
  dateWindow,
  errorMessage,
  fetchBingSummary,
  parseBingDate,
  pickSiteUrl,
  summarizeTraffic,
} from '../../../../scripts/bing-client';

const TODAY = new Date('2026-11-01T12:00:00Z');
const WINDOW = { startDate: '2026-10-04', endDate: '2026-10-31' };

/** The slice of Response the client reads; jsdom has no global Response. */
function jsonResponse(body: unknown, status = 200): Partial<Response> {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    json: async () => JSON.parse(text) as unknown,
  };
}

/** Bing's "/Date(ms-0700)/" form for a UTC date at local midnight in the given zone. */
function bingDate(isoDay: string, offset = '-0700'): string {
  const sign = offset.startsWith('-') ? -1 : 1;
  const hours = Number(offset.slice(1, 3));
  const minutes = Number(offset.slice(3, 5));
  const offsetMs = sign * (hours * 60 + minutes) * 60 * 1000;
  const ms = new Date(`${isoDay}T00:00:00Z`).getTime() - offsetMs;
  return `/Date(${ms}${offset})/`;
}

describe('parseBingDate', () => {
  it('reads the documented epoch form in a negative offset', () => {
    expect(parseBingDate('/Date(1316156400000-0700)/')).toBe('2011-09-16');
  });

  it('shifts by a positive offset so local midnight stays on its own day', () => {
    expect(parseBingDate(bingDate('2026-10-31', '+0100'))).toBe('2026-10-31');
  });

  it('accepts a plain ISO timestamp and rejects garbage', () => {
    expect(parseBingDate('2026-10-31T00:00:00-07:00')).toBe('2026-10-31');
    expect(parseBingDate('yesterday')).toBeNull();
    expect(parseBingDate(undefined)).toBeNull();
  });
});

describe('dateWindow', () => {
  it('covers windowDays inclusive days ending yesterday', () => {
    expect(dateWindow(28, TODAY)).toEqual(WINDOW);
  });
});

describe('pickSiteUrl', () => {
  it('prefers the verified civdotiq.org entry', () => {
    expect(
      pickSiteUrl([
        { Url: 'https://example.com/', IsVerified: true },
        { Url: 'http://civdotiq.org/', IsVerified: false },
        { Url: 'https://civdotiq.org/', IsVerified: true },
      ])
    ).toBe('https://civdotiq.org/');
  });

  it('falls back to the https root when nothing is listed', () => {
    expect(pickSiteUrl([])).toBe('https://civdotiq.org/');
    expect(pickSiteUrl([{ Url: 'not a url' }])).toBe('https://civdotiq.org/');
  });
});

describe('summarizeTraffic', () => {
  it('sums only the days inside the window and counts them', () => {
    const { totals, daysReported } = summarizeTraffic(
      [
        { Date: bingDate('2026-10-03'), Impressions: 999, Clicks: 99 }, // before
        { Date: bingDate('2026-10-04'), Impressions: 100, Clicks: 2 },
        { Date: bingDate('2026-10-31'), Impressions: 300, Clicks: 4 },
        { Date: bingDate('2026-11-01'), Impressions: 999, Clicks: 99 }, // after
      ],
      WINDOW
    );
    expect(totals).toEqual({ clicks: 6, impressions: 400, ctr: 0.015 });
    expect(daysReported).toBe(2);
  });

  it('reports zero CTR, not NaN, with no impressions', () => {
    expect(summarizeTraffic([], WINDOW).totals).toEqual({ clicks: 0, impressions: 0, ctr: 0 });
  });
});

describe('aggregateDetail', () => {
  it('groups rows by key, weights position by impressions and sorts by clicks', () => {
    const { rows, start, end } = aggregateDetail(
      [
        {
          Query: 'a',
          Date: bingDate('2026-10-10'),
          Impressions: 100,
          Clicks: 1,
          AvgImpressionPosition: 10,
        },
        {
          Query: 'a',
          Date: bingDate('2026-10-17'),
          Impressions: 300,
          Clicks: 3,
          AvgImpressionPosition: 20,
        },
        {
          Query: 'b',
          Date: bingDate('2026-10-17'),
          Impressions: 50,
          Clicks: 5,
          AvgImpressionPosition: 2,
        },
        { Query: '', Date: bingDate('2026-10-17'), Impressions: 50, Clicks: 50 },
      ],
      WINDOW
    );
    expect(rows).toEqual([
      { key: 'b', clicks: 5, impressions: 50, ctr: 0.1, position: 2 },
      { key: 'a', clicks: 4, impressions: 400, ctr: 0.01, position: 17.5 },
    ]);
    expect(start).toBe('2026-10-10');
    expect(end).toBe('2026-10-17');
  });

  it('uses every row when none fall inside the window, and says which dates', () => {
    const { rows, start, end } = aggregateDetail(
      [{ Query: 'old', Date: bingDate('2026-09-01'), Impressions: 10, Clicks: 1 }],
      WINDOW
    );
    expect(rows.map(r => r.key)).toEqual(['old']);
    expect(start).toBe('2026-09-01');
    expect(end).toBe('2026-09-01');
  });
});

describe('errorMessage', () => {
  it('unwraps Bing error bodies and falls back to raw text', () => {
    expect(errorMessage(JSON.stringify({ ErrorCode: 3, Message: 'InvalidApiKey' }))).toBe(
      'InvalidApiKey (ErrorCode 3)'
    );
    expect(errorMessage('<html>nope</html>')).toBe('<html>nope</html>');
  });
});

describe('fetchBingSummary', () => {
  const fetchMock = jest.fn<Promise<Partial<Response>>, [URL | RequestInfo, RequestInit?]>();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('is unconfigured without a key and never calls Bing', async () => {
    const summary = await fetchBingSummary(28, null, TODAY);
    expect(summary.configured).toBe(false);
    expect(summary.error).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('picks the site, sums the window and lists top queries and pages', async () => {
    fetchMock.mockImplementation(async input => {
      const url = new URL(String(input));
      expect(url.searchParams.get('apikey')).toBe('k');
      if (url.pathname.endsWith('/GetUserSites')) {
        return jsonResponse({ d: [{ Url: 'https://civdotiq.org/', IsVerified: true }] });
      }
      expect(url.searchParams.get('siteUrl')).toBe('https://civdotiq.org/');
      if (url.pathname.endsWith('/GetRankAndTrafficStats')) {
        return jsonResponse({
          d: [
            { Date: bingDate('2026-10-30'), Impressions: 200, Clicks: 3 },
            { Date: bingDate('2026-10-31'), Impressions: 100, Clicks: 1 },
          ],
        });
      }
      if (url.pathname.endsWith('/GetQueryStats')) {
        return jsonResponse({
          d: [
            {
              Query: 'don davis voting record',
              Date: bingDate('2026-10-25'),
              Impressions: 40,
              Clicks: 2,
              AvgImpressionPosition: 6,
            },
          ],
        });
      }
      if (url.pathname.endsWith('/GetPageStats')) {
        return jsonResponse({
          d: [
            {
              Query: 'https://civdotiq.org/representative/D000230/votes',
              Date: bingDate('2026-10-25'),
              Impressions: 30,
              Clicks: 2,
              AvgImpressionPosition: 4,
            },
          ],
        });
      }
      throw new Error(`unexpected ${url.pathname}`);
    });

    const summary = await fetchBingSummary(28, 'k', TODAY);
    expect(summary.error).toBeNull();
    expect(summary.siteUrl).toBe('https://civdotiq.org/');
    expect(summary.startDate).toBe('2026-10-04');
    expect(summary.endDate).toBe('2026-10-31');
    expect(summary.totals).toEqual({ clicks: 4, impressions: 300, ctr: 4 / 300 });
    expect(summary.daysReported).toBe(2);
    expect(summary.detailStart).toBe('2026-10-25');
    expect(summary.topQueries[0]?.key).toBe('don davis voting record');
    expect(summary.topPages[0]?.key).toBe('https://civdotiq.org/representative/D000230/votes');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('reports a failed call as an error string without the key', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ErrorCode: 3, Message: 'InvalidApiKey' }, 401));
    const summary = await fetchBingSummary(28, 'secret-key', TODAY);
    expect(summary.configured).toBe(true);
    expect(summary.error).toBe(
      'Bing Webmaster GetUserSites failed (401): InvalidApiKey (ErrorCode 3)'
    );
    expect(summary.error).not.toContain('secret-key');
    expect(summary.totals).toBeNull();
  });
});
