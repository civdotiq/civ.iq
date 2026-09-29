import { fetchRepresentativeNewsAPI } from '../newsapi';

describe('fetchRepresentativeNewsAPI query', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.NEWSAPI_KEY;
  let requestedUrl = '';

  beforeEach(() => {
    process.env.NEWSAPI_KEY = 'test-key';
    requestedUrl = '';
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ status: 'ok', totalResults: 0, articles: [] }),
      } as Response;
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NEWSAPI_KEY = originalKey;
  });

  it('ORs the nickname with the legal name — press writes "Bernie", not "Bernard"', async () => {
    await fetchRepresentativeNewsAPI('Bernard Sanders', 'VT', 'Senate');
    const q = new URL(requestedUrl).searchParams.get('q');
    expect(q).toBe('"Bernie Sanders" OR "Bernard Sanders"');
  });

  it('matches only headlines and summaries, not article bodies', async () => {
    await fetchRepresentativeNewsAPI('Bernard Sanders', 'VT', 'Senate');
    expect(new URL(requestedUrl).searchParams.get('searchIn')).toBe('title,description');
  });

  it('keeps the plain full-name query when no nickname is known', async () => {
    await fetchRepresentativeNewsAPI('Jane Doe', 'MI', 'House');
    expect(new URL(requestedUrl).searchParams.get('q')).toBe('"Jane Doe"');
  });
});
