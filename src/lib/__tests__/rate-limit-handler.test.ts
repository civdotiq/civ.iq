import { fetchWithRetry, RateLimitError } from '../api/rate-limit-handler';

jest.mock('@/lib/logging/simple-logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  __esModule: true,
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

/** Create a minimal Response-like object for jsdom (which lacks native Response) */
function makeMockResponse(opts: {
  status: number;
  body?: string;
  headers?: Record<string, string>;
}): Response {
  const headerMap = new Map(Object.entries(opts.headers ?? {}));
  return {
    status: opts.status,
    ok: opts.status >= 200 && opts.status < 300,
    headers: {
      get: (name: string) => headerMap.get(name) ?? null,
      forEach: (cb: (value: string, key: string) => void) => headerMap.forEach((v, k) => cb(v, k)),
    },
    text: () => Promise.resolve(opts.body ?? ''),
    json: () => Promise.resolve(JSON.parse(opts.body ?? '{}')),
  } as unknown as Response;
}

function make429(retryAfter?: string): Response {
  const headers: Record<string, string> = {};
  if (retryAfter) headers['Retry-After'] = retryAfter;
  return makeMockResponse({ status: 429, headers });
}

function makeOk(body = 'ok'): Response {
  return makeMockResponse({ status: 200, body });
}

function makeRateLimitExhausted(): Response {
  return makeMockResponse({
    status: 200,
    headers: { 'X-RateLimit-Remaining': '0' },
  });
}

describe('fetchWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns response on success without retrying', async () => {
    mockFetch.mockResolvedValueOnce(makeOk('hello'));

    const response = await fetchWithRetry('https://api.example.com/data');

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('hello');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 and succeeds on attempt 2', async () => {
    mockFetch.mockResolvedValueOnce(make429('1')).mockResolvedValueOnce(makeOk('recovered'));

    const response = await fetchWithRetry('https://api.example.com/data', undefined, {
      maxRetries: 3,
      baseDelayMs: 10,
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('recovered');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on X-RateLimit-Remaining: 0', async () => {
    mockFetch.mockResolvedValueOnce(makeRateLimitExhausted()).mockResolvedValueOnce(makeOk());

    const response = await fetchWithRetry('https://api.example.com/data', undefined, {
      maxRetries: 2,
      baseDelayMs: 10,
    });

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws RateLimitError after exhausting retries', async () => {
    mockFetch.mockResolvedValue(make429('0'));

    await expect(
      fetchWithRetry('https://api.example.com/data', undefined, {
        maxRetries: 3,
        baseDelayMs: 10,
      })
    ).rejects.toThrow(RateLimitError);

    // Initial attempt + 3 retries = 4 calls
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('RateLimitError contains correct metadata', async () => {
    mockFetch.mockResolvedValue(make429('0'));

    try {
      await fetchWithRetry('https://api.example.com/data', undefined, {
        maxRetries: 1,
        baseDelayMs: 10,
      });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      const rle = err as RateLimitError;
      expect(rle.status).toBe(429);
      expect(rle.retryAfter).toBe(0);
      expect(rle.message).toContain('api.example.com');
    }
  });

  it('parses Retry-After as HTTP-date', async () => {
    const futureDate = new Date(Date.now() + 2000).toUTCString();
    mockFetch.mockResolvedValueOnce(make429(futureDate)).mockResolvedValueOnce(makeOk());

    const response = await fetchWithRetry('https://api.example.com/data', undefined, {
      maxRetries: 1,
      baseDelayMs: 10,
    });

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('uses exponential backoff when no Retry-After header', async () => {
    mockFetch.mockResolvedValueOnce(make429()).mockResolvedValueOnce(makeOk());

    const response = await fetchWithRetry('https://api.example.com/data', undefined, {
      maxRetries: 2,
      baseDelayMs: 10,
    });

    expect(response.status).toBe(200);
  });

  it('passes options through to fetch', async () => {
    mockFetch.mockResolvedValueOnce(makeOk());
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    };

    await fetchWithRetry('https://api.example.com/data', init);

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', init);
  });

  it('defaults to 3 retries and 1000ms base delay', async () => {
    mockFetch.mockResolvedValueOnce(makeOk());
    const response = await fetchWithRetry('https://api.example.com/data');
    expect(response.status).toBe(200);
  });
});
