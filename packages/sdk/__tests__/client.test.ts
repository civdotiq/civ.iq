import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CivIQ,
  CivIQError,
  BadRequestError,
  NotFoundError,
  RateLimitError,
  UpstreamError,
} from '../src/index.js';

// Helper to create a mock fetch that returns JSON
function mockFetch(body: unknown, status = 200, headers?: Record<string, string>) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
    headers: new Headers(headers),
  });
}

describe('CivIQ client', () => {
  it('exposes all resource namespaces', () => {
    const civiq = new CivIQ();
    expect(civiq.representatives).toBeDefined();
    expect(civiq.bills).toBeDefined();
    expect(civiq.votes).toBeDefined();
    expect(civiq.districts).toBeDefined();
    expect(civiq.committees).toBeDefined();
    expect(civiq.intelligence).toBeDefined();
    expect(civiq.search).toBeDefined();
    expect(civiq.states).toBeDefined();
    expect(civiq.graph).toBeDefined();
  });

  it('uses default base URL', async () => {
    const fetchFn = mockFetch({ data: [] });
    const civiq = new CivIQ({ fetch: fetchFn });
    await civiq.representatives.list();
    expect(fetchFn).toHaveBeenCalledWith(
      'https://civdotiq.org/api/v1/representatives',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('accepts a custom base URL', async () => {
    const fetchFn = mockFetch({ data: [] });
    const civiq = new CivIQ({ baseUrl: 'http://localhost:3000/api', fetch: fetchFn });
    await civiq.bills.list();
    expect(fetchFn).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/bills',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('strips trailing slash from base URL', async () => {
    const fetchFn = mockFetch({ data: [] });
    const civiq = new CivIQ({ baseUrl: 'http://localhost:3000/api/', fetch: fetchFn });
    await civiq.committees.list();
    expect(fetchFn).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/committees',
      expect.objectContaining({ method: 'GET' })
    );
  });
});

describe('Representatives resource', () => {
  let fetchFn: ReturnType<typeof mockFetch>;
  let civiq: CivIQ;

  beforeEach(() => {
    fetchFn = mockFetch({ data: [], pagination: {}, meta: {} });
    civiq = new CivIQ({ fetch: fetchFn });
  });

  it('list() sends query params', async () => {
    await civiq.representatives.list({ chamber: 'senate', state: 'CA' });
    const url = fetchFn.mock.calls[0]?.[0] as string;
    expect(url).toContain('chamber=senate');
    expect(url).toContain('state=CA');
  });

  it('get() encodes bioguideId', async () => {
    fetchFn = mockFetch({ data: {} });
    civiq = new CivIQ({ fetch: fetchFn });
    await civiq.representatives.get('A000001');
    expect(fetchFn.mock.calls[0]?.[0]).toContain('/v1/representatives/A000001');
  });

  it('profile() uses non-v1 path', async () => {
    fetchFn = mockFetch({ representative: {} });
    civiq = new CivIQ({ fetch: fetchFn });
    await civiq.representatives.profile('A000001');
    expect(fetchFn.mock.calls[0]?.[0]).toContain('/representative/A000001');
    expect(fetchFn.mock.calls[0]?.[0]).not.toContain('/v1/');
  });

  it('compare() joins bioguideIds', async () => {
    fetchFn = mockFetch({});
    civiq = new CivIQ({ fetch: fetchFn });
    await civiq.representatives.compare(['A000001', 'B000002']);
    const url = fetchFn.mock.calls[0]?.[0] as string;
    expect(url).toContain('bioguideId=A000001%2CB000002');
  });
});

describe('Bills resource', () => {
  it('get() hits /v1/bills/:id', async () => {
    const fetchFn = mockFetch({ data: {} });
    const civiq = new CivIQ({ fetch: fetchFn });
    await civiq.bills.get('119-hr-1');
    expect(fetchFn.mock.calls[0]?.[0]).toContain('/v1/bills/119-hr-1');
  });

  it('summary() hits /v1/bills/:id/summary', async () => {
    const fetchFn = mockFetch({ data: {} });
    const civiq = new CivIQ({ fetch: fetchFn });
    await civiq.bills.summary('119-hr-1');
    expect(fetchFn.mock.calls[0]?.[0]).toContain('/v1/bills/119-hr-1/summary');
  });
});

describe('Intelligence resource', () => {
  it('votePrediction() uses correct path', async () => {
    const fetchFn = mockFetch({});
    const civiq = new CivIQ({ fetch: fetchFn });
    await civiq.intelligence.votePrediction('A000001');
    expect(fetchFn.mock.calls[0]?.[0]).toContain(
      '/intelligence/representative/A000001/vote-prediction'
    );
  });

  it('sectorLeaderboard() passes params', async () => {
    const fetchFn = mockFetch({ sector: 'Energy', legislators: [] });
    const civiq = new CivIQ({ fetch: fetchFn });
    await civiq.intelligence.sectorLeaderboard('Energy', { chamber: 'senate', limit: 5 });
    const url = fetchFn.mock.calls[0]?.[0] as string;
    expect(url).toContain('/intelligence/sector/Energy/leaderboard');
    expect(url).toContain('chamber=senate');
    expect(url).toContain('limit=5');
  });

  it('moneyReportByAddress() uses POST', async () => {
    const fetchFn = mockFetch({});
    const civiq = new CivIQ({ fetch: fetchFn });
    await civiq.intelligence.moneyReportByAddress({
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
    });
    expect(fetchFn.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ method: 'POST' }));
  });

  it('influenceClusters() sends optional bioguideId', async () => {
    const fetchFn = mockFetch({ clusters: [], crossPartyHighlights: [] });
    const civiq = new CivIQ({ fetch: fetchFn });
    await civiq.intelligence.influenceClusters('A000001');
    const url = fetchFn.mock.calls[0]?.[0] as string;
    expect(url).toContain('bioguideId=A000001');
  });
});

describe('Search resource', () => {
  it('unified() passes required q param', async () => {
    const fetchFn = mockFetch({ query: 'health', totalResults: 0 });
    const civiq = new CivIQ({ fetch: fetchFn });
    await civiq.search.unified({ q: 'health', limit: 10 });
    const url = fetchFn.mock.calls[0]?.[0] as string;
    expect(url).toContain('q=health');
    expect(url).toContain('limit=10');
  });
});

describe('States resource', () => {
  it('legislature() uppercases state', async () => {
    const fetchFn = mockFetch({});
    const civiq = new CivIQ({ fetch: fetchFn });
    await civiq.states.legislature('ca');
    expect(fetchFn.mock.calls[0]?.[0]).toContain('/state-legislature/CA');
  });

  it('legislatorsByAddress() uses POST', async () => {
    const fetchFn = mockFetch({});
    const civiq = new CivIQ({ fetch: fetchFn });
    await civiq.states.legislatorsByAddress({ street: '123 Main', city: 'LA', state: 'CA' });
    expect(fetchFn.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ method: 'POST' }));
  });
});

describe('Graph resource', () => {
  it('neighbors() encodes node ID and passes params', async () => {
    const fetchFn = mockFetch({});
    const civiq = new CivIQ({ fetch: fetchFn });
    await civiq.graph.neighbors('rep:A000001', { limit: 5 });
    const url = fetchFn.mock.calls[0]?.[0] as string;
    expect(url).toContain('/graph/neighbors/rep%3AA000001');
    expect(url).toContain('limit=5');
  });

  it('entity() uses mesh path', async () => {
    const fetchFn = mockFetch({});
    const civiq = new CivIQ({ fetch: fetchFn });
    await civiq.graph.entity('rep:A000001');
    expect(fetchFn.mock.calls[0]?.[0]).toContain('/mesh/entity/rep%3AA000001');
  });
});

describe('Districts resource', () => {
  it('geocode() posts address', async () => {
    const fetchFn = mockFetch({ success: true, representatives: [] });
    const civiq = new CivIQ({ fetch: fetchFn });
    await civiq.districts.geocode({ mode: 'address', address: '1600 Pennsylvania Ave' });
    expect(fetchFn.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ method: 'POST' }));
  });
});

describe('Error handling', () => {
  it('throws BadRequestError on 400', async () => {
    const fetchFn = mockFetch({ error: { message: 'Invalid param' } }, 400);
    const civiq = new CivIQ({ fetch: fetchFn });
    await expect(civiq.bills.list()).rejects.toBeInstanceOf(BadRequestError);
  });

  it('throws NotFoundError on 404', async () => {
    const fetchFn = mockFetch({ error: { message: 'Not found' } }, 404);
    const civiq = new CivIQ({ fetch: fetchFn });
    await expect(civiq.representatives.get('ZZZZZZ')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws RateLimitError on 429 with retryAfter', async () => {
    const fetchFn = mockFetch({}, 429, { 'Retry-After': '30' });
    const civiq = new CivIQ({ fetch: fetchFn });
    try {
      await civiq.bills.list();
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfter).toBe(30);
    }
  });

  it('throws UpstreamError on 502', async () => {
    const fetchFn = mockFetch({}, 502);
    const civiq = new CivIQ({ fetch: fetchFn });
    await expect(civiq.search.unified({ q: 'test' })).rejects.toBeInstanceOf(UpstreamError);
  });

  it('throws CivIQError on unknown status', async () => {
    const fetchFn = mockFetch({}, 500);
    const civiq = new CivIQ({ fetch: fetchFn });
    await expect(civiq.votes.get('v1')).rejects.toBeInstanceOf(CivIQError);
  });
});
