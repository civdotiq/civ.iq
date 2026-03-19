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
 */

import { createMcpHandler } from 'mcp-handler/next';
import { initializeMcpServer } from '@/lib/mcp/server';

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

export { handler as GET, handler as POST, handler as DELETE };
