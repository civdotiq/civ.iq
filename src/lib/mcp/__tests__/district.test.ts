/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * get_district_info tool and civiq://districts resource
 *
 * Both used to fetch `${NEXT_PUBLIC_BASE_URL}/api/districts/...`, which is
 * localhost on Vercel, so every production call failed with "fetch failed".
 * They now call the district-details module directly. The data source is
 * mocked; seat-id resolution and the response envelope are real.
 */

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

const getCachedDistrictDetails = jest.fn();
jest.mock('@/lib/districts/district-details', () => ({
  ...jest.requireActual('@/lib/districts/district-details'),
  getCachedDistrictDetails: (id: string) => getCachedDistrictDetails(id),
}));

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { initializeMcpServer } from '../server';
import { resolveSeatId } from '@/lib/districts/district-details';

async function connectedClient(): Promise<Client> {
  const server = new McpServer({ name: 'civiq-test', version: '1.0.0' });
  await initializeMcpServer(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'civiq-test-client', version: '1.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

function textOf(result: Awaited<ReturnType<Client['callTool']>>): string {
  const content = result.content as Array<{ type: string; text?: string }>;
  return content[0]?.text ?? '';
}

describe('resolveSeatId', () => {
  it.each([
    ['MI', '12', 'MI-12'],
    ['mi', '7', 'MI-07'],
    ['AK', '0', 'AK-AL'],
    ['AK', '01', 'AK-AL'],
    ['DC', 'AL', 'DC-AL'],
  ])('%s + %s → %s', (state, district, expected) => {
    expect(resolveSeatId(state, district)).toBe(expected);
  });

  it.each([
    ['MI', '99'],
    ['XX', '01'],
    ['MI', 'abc'],
    ['', ''],
  ])('%s + %s is not a seat', (state, district) => {
    expect(resolveSeatId(state, district)).toBeNull();
  });
});

describe('district MCP surface', () => {
  let client: Client;
  let fetchSpy: jest.SpyInstance;

  beforeAll(async () => {
    client = await connectedClient();
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(() => {
    getCachedDistrictDetails.mockReset();
    fetchSpy = jest.spyOn(global, 'fetch' as never);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('get_district_info returns the API envelope without an HTTP self-fetch', async () => {
    getCachedDistrictDetails.mockResolvedValue({ id: 'MI-07', state: 'MI', number: '07' });

    const result = await client.callTool({
      name: 'get_district_info',
      arguments: { stateCode: 'mi', districtNumber: '7' },
    });

    expect(result.isError).toBeFalsy();
    expect(getCachedDistrictDetails).toHaveBeenCalledWith('MI-07');
    expect(fetchSpy).not.toHaveBeenCalled();
    const body = JSON.parse(textOf(result)) as {
      district: { id: string };
      metadata: { dataSource: string };
    };
    expect(body.district.id).toBe('MI-07');
    expect(body.metadata.dataSource).toBeTruthy();
  });

  it('get_district_info rejects a seat that does not exist before fetching', async () => {
    const result = await client.callTool({
      name: 'get_district_info',
      arguments: { stateCode: 'MI', districtNumber: '99' },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe('District not found: MI-99');
    expect(getCachedDistrictDetails).not.toHaveBeenCalled();
  });

  it('get_district_info says a real seat with no member may be vacant', async () => {
    getCachedDistrictDetails.mockResolvedValue(null);

    const result = await client.callTool({
      name: 'get_district_info',
      arguments: { stateCode: 'TX', districtNumber: '23' },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/TX-23.*vacant/);
  });

  it('civiq://districts resource resolves at-large seats and reads directly', async () => {
    getCachedDistrictDetails.mockResolvedValue({ id: 'AK-AL', state: 'AK', number: 'AL' });

    const result = await client.readResource({ uri: 'civiq://districts/AK/01' });

    expect(getCachedDistrictDetails).toHaveBeenCalledWith('AK-AL');
    expect(fetchSpy).not.toHaveBeenCalled();
    const text = (result.contents[0] as { text: string }).text;
    expect((JSON.parse(text) as { district: { id: string } }).district.id).toBe('AK-AL');
  });

  it('civiq://districts resource returns Not found for an unknown seat', async () => {
    const result = await client.readResource({ uri: 'civiq://districts/MI/99' });

    expect((result.contents[0] as { text: string }).text).toBe('{"error":"Not found"}');
    expect(getCachedDistrictDetails).not.toHaveBeenCalled();
  });
});
