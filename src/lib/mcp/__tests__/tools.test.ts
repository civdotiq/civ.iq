/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * MCP surface tests
 *
 * Connects a real MCP client to the server over an in-memory transport and
 * asserts the actual advertised surface — tool count, annotations, prompts,
 * resource templates — instead of a hardcoded list that can silently drift
 * from what registers (the previous version of this file claimed 53 tools
 * while the live server exposed 47).
 *
 * No tools/call here: handlers hit live government APIs, which unit tests
 * must not do.
 */

// Mock AI provider to avoid eventsource-parser import issue in test env
jest.mock('@/lib/ai/provider', () => ({
  getAIModel: jest.fn(),
}));
jest.mock('@/features/legislation/services/ai/reading-level-validator', () => ({
  validateReadingLevel: jest.fn().mockResolvedValue({ valid: true }),
}));
jest.mock('@/features/legislation/services/ai/bill-summary-cache', () => ({
  getCachedSummary: jest.fn().mockResolvedValue(null),
  setCachedSummary: jest.fn(),
}));

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { initializeMcpServer } from '../server';

const EXPECTED_TOOL_COUNT = 47;
const EXPECTED_PROMPT_COUNT = 6;
const EXPECTED_RESOURCE_TEMPLATE_COUNT = 7;
const EXPECTED_STATIC_RESOURCE_COUNT = 3;

async function connectedClient(): Promise<Client> {
  const server = new McpServer({ name: 'civiq-test', version: '1.0.0' });
  await initializeMcpServer(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'civiq-test-client', version: '1.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe('MCP server surface', () => {
  let client: Client;

  beforeAll(async () => {
    client = await connectedClient();
  });

  afterAll(async () => {
    await client.close();
  });

  it(`advertises exactly ${EXPECTED_TOOL_COUNT} tools`, async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(EXPECTED_TOOL_COUNT);
  });

  it('every tool carries title, description, and read-only annotations', async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.title ?? tool.annotations?.title).toBeTruthy();
      expect(tool.description).toBeTruthy();
      // OpenAI app review requires retrieval tools to be marked read-only.
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.openWorldHint).toBe(true);
    }
  });

  it('core tools are present under their published names', async () => {
    const { tools } = await client.listTools();
    const names = new Set(tools.map(t => t.name));
    for (const required of [
      'lookup_representatives',
      'get_representative_profile',
      'get_voting_history',
      'search_legislation',
      'get_campaign_finance',
      'search_lobbying',
      'analyze_district_comprehensive',
    ]) {
      expect(names).toContain(required);
    }
  });

  it('every tool input schema is an object with described properties', async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object');
      const properties = (tool.inputSchema.properties ?? {}) as Record<
        string,
        { description?: string }
      >;
      for (const [param, schema] of Object.entries(properties)) {
        expect(`${tool.name}.${param}: ${schema.description ?? ''}`).not.toBe(
          `${tool.name}.${param}: `
        );
      }
    }
  });

  it(`advertises ${EXPECTED_PROMPT_COUNT} prompts and ${EXPECTED_RESOURCE_TEMPLATE_COUNT} resource templates`, async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts).toHaveLength(EXPECTED_PROMPT_COUNT);

    const { resourceTemplates } = await client.listResourceTemplates();
    expect(resourceTemplates).toHaveLength(EXPECTED_RESOURCE_TEMPLATE_COUNT);
  });

  it(`resources/list returns the ${EXPECTED_STATIC_RESOURCE_COUNT} static doc resources (never empty — the server advertises the resources capability)`, async () => {
    const { resources } = await client.listResources();
    expect(resources).toHaveLength(EXPECTED_STATIC_RESOURCE_COUNT);

    const uris = resources.map(r => r.uri).sort();
    expect(uris).toEqual([
      'civiq://docs/api-quickstart',
      'civiq://docs/versioning-policy',
      'civiq://docs/when-to-use',
    ]);
    for (const resource of resources) {
      expect(resource.mimeType).toBe('text/markdown');
      expect(resource.description).toBeTruthy();
    }
  });

  it('static doc resources are readable and carry real markdown content', async () => {
    const result = await client.readResource({ uri: 'civiq://docs/when-to-use' });
    const text = result.contents[0]?.text as string;
    expect(text).toContain('When to use CIV.IQ');
    expect(text).toContain('/api/v1');
  });
});
