/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Adoption telemetry — middleware integration test
 *
 * Invokes the real `middleware` export with a mocked NextRequest and asserts
 * the `adoption.sdk.request` metric fires (via console.log) when the request
 * carries an `@civiq/sdk/<version>` User-Agent, and does NOT fire for
 * non-SDK UAs. Pins the wiring between src/middleware.ts and
 * src/lib/analytics/adoption-telemetry.ts.
 */

// Mock NextResponse so we can construct responses without an Edge runtime.
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
  next: jest.fn(
    (): MockResponse => ({
      status: 200,
      headers: new MockHeaders(),
    })
  ),
  json: jest.fn(
    (_body: unknown, options?: { status?: number }): MockResponse => ({
      status: options?.status ?? 200,
      headers: new MockHeaders(),
    })
  ),
};

jest.mock('next/server', () => ({
  NextResponse: mockNextResponse,
  NextRequest: jest.fn(),
}));

// Silence the request-counter side channel so we only see adoption logs.
jest.mock('@/lib/analytics/request-counter', () => ({
  incrementRequestCounter: jest.fn(),
}));

interface MockRequestOptions {
  path: string;
  method?: string;
  userAgent?: string;
}

function createMockRequest(options: MockRequestOptions): unknown {
  const url = `http://localhost:3000${options.path}`;
  const parsed = new URL(url);
  const headers = new Map<string, string>();
  if (options.userAgent) headers.set('user-agent', options.userAgent);
  headers.set('accept', 'application/json');

  return {
    url,
    method: options.method ?? 'GET',
    nextUrl: {
      pathname: parsed.pathname,
      searchParams: parsed.searchParams,
    },
    headers: {
      get: (key: string): string | null => headers.get(key.toLowerCase()) ?? null,
    },
  };
}

interface MetricLogCall {
  message: string;
  data: Record<string, unknown>;
}

function parseMetricLogs(logSpy: jest.SpyInstance): MetricLogCall[] {
  const calls: MetricLogCall[] = [];
  for (const call of logSpy.mock.calls) {
    const first = call[0];
    if (typeof first !== 'string') continue;
    try {
      const parsed: unknown = JSON.parse(first);
      if (
        parsed &&
        typeof parsed === 'object' &&
        (parsed as Record<string, unknown>).level === 'metric' &&
        typeof (parsed as Record<string, unknown>).message === 'string'
      ) {
        const rec = parsed as { message: string; data: Record<string, unknown> };
        calls.push({ message: rec.message, data: rec.data });
      }
    } catch {
      // Non-JSON log line; ignore.
    }
  }
  return calls;
}

describe('middleware — adoption.sdk.request telemetry', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('emits adoption.sdk.request for /api/v1/* with SDK User-Agent', async () => {
    const { middleware } = await import('@/middleware');
    const request = createMockRequest({
      path: '/api/v1/representatives',
      method: 'GET',
      userAgent: '@civiq/sdk/0.1.0',
    });

    await middleware(request as never);

    const metrics = parseMetricLogs(logSpy).filter(m => m.message === 'adoption.sdk.request');
    expect(metrics).toHaveLength(1);
    expect(metrics[0]!.data).toEqual({
      sdk: '@civiq/sdk',
      version: '0.1.0',
      path: '/api/v1/representatives',
      method: 'GET',
    });
  });

  it('emits adoption.sdk.request for /api/mcp with SDK User-Agent', async () => {
    const { middleware } = await import('@/middleware');
    const request = createMockRequest({
      path: '/api/mcp',
      method: 'POST',
      userAgent: '@civiq/sdk/0.1.0 myapp/1.0',
    });

    await middleware(request as never);

    const metrics = parseMetricLogs(logSpy).filter(m => m.message === 'adoption.sdk.request');
    expect(metrics).toHaveLength(1);
    expect(metrics[0]!.data).toMatchObject({
      sdk: '@civiq/sdk',
      version: '0.1.0',
      path: '/api/mcp',
      method: 'POST',
    });
  });

  it('does NOT emit adoption.sdk.request for non-SDK User-Agents', async () => {
    const { middleware } = await import('@/middleware');
    const request = createMockRequest({
      path: '/api/v1/representatives',
      userAgent: 'curl/8.4.0',
    });

    await middleware(request as never);

    const metrics = parseMetricLogs(logSpy).filter(m => m.message === 'adoption.sdk.request');
    expect(metrics).toHaveLength(0);
  });

  it('does NOT emit adoption.sdk.request for internal /api/* paths', async () => {
    // Internal routes (non-/api/v1/, non-/api/mcp) should not be surveyed
    // for SDK adoption even if a caller lies about the UA.
    const { middleware } = await import('@/middleware');
    const request = createMockRequest({
      path: '/api/representatives',
      userAgent: '@civiq/sdk/0.1.0',
    });

    await middleware(request as never);

    const metrics = parseMetricLogs(logSpy).filter(m => m.message === 'adoption.sdk.request');
    expect(metrics).toHaveLength(0);
  });
});
