/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Portrait rate-limit exemption — middleware integration test
 *
 * /api/representative-photo is exempt from rate limiting, but only for
 * bioguide IDs with a pre-downloaded portrait on disk. Those are Tier 0
 * filesystem hits that the CDN caches for a week, so metering them cost an
 * Upstash command on requests the origin never served.
 *
 * Every other ID must stay metered. The route accepts any /^[A-Z]\d{6}$/
 * string — 26 million of them — and an unknown one falls through to
 * Wikidata, the House Clerk, and two GitHub fetches. Exempting by route
 * prefix instead of by ID would leave that path uncapped.
 *
 * Presence of the `X-RateLimit-Limit` response header is the observable
 * signal that the limiter ran.
 */

class MockHeaders {
  private readonly store = new Map<string, string>();
  set(key: string, value: string): void {
    this.store.set(key.toLowerCase(), value);
  }
  get(key: string): string | null {
    return this.store.get(key.toLowerCase()) ?? null;
  }
  has(key: string): boolean {
    return this.store.has(key.toLowerCase());
  }
  forEach(fn: (value: string, key: string) => void): void {
    this.store.forEach(fn);
  }
}

type MockResponse = { status: number; headers: MockHeaders };

const mockNextResponse = {
  next: jest.fn((): MockResponse => ({ status: 200, headers: new MockHeaders() })),
  json: jest.fn(
    (_body: unknown, options?: { status?: number }): MockResponse => ({
      status: options?.status ?? 200,
      headers: new MockHeaders(),
    })
  ),
  redirect: jest.fn((): MockResponse => ({ status: 308, headers: new MockHeaders() })),
  rewrite: jest.fn((): MockResponse => ({ status: 200, headers: new MockHeaders() })),
};

jest.mock('next/server', () => ({
  NextResponse: mockNextResponse,
  NextRequest: jest.fn(),
}));

jest.mock('@/lib/analytics/request-counter', () => ({
  incrementRequestCounter: jest.fn(),
}));

function createMockRequest(path: string): unknown {
  const url = `http://localhost:3000${path}`;
  const parsed = new URL(url);
  const headers = new Map<string, string>([
    ['accept', 'image/webp'],
    ['x-forwarded-for', '203.0.113.7'],
  ]);

  return {
    url,
    method: 'GET',
    nextUrl: { pathname: parsed.pathname, searchParams: parsed.searchParams },
    headers: { get: (key: string): string | null => headers.get(key.toLowerCase()) ?? null },
  };
}

/** Run middleware and report whether the rate limiter executed. */
async function wasRateLimited(path: string): Promise<boolean> {
  const { middleware } = await import('@/middleware');
  const response = (await middleware(createMockRequest(path) as never)) as unknown as MockResponse;
  return response.headers.has('X-RateLimit-Limit');
}

describe('middleware — portrait rate-limit exemption', () => {
  let knownId: string;

  beforeAll(async () => {
    const { LOCAL_PHOTO_IDS } = await import('@/generated/local-photo-ids');
    knownId = [...LOCAL_PHOTO_IDS][0]!;
    expect(knownId).toMatch(/^[A-Z]\d{6}$/);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exempts an ID with a portrait on disk', async () => {
    expect(await wasRateLimited(`/api/representative-photo/${knownId}`)).toBe(false);
  });

  it('exempts a known ID given in lowercase', async () => {
    // The route upper-cases before lookup; the exemption must match.
    expect(await wasRateLimited(`/api/representative-photo/${knownId.toLowerCase()}`)).toBe(false);
  });

  it('meters a valid-format ID with no portrait on disk', async () => {
    // Z999999 is well-formed but has no local file, so it would reach
    // Wikidata and GitHub. This is the case that must stay capped.
    expect(await wasRateLimited('/api/representative-photo/Z999999')).toBe(true);
  });

  it('meters a malformed ID', async () => {
    expect(await wasRateLimited('/api/representative-photo/not-an-id')).toBe(true);
  });

  it('meters a known ID with an extra path segment appended', async () => {
    // Guards against a prefix-match exemption leaking to nested paths.
    // Note: a literal `..` cannot be used here — the URL constructor
    // normalises it away before middleware ever sees the pathname.
    expect(await wasRateLimited(`/api/representative-photo/${knownId}/extra`)).toBe(true);
  });

  it('still meters ordinary API routes', async () => {
    expect(await wasRateLimited('/api/representatives')).toBe(true);
  });
});
