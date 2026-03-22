/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * MCP Server Setup
 *
 * Registers all tools, resources, and prompts for the CIV.IQ MCP server.
 * Tools call services directly (no HTTP loopback).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerRepresentativeTools } from './tools/representatives';
import { registerLegislationTools } from './tools/legislation';
import { registerFinanceTools } from './tools/finance';
import { registerIntelligenceTools } from './tools/intelligence';
import { registerCivicTools } from './tools/civic';
import { registerEnvironmentTools } from './tools/environment';
import { registerSafetyTools } from './tools/safety';
import { registerHealthTools } from './tools/health';
import { registerResources } from './resources';
import { registerPrompts } from './prompts';

export async function initializeMcpServer(server: McpServer): Promise<void> {
  // Register all tool groups
  registerRepresentativeTools(server);
  registerLegislationTools(server);
  registerFinanceTools(server);
  registerIntelligenceTools(server);
  registerCivicTools(server);
  registerEnvironmentTools(server);
  registerSafetyTools(server);
  registerHealthTools(server);

  // Register resources and prompts
  registerResources(server);
  registerPrompts(server);
}
