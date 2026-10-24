/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Search Console client (scripts/gsc-client.ts). The weekly stats run must
 * survive every access state — no credentials, API disabled, property not
 * shared — and pick the right property format on its own.
 */

jest.mock('../../../../scripts/google-auth', () => ({
  getAccessToken: jest.fn().mockResolvedValue('test-token'),
  readServiceAccount: jest.fn().mockReturnValue(null),
}));

import {
  dateWindow,
  errorMessage,
  fetchGscSummary,
  pickSiteUrl,
} from '../../../../scripts/gsc-client';

const ACCOUNT = { clientEmail: 'stats@example.iam.gserviceaccount.com', privateKey: 'unused' };
const TODAY = new Date('2026-10-13T12:00:00Z');

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

describe('pickSiteUrl', () => {
  it('prefers the domain property', () => {
    expect(pickSiteUrl(['https://civdotiq.org/', 'sc-domain:civdotiq.org'])).toBe(
      'sc-domain:civdotiq.org'
    );
  });

  it('falls back to the URL-prefix property', () => {
    expect(pickSiteUrl(['https://example.com/', 'https://civdotiq.org/'])).toBe(
      'https://civdotiq.org/'
    );
  });

  it('returns null when no civdotiq.org property is shared', () => {
    expect(pickSiteUrl(['https://example.com/'])).toBeNull();
  });
});

describe('dateWindow', () => {
  it('covers windowDays inclusive days ending 3 days ago (Search Console lag)', () => {
    expect(dateWindow(28, TODAY)).toEqual({ startDate: '2026-09-13', endDate: '2026-10-10' });
  });
});

describe('errorMessage', () => {
  it("extracts Google's error.message", () => {
    expect(errorMessage('{"error":{"code":403,"message":"API disabled"}}')).toBe('API disabled');
  });

  it('falls back to the raw body', () => {
    expect(errorMessage('Bad Gateway')).toBe('Bad Gateway');
  });
});

describe('fetchGscSummary', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    delete process.env.GSC_SITE_URL;
  });

  it('reports not configured without credentials and makes no calls', async () => {
    const summary = await fetchGscSummary(28, null, TODAY);
    expect(summary.configured).toBe(false);
    expect(summary.error).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns totals, top queries and top pages for the discovered property', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/sites')) {
        return jsonResponse({ siteEntry: [{ siteUrl: 'sc-domain:civdotiq.org' }] });
      }
      const body = JSON.parse(String(init?.body)) as { dimensions?: string[] };
      const dim = body.dimensions?.[0];
      if (!dim) {
        return jsonResponse({
          rows: [{ clicks: 40, impressions: 2000, ctr: 0.02, position: 9.5 }],
        });
      }
      return jsonResponse({
        rows: [
          {
            keys: [dim === 'query' ? 'nancy pelosi voting record' : 'https://civdotiq.org/'],
            clicks: 5,
            impressions: 100,
            ctr: 0.05,
            position: 4.2,
          },
        ],
      });
    });

    const summary = await fetchGscSummary(28, ACCOUNT, TODAY);

    expect(summary.error).toBeNull();
    expect(summary.siteUrl).toBe('sc-domain:civdotiq.org');
    expect(summary.totals).toEqual({ clicks: 40, impressions: 2000, ctr: 0.02, position: 9.5 });
    expect(summary.topQueries[0]?.key).toBe('nancy pelosi voting record');
    expect(summary.topPages[0]?.key).toBe('https://civdotiq.org/');

    const queryCall = fetchMock.mock.calls.find(([url]) => String(url).includes('searchAnalytics'));
    expect(String(queryCall?.[0])).toContain(
      '/sites/sc-domain%3Acivdotiq.org/searchAnalytics/query'
    );
    expect(JSON.parse(String(queryCall?.[1]?.body))).toMatchObject({
      startDate: '2026-09-13',
      endDate: '2026-10-10',
    });
  });

  it('explains missing property access instead of throwing', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const summary = await fetchGscSummary(28, ACCOUNT, TODAY);
    expect(summary.configured).toBe(true);
    expect(summary.error).toContain('no access');
    expect(summary.error).toContain(ACCOUNT.clientEmail);
  });

  it('surfaces an API-disabled 403 as a one-line error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 403, message: 'Search Console API has not been used' } }, 403)
    );
    const summary = await fetchGscSummary(28, ACCOUNT, TODAY);
    expect(summary.error).toBe(
      'Search Console /sites failed (403): Search Console API has not been used'
    );
    expect(summary.topQueries).toEqual([]);
  });

  it('uses GSC_SITE_URL without listing sites', async () => {
    process.env.GSC_SITE_URL = 'https://civdotiq.org/';
    fetchMock.mockResolvedValue(jsonResponse({ rows: [] }));
    const summary = await fetchGscSummary(28, ACCOUNT, TODAY);
    expect(summary.siteUrl).toBe('https://civdotiq.org/');
    expect(summary.totals).toEqual({ clicks: 0, impressions: 0, ctr: 0, position: 0 });
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/sites'))).toBe(false);
  });
});
