/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Adoption telemetry — MCP route integration test
 *
 * Invokes the real POST export from src/app/api/mcp/route.ts with a
 * JSON-RPC `initialize` body and confirms `adoption.mcp.initialize` fires
 * with the correct clientInfo / protocolVersion. mcp-handler's underlying
 * handler is mocked out — this test pins the body-peek wiring, not the
 * MCP transport behavior itself.
 *
 * The route only reads `request.headers.get(...)` and `request.clone().text()`,
 * so a lightweight mock satisfies the real handler without needing a full
 * Fetch-API Request polyfill in jsdom.
 */

const innerHandler = jest.fn(
  async (): Promise<Response> =>
    // Minimal Response stand-in — route forwards whatever we return.
    ({ status: 200 }) as unknown as Response
);

jest.mock('mcp-handler/next', () => ({
  createMcpHandler: jest.fn(() => innerHandler),
}));

jest.mock('@/lib/mcp/server', () => ({
  initializeMcpServer: jest.fn(),
}));

interface MockRequestOptions {
  body?: string;
  contentType?: string | null;
}

function createMockRequest(options: MockRequestOptions): unknown {
  const { body = '', contentType = 'application/json' } = options;
  const headers = new Map<string, string>();
  if (contentType !== null) headers.set('content-type', contentType);

  const req = {
    method: 'POST',
    url: 'http://localhost/api/mcp',
    headers: {
      get: (key: string): string | null => headers.get(key.toLowerCase()) ?? null,
    },
    clone: () => ({
      text: () => Promise.resolve(body),
    }),
  };
  return req;
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

describe('POST /api/mcp — adoption.mcp.initialize telemetry', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    innerHandler.mockImplementation(
      async (): Promise<Response> => ({ status: 200 }) as unknown as Response
    );
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('emits adoption.mcp.initialize for a JSON-RPC initialize body', async () => {
    const { POST } = await import('@/app/api/mcp/route');
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase5a-test-client', version: '1.2.3' },
      },
    });
    const request = createMockRequest({ body });

    const response = await POST(request as never);

    expect((response as { status: number }).status).toBe(200);
    expect(innerHandler).toHaveBeenCalledTimes(1);

    const metrics = parseMetricLogs(logSpy).filter(m => m.message === 'adoption.mcp.initialize');
    expect(metrics).toHaveLength(1);
    expect(metrics[0]!.data).toEqual({
      clientName: 'phase5a-test-client',
      clientVersion: '1.2.3',
      protocolVersion: '2024-11-05',
    });
  });

  it('does NOT emit adoption.mcp.initialize for non-initialize methods', async () => {
    const { POST } = await import('@/app/api/mcp/route');
    const body = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const request = createMockRequest({ body });

    await POST(request as never);

    expect(innerHandler).toHaveBeenCalledTimes(1);
    const metrics = parseMetricLogs(logSpy).filter(m => m.message === 'adoption.mcp.initialize');
    expect(metrics).toHaveLength(0);
  });

  it('still delegates to the underlying handler when body is malformed JSON', async () => {
    const { POST } = await import('@/app/api/mcp/route');
    const request = createMockRequest({ body: 'not json' });

    await POST(request as never);

    // Telemetry must never throw — inner handler still runs.
    expect(innerHandler).toHaveBeenCalledTimes(1);
    const metrics = parseMetricLogs(logSpy).filter(m => m.message === 'adoption.mcp.initialize');
    expect(metrics).toHaveLength(0);
  });

  it('skips body-peek for non-JSON content types', async () => {
    const { POST } = await import('@/app/api/mcp/route');
    const body = JSON.stringify({
      method: 'initialize',
      params: { clientInfo: { name: 'x', version: 'y' } },
    });
    const request = createMockRequest({ body, contentType: 'text/plain' });

    await POST(request as never);

    expect(innerHandler).toHaveBeenCalledTimes(1);
    const metrics = parseMetricLogs(logSpy).filter(m => m.message === 'adoption.mcp.initialize');
    expect(metrics).toHaveLength(0);
  });
});
