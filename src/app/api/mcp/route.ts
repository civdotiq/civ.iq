/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * MCP Server Route Handler
 *
 * Exposes a Model Context Protocol server at /api/mcp.
 * Supports streamable HTTP transport (GET for SSE, POST for messages).
 * See: https://modelcontextprotocol.io
 *
 * Adoption telemetry: on POST we clone the request body and peek for a
 * JSON-RPC `initialize` method; if present we fire `adoption.mcp.initialize`
 * with `clientInfo`. mcp-handler's onEvent API declares REQUEST_RECEIVED but
 * the runtime never emits it — see inline note below.
 */

import { createMcpHandler } from 'mcp-handler/next';
import { initializeMcpServer } from '@/lib/mcp/server';
import { recordMcpInitialize } from '@/lib/analytics/adoption-telemetry';

export const dynamic = 'force-dynamic';

const handler = createMcpHandler(
  initializeMcpServer,
  {
    serverInfo: {
      name: 'civiq',
      version: '1.0.0',
    },
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  },
  {
    streamableHttpEndpoint: '/api/mcp',
    disableSse: true,
    verboseLogs: process.env.NODE_ENV === 'development',
  }
);

// mcp-handler@<current> defines `requestReceived` on its event emitter but
// never calls it; only REQUEST_COMPLETED fires, and the request body is
// passed as `result`. Rather than couple telemetry to that quirk we peek
// the body ourselves before delegating.
async function postWithTelemetry(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const clone = request.clone();
      const text = await clone.text();
      if (text) {
        const body: unknown = JSON.parse(text);
        recordMcpInitialize(body);
      }
    }
  } catch {
    // Telemetry never throws.
  }
  return handler(request);
}

export { handler as GET, postWithTelemetry as POST, handler as DELETE };
